# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

HarmonyName generates authentic Chinese names by combining traditional BaZi (八字 / Four Pillars) astrology with AI. The core idea is a **two-layer hybrid**: a deterministic layer computes the user's Five Elements profile locally, then a generative layer uses RAG over classical poetry to produce names that match that profile.

## Commands

```bash
npm run dev        # Next.js dev server (Turbopack)
npm run build      # Production build
npm run start      # Serve production build
npm run lint       # ESLint (eslint-config-next)
npx tsc            # Type-check only (tsconfig has noEmit)
```

There is **no test framework** in this repo — do not assume `npm test` exists.

### Data pipeline (poetry vector DB) — run in order

```bash
git clone --depth 1 https://github.com/chinese-poetry/chinese-poetry.git /tmp/chinese-poetry
python3 scripts/process-poems.py     # needs `opencc`; writes scripts/poem-chunks.json
npx tsx scripts/seed-supabase.ts     # embeds chunks (OpenAI) + inserts into Supabase
```

Database schema lives in `supabase/migrations/001_create_poems_tables.sql`, then **`scripts/add-fame-score.sql` (run manually in the Supabase SQL editor)** which adds the `fame_score` column and *redefines* the `search_poem_chunks` RPC. The add-fame-score version is the one the app actually calls — it takes `query_embedding` as **text** (a JSON-stringified vector), returns `source` + `fame_score`, and ranks by `0.7 * cosine_similarity + 0.3 * (fame_score/3)`. The function signature in migration 001 is superseded.

### MCP server

`mcp/server.ts` exposes the BaZi calculator as a `calculate_bazi` tool over stdio for Claude Desktop. Test it standalone with `npx -y tsx mcp/server.ts` (it imports `../src/lib/bazi`).

## Environment

`.env.local` (gitignored) must define:
- `OPENAI_API_KEY` — **embeddings only** (`text-embedding-3-small`, 1536-dim)
- `CLAUDE_API_KEY` — name generation (note: **not** `ANTHROPIC_API_KEY`; `src/lib/claude.ts` reads `CLAUDE_API_KEY`)
- `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — pgvector access (service-role key; `supabase.ts` is server-only, never import it in client code)

OpenAI and Claude are **both** required and serve different roles: Anthropic has no embedding model, so RAG retrieval uses OpenAI while generation uses Claude (`claude-sonnet-4-20250514`). The README badge saying "GPT-4o-mini" is stale — generation migrated to Claude.

## Architecture

Request flow (the path the frontend actually uses):

```
src/app/app/page.tsx  (the app; src/app/page.tsx is the landing page)
  → calculateBazi() runs CLIENT-SIDE          [deterministic layer, src/lib/bazi.ts]
  → POST /api/generate with the computed BaZi  [SSE streaming]
      → searchPoems()  → OpenAI embed → Supabase RPC   [RAG, src/lib/retriever.ts]
      → claude.messages.create()                       [generation]
      → streams {type:"progress"} events, then {type:"result"}
```

### Two API routes do nearly the same job — know which is which

- **`src/app/api/generate/route.ts`** — SSE streaming, **expects the BaZi profile already computed** (gender, dayMaster, strength, favourableElements…). This is what the frontend calls. Emits `progress`/`result`/`error` events as `data: {json}\n\n`.
- **`src/app/api/gpt/route.ts`** — non-streaming JSON, **takes raw birth details and computes BaZi server-side** via `calculateBazi`, returns the names plus a `baziContext`. Effectively a legacy/alternate entry point.

Both routes share `src/lib/prompt.ts` (system + user prompt builders), `src/lib/retriever.ts`, and `src/lib/claude.ts`, and both inline an identical `ELEMENT_IMAGERY` map that turns favourable elements into Chinese search terms. Keep these in sync if you touch one.

### `src/lib/bazi.ts` is isomorphic — keep it dependency-light

It's imported by the **client** page, by **both** API routes, and by the **MCP** server. It must not pull in server-only modules. Key logic:
- **True Solar Time vs Beijing Time**: year/month/day pillars are computed against Beijing time (for solar-term boundaries); the hour pillar uses longitude-corrected true solar time. Both require a `city {longitude, timezone}`; without it, calculation falls back to naive local time.
- **Fuzzy time**: `birthTime === "unknown"` (or unparseable) drops the hour pillar entirely and computes from 3 pillars. `SHICHEN_MAPPING` exposes the 2-hour 时辰 blocks for the UI.
- `analyzeStrength()` produces `strength` (Weak/Strong/Balanced), `favourableElements`, `avoidElements`, and `recommendedNameLength` from seasonal base scores + the Five Elements generate/control relationships. Favourable/avoid sets flip depending on strength.

### Prompt contract

`createSystemPrompt(contextPoems)` injects RAG results and pins a strict JSON output schema (`analysis` + `names[]` with `hanzi`, `pinyin`, `culturalHeritage`, `anatomy`, `tonePattern`, …). All prose output is **English** (target users are non-Chinese speakers); only hanzi, poem quotes, and `char` fields are Chinese. Because Claude sometimes wraps JSON in prose, both routes parse defensively: try `JSON.parse`, then fall back to extracting the first `{...}` block.

### Frontend

App Router, React 19, Tailwind v4. State machine in `app/page.tsx` toggles `phase: "form" | "results"`. Hooks: `useCitySearch` (Open-Meteo geocoding for longitude/timezone), `useTTS` (Web Speech API, Chinese voice). Path alias `@/*` → `src/*`.

## Note

`course.html` (untracked) and `/docs` (gitignored) are generated artifacts / planning docs, not application code.
