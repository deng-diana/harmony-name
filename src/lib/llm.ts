/**
 * Provider abstraction for naming LLM calls (Composer + Critic).
 *
 * Controlled by NAMING_PROVIDER env var:
 *   unset / any other value → Anthropic Claude (default, behaviorally identical to before)
 *   "deepseek"              → DeepSeek via OpenAI-compatible API
 *
 * One-click switch: set NAMING_PROVIDER=deepseek in .env.local to route through
 * DeepSeek; unset it to revert to Anthropic. No other code changes needed.
 *
 * Lazy client init: no client is constructed at module load time, so
 * `next build` without API keys still succeeds (same pattern as openai.ts / claude.ts).
 */
import OpenAI from "openai";
import { getClaude } from "./claude";
import { NAMING_MODEL } from "./model";

/**
 * Returns the active provider.
 * "anthropic" is the default; "deepseek" requires NAMING_PROVIDER=deepseek.
 */
export function getNamingProvider(): "anthropic" | "deepseek" {
  return process.env.NAMING_PROVIDER === "deepseek" ? "deepseek" : "anthropic";
}

/**
 * Resolves the model identifier for the current provider:
 *   anthropic → NAMING_MODEL constant (from model.ts, env-overridable at startup)
 *   deepseek  → NAMING_MODEL_DEEPSEEK env var, or "deepseek-v4-flash" default
 */
export function resolveNamingModel(): string {
  if (getNamingProvider() === "deepseek") {
    return process.env.NAMING_MODEL_DEEPSEEK || "deepseek-v4-flash";
  }
  return NAMING_MODEL;
}

// Lazy DeepSeek client singleton — never constructed at module load time.
let deepseekClient: OpenAI | null = null;

function getDeepSeek(): OpenAI {
  if (!deepseekClient) {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");
    deepseekClient = new OpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    });
  }
  return deepseekClient;
}

export interface NamingCompleteOpts {
  /** Static system prompt — stable across requests, so Anthropic caches it (ephemeral). */
  system: string;
  /**
   * Optional per-request system context (e.g. the pool block) that varies every call.
   * Kept as a SEPARATE, uncached Anthropic block so the static `system` prefix still
   * gets cache hits; concatenated into the system string for DeepSeek.
   */
  systemDynamic?: string;
  /** User turn content. */
  user: string;
  /** Maximum tokens for the response. */
  maxTokens: number;
  /** Sampling temperature (optional; provider default used if omitted). */
  temperature?: number;
}

/**
 * Single LLM call entry point used by Composer and Critic.
 * Returns the assistant's raw text (unparsed — callers run their own JSON parsing).
 *
 * Anthropic path:
 *   Calls getClaude().messages.create with system wrapped as a single ephemeral
 *   cached block — identical to the direct API calls that existed before this module.
 *
 * DeepSeek path:
 *   Calls the OpenAI-compatible endpoint with json_object response format
 *   (safe because both Composer and Critic prompts already instruct JSON output).
 */
export async function namingComplete(opts: NamingCompleteOpts): Promise<string> {
  const provider = getNamingProvider();

  if (provider === "deepseek") {
    const systemText = opts.systemDynamic
      ? `${opts.system}\n\n${opts.systemDynamic}`
      : opts.system;
    const response = await getDeepSeek().chat.completions.create({
      model: resolveNamingModel(),
      messages: [
        { role: "system", content: systemText },
        { role: "user", content: opts.user },
      ],
      max_tokens: opts.maxTokens,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      response_format: { type: "json_object" },
    });
    return response.choices[0]?.message?.content ?? "";
  }

  // Anthropic (default) — reproduces the getClaude().messages.create pattern exactly:
  // a cached static block + an optional uncached per-request block (the pool).
  const message = await getClaude().messages.create({
    model: NAMING_MODEL,
    max_tokens: opts.maxTokens,
    ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
    system: [
      {
        type: "text",
        text: opts.system,
        cache_control: { type: "ephemeral" },
      },
      ...(opts.systemDynamic
        ? [{ type: "text" as const, text: opts.systemDynamic }]
        : []),
    ],
    messages: [{ role: "user", content: opts.user }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
