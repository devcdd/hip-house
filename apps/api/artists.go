package main

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Artist struct {
	ID         string   `json:"id" db:"id"`
	Name       *string  `json:"name" db:"name"`
	ImageURL   *string  `json:"image_url" db:"image_url"`
	Genres     []string `json:"genres" db:"genres"`
	SpotifyURL *string  `json:"spotify_url" db:"spotify_url"`
	// 연관검색어 — admin-curated search keywords (e.g. Korean spellings of an
	// English artist name). Never written by the crawler.
	Aliases []string `json:"aliases" db:"aliases"`
}

const artistCols = "id,name,image_url,genres,spotify_url,aliases"

func (s *server) listArtists(w http.ResponseWriter, r *http.Request) {
	limit, offset := clampPage(r)
	sql := "SELECT " + artistCols + " FROM artists WHERE 1=1"
	var args []any
	// q matches the artist name OR any admin-curated alias (연관검색어), so a
	// Korean query finds artists stored under an English name.
	if q := r.URL.Query().Get("q"); q != "" {
		args = append(args, "%"+q+"%")
		p := "$" + strconv.Itoa(len(args))
		sql += " AND (name ILIKE " + p +
			" OR EXISTS (SELECT 1 FROM unnest(COALESCE(aliases,'{}'::text[])) AS al WHERE al ILIKE " + p + "))"
	}
	args = append(args, limit)
	sql += " ORDER BY name LIMIT $" + strconv.Itoa(len(args))
	args = append(args, offset)
	sql += " OFFSET $" + strconv.Itoa(len(args))
	rows, err := s.db.Query(r.Context(), sql, args...)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	artists, err := pgx.CollectRows(rows, pgx.RowToStructByName[Artist])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, artists)
}

func (s *server) getArtist(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), "SELECT "+artistCols+" FROM artists WHERE id=$1", r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	a, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Artist])
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(w, 404, "artist not found")
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, a)
}

func (s *server) createArtist(w http.ResponseWriter, r *http.Request) {
	var a Artist
	if !decode(w, r, &a) {
		return
	}
	if a.ID == "" {
		writeErr(w, 400, "id is required")
		return
	}
	_, err := s.db.Exec(r.Context(), "INSERT INTO artists("+artistCols+") VALUES($1,$2,$3,$4,$5,$6)",
		a.ID, a.Name, a.ImageURL, a.Genres, a.SpotifyURL, normalizeAliases(a.Aliases))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeErr(w, 409, "artist id already exists")
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, a)
}

func (s *server) updateArtist(w http.ResponseWriter, r *http.Request) {
	var a Artist
	if !decode(w, r, &a) {
		return
	}
	a.ID = r.PathValue("id")
	tag, err := s.db.Exec(r.Context(), "UPDATE artists SET name=$2,image_url=$3,genres=$4,spotify_url=$5,aliases=$6 WHERE id=$1",
		a.ID, a.Name, a.ImageURL, a.Genres, a.SpotifyURL, normalizeAliases(a.Aliases))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "artist not found")
		return
	}
	writeJSON(w, 200, a)
}

// normalizeAliases trims, drops empties, and dedups while keeping order.
func normalizeAliases(in []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, a := range in {
		if a = strings.TrimSpace(a); a != "" && !seen[a] {
			seen[a] = true
			out = append(out, a)
		}
	}
	return out
}

// updateArtistAliases replaces only the aliases (연관검색어) — the admin UI edits
// these without clobbering crawler-owned fields (name/image/genres/spotify_url).
func (s *server) updateArtistAliases(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Aliases []string `json:"aliases"`
	}
	if !decode(w, r, &body) {
		return
	}
	rows, err := s.db.Query(r.Context(),
		"UPDATE artists SET aliases=$2 WHERE id=$1 RETURNING "+artistCols,
		r.PathValue("id"), normalizeAliases(body.Aliases))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	a, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Artist])
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(w, 404, "artist not found")
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, a)
}

func (s *server) deleteArtist(w http.ResponseWriter, r *http.Request) {
	tag, err := s.db.Exec(r.Context(), "DELETE FROM artists WHERE id=$1", r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "artist not found")
		return
	}
	w.WriteHeader(204)
}
