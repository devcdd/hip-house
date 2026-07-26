package main

// Admin-triggered Spotify crawling — the web counterpart of apps/crawler.
// Search artists, then pull a picked artist's albums straight into the DB.
// Credentials mirror the crawler's scheme: key "first"/"second" selects the
// FIRST_/SECOND_-prefixed pair (rate-limit spreading); empty key falls back
// SPOTIFY_CLIENT_* → FIRST_SPOTIFY_CLIENT_*.

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
)

const spAPI = "https://api.spotify.com/v1"

func spotifyCreds(key string) (id, secret string, err error) {
	key = strings.ToLower(strings.TrimSpace(key))
	prefixes := []string{"", "FIRST_"}
	if key != "" {
		prefixes = []string{strings.ToUpper(key) + "_"}
	}
	for _, p := range prefixes {
		id, secret = os.Getenv(p+"SPOTIFY_CLIENT_ID"), os.Getenv(p+"SPOTIFY_CLIENT_SECRET")
		if id != "" && secret != "" {
			return id, secret, nil
		}
	}
	if key == "" {
		return "", "", errors.New("no spotify credentials: set SPOTIFY_CLIENT_ID/SECRET (or FIRST_-prefixed)")
	}
	return "", "", fmt.Errorf("no spotify credentials for key %q: set %s_SPOTIFY_CLIENT_ID/SECRET", key, strings.ToUpper(key))
}

// spotifyTokens caches one client-credentials token per key.
type spotifyTokens struct {
	mu    sync.Mutex
	byKey map[string]struct {
		value string
		exp   time.Time
	}
}

func newSpotifyTokens() *spotifyTokens {
	return &spotifyTokens{byKey: map[string]struct {
		value string
		exp   time.Time
	}{}}
}

func (t *spotifyTokens) get(ctx context.Context, key string, force bool) (string, error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if tok, ok := t.byKey[key]; ok && !force && time.Now().Before(tok.exp) {
		return tok.value, nil
	}
	id, secret, err := spotifyCreds(key)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://accounts.spotify.com/api/token", strings.NewReader("grant_type=client_credentials"))
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(id, secret)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode >= 400 {
		return "", fmt.Errorf("spotify token %d: %s", res.StatusCode, body)
	}
	var out struct {
		AccessToken string `json:"access_token"`
		ExpiresIn   int    `json:"expires_in"`
	}
	if err := json.Unmarshal(body, &out); err != nil || out.AccessToken == "" {
		return "", errors.New("spotify token response malformed")
	}
	t.byKey[key] = struct {
		value string
		exp   time.Time
	}{out.AccessToken, time.Now().Add(time.Duration(out.ExpiresIn-60) * time.Second)}
	return out.AccessToken, nil
}

// spGet fetches a Spotify API URL into dst, refreshing the token once on 401
// and waiting out one short 429 (long retry-after = quota exhausted → error).
func (s *server) spGet(ctx context.Context, key, rawURL string, dst any) error {
	refreshed := false
	waited := false
	for {
		tok, err := s.sp.get(ctx, key, refreshed)
		if err != nil {
			return err
		}
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
		if err != nil {
			return err
		}
		req.Header.Set("Authorization", "Bearer "+tok)
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			return err
		}
		body, _ := io.ReadAll(res.Body)
		res.Body.Close()
		switch {
		case res.StatusCode == 401 && !refreshed:
			refreshed = true
			continue
		case res.StatusCode == 429 && !waited:
			wait, _ := strconv.Atoi(res.Header.Get("Retry-After"))
			if wait <= 0 {
				wait = 1
			}
			if wait > 30 {
				return fmt.Errorf("spotify rate limited: retry-after %ds (quota exhausted?)", wait)
			}
			waited = true
			select {
			case <-time.After(time.Duration(wait+1) * time.Second):
			case <-ctx.Done():
				return ctx.Err()
			}
			continue
		case res.StatusCode >= 400:
			return fmt.Errorf("spotify %d @ %s: %.200s", res.StatusCode, rawURL, body)
		}
		return json.Unmarshal(body, dst)
	}
}

// ---- Spotify payload shapes (only the fields we use) ----

type spArtistFull struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Genres []string
	Images []struct {
		URL string `json:"url"`
	}
	Followers struct {
		Total int `json:"total"`
	}
	ExternalURLs struct {
		Spotify string `json:"spotify"`
	} `json:"external_urls"`
}

type spAlbum struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	AlbumType   string `json:"album_type"`
	ReleaseDate string `json:"release_date"`
	TotalTracks int    `json:"total_tracks"`
	Images      []struct {
		URL string `json:"url"`
	}
	ExternalURLs struct {
		Spotify string `json:"spotify"`
	} `json:"external_urls"`
	Artists []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"artists"`
}

func yearOf(release string) *int {
	if len(release) >= 4 {
		if y, err := strconv.Atoi(release[:4]); err == nil {
			return &y
		}
	}
	return nil
}

func strPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// configuredSpotifyKeys scans the environment for <PREFIX>_SPOTIFY_CLIENT_ID/SECRET
// pairs and returns the lowercase prefixes, sorted — so adding THIRD_ (or any
// name) to .env makes it selectable without code changes.
func configuredSpotifyKeys() []string {
	keys := []string{}
	for _, kv := range os.Environ() {
		name, _, ok := strings.Cut(kv, "=")
		if !ok {
			continue
		}
		p, found := strings.CutSuffix(name, "_SPOTIFY_CLIENT_ID")
		if !found || p == "" {
			continue
		}
		if os.Getenv(p+"_SPOTIFY_CLIENT_SECRET") != "" {
			keys = append(keys, strings.ToLower(p))
		}
	}
	sort.Strings(keys)
	return keys
}

// ---- Handlers ----

// GET /admin/spotify/keys — which credential pairs exist; the web toggle renders these.
func (s *server) adminSpotifyKeys(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, configuredSpotifyKeys())
}

// GET /admin/spotify/artists?q=&key= — Spotify artist candidates plus how many
// albums each already has in OUR db (free local lookup; Spotify search carries
// no album count and per-candidate count calls would burn quota).
func (s *server) adminSpotifySearch(w http.ResponseWriter, r *http.Request) {
	q := strings.TrimSpace(r.URL.Query().Get("q"))
	if q == "" {
		writeErr(w, 400, "q is required")
		return
	}
	key := r.URL.Query().Get("key")

	var res struct {
		Artists struct {
			Items []spArtistFull `json:"items"`
		} `json:"artists"`
	}
	u := spAPI + "/search?type=artist&limit=8&q=" + url.QueryEscape(q)
	if err := s.spGet(r.Context(), key, u, &res); err != nil {
		writeErr(w, 502, err.Error())
		return
	}

	ids := make([]string, 0, len(res.Artists.Items))
	for _, a := range res.Artists.Items {
		ids = append(ids, a.ID)
	}
	counts := map[string]int{}
	if len(ids) > 0 {
		rows, err := s.db.Query(r.Context(),
			"SELECT artist_id, COUNT(*)::int FROM album_artists WHERE artist_id = ANY($1) GROUP BY artist_id", ids)
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		for rows.Next() {
			var id string
			var n int
			if err := rows.Scan(&id, &n); err != nil {
				rows.Close()
				writeErr(w, 500, err.Error())
				return
			}
			counts[id] = n
		}
		rows.Close()
	}

	type hit struct {
		ID         string  `json:"id"`
		Name       string  `json:"name"`
		ImageURL   *string `json:"image_url"`
		Followers  int     `json:"followers"`
		AlbumsInDB int     `json:"albums_in_db"`
	}
	out := make([]hit, 0, len(res.Artists.Items))
	for _, a := range res.Artists.Items {
		h := hit{ID: a.ID, Name: a.Name, Followers: a.Followers.Total, AlbumsInDB: counts[a.ID]}
		if len(a.Images) > 0 {
			h.ImageURL = strPtr(a.Images[0].URL)
		}
		out = append(out, h)
	}
	writeJSON(w, 200, out)
}

// POST /admin/spotify/crawl {artist_id, key} — pull every album of the artist
// into the DB (same rules as the crawler: 0 albums → artist not saved; every
// credited artist gets a row + join credits; missing images get enriched).
func (s *server) adminSpotifyCrawl(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ArtistID string `json:"artist_id"`
		Key      string `json:"key"`
	}
	if !decode(w, r, &body) {
		return
	}
	if body.ArtistID == "" {
		writeErr(w, 400, "artist_id is required")
		return
	}
	market := env("MARKET", "KR")

	// Page through the artist's albums (limit is capped at ~10 for client-credentials apps).
	albums := map[string]spAlbum{}
	next := spAPI + "/artists/" + url.PathEscape(body.ArtistID) + "/albums?include_groups=album,single&market=" + url.QueryEscape(market) + "&limit=10"
	for next != "" {
		var page struct {
			Items []spAlbum `json:"items"`
			Next  *string   `json:"next"`
		}
		if err := s.spGet(r.Context(), body.Key, next, &page); err != nil {
			writeErr(w, 502, err.Error())
			return
		}
		for _, al := range page.Items {
			albums[al.ID] = al
		}
		next = ""
		if page.Next != nil {
			next = *page.Next
		}
	}
	if len(albums) == 0 {
		writeJSON(w, 200, map[string]any{"albums": 0, "saved": false})
		return
	}

	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer tx.Rollback(r.Context())

	credited := map[string]bool{}
	for _, al := range albums {
		var img *string
		if len(al.Images) > 0 {
			img = strPtr(al.Images[0].URL)
		}
		if _, err := tx.Exec(r.Context(),
			`INSERT INTO albums(id,name,release_date,year,album_type,total_tracks,image_url,spotify_url)
			 VALUES($1,$2,$3,$4,$5,$6,$7,$8)
			 ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name, release_date=EXCLUDED.release_date,
			   year=EXCLUDED.year, album_type=EXCLUDED.album_type, total_tracks=EXCLUDED.total_tracks,
			   image_url=EXCLUDED.image_url, spotify_url=EXCLUDED.spotify_url`,
			al.ID, al.Name, strPtr(al.ReleaseDate), yearOf(al.ReleaseDate), strPtr(al.AlbumType),
			al.TotalTracks, img, strPtr(al.ExternalURLs.Spotify)); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		if _, err := tx.Exec(r.Context(), "DELETE FROM album_artists WHERE album_id=$1", al.ID); err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		for i, ar := range al.Artists {
			if ar.ID == "" {
				continue
			}
			credited[ar.ID] = true
			if _, err := tx.Exec(r.Context(),
				"INSERT INTO artists(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name",
				ar.ID, strPtr(ar.Name)); err != nil {
				writeErr(w, 500, err.Error())
				return
			}
			if _, err := tx.Exec(r.Context(),
				"INSERT INTO album_artists(album_id,artist_id,position) VALUES($1,$2,$3) ON CONFLICT(album_id,artist_id) DO UPDATE SET position=EXCLUDED.position",
				al.ID, ar.ID, i); err != nil {
				writeErr(w, 500, err.Error())
				return
			}
		}
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeErr(w, 500, err.Error())
		return
	}

	// Enrich only credited artists still missing an image — one request each
	// (the batch /artists endpoint 403s for dev-mode apps).
	ids := make([]string, 0, len(credited))
	for id := range credited {
		ids = append(ids, id)
	}
	var missing []string
	rows, err := s.db.Query(r.Context(),
		"SELECT id FROM artists WHERE id = ANY($1) AND image_url IS NULL", ids)
	if err == nil {
		missing, _ = pgx.CollectRows(rows, pgx.RowTo[string])
	}
	enriched := 0
	for _, id := range missing {
		var a spArtistFull
		if err := s.spGet(r.Context(), body.Key, spAPI+"/artists/"+url.PathEscape(id), &a); err != nil {
			continue // skip quietly; a later enrich run can fill it
		}
		var img *string
		if len(a.Images) > 0 {
			img = strPtr(a.Images[0].URL)
		}
		if _, err := s.db.Exec(r.Context(),
			`UPDATE artists SET name=COALESCE($2,name), image_url=COALESCE($3,image_url),
			   genres=COALESCE($4,genres), spotify_url=COALESCE($5,spotify_url) WHERE id=$1`,
			id, strPtr(a.Name), img, a.Genres, strPtr(a.ExternalURLs.Spotify)); err == nil {
			enriched++
		}
	}

	var name *string
	_ = s.db.QueryRow(r.Context(), "SELECT name FROM artists WHERE id=$1", body.ArtistID).Scan(&name)
	writeJSON(w, 200, map[string]any{
		"albums":      len(albums),
		"saved":       true,
		"artist_name": name,
		"artists":     len(credited),
		"enriched":    enriched,
	})
}
