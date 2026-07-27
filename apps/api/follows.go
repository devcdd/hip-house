package main

import (
	"net/http"

	"github.com/jackc/pgx/v5"
)

// listFollows returns the artists the caller follows, most recently followed first.
func (s *server) listFollows(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		// No alias on artists: artistCols is unqualified and follows shares none
		// of those column names, so the join stays unambiguous.
		"SELECT "+artistCols+" FROM artists JOIN follows f ON f.artist_id=artists.id "+
			"WHERE f.user_id=$1 ORDER BY f.created_at DESC", currentUser(r).ID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	artists, err := pgx.CollectRows(rows, pgx.RowToStructByName[Artist])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if artists == nil {
		artists = []Artist{}
	}
	writeJSON(w, 200, artists)
}

func (s *server) addFollow(w http.ResponseWriter, r *http.Request) {
	var body struct {
		ArtistID string `json:"artist_id"`
	}
	if !decode(w, r, &body) {
		return
	}
	if body.ArtistID == "" {
		writeErr(w, 400, "artist_id is required")
		return
	}
	// follows has no FK to artists (the crawler owns that table), so check here.
	var exists bool
	if err := s.db.QueryRow(r.Context(), "SELECT EXISTS (SELECT 1 FROM artists WHERE id=$1)", body.ArtistID).
		Scan(&exists); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	if !exists {
		writeErr(w, 404, "artist not found")
		return
	}
	_, err := s.db.Exec(r.Context(),
		"INSERT INTO follows(user_id,artist_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
		currentUser(r).ID, body.ArtistID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func (s *server) removeFollow(w http.ResponseWriter, r *http.Request) {
	_, err := s.db.Exec(r.Context(), "DELETE FROM follows WHERE user_id=$1 AND artist_id=$2",
		currentUser(r).ID, r.PathValue("artistId"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
