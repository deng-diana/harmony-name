import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — HarmonyName",
  description:
    "How HarmonyName collects, uses, and protects your personal data under UK GDPR and the Data Protection Act 2018.",
};

/**
 * Privacy Policy page.
 *
 * Plain-English, dyslexia-friendly layout: each major section opens with a
 * one-line italic summary, then the detail. Abbreviations are spelled out on
 * first use. Operated by a UK-based individual sole trader; the full legal
 * name is pending confirmation (see TODO(owner) comments).
 */

function Summary({ children }: { children: React.ReactNode }) {
  return (
    <p className="italic text-stone-500 mb-4 leading-relaxed">{children}</p>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mb-12 scroll-mt-24">
      <h2 className="text-2xl font-serif font-bold text-stone-900 mb-3">
        {title}
      </h2>
      <div className="text-stone-700 leading-relaxed space-y-4">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900">
      <div className="max-w-2xl mx-auto px-4 py-16 md:py-24">
        {/* Header */}
        <header className="mb-12">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-900 transition inline-block mb-8"
          >
            ← Back to home
          </Link>

          <h1 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4 leading-tight">
            Privacy Policy
          </h1>

          <p className="text-stone-600 mb-2">
            <strong>Last updated: 2 July 2026</strong>
          </p>

          <p className="mt-6 text-stone-700 leading-relaxed">
            This policy explains how <strong>HarmonyName</strong> (the website
            at <strong>harmonyname.com</strong>) collects, uses, and protects
            your personal data. It is written to follow{" "}
            <strong>
              UK GDPR (the United Kingdom General Data Protection Regulation)
            </strong>{" "}
            and the{" "}
            <strong>Data Protection Act 2018</strong> (the United Kingdom&apos;s
            main data protection law).
          </p>
        </header>

        <main>
          {/* 1. Who we are */}
          <Section id="who-we-are" title="1. Who we are (the data controller)">
            <Summary>
              In short: HarmonyName is run by one person in the United Kingdom,
              and that person decides how your data is used.
            </Summary>
            <p>
              HarmonyName is a trading name operated by a UK-based{" "}
              <strong>sole trader</strong> (an individual running a business, not
              a registered company).
            </p>
            <p>
              For data protection law, that individual is the{" "}
              <strong>&ldquo;data controller&rdquo;</strong> &mdash; the person
              who decides how and why your personal data is used.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Data controller:</strong> an individual sole trader
                based in the United Kingdom
                {/* TODO(owner): replace with full legal name after confirmation */}
              </li>
              <li>
                <strong>Trading name:</strong> HarmonyName
              </li>
              <li>
                <strong>Website:</strong> harmonyname.com
              </li>
              <li>
                <strong>Contact email:</strong>{" "}
                <a
                  href="mailto:dengdan01@gmail.com"
                  className="underline hover:text-stone-900"
                >
                  dengdan01@gmail.com
                </a>
              </li>
            </ul>
            <p>
              If you have any question about this policy or your data, please
              email us at the address above.
            </p>
          </Section>

          {/* 2. What we do */}
          <Section id="what-we-do" title="2. What HarmonyName does">
            <Summary>
              In short: we use your birth details and AI (artificial
              intelligence) to suggest Chinese names.
            </Summary>
            <p>
              HarmonyName generates Chinese given names. We do this by combining{" "}
              <strong>BaZi (八字, Chinese &ldquo;Four Pillars&rdquo; astrology)</strong>{" "}
              with AI (artificial intelligence) that draws on classical Chinese
              poetry.
            </p>
            <p>
              You buy <strong>credits</strong> up front (a prepaid model), and
              each name generation uses credits.
            </p>
          </Section>

          {/* 3. What data we collect */}
          <Section id="data-we-collect" title="3. What data we collect">
            <Summary>
              In short: your email, your birth details, your purchase history,
              and the names we generate for you.
            </Summary>

            <h3 className="font-bold text-stone-900 mt-2">Account data</h3>
            <p>
              Your email address. If you sign in with Google, we also receive
              basic Google account profile information (such as your name and
              email) from Google.
            </p>

            <h3 className="font-bold text-stone-900 mt-4">Birth data</h3>
            <p>
              Your <strong>birth date</strong>, <strong>birth time</strong>, and{" "}
              <strong>birth city / location</strong> (including longitude and
              timezone). We use this to work out your BaZi chart.
            </p>
            <p>
              Your BaZi chart is first calculated inside your own web browser.
              However, the inputs you give us and the result that is produced are
              then sent to our server so we can generate names for you.
            </p>

            <h3 className="font-bold text-stone-900 mt-4">Purchase history</h3>
            <p>
              Which credit packs you bought. Your{" "}
              <strong>card details are handled by Stripe</strong> (our payment
              provider) and are <strong>not stored by HarmonyName</strong>.
            </p>

            <h3 className="font-bold text-stone-900 mt-4">
              Generated names and analysis
            </h3>
            <p>
              The names we generate for you, and the related analysis, are saved
              and linked to your account.
            </p>
          </Section>

          {/* 4. How and why we use data + lawful bases */}
          <Section
            id="how-we-use"
            title="4. How and why we use your data (and our lawful bases)"
          >
            <Summary>
              In short: mostly to deliver the service you paid for, and partly to
              keep the service safe.
            </Summary>
            <p>
              Under UK GDPR we must have a valid reason (a{" "}
              <strong>&ldquo;lawful basis&rdquo;</strong>) for using your data.
              Here is how we use your data and the lawful basis for each use:
            </p>
            <ul className="list-disc pl-6 space-y-3">
              <li>
                <strong>To create and run your account, and to generate names.</strong>{" "}
                Lawful basis: <strong>performance of a contract</strong> &mdash;
                we need this data to give you the service you signed up and paid
                for.
              </li>
              <li>
                <strong>To take payment and manage your credits.</strong> Lawful
                basis: <strong>performance of a contract</strong>.
              </li>
              <li>
                <strong>
                  To keep the service secure and prevent abuse
                </strong>{" "}
                (for example, rate limiting to stop misuse). Lawful basis:{" "}
                <strong>legitimate interests</strong> &mdash; it is in our
                reasonable interest to protect the service and our users.
              </li>
              <li>
                <strong>To meet legal and accounting duties</strong> (for
                example, keeping records of sales). Lawful basis:{" "}
                <strong>legal obligation</strong>.
              </li>
              <li>
                <strong>Anything you have specifically agreed to</strong> (for
                example, optional emails). Lawful basis:{" "}
                <strong>consent</strong> &mdash; you can withdraw this at any
                time.
              </li>
            </ul>
          </Section>

          {/* 5. Who we share with */}
          <Section
            id="who-we-share-with"
            title="5. Who we share your data with"
          >
            <Summary>
              In short: we use a small set of trusted companies to run the
              service. We do not sell your data.
            </Summary>
            <p>
              We do <strong>not</strong> sell your personal data. We share it
              only with the service providers (called{" "}
              <strong>&ldquo;processors&rdquo;</strong>) that we need to run
              HarmonyName. Each one only handles your data to do its job for us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Stripe</strong> &mdash; payment processing (handles your
                card details securely).
              </li>
              <li>
                <strong>Supabase</strong> &mdash; user authentication (sign-in)
                and database hosting (stores your account data).
              </li>
              <li>
                <strong>OpenAI</strong> &mdash; creates text &ldquo;embeddings&rdquo;
                (a numeric form of text) to find poetry that matches your
                profile.
              </li>
              <li>
                <strong>Anthropic (Claude)</strong> &mdash; the AI (artificial
                intelligence) model that writes the names.
              </li>
              <li>
                <strong>Vercel</strong> &mdash; website hosting (runs and serves
                the website).
              </li>
              <li>
                <strong>Upstash</strong> &mdash; rate limiting (helps stop misuse
                of the service).
              </li>
            </ul>
            <p>
              To generate names, your <strong>birth data</strong> and the
              generation prompts may be sent to <strong>OpenAI</strong> and{" "}
              <strong>Anthropic (Claude)</strong>.
            </p>
          </Section>

          {/* 6. International transfers */}
          <Section
            id="international-transfers"
            title="6. Sending data outside the UK"
          >
            <Summary>
              In short: some of our providers are based abroad, so your data may
              be processed outside the United Kingdom.
            </Summary>
            <p>
              Some of our processors (for example,{" "}
              <strong>OpenAI</strong>, <strong>Anthropic</strong>, and{" "}
              <strong>Vercel</strong>) may process your data{" "}
              <strong>
                outside the UK (United Kingdom) and the EEA (European Economic
                Area)
              </strong>
              , such as in the United States.
            </p>
            <p>
              When this happens, we rely on appropriate safeguards required by UK
              data protection law &mdash; for example,{" "}
              <strong>Standard Contractual Clauses</strong> (approved legal terms
              that protect your data) or the UK&apos;s{" "}
              <strong>International Data Transfer Agreement</strong>, and (where
              relevant) UK &ldquo;adequacy&rdquo; decisions &mdash; so your data
              keeps a similar level of protection.
            </p>
          </Section>

          {/* 7. Retention */}
          <Section id="retention" title="7. How long we keep your data">
            <Summary>
              In short: we keep your data only as long as we need it, then delete
              it.
            </Summary>
            <p>
              We keep your personal data only for as long as we need it to
              provide the service and to meet our legal duties. After that, we
              delete it or make it anonymous.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account and birth data:</strong> kept while your
                account exists. When you delete your account, or ask us to
                delete your data by emailing our support address, we delete it.
              </li>
              <li>
                <strong>Generated names and analysis:</strong> your generation
                history (including the birth details you entered) is stored
                until you delete your account or request deletion via our
                support email.
              </li>
              <li>
                <strong>Purchase / billing records:</strong> retained as
                required by UK tax law (around 6 years).
              </li>
            </ul>
            <p>
              When you close your account, we will delete or anonymise your data,
              except where we must keep some of it by law (such as accounting
              records).
            </p>
          </Section>

          {/* 8. Your rights */}
          <Section id="your-rights" title="8. Your rights">
            <Summary>
              In short: you have strong rights over your data, and you can
              contact us to use them.
            </Summary>
            <p>Under UK GDPR you have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Access</strong> &mdash; ask for a copy of the data we
                hold about you.
              </li>
              <li>
                <strong>Rectification</strong> &mdash; ask us to correct data
                that is wrong or incomplete.
              </li>
              <li>
                <strong>Erasure</strong> &mdash; ask us to delete your data
                (sometimes called the &ldquo;right to be forgotten&rdquo;).
              </li>
              <li>
                <strong>Restriction</strong> &mdash; ask us to pause our use of
                your data.
              </li>
              <li>
                <strong>Objection</strong> &mdash; object to us using your data
                where we rely on legitimate interests.
              </li>
              <li>
                <strong>Portability</strong> &mdash; ask for your data in a
                portable format so you can move it elsewhere.
              </li>
              <li>
                <strong>Withdraw consent</strong> &mdash; where we rely on your
                consent, you can withdraw it at any time.
              </li>
            </ul>
            <p>
              To use any of these rights, email us at{" "}
              <a
                href="mailto:dengdan01@gmail.com"
                className="underline hover:text-stone-900"
              >
                dengdan01@gmail.com
              </a>
              . Using your rights is free, and we will respond within one month.
            </p>
            <p>
              If you are unhappy with how we handle your data, you can complain
              to the{" "}
              <strong>
                ICO (Information Commissioner&apos;s Office)
              </strong>
              , the United Kingdom&apos;s data protection regulator. You can
              reach them at{" "}
              <a
                href="https://ico.org.uk"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-stone-900"
              >
                ico.org.uk
              </a>
              . We would appreciate the chance to help first, so please consider
              contacting us before you go to the ICO.
            </p>
          </Section>

          {/* 9. Cookies */}
          <Section
            id="cookies"
            title="9. Cookies and similar technologies"
          >
            <Summary>
              In short: we use the small amount of storage needed to keep you
              signed in and to keep the service safe.
            </Summary>
            <p>
              A <strong>cookie</strong> is a small file a website stores on your
              device. We use only the cookies and similar storage we need to run
              the service:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Authentication / session:</strong> to keep you signed in
                securely.
              </li>
              <li>
                <strong>Rate limiting / security:</strong> to help stop misuse
                of the service.
              </li>
            </ul>
            <p>
              <strong>Analytics:</strong> we use{" "}
              <strong>Vercel Analytics</strong>, a cookieless, privacy-friendly
              analytics service. It does not track you across other websites and
              collects no personal identifiers. Our custom product events (for
              example, when a name is generated) contain no birth data.
            </p>
          </Section>

          {/* 10. Children */}
          <Section id="children" title="10. Children">
            <Summary>
              In short: HarmonyName is not meant for young children.
            </Summary>
            <p>
              HarmonyName is not directed at children. You must be at least{" "}
              <strong>18 years old</strong> to create an account and use the
              service. If you believe a child has given us personal data, please
              contact us and we will delete it.
            </p>
          </Section>

          {/* 11. Changes */}
          <Section id="changes" title="11. Changes to this policy">
            <Summary>
              In short: if we change this policy, we will update this page.
            </Summary>
            <p>
              We may update this policy from time to time. When we do, we will
              change the &ldquo;Last updated&rdquo; date at the top. If the
              changes are significant, we will take reasonable steps to let you
              know.
            </p>
          </Section>

          {/* 12. Contact */}
          <Section id="contact" title="12. How to contact us">
            <Summary>
              In short: email us with any privacy question or request.
            </Summary>
            <p>
              For any privacy question, or to use any of your rights, email{" "}
              <strong>
                <a
                  href="mailto:dengdan01@gmail.com"
                  className="underline hover:text-stone-900"
                >
                  dengdan01@gmail.com
                </a>
              </strong>
              .
            </p>
            <p>
              Data controller: an individual sole trader based in the United
              Kingdom, trading as HarmonyName.
              {/* TODO(owner): replace with full legal name after confirmation */}
            </p>
          </Section>
        </main>

        <footer className="mt-16 pt-8 border-t border-stone-200 text-center">
          <Link
            href="/"
            className="text-sm text-stone-500 hover:text-stone-900 transition"
          >
            ← Back to home
          </Link>
        </footer>
      </div>
    </div>
  );
}
