package main

import (
	"net/http"

	"github.com/jackc/pgx/v5"
)

// ReportedAlbum is an album plus how many users flagged it as not hip-hop.
// The crawler pulls whole artist discographies, so OSTs and other stray genres
// slip in; this is how users point them out.
type ReportedAlbum struct {
	Album
	ReportCount int `json:"report_count" db:"report_count"`
}

// listMyReports returns the album ids the caller has flagged, so the button can
// render its state.
func (s *server) listMyReports(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		"SELECT album_id FROM not_hiphop_reports WHERE user_id=$1", currentUser(r).ID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	ids, err := pgx.CollectRows(rows, pgx.RowTo[string])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if ids == nil {
		ids = []string{}
	}
	writeJSON(w, 200, ids)
}

// addReport is idempotent: one row per user per album, so the count is a number
// of people rather than a number of clicks.
func (s *server) addReport(w http.ResponseWriter, r *http.Request) {
	_, err := s.db.Exec(r.Context(),
		"INSERT INTO not_hiphop_reports(user_id,album_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
		currentUser(r).ID, r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func (s *server) removeReport(w http.ResponseWriter, r *http.Request) {
	_, err := s.db.Exec(r.Context(), "DELETE FROM not_hiphop_reports WHERE user_id=$1 AND album_id=$2",
		currentUser(r).ID, r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

// adminListReports: most-reported first. Soft-deleted albums are included so an
// admin can see that a flagged album was already handled.
func (s *server) adminListReports(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(), `
		SELECT `+albumSelectCols+`,
		       (SELECT count(*) FROM not_hiphop_reports rp WHERE rp.album_id = albums.id)::int AS report_count
		FROM albums
		WHERE EXISTS (SELECT 1 FROM not_hiphop_reports rp WHERE rp.album_id = albums.id)
		ORDER BY report_count DESC, name`)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	albums, err := pgx.CollectRows(rows, pgx.RowToStructByName[ReportedAlbum])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if albums == nil {
		albums = []ReportedAlbum{}
	}
	writeJSON(w, 200, albums)
}

// adminClearReports drops every report on an album — "checked it, it's fine".
func (s *server) adminClearReports(w http.ResponseWriter, r *http.Request) {
	_, err := s.db.Exec(r.Context(), "DELETE FROM not_hiphop_reports WHERE album_id=$1", r.PathValue("id"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
