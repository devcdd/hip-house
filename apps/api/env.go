package main

import (
	"bufio"
	"os"
	"strings"
)

// loadDotenv reads the first existing path and sets any KEY=VALUE not already in
// the environment (real env vars win). Missing files are ignored. No dependency —
// keeps the single root .env as the one source without a loader lib.
func loadDotenv(paths ...string) {
	for _, p := range paths {
		f, err := os.Open(p)
		if err != nil {
			continue
		}
		sc := bufio.NewScanner(f)
		for sc.Scan() {
			line := strings.TrimSpace(sc.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			line = strings.TrimPrefix(line, "export ")
			k, v, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			k = strings.TrimSpace(k)
			v = strings.Trim(strings.TrimSpace(v), `"'`)
			if _, set := os.LookupEnv(k); !set {
				os.Setenv(k, v)
			}
		}
		f.Close()
		return // first found wins
	}
}
