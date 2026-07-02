import type { Metadata } from "next";
// 1. 引入 Google 的 Lora 字体
import { Lora } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// 2. 配置 Lora
// subsets: ['latin'] 是必须的
// variable: 给它起个 CSS 变量名，方便在 Tailwind 里用（虽然我们这里直接用 className）
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"], // 加载这些粗细度
  style: ["normal", "italic"], // 支持斜体（你的诗句引用需要斜体）
  variable: "--font-lora",
  display: "swap", // 字体没加载完前先显示系统字体，防止白屏
});

const SITE_DESCRIPTION =
  "A Chinese name with a real source. Every character is verified to come from a real line of classical poetry — read from your birth chart (Bāzì), never invented.";

export const metadata: Metadata = {
  metadataBase: new URL("https://harmonyname.com"),
  title: {
    default: "HarmonyName — A Chinese name with a real source",
    template: "%s · HarmonyName",
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/icon.png", // 确保你把 logo 复制并改名为 icon.png 放在 src/app/ 下
  },
  openGraph: {
    type: "website",
    siteName: "HarmonyName",
    title: "HarmonyName — A Chinese name with a real source",
    description: SITE_DESCRIPTION,
    url: "/",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "HarmonyName" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HarmonyName — A Chinese name with a real source",
    description: SITE_DESCRIPTION,
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 3. 把字体应用到全身 */}
      {/* lora.className: 应用字体 */}
      {/* antialiased: 让字体边缘更平滑（抗锯齿），看起来更高级 */}
      <body className={`${lora.className} antialiased bg-[#FDFBF7] text-stone-900`}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

