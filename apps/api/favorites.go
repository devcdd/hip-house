package main

import (
	"net/http"

	"github.com/jackc/pgx/v5"
)

// listFavorites returns the current user's favorited albums (full album rows).
func (s *server) listFavorites(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		"SELECT "+albumCols+" FROM albums a JOIN favorites f ON f.album_id=a.id "+
			"WHERE f.user_id=$1 ORDER BY f.created_at DESC", currentUser(r).ID)
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

func (s *server) addFavorite(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AlbumID string `json:"album_id"`
	}
	if !decode(w, r, &body) {
		return
	}
	if body.AlbumID == "" {
		writeErr(w, 400, "album_id is required")
		return
	}
	_, err := s.db.Exec(r.Context(),
		"INSERT INTO favorites(user_id,album_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
		currentUser(r).ID, body.AlbumID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func (s *server) removeFavorite(w http.ResponseWriter, r *http.Request) {
	_, err := s.db.Exec(r.Context(), "DELETE FROM favorites WHERE user_id=$1 AND album_id=$2",
		currentUser(r).ID, r.PathValue("albumId"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
