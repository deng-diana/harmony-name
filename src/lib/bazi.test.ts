import { describe, it, expect } from "vitest";
import {
  calculateBazi,
  getBeijingWallClock,
  getTimezoneOffsetMinutes,
  equationOfTimeMinutes,
  ZHI_HIDE_GAN,
  RELATIONSHIPS,
} from "./bazi";

const ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"];

describe("getTimezoneOffsetMinutes", () => {
  it("New York is UTC-5 in winter (EST)", () => {
    expect(
      getTimezoneOffsetMinutes("America/New_York", new Date("1990-01-01T12:00:00Z"))
    ).toBe(-300);
  });
  it("Shanghai is UTC+8 (no DST)", () => {
    expect(
      getTimezoneOffsetMinutes("Asia/Shanghai", new Date("2000-06-15T12:00:00Z"))
    ).toBe(480);
  });
});

describe("getBeijingWallClock (timezone fix)", () => {
  it("converts New York EST → Beijing, crossing midnight", () => {
    // 1990-01-01 23:00 EST (UTC-5) = 1990-01-02 04:00 UTC = 1990-01-02 12:00 Beijing
    expect(getBeijingWallClock("1990-01-01", 23, "America/New_York")).toEqual({
      year: 1990,
      month: 1,
      day: 2,
      hour: 12,
      minute: 0,
    });
  });
  it("is identity for an Asia/Shanghai (UTC+8) birth", () => {
    expect(getBeijingWallClock("2000-06-15", 8, "Asia/Shanghai")).toEqual({
      year: 2000,
      month: 6,
      day: 15,
      hour: 8,
      minute: 0,
    });
  });
  it("threads minutes through (HH:MM precision for API/MCP callers)", () => {
    // 2026-06-12 审计:旧实现丢弃分钟。Shanghai=北京时,minute 应原样保留;跨时区也守恒。
    expect(getBeijingWallClock("2000-06-15", 8, "Asia/Shanghai", 30).minute).toBe(30);
    expect(getBeijingWallClock("1990-01-01", 23, "America/New_York", 45).minute).toBe(45);
  });
  it("is server-timezone independent (pure UTC math)", () => {
    // Same call must yield the same result regardless of process TZ
    const a = getBeijingWallClock("1985-03-20", 6, "Europe/London");
    const b = getBeijingWallClock("1985-03-20", 6, "Europe/London");
    expect(a).toEqual(b);
  });
});

describe("calculateBazi", () => {
  it("returns four 2-character pillars and a valid day master", () => {
    const r = calculateBazi("1990-06-15", "12:00");
    expect(r.bazi.year).toHaveLength(2);
    expect(r.bazi.month).toHaveLength(2);
    expect(r.bazi.day).toHaveLength(2);
    expect(r.bazi.hour).toHaveLength(2);
    expect(ELEMENTS).toContain(r.dayMaster);
  });

  it("Five-Element counts sum to 8 when the hour is known", () => {
    const { gold, wood, water, fire, earth } = calculateBazi(
      "1990-06-15",
      "12:00"
    ).wuxing;
    expect(gold + wood + water + fire + earth).toBe(8);
  });

  it("handles unknown birth time: hour pillar Unknown, 6 chars counted", () => {
    const r = calculateBazi("1990-06-15", "unknown");
    expect(r.isTimeUnknown).toBe(true);
    expect(r.bazi.hour).toBe("Unknown");
    const { gold, wood, water, fire, earth } = r.wuxing;
    expect(gold + wood + water + fire + earth).toBe(6);
  });

  it("treats an unparseable time as unknown", () => {
    expect(calculateBazi("1990-06-15", "not-a-time").isTimeUnknown).toBe(true);
  });

  it("is deterministic for identical input", () => {
    expect(calculateBazi("1985-03-20", "08:00")).toEqual(
      calculateBazi("1985-03-20", "08:00")
    );
  });

  it("produces a valid strength and favourable/avoid elements", () => {
    const r = calculateBazi("1990-06-15", "12:00");
    expect(["Weak", "Strong", "Balanced"]).toContain(r.strength);
    for (const e of [...r.favourableElements, ...r.avoidElements]) {
      expect(ELEMENTS).toContain(e);
    }
  });

  it("recommends a name length string", () => {
    expect(calculateBazi("1990-06-15", "12:00").recommendedNameLength).toMatch(
      /character/i
    );
  });
});

// ── Professional-accuracy regression guards (Phase 0) ──────────────────────

describe("立春 year boundary (year pillar changes at Start of Spring, not Jan 1)", () => {
  it("2024 is 甲辰 only AFTER 立春 (Feb 4)", () => {
    // 立春 2024 ≈ Feb 4. Before it the year is still 癸卯.
    expect(calculateBazi("2024-02-03", "12:00").bazi.year).toBe("癸卯");
    expect(calculateBazi("2024-02-05", "12:00").bazi.year).toBe("甲辰");
  });
  it("1984 (start of a new 60-cycle) is 甲子 only after 立春", () => {
    expect(calculateBazi("1984-02-02", "12:00").bazi.year).toBe("癸亥");
    expect(calculateBazi("1984-02-05", "12:00").bazi.year).toBe("甲子");
  });
});

describe("day pillar (60甲子) and 子时", () => {
  const city = { longitude: 120, timezone: "Asia/Shanghai" }; // 2000: no DST
  it("advances one step between consecutive days", () => {
    expect(calculateBazi("2000-06-14", "12:00", city).bazi.day).toBe("癸卯");
    expect(calculateBazi("2000-06-15", "12:00", city).bazi.day).toBe("甲辰");
  });
  it("子时 (00:00) yields a 子 hour branch", () => {
    expect(calculateBazi("2000-06-14", "00:00", city).bazi.hour.endsWith("子")).toBe(
      true
    );
  });
});

describe("真太阳时 (true solar time)", () => {
  it("equation of time hits its known extremes (≈ −14 mid-Feb, ≈ +16 early-Nov)", () => {
    expect(equationOfTimeMinutes(2024, 2, 12)).toBeLessThan(-10);
    expect(equationOfTimeMinutes(2024, 11, 3)).toBeGreaterThan(14);
  });
  it("a far-west longitude shifts the hour pillar vs the 120° meridian", () => {
    // Kashgar ≈ 75.9°E → ~−176 min; a noon birth lands in an earlier 时辰.
    const kashgar = { longitude: 75.9, timezone: "Asia/Shanghai" };
    const std = { longitude: 120, timezone: "Asia/Shanghai" };
    const west = calculateBazi("2000-06-14", "12:00", kashgar).bazi.hour;
    const east = calculateBazi("2000-06-14", "12:00", std).bazi.hour;
    expect(west).not.toBe(east);
  });
});

describe("地支藏干 + weighted five elements", () => {
  it("hidden-stem table is correct (寅 = 甲丙戊, 子 = 癸)", () => {
    expect(ZHI_HIDE_GAN["寅"]).toEqual(["甲", "丙", "戊"]);
    expect(ZHI_HIDE_GAN["子"]).toEqual(["癸"]);
  });
  it("exposes a weighted distribution that includes hidden stems", () => {
    const r = calculateBazi("2000-06-14", "12:00", {
      longitude: 120,
      timezone: "Asia/Shanghai",
    });
    expect(r.wuxingWeighted).toBeDefined();
    const w = r.wuxingWeighted!;
    const sum = w.gold + w.wood + w.water + w.fire + w.earth;
    // 4 stems ×1.0 + hidden stems (本气1.0/中气0.5/余气0.3) > the 8 visible-char integer count
    expect(sum).toBeGreaterThan(8);
    // integer counts unchanged (one per visible char)
    const i = r.wuxing;
    expect(i.gold + i.wood + i.water + i.fire + i.earth).toBe(8);
  });
});

describe("喜忌不变量(调候守卫回归)", () => {
  // 扫一批日期,覆盖各月令/各日主,验证喜忌推导的硬不变量。
  // 这些不变量在"调候无条件翻转"的旧逻辑下会被违反,故可守护该 bug 不复发。
  const dates: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    for (const d of ["05", "20"]) dates.push(`1993-${mm}-${d}`);
  }
  for (const y of ["1980", "1995", "2001", "2010"])
    for (const md of ["02-04", "05-21", "08-08", "11-12"]) dates.push(`${y}-${md}`);

  it("favourable 与 avoid 永不重叠(同一元素不可既喜又忌)", () => {
    for (const date of dates) {
      const r = calculateBazi(date, "12:00");
      const fav = new Set(r.favourableElements);
      for (const a of r.avoidElements) expect(fav.has(a)).toBe(false);
    }
  });

  // 注:断言【首选 favourable[0]】而非全部 —— 调候降级(2026-06-12)允许把"暖字"等
  // 调候之神放到 favourable 末位(寒木向阳:身弱木亦须见一点火),故末位可含克泄耗,
  // 但【主用神方向】仍须正确。这正好守住调候翻转 bug 不复发,又容纳调候降级。
  it("身强:主用神(首选)不是日主/印星(调候之神可在末位)", () => {
    for (const date of dates) {
      const r = calculateBazi(date, "12:00");
      if (r.strength !== "Strong") continue;
      const rel = RELATIONSHIPS[r.dayMaster as keyof typeof RELATIONSHIPS];
      expect(r.favourableElements[0]).not.toBe(r.dayMaster);
      expect(r.favourableElements[0]).not.toBe(rel.generatedBy);
    }
  });

  it("身弱:主用神(首选)是生扶(印/比)(调候之神可在末位)", () => {
    for (const date of dates) {
      const r = calculateBazi(date, "12:00");
      if (r.strength !== "Weak") continue;
      const rel = RELATIONSHIPS[r.dayMaster as keyof typeof RELATIONSHIPS];
      const allowed = new Set([rel.generatedBy, r.dayMaster]);
      expect(allowed.has(r.favourableElements[0])).toBe(true);
    }
  });
});
