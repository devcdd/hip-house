package main

import (
	"net/http"

	"github.com/jackc/pgx/v5"
)

// Rating is the current user's own score for an album. score counts half-stars
// (1..10), so 7 renders as 3.5 stars — an integer keeps the CHECK constraint and
// the client math trivial, and dodges float rounding on a 0.5 step.
type Rating struct {
	AlbumID string `json:"album_id" db:"album_id"`
	Score   int    `json:"score" db:"score"`
}

func (s *server) listRatings(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		"SELECT album_id, score FROM ratings WHERE user_id=$1", currentUser(r).ID)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	ratings, err := pgx.CollectRows(rows, pgx.RowToStructByName[Rating])
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, ratings)
}

// listRatedAlbums returns the full album rows the user has rated, most-recently
// rated first — mirrors listFavorites so the my-page can render album cards.
func (s *server) listRatedAlbums(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Query(r.Context(),
		"SELECT "+albumSelectCols+" FROM albums JOIN ratings rt ON rt.album_id=albums.id "+
			"WHERE rt.user_id=$1 ORDER BY rt.updated_at DESC", currentUser(r).ID)
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

func (s *server) putRating(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Score int `json:"score"`
	}
	if !decode(w, r, &body) {
		return
	}
	if body.Score < 1 || body.Score > 10 {
		writeErr(w, 400, "score must be 1..10 (half-stars)")
		return
	}
	_, err := s.db.Exec(r.Context(),
		`INSERT INTO ratings(user_id,album_id,score) VALUES($1,$2,$3)
		 ON CONFLICT (user_id,album_id) DO UPDATE SET score=EXCLUDED.score, updated_at=now()`,
		currentUser(r).ID, r.PathValue("albumId"), body.Score)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}

func (s *server) deleteRating(w http.ResponseWriter, r *http.Request) {
	_, err := s.db.Exec(r.Context(), "DELETE FROM ratings WHERE user_id=$1 AND album_id=$2",
		currentUser(r).ID, r.PathValue("albumId"))
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	w.WriteHeader(204)
}
