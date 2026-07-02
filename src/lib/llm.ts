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
 *
 * ── DeepSeek empty-response diagnosis (2026-07-02) ─────────────────────────────
 * Prior symptom: `deepseek-v4-flash` and `deepseek-v4-pro` returned RAW LENGTH 0
 * through this adapter and were very slow (93–173s). Root cause found by probing
 * the API directly with the real composer prompt: BOTH v4 models are REASONING
 * models. On our complex composer task they spend the ENTIRE `max_tokens` budget
 * on chain-of-thought (`usage.completion_tokens_details.reasoning_tokens` == the
 * full budget; `message.reasoning_content` grows to 20k+ chars) and hit
 * `finish_reason: "length"` BEFORE emitting any answer → `message.content` is "".
 * Raising max_tokens does not help — the CoT just expands to fill it.
 * The old `?? ""` silently coerced this to an empty string, so callers saw 0
 * candidates and fell into the rescue ladder instead of a loud error.
 * `deepseek-chat` (NON-reasoning) returns clean JSON on the same prompt
 * (finish_reason=stop, ~4.5k chars) — it is the only usable DeepSeek model here.
 * Fix below: fail loud on empty content (with finish_reason + usage), fall back to
 * reasoning_content only as a last resort, and log per-call token usage for both
 * providers via a structured [llm-usage] line.
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
  /**
   * Optional AbortSignal — when the caller (e.g. the SSE route) sees the client
   * disconnect, aborting the signal cancels the in-flight LLM request so we stop
   * paying for tokens nobody will read. Both SDKs accept a per-request signal.
   */
  signal?: AbortSignal;
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
    const model = resolveNamingModel();
    const systemText = opts.systemDynamic
      ? `${opts.system}\n\n${opts.systemDynamic}`
      : opts.system;
    const t0 = Date.now();
    const response = await getDeepSeek().chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: systemText },
          { role: "user", content: opts.user },
        ],
        max_tokens: opts.maxTokens,
        ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
        response_format: { type: "json_object" },
      },
      // OpenAI-compatible SDK accepts a per-request signal in the options arg.
      opts.signal ? { signal: opts.signal } : undefined
    );
    const ms = Date.now() - t0;

    const choice = response.choices[0];
    // Some DeepSeek reasoner models expose chain-of-thought under a non-standard
    // `reasoning_content` field the OpenAI SDK types don't declare — read it defensively.
    const msg = (choice?.message ?? {}) as {
      content?: string | null;
      reasoning_content?: string | null;
    };
    const content = (msg.content ?? "").trim();
    const reasoning = (msg.reasoning_content ?? "").trim();
    const finish = choice?.finish_reason;

    console.log(
      `[llm-usage] provider=deepseek model=${model} input_tokens=${
        response.usage?.prompt_tokens ?? "?"
      } output_tokens=${response.usage?.completion_tokens ?? "?"} ms=${ms} finish=${finish}`
    );

    if (content) return content;

    // Empty content — diagnose loudly instead of silently returning "".
    if (finish === "length") {
      // Reasoning models burn the whole max_tokens budget on chain-of-thought and
      // emit no answer. Raising max_tokens does not help — use a non-reasoning model.
      throw new Error(
        `[llm] DeepSeek returned EMPTY content with finish_reason=length — the model ` +
          `exhausted the ${opts.maxTokens}-token budget on chain-of-thought before answering ` +
          `(this is a reasoning model). Use a non-reasoning model such as deepseek-chat. ` +
          `model=${model} usage=${JSON.stringify(response.usage)}`
      );
    }
    // Last resort: a reasoner that put its answer in reasoning_content.
    if (reasoning) return reasoning;
    throw new Error(
      `[llm] DeepSeek returned EMPTY content. id=${response.id} finish_reason=${finish} ` +
        `usage=${JSON.stringify(response.usage)}`
    );
  }

  // Anthropic (default) — reproduces the getClaude().messages.create pattern exactly:
  // a cached static block + an optional uncached per-request block (the pool).
  const t0 = Date.now();
  const message = await getClaude().messages.create(
    {
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
    },
    // Anthropic SDK accepts a per-request signal in the options arg.
    opts.signal ? { signal: opts.signal } : undefined
  );
  const ms = Date.now() - t0;

  console.log(
    `[llm-usage] provider=anthropic model=${NAMING_MODEL} input_tokens=${
      message.usage?.input_tokens ?? "?"
    } output_tokens=${message.usage?.output_tokens ?? "?"} ms=${ms} finish=${
      message.stop_reason ?? "?"
    }`
  );

  const textBlock = message.content.find((b) => b.type === "text");
  return textBlock && "text" in textBlock ? textBlock.text : "";
}
