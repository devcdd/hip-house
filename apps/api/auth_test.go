package main

import (
	"strings"
	"testing"
)

func TestValidateNickname(t *testing.T) {
	cases := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{"  집주인  ", "집주인", false}, // trimmed
		{"", "", true},              // empty
		{"   ", "", true},           // whitespace only
		{strings.Repeat("가", 20), strings.Repeat("가", 20), false}, // 20 runes ok
		{strings.Repeat("가", 21), "", true},                       // 21 runes too long
	}
	for _, c := range cases {
		got, msg := validateNickname(c.in)
		if c.wantErr && msg == "" {
			t.Errorf("validateNickname(%q): expected error, got clean %q", c.in, got)
		}
		if !c.wantErr && (msg != "" || got != c.want) {
			t.Errorf("validateNickname(%q) = (%q,%q), want (%q,\"\")", c.in, got, msg, c.want)
		}
	}
}

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
