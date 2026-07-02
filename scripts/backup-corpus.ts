/**
 * Poetry corpus backup script
 * ============================
 * Exports the poems + poem_chunks tables (ALL columns EXCEPT the embedding
 * vector — it is huge and regenerable from chunk_text) as two timestamped
 * gzipped JSON snapshots under a gitignored `backups/` directory.
 *
 * This is the safety net for the destructive seed script (scripts/seed-supabase.ts
 * wipes both tables before re-inserting). Run this BEFORE any reseed:
 *   npm run backup:corpus
 *
 * PostgREST returns at most 1000 rows per request, so both tables are paged
 * with .range() (there are ~3.5k poems / ~50k+ chunks).
 *
 * Prerequisites:
 *   .env.local defines NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
dotenvConfig({ path: ".env.local" });

import fs from "fs";
import path from "path";
import zlib from "zlib";
import { getSupabaseAdmin } from "../src/lib/supabaseAdmin";

const supabaseAdmin = getSupabaseAdmin();

// Columns to export per table — deliberately excludes poem_chunks.embedding.
const POEMS_COLUMNS = "id, title, author, dynasty, full_content, source, fame_score, created_at";
const CHUNKS_COLUMNS = "id, poem_id, chunk_text, chunk_index, created_at";

const PAGE_SIZE = 1000; // PostgREST default max page size

/**
 * Fetch every row of a table via .range() pagination, ordered by id so pages
 * never overlap or skip. Returns the full array once all pages are drained.
 */
async function fetchAll(table: string, columns: string): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(columns)
      .order("id", { ascending: true })
      .range(from, to);
    if (error) {
      throw new Error(`Failed reading ${table} rows ${from}-${to}: ${error.message}`);
    }
    if (!data || data.length === 0) break;
    rows.push(...(data as unknown as Record<string, unknown>[]));
    process.stdout.write(`\r  ${table}: fetched ${rows.length} rows`);
    if (data.length < PAGE_SIZE) break; // last page
    from += PAGE_SIZE;
  }
  process.stdout.write("\n");
  return rows;
}

/** Gzip a JSON payload to disk and return its size in bytes. */
function writeGzipJson(filePath: string, payload: unknown): number {
  const json = JSON.stringify(payload);
  const gz = zlib.gzipSync(Buffer.from(json, "utf-8"));
  fs.writeFileSync(filePath, gz);
  return gz.length;
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
  console.log("=".repeat(60));
  console.log("Poetry corpus backup (poems + poem_chunks, embedding excluded)");
  console.log("=".repeat(60));

  const host = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
    } catch {
      return "(unparseable NEXT_PUBLIC_SUPABASE_URL)";
    }
  })();
  console.log(`  Source Supabase host: ${host}`);

  const backupDir = path.join(process.cwd(), "backups");
  fs.mkdirSync(backupDir, { recursive: true });

  // Timestamp: 2026-07-02T14-30-05 (colons are illegal in filenames on some FS).
  const stamp = new Date().toISOString().replace(/:/g, "-").replace(/\..+$/, "");

  console.log("\nFetching poems...");
  const poems = await fetchAll("poems", POEMS_COLUMNS);
  console.log("\nFetching poem_chunks...");
  const chunks = await fetchAll("poem_chunks", CHUNKS_COLUMNS);

  const poemsPath = path.join(backupDir, `poems-${stamp}.json.gz`);
  const chunksPath = path.join(backupDir, `poem_chunks-${stamp}.json.gz`);

  const poemsSize = writeGzipJson(poemsPath, poems);
  const chunksSize = writeGzipJson(chunksPath, chunks);

  console.log(`\n${"=".repeat(60)}`);
  console.log("Backup complete:");
  console.log(`  poems       : ${poems.length} rows → ${poemsPath} (${humanSize(poemsSize)})`);
  console.log(`  poem_chunks : ${chunks.length} rows → ${chunksPath} (${humanSize(chunksSize)})`);
  console.log(`${"=".repeat(60)}`);
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
