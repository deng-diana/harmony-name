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
}

// 🧠 V14.0: 关系导向的 Strategic Guide
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

  // 1. Seasonal Energy
  let seasonText = "";
  if (strength === "Weak") {
    seasonText = `Born in ${season}, your ${dayMaster} energy is naturally quiet and recovering.`;
  } else if (strength === "Strong") {
    seasonText = `Born in ${season}, your ${dayMaster} energy is at its seasonal peak and very robust.`;
  } else {
    seasonText = `Born in ${season}, your ${dayMaster} energy is steady and well-supported.`;
  }

  // 2. Strategic Guide (Relationship Focused)
  let guideText = "";
  if (strength === "Weak") {
    guideText = `You thrive best when connecting with ${favStr} type people who naturally nourish you. Be mindful that too much ${avoidStr} energy in your environment might feel draining.`;
  } else if (strength === "Strong") {
    guideText = `You work best with ${favStr} type people who help you channel your strength. You may find yourself conflicting with strong ${avoidStr} energy.`;
  } else {
    guideText = `You have a natural gift for balancing different energies. You sync well with ${favStr} types while maintaining your own center.`;
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
    const seasonScores =
      SEASONAL_BASE_SCORES[dayMaster as keyof typeof SEASONAL_BASE_SCORES];
    if (seasonScores && season) {
      baseScore = seasonScores[season as keyof typeof seasonScores] ?? 0;
    }
  }

  const relations = RELATIONSHIPS[dayMaster as keyof typeof RELATIONSHIPS];
  if (!relations) {
    return {
      strength: "Balanced",
      favourable: [],
      avoid: [],
      explanationPoints: [],
    };
  }

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
  if (finalScore >= 2) strength = "Strong";
  if (finalScore <= -1) strength = "Weak";

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
  };
}

export function calculateBazi(
  dateString: string,
  timeString: string
): BaziResult {
  const date = new Date(dateString);
  const isUnknown = timeString === "unknown" || !timeString;
  const hour = isUnknown ? 12 : parseInt(timeString.split(":")[0]);

  const solar = Solar.fromYmdHms(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    hour,
    0,
    0
  );
  const lunar = solar.getLunar();
  const baZi = lunar.getEightChar();

  const yearGan = baZi.getYearGan();
  const yearZhi = baZi.getYearZhi();
  const monthGan = baZi.getMonthGan();
  const monthZhi = baZi.getMonthZhi();
  const dayGan = baZi.getDayGan();
  const dayZhi = baZi.getDayZhi();

  const dayMasterElement = GAN_WUXING[dayGan];

  const charList = [
    { char: yearGan, type: "gan" },
    { char: yearZhi, type: "zhi" },
    { char: monthGan, type: "gan" },
    { char: monthZhi, type: "zhi" },
    { char: dayGan, type: "gan" },
    { char: dayZhi, type: "zhi" },
  ];

  let timeGanStr = "Unknown";
  let timeZhiStr = "";

  if (!isUnknown) {
    const timeGan = baZi.getTimeGan();
    const timeZhi = baZi.getTimeZhi();
    timeGanStr = timeGan;
    timeZhiStr = timeZhi;
    charList.push({ char: timeGan, type: "gan" });
    charList.push({ char: timeZhi, type: "zhi" });
  }

  const counts = { gold: 0, wood: 0, water: 0, fire: 0, earth: 0 };
  const allElements: string[] = [];

  charList.forEach((item) => {
    const wx =
      item.type === "gan" ? GAN_WUXING[item.char] : ZHI_WUXING[item.char];
    if (!wx) {
      return;
    }
    allElements.push(wx);
    if (wx === "Metal") counts.gold++;
    if (wx === "Wood") counts.wood++;
    if (wx === "Water") counts.water++;
    if (wx === "Fire") counts.fire++;
    if (wx === "Earth") counts.earth++;
  });

  const analysis = analyzeStrength(dayMasterElement, monthZhi, allElements); // 收集全部五行元素以便分析

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
  };
}
