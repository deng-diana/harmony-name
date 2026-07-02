-- ============================================================
-- 013: Public shareable result pages (the viral loop)
-- ============================================================
-- Adds a short public slug + a public flag to `generations`, so a single
-- result can be served at /n/<slug> to anonymous visitors (no auth). This is
-- the growth engine: a shared name is a landing page that sells the product.
--
-- SECURITY NOTE — READ BEFORE EDITING:
--   RLS is ROW-level, not column-level. The policy below exposes whole ROWS
--   where is_public = true to anon/authenticated. The `input` column of those
--   rows still contains the bearer's BIRTH DATA (date/time/place/gender). RLS
--   CANNOT hide a single column, so the *page* (src/app/n/[slug]/page.tsx) is
--   responsible for selecting ONLY safe columns (id, created_at, result,
--   public_slug) and NEVER rendering `input`. Do not `select *` on this table
--   from any public/anon code path.
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
-- RLS: allow anon + authenticated to SELECT public rows
-- ------------------------------------------------------------
-- RLS policies for the same command are OR'd together, so this ADDS public
-- read access on top of the existing "select own" policy without weakening it.
-- The `input` column is NOT column-protected here — see the SECURITY NOTE above:
-- the page decides which fields to render and must never surface birth data.
drop policy if exists "generations: select public" on public.generations;
create policy "generations: select public" on public.generations
  for select
  to anon, authenticated
  using (is_public = true);

-- Verify:
--   select count(*) from public.generations where public_slug is null;  -- 0
--   select public_slug, is_public from public.generations limit 5;
