import type { Metadata } from "next";
import { Lora, Ma_Shan_Zheng, Noto_Serif_SC } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

// Latin body serif — unchanged; provides the foundational text face.
const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
  display: "swap",
});

// Brush-written kaishu — the 毛笔 display face for hanzi at large sizes.
// preload:false is required for CJK Google Fonts (100+ unicode-range slices;
// the browser fetches only the glyph slices it actually renders — a name + one
// poem line ≈ 2-4 slices). Ma Shan Zheng is the only Google Fonts CJK that
// reads as dignified calligraphy rather than casual script.
const brush = Ma_Shan_Zheng({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brush-gf",
  preload: false,
});

// Museum-caption serif for reading-size Chinese (poem lines, poet names, titles).
// Noto Serif SC is the Adobe/Google co-developed Source Han Serif — the only
// free CJK serif with genuine multi-weight dignity.
const hanziSerif = Noto_Serif_SC({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-hanzi-gf",
  preload: false,
});

const SITE_DESCRIPTION =
  "A Chinese name with a real source. Every character is verified to come from a real line of classical poetry — read from your birth chart (Bāzì), never invented.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "HarmonyName — A Chinese name with a real source",
    template: "%s · HarmonyName",
  },
  description: SITE_DESCRIPTION,
  icons: {
    icon: "/icon.png",
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
    // lang="en" is correct — UI prose is English; individual hanzi spans carry
    // lang="zh-Hans" to ensure correct glyph variants.
    <html lang="en">
      <body
        className={`${lora.className} ${brush.variable} ${hanziSerif.variable} antialiased bg-paper text-ink`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
