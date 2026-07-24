package main

import (
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

type Album struct {
	ID          string  `json:"id" db:"id"`
	Name        string  `json:"name" db:"name"`
	ArtistID    string  `json:"artist_id" db:"artist_id"`
	ArtistName  string  `json:"artist_name" db:"artist_name"`
	ReleaseDate *string `json:"release_date" db:"release_date"`
	Year        *int    `json:"year" db:"year"`
	AlbumType   *string `json:"album_type" db:"album_type"`
	TotalTracks *int    `json:"total_tracks" db:"total_tracks"`
	ImageURL    *string `json:"image_url" db:"image_url"`
	SpotifyURL  *string `json:"spotify_url" db:"spotify_url"`
	// Read-only, computed on SELECT (not written).
	TypeLabel *string `json:"type_label" db:"type_label"`
	DeletedAt *string `json:"deleted_at" db:"deleted_at"`
}

// albumCols: writable columns (INSERT/UPDATE). selectCols adds computed read-only fields.
const albumCols = "id,name,artist_id,artist_name,release_date,year,album_type,total_tracks,image_url,spotify_url"

const albumSelectCols = albumCols + `,
	CASE WHEN album_type='album' THEN '정규'
	     WHEN album_type='single' AND total_tracks >= 3 THEN 'EP'
	     WHEN album_type='single' THEN '싱글'
	     ELSE album_type END AS type_label,
	deleted_at::text AS deleted_at`

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
// includeDeleted keeps soft-deleted rows (admin view); otherwise they're hidden.
func buildAlbumListQuery(year *int, artistID, q string, types []string, sort string, includeDeleted bool, limit, offset int) (string, []any) {
	sql := "SELECT " + albumSelectCols + " FROM albums WHERE 1=1"
	if !includeDeleted {
		sql += " AND deleted_at IS NULL"
	}
	var args []any
	if year != nil {
		args = append(args, *year)
		sql += " AND year = $" + strconv.Itoa(len(args))
	}
	if artistID != "" {
		args = append(args, artistID)
		sql += " AND artist_id = $" + strconv.Itoa(len(args))
	}
	if q != "" {
		args = append(args, "%"+q+"%")
		sql += " AND name ILIKE $" + strconv.Itoa(len(args))
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
	case a.ArtistID == "":
		return "artist_id is required"
	case a.ArtistName == "":
		return "artist_name is required"
	}
	return ""
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
	sql, args := buildAlbumListQuery(queryIntPtr(r, "year"), q.Get("artist_id"), q.Get("q"), types, q.Get("sort"), s.isAdminReq(r), limit, offset)
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
	_, err := s.db.Exec(r.Context(),
		"INSERT INTO albums("+albumCols+") VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
		a.ID, a.Name, a.ArtistID, a.ArtistName, a.ReleaseDate, a.Year, a.AlbumType, a.TotalTracks, a.ImageURL, a.SpotifyURL)
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		writeErr(w, 409, "album id already exists")
		return
	}
	if err != nil {
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
	tag, err := s.db.Exec(r.Context(),
		"UPDATE albums SET name=$2,artist_id=$3,artist_name=$4,release_date=$5,year=$6,album_type=$7,total_tracks=$8,image_url=$9,spotify_url=$10 WHERE id=$1",
		a.ID, a.Name, a.ArtistID, a.ArtistName, a.ReleaseDate, a.Year, a.AlbumType, a.TotalTracks, a.ImageURL, a.SpotifyURL)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if tag.RowsAffected() == 0 {
		writeErr(w, 404, "album not found")
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
