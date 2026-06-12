-- ============================================================
-- 009: Stripe webhook 幂等表(防重复发积分 = 防漏钱)
-- ============================================================
-- 背景:
--   Stripe 会对同一事件【重试】(网络抖动/我们响应慢)。旧逻辑用 Redis 去重,但
--   Upstash 是【可选】的 —— 没配 Redis 时幂等【完全失效】,每次重试都再 add_credits
--   一次 → 用户一笔付款拿到多份积分 = 直接漏钱。
--
--   改为【数据库持久去重】:event_id 作主键,首次插入成功才处理,冲突即"已处理"。
--   不依赖 Redis,断电重启也不丢,这是幂等该有的强度。
--
-- 执行: 复制到 Supabase SQL Editor → Run
-- ============================================================

create table if not exists public.stripe_processed_events (
  event_id     text primary key,            -- Stripe event.id,天然唯一
  processed_at timestamptz not null default now()
);

-- 只由 webhook(service_role)读写 → 开 RLS、不写 policy(deny-by-default,
-- service_role 绕过 RLS 照常工作;与 poems/poem_chunks 同样的安全姿势)。
alter table public.stripe_processed_events enable row level security;
