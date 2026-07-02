import Link from "next/link";

export const metadata = {
  title: "Refund & Cancellation Policy — HarmonyName",
  description:
    "How refunds and cancellations work for HarmonyName credits, written in plain English.",
};

/**
 * Refund & Cancellation Policy
 *
 * Self-contained React Server Component. Plain-English copy written for a
 * dyslexic owner: short sentences, one-line italic summary per section,
 * abbreviations spelled out on first use.
 *
 * Operated by a UK-based individual sole trader.
 */
export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] font-sans text-stone-900">
      <main className="max-w-2xl mx-auto px-5 py-16 md:py-24">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="text-2xl font-serif font-bold text-stone-900 hover:opacity-70 transition"
          >
            HarmonyName
          </Link>
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mt-8 mb-3 leading-tight">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="text-stone-500 text-sm">
            Last updated: <strong>2 July 2026</strong>
          </p>
        </div>

        {/* Intro */}
        <section className="mb-12">
          <p className="text-stone-700 leading-relaxed mb-4">
            This policy explains how refunds and cancellations work when you buy
            credits on HarmonyName (the website at{" "}
            <strong>harmonyname.com</strong>).
          </p>
          <p className="text-stone-700 leading-relaxed mb-4">
            HarmonyName is run by a UK-based sole trader (one individual, not a
            limited company). When you buy credits, your contract is with that
            individual.
          </p>
          <p className="text-stone-700 leading-relaxed">
            If you have any question about a payment or a refund, email us first
            at{" "}
            <strong>
              <a
                href="mailto:dengdan01@gmail.com"
                className="underline hover:text-stone-900"
              >
                dengdan01@gmail.com
              </a>
            </strong>
            . We would much rather sort it out with you directly.
          </p>
        </section>

        {/* Section 1 — What you are buying */}
        <Section
          title="1. What you are buying"
          summary="You buy prepaid credits. Each name generation spends some credits. Credits are digital and arrive in your account straight away."
        >
          <p className="mb-4">
            HarmonyName creates Chinese given names. It does this by combining
            BaZi (八字, also called Chinese &ldquo;Four Pillars&rdquo;
            astrology) with artificial intelligence (AI).
          </p>
          <p className="mb-4">
            To use the service you buy <strong>credits</strong> in advance. Each
            time you generate a name, that uses up some of your credits.
          </p>
          <p className="mb-4">For reference, the credit packs are:</p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>Starter — $5 for 10 credits</li>
            <li>Popular — $12 for 30 credits</li>
            <li>Pro — $30 for 100 credits</li>
          </ul>
          <p className="mb-4">
            Payments are handled by <strong>Stripe</strong>, a payment company.
            We do not store your card details.
          </p>
          <p>
            Credits are <strong>digital content</strong>. They are delivered to
            your account <strong>instantly</strong>, as soon as your payment
            goes through.
          </p>
        </Section>

        {/* Section 2 — The 14-day cancellation right */}
        <Section
          title="2. Your normal 14-day right to cancel — and why it is different for credits"
          summary="Online purchases usually come with a 14-day right to cancel. But because credits are delivered instantly, you agree at checkout to start using them right away — and you accept that the 14-day right no longer applies to credits you have already used."
        >
          <p className="mb-4">
            Under UK law — the Consumer Contracts (Information, Cancellation and
            Additional Charges) Regulations 2013 — you normally have{" "}
            <strong>14 days</strong> to cancel something you bought online and
            get your money back.
          </p>
          <p className="mb-4">
            There is an exception for <strong>digital content</strong> (like our
            credits) that is supplied straight away. You lose that 14-day right
            once both of these are true:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              you have <strong>expressly agreed</strong> that we can start
              delivering the credits immediately; and
            </li>
            <li>
              you have <strong>acknowledged</strong> that, by doing so, you lose
              the 14-day right to cancel.
            </li>
          </ul>
          <p className="mb-4">
            When you buy credits, the credits reach your account at once. By
            completing your purchase you <strong>agree to immediate access</strong>{" "}
            and you <strong>acknowledge that the 14-day cancellation right no
            longer applies to any credits you have already used</strong>.
          </p>
          <p className="mb-4">
            This does <strong>not</strong> take away your separate rights if the
            service is faulty or not as described — see Section 4.
          </p>
          <div className="bg-stone-100 border border-stone-200 rounded-xl p-4 text-sm text-stone-600">
            At checkout, the Stripe payment page shows a clear consent notice,
            such as: &ldquo;I want my credits delivered immediately and I
            understand I lose my 14-day right to cancel once I start using
            them.&rdquo; By completing your purchase, you agree to that notice.
          </div>
        </Section>

        {/* Section 3 — Goodwill refund for unused credits */}
        <Section
          title="3. Goodwill refund for unused credits"
          summary="If you change your mind and have not used any credits, ask us within 14 days and we will normally refund you. This is a goodwill offer, given at our discretion."
        >
          <p className="mb-4">
            We want you to feel safe buying from us. So, as a matter of
            goodwill, we offer this:
          </p>
          <ul className="list-disc pl-6 space-y-2 mb-4">
            <li>
              If you have <strong>not used any</strong> of the credits in a pack,
              and
            </li>
            <li>
              you ask us within <strong>14 days</strong> of buying them,
            </li>
          </ul>
          <p className="mb-4">
            then we will normally refund that pack in full. Refunds go back to
            your original Stripe payment method.
          </p>
          <p className="mb-4">
            This goodwill refund is offered at our discretion. We can only do it
            for <strong>wholly unused</strong> credits. Once you have spent even
            one credit from a pack, that pack counts as used and is no longer
            eligible for this goodwill refund.
          </p>
          <p>
            This is in addition to your legal rights, not instead of them.
          </p>
        </Section>

        {/* Section 4 — If the service is faulty or not as described */}
        <Section
          title="4. If the service is faulty or not as described"
          summary="By law, what we sell must work properly and match how we describe it. If it does not, you are entitled to a remedy — usually re-credit or a refund. But not liking the style of a generated name is not a fault."
        >
          <p className="mb-4">
            Under UK law — the Consumer Rights Act 2015 — digital content must
            be:
          </p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>as described,</li>
            <li>fit for its purpose, and</li>
            <li>of satisfactory quality.</li>
          </ul>
          <p className="mb-4">
            If our service is genuinely faulty or not as described — for example,
            you paid but no credits arrived, or a generation failed and still
            took your credits and we could not fix it — you are entitled to a
            remedy. That usually means we <strong>re-credit your account</strong>{" "}
            or give you a <strong>refund</strong>. This applies whatever Section
            2 says.
          </p>
          <p className="mb-4">
            Please tell us about a fault as soon as you can, so we can look into
            it and put it right.
          </p>
          <p className="mb-4">
            <strong>One important point about what counts as a fault.</strong>{" "}
            HarmonyName is for cultural and entertainment purposes. The names are
            meant to be meaningful and fun — they are not advice, and not a
            guarantee of any outcome.
          </p>
          <p>
            Because of this, simply not liking the <strong>style</strong> of a
            name the system generates is <strong>not</strong> a fault, and is not
            on its own a reason for a refund. The service still worked: it
            produced a name for you. That said, we will always try to be fair and
            reasonable, so if something feels wrong, talk to us.
          </p>
        </Section>

        {/* Section 5 — How to request a refund */}
        <Section
          title="5. How to ask for a refund"
          summary="Email us with a few details. We aim to reply quickly, and approved refunds go back to your original Stripe payment method."
        >
          <p className="mb-4">
            To ask for a refund, email{" "}
            <strong>
              <a
                href="mailto:dengdan01@gmail.com"
                className="underline hover:text-stone-900"
              >
                dengdan01@gmail.com
              </a>
            </strong>{" "}
            and include:
          </p>
          <ul className="list-disc pl-6 space-y-1 mb-4">
            <li>the email address on your HarmonyName account,</li>
            <li>the date you bought the credits,</li>
            <li>which pack you bought (Starter, Popular, or Pro),</li>
            <li>and a short note on why you would like a refund.</li>
          </ul>
          <p className="mb-4">
            We aim to reply <strong>within 5 business days</strong>.
          </p>
          <p>
            If we approve a refund, it goes back to the{" "}
            <strong>original Stripe payment method</strong> you used. Your bank
            may take a few more days to show it.
          </p>
        </Section>

        {/* Section 6 — Chargebacks and disputes */}
        <Section
          title="6. Chargebacks and disputes"
          summary="Please contact us before raising a dispute with your bank. It is almost always faster for us to fix it directly."
        >
          <p className="mb-4">
            A &ldquo;chargeback&rdquo; (also called a payment dispute) is when
            you ask your bank or card provider to reverse a charge.
          </p>
          <p>
            Please <strong>contact us first</strong> at{" "}
            <strong>
              <a
                href="mailto:dengdan01@gmail.com"
                className="underline hover:text-stone-900"
              >
                dengdan01@gmail.com
              </a>
            </strong>{" "}
            before raising a chargeback. We can almost always sort out a genuine
            problem more
            quickly and directly than a bank dispute can. Raising a chargeback
            before talking to us just slows things down for both of us.
          </p>
        </Section>

        {/* Section 7 — Contact */}
        <Section
          title="7. Contact us"
          summary="One email address for any refund or payment question."
        >
          <p>
            For anything in this policy, email{" "}
            <strong>
              <a
                href="mailto:dengdan01@gmail.com"
                className="underline hover:text-stone-900"
              >
                dengdan01@gmail.com
              </a>
            </strong>
            . We are a small, UK-based sole trader and we read every message.
          </p>
        </Section>

        {/* Back to home */}
        <div className="mt-16 pt-8 border-t border-stone-200">
          <Link
            href="/"
            className="inline-block text-stone-600 hover:text-stone-900 transition font-medium"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}

/**
 * Section block: bold title, then a one-line plain-English summary in italics,
 * then the detailed copy passed as children.
 */
function Section({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="text-xl md:text-2xl font-serif font-bold text-stone-900 mb-3 leading-snug">
        {title}
      </h2>
      <p className="italic text-stone-500 leading-relaxed mb-5 border-l-2 border-stone-300 pl-4">
        {summary}
      </p>
      <div className="text-stone-700 leading-relaxed">{children}</div>
    </section>
  );
}
