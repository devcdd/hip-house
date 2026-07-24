package main

import (
	"strings"
	"testing"
)

func TestBuildAlbumListQuery(t *testing.T) {
	// year + artist filters present: placeholders must be $1..$4 in order.
	y := 2024
	// Multi-type (single OR ep): predicates inlined (no args), so placeholders stay year/artist/q + limit/offset.
	sql, args := buildAlbumListQuery(&y, "abc", "dre", []string{"single", "ep"}, "tracks", false, 10, 5)
	if want := []any{2024, "abc", "%dre%", 10, 5}; !eq(args, want) {
		t.Fatalf("args = %v, want %v", args, want)
	}
	for _, frag := range []string{
		"year = $1", "artist_id = $2", "name ILIKE $3",
		"(album_type='single' AND total_tracks < 3)", "(album_type='single' AND total_tracks >= 3)", " OR ",
		"total_tracks DESC", "LIMIT $4", "OFFSET $5",
	} {
		if !strings.Contains(sql, frag) {
			t.Errorf("missing %q in %s", frag, sql)
		}
	}
	// non-admin view hides soft-deleted rows.
	if !strings.Contains(sql, "deleted_at IS NULL") {
		t.Errorf("expected deleted_at filter: %s", sql)
	}

	// no filters: limit/offset shift to $1/$2 (the bug this guards against), default sort by year.
	sql, args = buildAlbumListQuery(nil, "", "", nil, "", true, 50, 0)
	if want := []any{50, 0}; !eq(args, want) {
		t.Fatalf("args = %v, want %v", args, want)
	}
	if !strings.Contains(sql, "LIMIT $1") || !strings.Contains(sql, "OFFSET $2") {
		t.Errorf("placeholders misaligned: %s", sql)
	}
	if !strings.Contains(sql, "release_date DESC NULLS LAST") {
		t.Errorf("default sort should be by release_date: %s", sql)
	}
	// admin view (includeDeleted) must NOT filter deleted_at.
	if strings.Contains(sql, "deleted_at IS NULL") {
		t.Errorf("admin view should include deleted: %s", sql)
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
