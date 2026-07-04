"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 登录后去向:只接受【站内相对路径】(必须以单个 "/" 开头,排除 "//" 和 "/\\" 协议相对 URL),
  // 与 /auth/callback 的服务端校验同一套规则,防开放重定向(钓鱼)。默认回 /app。
  const [next, setNext] = useState("/app");

  // 如果从 /auth/callback 出错跳回来 (?error=oauth),给个友好提示;并读取合法的 ?next。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") {
      setError("Google sign-in failed. Please try again.");
    }
    const rawNext = params.get("next");
    if (rawNext && /^\/(?![/\\])/.test(rawNext)) {
      setNext(rawNext);
    }
  }, []);

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Google 授权后,Supabase 会把用户带着 ?code= 跳回这个地址;
        // 带上 ?next 让回调完成后回到原来的去向(callback 服务端会再校验一次)。
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });
    // 成功时浏览器会自动跳去 Google,不会执行到下面;只有出错才会
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // 如果后台开了"邮箱确认",signUp 不会直接返回 session
        if (!data.session) {
          setNotice("Account created. Please check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      // 关键: refresh() 让 Server Components 重新读取最新登录态
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center px-4 font-sans text-stone-900">
      <Link href="/" className="text-3xl font-serif font-bold mb-2">
        HarmonyName
      </Link>
      <p className="text-stone-500 text-sm mb-8">
        {mode === "signin" ? "Welcome back" : "Create your account"}
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-stone-100"
      >
        <div className="mb-5">
          <label className="block text-xs font-bold uppercase tracking-wide mb-2">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-soft"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold uppercase tracking-wide mb-2">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl outline-none focus:ring-2 focus:ring-stone-900 transition-soft"
            placeholder="At least 6 characters"
          />
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg p-3">
            {notice}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 text-white py-4 rounded-xl font-bold hover:bg-stone-800 active:scale-[0.98] transition-soft shadow-lg disabled:opacity-50"
        >
          {loading
            ? "Please wait..."
            : mode === "signin"
            ? "Sign in"
            : "Sign up"}
        </button>

        {/* 分隔线 */}
        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-stone-200" />
          <span className="text-xs text-stone-400 uppercase tracking-wide">or</span>
          <div className="h-px flex-1 bg-stone-200" />
        </div>

        {/* Google 登录 */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-stone-200 bg-white py-3.5 rounded-xl font-medium text-stone-700 hover:bg-stone-50 active:scale-[0.98] transition-soft disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.48 14.97.5 12 .5A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z" />
          </svg>
          Continue with Google
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setError(null);
            setNotice(null);
          }}
          className="w-full mt-4 text-sm text-stone-500 hover:text-stone-900 transition"
        >
          {mode === "signin"
            ? "No account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
