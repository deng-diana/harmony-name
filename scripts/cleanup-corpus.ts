/**
 * Corpus cleanup —— act on the 国学 expert review:
 * 1) DELETE 19 negative-imagery 婉约词 entries (人比黄花瘦/晓风残月/凋碧树/玉炉香红烛泪…)
 *    inserted by enrich-corpus.ts — they would surface unfit lines for a baby's name card.
 *    NOTE: 辛夷坞 was removed from this list — 王维 "涧户寂无人" is contemplative, NOT negative.
 * 2) UPDATE 3 mis-attributed titles to the correct historical names.
 * Scoped strictly to source IN ('婉约精选','诗经精选') so we never touch upstream data.
 *
 * SAFETY:
 *   ① 默认 DRY-RUN(只打印将要做什么,不执行)。加 `--apply` 才真执行删除/更新。
 *   ② TITLE_FIXES 多了 author 守卫:若数据库里命中的 author 与预期不符 → 跳过(不乱改)。
 *   ③ 单条 DELETE_KEY 命中超过 SAFETY_LIMIT 行 → 跳过 + 报警(防 ilike '%xxx%' 误伤未来数据)。
 *
 * Run: export envs from .env.local, then:
 *   npx tsx scripts/cleanup-corpus.ts            # DRY-RUN(强烈推荐先看)
 *   npx tsx scripts/cleanup-corpus.ts --apply    # 真执行
 */
import { supabaseAdmin } from "../src/lib/supabaseAdmin";

const APPLY = process.argv.includes("--apply");
const SOURCES = ["婉约精选", "诗经精选"];
// 单条 DELETE_KEY 命中超过此数 → 跳过 + 报警。防 ilike '%xx%' 子串误伤大批未来数据。
const SAFETY_LIMIT = 3;

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
  // 辛夷坞 已移除:王维《辛夷坞》"涧户寂无人,纷纷开且落"乃静观禅意,非负面意象。
  "浪淘沙·帘外雨潺潺", // 罗衾不耐五更寒
  "玉楼春·东城渐觉", // 晓寒轻 / 红杏闹 — 含"寒"
  "玉蝴蝶·望处雨收", // 断鸿声里立尽斜阳
  "暮江吟", // 一道残阳铺水中
  "采桑子·群芳过后", // 狼籍残红
  "浣溪沙·楼角初销", // 初销
  "雨霖铃·寒蝉凄切", // 晓风残月
  "浣溪沙·谁念西风", // 悼亡词,不宜用于新生儿命名
];

// 错题署纠正:title 子串 → {正名, 必须的 author}。
// `expectedAuthor` 守卫:仅当 DB 里 author 匹配时才更新 —— 防止未来加入的"同名不同作者"
// 诗作被乱改。子串匹配 + 作者匹配双保险。
const TITLE_FIXES: { from: string; to: string; expectedAuthor: string }[] = [
  { from: "题瑶台月夜", to: "玉阶怨", expectedAuthor: "李白" },
  { from: "苏堤春晓", to: "晓出净慈寺送林子方", expectedAuthor: "杨万里" },
  { from: "题鹤林寺壁", to: "题鹤林寺僧舍", expectedAuthor: "李涉" },
];

async function main() {
  console.log("=".repeat(60));
  console.log(APPLY ? "MODE: --apply (将真执行删除/更新)" : "MODE: DRY-RUN (默认,只打印不执行;加 --apply 真执行)");
  console.log("=".repeat(60));

  console.log("\n=== 1) 删除负面意象诗词(残/瘦/恨/愁/泪/凄等) ===");
  let totalDeleted = 0;
  for (const key of DELETE_KEYS) {
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
    // 安全:超过阈值就跳过 + 报警。防 ilike '%xxx%' 子串误伤将来加入的同前缀诗作。
    if (hits.length > SAFETY_LIMIT) {
      console.warn(
        `  ⚠ 跳过「${key}」—— 命中 ${hits.length} 条 > SAFETY_LIMIT(${SAFETY_LIMIT}),` +
          `怀疑子串误伤。命中: ${hits.map((h) => `${h.title}/${h.author}`).join(", ")}`
      );
      continue;
    }
    if (!APPLY) {
      console.log(
        `  [dry] 将删「${key}」x ${hits.length} (${hits.map((h) => `${h.title}/${h.author}`).join(", ")})`
      );
      totalDeleted += hits.length;
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
  console.log(`  → 共${APPLY ? "删" : "拟删"} ${totalDeleted} 首`);

  console.log("\n=== 2) 修正错题署(author 守卫:仅匹配指定作者才更新)===");
  for (const { from, to, expectedAuthor } of TITLE_FIXES) {
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
      // 守卫:作者不符则跳过,防止"同名不同作者"被乱改。
      if (h.author !== expectedAuthor) {
        console.warn(
          `  ⚠ 跳过 #${h.id}「${h.title}」—— author=${h.author} ≠ 预期 ${expectedAuthor}`
        );
        continue;
      }
      if (!APPLY) {
        console.log(`  [dry] 将改「${h.title}」→「${to}」(${h.author}, #${h.id})`);
        continue;
      }
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
