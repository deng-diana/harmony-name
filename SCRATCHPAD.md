# SCRATCHPAD

> Public working log — sanitized for the public repo. Latest session on top.
> Full personal state (resume pointer, deferred roadmap, soft state) lives
> in `SCRATCHPAD.local.md` (gitignored, local only).
> For stable repo context see [CLAUDE.md](./CLAUDE.md).

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
