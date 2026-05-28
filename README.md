# ☯️ HarmonyName

> **Discover the Chinese Name That Chooses You**
> A bridge between 5,000 years of Chinese wisdom and modern AI — names that can be traced back to the exact line of poetry they came from.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Anthropic](https://img.shields.io/badge/AI-Claude_Sonnet_4-D97757?logo=anthropic)](https://www.anthropic.com/)
[![Supabase](https://img.shields.io/badge/DB-Supabase_pgvector-3FCF8E?logo=supabase)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v4-38bdf8?logo=tailwind-css)](https://tailwindcss.com/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [Solution Architecture](#-solution-architecture)
- [AI Architecture — Anti‑Fabrication by Design](#-ai-architecture--anti-fabrication-by-design)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Technical Highlights](#-technical-highlights)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

**HarmonyName** is an AI-native web application that generates authentic, culturally meaningful Chinese names by combining traditional Chinese metaphysics (BaZi / Four Pillars of Destiny) with modern AI. Unlike generic translators or "fortune name" toys, every name HarmonyName produces is:

- ✅ **Astrologically Balanced** — Computed locally from the user's BaZi profile and Five Elements (WuXing) balance.
- ✅ **Verifiably Grounded** — Each name's characters are extracted from a *real, retrievable* line of classical Chinese poetry stored in a vector database. The line is fetched from the database — not authored by the LLM.
- ✅ **Phonetically Harmonious** — Tone-pattern and initial-consonant rules are checked deterministically before a name is shown.
- ✅ **Semantically Meaningful** — Each character is annotated with its element, pinyin, and meaning.

The core idea is a **two-layer hybrid** wrapped in a **multi-agent naming pipeline** with a hard verification gate that makes citation fabrication structurally impossible.

---

## 🔍 Problem Statement

### The Challenge

Choosing an authentic Chinese name is hard for non-Chinese speakers. Common failure modes include:

1. **Translation Failures** — Direct transliterations produce awkward combinations.
2. **Cultural Misalignment** — Names that "sound nice" but lack literary depth, or worse, carry unintended meanings.
3. **Astrological Ignorance** — Traditional naming considers birth charts (BaZi) and Five Elements (WuXing), which most tools ignore entirely.
4. **AI Hallucination** — Even with an LLM, ungrounded generation produces plausible-sounding but fake citations (e.g. invented Tang poems attributed to real poets). **This is the failure mode HarmonyName explicitly engineered against.**

### Our Solution

A **two-layer hybrid system** wrapped in a **grounded multi-agent pipeline**:

1. **Deterministic Layer** (local, fast, no LLM): BaZi computation, Five Elements analysis, favourable / avoid element identification, candidate-character lookup from a curated library.
2. **Grounded Generative Layer** (RAG + multi-agent): A *Composer* agent proposes names by referencing line IDs from a verified pool of real poetry; a deterministic *verifier* enforces grounding; a *Critic* agent ranks the survivors on aesthetic taste; code hydrates the citation from the database.

---

## 🏗️ Solution Architecture

### Hybrid Logic Flow (v2 pipeline)

```
User Input (Birth Date / Time / Location)
    ↓
[Deterministic Layer]                                src/lib/bazi.ts
    ├─ True-Solar-Time correction (longitude / timezone)
    ├─ BaZi (lunar-javascript) — 3- or 4-pillar fuzzy time
    ├─ Five Elements distribution + Strength
    └─ Favourable / Avoid elements → recommended name length
    ↓                                                src/app/app/page.tsx
[POST /api/generate — SSE]                           src/app/api/generate/route.ts
    ├─ Auth gate         (Supabase Auth, 401 if anonymous)
    ├─ Rate limit        (Upstash Redis, 429 if exceeded)
    ├─ Validate (zod)    (400 on bad input)
    └─ Atomic debit 1 credit (402 if empty) — refunded on failure
    ↓
[Naming Pipeline v2 — gated by NAMING_PIPELINE_V2]   src/lib/pipeline/orchestrate.ts
    ① Build verified pool                            src/lib/retriever.ts
       ├─ char-anchored arm  : search_lines_by_chars (real lines containing
       │                       favourable-element candidate chars)
       └─ semantic arm       : OpenAI embed → search_poem_chunks (HNSW pgvector)
       Union, dedupe by chunk_id, filter prose, cap at 25 lines.
    ② Composer agent          (Claude Sonnet 4)      src/lib/agents/composer.ts
       Emits 6 candidates as { lineId, charSpan, surnameChar, givenChars, … }
       — NO poem text, NO source, NO author.
    ③ Hard verifier            (pure code)           src/lib/verify.ts
       lineId ∈ pool ∧ charSpan ⊂ line.text ∧
       givenChars ⊂ charSpan ∧ element/gender/blacklist rules.
       <3 survivors → revise + retry → broaden pool → deterministic rescue.
    ④ Critic agent             (Claude Sonnet 4)     src/lib/agents/critic.ts
       Ranks survivors on taste (phonetics, gender fit, modern aesthetics).
    ⑤ Hydrate citation         (code, from DB row)
       { source, original, translation, pinyin, element } filled from pgvector
       record — the LLM never authored a single character of the citation.
    ↓
SSE stream: {progress} × N → {result: 3 grounded names}
```

When `NAMING_PIPELINE_V2=false` (default-off), the route falls back to a legacy single-Claude path that grounds via prompt-injection only. The v2 path is the one this README describes.

### Key Design Decisions

#### 1. Agents for judgment, code for facts

The Composer LLM emits a **reference** (`lineId` + `charSpan` + `givenChars`) — never a citation string. The citation is **filled in by code** from the corresponding pgvector row. Fabrication is structurally impossible because the LLM cannot author the source text. See [AI Architecture](#-ai-architecture--anti-fabrication-by-design) below.

#### 2. Fuzzy Time Handling

`birthTime === "unknown"` (or unparseable) drops the hour pillar and computes from 3 pillars only. Users who don't know their exact birth time still get a usable BaZi profile.

#### 3. True Solar Time

Year / month / day pillars use Beijing time (for solar-term boundaries); the hour pillar uses longitude-corrected true solar time. Both require a city with `{ longitude, timezone }`; without one, the calculation falls back to naive local time.

#### 4. Isomorphic BaZi engine

`src/lib/bazi.ts` runs in three contexts — the React client, the Next.js API route, and the MCP server. It must stay dependency-light (only `lunar-javascript` + types).

#### 5. Char-anchored ∪ Semantic dual-arm retrieval

Pure semantic search drifts (a line "about water" may not contain a usable Water-element character). Pure char-search produces matches without literary cohesion. We **union both arms** — the LLM gets a pool that is simultaneously *real* (contains the right characters) and *imagistic* (matches the element's classical imagery).

---

## 🤖 AI Architecture — Anti‑Fabrication by Design

This is the most interesting piece of the system, and it generalizes to any "RAG with citations" product.

### The problem

Naive RAG asks an LLM to "use these poems" and trust it to cite faithfully. In practice, LLMs invent — they paraphrase the line, attribute it to the wrong poet, fuse two poems together, or hallucinate a plausible-but-fake Tang quatrain. A user trusting the citation has no way to know.

### The principle

> **Agents for judgment, code for facts.**

The LLM's job is *taste* — choosing characters with the right phonetics, gender feel, and modern aesthetic. The LLM never writes the citation. It emits a tiny structured reference:

```json
{
  "lineId": 8421,
  "charSpan": "清明",
  "surnameChar": "苏",
  "givenChars": ["清", "明"]
}
```

Code then enforces a **conjunction of invariants** (`src/lib/verify.ts`):

1. `lineId` must exist in the candidate pool that was just retrieved.
2. `charSpan` must be a *verbatim contiguous substring* of `pool[lineId].chunk_text`.
3. Every `givenChars[i]` must appear inside `charSpan`.
4. At least one given character must carry a *favourable* element; none may carry an *avoid* element.
5. Gender / blacklist / function-word / tone rules.

If any invariant fails, the candidate is discarded. If fewer than 3 candidates survive, the pipeline revises (feeding the LLM the structured rejection reasons), broadens the pool, and finally falls back to a deterministic rescue that picks characters straight from real lines without any LLM call.

### Why this matters

Because the LLM **cannot author the citation string**, it cannot fabricate it. The worst it can do is reference a `lineId` that fails invariant (1) — at which point the verifier throws the candidate away before the user sees it. The citation the user reads is the *exact bytes* of the row in the database, retrieved by primary key.

This is a useful pattern for any product that promises "AI with sources." The standard trick — RAG + "please cite" — relies on the LLM's honesty. This pattern removes the LLM from the trust path entirely.

---

## ✨ Key Features

### 🔮 BaZi & Five Elements Analysis

- Accurate Solar→Lunar conversion via `lunar-javascript`
- Strength analysis: Day Master *Weak / Strong / Balanced*
- Five Elements distribution + visual breakdown
- Identifies favourable / avoid elements and a recommended name length

### 🧠 Grounded Multi-Agent Naming

- **Char-anchored ∪ semantic dual-arm retrieval** over 11k+ classical lines
- **Composer agent** (Claude Sonnet 4) over-generates 6 candidates by referencing pool line IDs
- **Hard verifier** rejects any candidate whose citation, charSpan, elements, gender, or tone fails an invariant
- **Critic agent** (Claude Sonnet 4) ranks survivors by aesthetic taste, with weighted rubric (gender fit, phonetics, semantic naturalness, source quality, modern aesthetics)
- **Deterministic rescue** guarantees always-3 names, even if both LLM passes underperform

### 🛡️ Production Hardening

- **Supabase Auth** (email magic link + OAuth)
- **Credit system** with atomic debit / automatic refund on failure (Postgres function, RLS-enforced)
- **Stripe Checkout** for credit packs (TEST mode shipped; Live pending key rotation)
- **Upstash Redis** rate limiting + retrieval cache
- **Sentry** error reporting
- **Zod** request validation
- **Vitest** unit tests on `bazi`, `verify`, `namechars`

### 🎨 Modern UI/UX

- Ink-wash inspired aesthetic with Tailwind v4
- Mobile-first responsive layout
- City search with autocomplete (Open-Meteo geocoding)
- Surname picker with pinyin support
- Native Web Speech API for Chinese pronunciation (`useTTS` hook)
- Shareable result cards (`html-to-image`)

---

## 🛠️ Tech Stack

### Core Framework

- **[Next.js 16](https://nextjs.org/)** — App Router, Turbopack dev server
- **[React 19](https://react.dev/)** — UI library
- **[TypeScript 5](https://www.typescriptlang.org/)** — Strict mode

### Styling

- **[Tailwind CSS v4](https://tailwindcss.com/)** — Utility-first CSS
- **[Lucide React](https://lucide.dev/)** — Icon set
- **[Lora](https://fonts.google.com/specimen/Lora)** — Serif typography

### AI & ML

- **[Anthropic Claude](https://www.anthropic.com/)** — `claude-sonnet-4-20250514` for both the *Composer* and *Critic* agents, with prompt caching on the static system prefix.
- **[OpenAI](https://openai.com/api/)** — `text-embedding-3-small` (1536-dim) for **embeddings only**. (Anthropic does not ship an embedding model, so the two providers serve complementary roles.)
- **[Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector)** — Vector store + HNSW index over 11k+ classical poem chunks.

### Data & Backend

- **[Supabase](https://supabase.com/)** — Postgres + Auth + pgvector + RLS-enforced credit system
- **[Stripe](https://stripe.com/)** — Credit-pack checkout + webhook
- **[Upstash Redis](https://upstash.com/)** — Rate limiting (`@upstash/ratelimit`) + retrieval cache
- **[Sentry](https://sentry.io/)** — Error reporting

### Domain Logic

- **[lunar-javascript](https://www.npmjs.com/package/lunar-javascript)** — Solar↔Lunar conversion, solar terms, sexagenary cycle
- **[pinyin-pro](https://www.npmjs.com/package/pinyin-pro)** — Pinyin + tone for character anatomy
- **Custom character library** (`src/data/name-chars.json`, `name-blacklist.json`) — element / gender / blacklist mappings curated for naming use

### Schema, Validation, Testing

- **[zod](https://zod.dev/)** — Runtime request validation
- **[vitest](https://vitest.dev/)** — Unit tests
- **ESLint** — `eslint-config-next`

### External APIs

- **[Open-Meteo Geocoding](https://open-meteo.com/)** — City search → longitude / timezone

### MCP

- **[@modelcontextprotocol/sdk](https://modelcontextprotocol.io/)** — Exposes `calculate_bazi` as a tool for Claude Desktop (`mcp/server.ts`).

---

## 🏛️ System Architecture

### Directory Structure

```
harmony-name/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── page.tsx                      # Landing page
│   │   ├── app/page.tsx                  # Main app (form + results)
│   │   ├── profile/page.tsx              # History + saved names
│   │   ├── buy/page.tsx                  # Credit packs
│   │   ├── login/page.tsx                # Supabase Auth UI
│   │   ├── auth/callback/route.ts        # OAuth callback
│   │   ├── api/
│   │   │   ├── generate/route.ts         # SSE naming endpoint (auth + credits + pipeline)
│   │   │   ├── checkout/route.ts         # Stripe Checkout session
│   │   │   └── webhooks/stripe/route.ts  # Stripe webhook → credit top-up
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── lib/                              # Core business logic
│   │   ├── bazi.ts                       # Isomorphic BaZi engine
│   │   ├── retriever.ts                  # pgvector RAG (semantic + char-anchored)
│   │   ├── verify.ts                     # ★ Hard anti-fabrication gate
│   │   ├── namechars.ts                  # Char library: element/gender/blacklist/pinyin
│   │   ├── prompt.ts                     # Prompt builders (cacheable static prefix)
│   │   ├── schemas.ts                    # Zod request schemas
│   │   ├── claude.ts                     # Anthropic SDK client
│   │   ├── openai.ts                     # OpenAI client (embeddings only)
│   │   ├── supabaseAdmin.ts              # Service-role client (SERVER ONLY)
│   │   ├── supabase/                     # Browser + server + middleware auth clients
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── credits.ts                    # deductCredit / refundCredit / getCredits
│   │   ├── stripe.ts                     # Stripe SDK client
│   │   ├── creditPacks.ts                # Pack catalog
│   │   ├── redis.ts                      # Upstash Redis (cache + ratelimit)
│   │   ├── ratelimit.ts                  # generateRatelimit
│   │   ├── elements.ts                   # Five Elements helpers
│   │   ├── surnames.ts                   # Common-surname catalog
│   │   ├── tts.ts                        # Web Speech utilities
│   │   ├── env.ts                        # Env var typing
│   │   ├── agents/
│   │   │   ├── composer.ts               # ★ Composer LLM (Claude Sonnet 4)
│   │   │   └── critic.ts                 # ★ Critic LLM (Claude Sonnet 4)
│   │   ├── pipeline/
│   │   │   └── orchestrate.ts            # ★ v2 pipeline (retrieve→compose→verify→critic→hydrate)
│   │   └── *.test.ts                     # Vitest unit tests
│   │
│   ├── data/                             # Static curated data
│   │   ├── name-chars.json               # Element → candidate chars + gender lean
│   │   └── name-blacklist.json           # Hard / function-word / gender-forbidden
│   │
│   ├── components/                       # React components
│   ├── hooks/                            # useCitySearch, useTTS
│   ├── types/                            # NameOption, City, etc.
│   ├── sentry.*.config.ts                # Sentry setup
│   ├── instrumentation*.ts               # Next.js instrumentation hooks
│   └── proxy.ts                          # Middleware (auth session refresh)
│
├── supabase/
│   └── migrations/
│       ├── 001_create_poems_tables.sql           # pgvector + HNSW + search_poem_chunks
│       ├── 002_create_profiles_credits.sql       # profiles + deduct_credit/add_credits + RLS
│       ├── 003_fix_search_poem_chunks_ambiguity.sql
│       ├── 004_create_history_favorites.sql      # generations + saved_names
│       ├── 005_search_poem_chunks_add_chunk_id.sql
│       └── 006_chunk_text_trgm_and_by_chars.sql  # search_lines_by_chars (char-anchored arm)
│
├── scripts/
│   ├── process-poems.py                  # OpenCC normalize + chunk (chinese-poetry repo)
│   ├── seed-supabase.ts                  # Embed chunks (OpenAI) + insert to Supabase
│   ├── add-fame-score.sql                # ★ Add fame_score + redefine search_poem_chunks
│   ├── enrich-corpus.ts                  # Corpus expansion helper
│   ├── cleanup-corpus.ts
│   └── setup-e2e-user.ts                 # E2E test fixture
│
├── mcp/
│   ├── server.ts                         # MCP server exposing calculate_bazi over stdio
│   └── README.md
│
├── public/                               # Static assets
├── fixtures/                             # Test fixtures
├── package.json
├── tsconfig.json
├── next.config.ts
└── README.md
```

### Separation of Concerns

The codebase splits cleanly along a *trust boundary*:

| Layer | Responsibility | Examples |
|---|---|---|
| **Presentation** (`src/app/`, `src/components/`) | UI, SSE consumer, form state | `app/app/page.tsx`, `GenerationProgress.tsx` |
| **Orchestration** (`src/lib/pipeline/`) | Sequencing agents, applying verifier, hydrating output | `orchestrate.ts` |
| **Agents** (`src/lib/agents/`) | LLM calls — *taste only* | `composer.ts`, `critic.ts` |
| **Deterministic core** (`src/lib/bazi.ts`, `verify.ts`, `namechars.ts`) | Pure functions; no LLM, no I/O surprises | BaZi, invariants, char lookups |
| **Data** (`src/lib/retriever.ts`, `supabase/`) | pgvector RPC, Supabase Auth, credits, history | `searchPoems`, `buildVerifiedPool` |

LLMs live above the trust boundary — they propose. Everything below the trust boundary disposes.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** (or yarn / pnpm)
- A **Supabase** project (free tier is fine)
- An **OpenAI API key** (embeddings) and an **Anthropic API key** (generation)
- *(Optional)* Stripe, Upstash, Sentry accounts for the full production stack

### Installation

```bash
git clone https://github.com/yourusername/harmony-name.git
cd harmony-name
npm install
```

### Environment variables

Create `.env.local` in the repo root:

```env
# --- AI (both required) ---
OPENAI_API_KEY=                          # Embeddings only (text-embedding-3-small, 1536-dim)
CLAUDE_API_KEY=                          # Anthropic Claude Sonnet 4 — note: NOT ANTHROPIC_API_KEY

# --- Supabase (auth + pgvector + credits) ---
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=               # Server only — never imported in client code

# --- Stripe (optional in dev) ---
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# --- Upstash Redis (optional — caches + rate limits) ---
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# --- Sentry (optional — error reporting) ---
NEXT_PUBLIC_SENTRY_DSN=

# --- Feature flags ---
NAMING_PIPELINE_V2=true                  # Enable grounded multi-agent pipeline
```

### Set up the database

Apply the schema in order:

```bash
# 1. Run all migrations in supabase/migrations/ via the Supabase SQL editor (in numeric order)
#    001 → 006

# 2. Then run scripts/add-fame-score.sql in the Supabase SQL editor.
#    This adds fame_score AND REDEFINES search_poem_chunks to take query_embedding
#    as text (a JSON-stringified vector) and rank by 0.7 * similarity + 0.3 * fame_score/3.
#    The redefined version is what the app actually calls.
```

### Seed the poetry vector database

```bash
# Source corpus (gigabytes of Chinese poetry, MIT-licensed)
git clone --depth 1 https://github.com/chinese-poetry/chinese-poetry.git /tmp/chinese-poetry

# Normalize Traditional → Simplified, chunk by line/couplet, write scripts/poem-chunks.json
#   Requires Python 3 + opencc
python3 scripts/process-poems.py

# Embed each chunk via OpenAI and insert into Supabase
npx tsx scripts/seed-supabase.ts
```

### Run

```bash
npm run dev                # Next.js dev server (Turbopack) → http://localhost:3000
npm run build              # Production build
npm run start              # Serve production build
npm run lint               # ESLint
npm test                   # Vitest
npx tsc                    # Type-check only
```

### MCP server (optional)

`mcp/server.ts` exposes the BaZi calculator as a Claude Desktop tool over stdio:

```bash
npx -y tsx mcp/server.ts
```

Wire it into Claude Desktop's `claude_desktop_config.json` to call `calculate_bazi` directly from a chat.

---

## 💡 Technical Highlights

### 1. Grounded RAG over Supabase pgvector

```typescript
// src/lib/retriever.ts — semantic arm
const { data: queryVector } = await openai.embeddings.create({
  model: "text-embedding-3-small",
  input: query,
  encoding_format: "float",
});

const { data, error } = await supabaseAdmin.rpc("search_poem_chunks", {
  query_embedding: JSON.stringify(queryVector), // PostgREST: text-encoded vector
  match_threshold: 0.25,
  match_count: topK,
});
// Ranked by 0.7 * cosine_similarity + 0.3 * fame_score/3 — see add-fame-score.sql.
```

```typescript
// Char-anchored arm — real lines containing the favourable-element chars
const { data } = await supabaseAdmin.rpc("search_lines_by_chars", {
  chars: ["清", "瑶", "晗", ...],
  match_count: 20,
});
```

```typescript
// Union → dedupe by chunk_id → drop prose chunks → cap → the LLM's universe
const pool = await buildVerifiedPool({
  favourableChars: candidateCharsFor(favourableElements, gender),
  imageryQuery: "中国古典诗词 春天 生长 树木 青翠 仁德",
});
```

**Why dual-arm?** The semantic arm finds lines whose *imagery* matches the user's element profile; the char-anchored arm guarantees the pool actually *contains* usable name characters. Their union is both literarily apt and structurally usable.

### 2. Composer → Verify → Critic loop

```typescript
// orchestrate.ts (simplified)
const { candidates } = await runComposer(profile, pool);          // LLM emits refs
let verified = candidates.filter(c => verifyCandidate(c, ctx).ok); // Code enforces facts

if (verified.length < 3) {
  // Feed structured failure reasons back to the LLM; ask again.
  const retry = await runComposer(profile, pool, failureReasons);
  verified = dedupe([...verified, ...retry.candidates.filter(...)]);
}
// Then: broaden retrieval, deterministic rescue, guarantee always-3.

const rankings = await runCritic(profile, verified, pool);        // LLM ranks taste
const names = ordered.slice(0, 3).map(c => hydrate(c, pool));     // Code fills citation
```

This is the [evaluator-optimizer](https://www.anthropic.com/research/building-effective-agents) pattern adapted to RAG: a generator proposes, a deterministic critic filters (the "hard gate"), and an LLM critic ranks the survivors.

### 3. True Solar Time (`src/lib/bazi.ts`)

```typescript
const standardMeridian = (timezoneOffset / 60) * 15;
const longitudeDiff = longitude - standardMeridian;
const correctionMins = longitudeDiff * 4; // 4 minutes per degree
// Year/month/day pillars use Beijing time (for solar-term boundaries).
// Hour pillar uses longitude-corrected true solar time.
```

### 4. SSE streaming with refundable credits

The `/api/generate` route uses Server-Sent Events to push `progress` updates as the pipeline advances, then a final `result`. Credit handling is **atomic**: 1 credit is debited *before* any AI call (so an empty wallet gets a 402 without spending compute), and **refunded** if generation fails — see `src/lib/credits.ts`.

### 5. Auth + Credits enforced at the DB

```sql
-- supabase/migrations/002 — no INSERT/UPDATE/DELETE policy on profiles
-- = the anon key CANNOT change credits from the browser, ever.
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
-- All credit mutation flows through SECURITY DEFINER RPCs (deduct_credit / add_credits).
```

---

## 📚 API Documentation

### `POST /api/generate`

Streams BaZi-grounded name candidates over **Server-Sent Events**.

**Headers**: `Content-Type: text/event-stream`

**Request body** (validated by zod, `src/lib/schemas.ts`):

```typescript
{
  gender: "male" | "female";
  dayMaster: string;                       // e.g. "Wood", "Fire" (computed client-side)
  strength: string;                        // "Weak" | "Strong" | "Balanced"
  favourableElements: string[];            // e.g. ["Water", "Metal"]
  avoidElements?: string[];
  surnamePreference?: string;              // "auto" | "specified" | "from_common"
  specifiedSurname?: string;               // single hanzi character
  recommendedNameLength: string;           // e.g. "2 characters (Surname + 1 Name)"
  wuxing?: { gold: number; wood: number; water: number; fire: number; earth: number };
  bazi?: { year: string; month: string; day: string; hour: string };
}
```

**SSE event stream** — each event is `data: {json}\n\n`:

```typescript
// progress (emitted multiple times during the pipeline)
{ type: "progress", step: number, total: number, message: string }

// result (final)
{
  type: "result",
  creditsRemaining: number,
  data: {
    analysis: string,
    names: [
      {
        hanzi: string,                     // e.g. "苏清涟"
        pinyin: string,                    // e.g. "Sū Qīng Lián"
        poeticMeaning: string,             // English, 2–3 sentences
        culturalHeritage: {
          source: string,                  // "《某诗》— 作者 (朝代)" — from DB, not LLM
          original: string,                // The real line, with given chars in {braces}
          translation: string,
        },
        anatomy: [
          { char: string, pinyin: string, meaning: string, type: "Surname" | "Given Name", element: string }
        ],
        masterComment: string,
      }
      // ... exactly 3 names
    ]
  }
}

// error (terminal)
{ type: "error", error: string, code: string, creditsRemaining?: number }
```

**HTTP error responses** (returned synchronously *before* the stream opens):

| Status | Code | Meaning |
|---|---|---|
| **401** | `UNAUTHENTICATED` | User is not signed in. |
| **400** | `VALIDATION_ERROR` | Body failed zod validation. `details` carries the issues. |
| **402** | `INSUFFICIENT_CREDITS` | Wallet is empty; no AI calls were made. |
| **429** | `RATE_LIMITED` | Upstash rate limit exceeded. |
| **500** | `ENV_MISSING` / `CREDIT_ERROR` | Server misconfigured. |

**In-stream error codes** (sent as `{type: "error"}` after credit was debited; credit is automatically refunded):

| Code | Meaning |
|---|---|
| `NO_VERIFIED_NAMES` | Pipeline produced 0 candidates that survived verification (even after retry, broadening, and deterministic rescue). |
| `EMPTY_RESPONSE` | Claude returned no text (legacy path). |
| `PARSE_ERROR` | Claude returned malformed JSON (legacy path). |
| `API_ERROR` | Upstream / unexpected error (reported to Sentry). |

### `POST /api/checkout`

Creates a Stripe Checkout session for a credit pack. Requires auth. Returns `{ url }` to redirect the user to Stripe.

### `POST /api/webhooks/stripe`

Stripe webhook receiver. Reads `userId` and `credits` from the session metadata and tops up the user's balance via `add_credits` (service-role RPC).

---

## 🗺️ Roadmap

### ✅ Completed

- [x] BaZi calculation engine (3- and 4-pillar fuzzy time, true-solar-time)
- [x] Five Elements analysis + favourable / avoid element resolution
- [x] AI-powered name generation (migrated to Claude Sonnet 4)
- [x] **Supabase pgvector RAG** with HNSW + fame-score ranking (11k+ chunks)
- [x] **Multi-agent naming pipeline with anti-fabrication invariant** — Composer → Verify → Critic → hydrate
- [x] **Char-anchored ∪ semantic dual-arm retrieval**
- [x] **Supabase Auth** + RLS-enforced credit system (atomic debit / refund)
- [x] **SSE streaming** with progress events
- [x] Upstash rate limiting + retrieval cache
- [x] Sentry error reporting
- [x] City search + true solar time
- [x] Web Speech TTS
- [x] MCP server for Claude Desktop
- [x] Unit tests (Vitest) on the deterministic core

### 🚧 In Progress

- [ ] **Stripe Live mode** (TEST mode shipped end-to-end; awaiting key rotation + webhook config)
- [ ] Generation history UI polish on `/profile`
- [ ] PDF / image export of name cards (`html-to-image` plumbing in place)

### 🔮 Planned

- [ ] Surname analysis for users who already have a Chinese surname
- [ ] Multi-language UI (currently EN-only prose with CN names)
- [ ] Deeper BaZi: Ten Gods, Day Master relationships, Lucky Day picker
- [ ] Expanded MCP tool surface (RAG search, name verification)
- [ ] Mobile app (React Native)

---

## 🤝 Contributing

Contributions are welcome. The codebase aims to be a clean reference for "RAG with citations you can actually trust."

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas for Contribution

- **Pipeline**: New verifier invariants (e.g. surname–given-name homophone screening), additional rescue strategies
- **Retrieval**: Better chunking, alternative ranking functions, query expansion
- **Algorithm**: Ten-Gods analysis, more nuanced strength scoring
- **UI/UX**: Accessibility, internationalization, mobile polish
- **Performance**: Embedding caching, prompt-cache hit-rate tuning
- **Testing**: E2E tests on the auth + credit flow, more verifier corner cases

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)** — the open corpus that makes grounded naming possible
- **lunar-javascript** — solar↔lunar conversion and the sexagenary cycle
- **Anthropic** — Claude Sonnet 4 for the Composer and Critic agents
- **OpenAI** — `text-embedding-3-small` for the embedding layer
- **Supabase** — Postgres + pgvector + Auth in one platform
- **Traditional BaZi masters** — for the wisdom of Five Elements theory

---

## 📧 Contact

For questions, suggestions, or collaboration opportunities, please open an issue on GitHub.

---

**Built with ❤️ using Next.js, TypeScript, Claude Sonnet 4, and Supabase pgvector.**
