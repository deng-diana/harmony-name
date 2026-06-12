import { Solar } from "lunar-javascript";

export const SHICHEN_MAPPING = [
  { label: "Unknown (not sure)", value: "unknown" },
  { label: "23:00 - 01:00 (Rat/子时)", value: "00:00" },
  { label: "01:00 - 03:00 (Ox/丑时)", value: "02:00" },
  { label: "03:00 - 05:00 (Tiger/寅时)", value: "04:00" },
  { label: "05:00 - 07:00 (Rabbit/卯时)", value: "06:00" },
  { label: "07:00 - 09:00 (Dragon/辰时)", value: "08:00" },
  { label: "09:00 - 11:00 (Snake/巳时)", value: "10:00" },
  { label: "11:00 - 13:00 (Horse/午时)", value: "12:00" },
  { label: "13:00 - 15:00 (Goat/未时)", value: "14:00" },
  { label: "15:00 - 17:00 (Monkey/申时)", value: "16:00" },
  { label: "17:00 - 19:00 (Rooster/酉时)", value: "18:00" },
  { label: "19:00 - 21:00 (Dog/戌时)", value: "20:00" },
  { label: "21:00 - 23:00 (Pig/亥时)", value: "22:00" },
];

export const GAN_WUXING: Record<string, string> = {
  甲: "Wood",
  乙: "Wood",
  丙: "Fire",
  丁: "Fire",
  戊: "Earth",
  己: "Earth",
  庚: "Metal",
  辛: "Metal",
  壬: "Water",
  癸: "Water",
};

const ZHI_WUXING: Record<string, string> = {
  子: "Water",
  亥: "Water",
  寅: "Wood",
  卯: "Wood",
  巳: "Fire",
  午: "Fire",
  申: "Metal",
  酉: "Metal",
  辰: "Earth",
  戌: "Earth",
  丑: "Earth",
  未: "Earth",
};

// 地支藏干(本气, 中气, 余气)。每个地支其实"藏"着 1~3 个天干,
// 例如 寅 藏 甲(木)丙(火)戊(土) —— 只按本气把寅当纯木,五行统计就失真。
// 旺衰/喜用神必须计入藏干才专业。表与 lunar-javascript 内置 ZHI_HIDE_GAN 一致。
export const ZHI_HIDE_GAN: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "庚", "戊"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

// 藏干权重:本气 1.0、中气 0.5、余气 0.3(主流取值,集中在常量便于调参)。
const HIDE_GAN_WEIGHTS = [1.0, 0.5, 0.3];

const MONTH_ZHI_SEASON: Record<string, string> = {
  寅: "Spring",
  卯: "Spring",
  辰: "Spring",
  巳: "Summer",
  午: "Summer",
  未: "Summer",
  申: "Autumn",
  酉: "Autumn",
  戌: "Autumn",
  亥: "Winter",
  子: "Winter",
  丑: "Winter",
};

// 五行生克有向图:每个元素对应 我生(generate)/生我(generatedBy)/我克(control)/克我(controlledBy)。
// 导出供 compatibility.ts 复用(五行人际相性建模),单一真相来源,不重复维护。
export const RELATIONSHIPS = {
  Wood: {
    generate: "Fire",
    generatedBy: "Water",
    control: "Earth",
    controlledBy: "Metal",
  },
  Fire: {
    generate: "Earth",
    generatedBy: "Wood",
    control: "Metal",
    controlledBy: "Water",
  },
  Earth: {
    generate: "Metal",
    generatedBy: "Fire",
    control: "Water",
    controlledBy: "Wood",
  },
  Metal: {
    generate: "Water",
    generatedBy: "Earth",
    control: "Wood",
    controlledBy: "Fire",
  },
  Water: {
    generate: "Wood",
    generatedBy: "Metal",
    control: "Fire",
    controlledBy: "Earth",
  },
};

export const ARCHETYPES = {
  Wood: {
    title: "The Resilient Pine",
    subtitle: "The Wood Archetype",
    desc: "Like a tree reaching for the sky, you possess an innate drive for growth and expansion. Your spirit is resilient, creative, and deeply compassionate.",
  },
  Fire: {
    title: "The Radiant Flame",
    subtitle: "The Fire Archetype",
    desc: "You carry the warmth of the sun. Your presence is illuminating, energetic, and charismatic. You naturally inspire others with your vision and passion.",
  },
  Earth: {
    title: "The Nurturing Mountain",
    subtitle: "The Earth Archetype",
    desc: "You are the grounding force. Like the earth itself, you are reliable, steady, and deeply trustworthy. Others find safety and stability in your presence.",
  },
  Metal: {
    title: "The Refined Sword",
    subtitle: "The Metal Archetype",
    desc: "You possess a sharp mind and a strong sense of justice. Like refined gold, you value structure, clarity, and excellence in all endeavors.",
  },
  Water: {
    title: "The Flowing River",
    subtitle: "The Water Archetype",
    desc: "Like water, you are flexible yet powerful. You possess deep wisdom and intuition, capable of navigating around any obstacle with grace.",
  },
};

export interface ExplanationPoint {
  label: string;
  content: string;
}

export interface BaziResult {
  solarDate: string;
  bazi: { year: string; month: string; day: string; hour: string };
  wuxing: {
    gold: number;
    wood: number;
    water: number;
    fire: number;
    earth: number;
  };
  // 内部用:藏干加权的五行分布(更专业,驱动旺衰判断)。不在 UI 展示。
  wuxingWeighted?: {
    gold: number;
    wood: number;
    water: number;
    fire: number;
    earth: number;
  };
  // 内部用:各柱地支藏干(按 year/month/day/hour 归类)。
  hiddenStems?: Record<string, string[]>;
  dayMaster: string;
  strength: string;
  favourableElements: string[];
  avoidElements: string[];
  isTimeUnknown: boolean;
  coreExplanation: {
    title: string;
    points: ExplanationPoint[];
  };
  recommendedNameLength: string;
}

function generateExplanationPoints(
  dayMaster: string,
  strength: string,
  monthZhi: string,
  favourable: string[],
  avoid: string[]
): ExplanationPoint[] {
  const season = MONTH_ZHI_SEASON[monthZhi];
  const favStr = favourable.slice(0, 2).join(" & ");
  const avoidStr = avoid.slice(0, 2).join(" & ");

  let seasonText = "";
  if (strength === "Weak") {
    seasonText = `Born in ${season}, your ${dayMaster} energy is naturally quiet and recovering.`;
  } else if (strength === "Strong") {
    seasonText = `Born in ${season}, your ${dayMaster} energy is at its seasonal peak and very robust.`;
  } else {
    seasonText = `Born in ${season}, your ${dayMaster} energy is steady and well-supported.`;
  }

  let guideText = "";
  if (strength === "Weak") {
    guideText = `Your core is Weak. To thrive, prioritize ${favStr} (Support) for strength, and be mindful of draining ${avoidStr} (Excess) energy.`;
  } else if (strength === "Strong") {
    guideText = `Your core is Strong. To thrive, use ${favStr} (Flow) to express your power, and avoid adding more ${avoidStr} (Excess).`;
  } else {
    guideText = `Your core is Balanced. Maintain this harmony by embracing ${favStr} (Flow) and avoiding extremes of ${
      avoidStr || "any single element"
    }.`;
  }

  return [
    { label: "Seasonal Energy", content: seasonText },
    { label: "Strategic Guide", content: guideText },
  ];
}

// 扶抑法判旺衰:得令(月令 ~50) + 得地(通根/藏干 ~30) + 得势(透干 ~20) → 0~100。
// 取代旧的"季节分 + 简单计数",计入地支藏干,是命理主流做法。
// 注:这是「扶抑」一派;调候/从格 等极端命盘留作后续增强(见计划)。
// 阈值(扶抑 ratio):命理"克泄耗"3 类、"生扶"仅 2 类,中性点天然偏低。
// P2 校准:日干不计帮扶 + 透干增强后,中性点下移到约 0.30。阈值据此调宽 Balanced 带。
const STRONG_THRESHOLD = 0.45;
const WEAK_THRESHOLD = 0.3;
// 透干 (transparent stem):藏干在天干上同时出现 → 该藏干力量显著放大,命理判旺衰要点。
const TRANSPARENT_BOOST = 1.5;

// 地支六冲(相冲损力)。
const ZHI_CHONG: Record<string, string> = {
  子: "午", 午: "子", 丑: "未", 未: "丑", 寅: "申", 申: "寅",
  卯: "酉", 酉: "卯", 辰: "戌", 戌: "辰", 巳: "亥", 亥: "巳",
};
// 三会方(力量最强,方局)。
const ZHI_HUI: [string[], string][] = [
  [["寅", "卯", "辰"], "Wood"],
  [["巳", "午", "未"], "Fire"],
  [["申", "酉", "戌"], "Metal"],
  [["亥", "子", "丑"], "Water"],
];
// 三合局(次于会方)。
const ZHI_HE: [string[], string][] = [
  [["申", "子", "辰"], "Water"],
  [["亥", "卯", "未"], "Wood"],
  [["寅", "午", "戌"], "Fire"],
  [["巳", "酉", "丑"], "Metal"],
];

function analyzeStrength(
  dayMaster: string,
  dayGan: string, // 日干本身 —— 不计入帮扶但参与透干检测
  monthZhi: string,
  otherGans: string[], // 除日干外的天干(年/月/[时])
  zhis: string[] // 四(或三)地支,顺序 年/月/日[/时]
) {
  const relations = RELATIONSHIPS[dayMaster as keyof typeof RELATIONSHIPS];
  // 生扶 = 印(生我) 或 比劫(同我);其余(官杀/食伤/财)= 克泄耗。
  const isSupport = (el: string) =>
    el === dayMaster || el === relations.generatedBy;

  // 扶抑法:比「生扶」与「克泄耗」的加权力量。三要素融于其中:
  //   得令 → 月支(index 1)藏干额外加权 ×3(月令权力最大);
  //   得地 → 其余地支藏干(通根);   得势 → 天干(不含日干本身);
  //   透干 → 藏干若在天干(含日干)上同现 → 该藏干 ×1.5。
  const transparentSet = new Set([dayGan, ...otherGans]);
  let support = 0;
  let drain = 0;
  // per-element 累计权重 —— 供"三合/三会局"加权 + "从格"判定最旺一行用。
  const elemWeight: Record<string, number> = {
    Wood: 0, Fire: 0, Earth: 0, Metal: 0, Water: 0,
  };
  const tally = (el: string, w: number) => {
    if (el in elemWeight) elemWeight[el] += w;
    if (isSupport(el)) support += w;
    else drain += w;
  };

  // 月支六冲:月令被邻支冲损 → 月令乘数 3→2(冲坏的月令不该再拿满权)。
  const monthChonged = zhis.some((z, i) => i !== 1 && ZHI_CHONG[monthZhi] === z);
  const monthMult = monthChonged ? 2 : 3;

  otherGans.forEach((g) => tally(GAN_WUXING[g], 1));
  zhis.forEach((z, i) => {
    const mult = i === 1 ? monthMult : 1; // 月支 = 月令,加权(被冲则减半档)
    (ZHI_HIDE_GAN[z] || []).forEach((hg, idx) => {
      let w = (HIDE_GAN_WEIGHTS[idx] ?? 0.3) * mult;
      if (transparentSet.has(hg)) w *= TRANSPARENT_BOOST;
      tally(GAN_WUXING[hg], w);
    });
  });

  // 三合局 / 三会方:三支齐 → 该五行成势,力量超逐支累加,补一笔加权(会方 > 三合)。
  // 注:三支本气已各自计入,故加权取保守值,避免把本是 Balanced 的盘单凭组合推过 Strong 线。
  const zhiSet = new Set(zhis);
  for (const [grp, el] of ZHI_HUI) if (grp.every((z) => zhiSet.has(z))) tally(el, 2.0);
  for (const [grp, el] of ZHI_HE) if (grp.every((z) => zhiSet.has(z))) tally(el, 1.5);

  const ratio = support / (support + drain || 1); // 0~1
  // 通根:日主五行是否为任一地支的【本气】(藏干首位)—— 从格判定的关键。
  const hasRoot = zhis.some(
    (z) => GAN_WUXING[(ZHI_HIDE_GAN[z] || [])[0]] === dayMaster
  );

  let strength = "Balanced";
  // 名字字数【不由旺衰决定】—— 字数属姓名学/三才五格,与八字喜用神是两套体系,
  // 旧逻辑(身强→2字)无子平依据,且是"名字有时只有2个字"的来源。统一推荐 3 字名
  // (姓+2):双字名意象空间更大、更耐品、更有诗意;2 字名仅在候选池稀疏时由兜底产生。
  const nameLength = "3 characters (Surname + 2 Names)";
  if (ratio >= STRONG_THRESHOLD) {
    strength = "Strong";
  } else if (ratio < WEAK_THRESHOLD) {
    strength = "Weak";
  }

  let favourable: string[] = [];
  let avoid: string[] = [];

  // 从弱/从势格(命理 #1 增强):日主【极弱(ratio<0.12)且无本气通根】时,扶抑法会判
  // Weak 且喜印比 —— 但从格的喜忌【与扶抑相反】:不可逆其大势,当顺势喜克泄耗、忌印比。
  // 旧逻辑对这类(约 3-8% 极端盘)会给出【完全反向】的喜忌(取名用字五行整反)。
  // 安全处理:不激进翻转(误判风险),而是顺势取克泄耗为喜、avoid 留空(等同 Balanced 的
  // 软处理)—— 既消除"被迫印比"的硬错,又不破坏 favourable∩avoid=∅ 等不变量。
  const isFollowWeak = ratio < 0.12 && !hasRoot;
  if (isFollowWeak) {
    strength = "Balanced"; // 对外标签软化(schema 仅 Weak/Strong/Balanced;从格归 Balanced 软处理)
    favourable = [
      relations.controlledBy, // 官杀
      relations.generate, // 食伤(泄秀)
      relations.control, // 财
    ];
    avoid = [];
  } else if (strength === "Weak") {
    favourable = [relations.generatedBy, dayMaster];
    avoid = [relations.controlledBy, relations.generate, relations.control];
  } else if (strength === "Strong") {
    favourable = [
      relations.controlledBy,
      relations.generate,
      relations.control,
    ];
    avoid = [relations.generatedBy, dayMaster];
  } else {
    favourable = [relations.generate, relations.control];
    avoid = [];
  }

  // 调候(climatic adjustment, 命理 #1 增强):在扶抑之上叠加气候平衡之神。
  // 主流口径(《穷通宝鉴》):
  //   冬令(亥子丑)寒 → 五日主皆喜【火】解寒;
  //   夏令(巳午未)炎 → 木/土/火/水 喜【水】润;但「夏水须金」(壬癸 met 庚辛为源);
  //   寅月余寒(P2 增强)→ 立春后仍未真暖,五日主皆喜【火】解寒,与冬月同口径。
  // 冲突解决:调候 > 扶抑(对该元素而言)。Strong 日主在匹配季节下,boost 元素可能与
  // 扶抑得出的 avoid 重叠(如 Strong 壬日午月:扶抑 avoid=[Metal,Water],调候 boost=Metal)。
  // 此时把 boost 从 avoid 移出 + 推入 favourable,绝不让同一元素既喜又忌(verify.ts 硬拦忌
  // 神字会自相矛盾地枪毙所有 Metal 候选)。月支特定 key 优先于季节 key(寅月走特定)。
  const season = MONTH_ZHI_SEASON[monthZhi];
  const CLIMATIC_BOOST: Record<string, string> = {
    // 月支特定:寅月余寒 —— 高于季节级,五日主全覆盖
    Wood_寅: "Fire",
    Fire_寅: "Fire",
    Earth_寅: "Fire",
    Metal_寅: "Fire",
    Water_寅: "Fire",
    // 冬令(亥子丑)→ 喜火解寒(覆盖五日主)
    Fire_Winter: "Fire",
    Wood_Winter: "Fire",
    Water_Winter: "Fire", // 寒水须火,《穷通宝鉴》入门口诀
    Earth_Winter: "Fire", // 冻土须火解
    Metal_Winter: "Fire", // 寒金喜火暖
    // 夏令(巳午未)→ 喜水润;水日主例外,以金为源
    Fire_Summer: "Water", // 炎上须水既济
    Wood_Summer: "Water",
    Earth_Summer: "Water",
    Metal_Summer: "Water",
    Water_Summer: "Metal", // 夏水须金,而非以水救水(纠正)
  };
  // 月支特定优先于季节级
  const boost =
    CLIMATIC_BOOST[`${dayMaster}_${monthZhi}`] ??
    CLIMATIC_BOOST[`${dayMaster}_${season}`];
  if (boost) {
    // 旺衰方向守卫(修复:旧逻辑无条件翻转,会把忌神当喜神)。
    //   boost 属"生扶"(印 generatedBy / 比 dayMaster):只该补给【身弱/平衡】,身强补印比=火上浇油。
    //   boost 属"克泄耗"(官杀/食伤/财):只该用于【身强/平衡】,身弱再泄=雪上加霜。
    // 与当前旺衰冲突时,调候【降级保留】而非整个丢弃(命理 #1 增强):古法"调候为急"——
    //   冬月身弱木/金(寒木向阳、寒金喜火),火虽是克泄耗,也须见一点暖。旧逻辑直接丢弃,
    //   清一色水木缺点睛暖字。改为:不冲突→进 favourable 首位(调候优先);冲突→不进 avoid,
    //   但 push 到 favourable【末位】(次要之喜),既不自相矛盾(verify 忌神硬拦),又留住暖字。
    const boostIsSupport = boost === dayMaster || boost === relations.generatedBy;
    // 从弱盘【忌印比是铁律】,顺势而行,暖字不值得破——故 isFollowWeak 时把"生扶类调候"
    // 也视为冲突(且对它连末位都不放,见下)。否则夏水从弱(boost=Metal=印)会被顶到首位,
    // 与从弱立意整反(评审 2026-06-12 标出)。
    const conflict =
      (boostIsSupport && (strength === "Strong" || isFollowWeak)) ||
      (!boostIsSupport && strength === "Weak");
    const idx = avoid.indexOf(boost);
    if (idx !== -1) avoid.splice(idx, 1); // 任何情况下,调候之神都不该再当忌神
    if (!favourable.includes(boost)) {
      if (isFollowWeak && boostIsSupport) {
        // 从弱遇生扶类调候:印比绝不入喜用,连末位都不放(顺势铁律)。
      } else if (conflict) {
        favourable.push(boost); // 冲突:降级到末位(次要之喜)
      } else {
        favourable.unshift(boost); // 不冲突:调候优先,顶到首位
      }
    }
  }

  const favClean = [...new Set(favourable)].filter(Boolean);
  const avoidClean = [...new Set(avoid)].filter(Boolean);

  const points = generateExplanationPoints(
    dayMaster,
    strength,
    monthZhi,
    favClean,
    avoidClean
  );

  return {
    strength,
    favourable: favClean,
    avoid: avoidClean,
    explanationPoints: points,
    recommendedNameLength: nameLength,
  };
}

// 时区偏移(分钟,东正西负)。用 Intl 稳健计算,与运行环境的本地时区无关。
export function getTimezoneOffsetMinutes(timeZone: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const map: Record<string, number> = {};
    for (const p of dtf.formatToParts(at)) {
      if (p.type !== "literal") map[p.type] = Number(p.value);
    }
    // 某些环境午夜会给出 "24",归一到 0
    const hour = map.hour === 24 ? 0 : map.hour;
    const asUTC = Date.UTC(
      map.year,
      map.month - 1,
      map.day,
      hour,
      map.minute,
      map.second
    );
    return Math.round((asUTC - at.getTime()) / 60000);
  } catch {
    return 0; // 时区无效 → 退化为 0
  }
}

// 均时差 (Equation of Time):真太阳时与平太阳时之差,随日期在约 −14 ~ +16 分钟间变化。
// 成因:地球椭圆轨道 + 黄赤交角。用 Spencer/NOAA 简化式(精度 ±2~3 分钟,远小于一个时辰 120 分钟)。
// 旧代码只做了经度校正、漏了均时差 —— 这是接近时辰边界时算错时柱的根因之一。
export function equationOfTimeMinutes(
  year: number,
  month: number,
  day: number
): number {
  // 当年第几天 N(1..365/366)
  const N = Math.floor(
    (Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / 86400000
  );
  const B = ((360 * (N - 81)) / 364) * (Math.PI / 180); // 角度→弧度
  return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
}

// 🧠 核心:真太阳时 (Local Apparent Solar Time) —— 用于定"日柱 + 时柱"。
// 中国全境统一用北京时(东经 120°)。真太阳时 = 北京墙钟 + 经度时差 + 均时差。
//   经度时差 = (当地经度 − 120) × 4 分钟;   均时差见 equationOfTimeMinutes。
// 返回校正后的"真太阳墙钟"{年月日时分},可能跨越子夜 —— 那正是判定早/晚子时归哪天的依据。
function trueSolarWallClock(
  bj: { year: number; month: number; day: number; hour: number; minute: number },
  longitude: number
): { year: number; month: number; day: number; hour: number; minute: number } {
  const eot = equationOfTimeMinutes(bj.year, bj.month, bj.day);
  const correctionMin = (longitude - 120) * 4 + eot;
  const bjMs = Date.UTC(bj.year, bj.month - 1, bj.day, bj.hour, bj.minute, 0);
  const ts = new Date(bjMs + correctionMin * 60000);
  return {
    year: ts.getUTCFullYear(),
    month: ts.getUTCMonth() + 1,
    day: ts.getUTCDate(),
    hour: ts.getUTCHours(),
    minute: ts.getUTCMinutes(),
  };
}

// 🧠 核心:把"出生地墙上时间"换算成"北京时间(UTC+8)墙上时间",用于按节气定年/月柱。
// 全程用 UTC 时间戳运算,【不受服务器本地时区影响】(修复旧 getBeijingDate 的 hack)。
//   北京墙钟 = 出生瞬间(UTC) + 8h
//   出生瞬间(UTC) = (把出生墙钟当作 UTC) − 出生地时区偏移
export function getBeijingWallClock(
  dateString: string,
  hour: number,
  timezone: string,
  minute: number = 0 // 默认 0 保持 UI(时辰中点 HH:00)现状;API/MCP 直传 HH:MM 时补齐精度
): { year: number; month: number; day: number; hour: number; minute: number } {
  const [y, mo, d] = dateString.split("-").map(Number);
  const wallAsUTC = Date.UTC(y, (mo || 1) - 1, d || 1, hour, minute, 0);
  const offsetMin = getTimezoneOffsetMinutes(timezone, new Date(wallAsUTC));
  const utcInstant = wallAsUTC - offsetMin * 60000;
  const beijing = new Date(utcInstant + 480 * 60000); // +8h
  return {
    year: beijing.getUTCFullYear(),
    month: beijing.getUTCMonth() + 1,
    day: beijing.getUTCDate(),
    hour: beijing.getUTCHours(),
    minute: beijing.getUTCMinutes(),
  };
}

// lunar-javascript 默认 sect=2(晚子时 23:00–24:00 归当日,主流惯例),但其类型未声明 setSect。
// 显式锁定 sect 2,以防库默认值变更;用可选调用保证类型安全。
function pinSect2(ec: unknown): void {
  (ec as { setSect?: (n: number) => void }).setSect?.(2);
}

export function calculateBazi(
  dateString: string,
  timeString: string,
  city?: { longitude: number; timezone: string }
): BaziResult {
  // 安全地解析时间字符串
  // 处理 "unknown"、空值、以及无效格式的情况
  let isUnknown = timeString === "unknown" || !timeString;
  let hour = 12; // 默认值

  let minute = 0; // 出生分钟:UI 走时辰中点(HH:00)→ 0;API/MCP 直传 HH:MM 时取真值,补真太阳时精度
  if (!isUnknown && timeString.trim()) {
    // 验证时间格式：应该是 "HH:MM" 或 "HH:mm" 格式
    const timeMatch = timeString.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const parsedHour = parseInt(timeMatch[1], 10);
      const parsedMin = parseInt(timeMatch[2], 10);
      // 确保解析出的小时数是有效数字且在合理范围内 (0-23)
      // 注意：parseInt 对于数字字符串不会返回 NaN，但保留检查作为防御性编程
      if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
        hour = parsedHour;
        if (parsedMin >= 0 && parsedMin <= 59) minute = parsedMin;
      } else {
        // 如果解析失败或超出范围，当作 unknown 处理
        isUnknown = true;
        hour = 12; // 确保 hour 有有效值
      }
    } else {
      // 如果格式不匹配，当作 unknown 处理
      isUnknown = true;
      hour = 12; // 确保 hour 有有效值
    }
  }

  // --- 1. 排四柱 ---
  // 主流(寿星万年历)惯例:
  //   年柱/月柱 —— 按节气,用"北京时间"(lunar-javascript 的节气基于北京时)。
  //   日柱/时柱 —— 按"真太阳时"(出生地经度 + 均时差校正)。
  // 无城市/时辰未知时退回朴素本地解析(不做真太阳时校正)。
  const [fy, fmo, fd] = dateString.split("-").map(Number);

  let yearGan: string,
    yearZhi: string,
    monthGan: string,
    monthZhi: string,
    dayGan: string,
    dayZhi: string;
  let timeGan = "";
  let timeZhi = "";

  if (city && !isUnknown) {
    // 北京墙钟 → 年/月柱(节气)
    const bj = getBeijingWallClock(dateString, hour, city.timezone, minute);
    const bjEC = Solar.fromYmdHms(bj.year, bj.month, bj.day, bj.hour, bj.minute, 0)
      .getLunar()
      .getEightChar();
    pinSect2(bjEC); // 主流:晚子时(23:00–24:00)归当日
    yearGan = bjEC.getYearGan();
    yearZhi = bjEC.getYearZhi();
    monthGan = bjEC.getMonthGan();
    monthZhi = bjEC.getMonthZhi();

    // 真太阳墙钟 → 日/时柱(可能跨子夜,由库按 sect 2 决定换日 + 五鼠遁定时干)
    const ts = trueSolarWallClock(bj, city.longitude);
    const tsEC = Solar.fromYmdHms(ts.year, ts.month, ts.day, ts.hour, ts.minute, 0)
      .getLunar()
      .getEightChar();
    pinSect2(tsEC);
    dayGan = tsEC.getDayGan();
    dayZhi = tsEC.getDayZhi();
    timeGan = tsEC.getTimeGan();
    timeZhi = tsEC.getTimeZhi();
  } else {
    // 退路 / 时辰未知:用原始日期(未知时辰按正午,避免子时换日歧义),不做真太阳时校正。
    const ec = Solar.fromYmdHms(fy, fmo || 1, fd || 1, hour, minute, 0)
      .getLunar()
      .getEightChar();
    pinSect2(ec);
    yearGan = ec.getYearGan();
    yearZhi = ec.getYearZhi();
    monthGan = ec.getMonthGan();
    monthZhi = ec.getMonthZhi();
    dayGan = ec.getDayGan();
    dayZhi = ec.getDayZhi();
    if (!isUnknown) {
      timeGan = ec.getTimeGan();
      timeZhi = ec.getTimeZhi();
    }
  }

  const timeGanStr = isUnknown ? "Unknown" : timeGan;
  const timeZhiStr = isUnknown ? "" : timeZhi;
  const dayMasterElement = GAN_WUXING[dayGan];

  // --- 2. 五行统计 ---
  // (a) wuxing 整数计数:每个"可见字"(天干 + 地支本气)算 1 —— 供五行图/历史测试,口径不变。
  // (b) wuxingWeighted 加权分布:天干 1.0 + 地支藏干(本气1.0/中气0.5/余气0.3) —— 更专业,内部驱动旺衰。
  const ELEM_KEY: Record<string, keyof BaziResult["wuxing"]> = {
    Metal: "gold",
    Wood: "wood",
    Water: "water",
    Fire: "fire",
    Earth: "earth",
  };
  const counts = { gold: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  const weighted = { gold: 0, wood: 0, water: 0, fire: 0, earth: 0 };

  const zhis = isUnknown
    ? [yearZhi, monthZhi, dayZhi]
    : [yearZhi, monthZhi, dayZhi, timeZhi];
  const allGans = isUnknown
    ? [yearGan, monthGan, dayGan]
    : [yearGan, monthGan, dayGan, timeGan];
  const pillarNames = isUnknown
    ? ["year", "month", "day"]
    : ["year", "month", "day", "hour"];

  // 天干:整数 +1,加权 +1.0
  allGans.forEach((g) => {
    const wx = GAN_WUXING[g];
    counts[ELEM_KEY[wx]]++;
    weighted[ELEM_KEY[wx]] += 1.0;
  });
  // 地支:本气进整数计数;全部藏干按权重进加权分布
  const hiddenStems: Record<string, string[]> = {};
  zhis.forEach((z, i) => {
    const mainWx = ZHI_WUXING[z];
    counts[ELEM_KEY[mainWx]]++;
    const hidden = ZHI_HIDE_GAN[z] || [];
    hiddenStems[pillarNames[i]] = hidden;
    hidden.forEach((hg, idx) => {
      const wx = GAN_WUXING[hg];
      weighted[ELEM_KEY[wx]] += HIDE_GAN_WEIGHTS[idx] ?? 0.3;
    });
  });
  // 四舍五入到 1 位小数,去掉浮点噪声
  (Object.keys(weighted) as (keyof typeof weighted)[]).forEach((k) => {
    weighted[k] = Math.round(weighted[k] * 10) / 10;
  });

  // 旺衰只看"帮扶日主的力量",故传【除日干以外】的天干(日干是被衡量的主体,
  // 不能把自己算作帮自己的比劫)。地支藏干仍全部计入(日支通根照算)。
  const otherGans = isUnknown
    ? [yearGan, monthGan]
    : [yearGan, monthGan, timeGan];
  const analysis = analyzeStrength(
    dayMasterElement,
    dayGan, // 透干检测要看天干全集(含日干本身)
    monthZhi,
    otherGans,
    zhis
  );

  return {
    solarDate: dateString,
    bazi: {
      year: `${yearGan}${yearZhi}`,
      month: `${monthGan}${monthZhi}`,
      day: `${dayGan}${dayZhi}`,
      hour: isUnknown ? "Unknown" : `${timeGanStr}${timeZhiStr}`,
    },
    wuxing: counts,
    wuxingWeighted: weighted,
    hiddenStems,
    dayMaster: dayMasterElement,
    strength: analysis.strength,
    favourableElements: analysis.favourable,
    avoidElements: analysis.avoid,
    isTimeUnknown: isUnknown,
    coreExplanation: {
      title: `${dayMasterElement} (${analysis.strength})`,
      points: analysis.explanationPoints,
    },
    recommendedNameLength: analysis.recommendedNameLength,
  };
}
