-- ============================================================
-- Harmony Name - 用户档案 + 积分系统 (Phase 2)
-- ============================================================
-- 这个 migration 做四件事:
--   1. 建 profiles 表 (每个登录用户一行,存积分余额)
--   2. 开启 RLS,只允许用户读自己的档案 (改余额的权限不给前端)
--   3. 注册时自动建档触发器 (新用户落地即送 3 个免费积分)
--   4. 两个 RPC: deduct_credit (原子扣分) / add_credits (充值,仅后端)
--
-- 执行方式: 复制全部内容 → Supabase 后台 SQL Editor → Run
-- ============================================================


-- ------------------------------------------------------------
-- Step 1: profiles 表
-- ------------------------------------------------------------
-- id 直接引用 auth.users(id) —— Supabase 的用户主表。
-- on delete cascade: 用户被删时,档案自动删,不留垃圾数据。
-- credits 加 check (>= 0): 数据库层兜底,永远不会出现负积分。
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  credits     integer not null default 3 check (credits >= 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- ------------------------------------------------------------
-- Step 2: 开启 RLS (Row Level Security) —— 安全的命门
-- ------------------------------------------------------------
-- 开启后,默认"全部拒绝",必须显式写策略才放行。
alter table public.profiles enable row level security;

-- 唯一的策略: 用户只能 SELECT 自己那一行 (auth.uid() = 当前登录用户的 id)。
-- 注意: 我们【故意不写】任何 INSERT/UPDATE/DELETE 策略。
-- 这意味着拿着浏览器 anon key 的前端【永远改不了 credits】——
-- 改余额只能走下面的 RPC(以 service/definer 身份),无法被用户伪造。
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = id);


-- ------------------------------------------------------------
-- Step 3: 注册自动建档触发器
-- ------------------------------------------------------------
-- 新用户在 auth.users 插入成功后,自动在 profiles 建一行并送 3 积分。
-- security definer: 函数以创建者(postgres)身份运行,从而能绕过 RLS 写入。
-- set search_path = '': Supabase 安全最佳实践,防 search_path 注入,
--   所以下面所有表名都写全限定的 public.xxx。
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, credits)
  values (new.id, new.email, 3);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ------------------------------------------------------------
-- Step 4a: deduct_credit() —— 原子扣 1 分
-- ------------------------------------------------------------
-- 为什么不能在 JS 里"读余额→减1→写回"?
--   并发两次请求会同时读到 credits=1,各自减 1,导致"双花"。
-- 正解: 一条 UPDATE 原子完成,数据库行锁天然防并发。
--   where credits > 0 保证只在有余额时才扣;扣不到(余额 0 或无档案)
--   则 returning 为 null → 抛出 INSUFFICIENT_CREDITS,后端据此拦截。
create or replace function public.deduct_credit()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  remaining integer;
begin
  update public.profiles
     set credits = credits - 1,
         updated_at = now()
   where id = auth.uid()      -- 只能扣"自己"的,身份来自 JWT,无法伪造
     and credits > 0
  returning credits into remaining;

  if remaining is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return remaining;           -- 返回扣减后的余额
end;
$$;

-- 权限: 只允许登录用户调用,其余一律收回。
revoke all on function public.deduct_credit() from public;
grant execute on function public.deduct_credit() to authenticated;


-- ------------------------------------------------------------
-- Step 4b: add_credits() —— 充值(给指定用户加积分)
-- ------------------------------------------------------------
-- 这个会在 Phase 4 被 Stripe 的 webhook 调用(后端、无用户会话),
-- 所以它接收显式的 user_id 参数,而不是 auth.uid()。
-- ⚠️ 安全关键: 绝不能让普通用户调用它(否则可以自己给自己充值)。
--   因此下面【只授权给 service_role】,authenticated/anon 都禁止。
create or replace function public.add_credits(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles
     set credits = credits + p_amount,
         updated_at = now()
   where id = p_user_id
  returning credits into new_balance;

  return new_balance;
end;
$$;

revoke all on function public.add_credits(uuid, integer) from public;
grant execute on function public.add_credits(uuid, integer) to service_role;


-- ------------------------------------------------------------
-- Step 5: 回填已有用户
-- ------------------------------------------------------------
-- 触发器只对"将来"的注册生效。在它存在之前注册的用户(我们的测试号)
-- 还没有档案,这里补上,送同样的 3 积分。
insert into public.profiles (id, email, credits)
select id, email, 3
from auth.users
on conflict (id) do nothing;


-- ============================================================
-- 验证 (执行后可单独跑这几句看结果):
--   select id, email, credits from public.profiles;        -- 应看到测试用户, credits=3
--   select public.add_credits('<某用户id>', 5);            -- 余额 3→8 (service_role 身份)
-- deduct_credit() 依赖 auth.uid(),在 SQL Editor 里没有 JWT 会扣不到,
-- 真正的扣分会在 Phase 3 由 API 带着用户会话来测。
-- ============================================================
