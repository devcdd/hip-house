package main

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

// typeCond maps a UI type key to its SQL predicate (values fixed → safe to inline).
func typeCond(t string) string {
	switch t {
	case "single":
		return "(album_type='single' AND total_tracks < 3)"
	case "ep":
		return "(album_type='single' AND total_tracks >= 3)"
	case "album":
		return "(album_type='album')"
	}
	return ""
}

// AlbumArtist is one credited artist on an album (via the album_artists join).
type AlbumArtist struct {
	ID         string   `json:"id"`
	Name       *string  `json:"name"`
	ImageURL   *string  `json:"image_url"`
	Genres     []string `json:"genres"`
	SpotifyURL *string  `json:"spotify_url"`
}

type Album struct {
	ID          string  `json:"id" db:"id"`
	Name        string  `json:"name" db:"name"`
	ReleaseDate *string `json:"release_date" db:"release_date"`
	Year        *int    `json:"year" db:"year"`
	AlbumType   *string `json:"album_type" db:"album_type"`
	TotalTracks *int    `json:"total_tracks" db:"total_tracks"`
	ImageURL    *string `json:"image_url" db:"image_url"`
	SpotifyURL  *string `json:"spotify_url" db:"spotify_url"`
	// Read-only, computed on SELECT (not written to the albums table).
	TypeLabel *string       `json:"type_label" db:"type_label"`
	DeletedAt *string       `json:"deleted_at" db:"deleted_at"`
	Artists   []AlbumArtist `json:"artists" db:"artists"` // aggregated from album_artists, ordered by position
}

// albumCols: writable scalar columns on the albums table (INSERT/UPDATE).
// Artists live in the album_artists join table, written separately in a tx.
const albumCols = "id,name,release_date,year,album_type,total_tracks,image_url,spotify_url"

const albumSelectCols = albumCols + `,
	CASE WHEN album_type='album' THEN '정규'
	     WHEN album_type='single' AND total_tracks >= 3 THEN 'EP'
	     WHEN album_type='single' THEN '싱글'
	     ELSE album_type END AS type_label,
	deleted_at::text AS deleted_at,
	COALESCE((
		SELECT json_agg(json_build_object('id', ar.id, 'name', ar.name, 'image_url', ar.image_url, 'genres', ar.genres, 'spotify_url', ar.spotify_url) ORDER BY aa.position)
		FROM album_artists aa JOIN artists ar ON ar.id = aa.artist_id
		WHERE aa.album_id = albums.id
	), '[]'::json) AS artists`

// orderClause maps a sort key to a whitelisted ORDER BY (never interpolate raw input).
func orderClause(sort string) string {
	switch sort {
	case "tracks":
		return "total_tracks DESC NULLS LAST, name"
	default: // "recent" and anything unknown — release_date is ISO text, sorts chronologically
		return "release_date DESC NULLS LAST, year DESC NULLS LAST, name"
	}
}

// buildAlbumListQuery is pure so it can be unit-tested without a DB.
// deleted selects soft-delete visibility: "hide" (public), "include" (admin
// browsing — deleted rows mixed in, dimmed client-side), "only" (admin 삭제 목록).
func buildAlbumListQuery(year *int, artistID, q string, types []string, sort string, deleted string, limit, offset int) (string, []any) {
	sql := "SELECT " + albumSelectCols + " FROM albums WHERE 1=1"
	switch deleted {
	case "include": // no filter
	case "only":
		sql += " AND deleted_at IS NOT NULL"
	default: // "hide"
		sql += " AND deleted_at IS NULL"
	}
	var args []any
	if year != nil {
		args = append(args, *year)
		sql += " AND year = $" + strconv.Itoa(len(args))
	}
	if artistID != "" {
		args = append(args, artistID)
		sql += " AND EXISTS (SELECT 1 FROM album_artists aa WHERE aa.album_id = albums.id AND aa.artist_id = $" + strconv.Itoa(len(args)) + ")"
	}
	// q matches the album name, a credited artist's name, or any admin-curated
	// alias (연관검색어) — so "블랙넛" finds albums stored under "Black Nut".
	if q != "" {
		args = append(args, "%"+q+"%")
		p := "$" + strconv.Itoa(len(args))
		sql += " AND (albums.name ILIKE " + p +
			" OR EXISTS (SELECT 1 FROM album_artists aa JOIN artists ar ON ar.id = aa.artist_id" +
			" WHERE aa.album_id = albums.id AND (ar.name ILIKE " + p +
			" OR EXISTS (SELECT 1 FROM unnest(COALESCE(ar.aliases,'{}'::text[])) AS al WHERE al ILIKE " + p + "))))"
	}
	// Multi-select album types combine with OR. Empty = no filter (전체).
	var conds []string
	for _, t := range types {
		if c := typeCond(t); c != "" {
			conds = append(conds, c)
		}
	}
	if len(conds) > 0 {
		sql += " AND (" + strings.Join(conds, " OR ") + ")"
	}
	sql += " ORDER BY " + orderClause(sort)
	args = append(args, limit)
	sql += " LIMIT $" + strconv.Itoa(len(args))
	args = append(args, offset)
	sql += " OFFSET $" + strconv.Itoa(len(args))
	return sql, args
}

func (a *Album) validate() string {
	switch {
	case a.ID == "":
		return "id is required"
	case a.Name == "":
		return "name is required"
	case len(a.Artists) == 0:
		return "at least one artist is required"
	}
	for _, ar := range a.Artists {
		if ar.ID == "" {
			return "artist id is required"
		}
	}
	return ""
}

// replaceAlbumArtists upserts each artist and rewrites the album's join rows.
// Runs inside the caller's transaction so an album + its artists commit atomically.
func replaceAlbumArtists(ctx context.Context, tx pgx.Tx, albumID string, artists []AlbumArtist) error {
	if _, err := tx.Exec(ctx, "DELETE FROM album_artists WHERE album_id=$1", albumID); err != nil {
		return err
	}
	for i, ar := range artists {
		if _, err := tx.Exec(ctx,
			"INSERT INTO artists(id,name) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET name=EXCLUDED.name",
			ar.ID, ar.Name); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx,
			"INSERT INTO album_artists(album_id,artist_id,position) VALUES($1,$2,$3) ON CONFLICT(album_id,artist_id) DO UPDATE SET position=EXCLUDED.position",
			albumID, ar.ID, i); err != nil {
			return err
		}
	}
	return nil
}

func (s *server) listAlbums(w http.ResponseWriter, r *http.Request) {
	limit, offset := clampPage(r)
	q := r.URL.Query()
	// type can be comma-separated (multi-select). Admins see soft-deleted albums (dimmed client-side).
	var types []string
	for _, t := range strings.Split(q.Get("type"), ",") {
		if t = strings.TrimSpace(t); t != "" {
			types = append(types, t)
		}
	}
	// Soft-delete visibility: public sees live albums only; admins see deleted
	// rows mixed in, or exclusively with ?deleted=only (관리자 삭제 목록).
	deleted := "hide"
	if s.isAdminReq(r) {
		if q.Get("deleted") == "only" {
			deleted = "only"
		} else {
			deleted = "include"
		}
	}
	sql, args := buildAlbumListQuery(queryIntPtr(r, "year"), q.Get("artist_id"), q.Get("q"), types, q.Get("sort"), deleted, limit, offset)
	rows, err := s.db.Query(r.Context(), sql, args...)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	albums, err := pgx.CollectRows(rows, pgx.RowToStructByName[Album])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, albums)
}

// listYears returns distinct album years, newest first — powers the UI year filter.
func (s *server) listYears(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), "SELECT DISTINCT year FROM albums WHERE year IS NOT NULL ORDER BY year DESC")
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	years, err := pgx.CollectRows(rows, pgx.RowTo[int])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, years)
}

func (s *server) getAlbum(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), "SELECT "+albumSelectCols+" FROM albums WHERE id=$1", r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	a, err := pgx.CollectExactlyOneRow(rows, pgx.RowToStructByName[Album])
	if errors.Is(err, pgx.ErrNoRows) {
		writeErr(w, 404, "album not found")
		return
	}
	// Hide soft-deleted albums from non-admins.
	if err == nil && a.DeletedAt != nil && !s.isAdminReq(r) {
		writeErr(w, 404, "album not found")
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, a)
}

func (s *server) createAlbum(w http.ResponseWriter, r *http.Request) {
	var a Album
	if !decode(w, r, &a) {
		return
	}
	if msg := a.validate(); msg != "" {
		writeErr(w, 400, msg)
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer tx.Rollback(r.Context())

	_, err = tx.Exec(r.Context(),
		"INSERT INTO albums("+albumCols+") VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
		a.ID, a.Name, a.ReleaseDate, a.Year, a.AlbumType, a.TotalTracks, a.ImageURL, a.SpotifyURL)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeErr(w, 409, "album id already exists")
		return
	}
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if err := replaceAlbumArtists(r.Context(), tx, a.ID, a.Artists); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 201, a)
}

func (s *server) updateAlbum(w http.ResponseWriter, r *http.Request) {
	var a Album
	if !decode(w, r, &a) {
		return
	}
	a.ID = r.PathValue("id")
	if msg := a.validate(); msg != "" {
		writeErr(w, 400, msg)
		return
	}
	tx, err := s.db.Begin(r.Context())
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	defer tx.Rollback(r.Context())

	tag, err := tx.Exec(r.Context(),
		"UPDATE albums SET name=$2,release_date=$3,year=$4,album_type=$5,total_tracks=$6,image_url=$7,spotify_url=$8 WHERE id=$1",
		a.ID, a.Name, a.ReleaseDate, a.Year, a.AlbumType, a.TotalTracks, a.ImageURL, a.SpotifyURL)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "album not found")
		return
	}
	if err := replaceAlbumArtists(r.Context(), tx, a.ID, a.Artists); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if err := tx.Commit(r.Context()); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, a)
}

// deleteAlbum soft-deletes: sets deleted_at instead of removing the row.
func (s *server) deleteAlbum(w http.ResponseWriter, r *http.Request) {
	tag, err := s.db.Exec(r.Context(), "UPDATE albums SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL", r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "album not found or already deleted")
		return
	}
	w.WriteHeader(204)
}

// restoreAlbum clears deleted_at (admin undo).
func (s *server) restoreAlbum(w http.ResponseWriter, r *http.Request) {
	tag, err := s.db.Exec(r.Context(), "UPDATE albums SET deleted_at=NULL WHERE id=$1 AND deleted_at IS NOT NULL", r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "album not found or not deleted")
		return
	}
	w.WriteHeader(204)
}
