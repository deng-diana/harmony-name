import type { Metadata } from "next";
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