/**
 * 环境变量校验 (5.4)
 * ==================
 * 启动时检查【必需】的环境变量是否存在,缺失就在日志里清晰报出来,
 * 避免"配置漏了却跑起来、到运行时才神秘报错"。
 *
 * 注意:这里只校验"是否存在/格式",不校验 key 的有效性
 * (例如 CLAUDE_API_KEY 被吊销这种,只有真正调用时才知道)。
 *
 * Upstash / Sentry 等是【可选】的(没配会优雅降级),故不在必需列表里。
 */
import { z } from "zod";

const serverEnvSchema = z.object({
  CLAUDE_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
});

export function validateServerEnv(): void {
  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const bad = result.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    console.error(
      `[env] Missing or invalid required environment variables: ${bad}. ` +
        `Check .env.local (and Vercel project env vars in production).`
    );
  }
}
