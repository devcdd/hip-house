// Delete artists that have zero album credits (no album_artists rows).
// The crawler no longer saves such artists; this sweeps the ones already in the DB.
//
//   node --env-file-if-exists=../../.env src/cleanup.js            # delete them
//   node --env-file-if-exists=../../.env src/cleanup.js --dry-run  # list only
//
// On the server (same pattern as artist.sh/enrich.sh):
//   docker compose -f docker-compose.prod.yml --profile crawl run --rm \
//     --entrypoint node crawler src/cleanup.js

import { openDb } from "./index.js";

const dry = process.argv.includes("--dry-run");
const db = await openDb();

const { rows } = await db.query(
  `SELECT id, name FROM artists
   WHERE NOT EXISTS (SELECT 1 FROM album_artists aa WHERE aa.artist_id = artists.id)
   ORDER BY name NULLS LAST`
);

console.log(`${rows.length} artists with 0 albums`);
for (const r of rows) console.log(`  - ${r.name ?? "(no name)"}  ${r.id}`);

if (dry) {
  console.log("(dry-run — nothing deleted)");
} else if (rows.length) {
  await db.query("DELETE FROM artists WHERE id = ANY($1)", [rows.map((r) => r.id)]);
  console.log(`deleted ${rows.length} artists`);
}

const left = (await db.query("SELECT COUNT(*)::int n FROM artists")).rows[0].n;
console.log(`${left} artists remain`);
await db.end();
