package main

import "testing"

func TestTokenRoundTrip(t *testing.T) {
	s := &server{jwtSecret: []byte("test-secret")}
	tok, err := s.issueToken(User{ID: "42", Role: "admin"})
	if err != nil {
		t.Fatalf("issue: %v", err)
	}
	id, role, err := s.parseToken(tok)
	if err != nil || id != "42" || role != "admin" {
		t.Fatalf("parse = (%q,%q,%v), want (42,admin,nil)", id, role, err)
	}

	// tampered / wrong-secret token must be rejected.
	other := &server{jwtSecret: []byte("different")}
	if _, _, err := other.parseToken(tok); err == nil {
		t.Fatal("expected rejection with wrong secret")
	}
}
