/**
 * /n/[slug] — PUBLIC shareable result page (the viral loop)
 * =========================================================
 * A single generated result rendered for ANYONE (no auth). This is a landing
 * page in disguise: a friend shares their name, a stranger lands here, sees a
 * beautiful sourced name, and hits the CTA to make their own.
 *
 * DATA ACCESS — least privilege:
 *   We read with the ANON server client (RLS-bound), NOT the service-role admin.
 *   Migration 013 adds a policy allowing anon SELECT of rows WHERE is_public.
 *   We select ONLY safe columns — id, created_at, result, public_slug. We NEVER
 *   select or render the `input` column: it holds the bearer's birth data
 *   (date/time/place/gender). RLS is row-level and cannot hide that column, so
 *   NOT selecting it is the guard. Do not add `input` to the select below.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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

/** Fetch a public generation by slug. Returns null if missing / not public. */
async function getPublicGeneration(
  slug: string
): Promise<GenerationResult | null> {
  const supabase = await createClient();
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
  const title = `${hanzi} — a Chinese name with a real source`;
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
          <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-ink mb-3">
            {headingHanzi ? (
              <>
                &laquo;{headingHanzi}&raquo; — a Chinese name with a real source
              </>
            ) : (
              "A Chinese name with a real source"
            )}
          </h1>
          <p className="text-sm text-ink-faint italic">
            Generated with HarmonyName from the bearer&apos;s birth chart. Every
            character is traced to a real line of classical poetry.
          </p>
        </header>

        <div className="grid gap-8">
          {names.map((name, index) => (
            <div
              key={index}
              className="animate-reveal"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              {/* readOnly: no auth here, hide play/share/save (they need a session) */}
              <NameCard name={name} index={index} readOnly />
            </div>
          ))}
        </div>

        {/* CTA — the whole point of the public page: convert a viewer into a user */}
        <div className="text-center mt-16 mb-8 animate-fade-in-up">
          <div className="bg-paper-raised rounded-2xl p-8 md:p-10 shadow-soft border border-mist/70">
            <h2 className="text-xl md:text-2xl font-serif font-semibold text-ink mb-2">
              Find YOUR name
            </h2>
            <p className="text-ink-soft mb-6">
              Read from your own birth chart. Your first 3 are free.
            </p>
            <Link href="/app">
              <Button size="lg" className="w-full sm:w-auto">
                Find YOUR name — first 3 free <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
