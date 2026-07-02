-- ============================================================
-- 013: Public shareable result pages (the viral loop)
-- ============================================================
-- Adds a short public slug + a public flag to `generations`, so a single
-- result can be served at /n/<slug> to anonymous visitors (no auth). This is
-- the growth engine: a shared name is a landing page that sells the product.
--
-- SECURITY NOTE — READ BEFORE EDITING:
--   RLS is ROW-level, not column-level. The policy below exposes whole ROWS
--   where is_public = true to the `anon` role. The `input` column of those rows
--   still contains the bearer's BIRTH DATA (date/time/place/gender). RLS CANNOT
--   hide a single column, so we ALSO add a COLUMN-LEVEL grant (see bottom): anon
--   is granted SELECT on only the safe columns, so even a raw PostgREST query
--   (`select input from generations where is_public=true`) is rejected by the
--   database — page-level column selection is NOT the only guard.
--
--   Note the public-read policy targets `anon` ONLY (not `authenticated`). A
--   logged-in visitor would otherwise run as `authenticated`, and a policy that
--   lets `authenticated` read any is_public row would expose OTHER users' birth
--   data on their public rows (grants are per-role, not row-conditional). The
--   public page therefore reads with a cookieless pure-anon client so every
--   visitor — logged in or not — goes through the column-restricted anon path.
--
-- Run: copy into the Supabase SQL Editor -> Run
-- ============================================================

-- ------------------------------------------------------------
-- New columns
-- ------------------------------------------------------------
alter table public.generations
  add column if not exists public_slug text unique,
  add column if not exists is_public   boolean not null default true;

-- Backfill existing rows with a random 12-char slug (hex of a uuid, dashes
-- stripped). Only touches rows that don't have one yet, so it is re-runnable.
update public.generations
   set public_slug = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
 where public_slug is null;

-- Fast lookup by slug (the public page's only query key).
create index if not exists generations_public_slug_idx
  on public.generations (public_slug);

-- ------------------------------------------------------------
-- RLS: allow anon (ONLY) to SELECT public rows
-- ------------------------------------------------------------
-- RLS policies for the same command are OR'd together, so this ADDS public
-- read access on top of the existing "select own" policy without weakening it.
-- Scoped to `anon` ONLY on purpose: `authenticated` keeps just its "select own"
-- policy, so no logged-in user can read another user's birth data on a public
-- row. The public page reads via a cookieless pure-anon client (see
-- src/app/n/[slug]/page.tsx) so logged-in visitors still resolve public rows.
drop policy if exists "generations: select public" on public.generations;
create policy "generations: select public" on public.generations
  for select
  to anon
  using (is_public = true);

-- ------------------------------------------------------------
-- Column-level privileges: the COLUMN gate that RLS cannot provide
-- ------------------------------------------------------------
-- RLS is row-level; it cannot hide a single column. GRANT/REVOKE at the column
-- level is the column-level gate. We revoke anon's table-wide SELECT, then grant
-- SELECT on ONLY the non-sensitive columns. After this, no anon query can read
-- `input` (birth data) or `user_id` — the database rejects it regardless of what
-- the SELECT list or any PostgREST call asks for. Defense in depth on top of the
-- page's column selection.
revoke select on public.generations from anon;
grant  select (id, created_at, result, public_slug, is_public)
  on public.generations to anon;

-- Verify:
--   select count(*) from public.generations where public_slug is null;  -- 0
--   select public_slug, is_public from public.generations limit 5;
--   -- as anon, this must ERROR (permission denied for column input):
--   --   select input from public.generations where is_public = true limit 1;
