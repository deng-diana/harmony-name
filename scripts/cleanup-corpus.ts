/**
 * Corpus cleanup —— act on the 国学 expert review:
 * 1) DELETE 20 negative-imagery 婉约词 entries (人比黄花瘦/晓风残月/凋碧树/玉炉香红烛泪…)
 *    inserted by enrich-corpus.ts — they would surface unfit lines for a baby's name card.
 * 2) UPDATE 3 mis-attributed titles to the correct historical names.
 * Scoped strictly to source IN ('婉约精选','诗经精选') so we never touch upstream data.
 *
 * Run: export envs from .env.local, then `npx tsx scripts/cleanup-corpus.ts`.
 * No git commit. Reversible: re-run enrich-corpus.ts to re-insert (with corrected titles).
 */
import { supabaseAdmin } from "../src/lib/supabaseAdmin";

const SOURCES = ["婉约精选", "诗经精选"];

// 子串(独特、易匹配)→ 标题/标识。删除时按 title 含子串 + source 限定。
const DELETE_KEYS = [
  "醉花阴·薄雾", // 人比黄花瘦
  "如梦令·昨夜雨疏", // 应是绿肥红瘦
  "蝶恋花·伫倚危楼", // 为伊消得人憔悴
  "卜算子·缺月挂", // 拣尽寒枝…寂寞沙洲冷
  "西江月·世事一场", // 凄然北望
  "木兰花·拟古决绝词", // 何事秋风悲画扇
  "踏莎行·候馆梅残", // 寸寸柔肠盈盈粉泪
  "蝶恋花·槛菊愁烟", // 凋碧树
  "更漏子·玉炉香", // 红蜡泪
  "南乡子·细雨湿流光", // 芳草年年与恨长
  "浣溪沙·漠漠轻寒", // 无边丝雨细如愁
  "辛夷坞", // 涧户寂无人
  "浪淘沙·帘外雨潺潺", // 罗衾不耐五更寒
  "玉楼春·东城渐觉", // 晓寒轻 / 红杏闹 — 含"寒"
  "玉蝴蝶·望处雨收", // 断鸿声里立尽斜阳
  "暮江吟", // 一道残阳铺水中
  "采桑子·群芳过后", // 狼籍残红
  "浣溪沙·楼角初销", // 初销
  "雨霖铃·寒蝉凄切", // 晓风残月
  "浣溪沙·谁念西风", // 悼亡词,不宜用于新生儿命名
];

// 错题署纠正:title 子串 → 正名。
const TITLE_FIXES: { from: string; to: string }[] = [
  { from: "题瑶台月夜", to: "玉阶怨" }, // 李白《玉阶怨》
  { from: "苏堤春晓", to: "晓出净慈寺送林子方" }, // 杨万里(西湖六月中)
  { from: "题鹤林寺壁", to: "题鹤林寺僧舍" }, // 李涉
];

async function main() {
  console.log("=== 1) 删除 20 条负面意象诗词(含残/瘦/恨/愁/泪/凄等)===");
  let totalDeleted = 0;
  for (const key of DELETE_KEYS) {
    // 先查命中
    const { data: hits, error: qErr } = await supabaseAdmin
      .from("poems")
      .select("id, title, author")
      .in("source", SOURCES)
      .ilike("title", `%${key}%`);
    if (qErr) {
      console.error(`  ✗ 查询失败「${key}」:`, qErr.message);
      continue;
    }
    if (!hits || hits.length === 0) {
      console.log(`  · 未命中「${key}」(可能上轮就没插入,跳过)`);
      continue;
    }
    const ids = hits.map((h) => h.id);
    // chunks 由 FK cascade 自动删
    const { error: dErr } = await supabaseAdmin
      .from("poems")
      .delete()
      .in("id", ids);
    if (dErr) {
      console.error(`  ✗ 删除失败「${key}」:`, dErr.message);
      continue;
    }
    totalDeleted += hits.length;
    console.log(
      `  ✓ 删「${key}」x ${hits.length} (${hits.map((h) => `${h.title}/${h.author}`).join(", ")})`
    );
  }
  console.log(`  → 共删 ${totalDeleted} 首`);

  console.log("\n=== 2) 修正错题署 ===");
  for (const { from, to } of TITLE_FIXES) {
    const { data: hits, error: qErr } = await supabaseAdmin
      .from("poems")
      .select("id, title, author")
      .in("source", SOURCES)
      .ilike("title", `%${from}%`);
    if (qErr) {
      console.error(`  ✗ 查询失败「${from}」:`, qErr.message);
      continue;
    }
    if (!hits || hits.length === 0) {
      console.log(`  · 未命中「${from}」`);
      continue;
    }
    for (const h of hits) {
      const { error: uErr } = await supabaseAdmin
        .from("poems")
        .update({ title: to })
        .eq("id", h.id);
      if (uErr) console.error(`  ✗ 更新失败 #${h.id}:`, uErr.message);
      else console.log(`  ✓「${h.title}」→「${to}」(${h.author}, #${h.id})`);
    }
  }

  console.log("\n=== 3) 当前 enrich 来源总量 ===");
  for (const src of SOURCES) {
    const { count } = await supabaseAdmin
      .from("poems")
      .select("*", { count: "exact", head: true })
      .eq("source", src);
    console.log(`  ${src}: ${count ?? 0} 首`);
  }
}

main().catch((e) => {
  console.error("FATAL:", e instanceof Error ? e.message : e);
  process.exit(1);
});
