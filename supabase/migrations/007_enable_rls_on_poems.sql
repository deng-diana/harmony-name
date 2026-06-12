-- ============================================================
-- 007: 给 poems / poem_chunks 补上 RLS (安全加固)
-- ============================================================
-- 背景:
--   这两张表是最早的 001 迁移建的,那时还没引入 auth + RLS(RLS 从 002 才开始)。
--   于是它们一直【裸着】—— Supabase 的 Security Advisor 会报 ERROR:
--     "rls_disabled_in_public" (public schema 下的表未开 RLS)。
--
-- 为什么开 RLS 不会破坏检索管线?
--   全代码库里 poems / poem_chunks / search_poem_chunks / search_lines_by_chars
--   【只】通过 supabaseAdmin(service_role)访问(见 src/lib/retriever.ts)。
--   service_role 拥有 BYPASSRLS,天然绕过行级安全 → 检索照常工作。
--   而浏览器 anon key 从不直连这两张表(只碰 saved_names)。
--
-- 策略选择: 开 RLS,【故意不写任何 policy】。
--   等价于"对 anon / authenticated 直连一律拒绝,只有服务端(service_role)能读"。
--   这两张表是公共诗词参考数据,前端永远不该直连 → deny-by-default 最稳妥,
--   也正好让 Advisor 的 ERROR 清除(开了 RLS 即满足,无需放行策略)。
--
-- 执行: 复制到 Supabase SQL Editor → Run
-- ============================================================

alter table public.poems       enable row level security;
alter table public.poem_chunks enable row level security;

-- ============================================================
-- 验证(执行后可单独跑):
--   -- 1) 两张表应显示 rowsecurity = true
--   select relname, relrowsecurity
--   from pg_class
--   where relname in ('poems', 'poem_chunks');
--
--   -- 2) 应用侧不受影响:用 service_role 跑一次 RPC 仍能返回行
--   --    (在 Supabase SQL Editor 里默认就是高权限角色,可直接验证函数结构)
--   select chunk_id, poem_author
--   from search_lines_by_chars(array['清','明'], 3);
-- ============================================================
