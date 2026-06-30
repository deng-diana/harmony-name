/**
 * Pure unit tests for src/lib/llm.ts — no network calls, no API keys required.
 * Tests cover provider selection and model resolution under env mutations.
 */
import { describe, it, expect, afterEach } from "vitest";
import { getNamingProvider, resolveNamingModel } from "./llm";

describe("getNamingProvider", () => {
  afterEach(() => {
    delete process.env.NAMING_PROVIDER;
  });

  it("returns 'anthropic' when NAMING_PROVIDER is unset (default)", () => {
    delete process.env.NAMING_PROVIDER;
    expect(getNamingProvider()).toBe("anthropic");
  });

  it("returns 'deepseek' when NAMING_PROVIDER is 'deepseek'", () => {
    process.env.NAMING_PROVIDER = "deepseek";
    expect(getNamingProvider()).toBe("deepseek");
  });

  it("returns 'anthropic' for any unrecognised value (safe default)", () => {
    process.env.NAMING_PROVIDER = "openai";
    expect(getNamingProvider()).toBe("anthropic");
  });

  it("returns 'anthropic' when NAMING_PROVIDER is an empty string", () => {
    process.env.NAMING_PROVIDER = "";
    expect(getNamingProvider()).toBe("anthropic");
  });
});

describe("resolveNamingModel", () => {
  afterEach(() => {
    delete process.env.NAMING_PROVIDER;
    delete process.env.NAMING_MODEL_DEEPSEEK;
  });

  it("returns the Claude model (claude-sonnet-4-6) when provider is anthropic", () => {
    delete process.env.NAMING_PROVIDER;
    // NAMING_MODEL is a module-level constant evaluated at import time;
    // its default is claude-sonnet-4-6 (see model.ts).
    expect(resolveNamingModel()).toBe("claude-sonnet-4-6");
  });

  it("returns 'deepseek-v4-flash' by default when provider is deepseek", () => {
    process.env.NAMING_PROVIDER = "deepseek";
    delete process.env.NAMING_MODEL_DEEPSEEK;
    expect(resolveNamingModel()).toBe("deepseek-v4-flash");
  });

  it("returns NAMING_MODEL_DEEPSEEK when set and provider is deepseek", () => {
    process.env.NAMING_PROVIDER = "deepseek";
    process.env.NAMING_MODEL_DEEPSEEK = "deepseek-v3";
    expect(resolveNamingModel()).toBe("deepseek-v3");
  });

  it("ignores NAMING_MODEL_DEEPSEEK when provider is anthropic", () => {
    delete process.env.NAMING_PROVIDER;
    process.env.NAMING_MODEL_DEEPSEEK = "deepseek-v3";
    // Should still return the Claude model, not the DeepSeek one.
    expect(resolveNamingModel()).toBe("claude-sonnet-4-6");
  });
});
