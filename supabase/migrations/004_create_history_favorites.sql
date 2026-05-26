-- ============================================================
-- 004: 用户生成历史 + 收藏 (Phase 6.2)
-- ============================================================
-- generations : 每次成功生成的存档(给 Profile 的"历史"tab 用)
-- saved_names : 用户♥收藏的单个名字(给"收藏"tab 用)
-- 两表都开 RLS,用户只能读写【自己】的数据。
--
-- 执行: 复制到 Supabase SQL Editor → Run
-- ============================================================

-- ------------------------------------------------------------
-- 生成历史
-- ------------------------------------------------------------
create table if not exists public.generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  input       jsonb not null,   -- 出生信息 / 八字上下文快照(用于在历史里显示来龙去脉)
  result      jsonb not null,   -- { analysis, names: [...] } —— 当时生成的完整结果
  created_at  timestamptz not null default now()
);

create index if not exists generations_user_created_idx
  on public.generations (user_id, created_at desc);

alter table public.generations enable row level security;

-- 由 /api/generate 以"用户会话"身份在生成成功后写入(auth.uid() = 本人)
create policy "generations: select own" on public.generations
  for select using (auth.uid() = user_id);
create policy "generations: insert own" on public.generations
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- 收藏的名字
-- ------------------------------------------------------------
create table if not exists public.saved_names (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  hanzi       text not null,    -- 去重 + 列表展示用
  name_data   jsonb not null,   -- 单个 NameOption 的完整数据(含出处/解析)
  created_at  timestamptz not null default now()
);

-- 同一用户同一个名字只存一次
create unique index if not exists saved_names_user_hanzi_uniq
  on public.saved_names (user_id, hanzi);
create index if not exists saved_names_user_created_idx
  on public.saved_names (user_id, created_at desc);

alter table public.saved_names enable row level security;

-- 收藏由前端(浏览器, anon key)直接增删查 → 需要 select/insert/delete 三条策略
create policy "saved_names: select own" on public.saved_names
  for select using (auth.uid() = user_id);
create policy "saved_names: insert own" on public.saved_names
  for insert with check (auth.uid() = user_id);
create policy "saved_names: delete own" on public.saved_names
  for delete using (auth.uid() = user_id);

-- 验证:
--   select count(*) from public.generations;   -- 0(还没开始存)
--   select count(*) from public.saved_names;    -- 0
