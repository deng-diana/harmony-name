# SCRATCHPAD

> Public working log — sanitized for the public repo. Latest session on top.
> Full personal state (resume pointer, deferred roadmap, soft state) lives
> in `SCRATCHPAD.local.md` (gitignored, local only).
> For stable repo context see [CLAUDE.md](./CLAUDE.md).

---

## 2026-06-11 — fix Vercel Preview build failure + RLS hardening

### What landed (on `feat/element-compatibility`)
**1. Build fix — lazy-init the AI clients.** PR #1's Preview deployment was failing
the build with `Missing credentials ... OPENAI_API_KEY`. Root cause: `openai.ts` and
`claude.ts` ran `new OpenAI()` / `new Anthropic()` at **module top level**, which
executes during `next build`'s "Collecting page data" step. All 12 Vercel env vars are
scoped to **Production only** → the Preview build (PR branch) had no `OPENAI_API_KEY` →
constructor threw → build crashed. (Prod was fine — it has the Production vars.)
Converted both to lazy singletons (`getOpenAI()` / `getClaude()`), mirroring the existing
`stripe.ts` null-guard pattern. Build no longer depends on secrets; a missing key now only
fails the single request (caught by `/api/generate` → credit refund), never the build.
Updated all 6 call sites (retriever, composer, critic, generate route, enrich-corpus script).

**2. RLS hardening — `007_enable_rls_on_poems.sql`.** `poems` / `poem_chunks` were built
in 001 (before auth/RLS existed in 002) and were the only public tables without RLS →
Security Advisor ERROR `rls_disabled_in_public`. New migration enables RLS, **no policy**:
both are read only via `supabaseAdmin` (service_role bypasses RLS), so deny-by-default for
anon/authenticated is safe. **Must be run manually in the Supabase SQL editor.**

### Verified
`npx tsc` clean (only a pre-existing implicit-any in enrich-corpus remains), 62/62 tests pass.

### Operational fix — Preview env vars (DONE)
The build had TWO independent causes; both had to be fixed. Beyond the lazy-init code
(cause ①), the app legitimately needs Supabase `URL` + anon key at build time (Server
Components in auth-gated pages/layouts call `createClient()` during page-data collection)
— cause ②. All 12 Vercel env vars were **Production-only**, so Preview had nothing.
Added the 8 safe vars (OpenAI/Claude/Supabase-trio/Upstash-pair/Sentry — **Stripe excluded**,
since prod uses LIVE keys) to Preview. The user then widened them from branch-scoped to
**all Preview branches** in the dashboard (durable; future branches inherit them).
Note: Vercel CLI 54.4.1 can't add to "all preview branches" non-interactively (returns
`git_branch_required` even with `--yes`); branch-scoped `vercel env add NAME preview <branch>
--value … --yes` works. Editing env scope in the dashboard preserves the encrypted value
(don't retype sensitive values).

### Follow-up commit — supabaseAdmin was the second build mine (whack-a-mole)
First lazy-init commit (36d4c01) fixed openai/claude but the next Preview build failed with
`supabaseUrl is required.` — `supabaseAdmin.ts` also constructed `createClient(URL!, …)` at
module top level. Did a **full audit** of every module-level client construction this time:
- Now lazy: `getOpenAI` / `getClaude` / `getSupabaseAdmin` (all construct inside a fn).
- Already safe (guarded → null, no throw): `redis`, `stripe`, `ratelimit`.
- `Sentry.init` is a no-op when DSN missing (no throw).
- All `createClient()` call sites use the `supabase/{server,client}.ts` function wrappers
  (run at request time, not at import) → build's page-data collection never invokes them.
Converted `supabaseAdmin` → `getSupabaseAdmin()` + 4 app call sites + 3 data scripts.
Couldn't run `next build` locally to prove it — macOS TCC blocks Turbopack from reading
`~/Desktop` (`Operation not permitted`); Vercel (Linux) is unaffected. Verified via tsc +
62/62 tests + exhaustive import-time audit instead.

### Outcome (resolved)
- Commits on branch: `36d4c01` (openai/claude lazy) + `3816890` (supabaseAdmin lazy).
- Net effect of the code fix: the build no longer needs **any secret** — only the two
  *public* Supabase vars (URL + anon key) for build-time Server-Component rendering.
- **Preview build → green** (`p07ck3sz9`, 48s) once both fixes were in place.
- RLS 007 applied + verified in prod Supabase: `poems` / `poem_chunks` both
  `relrowsecurity = true`.
- **PR #1 merged to main** (`11b2aa5`) → **Production deploy green** (`a7mtb28kc`); new
  code (lazy-init + Five-Element compatibility + landing overhaul) is live.

---

## 2026-06-05 — landing page (`/`) copy + content overhaul (P0+P1)

### What landed
Rewrote the landing page content/copy to be honest, resonant, and grounded in what
the product actually does — while **keeping the original refined ink-landscape hero
visual** (`/hero-bg.png`). Reviewed by an in-loop top cultural-product UI/UX designer
sub-agent (refs: The Met / Google Arts & Culture / NYT / Calm).

### The story behind the copy
- **Old copy sold nothing true:** hero was "5,000 years of wisdom + modern AI" (every
  competitor's line); the real moat — *every name's characters are verified to come from
  a real classical poem, by code; fabrication is structurally impossible* — was nowhere.
  And a **fake decorative example** ("Forest Rain Lily") was used to sell a product whose
  whole point is "never invented" — self-defeating. Designer flagged this as the #1 trust
  hardfix.
- **New narrative (7 sections):** hero → the ache (for non-native speakers who want a name
  that *means something*) → **a real generated name** (reuses `NameCard`, see below) →
  3 honest pillars (真/時/解, no robot emoji) → 3-step how-it-works → Five-Element self
  teaser (dark ink section) → trust & pricing (3 free, auto-refund on failure, packs from
  $5) + honest disclaimer → footer with **real** `/privacy /terms /refund` links (were `#`).
- **Hero title — iterated with the user.** "A Chinese name with a real source" undersold
  the *match-to-you* half. Final (UX-writer + 中文系 framing): **"A name that fits you —
  down to the hour you were born."** The "hour" concretely signals Bāzì depth (needs exact
  birth time) without mysticism; subhead carries the rational proof (Four Pillars + real
  poetry, "never invented"). Hero kept clean over the landscape — removed the big 林 glyph /
  `lín·木·Wood` line / "↓ see a real one" arrow at the user's request (they clashed with the
  lone figure in the ink painting).

### Files
- `src/app/page.tsx` — full rewrite (kept hero `/hero-bg.png` + a soft cream scrim for text
  legibility; kept the dark ink "Five-Element self" section visual).
- `src/components/NameCard.tsx` — new `readOnly?: boolean` (+ optional play props) so the
  real sample card renders safely on the public page (hides Volume2/Share/Save which need
  auth/context). Sample = **`张皎`** (皎=Metal, from 《酬殷上人秋夜山亭有赠》陈子昂 唐, real line
  「皎皎白林秋」, prod-verified) — a real one, never a fake.
- `src/components/StickyHeader.tsx` — CTA "Find my name" + a "Sign in" link; dropped hover scale.
- `src/app/layout.tsx` — richer metadata + OpenGraph/Twitter (OG image `/og.png` is a P3 TODO).
- `src/app/globals.css` — defined the `animate-fade-in / fade-in-up / delay-*` keyframes that
  were referenced but never existed (so entrance animations actually run) + `prefers-reduced-motion`.

### Verified
- `npx tsc` clean, ESLint clean, **62/62 tests** (no regression). DOM-level e2e on `/`:
  hero renders over the landscape image, all sections + real card + correct CTA/legal links,
  trust hardfixes confirmed (no fake example / no robot emoji / no mysticism / no dead links).
  (watchr screenshots returned blank all session — a capture limitation, not a render bug.)

### Deferred (P2/P3)
- P2 visual polish: tighter type scale, de-card-ify, 朱砂 seal + paper texture, ink entrance
  on hero. P3: real 1200×630 OG image, deeper mobile pass.
- Other sections still use the new editorial layout; if the user wants the *original* card
  grids (Why-Choose / How-It-Works) restored with only copy swapped, that's a follow-up.

---

## 2026-06-05 — results page: Five-Element compatibility section ("who you vibe with")

### What landed
Replaced the decorative "Your colours / Your way / Your season" lines on the
results page with a **Five-Element interpersonal compatibility** module that answers
the "which tribes are your friends?" teaser the page had been posing but never
answering. Branch `feat/element-compatibility`.

### The model (reviewed by an in-loop 八字/国学 master sub-agent)
Two **orthogonal axes**, not a one-dimensional good/bad verdict:
- **Axis 1 — relation nature** (pure 生克, same for everyone with that day-master):
  nourisher(生我·印) / protégé(我生·食伤) / kindred(同族·比劫) /
  challenger(克我·官杀) / cultivator(我克·财). Stops at the "star" layer — never
  names 正官/七杀 etc. (only have the element, not stem polarity).
- **Axis 2 — energy P&L** (lookup against the chart's already-computed 喜忌):
  favourable → lifts / avoid → costs / neither → easy. Best-match = favourable[0].

The master killed four would-be mistakes, all folded in before coding:
1. don't compress to one axis (the喜忌 nuance is the whole point);
2. **比劫 must NOT get strength-flip special-casing** — drive it from 喜忌 like the
   other four (身强 ≠ always-forbid-比劫; depends on the chosen 用神);
3. "Muse" for 食伤 was directionally backwards → **Protégé**; "Steward/掌局者" for
   财 too power-grabby → **Cultivator** (经营/成全, not control);
4. **never say "相克" or "婚配"** in copy — it contradicts the喜忌-not-生克 thesis and
   over-promises vs a day-master-only simplification. Added a single-side-view social
   hook + honest disclaimer instead. Balanced charts soften both sides symmetrically.

### Files
- new `src/lib/compatibility.ts` (pure, reuses exported `RELATIONSHIPS` + 喜忌) +
  `src/lib/compatibility.test.ts` (7 cases incl. the 比劫-via-喜忌 regression).
- new `src/components/ElementCompatibility.tsx` (all English copy lives here; logic
  module stays prose-free). Matches existing amber/stone visual language.
- `DestinyCard.tsx`: dropped colours/way/season block + dead computations; tribes chip
  row kept as the section header, compatibility rendered right under it.
- `bazi.ts`: exported `RELATIONSHIPS` (was private).

### Verified
- `npx tsc` clean, ESLint clean, **62/62 tests** (55 prior, no regression + 7 new).
- Browser e2e (1990-01-04 / Suining / female = Earth/Strong, the screenshot chart):
  all five 生克 relations classify correctly (🔥Nourisher·Best / 🌲Challenger /
  ⚔️Protégé / 🌊Cultivator / ⛰️Kindred); Lifts/Costs chips, summary金句 (no "clash"),
  hook + disclaimer all render; colours/way/season confirmed gone.

### Deferred (2nd pass, agreed)
- Share card (`ElementShareCard.tsx`): add a "Best match: 🔥 Radiant Flame" line.
- Optional: click-to-expand a tribe row for its relationship detail.

---

## 2026-06-01 — always-3 invariant fixed (graded-relaxation rescue)

### The bug
v2 could return 2 names not 3 on **female + favourable-yang** charts (live repro
邓容/邓晴方; eval miss `edge-2-female-strong-yang` → 林容/林晴 = 2). Root cause:
the "always-3 guarantee" was never hard-enforced (final `slice(0,3)`), and the
deterministic last-tier rescue **re-applied the SOFT gender-lean filter**
(orchestrate.ts:284 + via `verifyCandidate`) — so when the pool's favourable-element
chars skewed masculine, even the last resort starved and emitted < 3.

### The fix
`rescueDeterministic` now does **graded relaxation**: hard invariants always hold
(grounding / hard-blacklist / hard `genderForbidden` 武·雄… / non-avoid element /
surname-distinct); only the SOFT gender-lean relaxes progressively until 3 exist,
with an honest "leans slightly yang" note on any relaxed pick. Routed through a new
`VerifyContext.allowGenderLean` flag (keeps ONE verify code path). Extracted the pure
rescue into `src/lib/pipeline/rescue.ts` (no API-client imports) so it's unit-testable
at zero cost.

### Verified
- New `src/lib/pipeline/rescue.test.ts` (7 cases, TDD): **failed pre-fix** (constrained
  chart → 晴/容 = 2), **passes post-fix** (晴/容/旭 = 3, 旭 from the relaxed pass).
  `npx tsc` clean, ESLint clean, **55/55 tests green** (48 old + 7 new; old behavior unchanged).
- Full eval (8 fixtures): **Always-3 = 100% (8/8)** — was 7/8; Citation 100% (24/24);
  Element 100% (24/24). The hard fixture now yields 林容 / 林玉 / 林山.

### Deferred (optional, quality not count)
- Enrich `name-chars.json` `feminineLean` for Metal (only 4 feminine chars). The rescue
  fix already guarantees always-3; this would just improve aesthetic supply.

---

## 2026-05-31 — v2 grounded pipeline ACTIVATED in prod + verified e2e

### What landed (ops, no code change)

- Confirmed Supabase migrations **005 + 006 already applied** in prod
  (probed live: `search_poem_chunks` returns `chunk_id`,
  `search_lines_by_chars` exists). The "blocks v2" gate was already
  cleared — DB was ready.
- Set `NAMING_PIPELINE_V2=true` in Vercel **production** env.
- Redeployed prod (`vercel --prod`) → aliased to **harmonyname.com**.
  Env var snapshots per-deployment, so the redeploy is what actually
  flips the pipeline live.
- **The killer feature is now live**: prod was previously serving the
  legacy single-shot Claude path (fabrication-prone, the 中天明月色
  class). It now runs the grounded multi-agent pipeline.

### Production smoke test (the hard case, via browser e2e)

Logged in as e2e user → `1995-08-12 / 午时 / Beijing / female`
(Wood, Strong, favourable Metal·Fire·Earth). Returned **3 grounded
names**, all anti-fabrication-clean:

| Name | char (element) | Source | char really in cited line |
|------|----------------|--------|---------------------------|
| 张皎 zhāng jiǎo | 皎 (Metal) | 《酬殷上人秋夜山亭有赠》陈子昂(唐) | ✅ 皎皎白林秋 |
| 张银 zhāng yín  | 银 (Metal) | 《眉妩》王沂孙(宋) | ✅ 一曲银钩小 |
| 张堪 zhāng kān  | 堪 (Earth) | 《眉妩》王沂孙(宋) | ✅ 最堪爱 |

Verified live:
- v2 multi-stage progress shown (analyze → search → craft → verify);
  **rescue tiers fired** ("Broadening the search…") on this hard
  female-strong case — the same case that returned only 2 names in the
  eval-v0 baseline. **Always-3 held in prod.**
- Auth gating works (logged in, `/api/generate` 200 SSE,
  `sentry-environment=vercel-production`).
- Credit deducted **12 → 11** (billing path correct).
- Console: zero errors.

### Stripe TEST payment flow — verified e2e (same session)

- Config probe (test-mode key): webhook endpoint
  `https://harmonyname.com/api/webhooks/stripe` registered + **enabled**
  for `checkout.session.completed`; `STRIPE_WEBHOOK_SECRET` present.
- Live purchase e2e as the e2e user: `/buy` → STARTER ($5/10cr) →
  Stripe hosted Checkout → test card `4242 4242 4242 4242` →
  redirect `/app?purchase=success`. **Credits 11 → 21** (+10 landed).
- Confirmed from Stripe side: session `cs_test_…BJd8o7…` complete/paid;
  event `evt_…WSufxSLZ` has **`pending_webhooks=0`** (delivered + 2xx).
- This proves the whole trust chain: checkout → signed webhook →
  `add_credits` → balance, with Redis idempotency not blocking. The
  success page never adds credits (by design), so the +10 IS the proof.
- Stripe TEST flow proven; Live done same day (below).

### Stripe is now LIVE — verified with a real purchase (same session)

- Decision: stay on **raw Stripe** for launch (lowest fees, already built),
  revisit a Merchant-of-Record (Stripe Managed Payments / Paddle) only if EU
  sales grow. Operator = **UK sole trader (individual, no company)**; payouts
  to **Revolut** (GBP, free settlement, auto-payouts).
- Swapped all 3 prod env vars to live (`pk_live_` / `sk_live_` / live `whsec_`)
  via a secure temp-`.env.live` flow (secrets never pasted into chat), redeployed.
- Created a **live-mode** webhook endpoint (`checkout.session.completed` →
  harmonyname.com/api/webhooks/stripe); endpoint reachable (curl → 400 = OK).
- **Real-card e2e:** Visa charged £3.78 (=$5 Starter) → app credits **27 → 37**
  (+10), live webhook delivered → `add_credits` ran. Then **refunded** the test
  charge (status Refunded). Full live trust chain proven.
- Legal pages drafted by 3 specialist sub-agents: `/terms`, `/privacy`,
  `/refund` (templates w/ placeholders; need solicitor review + footer links +
  a checkout "immediate-delivery consent" line).
- 🐛 Found a live bug to fix next: a female-ish chart returned **2 names not 3**
  (always-3 invariant) — same class as the eval-v0 edge case.

### Doc drift spotted (now fixed)

- CLAUDE.md named the by-chars RPC wrong; the real name (migration 006 +
  retriever.ts) is **`search_lines_by_chars`**. Code was always correct;
  only the doc was stale. Fixed — CLAUDE.md now matches the code.

---

## 2026-05-28 — Code-review × xhigh + UX hot-patches + production push

### Commits

- `a60fa47` fix(naming): code-review hot-patches #1-#5
- `f257ca0` fix(naming): code-review remaining patches #6-#15
- `79b2baa` fix(ui): brace-aware poem highlighting + hide empty translation
- `54af8fe` docs: add SCRATCHPAD.md (working log of session state)
- `51c5aa6` docs: consolidate working conventions into CLAUDE.md, gitignore SCRATCHPAD.md
- `76756db` docs: split SCRATCHPAD into committed (public) + .local (gitignored)
- `d8d5c4e` docs(claude): fix stale test-framework claim + document v2 pipeline
- `67e3829` docs(readme): rewrite to match current architecture
- `861631d` feat(eval): v0 name-quality eval harness (8 fixtures, 3 metrics)

### Eval v0 baseline (the first data point on the compound curve)

Ran against current main (8 profiles, 23 names, 8.5 min, ~$0.40):

| Metric              | Pass rate  |
|---------------------|------------|
| Citation accuracy   | 100% (23/23) — anti-fabrication holds end-to-end
| Always-3 invariant  |  88% (7/8)  — 1 edge case (Balanced female narrow Fire/Earth)
| Element correctness | 100% (23/23)

Citation 100% confirms the v2 grounded pipeline structurally
prevents the fabrication class of bugs from the original 中天明月色
case. The one always-3 miss is the constructed worst-case edge —
worth investigating whether rescueDeterministic fired.

### Engineering work

- Ran `/code-review` at xhigh effort: 5 angles × 1-vote verify × sweep →
  15 ranked findings, all fixed.
- 2 UX bugs surfaced during localhost e2e, also fixed.
- Fix categories: BaZi engine (调候 conflict resolution), retrieval
  (Redis cache version bump, chunk_id Number coercion), pipeline
  (deterministic rescue fallback, dedupe-best-wins, Critic byIdx
  bounds), agents (Balanced length parse, critic accept default),
  verify (surname blacklist, charSpan skip-whitelist), corpus scripts
  (orphan-heal in enrich-corpus, dry-run guard + author-match in
  cleanup-corpus).

### Verified behavior

- 864-chart sweep: `favourable ∩ avoid = ∅` after 调候 fix (zero
  conflicts across the matrix).
- End-to-end on localhost with hardest constrained case
  (female 1995-08-12 12:00 Beijing, favourable Metal/Fire/Earth):
  3 grounded names returned in 92s, 1 credit deducted correctly,
  deterministic rescue fired 2/3 candidates — exactly the always-3
  invariant we added.
- `npx tsc` clean, ESLint clean, 48 vitest tests green throughout.

### Deployed

- 21 commits pushed to `main` → Vercel ✅ Ready in 46s.
- New BaZi engine (true solar time + EoT + 调候 + 扶抑法) and UI
  refresh (DestinyCard, brace-aware citation highlighting) are live.
- Multi-agent naming pipeline (取名先生 Composer + 评审先生 Critic +
  deterministic rescue) is built but **dormant behind env flag**
  (`NAMING_PIPELINE_V2`) — intentional staged rollout pending
  Supabase migration runs.

### Workflow / process

- Established SCRATCHPAD.md habit (working log per session).
- Consolidated all working conventions (commit-message prefix +
  SCRATCHPAD workflow) into project `CLAUDE.md` → "Working
  conventions" section. Two redundant memory files deleted.
- Global rule (cross-project) lives in `~/.claude/CLAUDE.md`.
- After critical re-analysis, split SCRATCHPAD into public
  (committed) + `.local` (gitignored) — durability + privacy both
  preserved.
