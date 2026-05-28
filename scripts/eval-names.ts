/**
 * HarmonyName naming-pipeline eval harness v0
 * ============================================
 *
 * Run: `npx tsx scripts/eval-names.ts`
 *
 * What this does:
 *   ① For each fixture in fixtures/eval-profiles.json:
 *      ─ compute the BaZi profile (calculateBazi)
 *      ─ run the v2 naming pipeline directly (runNamingPipeline) — bypasses HTTP/auth/credits
 *   ② Score each returned name on 3 deterministic metrics:
 *      a) citation accuracy   — every given char appears in the cited line (cleaned of {})
 *      b) always-3 invariant  — exactly 3 names returned
 *      c) element correctness — ≥1 anatomy element ∈ favourable AND 0 ∈ avoid
 *   ③ Print a summary table + per-fixture detail
 *   ④ Write fixtures/eval-results-YYYY-MM-DD-HHMMSS.json with full data for diffing
 *
 * Constraints:
 *   - no LLM-as-judge (deterministic metrics only — v0)
 *   - no CI integration
 *   - no new dependencies
 *
 * IMPORTANT: dotenv MUST load BEFORE any module that reads process.env at import time
 * (supabaseAdmin, redis, claude, openai). We use a dynamic import inside main() to
 * guarantee env is loaded first.
 */
import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Force-load .env.local (dotenv/config picks up .env by default, not .env.local)
dotenvConfig({ path: resolve(process.cwd(), ".env.local") });

// ---------------------------------------------------------------------------
// Fixture & result types
// ---------------------------------------------------------------------------

interface EvalProfile {
  id: string;
  label: string;
  gender: "male" | "female";
  birthDate: string;      // YYYY-MM-DD
  birthTime: string;      // HH:MM or "unknown"
  city: { longitude: number; timezone: string };
  notes: string;
}

interface FixtureFile {
  _note?: string;
  profiles: EvalProfile[];
}

interface NameMetricResult {
  citation: boolean;            // every given char appears in cleaned cited line
  element: boolean;             // ≥1 favourable & 0 avoid in given-name anatomy
  // diagnostic detail for debugging failures (not part of the metrics)
  givenChars: string[];
  citedLineCleaned: string;
  givenElements: string[];
  missingChars: string[];
}

interface FixtureResult {
  profile: EvalProfile;
  bazi: {
    dayMaster: string;
    strength: string;
    favourableElements: string[];
    avoidElements: string[];
    recommendedNameLength: string;
    pillars: { year: string; month: string; day: string; hour: string };
  };
  pipeline: {
    namesCount: number;
    names: Array<{
      hanzi: string;
      pinyin: string;
      culturalHeritage: { source: string; original: string; translation: string };
      anatomy: Array<{ char: string; pinyin: string; meaning: string; type: string; element: string }>;
    }>;
    analysis?: string;
  };
  metrics: {
    always3: boolean;
    perName: NameMetricResult[]; // length = namesCount
  };
  latencyMs: number;
  error?: string;
}

// ---------------------------------------------------------------------------
// Metric implementations (pure, deterministic)
// ---------------------------------------------------------------------------

/**
 * Citation accuracy: every char of name.hanzi.slice(1) (given chars only, skip surname)
 * must appear in name.culturalHeritage.original after stripping {} braces.
 *
 * Why slice(1)? hanzi = "周皎" → surname=周, given=皎. We only verify given chars
 * appear in the cited line; surnames don't need to be grounded in a poem.
 *
 * Note: this assumes a single-char surname (true for >99% of Chinese surnames in
 * COMMON_SURNAMES). 2-char surnames (欧阳/司马 etc.) would over-test by one char,
 * but the pipeline rarely picks those.
 */
function evalCitation(hanzi: string, original: string): { pass: boolean; missing: string[] } {
  const cleaned = original.replace(/[{}]/g, "");
  const givenChars = [...hanzi.slice(1)]; // codepoint-safe split, skip surname
  const missing = givenChars.filter((c) => !cleaned.includes(c));
  return { pass: missing.length === 0 && givenChars.length > 0, missing };
}

/**
 * Element correctness: looking at name.anatomy for the given-name chars
 * (type !== "Surname"), require ≥1 element in favourableElements AND
 * 0 elements in avoidElements.
 */
function evalElement(
  anatomy: Array<{ type: string; element: string }>,
  favourable: string[],
  avoid: string[]
): { pass: boolean; elements: string[] } {
  const givenAnatomy = anatomy.filter((a) => a.type !== "Surname");
  const elements = givenAnatomy.map((a) => a.element);
  const hasFavourable = elements.some((e) => favourable.includes(e));
  const hasAvoid = elements.some((e) => avoid.includes(e));
  return { pass: hasFavourable && !hasAvoid, elements };
}

// ---------------------------------------------------------------------------
// Pretty-printing helpers
// ---------------------------------------------------------------------------

const check = (b: boolean) => (b ? "✓" : "✗");
const pct = (n: number, d: number) => (d === 0 ? "—" : `${Math.round((n / d) * 100)}%`);

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function shortBaziLabel(p: EvalProfile): string {
  const cityName = p.city.longitude === 116.4 ? "Beijing"
    : p.city.longitude === 121.4737 ? "Shanghai"
    : p.city.longitude === 113.2644 ? "Guangzhou"
    : p.city.longitude === 104.0668 ? "Chengdu"
    : p.city.longitude === 114.0579 ? "Shenzhen"
    : p.city.longitude === 108.948 ? "Xi'an"
    : `lon${p.city.longitude}`;
  return `${p.gender} ${p.birthDate} ${p.birthTime} ${cityName}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Sanity-check the env vars we need BEFORE attempting any imports that touch them.
  const requiredEnv = ["CLAUDE_API_KEY", "OPENAI_API_KEY", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"];
  const missing = requiredEnv.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`Missing required env vars in .env.local: ${missing.join(", ")}`);
    process.exit(1);
  }

  // Dynamic imports — these modules read process.env at import time. dotenv is loaded above.
  const { calculateBazi } = await import("../src/lib/bazi");
  const { runNamingPipeline } = await import("../src/lib/pipeline/orchestrate");

  // Load fixtures
  const fixturesPath = resolve(process.cwd(), "fixtures/eval-profiles.json");
  const fixtures = JSON.parse(readFileSync(fixturesPath, "utf-8")) as FixtureFile;
  const profiles = fixtures.profiles;

  const startedAtIso = new Date().toISOString();
  const startedAtPretty = startedAtIso.replace("T", " ").slice(0, 16);
  const startTime = Date.now();

  console.log(`\n=== HarmonyName Eval v0 (N=${profiles.length} fixtures, ran ${startedAtPretty}) ===\n`);
  console.log(`Running ${profiles.length} fixtures sequentially (each ~30-60s)…\n`);

  const results: FixtureResult[] = [];

  for (let i = 0; i < profiles.length; i++) {
    const p = profiles[i];
    process.stdout.write(`[${i + 1}/${profiles.length}] ${p.id} ${shortBaziLabel(p)}… `);
    const tStart = Date.now();

    try {
      const bazi = calculateBazi(p.birthDate, p.birthTime, p.city);
      // Mirror what /api/generate does in auto mode: ask the pipeline to recommend a surname.
      const surnameInstruction = `RECOMMEND a surname that harmonizes with the ${bazi.dayMaster} Day Master.`;
      const result = await runNamingPipeline({
        gender: p.gender,
        dayMaster: bazi.dayMaster,
        strength: bazi.strength,
        favourableElements: bazi.favourableElements,
        avoidElements: bazi.avoidElements,
        recommendedNameLength: bazi.recommendedNameLength,
        surnameInstruction,
        // surnameChar intentionally undefined — auto mode
      });

      const latencyMs = Date.now() - tStart;
      const names = result.names ?? [];

      const perName: NameMetricResult[] = names.map((n) => {
        const cit = evalCitation(n.hanzi, n.culturalHeritage.original);
        const ele = evalElement(n.anatomy, bazi.favourableElements, bazi.avoidElements);
        return {
          citation: cit.pass,
          element: ele.pass,
          givenChars: [...n.hanzi.slice(1)],
          citedLineCleaned: n.culturalHeritage.original.replace(/[{}]/g, ""),
          givenElements: ele.elements,
          missingChars: cit.missing,
        };
      });

      const fr: FixtureResult = {
        profile: p,
        bazi: {
          dayMaster: bazi.dayMaster,
          strength: bazi.strength,
          favourableElements: bazi.favourableElements,
          avoidElements: bazi.avoidElements,
          recommendedNameLength: bazi.recommendedNameLength,
          pillars: bazi.bazi,
        },
        pipeline: {
          namesCount: names.length,
          names: names.map((n) => ({
            hanzi: n.hanzi,
            pinyin: n.pinyin,
            culturalHeritage: n.culturalHeritage,
            anatomy: n.anatomy.map((a) => ({
              char: a.char,
              pinyin: a.pinyin,
              meaning: a.meaning,
              type: a.type,
              element: a.element,
            })),
          })),
          analysis: result.analysis,
        },
        metrics: {
          always3: names.length === 3,
          perName,
        },
        latencyMs,
      };

      results.push(fr);
      const namesStr = names.map((n) => n.hanzi).join(" / ") || "(none)";
      console.log(`done in ${(latencyMs / 1000).toFixed(1)}s — ${names.length} names: ${namesStr}`);
    } catch (e) {
      const latencyMs = Date.now() - tStart;
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`ERROR in ${(latencyMs / 1000).toFixed(1)}s: ${msg}`);
      results.push({
        profile: p,
        bazi: { dayMaster: "?", strength: "?", favourableElements: [], avoidElements: [], recommendedNameLength: "?", pillars: { year: "?", month: "?", day: "?", hour: "?" } },
        pipeline: { namesCount: 0, names: [] },
        metrics: { always3: false, perName: [] },
        latencyMs,
        error: msg,
      });
    }
  }

  const totalMs = Date.now() - startTime;

  // ─────────────────────────────────────────────────────────────────────────
  // Aggregate metrics
  // ─────────────────────────────────────────────────────────────────────────
  const N = results.length;
  const totalNames = results.reduce((s, r) => s + r.pipeline.namesCount, 0);

  let citPass = 0, citTotal = 0;
  let elePass = 0, eleTotal = 0;
  let always3Pass = 0;

  const citFailures: string[] = [];
  const always3Failures: string[] = [];
  const eleFailures: string[] = [];

  for (const r of results) {
    if (r.error) {
      always3Failures.push(`${r.profile.id}(error)`);
      citFailures.push(`${r.profile.id}(error)`);
      eleFailures.push(`${r.profile.id}(error)`);
      continue;
    }
    if (r.metrics.always3) always3Pass++;
    else always3Failures.push(`${r.profile.id}(${r.pipeline.namesCount})`);

    let anyCitFail = false, anyEleFail = false;
    for (const pn of r.metrics.perName) {
      citTotal++;
      eleTotal++;
      if (pn.citation) citPass++;
      else anyCitFail = true;
      if (pn.element) elePass++;
      else anyEleFail = true;
    }
    if (anyCitFail) citFailures.push(r.profile.id);
    if (anyEleFail) eleFailures.push(r.profile.id);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Print summary table
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\n=== Summary ===\n");
  const fmtRow = (label: string, rate: string, count: string, fails: string[]) =>
    `${label.padEnd(30)}  ${rate.padEnd(15)}  ${count.padEnd(14)}  ${fails.length === 0 ? "—" : fails.join(", ")}`;
  console.log(fmtRow("Metric", "Pass rate", "Count", []).replace(/\s+—$/, ""));
  console.log("─".repeat(95));
  console.log(fmtRow("Citation accuracy", pct(citPass, citTotal), `(${citPass}/${citTotal})`, [...new Set(citFailures)]));
  console.log(fmtRow("Always-3 invariant", pct(always3Pass, N), `(${always3Pass}/${N})`, always3Failures));
  console.log(fmtRow("Element correctness", pct(elePass, eleTotal), `(${elePass}/${eleTotal})`, [...new Set(eleFailures)]));

  // ─────────────────────────────────────────────────────────────────────────
  // Per-fixture detail
  // ─────────────────────────────────────────────────────────────────────────
  console.log("\nPer-fixture detail:\n");
  results.forEach((r, i) => {
    const tag = `[${i + 1}] ${shortBaziLabel(r.profile)} (${r.profile.id})`;
    if (r.error) {
      console.log(`${tag}\n    ERROR: ${r.error}`);
      return;
    }
    const namesStr = r.pipeline.names.map((n) => n.hanzi).join(" / ") || "(none)";
    const citStr = r.metrics.perName.map((pn) => check(pn.citation)).join(" ");
    const eleStr = r.metrics.perName.map((pn) => check(pn.element)).join(" ");
    const fav = r.bazi.favourableElements.join("/") || "-";
    const avoid = r.bazi.avoidElements.join("/") || "-";
    console.log(`${tag}`);
    console.log(`    bazi: ${r.bazi.dayMaster} ${r.bazi.strength} · fav ${fav} · avoid ${avoid} · ${r.bazi.pillars.year} ${r.bazi.pillars.month} ${r.bazi.pillars.day} ${r.bazi.pillars.hour}`);
    console.log(`    ${r.pipeline.namesCount} names: ${namesStr}    (${(r.latencyMs / 1000).toFixed(1)}s)`);
    console.log(`    citation: ${citStr || "—"}  always-3: ${check(r.metrics.always3)}  element: ${eleStr || "—"}`);
    // Surface the actual failure reasons inline (super useful when debugging)
    r.metrics.perName.forEach((pn, ni) => {
      const name = r.pipeline.names[ni];
      if (!pn.citation) {
        console.log(`        ↳ [${name.hanzi}] citation FAIL: missing chars [${pn.missingChars.join(",")}] in "${pn.citedLineCleaned}"`);
      }
      if (!pn.element) {
        console.log(`        ↳ [${name.hanzi}] element FAIL: anatomy elements [${pn.givenElements.join(",")}] vs fav [${fav}] avoid [${avoid}]`);
      }
    });
  });

  console.log(`\nTotal time: ${(totalMs / 60000).toFixed(1)} minutes (${(totalMs / 1000).toFixed(1)}s)`);
  console.log(`Total names evaluated: ${totalNames} across ${N} fixtures\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // Write JSON results
  // ─────────────────────────────────────────────────────────────────────────
  const stamp = timestamp();
  const outPath = resolve(process.cwd(), `fixtures/eval-results-${stamp}.json`);
  const payload = {
    ranAt: startedAtIso,
    totalMs,
    fixtureCount: N,
    namesCount: totalNames,
    summary: {
      citation: { pass: citPass, total: citTotal, rate: citTotal === 0 ? 0 : citPass / citTotal },
      always3:  { pass: always3Pass, total: N, rate: N === 0 ? 0 : always3Pass / N },
      element:  { pass: elePass, total: eleTotal, rate: eleTotal === 0 ? 0 : elePass / eleTotal },
    },
    results,
  };
  writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`JSON results written → ${outPath}\n`);
}

main().catch((e) => {
  console.error("Eval harness crashed:", e);
  process.exit(1);
});
