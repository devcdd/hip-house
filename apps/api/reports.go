package main

import (
	"net/http"

	"github.com/jackc/pgx/v5"
)

// Two user-flag tables with the same shape: one row per user per album, so a
// count is a number of people rather than a number of clicks.
//
//	not_hiphop_reports — "힙합이 아니에요" (크롤러가 디스코그래피를 통째로 긁어와
//	                     OST 같은 게 섞인다)
//	rename_requests    — "앨범명 좀 바꿔주세요" (Spotify는 유통사가 등록한 영문명만
//	                     주므로, 한글명이 필요하면 사용자가 요청한다)
//
// The handlers below are parameterized by table name. It's a package constant,
// never user input, so inlining it into SQL is safe.
const (
	tblNotHiphop = "not_hiphop_reports"
	tblRename    = "rename_requests"
)

// FlaggedAlbum is an album plus how many users flagged it.
type FlaggedAlbum struct {
	Album
	ReportCount int `json:"report_count" db:"report_count"`
}

// flaggedAlbumsSQL: every album with at least one flag in `table`, most-flagged
// first. Soft-deleted albums are included so an admin can see it was handled.
func flaggedAlbumsSQL(table string) string {
	return `
		SELECT ` + albumSelectCols + `,
		       (SELECT count(*) FROM ` + table + ` rp WHERE rp.album_id = albums.id)::int AS report_count
		FROM albums
		WHERE EXISTS (SELECT 1 FROM ` + table + ` rp WHERE rp.album_id = albums.id)
		ORDER BY report_count DESC, name`
}

// listFlags returns the album ids the caller flagged, so the button can render
// its state.
func (s *server) listFlags(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := s.db.Query(r.Context(), "SELECT album_id FROM "+table+" WHERE user_id=$1", currentUser(r).ID)
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
}

// addFlag is idempotent — one row per user per album.
func (s *server) addFlag(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := s.db.Exec(r.Context(),
			"INSERT INTO "+table+"(user_id,album_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
			currentUser(r).ID, r.PathValue("id"))
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		w.WriteHeader(204)
	}
}

func (s *server) removeFlag(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := s.db.Exec(r.Context(), "DELETE FROM "+table+" WHERE user_id=$1 AND album_id=$2",
			currentUser(r).ID, r.PathValue("id"))
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		w.WriteHeader(204)
	}
}

func (s *server) adminListFlagged(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := s.db.Query(r.Context(), flaggedAlbumsSQL(table))
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		albums, err := pgx.CollectRows(rows, pgx.RowToStructByName[FlaggedAlbum])
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		if albums == nil {
			albums = []FlaggedAlbum{}
		}
		writeJSON(w, 200, albums)
	}
}

// adminClearFlags drops every flag on an album — "확인했고, 처리 끝".
func (s *server) adminClearFlags(table string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		_, err := s.db.Exec(r.Context(), "DELETE FROM "+table+" WHERE album_id=$1", r.PathValue("id"))
		if err != nil {
			writeErr(w, 500, err.Error())
			return
		}
		w.WriteHeader(204)
	}
}
