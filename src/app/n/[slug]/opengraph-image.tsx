/**
 * /n/[slug]/opengraph-image — dynamic social-share card (1200x630)
 * ================================================================
 * The image a shared /n/<slug> link unfurls to on X / iMessage / WhatsApp etc.
 * Dark ink-paper aesthetic: the name's hanzi LARGE in serif, pinyin + the poem
 * line beneath, brand mark bottom-right.
 *
 * Chinese glyphs need a real CJK font — the default satori fonts have no hanzi.
 * We fetch a SUBSETTED Noto Serif SC from Google Fonts (only the glyphs we
 * render), which keeps the download tiny. The whole thing is wrapped so it can
 * NEVER 500: any failure (DB miss, font fetch, render) falls back to a
 * text-only card, and a missing row falls back to a generic brand card.
 */
import { ImageResponse } from "next/og";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { ApiResponse } from "@/types";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BG = "#1c1917"; // ink
const CREAM = "#FDFBF7"; // paper
const GOLD = "#C9A24B";
const MUTED = "#a8a29e";

/** Fetch a subsetted Google font as an ArrayBuffer (TTF). Vercel's documented
 * pattern: the css2 endpoint returns truetype for a server-side fetch, which
 * satori can parse. Throws on failure so the caller can fall back. */
async function loadGoogleFont(
  family: string,
  text: string
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(
    text
  )}`;
  const css = await (await fetch(url)).text();
  const resource = css.match(
    /src: url\((.+?)\) format\('(opentype|truetype)'\)/
  );
  if (!resource) throw new Error("font src not found");
  const res = await fetch(resource[1]);
  if (!res.ok) throw new Error("font download failed");
  return res.arrayBuffer();
}

function stripBraces(s: string): string {
  return s.replace(/[{}]/g, "");
}

/** Read the public generation with the ADMIN client (server-only, bypasses RLS).
 * OG crawlers are anonymous with no session cookie; the admin client guarantees
 * the read works regardless of RLS state. We still only touch safe fields. */
async function getResult(slug: string): Promise<ApiResponse | null> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("generations")
      .select("result")
      .eq("public_slug", slug)
      .eq("is_public", true)
      .maybeSingle();
    return (data?.result as ApiResponse) ?? null;
  } catch {
    return null;
  }
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }> | { slug: string };
}) {
  // params may be a promise (page routes) or a plain object (image routes);
  // awaiting a non-promise just returns it, so this is safe either way.
  const { slug } = await params;
  const result = await getResult(slug);
  const name = result?.names?.[0] ?? null;

  const hanzi = name ? stripBraces(name.hanzi) : "汉字";
  const pinyin = name?.pinyin ?? "";
  const poemLine = name?.culturalHeritage?.original
    ? stripBraces(name.culturalHeritage.original)
    : "";

  // Everything CJK we need to render → the font subset request.
  const cjkText = `${hanzi}${poemLine}名有其源和谐取名`;

  let fonts: { name: string; data: ArrayBuffer; weight: 400 | 700 }[] = [];
  try {
    const [bold, regular] = await Promise.all([
      loadGoogleFont("Noto+Serif+SC:wght@700", cjkText),
      loadGoogleFont("Noto+Serif+SC:wght@400", cjkText),
    ]);
    fonts = [
      { name: "Noto Serif SC", data: bold, weight: 700 },
      { name: "Noto Serif SC", data: regular, weight: 400 },
    ];
  } catch {
    // Font fetch failed → render with satori's default font. Hanzi may show as
    // tofu boxes, but the route still returns a valid image (never 500s).
    fonts = [];
  }

  const fontFamily = fonts.length ? "Noto Serif SC" : "serif";

  try {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: BG,
            padding: "70px 80px",
            fontFamily,
          }}
        >
          {/* brand mark */}
          <div
            style={{
              fontSize: 24,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: GOLD,
              fontWeight: 700,
            }}
          >
            HARMONYNAME
          </div>

          {/* the name */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 200,
                lineHeight: 1,
                color: CREAM,
                fontWeight: 700,
              }}
            >
              {hanzi}
            </div>
            {pinyin ? (
              <div
                style={{ fontSize: 40, color: MUTED, marginTop: 24 }}
              >
                {pinyin}
              </div>
            ) : null}
            {poemLine ? (
              <div
                style={{
                  fontSize: 34,
                  color: CREAM,
                  fontStyle: "italic",
                  marginTop: 28,
                  maxWidth: 900,
                }}
              >
                “{poemLine}”
              </div>
            ) : null}
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: 26,
              letterSpacing: 2,
              color: MUTED,
            }}
          >
            harmonyname.com
          </div>
        </div>
      ),
      { ...size, fonts: fonts.length ? fonts : undefined }
    );
  } catch {
    // Last-resort text-only card — guarantees the route never throws a 500.
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: BG,
            color: CREAM,
            fontSize: 60,
          }}
        >
          HarmonyName — a Chinese name with a real source
        </div>
      ),
      size
    );
  }
}
