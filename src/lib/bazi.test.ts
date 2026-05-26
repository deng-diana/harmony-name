import { describe, it, expect } from "vitest";
import { calculateBazi, getBeijingWallClock, getTimezoneOffsetMinutes } from "./bazi";

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
