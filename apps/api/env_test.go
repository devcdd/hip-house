package main

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadDotenv(t *testing.T) {
	dir := t.TempDir()
	p := filepath.Join(dir, ".env")
	os.WriteFile(p, []byte("# comment\nexport FOO=\"bar\"\nBAZ=qux\nPRESET=fromfile\n"), 0o600)

	t.Setenv("PRESET", "fromenv") // real env must win over file
	os.Unsetenv("FOO")
	os.Unsetenv("BAZ")
	defer func() { os.Unsetenv("FOO"); os.Unsetenv("BAZ") }()

	loadDotenv("/nonexistent", p)

	if got := os.Getenv("FOO"); got != "bar" {
		t.Errorf("FOO = %q, want bar", got)
	}
	if got := os.Getenv("BAZ"); got != "qux" {
		t.Errorf("BAZ = %q, want qux", got)
	}
	if got := os.Getenv("PRESET"); got != "fromenv" {
		t.Errorf("PRESET = %q, want fromenv (env wins)", got)
	}
}
