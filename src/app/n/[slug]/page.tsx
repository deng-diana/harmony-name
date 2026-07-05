/**
 * /n/[slug] — PUBLIC shareable result page (the viral loop)
 * =========================================================
 * A single generated result rendered for ANYONE (no auth). This is a landing
 * page in disguise: a friend shares their name, a stranger lands here, sees a
 * beautiful sourced name, and hits the CTA to make their own.
 *
 * DATA ACCESS — least privilege:
 *   We read with a COOKIELESS, pure-anon Supabase client (no session), NOT the
 *   cookie-bound server client and NOT the service-role admin. Why cookieless:
 *   migration 013's public-read policy is scoped to the `anon` role ONLY. A
 *   logged-in visitor using the cookie-bound client would run as `authenticated`
 *   and could not see public rows (that policy intentionally excludes
 *   authenticated to avoid leaking other users' birth data), so the page would
 *   404 for them. Reading as pure anon makes every visitor take the same
 *   column-restricted path.
 *
 *   Defense in depth: migration 013 also GRANTs anon SELECT on only the safe
 *   columns (id, created_at, result, public_slug, is_public), so the database
 *   itself rejects any read of `input` (birth data) or `user_id`. We STILL
 *   select only safe columns here. Do not add `input`/`user_id` below.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { ApiResponse, NameOption } from "@/types";
import { NameCard } from "@/components/NameCard";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

type GenerationResult = {
  id: string;
  created_at: string;
  result: ApiResponse;
  public_slug: string;
};

/** A cookieless, session-less anon client. It carries NO user identity, so the
 * read always runs under the `anon` role — the only role migration 013 lets
 * SELECT public rows, and the role whose column grants exclude birth data. */
function anonClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

/** Fetch a public generation by slug. Returns null if missing / not public. */
async function getPublicGeneration(
  slug: string
): Promise<GenerationResult | null> {
  const supabase = anonClient();
  const { data, error } = await supabase
    .from("generations")
    // SAFE COLUMNS ONLY — never `input` (birth data). See file header.
    .select("id, created_at, result, public_slug")
    .eq("public_slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as GenerationResult;
}

function firstName(gen: GenerationResult): NameOption | null {
  return gen.result?.names?.[0] ?? null;
}

function cleanHanzi(name: NameOption): string {
  return name.hanzi.replace(/[{}]/g, "");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const gen = await getPublicGeneration(slug);
  const name = gen && firstName(gen);

  if (!name) {
    return {
      title: "Name not found",
      robots: { index: false },
    };
  }

  const hanzi = cleanHanzi(name);
  // Writer spec verbatim: "found in a real poem" over "with a real source"
  const title = `${hanzi} — a Chinese name found in a real poem`;
  const description = `${hanzi} (${name.pinyin}): ${name.poeticMeaning}`;

  return {
    title,
    description,
    alternates: { canonical: `/n/${slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/n/${slug}`,
      images: [
        {
          url: `/n/${slug}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: `${hanzi} — HarmonyName`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/n/${slug}/opengraph-image`],
    },
  };
}

export default async function PublicNamePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gen = await getPublicGeneration(slug);
  if (!gen) notFound();

  const names = gen.result?.names ?? [];
  const lead = names[0];
  const headingHanzi = lead ? cleanHanzi(lead) : "";

  return (
    <div className="min-h-screen bg-paper py-12 px-4 sm:px-6 font-sans text-ink">
      <main className="mx-auto max-w-3xl">
        <header className="text-center mb-12 animate-fade-in-up">
          <div className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold mb-4">
            ✦ HarmonyName
          </div>

          {/* Lead name huge in brush — the name speaks for itself */}
          {headingHanzi && (
            <div
              className="font-brush text-8xl md:text-9xl text-ink text-center leading-none mb-4 animate-reveal"
              lang="zh-Hans"
            >
              {headingHanzi}
            </div>
          )}

          {/* Writer spec verbatim: "a name found in a poem" */}
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-ink mb-3">
            {headingHanzi
              ? "— a name found in a poem"
              : "A Chinese name found in a real poem"}
          </h1>

          {/* Subline — writer spec verbatim */}
          <p className="text-sm text-ink-faint italic max-w-md mx-auto leading-relaxed">
            Made with HarmonyName from the bearer&apos;s birth chart. Every
            character below is traced to a real line of classical Chinese
            poetry — poet, dynasty, and all.
          </p>
        </header>

        <div className="grid gap-8">
          {names.map((name, index) => (
            <div
              key={index}
              className="animate-reveal"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {/* readOnly: no auth here; hide play/share/save (they need a session) */}
              <NameCard name={name} index={index} readOnly />
            </div>
          ))}
        </div>

        {/* CTA — the whole point of the public page: convert a viewer into a user.
            Writer spec verbatim copy. */}
        <div className="text-center mt-16 mb-8 animate-fade-in-up">
          <div className="bg-paper-raised rounded-2xl p-8 md:p-10 shadow-soft border border-mist/70">
            {/* Cue brush glyph — 缘 (fate / connection) */}
            <p className="font-brush text-4xl text-gold-soft mb-3" aria-hidden lang="zh-Hans">
              缘
            </p>
            {/* Writer spec verbatim h2 */}
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-ink mb-2">
              Your name is in there too.
            </h2>
            {/* Writer spec verbatim body */}
            <p className="text-ink-soft mb-6">
              Somewhere in centuries of classical poetry there&apos;s a name
              that fits your birth chart. Your first three are free.
            </p>
            <Link href="/app">
              {/* Writer spec: drop the ALL-CAPS YOUR; possessive is carried by "in there too" */}
              <Button size="lg" className="w-full sm:w-auto">
                Find my name — first 3 free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
