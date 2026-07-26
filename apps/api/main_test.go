package main

import (
	"encoding/json"
	"strings"
	"testing"
)

// The album_artists subquery returns json shaped like this; pgx's json codec
// json.Unmarshals it straight into []AlbumArtist. Lock that contract + the wire shape.
func TestAlbumArtistsJSON(t *testing.T) {
	var got []AlbumArtist
	if err := json.Unmarshal([]byte(`[{"id":"a1","name":"X"},{"id":"a2","name":null}]`), &got); err != nil {
		t.Fatal(err)
	}
	if len(got) != 2 || got[0].ID != "a1" || got[0].Name == nil || *got[0].Name != "X" || got[1].Name != nil {
		t.Fatalf("unmarshal mismatch: %+v", got)
	}

	b, err := json.Marshal(Album{ID: "x", Name: "n", Artists: got})
	if err != nil {
		t.Fatal(err)
	}
	s := string(b)
	if strings.Contains(s, "artist_id") || strings.Contains(s, "artist_name") {
		t.Fatalf("legacy artist fields leaked into wire JSON: %s", s)
	}
	if !strings.Contains(s, `"artists":[`) {
		t.Fatalf("artists array missing from wire JSON: %s", s)
	}
}

func TestBuildAlbumListQuery(t *testing.T) {
	// year + artist filters present: placeholders must be $1..$4 in order.
	y := 2024
	// Multi-type (single OR ep): predicates inlined (no args), so placeholders stay year/artist/q + limit/offset.
	sql, args := buildAlbumListQuery(&y, "abc", "dre", []string{"single", "ep"}, "tracks", "hide", 10, 5)
	if want := []any{2024, "abc", "%dre%", 10, 5}; !eq(args, want) {
		t.Fatalf("args = %v, want %v", args, want)
	}
	for _, frag := range []string{
		"year = $1", "aa.artist_id = $2",
		// q must match the album name, credited artist names, and aliases — one arg, reused placeholder.
		"albums.name ILIKE $3", "ar.name ILIKE $3", "al ILIKE $3",
		"(album_type='single' AND total_tracks < 3)", "(album_type='single' AND total_tracks >= 3)", " OR ",
		"total_tracks DESC", "LIMIT $4", "OFFSET $5",
	} {
		if !strings.Contains(sql, frag) {
			t.Errorf("missing %q in %s", frag, sql)
		}
	}
	// public view hides soft-deleted rows.
	if !strings.Contains(sql, "deleted_at IS NULL") {
		t.Errorf("expected deleted_at filter: %s", sql)
	}

	// no filters: limit/offset shift to $1/$2 (the bug this guards against), default sort by year.
	sql, args = buildAlbumListQuery(nil, "", "", nil, "", "include", 50, 0)
	if want := []any{50, 0}; !eq(args, want) {
		t.Fatalf("args = %v, want %v", args, want)
	}
	if !strings.Contains(sql, "LIMIT $1") || !strings.Contains(sql, "OFFSET $2") {
		t.Errorf("placeholders misaligned: %s", sql)
	}
	if !strings.Contains(sql, "release_date DESC NULLS LAST") {
		t.Errorf("default sort should be by release_date: %s", sql)
	}
	// admin browsing ("include") must NOT filter deleted_at either way.
	if strings.Contains(sql, "deleted_at IS NULL") || strings.Contains(sql, "deleted_at IS NOT NULL") {
		t.Errorf("include mode should not filter deleted_at: %s", sql)
	}

	// admin 삭제 목록 ("only") returns exclusively soft-deleted rows.
	sql, _ = buildAlbumListQuery(nil, "", "", nil, "", "only", 50, 0)
	if !strings.Contains(sql, "deleted_at IS NOT NULL") {
		t.Errorf("only mode should filter to deleted rows: %s", sql)
	}
}

func TestSpotifyCreds(t *testing.T) {
	t.Setenv("SPOTIFY_CLIENT_ID", "plain")
	t.Setenv("SPOTIFY_CLIENT_SECRET", "s")
	t.Setenv("FIRST_SPOTIFY_CLIENT_ID", "one")
	t.Setenv("FIRST_SPOTIFY_CLIENT_SECRET", "s1")
	t.Setenv("SECOND_SPOTIFY_CLIENT_ID", "two")
	t.Setenv("SECOND_SPOTIFY_CLIENT_SECRET", "s2")

	// no key → unprefixed wins
	if id, _, _ := spotifyCreds(""); id != "plain" {
		t.Fatalf("default key = %q, want plain", id)
	}
	// explicit keys pick their prefix
	if id, _, _ := spotifyCreds("first"); id != "one" {
		t.Fatalf("first = %q", id)
	}
	if id, _, _ := spotifyCreds("SECOND"); id != "two" { // case-insensitive
		t.Fatalf("second = %q", id)
	}
	// unknown key → error naming the expected vars
	if _, _, err := spotifyCreds("third"); err == nil || !strings.Contains(err.Error(), "THIRD_SPOTIFY_CLIENT_ID") {
		t.Fatalf("unknown key error = %v", err)
	}

	// unprefixed absent → FIRST_ fallback for the default key
	t.Setenv("SPOTIFY_CLIENT_ID", "")
	if id, _, _ := spotifyCreds(""); id != "one" {
		t.Fatalf("fallback = %q, want one", id)
	}

	// any prefix works — THIRD_ (or anything) is selectable once its pair exists
	t.Setenv("THIRD_SPOTIFY_CLIENT_ID", "three")
	t.Setenv("THIRD_SPOTIFY_CLIENT_SECRET", "s3")
	if id, _, _ := spotifyCreds("third"); id != "three" {
		t.Fatalf("third = %q", id)
	}
	keys := configuredSpotifyKeys()
	joined := strings.Join(keys, ",")
	for _, want := range []string{"first", "second", "third"} {
		if !strings.Contains(joined, want) {
			t.Fatalf("configuredSpotifyKeys() = %v, missing %q", keys, want)
		}
	}
}

func TestYearOf(t *testing.T) {
	if y := yearOf("2023-05-01"); y == nil || *y != 2023 {
		t.Fatalf("yearOf full date = %v", y)
	}
	if y := yearOf("2019"); y == nil || *y != 2019 {
		t.Fatalf("yearOf year-only = %v", y)
	}
	if yearOf("") != nil || yearOf("abc") != nil {
		t.Fatal("yearOf junk should be nil")
	}
}

func TestNormalizeAliases(t *testing.T) {
	got := normalizeAliases([]string{" 블랙넛 ", "", "블넛", "블랙넛", "  "})
	if len(got) != 2 || got[0] != "블랙넛" || got[1] != "블넛" {
		t.Fatalf("normalizeAliases = %v", got)
	}
	if got := normalizeAliases(nil); len(got) != 0 {
		t.Fatalf("nil input should yield empty slice, got %v", got)
	}
}

func eq(a, b []any) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
