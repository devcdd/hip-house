// Self-check for pure logic. Run: node test.js
import assert from "node:assert/strict";
import { parseArtistId, yearOf, toAlbumRow, albumArtists } from "./src/index.js";

const ID = "3nFkdlSjzX9mRTtwJOzDYB";
assert.equal(parseArtistId(ID), ID);
assert.equal(parseArtistId(`spotify:artist:${ID}`), ID);
assert.equal(parseArtistId(`https://open.spotify.com/artist/${ID}?si=abc`), ID);
assert.equal(parseArtistId(`${ID}  # Jay Park`), ID);
assert.equal(parseArtistId("   # comment only"), null);
assert.equal(parseArtistId(""), null);
assert.equal(parseArtistId("not-an-id"), null);

assert.equal(yearOf("2023-05-01"), 2023);
assert.equal(yearOf("2019"), 2019);
assert.equal(yearOf(""), null);
assert.equal(yearOf(null), null);

const al = {
  id: "alb1", name: "Album One", album_type: "album",
  release_date: "2022-03-04", total_tracks: 12,
  images: [{ url: "big.jpg" }, { url: "small.jpg" }],
  artists: [{ id: "a1", name: "X" }, { id: "a2", name: "Y" }],
  external_urls: { spotify: "https://open.spotify.com/album/alb1" },
};
const r = toAlbumRow(al);
assert.equal(r.id, "alb1");
assert.equal(r.year, 2022);
assert.equal(r.image_url, "big.jpg");        // largest first
assert.equal(r.spotify_url, "https://open.spotify.com/album/alb1");
assert.equal("artist_id" in r, false);       // artists now live in album_artists
assert.equal("artist_name" in r, false);

// albumArtists: every credited artist, real Spotify IDs, ordered.
const credits = albumArtists(al);
assert.deepEqual(credits, [
  { id: "a1", name: "X", position: 0 },
  { id: "a2", name: "Y", position: 1 },
]);
assert.deepEqual(albumArtists({ id: "z", name: "N" }), []); // no artists → []
assert.deepEqual(albumArtists({ artists: [{ name: "no id" }] }), []); // drop id-less entries

console.log("ok");
