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

const SEASONAL_BASE_SCORES: Record<string, Record<string, number>> = {
  Wood: { Spring: 2, Summer: 0, Autumn: -1, Winter: -1 },
  Fire: { Summer: 2, Spring: -1, Autumn: 0, Winter: -1 },
  Metal: { Autumn: 2, Winter: 0, Summer: -1, Spring: -1 },
  Water: { Winter: 2, Spring: 0, Summer: -1, Autumn: -1 },
  Earth: { Spring: -1, Summer: 0, Autumn: -1, Winter: 0 },
};

const EARTH_MONTHS = ["辰", "戌", "丑", "未"];

const RELATIONSHIPS = {
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

function analyzeStrength(
  dayMaster: string,
  monthZhi: string,
  allElements: string[]
) {
  const season = MONTH_ZHI_SEASON[monthZhi];
  let baseScore = 0;

  if (dayMaster === "Earth" && EARTH_MONTHS.includes(monthZhi)) {
    baseScore = 2;
  } else {
    baseScore = SEASONAL_BASE_SCORES[dayMaster]?.[season] ?? 0;
  }

  const relations = RELATIONSHIPS[dayMaster as keyof typeof RELATIONSHIPS];

  let supportScore = 0;
  let drainScore = 0;

  allElements.forEach((el) => {
    if (el === dayMaster) supportScore += 1;
    else if (el === relations.generatedBy) supportScore += 1;
    else if (el === relations.controlledBy) drainScore += 1;
    else if (el === relations.generate) drainScore += 1;
    else if (el === relations.control) drainScore += 0;
  });

  if (supportScore > 0) supportScore -= 1;

  const finalScore = baseScore + supportScore - drainScore;

  let strength = "Balanced";
  let nameLength = "2 or 3 characters";

  if (finalScore >= 2) {
    strength = "Strong";
    nameLength = "2 characters (Surname + 1 Name)";
  }
  if (finalScore <= -1) {
    strength = "Weak";
    nameLength = "3 characters (Surname + 2 Names)";
  }

  let favourable: string[] = [];
  let avoid: string[] = [];

  if (strength === "Weak") {
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

// 🧠 核心:真太阳时 (Local True Solar Time) —— 用于确定"时柱"(Hour Pillar)
// 经度每偏离标准经线 1°,真太阳时差 4 分钟。
function calculateTrueSolarTime(
  date: Date,
  hour: number,
  longitude: number,
  timezone: string
): Date {
  const timezoneOffsetMins = getTimezoneOffsetMinutes(timezone, date);
  const standardMeridian = (timezoneOffsetMins / 60) * 15;
  const correctionMins = (longitude - standardMeridian) * 4;

  const adjustedDate = new Date(date);
  adjustedDate.setHours(hour);
  adjustedDate.setMinutes(adjustedDate.getMinutes() + correctionMins);
  return adjustedDate;
}

// 🧠 核心:把"出生地墙上时间"换算成"北京时间(UTC+8)墙上时间",用于按节气定年/月柱。
// 全程用 UTC 时间戳运算,【不受服务器本地时区影响】(修复旧 getBeijingDate 的 hack)。
//   北京墙钟 = 出生瞬间(UTC) + 8h
//   出生瞬间(UTC) = (把出生墙钟当作 UTC) − 出生地时区偏移
export function getBeijingWallClock(
  dateString: string,
  hour: number,
  timezone: string
): { year: number; month: number; day: number; hour: number; minute: number } {
  const [y, mo, d] = dateString.split("-").map(Number);
  const wallAsUTC = Date.UTC(y, (mo || 1) - 1, d || 1, hour, 0, 0);
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

export function calculateBazi(
  dateString: string,
  timeString: string,
  city?: { longitude: number; timezone: string }
): BaziResult {
  const date = new Date(dateString);

  // 安全地解析时间字符串
  // 处理 "unknown"、空值、以及无效格式的情况
  let isUnknown = timeString === "unknown" || !timeString;
  let hour = 12; // 默认值

  if (!isUnknown && timeString.trim()) {
    // 验证时间格式：应该是 "HH:MM" 或 "HH:mm" 格式
    const timeMatch = timeString.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch) {
      const parsedHour = parseInt(timeMatch[1], 10);
      // 确保解析出的小时数是有效数字且在合理范围内 (0-23)
      // 注意：parseInt 对于数字字符串不会返回 NaN，但保留检查作为防御性编程
      if (!isNaN(parsedHour) && parsedHour >= 0 && parsedHour <= 23) {
        hour = parsedHour;
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

  // --- 1. 计算主要八字 (年/月/日) ---
  // 规则：使用“北京时间”来查节气，确定年和月
  let solarForPillars = Solar.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    hour,
    0,
    0
  );

  if (city && !isUnknown) {
    // 把出生地当地时间换算成北京时间,再按节气定年/月柱
    const bj = getBeijingWallClock(dateString, hour, city.timezone);
    solarForPillars = Solar.fromYmdHms(
      bj.year,
      bj.month,
      bj.day,
      bj.hour,
      bj.minute,
      0
    );
  }

  const lunarPillars = solarForPillars.getLunar();
  const baZiPillars = lunarPillars.getEightChar();

  const yearGan = baZiPillars.getYearGan();
  const yearZhi = baZiPillars.getYearZhi();
  const monthGan = baZiPillars.getMonthGan();
  const monthZhi = baZiPillars.getMonthZhi();
  // 日柱通常随北京时间走，但在跨越子夜时有争议。
  // 既然 lunar-javascript 是按北京时间排盘的，我们就统一用北京时间取前三柱。
  const dayGan = baZiPillars.getDayGan();
  const dayZhi = baZiPillars.getDayZhi();

  // --- 2. 计算时柱 (Hour Pillar) ---
  // 规则：使用“真太阳时”来确定时辰
  let timeGanStr = "Unknown";
  let timeZhiStr = "";
  let timeGan = "";
  let timeZhi = "";

  if (!isUnknown) {
    let hourForCalc = hour;

    if (city) {
      const trueSolarDate = calculateTrueSolarTime(
        date,
        hour,
        city.longitude,
        city.timezone
      );
      hourForCalc = trueSolarDate.getHours();
    }

    // 这里有个技巧：我们需要用“真太阳时”造一个临时的 Solar 对象，只为了取时柱
    // 但是时干(Time Stem) 是由 日干(Day Stem) 决定的 (五鼠遁)。
    // 所以我们必须保证这个临时对象的“日干”和上面算出来的主日干一致。
    // 最简单的办法：直接查表 (五鼠遁)，或者用库的逻辑。

    // 我们用库的逻辑：造一个临时对象，日期用上面的 solarForPillars 的日期，时间用真太阳时
    // 这样能保证日干一致，从而推导出正确的时干。
    const solarForHour = Solar.fromYmdHms(
      solarForPillars.getYear(),
      solarForPillars.getMonth(),
      solarForPillars.getDay(),
      hourForCalc,
      0,
      0
    );
    const baZiHour = solarForHour.getLunar().getEightChar();

    timeGan = baZiHour.getTimeGan();
    timeZhi = baZiHour.getTimeZhi();
    timeGanStr = timeGan;
    timeZhiStr = timeZhi;
  }

  const dayMasterElement = GAN_WUXING[dayGan];

  const charList = [
    { char: yearGan, type: "gan" },
    { char: yearZhi, type: "zhi" },
    { char: monthGan, type: "gan" },
    { char: monthZhi, type: "zhi" },
    { char: dayGan, type: "gan" },
    { char: dayZhi, type: "zhi" },
  ];

  if (!isUnknown) {
    charList.push({ char: timeGan, type: "gan" });
    charList.push({ char: timeZhi, type: "zhi" });
  }

  const counts = { gold: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  const allElementsStr: string[] = [];

  charList.forEach((item) => {
    const wx =
      item.type === "gan" ? GAN_WUXING[item.char] : ZHI_WUXING[item.char];
    allElementsStr.push(wx);
    if (wx === "Metal") counts.gold++;
    if (wx === "Wood") counts.wood++;
    if (wx === "Water") counts.water++;
    if (wx === "Fire") counts.fire++;
    if (wx === "Earth") counts.earth++;
  });

  const analysis = analyzeStrength(dayMasterElement, monthZhi, allElementsStr);

  return {
    solarDate: dateString,
    bazi: {
      year: `${yearGan}${yearZhi}`,
      month: `${monthGan}${monthZhi}`,
      day: `${dayGan}${dayZhi}`,
      hour: isUnknown ? "Unknown" : `${timeGanStr}${timeZhiStr}`,
    },
    wuxing: counts,
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
