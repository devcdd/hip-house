// Interactive artist picker: search Spotify, select artists, save them to the DB and
// immediately crawl their albums. No manual artists.txt editing, no separate crawl command.
// Run: node --env-file-if-exists=.env src/search.js "artist name" ["name2" ...]

import { createInterface } from "node:readline/promises";
import { getToken, spFetch, openDb, fetchArtistAlbums, upsertAlbum, albumArtists, enrichArtists } from "./index.js";

const API = "https://api.spotify.com/v1";
const names = process.argv.slice(2);
if (!names.length) {
  console.error('usage: node src/search.js "artist name" ["name2" ...]');
  process.exit(1);
}

const tokenRef = { value: await getToken() };

// 1) gather candidates from every search term
const candidates = [];
for (const name of names) {
  const data = await spFetch(`${API}/search?q=${encodeURIComponent(name)}&type=artist&limit=5`, tokenRef);
  console.log(`\n# ${name}`);
  for (const a of data.artists?.items ?? []) {
    candidates.push({ id: a.id, name: a.name });
    console.log(`  [${candidates.length}] ${a.name}  ${a.id}`);
  }
}
if (!candidates.length) {
  console.log("no results");
  process.exit(0);
}

// 2) select (numbers space/comma-separated, or 'all'; empty cancels)
const rl = createInterface({ input: process.stdin, output: process.stdout });
const answer = (await rl.question("\nselect (e.g. '1 3 5', 'all', empty=cancel): ")).trim();
rl.close();

let picked;
if (!answer) {
  console.log("cancelled");
  process.exit(0);
} else if (answer.toLowerCase() === "all") {
  picked = candidates;
} else {
  const idx = new Set(answer.split(/[\s,]+/).map((n) => parseInt(n, 10)));
  picked = candidates.filter((_, i) => idx.has(i + 1));
}
// dedup by id (same artist can appear across search terms)
picked = [...new Map(picked.map((a) => [a.id, a])).values()];
if (!picked.length) {
  console.log("nothing selected");
  process.exit(0);
}

// 3) save + crawl albums
const db = await openDb();
let total = 0;
const credited = new Set(); // picked + every featured artist across their albums
for (const a of picked) {
  credited.add(a.id);
  const albums = await fetchArtistAlbums(a.id, tokenRef);
  for (const al of albums) {
    await upsertAlbum(db, al);
    for (const c of albumArtists(al)) credited.add(c.id);
  }
  total += albums.length;
  console.log(`  ${a.name}: ${albums.length} albums`);
}
// Backfill name + image for every credited artist (featured included) via the full endpoint.
await enrichArtists(db, tokenRef, [...credited]);
console.log(`\n${picked.length} artists / ${total} album rows saved`);
await db.end();
