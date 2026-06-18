# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session start — read this first

Before doing anything else in this repo, read `SCRATCHPAD.md` and (if it exists) `SCRATCHPAD.local.md`. They hold the "where we left off" pointer, the next concrete action, and any deferred decisions from prior sessions. Re-deriving that state from `git log` is slower, lossier, and misses anything that was decided but never coded.

Read order: this file → `SCRATCHPAD.local.md` (full state) → `SCRATCHPAD.md` (public log) → then start the user's task.

## Project

HarmonyName generates authentic Chinese names by combining traditional BaZi (八字 / Four Pillars) astrology with AI. The core idea is a **two-layer hybrid**: a deterministic layer computes the user's Five Elements profile locally, then a generative layer uses RAG over classical poetry to produce names that match that profile.

## Commands

```bash
npm run dev        # Next.js dev server (Turbopack)
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # ESLint (eslint-config-next)
npm test           # vitest run — currently 48 tests across 3 files
npx tsc            # Type-check only (tsconfig has noEmit)
```

Tests live next to source: `src/lib/bazi.test.ts`, `src/lib/namechars.test.ts`, `src/lib/verify.test.ts`. No vitest config file — defaults are fine. Add `*.test.ts` next to the file it covers; pure-logic modules only (no React component tests).

### Data pipeline (poetry vector DB) — run in order

```bash
git clone --depth 1 https://github.com/chinese-poetry/chinese-poetry.git /tmp/chinese-poetry
python3 scripts/process-poems.py     # needs `opencc`; writes scripts/poem-chunks.json
npx tsx scripts/seed-supabase.ts     # embeds chunks (OpenAI) + inserts into Supabase
```

Database schema lives in `supabase/migrations/001_create_poems_tables.sql`, then **`scripts/add-fame-score.sql` (run manually in the Supabase SQL editor)** which adds the `fame_score` column and *redefines* the `search_poem_chunks` RPC. The add-fame-score version is the one the app actually calls — it takes `query_embedding` as **text** (a JSON-stringified vector), returns `source` + `fame_score`, and ranks by `0.7 * cosine_similarity + 0.3 * (fame_score/3)`. The function signature in migration 001 is superseded.

**Required for v2 multi-agent pipeline** — run these in the Supabase SQL editor too:
- `supabase/migrations/005_search_poem_chunks_add_chunk_id.sql` — re-creates the RPC so it also returns `chunk_id` (lineId). The v2 composer references lines by id; without this column the pipeline cannot hydrate citations.
- `supabase/migrations/006_chunk_text_trgm_and_by_chars.sql` — installs `pg_trgm` + GIN index on `chunk_text` and adds `search_lines_by_chars(chars text[])`, used to fetch real lines containing the favourable-element candidate characters.

**Security hardening** — run in the Supabase SQL editor too:
- `supabase/migrations/007_enable_rls_on_poems.sql` — enables RLS on `poems` / `poem_chunks` (built in 001, before auth existed, so they were the only public tables without RLS — Security Advisor flagged `rls_disabled_in_public`). No policy is added: both tables are read **only** via `supabaseAdmin` (service_role, which bypasses RLS), so deny-by-default for anon/authenticated is safe and closes the warning.
- `supabase/migrations/008_rebalance_fame_weight.sql` — re-creates `search_poem_chunks` (the 005 text/chunk_id version) with the ranking weight changed from `0.7*similarity + 0.3*fame` to **`0.8*similarity + 0.2*fame`**. fame_score is poem-level, so 0.3 over-promoted mediocre lines from famous poems; 0.2 lets imagery relevance lead. Run in the SQL editor.
- `supabase/migrations/009_stripe_idempotency.sql` — creates `stripe_processed_events(event_id pk)` so the Stripe webhook dedupes events **durably in the DB** instead of via optional Redis (Redis-less prod had NO idempotency → Stripe retries double-credited = money loss). RLS enabled, no policy (webhook writes via service_role). **Run this in the SQL editor; until then the webhook degrades gracefully — it logs and still grants credits (no idempotency) rather than 500-ing.**

**Name-quality (obscure-source fix, 2026-06-18)** — run in the Supabase SQL editor:
- `supabase/migrations/010_fame_floor_by_chars.sql` — re-creates `search_lines_by_chars` with a fame floor (`AND p.fame_score >= 2`). The by-chars arm previously returned ANY line containing a candidate char regardless of fame, flooding the pool with obscure poems (庄忌《哀时命》, 刘眘虚《阙题》) → names cited fringe sources. The floor keeps only canonical (3) + named-author (2) sources. **Primary fix.** This is the live `search_lines_by_chars` definition (supersedes 006's body).
- `supabase/migrations/011_rebalance_fame_weight_v2.sql` — re-creates `search_poem_chunks` with ranking `0.7*similarity + 0.3*fame` (008 had moved it to 0.8/0.2; this reverts toward fame to keep canonical poems on top in the semantic arm). **This is now the live `search_poem_chunks` definition (supersedes 008).** No hard floor — preserves semantic recall; complements 010's by-chars floor.

### MCP server

`mcp/server.ts` exposes the BaZi calculator as a `calculate_bazi` tool over stdio for Claude Desktop. Test it standalone with `npx -y tsx mcp/server.ts` (it imports `../src/lib/bazi`).

## Environment

`.env.local` (gitignored) must define:
- `OPENAI_API_KEY` — **embeddings only** (`text-embedding-3-small`, 1536-dim)
- `CLAUDE_API_KEY` — name generation (note: **not** `ANTHROPIC_API_KEY`; `src/lib/claude.ts` reads `CLAUDE_API_KEY`)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — pgvector access (service-role key; `supabaseAdmin.ts` is server-only, never import it in client code)

Optional:
- `NAMING_PIPELINE_V2` — set to `"true"` to enable the v2 multi-agent grounded pipeline. Unset / any other value → the legacy single-shot Claude path runs. **Currently unset in prod.**
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — enables per-user rate limiting on `/api/generate`. Skipped silently if absent.
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_*` — Stripe is in TEST mode; live keys are intentionally not configured.

OpenAI and Claude are **both** required and serve different roles: Anthropic has no embedding model, so RAG retrieval uses OpenAI while generation uses Claude. The naming/critic model is a single env-configurable constant — `src/lib/model.ts` exports `NAMING_MODEL = process.env.NAMING_MODEL || "claude-sonnet-4-6"`. Composer, critic, and the legacy route all import it. Sonnet 4.6 is the default because the composer is a strict structured task (pool-only chars, two-given-char names, element match) that Haiku 4.5 often fails on the first round → triggers the broaden/rescue tiers → slow + occasionally all-rescue single-char names, and the 3–4× retries eat Haiku's per-token savings. Override with `NAMING_MODEL=claude-haiku-4-5` (cheapest per call, slower/less reliable here) or `claude-opus-4-8` (best, priciest). The README badge saying "GPT-4o-mini" is stale — generation migrated to Claude.

## Architecture

Request flow (the path the frontend actually uses):

```
src/app/app/page.tsx  (the app; src/app/page.tsx is the landing page)
  → calculateBazi() runs CLIENT-SIDE          [deterministic layer, src/lib/bazi.ts]
  → POST /api/generate with the computed BaZi  [SSE streaming, auth + credit gated]

  /api/generate route then forks on NAMING_PIPELINE_V2:

  v2 (flag = "true") — multi-agent grounded pipeline  [src/lib/pipeline/orchestrate.ts]
      ① candidateCharsFor(favourable, gender)        [src/lib/namechars.ts]
        + buildVerifiedPool({chars, imageryQuery})   [src/lib/retriever.ts: by-chars + semantic]
      ② Composer 取名先生 (Claude)                    [src/lib/agents/composer.ts]
          emits lineId + charSpan + chars — NEVER poem text
      ③ verifyCandidate() — pure code gate           [src/lib/verify.ts]
          retry-with-feedback if <3 pass; broaden + single-char rescue if still <3;
          deterministic last-mile rescue (no LLM) guarantees ≥1 name
      ④ Critic 评审先生 (Claude)                      [src/lib/agents/critic.ts]
          evaluator-optimizer scoring, taste only — not facts
      ⑤ hydrate(): code fills citation/原文/pinyin/element from pool & namechars

  legacy (flag unset/false; CURRENTLY LIVE IN PROD) — single-shot Claude
      → searchPoems()              [RAG, src/lib/retriever.ts]
      → claude.messages.create()   [prompt-only grounding via src/lib/prompt.ts]
```

### The generation route — `src/app/api/generate/route.ts`

SSE streaming, **expects the BaZi profile already computed** (gender, dayMaster, strength, favourableElements…) since the page runs `calculateBazi()` client-side. Emits `progress`/`result`/`error` events as `data: {json}\n\n`.

**Gating order** (deliberate — cheap rejections before any AI call):
1. `getUser()` → 401 `UNAUTHENTICATED` if no session.
2. Upstash ratelimit (skipped if unconfigured) → 429 `RATE_LIMITED`.
3. Zod schema validation → 400 `VALIDATION_ERROR`.
4. `deductCredit()` → 402 `INSUFFICIENT_CREDITS` if empty. See `src/lib/credits.ts`.
5. SSE stream opens. On *any* generation failure (empty content, parse error, NO_VERIFIED_NAMES, thrown exception) → `refundCredit(user.id)` then `error` event with `creditsRemaining`. Refund is idempotent (one-shot `refunded` flag).

**Pipeline switch:** `const PIPELINE_V2 = process.env.NAMING_PIPELINE_V2 === "true"`. Unset in prod today → the legacy single-shot path is live. Set to `"true"` to route through the multi-agent pipeline. Both paths archive to the `generations` table and emit the same `result` shape.

### v2 multi-agent pipeline — `src/lib/pipeline/orchestrate.ts`

The core invariant: **"agents for judgment, code for facts."** Fabrication is structurally impossible because the LLM never emits poem text — only references.

- **Composer (`src/lib/agents/composer.ts`)** — Claude Sonnet 4. System prompt is cached (ephemeral). Takes the BaZi profile + the verified pool (real lines with `chunkId`). Returns 6 candidates, each `{lineId, charSpan, surnameChar, givenChars[], meanings, poeticMeaning, ...}`. It is forbidden from writing any poem title/author/full line. `charSpan` must be a contiguous substring of the cited line and contain all `givenChars` — verified by code.
- **verifyCandidate (`src/lib/verify.ts`)** — pure deterministic gate, no LLM. Checks: (1) `lineId` is in pool and `charSpan` is a real substring of that line's `chunkText`; (2) every `givenChar` is in the span; non-given chars inside the span are only allowed if they are function words (之/乎/兮/…); (3) blacklists + gender-forbidden + gender-clashing; (4) at least one given char carries a favourable element, none carry an avoid element; (5) tones not all identical for 3-char names. Returns structured `reasons[]` — these are fed back to the Composer as `REVISION FEEDBACK` for the retry round (lightweight evaluator-optimizer).
- **Critic (`src/lib/agents/critic.ts`)** — Claude Sonnet 4 again, lower temperature. Scores 0–100 with a weighted rubric (gender 18 / phonetics 18 / semantics 17 / poetic source 15 / element 15 / surname harmony 10 / modern aesthetics 7) and may set `accept=false`. It does NOT re-check facts. The orchestrator defends against duplicate/out-of-range/missing `idx` values (last-mile: missing idx → neutral 50, never silently sunk).
- **Always-3 guarantee.** Three rescue tiers if `<3` candidates pass verification: (i) retry the Composer with failure feedback; (ii) widen the pool + force single-char given names; (iii) `rescueDeterministic()` — pure code scans the pool for favourable-element + gender-appropriate chars and pairs them with the surname. The fallback surname is `李` (annotated honestly in `masterComment`) so the API never returns 0 names even when LLM output is unusable.
- **hydrate() (the citation fill).** Looks up `lineId` in the pool, wraps the given chars with `{}` inside the real `chunkText`, builds `culturalHeritage.source` as `《title》— author (dynasty)`. Anatomy elements come from `elementOfChar()`; pinyin from `pinyinOf()` (pinyin-pro). Nothing here trusts LLM strings for facts.

### Curated character library — `src/lib/namechars.ts` + `src/data/`

`src/data/name-chars.json` is hand-curated: each Five Element → array of name-suitable characters, plus `_genderLean` (masculineLean / feminineLean) and a `_rule` doc-string. `src/data/name-blacklist.json` has `hard.functionWords / inauspicious / overweening / crude` plus `genderForbidden.male/female`. `candidateCharsFor(favourable, gender)` is what feeds both the by-chars retrieval query and the Composer prompt — order matters: same-gender lean → neutral → (never) opposite lean. `elementOfChar()` is the reverse lookup used during hydrate.

(A second non-streaming `/api/gpt` route used to exist but was dead code and has been removed.)

### Auth, credits, Stripe

`src/lib/credits.ts` does atomic deduct/refund against the `profiles.credits` column (Supabase RPC). The full auth + credits + Stripe story (Stripe Checkout for credit packs, webhook reconciles) lives in `src/lib/stripe.ts` and `src/app/api/stripe/*`. **Stripe is in TEST mode** — do not flip to live mode unilaterally; that's a deliberate release decision.

### `src/lib/bazi.ts` is isomorphic — keep it dependency-light

It's imported by the **client** page, by the **API** route, and by the **MCP** server. It must not pull in server-only modules. Key logic:
- **True Solar Time vs Beijing Time**: year/month/day pillars are computed against Beijing time (for solar-term boundaries); the hour pillar uses longitude-corrected true solar time. Both require a `city {longitude, timezone}`; without it, calculation falls back to naive local time.
- **Fuzzy time**: `birthTime === "unknown"` (or unparseable) drops the hour pillar entirely and computes from 3 pillars. `SHICHEN_MAPPING` exposes the 2-hour 时辰 blocks for the UI.
- `analyzeStrength()` produces `strength` (Weak/Strong/Balanced), `favourableElements`, `avoidElements`, and `recommendedNameLength` from seasonal base scores + the Five Elements generate/control relationships. Favourable/avoid sets flip depending on strength.

### Prompt contract

`createSystemPrompt(contextPoems)` injects RAG results and pins a strict JSON output schema (`analysis` + `names[]` with `hanzi`, `pinyin`, `culturalHeritage`, `anatomy`, `tonePattern`, …). All prose output is **English** (target users are non-Chinese speakers); only hanzi, poem quotes, and `char` fields are Chinese. Because Claude sometimes wraps JSON in prose, both routes parse defensively: try `JSON.parse`, then fall back to extracting the first `{...}` block.

### Frontend

App Router, React 19, Tailwind v4. State machine in `app/page.tsx` toggles `phase: "form" | "results"`. Hooks: `useCitySearch` (Open-Meteo geocoding for longitude/timezone), `useTTS` (Web Speech API, Chinese voice). Path alias `@/*` → `src/*`.

**Design system** (added 2026-06-13): tokens live in `src/app/globals.css` `@theme` — semantic brand colors (`bg-paper`/`text-ink`/`text-ink-soft`/`border-mist`/`text-gold`, the warm ink-landscape palette) + motion (`ease-soft`/`ease-spring`, `--dur-fast/base/slow/reveal`) + `animate-fade-in/-up/reveal` + `.shimmer` + `.shadow-soft(-lifted)` + a global `prefers-reduced-motion` kill-switch. Use `cn()` (`src/lib/cn.ts`, clsx+tailwind-merge) for conditional/override-safe class merging, and the primitives in `src/components/ui/` (`Button` with variant/size/loading, `Card`). **Prefer `transition-soft`/`transition-colors` over `transition-all`** (the latter animates layout → jank; ~13 legacy usages remain in un-migrated components). Motion is intentionally restrained; the name-reveal stagger lives in `app/page.tsx`, the loading shimmer in `GenerationProgress`.

## Working conventions

### Commit messages

Always prefix the first line with conventional-commit type:
`feat | fix | docs | refactor | chore | test`. Scope in parens is
encouraged and matches existing history (`fix(naming): ...`,
`feat(bazi): ...`). If a change spans types, pick the dominant one
(a fix that adds a small test → still `fix:`).

### SCRATCHPAD — per-session working log (dual file)

Two files at repo root, separating durability needs from privacy needs:

- **`SCRATCHPAD.md`** — **committed**, sanitized for public viewing
  (this repo is public). Contains: commit SHAs, what landed, technical
  decisions + reasoning, test/verification outcomes. Things `git log`
  alone doesn't capture but are safe to broadcast.
- **`SCRATCHPAD.local.md`** — **gitignored**, full personal state.
  Contains: `▶ Resume here` pointer (the next concrete action),
  deferred roadmap items, open decisions, soft state, half-baked
  ideas. Mirrors the `.env` / `.env.local` Next.js convention
  (`.local` suffix = local-only).

**Why split:** public repo + single laptop means a single gitignored
file fails both privacy (anything committed leaks roadmap) AND
durability (anything gitignored has no backup). Split lets each file
serve one purpose. For a private repo, the two could collapse to one
committed file.

**Update cadence (both files):**

- **After every commit** → append/update the relevant session block.
  Don't make a SCRATCHPAD-only commit; let the next code commit sweep
  the public file (the local file is gitignored anyway).
- **Before ending a session, proactively ask the user**: "want me to
  update SCRATCHPAD before we stop?" — don't make them remember.
- **Sessions older than 15 days** → move to
  `docs/scratchpad-archive/YYYY-MM.md` (also gitignored since `/docs`
  is in `.gitignore`). Keeps the live file scannable.
- **Never** put secrets / API keys / env values in either file.

**First-session bootstrap in a new repo:** create both files. If the
repo is private and the user wants single-file, collapse to just
`SCRATCHPAD.md` committed.

See `~/.claude/CLAUDE.md` for the cross-project version of this rule.

## Note

`course.html` (untracked) and `/docs` (gitignored) are generated artifacts / planning docs, not application code.
