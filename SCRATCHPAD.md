# SCRATCHPAD

> Working log of where we left off. Latest session on top.
> For stable repo context see [CLAUDE.md](./CLAUDE.md).

## ▶ Resume here

v2 multi-agent naming pipeline is shipped to prod but **dormant**
(env flag `NAMING_PIPELINE_V2` not set in Vercel → falls back to old
single-Claude path). To activate (in order):

1. Run migrations `005_search_poem_chunks_add_chunk_id.sql` +
   `006_chunk_text_trgm_and_by_chars.sql` in Supabase SQL editor.
2. Add `NAMING_PIPELINE_V2=true` to Vercel production env.
3. Redeploy.
4. Smoke-test on production: female 1995-08-12 12:00 Beijing should
   return 3 names grounded in real DB poems.

User agreed to ~24h soak observation on the new BaZi engine before
activating v2. Sentry + Vercel logs are the watch points.

---

## 2026-05-28 — Code-review × xhigh + UX hot-patches + production push

### What landed

- Ran `/code-review` at xhigh effort: 5 angles × 1-vote verify × sweep →
  15 ranked findings.
- Fixed all 15 + 2 UX bugs surfaced during localhost e2e:
  - `a60fa47` fix(naming): code-review hot-patches #1-#5
    (光→Fire, charSpan skip-whitelist, 调候∩avoid, Redis cache version,
    chunk_id Number coercion)
  - `f257ca0` fix(naming): code-review remaining patches #6-#15
    (rescue fallback surname, dedupe-best-wins, byIdx bounds,
    Balanced length parse, critic accept default, surname blacklist,
    finally writer.close, enrich-corpus orphan-heal, cleanup dry-run,
    title-fix author guard, from_common surname forwarding)
  - `79b2baa` fix(ui): brace-aware poem highlighting + hide empty
    translation (UX issues surfaced during e2e)
- Pushed all 21 local commits to `origin/main`. Vercel auto-deploy:
  ✅ Ready in 46s — https://harmony-name-2dgqx6iij-dan-dengs-projects.vercel.app
- Provisioned e2e test user `e2e-test@harmony.local` (10 + 3 = 13
  initial credits, 12 after one test run). Kept for future testing.
- Established SCRATCHPAD.md habit (this file) and global memory rule
  via `~/.claude/CLAUDE.md`.

### Production state (as of push)

- ✅ Live: new BaZi engine (true solar time + EoT + 调候 + 扶抑法),
  DestinyCard social card, character library + blacklists + gender
  positive bias, Redis `cache_v2` prefix.
- 🔘 Dormant: v2 multi-agent naming pipeline. Old single-Claude path
  still serving traffic.
- Stripe: TEST (per the standing "wait until 正式开卖" rule).
- Supabase migrations 005 + 006: NOT yet run in prod.

### Deferred (do not lose)

- [ ] Run 005 + 006 in prod Supabase (blocks v2 activation).
- [ ] Flip `NAMING_PIPELINE_V2=true` in Vercel prod + redeploy.
- [ ] ~24h soak observation on new BaZi engine before activating v2.
- [ ] Stripe TEST → Live (only when user says "正式开卖").
- [ ] AWS old deployment teardown (after Vercel stable, separate
  track — user wants step-by-step guide when ready).
- [ ] Browser smoke test on prod with the same 1995-08-12 hard case.

### Open questions for user

- None right now.

### Notes / context for next session

- E2e test on localhost (with v2 flag) produced: 周皎 / 周银 / 周堪 in
  92s, 1 credit deducted, all 3 grounded in real DB poems (陈子昂《酬
  殷上人秋夜山亭有赠》+ 王沂孙《眉妩》). Last 2 names came via the
  `rescueDeterministic` path — exactly the always-3 invariant we added
  in `#6` working in production.
- 864-chart sweep confirmed no `favourable ∩ avoid` overlap after the
  调候 fix (`#2`).
- `scripts/setup-e2e-user.ts` is gitignored (contains hardcoded test
  creds); file stays local for re-use.
