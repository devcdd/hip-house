// Backfill artist name + image for artists ALREADY in the DB — no album crawl.
// Use after adding the image_url column (or any time artists are missing images).
//
//   node --env-file-if-exists=../../.env src/enrich.js          # only artists missing an image
//   node --env-file-if-exists=../../.env src/enrich.js --all    # refresh every artist
//
// On the server (like artist.sh):
//   docker compose -f docker-compose.prod.yml --profile crawl run --rm \
//     --entrypoint node crawler src/enrich.js

import { openDb, getToken, enrichArtists } from "./index.js";

const all = process.argv.includes("--all");

const tokenRef = { value: await getToken() };
const db = await openDb();

const { rows } = await db.query(
  all ? "SELECT id FROM artists ORDER BY id" : "SELECT id FROM artists WHERE image_url IS NULL ORDER BY id"
);
const ids = rows.map((r) => r.id);
console.log(`${ids.length} artists to enrich${all ? " (all)" : " (missing image)"}`);

await enrichArtists(db, tokenRef, ids);

const filled = (await db.query("SELECT COUNT(*)::int n FROM artists WHERE image_url IS NOT NULL")).rows[0].n;
const totalN = (await db.query("SELECT COUNT(*)::int n FROM artists")).rows[0].n;
console.log(`done — ${filled}/${totalN} artists now have an image`);
await db.end();
