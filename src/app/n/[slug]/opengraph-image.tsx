/**
 * /n/[slug]/opengraph-image — dynamic social-share card (1200x630)
 * ================================================================
 * The image a shared /n/<slug> link unfurls to on X / iMessage / WhatsApp etc.
 * Dark ink-paper aesthetic: the name's hanzi LARGE in brush calligraphy
 * (Ma Shan Zheng), pinyin + poem line in Noto Serif SC beneath it.
 *
 * Font loading strategy (both fonts use the same css2 subset technique):
 *   loadGoogleFont("Ma+Shan+Zheng", hanzi)       -- brush display for the name
 *   loadGoogleFont("Noto+Serif+SC:wght@400", ...) -- reading-size CJK + Latin
 * Each request is subset-fetched with only the glyphs we actually render,
 * keeping the per-render download tiny (a name + poem line = tens of KB).
 *
 * Never 500s: any failure (DB miss, either font fetch, render crash) falls
 * back gracefully — name falls back to Noto Serif SC, all fonts absent falls
 * back to satori's default font (tofu for hanzi, but a valid image), and a
 * missing DB row shows a generic brand card.
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

/**
 * Fetch a subsetted Google font as an ArrayBuffer (TTF).
 * The css2 endpoint returns a truetype src when fetched server-side, which
 * satori (the renderer behind next/og) can parse. Throws on failure so the
 * caller can degrade gracefully rather than hard-erroring.
 */
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
  const { slug } = await params;
  const result = await getResult(slug);
  const name = result?.names?.[0] ?? null;

  const hanzi = name ? stripBraces(name.hanzi) : "汉字";
  const pinyin = name?.pinyin ?? "";
  const poemLine = name?.culturalHeritage?.original
    ? stripBraces(name.culturalHeritage.original)
    : "";

  // Glyphs needed for the reading-size elements (Noto Serif SC subset)
  const notoText = `${poemLine}名有其源和谐取名`;

  // Font registry: brush for the large name display, noto for everything else.
  // Each is attempted independently; partial success still beats all-fallback.
  type FontEntry = { name: string; data: ArrayBuffer; weight: 400 | 700 };
  const fonts: FontEntry[] = [];

  // Ma Shan Zheng — brush-written kaishu for the big name display.
  // Only weight 400 is available for Ma Shan Zheng.
  try {
    const brushData = await loadGoogleFont("Ma+Shan+Zheng", hanzi);
    fonts.push({ name: "Ma Shan Zheng", data: brushData, weight: 400 });
  } catch {
    // Brush font failed — fall back to Noto Serif SC for the name block.
  }

  // Noto Serif SC — museum-caption serif for pinyin and poem line.
  try {
    const notoData = await loadGoogleFont(
      "Noto+Serif+SC:wght@400",
      notoText
    );
    fonts.push({ name: "Noto Serif SC", data: notoData, weight: 400 });
  } catch {
    // Noto failed — hanzi in the poem line may render as tofu boxes,
    // but the route still returns a valid image (never 500s).
  }

  // Name renders in brush if the font loaded; falls back to noto or satori default.
  const nameFontFamily =
    fonts.some((f) => f.name === "Ma Shan Zheng")
      ? "Ma Shan Zheng"
      : fonts.some((f) => f.name === "Noto Serif SC")
        ? "Noto Serif SC"
        : "serif";

  const bodyFontFamily = fonts.some((f) => f.name === "Noto Serif SC")
    ? "Noto Serif SC"
    : "serif";

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
            fontFamily: bodyFontFamily,
          }}
        >
          {/* Brand mark */}
          <div
            style={{
              fontSize: 24,
              letterSpacing: 8,
              textTransform: "uppercase",
              color: GOLD,
              fontWeight: 400,
              fontFamily: bodyFontFamily,
            }}
          >
            HARMONYNAME
          </div>

          {/* Name block — brush calligraphy at 160px */}
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
                fontSize: 160,
                lineHeight: 1,
                color: CREAM,
                fontWeight: 400,
                fontFamily: nameFontFamily,
              }}
            >
              {hanzi}
            </div>
            {pinyin ? (
              <div
                style={{
                  fontSize: 40,
                  color: MUTED,
                  marginTop: 24,
                  fontFamily: bodyFontFamily,
                }}
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
                  fontFamily: bodyFontFamily,
                }}
              >
                &ldquo;{poemLine}&rdquo;
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              fontSize: 26,
              letterSpacing: 2,
              color: MUTED,
              fontFamily: bodyFontFamily,
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
