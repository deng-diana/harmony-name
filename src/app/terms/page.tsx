import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — HarmonyName",
  description:
    "The terms that govern your use of HarmonyName, a web app that generates Chinese given names for cultural and entertainment purposes.",
};

/**
 * Terms of Service — self-contained Server Component.
 *
 * Styling mirrors the landing + login pages:
 *  - background #FDFBF7
 *  - font-serif bold headings, stone-900 / stone-600 body text
 *  - rounded cards with stone-100 borders
 *
 * NOTE: This is a starting template. Several values are intentionally left as
 * visible 【CONFIRM: ...】 placeholders for the owner to fill in, and a UK
 * solicitor should review the whole document before it is relied upon.
 */

// One reusable section block. The italic summary is the plain-English
// "what this means" line the owner asked for (dyslexia-friendly).
function Section({
  n,
  title,
  summary,
  children,
}: {
  n: number;
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 scroll-mt-24" id={`section-${n}`}>
      <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-3">
        {n}. {title}
      </h2>
      <p className="italic text-stone-500 mb-5 leading-relaxed">
        {summary}
      </p>
      <div className="space-y-4 text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900">
      <div className="max-w-3xl mx-auto px-5 py-16 md:py-24">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/"
            className="inline-block text-sm text-stone-500 hover:text-stone-900 transition mb-8"
          >
            ← Back to home
          </Link>

          <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4 leading-tight">
            Terms of Service
          </h1>

          <p className="text-stone-600 mb-2">
            For <strong>HarmonyName</strong> (the website at{" "}
            <strong>harmonyname.com</strong>).
          </p>

          <p className="text-sm text-stone-500">
            <strong>Last updated:</strong> 【CONFIRM date】
          </p>

          {/* Visible draft warning */}
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm text-amber-800 italic leading-relaxed">
              This is a starting template. Please have a UK solicitor review it
              before relying on it.
            </p>
          </div>
        </header>

        {/* Plain intro */}
        <div className="mb-12 space-y-4 text-stone-700 leading-relaxed">
          <p>
            These Terms of Service (the &ldquo;Terms&rdquo;) are an agreement
            between you and us. They explain the rules for using HarmonyName.
          </p>
          <p>
            HarmonyName is run by a sole trader based in the United Kingdom (a
            single person, not a company). Where these Terms say &ldquo;we,
            &rdquo; &ldquo;us,&rdquo; or &ldquo;our,&rdquo; they mean that
            person: 【CONFIRM: operator&rsquo;s full legal name】.
          </p>
          <p>
            Please read these Terms carefully. If you do not agree with them,
            please do not use HarmonyName.
          </p>
        </div>

        {/* Sections */}
        <Section
          n={1}
          title="Accepting These Terms"
          summary="By using HarmonyName, you agree to these rules."
        >
          <p>
            When you create an account, buy credits, or generate a name, you
            accept these Terms. If you are using HarmonyName for someone else,
            you confirm you have the right to do so.
          </p>
          <p>
            If we update these Terms, the new version applies from the date we
            post it. If you keep using HarmonyName after a change, that counts
            as accepting the new Terms.
          </p>
        </Section>

        <Section
          n={2}
          title="Who Can Use HarmonyName"
          summary="You must be 18 or older, or have a parent or guardian's permission."
        >
          <p>
            You must be at least 18 years old to use HarmonyName on your own. If
            you are under 18, you may only use it with the consent and
            supervision of a parent or guardian, who agrees to these Terms on
            your behalf.
          </p>
          <p>
            You also confirm that the information you give us (such as your email
            and the birth details you enter) is accurate to the best of your
            knowledge.
          </p>
        </Section>

        <Section
          n={3}
          title="What HarmonyName Does"
          summary="It suggests Chinese names by blending BaZi astrology with AI and classical poetry. It is for fun and culture, not advice."
        >
          <p>
            HarmonyName is a web application (a &ldquo;web app&rdquo;) that
            generates Chinese given names. It does this by combining{" "}
            <strong>
              BaZi (八字, the Chinese &ldquo;Four Pillars&rdquo; system of
              astrology)
            </strong>{" "}
            with artificial intelligence (AI) that draws on classical Chinese
            poetry.
          </p>
          <p>
            The names, meanings, and analysis are creative suggestions. You are
            free to use them, change them, or ignore them. You do not have to act
            on anything HarmonyName produces.
          </p>
        </Section>

        <Section
          n={4}
          title="Your Account and Security"
          summary="Keep your login safe. You are responsible for what happens on your account."
        >
          <p>
            You can sign in with an email address and password, or with a Google
            account. You are responsible for keeping your login details secret
            and for all activity that happens under your account.
          </p>
          <p>
            Please tell us as soon as possible if you think someone else has
            accessed your account. We may suspend or close an account if we
            believe it is being used to break these Terms.
          </p>
        </Section>

        <Section
          n={5}
          title="Credits and Payment"
          summary="You buy prepaid credits with Stripe. Each name generation uses credits. Credits have no cash value and cannot be transferred."
        >
          <p>
            HarmonyName uses a prepaid credit system. You buy{" "}
            <strong>credits</strong> in advance, and each name generation uses up
            some credits. We will show you the credit cost before you buy.
          </p>
          <p>
            Payments are handled by <strong>Stripe</strong>, a third-party
            payment provider. We do not store your full card details. Your use of
            Stripe is also subject to Stripe&rsquo;s own terms.
          </p>
          <p>Credits are digital and are added to your account straight away.</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Credits are only for use inside HarmonyName.</li>
            <li>Credits have no cash value and cannot be exchanged for money.</li>
            <li>
              Credits are personal to your account. You cannot transfer, sell, or
              give them to anyone else.
            </li>
            <li>
              Once a credit has been used to generate a name, it has been spent.
            </li>
          </ul>
          <p>
            <strong>Your legal cancellation rights.</strong> Credits are digital
            content delivered immediately. Under UK consumer law (the{" "}
            <strong>Consumer Rights Act 2015</strong> and related rules), you may
            have a normal 14-day right to change your mind. By buying credits and
            asking for them to be made available straight away, you agree that
            delivery begins at once. This can affect that 14-day right for
            credits you have already used. Nothing here removes any legal right
            you cannot waive.{" "}
            <span className="text-stone-500 italic">
              【CONFIRM: your refund policy — for example, do you refund unused
              credits? A solicitor should confirm the wording here.】
            </span>
          </p>
        </Section>

        <Section
          n={6}
          title="Acceptable Use"
          summary="Use HarmonyName normally and fairly. Do not abuse it, copy it in bulk, or resell it."
        >
          <p>When you use HarmonyName, you agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              Scrape, copy in bulk, or harvest data from the service using bots
              or automated tools.
            </li>
            <li>
              Resell, rent out, or commercially redistribute the service or its
              output as your own product.
            </li>
            <li>
              Try to break, overload, hack, or get around the security of the
              service.
            </li>
            <li>
              Use the service to break the law, or to create content that is
              hateful, harassing, or harmful.
            </li>
            <li>Use someone else&rsquo;s payment details without permission.</li>
          </ul>
          <p>
            We may limit, suspend, or end your access if you break these rules.
          </p>
        </Section>

        <Section
          n={7}
          title="Intellectual Property and Your Names"
          summary="The names you generate are yours to use personally. The app itself, and its brand, stay ours. The poetry sources are public-domain references."
        >
          <p>
            The names HarmonyName generates for you are for your{" "}
            <strong>personal use</strong>. You are free to use them in your daily
            life.
          </p>
          <p>
            The classical Chinese poems we draw on are old works that are in the
            public domain. We reference them for cultural context. We do not claim
            to own those original poems.
          </p>
          <p>
            Everything else — the HarmonyName name, logo, website, software, and
            design — belongs to us (or to the people who license it to us). You
            may not copy or reuse those parts without our permission.
          </p>
        </Section>

        <Section
          n={8}
          title="Entertainment Only — No Guarantees or Warranties"
          summary="HarmonyName is for fun and culture. It is not professional advice and does not promise any outcome about your life, luck, or destiny."
        >
          <p>
            HarmonyName is provided for{" "}
            <strong>cultural and entertainment purposes only</strong>.
          </p>
          <p>
            It is <strong>not</strong> professional advice of any kind. It is not
            medical, legal, financial, psychological, or genuine fortune-telling
            advice. You should not make important life decisions based on it.
          </p>
          <p>
            We make <strong>no guarantee</strong> about destiny, luck, fortune,
            success, or any other outcome. BaZi and Five Elements analysis are
            traditional cultural practices, not science.
          </p>
          <p>
            As far as the law allows, HarmonyName is provided &ldquo;as is&rdquo;
            and &ldquo;as available.&rdquo; We do not promise that it will always
            work without errors, or that every name or meaning will be perfectly
            accurate.
          </p>
        </Section>

        <Section
          n={9}
          title="Limitation of Liability"
          summary="If something goes wrong, our responsibility is limited as far as the law allows. We never try to limit liability that the law says cannot be limited."
        >
          <p>
            To the fullest extent allowed by law, we are not liable for indirect
            or unexpected losses (such as lost profit, lost data, or lost
            opportunity) that come from using HarmonyName.
          </p>
          <p>
            Nothing in these Terms limits or excludes our liability for things
            that the law does not let us limit. This includes liability for{" "}
            <strong>
              death or personal injury caused by our negligence
            </strong>
            , for <strong>fraud</strong> or fraudulent misrepresentation, or for
            any other liability that cannot legally be excluded — including your
            rights under the Consumer Rights Act 2015.
          </p>
          <p>
            Where our liability cannot be excluded but can be limited, our total
            liability to you will not be more than the amount you paid us in the{" "}
            <strong>
              【CONFIRM: liability cap period, e.g. 12 months】
            </strong>{" "}
            before the issue arose.{" "}
            <span className="text-stone-500 italic">
              (A solicitor should confirm this cap is fair and enforceable.)
            </span>
          </p>
        </Section>

        <Section
          n={10}
          title="Changes to the Service or These Terms"
          summary="We may update the app and these Terms over time. Big changes will be posted here."
        >
          <p>
            We are always improving HarmonyName, so features may be added,
            changed, or removed. We may also update these Terms from time to time,
            for example to follow new laws or to reflect new features.
          </p>
          <p>
            When we change these Terms, we will update the &ldquo;Last
            updated&rdquo; date at the top. For important changes, we will try to
            give you reasonable notice.
          </p>
        </Section>

        <Section
          n={11}
          title="Ending Your Use"
          summary="You can stop any time. We can also close an account that breaks these Terms."
        >
          <p>
            You can stop using HarmonyName at any time and close your account.
          </p>
          <p>
            We may suspend or close your account if you break these Terms, if we
            are required to by law, or if we decide to stop offering the service.
            If we close your account without good reason, we will deal fairly with
            any credits you have already paid for.{" "}
            <span className="text-stone-500 italic">
              【CONFIRM: what happens to unused credits when an account closes】
            </span>
          </p>
        </Section>

        <Section
          n={12}
          title="Governing Law and Disputes"
          summary="These Terms follow the law of England and Wales. We would like to sort out any problem with you directly first."
        >
          <p>
            These Terms, and any dispute arising from them, are governed by the
            law of <strong>England and Wales</strong>. The courts of England and
            Wales will have jurisdiction.
          </p>
          <p>
            If you live elsewhere in the United Kingdom, you may still benefit
            from any mandatory consumer protections of your home nation, and this
            clause does not take those away.
          </p>
          <p>
            If you are unhappy, please contact us first — we will try to resolve
            things quickly and fairly before any formal dispute.
          </p>
        </Section>

        <Section
          n={13}
          title="How to Contact Us"
          summary="Email us if you have any questions about these Terms."
        >
          <p>
            If you have a question about these Terms or about HarmonyName, please
            email us at:
          </p>
          <p>
            <strong>
              【CONFIRM: support email, e.g. support@harmonyname.com】
            </strong>
          </p>
          <p className="text-stone-500 text-sm">
            Operated by a UK-based sole trader:{" "}
            【CONFIRM: operator&rsquo;s full legal name】.
          </p>
        </Section>

        {/* Footer link back */}
        <div className="mt-16 pt-8 border-t border-stone-200 text-center">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-900 transition"
          >
            ← Back to home
          </Link>
          <p className="text-xs text-stone-400 mt-4">
            © {new Date().getFullYear()} HarmonyName
          </p>
        </div>
      </div>
    </div>
  );
}
