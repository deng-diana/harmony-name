import type { Metadata } from "next";
// 1. 引入 Google 衬线字体
import { Lora } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
  title: "HarmonyName",
  description: "Chinese Naming AI for everyone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}