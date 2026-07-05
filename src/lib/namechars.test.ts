import { describe, it, expect } from "vitest";
import {
  ELEMENT_KEYS,
  elementOfChar,
  isHardBlacklisted,
  isGenderForbidden,
  isGenderClashing,
  genderLeanOf,
  isUsableInName,
  isNameSuitable,
  isForbiddenGivenName,
  isCelebrityName,
  isForbiddenNameSound,
  candidateCharsFor,
  charsOfElement,
  pinyinOf,
  type ElementEN,
} from "./namechars";
import truth from "../../fixtures/element-truth.json";
import nameChars from "../data/name-chars.json";
import blacklist from "../data/name-blacklist.json";

describe("字库 element classification", () => {
  it("matches the hand-labeled element-truth fixture", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of (truth as unknown as Record<string, string[]>)[el]) {
        expect(elementOfChar(c)).toBe(el);
      }
    }
  });

  it("no character is classified under two elements", () => {
    const seen = new Map<string, ElementEN>();
    for (const el of ELEMENT_KEYS) {
      for (const c of charsOfElement(el)) {
        expect(seen.has(c)).toBe(false); // would mean a duplicate across elements
        seen.set(c, el);
      }
    }
  });

  it("EXTRA_ELEMENTS fallback classifies common out-of-vocab chars (台/华/雨/玉)", () => {
    expect(elementOfChar("台")).toBe("Earth");
    expect(elementOfChar("华")).toBe("Wood");
    expect(elementOfChar("雨")).toBe("Water");
    expect(elementOfChar("玉")).toBe("Earth");
    // contentious chars (颜/思/月/紫) and 黑名单虚词(若) intentionally remain undefined
    expect(elementOfChar("颜")).toBeUndefined();
    expect(elementOfChar("思")).toBeUndefined();
    expect(elementOfChar("紫")).toBeUndefined();
    expect(elementOfChar("若")).toBeUndefined();
  });

  it("no 字库 character is on the HARD blacklist", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of charsOfElement(el)) {
        expect(isHardBlacklisted(c)).toBe(false);
      }
    }
  });
});

describe("字库 coverage (must not over-restrict naming)", () => {
  // Floors reflect 命理 reality after positive gender bias: 金(Metal) is an
  // intrinsically masculine element, so feminine Metal chars are genuinely few
  // (~10) — a guardrail against accidental emptying, not a quality target.
  // Real charts have 2+ favourable elements; single-element female-Metal is rare.
  // (Jade 玉部 lives in Earth per 玉从石→土, which keeps Earth-female rich.)
  // Metal is corpus-thin (few 金-element name chars appear in classical poetry) AND
  // 2026-06-12 audit removed its 器物/铜臭 chars (镜/铜/钗/钿) — so its male floor is
  // realistically lower. A Metal-favourable chart still pairs the Metal char with a
  // richer-element partner (verify needs only ≥1 favourable char), so 12 is workable.
  it("each element offers a usable pool for both genders", () => {
    for (const el of ELEMENT_KEYS) {
      const maleFloor = el === "Metal" ? 12 : 15;
      expect(candidateCharsFor([el], "male").length).toBeGreaterThanOrEqual(maleFloor);
      expect(candidateCharsFor([el], "female").length).toBeGreaterThanOrEqual(10);
    }
  });
});

describe("gender lean classification", () => {
  it("tags masculine / feminine / neutral correctly", () => {
    expect(genderLeanOf("峰")).toBe("masculine");
    expect(genderLeanOf("浩")).toBe("masculine");
    expect(genderLeanOf("芷")).toBe("feminine");
    expect(genderLeanOf("瑶")).toBe("feminine");
    expect(genderLeanOf("清")).toBe("neutral"); // neutral-masculine, but not tagged → stays neutral
  });

  it("masculine and feminine lean sets are mutually exclusive", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of charsOfElement(el)) {
        const lean = genderLeanOf(c);
        if (lean === "masculine") expect(isGenderClashing(c, "female")).toBe(true);
        if (lean === "feminine") expect(isGenderClashing(c, "male")).toBe(true);
      }
    }
  });

  it("isGenderClashing: female rejects masculine-lean, male rejects feminine-lean", () => {
    expect(isGenderClashing("峰", "female")).toBe(true);
    expect(isGenderClashing("峰", "male")).toBe(false);
    expect(isGenderClashing("芷", "male")).toBe(true);
    expect(isGenderClashing("芷", "female")).toBe(false);
    expect(isGenderClashing("清", "female")).toBe(false); // neutral never clashes
  });
});

// 2026-06-12 审计:字库手工增删易引入矛盾(死条目/双归类/混入禁字),加自洽性回归。
describe("字库数据自洽性", () => {
  const nc = nameChars as unknown as Record<string, string[]>;
  const elementUnion = new Set(ELEMENT_KEYS.flatMap((e) => nc[e]));
  const neutral = (nc._neutralNameChars ?? []) as string[];
  const nameUniverse = new Set([...elementUnion, ...neutral]);
  const hard = new Set([
    ...blacklist.hard.functionWords,
    ...blacklist.hard.inauspicious,
    ...blacklist.hard.overweening,
    ...blacklist.hard.crude,
  ]);

  it("lean 表 ⊆ 五行表 ∪ 好名字表(无悬空标注)", () => {
    for (const c of [...nc.masculineLean, ...nc.feminineLean]) {
      expect(nameUniverse.has(c)).toBe(true);
    }
  });

  it("lean 表与硬黑名单不相交(无死条目,如曾经的 圣)", () => {
    for (const c of [...nc.masculineLean, ...nc.feminineLean]) {
      expect(hard.has(c)).toBe(false);
    }
  });

  it("masculineLean ∩ feminineLean = ∅", () => {
    const fem = new Set(nc.feminineLean);
    for (const c of nc.masculineLean) expect(fem.has(c)).toBe(false);
  });

  it("好名字表与五行表不重叠(同字单一归类)", () => {
    for (const c of neutral) expect(elementUnion.has(c)).toBe(false);
  });

  it("五行表内不含硬黑名单字", () => {
    for (const el of ELEMENT_KEYS) {
      for (const c of nc[el]) expect(hard.has(c)).toBe(false);
    }
  });

  it("已删的器物/谐音/天象字确实不在库(灯/钗/镜/铜/沼/渔/梨/幽/圣/霓/虹)", () => {
    for (const c of ["灯", "钗", "镜", "铜", "沼", "渔", "梨", "幽", "圣", "霓", "虹"]) {
      expect(nameUniverse.has(c)).toBe(false);
    }
  });

  it("天象名词整名被禁(虹霓/朝霞 是天气词,非人名)", () => {
    expect(isForbiddenGivenName(["虹", "霓"])).toBe(true);
    expect(isForbiddenGivenName(["朝", "霞"])).toBe(true);
  });

  // composer/critic prompt 的 GOLD 正面示例必须能通过自家闸门 —— 否则模型学了金标准
  // 却产出必死候选,浪费候选位(2026-06-12 审计:涵虚/苍山/望舒曾过不了 isNameSuitable)。
  it("prompt 的 GOLD 正面示例都过自家闸门(isNameSuitable + 非禁用名)", () => {
    const gold: [string, string][] = [
      ["松", "月"], ["清", "泉"], ["青", "溪"],
      ["明", "月"], ["晓", "露"], ["月", "华"],
    ];
    for (const [a, b] of gold) {
      expect(isNameSuitable(a)).toBe(true);
      expect(isNameSuitable(b)).toBe(true);
      expect(isForbiddenGivenName([a, b])).toBe(false);
    }
  });

  it("名人撞名拦截(王维/李白)但不误伤普通同姓名", () => {
    expect(isCelebrityName("王", ["维"])).toBe(true);
    expect(isCelebrityName("诸", ["葛", "亮"])).toBe(true);
    expect(isCelebrityName("王", ["睿"])).toBe(false); // 普通名
  });

  // P0 modern-celebrity blacklist (expert audit 2026-07-05, naming finding #1).
  // 林丹 (Olympic badminton champion) was shipped as a FEMALE name in evals.
  // The check compares surname + givenChars.join("") against the full-name set,
  // so 林丹 is caught only when givenChars = ["丹"] (rescue tier single-char).
  it("modern-celebrity blacklist: 林丹/姚明/章子怡 all blocked", () => {
    // 2-char celebrities (caught in rescue tier: surname + 1 given char)
    expect(isCelebrityName("林", ["丹"])).toBe(true);   // badminton
    expect(isCelebrityName("姚", ["明"])).toBe(true);   // basketball
    expect(isCelebrityName("刘", ["翔"])).toBe(true);   // athletics
    expect(isCelebrityName("王", ["菲"])).toBe(true);   // singer
    expect(isCelebrityName("马", ["云"])).toBe(true);   // tech founder
    expect(isCelebrityName("雷", ["锋"])).toBe(true);   // cultural hero
    // 3-char celebrities (caught in main pipeline: surname + 2 given chars)
    expect(isCelebrityName("章", ["子", "怡"])).toBe(true); // actress
    expect(isCelebrityName("周", ["杰", "伦"])).toBe(true); // singer
    expect(isCelebrityName("刘", ["德", "华"])).toBe(true); // actor
  });

  it("modern-celebrity blacklist: does NOT block innocent same-surname names", () => {
    // 林 + 霁 (not 丹) → fine
    expect(isCelebrityName("林", ["霁"])).toBe(false);
    // 章 + 清 + 远 (not 子怡) → fine
    expect(isCelebrityName("章", ["清", "远"])).toBe(false);
  });

  // P1 toponym / common-noun gate (expert audit 2026-07-05, naming finding #4).
  it("forbiddenGivenNames blocks shipped toponyms and common nouns", () => {
    expect(isForbiddenGivenName(["岳", "阳"])).toBe(true);  // city name
    expect(isForbiddenGivenName(["沧", "海"])).toBe(true);  // common noun "vast sea"
    expect(isForbiddenGivenName(["清", "淮"])).toBe(true);  // river name
    expect(isForbiddenGivenName(["烟", "柳"])).toBe(true);  // stock scenery word
    expect(isForbiddenGivenName(["白", "玉"])).toBe(true);  // material noun
    // Live prod offenders (Wood/female/邓 audit 2026-07-05): scenery-noun class.
    expect(isForbiddenGivenName(["清", "池"])).toBe(true);  // "a clear pond" — scenery noun
    expect(isForbiddenGivenName(["柳", "绿"])).toBe(true);  // "willow-green" — color phrase
  });

  it("forbiddenGivenNames does NOT block legitimate name pairs", () => {
    expect(isForbiddenGivenName(["清", "远"])).toBe(false); // fine name
    expect(isForbiddenGivenName(["云", "澄"])).toBe(false); // fine name
    expect(isForbiddenGivenName(["思", "远"])).toBe(false); // fine name
  });

  it("谐音忌名【带声调】精确匹配 —— 拦真谐音、不误杀近音好名", () => {
    expect(isForbiddenNameSound("吴", ["晴"])).toBe(true); // 吴晴 = wú qíng = 无情
    expect(isForbiddenNameSound("吴", ["清"])).toBe(false); // 吴清 = wú qīng ≠ 无情(声调不同)
    expect(isForbiddenNameSound("石", ["毅"])).toBe(false); // 石毅 = shí yì ≠ 失意(已不在表 + 声调)
  });
});

describe("candidateCharsFor gender bias", () => {
  it("excludes clearly masculine-lean chars from a female pool", () => {
    const fem = candidateCharsFor(["Fire", "Water"], "female");
    expect(fem).not.toContain("浩"); // masculine water
    expect(fem).not.toContain("景"); // masculine fire
    expect(fem).not.toContain("旭"); // masculine fire
  });

  it("excludes clearly feminine-lean chars from a male pool", () => {
    const male = candidateCharsFor(["Wood", "Metal"], "male");
    expect(male).not.toContain("蕊"); // feminine wood
    expect(male).not.toContain("瑶"); // feminine metal
  });

  it("orders same-gender-lean chars before neutral chars (positive bias)", () => {
    const fem = candidateCharsFor(["Water"], "female");
    const idxFeminine = fem.indexOf("漪"); // feminine-lean water
    const idxNeutral = fem.indexOf("清"); // neutral water
    expect(idxFeminine).toBeGreaterThanOrEqual(0);
    expect(idxNeutral).toBeGreaterThanOrEqual(0);
    expect(idxFeminine).toBeLessThan(idxNeutral);
  });

  it("still returns chars (no gender) without crashing", () => {
    expect(candidateCharsFor(["Wood"]).length).toBeGreaterThan(0);
  });
});

describe("blacklist", () => {
  it("blocks function words (入诗不入名)", () => {
    for (const c of ["之", "兮", "谁", "也", "其"]) {
      expect(isHardBlacklisted(c)).toBe(true);
      expect(isUsableInName(c)).toBe(false);
    }
  });
  it("enforces gender-forbidden sets", () => {
    expect(isGenderForbidden("霸", "female")).toBe(true);
    expect(isGenderForbidden("霸", "male")).toBe(false);
    expect(isGenderForbidden("娇", "male")).toBe(true);
  });
  it("candidateCharsFor excludes gender-forbidden chars", () => {
    expect(candidateCharsFor(["Metal"], "female")).not.toContain("钢");
    expect(candidateCharsFor(["Wood"], "male")).not.toContain("蕊");
  });
});

describe("pinyinOf", () => {
  it("returns the correct tone number", () => {
    expect(pinyinOf("泽").tone).toBe(2); // zé
    expect(pinyinOf("明").tone).toBe(2); // míng
    expect(pinyinOf("锐").tone).toBe(4); // ruì
    expect(pinyinOf("水").tone).toBe(3); // shuǐ
  });
});
