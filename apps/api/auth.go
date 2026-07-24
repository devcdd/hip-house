package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type User struct {
	ID       string `json:"id" db:"id"`
	Nickname string `json:"nickname" db:"nickname"`
	Role     string `json:"role" db:"role"`
}

type ctxKey string

const userKey ctxKey = "user"

// --- JWT ---

func (s *server) issueToken(u User) (string, error) {
	claims := jwt.MapClaims{
		"sub":  u.ID,
		"role": u.Role,
		"exp":  time.Now().Add(7 * 24 * time.Hour).Unix(),
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(s.jwtSecret)
}

func (s *server) parseToken(tok string) (id, role string, err error) {
	t, err := jwt.Parse(tok, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return s.jwtSecret, nil
	})
	if err != nil || !t.Valid {
		return "", "", errors.New("invalid token")
	}
	claims, _ := t.Claims.(jwt.MapClaims)
	id, _ = claims["sub"].(string)
	role, _ = claims["role"].(string)
	if id == "" {
		return "", "", errors.New("invalid token")
	}
	return id, role, nil
}

// --- Middleware ---

func (s *server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		id, role, err := s.parseToken(tok)
		if err != nil {
			writeErr(w, 401, "unauthorized")
			return
		}
		ctx := context.WithValue(r.Context(), userKey, User{ID: id, Role: role})
		next(w, r.WithContext(ctx))
	}
}

func (s *server) requireAdmin(next http.HandlerFunc) http.HandlerFunc {
	return s.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if currentUser(r).Role != "admin" {
			writeErr(w, 403, "admin only")
			return
		}
		next(w, r)
	})
}

func currentUser(r *http.Request) User {
	u, _ := r.Context().Value(userKey).(User)
	return u
}

// isAdminReq checks the bearer token without requiring it (used on public reads
// to optionally widen results for admins).
func (s *server) isAdminReq(r *http.Request) bool {
	tok := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	_, role, err := s.parseToken(tok)
	return err == nil && role == "admin"
}

// --- Kakao OAuth ---

type kakaoUser struct {
	ID           int64 `json:"id"`
	KakaoAccount struct {
		Profile struct {
			Nickname string `json:"nickname"`
		} `json:"profile"`
	} `json:"kakao_account"`
}

// exchangeKakao trades an auth code for the Kakao user's id + nickname.
func (s *server) exchangeKakao(ctx context.Context, code, redirectURI string) (kakaoUser, error) {
	form := url.Values{
		"grant_type":   {"authorization_code"},
		"client_id":    {s.kakaoKey},
		"redirect_uri": {redirectURI},
		"code":         {code},
	}
	if s.kakaoSecret != "" {
		form.Set("client_secret", s.kakaoSecret)
	}
	tokRes, err := kakaoPost(ctx, "https://kauth.kakao.com/oauth/token", form, "")
	if err != nil {
		return kakaoUser{}, err
	}
	var tok struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(tokRes, &tok); err != nil || tok.AccessToken == "" {
		return kakaoUser{}, errors.New("kakao token exchange failed")
	}
	meRes, err := kakaoPost(ctx, "https://kapi.kakao.com/v2/user/me", nil, tok.AccessToken)
	if err != nil {
		return kakaoUser{}, err
	}
	var ku kakaoUser
	if err := json.Unmarshal(meRes, &ku); err != nil || ku.ID == 0 {
		return kakaoUser{}, errors.New("kakao profile fetch failed")
	}
	return ku, nil
}

func kakaoPost(ctx context.Context, endpoint string, form url.Values, bearer string) ([]byte, error) {
	var body *strings.Reader
	if form != nil {
		body = strings.NewReader(form.Encode())
	} else {
		body = strings.NewReader("")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	buf, err := io.ReadAll(res.Body)
	if err != nil {
		return nil, err
	}
	if res.StatusCode >= 400 {
		return nil, errors.New("kakao API " + strconv.Itoa(res.StatusCode) + ": " + string(buf))
	}
	return buf, nil
}

// --- Handlers ---

// loginKakao: body {code, redirect_uri} -> upsert user, return {token, user}.
func (s *server) loginKakao(w http.ResponseWriter, r *http.Request) {
	if s.kakaoKey == "" {
		writeErr(w, 500, "kakao login not configured (set KAKAO_REST_API_KEY)")
		return
	}
	var body struct {
		Code        string `json:"code"`
		RedirectURI string `json:"redirect_uri"`
	}
	if !decode(w, r, &body) {
		return
	}
	if body.Code == "" || body.RedirectURI == "" {
		writeErr(w, 400, "code and redirect_uri are required")
		return
	}
	ku, err := s.exchangeKakao(r.Context(), body.Code, body.RedirectURI)
	if err != nil {
		writeErr(w, 401, err.Error())
		return
	}

	id := strconv.FormatInt(ku.ID, 10)
	nickname := ku.KakaoAccount.Profile.Nickname
	role := "user"
	if s.adminIDs[id] {
		role = "admin"
	}
	// Upsert: keep existing role unless promoted via env allowlist.
	_, err = s.db.Exec(r.Context(),
		`INSERT INTO users(id,nickname,role) VALUES($1,$2,$3)
		 ON CONFLICT(id) DO UPDATE SET nickname=EXCLUDED.nickname,
		   role=CASE WHEN $3='admin' THEN 'admin' ELSE users.role END`,
		id, nickname, role)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	var u User
	if err := s.db.QueryRow(r.Context(), "SELECT id,nickname,role FROM users WHERE id=$1", id).
		Scan(&u.ID, &u.Nickname, &u.Role); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	token, err := s.issueToken(u)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"token": token, "user": u})
}

func (s *server) me(w http.ResponseWriter, r *http.Request) {
	var u User
	if err := s.db.QueryRow(r.Context(), "SELECT id,nickname,role FROM users WHERE id=$1", currentUser(r).ID).
		Scan(&u.ID, &u.Nickname, &u.Role); err != nil {
		writeErr(w, 404, "user not found")
		return
	}
	writeJSON(w, 200, u)
}
