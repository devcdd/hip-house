package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type server struct {
	db          *pgxpool.Pool
	jwtSecret   []byte
	kakaoKey    string
	kakaoSecret string
	adminIDs    map[string]bool
}

func main() {
	// Single source of truth: repo-root .env (dev cwd is apps/api). Real env wins.
	loadDotenv(env("ENV_FILE", ""), "../../.env", ".env")

	dsn := env("DATABASE_URL", "postgres://hiphouse:hiphouse@localhost:5432/hiphouse")
	port := env("PORT", "8080")

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		log.Fatalf("db pool: %v", err)
	}
	defer pool.Close()
	if err := pool.Ping(ctx); err != nil {
		log.Fatalf("db ping (is `docker compose up -d db` running?): %v", err)
	}

	s := &server{
		db:          pool,
		jwtSecret:   []byte(env("JWT_SECRET", "dev-insecure-secret-change-me")),
		kakaoKey:    os.Getenv("KAKAO_REST_API_KEY"),
		kakaoSecret: os.Getenv("KAKAO_CLIENT_SECRET"),
		adminIDs:    parseAdminIDs(os.Getenv("ADMIN_KAKAO_IDS")),
	}
	if err := s.ensureAuthSchema(ctx); err != nil {
		log.Fatalf("auth schema: %v", err)
	}

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) { w.Write([]byte("ok")) })

	// Auth
	mux.HandleFunc("POST /auth/kakao", s.loginKakao)
	mux.HandleFunc("GET /me", s.requireAuth(s.me))

	// Favorites (auth required)
	mux.HandleFunc("GET /favorites", s.requireAuth(s.listFavorites))
	mux.HandleFunc("POST /favorites", s.requireAuth(s.addFavorite))
	mux.HandleFunc("DELETE /favorites/{albumId}", s.requireAuth(s.removeFavorite))

	// Albums — reads public, writes admin-only
	mux.HandleFunc("GET /albums", s.listAlbums)
	mux.HandleFunc("GET /albums/years", s.listYears)
	mux.HandleFunc("POST /albums", s.requireAdmin(s.createAlbum))
	mux.HandleFunc("GET /albums/{id}", s.getAlbum)
	mux.HandleFunc("PUT /albums/{id}", s.requireAdmin(s.updateAlbum))
	mux.HandleFunc("DELETE /albums/{id}", s.requireAdmin(s.deleteAlbum))
	mux.HandleFunc("POST /albums/{id}/restore", s.requireAdmin(s.restoreAlbum))

	// Artists — reads public, writes admin-only
	mux.HandleFunc("GET /artists", s.listArtists)
	mux.HandleFunc("POST /artists", s.requireAdmin(s.createArtist))
	mux.HandleFunc("GET /artists/{id}", s.getArtist)
	mux.HandleFunc("PUT /artists/{id}", s.requireAdmin(s.updateArtist))
	mux.HandleFunc("PUT /artists/{id}/aliases", s.requireAdmin(s.updateArtistAliases))
	mux.HandleFunc("POST /artists/merge", s.requireAdmin(s.mergeArtists))
	mux.HandleFunc("DELETE /artists/{id}", s.requireAdmin(s.deleteArtist))

	mux.HandleFunc("GET /openapi.json", serveSpec)
	mux.HandleFunc("GET /swagger/", swaggerUI)

	log.Printf("listening on :%s  (swagger: http://localhost:%s/swagger/)", port, port)
	srv := &http.Server{Addr: ":" + port, Handler: logRequests(mux), ReadHeaderTimeout: 5 * time.Second}
	log.Fatal(srv.ListenAndServe())
}

// ensureAuthSchema creates the users/favorites tables and runs idempotent
// migrations on the crawler-owned albums/artists tables (safe to run on every boot).
func (s *server) ensureAuthSchema(ctx context.Context) error {
	_, err := s.db.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS users (
			id TEXT PRIMARY KEY,
			nickname TEXT NOT NULL DEFAULT '',
			role TEXT NOT NULL DEFAULT 'user',
			created_at TIMESTAMPTZ NOT NULL DEFAULT now()
		);
		CREATE TABLE IF NOT EXISTS favorites (
			user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			album_id TEXT NOT NULL,
			created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
			PRIMARY KEY (user_id, album_id)
		);
		ALTER TABLE IF EXISTS albums ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

		-- Normalize album↔artist into a many-to-many join (was albums.artist_id/artist_name).
		CREATE TABLE IF NOT EXISTS album_artists (
			album_id  TEXT NOT NULL,
			artist_id TEXT NOT NULL,
			position  INTEGER NOT NULL DEFAULT 0,
			PRIMARY KEY (album_id, artist_id)
		);
		CREATE INDEX IF NOT EXISTS idx_album_artists_artist ON album_artists(artist_id);
		ALTER TABLE IF EXISTS artists ADD COLUMN IF NOT EXISTS image_url TEXT;
		ALTER TABLE IF EXISTS artists ADD COLUMN IF NOT EXISTS genres TEXT[];
		ALTER TABLE IF EXISTS artists ADD COLUMN IF NOT EXISTS spotify_url TEXT;
		ALTER TABLE IF EXISTS artists ADD COLUMN IF NOT EXISTS aliases TEXT[];

		-- Backfill the legacy single-artist column into the join table. We DON'T drop
		-- the old artist_id/artist_name columns: artist_name still holds the only record
		-- of featured artists (they never had IDs), so keeping it avoids data loss and
		-- lets an old API image roll back. We just relax NOT NULL so the normalized
		-- crawler/API can ignore them. A re-crawl repopulates album_artists with real
		-- IDs for every credited artist; the dead columns can be dropped later.
		DO $$
		BEGIN
			IF EXISTS (SELECT 1 FROM information_schema.columns
			           WHERE table_name = 'albums' AND column_name = 'artist_id') THEN
				INSERT INTO album_artists(album_id, artist_id, position)
				SELECT id, artist_id, 0 FROM albums WHERE artist_id IS NOT NULL AND artist_id <> ''
				ON CONFLICT DO NOTHING;
				ALTER TABLE albums ALTER COLUMN artist_id DROP NOT NULL;
				ALTER TABLE albums ALTER COLUMN artist_name DROP NOT NULL;
			END IF;
		END $$;`)
	return err
}

func parseAdminIDs(csv string) map[string]bool {
	ids := map[string]bool{}
	for _, id := range strings.Split(csv, ",") {
		if id = strings.TrimSpace(id); id != "" {
			ids[id] = true
		}
	}
	return ids
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

// decode reads a JSON body into dst; on failure it writes 400 and returns false.
func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid JSON: "+err.Error())
		return false
	}
	return true
}

// clampPage reads limit/offset query params with sane defaults and bounds.
func clampPage(r *http.Request) (limit, offset int) {
	limit = queryInt(r, "limit", 50)
	if limit < 1 || limit > 200 {
		limit = 50
	}
	offset = queryInt(r, "offset", 0)
	if offset < 0 {
		offset = 0
	}
	return
}

func queryInt(r *http.Request, key string, def int) int {
	if n, err := strconv.Atoi(r.URL.Query().Get(key)); err == nil {
		return n
	}
	return def
}

func queryIntPtr(r *http.Request, key string) *int {
	if n, err := strconv.Atoi(r.URL.Query().Get(key)); err == nil {
		return &n
	}
	return nil
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
		log.Printf("%s %s", r.Method, r.URL.Path)
	})
}
