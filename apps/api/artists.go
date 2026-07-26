package main

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Artist struct {
	ID       string  `json:"id" db:"id"`
	Name     *string `json:"name" db:"name"`
	ImageURL *string `json:"image_url" db:"image_url"`
}

func (s *server) listArtists(w http.ResponseWriter, r *http.Request) {
	limit, offset := clampPage(r)
	sql := "SELECT id,name,image_url FROM artists WHERE 1=1"
	var args []any
	if q := r.URL.Query().Get("q"); q != "" {
		args = append(args, "%"+q+"%")
		sql += " AND name ILIKE $" + strconv.Itoa(len(args))
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
	rows, err := s.db.Query(r.Context(), "SELECT id,name,image_url FROM artists WHERE id=$1", r.PathValue("id"))
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
	_, err := s.db.Exec(r.Context(), "INSERT INTO artists(id,name,image_url) VALUES($1,$2,$3)", a.ID, a.Name, a.ImageURL)
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
	tag, err := s.db.Exec(r.Context(), "UPDATE artists SET name=$2,image_url=$3 WHERE id=$1", a.ID, a.Name, a.ImageURL)
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
