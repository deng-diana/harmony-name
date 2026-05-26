-- ============================================================
-- 003: 修复 search_poem_chunks 函数签名歧义
-- ============================================================
-- 背景:
--   migration 001 建了 search_poem_chunks(query_embedding vector, ...)
--   scripts/add-fame-score.sql 又建了 search_poem_chunks(query_embedding text, ...)
--   两个同名函数并存 → 调 RPC 时 Postgres 报
--     "Could not choose the best candidate function ..."
--   导致 RAG 诗词检索【静默失败】,生成的名字缺少诗词出处加持(质量打折)。
--
-- 应用层 retriever.ts 传的是 JSON.stringify(向量) = text,所以:
--   保留 text 版,删掉 vector 版。
--
-- 执行: 复制到 Supabase SQL Editor → Run
-- ============================================================
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'search_poem_chunks'
      and pg_get_function_identity_arguments(p.oid) like '%vector%'
  loop
    execute 'drop function ' || fn.sig;
    raise notice 'dropped ambiguous function: %', fn.sig;
  end loop;
end $$;

-- 验证: 现在应只剩一个 search_poem_chunks(... text ...)
--   select p.oid::regprocedure
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname='public' and p.proname='search_poem_chunks';
