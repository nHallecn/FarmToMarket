"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  FileText,
  LifeBuoy,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  Scale,
  Send,
  ShieldCheck,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { Brand } from "./brand";

type InfoPageKind = "privacy" | "terms" | "support";

const content = {
  privacy: {
    eyebrow: "Trust centre",
    title: "Your data supports the transaction—not a hidden business model.",
    intro: "This pilot privacy notice explains the information FarmToMarket uses to verify partners, fulfill orders, reconcile payments, and support disputes.",
    icon: LockKeyhole,
    sections: [
      ["What we collect", "Contact and organisation details, farm or delivery addresses, verification evidence, product and demand information, order events, provider payment references, shipment proof, support messages, and essential device/session data."],
      ["Why we use it", "To operate the managed marketplace, verify trust, match supply, coordinate fulfillment, prevent abuse, reconcile regulated third-party payments, provide support, and meet legal obligations."],
      ["Who can see it", "Marketplace listings expose only approved commercial details. Private identity documents and financial references are restricted to authorised staff and service providers. Farmers never see another farmer’s confidential quote or contact data."],
      ["Storage and retention", "Verification files belong in private object storage. Transaction and audit records are retained for operational and legal needs; information no longer needed is deleted or anonymised according to the final retention schedule."],
      ["Your choices", "You may request access, correction, or deletion where retention obligations allow. You can also change notification preferences and preferred language from your account."],
      ["Contact", "Send privacy requests through the support page with the subject “Privacy request”. Identity verification may be required before protected records are disclosed or changed."],
    ],
  },
  terms: {
    eyebrow: "Pilot terms",
    title: "Clear rules for dependable agricultural trade.",
    intro: "These plain-language pilot terms summarise how the FarmToMarket managed marketplace operates. Final legal terms must be approved before live launch.",
    icon: Scale,
    sections: [
      ["Platform role", "FarmToMarket coordinates verified supply, consolidated buyer orders, payments through licensed providers, and third-party logistics. It does not provide a stored-value wallet and does not own every vehicle or farm on the platform."],
      ["Profiles and verification", "Information must be accurate and kept current. Verification may be approved, rejected, or suspended. Only verified farmers can receive confirmed commercial allocations."],
      ["Supply, quotes, and orders", "Quantities require a controlled unit. A farmer may quote part of a demand. The buyer receives one consolidated offer, while supplier allocations and confidential pricing remain appropriately separated."],
      ["Payment", "Payment is completed with an approved external provider or verified bank transfer. A payment is successful only after a verified provider response or authorised reconciliation decision."],
      ["Delivery and acceptance", "Operations records shipment milestones and proof where available. After delivery, the buyer must accept the order or report an issue within the configured acceptance window."],
      ["Cancellation and disputes", "Cancellation after confirmation may require approval or fees based on the payment and shipment stage. Disputes require a reason and evidence; every resolution and financial adjustment is recorded."],
    ],
  },
} as const;

const inputStyle = "h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 text-sm outline-none focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--sage)]";

function PublicFrame({ children }: { children: React.ReactNode }) {
  const { locale, actions } = useApp();
  return (
    <div className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--line)] bg-[var(--cream)]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Brand />
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => actions.setLocale(locale === "en" ? "fr" : "en")} className="rounded-full px-4 py-2 text-sm font-bold text-[var(--forest)] hover:bg-[var(--sage)]">{locale === "en" ? "FR" : "EN"}</button>
            <Link href="/login" className="rounded-full bg-[var(--forest)] px-5 py-2.5 text-sm font-bold text-white">Sign in</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="border-t border-[var(--line)] px-5 py-7 text-center text-xs text-[var(--muted)]">FarmToMarket Cameroon · MVP pilot · Support and legal information</footer>
    </div>
  );
}

function LegalContent({ kind }: { kind: "privacy" | "terms" }) {
  const page = content[kind];
  const Icon = page.icon;
  return (
    <PublicFrame>
      <main id="main-content" className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-[var(--forest)]"><ArrowLeft size={16} /> Back home</Link>
        <div className="mt-9 grid gap-8 lg:grid-cols-[.72fr_1.28fr]">
          <aside>
            <span className="grid size-14 place-items-center rounded-2xl bg-[var(--forest)] text-[var(--lime)]"><Icon size={24} /></span>
            <p className="eyebrow mt-6">{page.eyebrow}</p>
            <h1 className="font-display mt-3 text-4xl font-semibold leading-[1.04] tracking-[-0.045em] text-[var(--forest)] sm:text-5xl">{page.title}</h1>
            <p className="mt-5 leading-7 text-[var(--muted)]">{page.intro}</p>
            <p className="mt-6 rounded-xl bg-[var(--orange-soft)] p-4 text-xs leading-5 text-[var(--forest)]"><strong>Pilot notice:</strong> Updated 21 July 2026. This product prototype does not process real identity documents or payments.</p>
          </aside>
          <section className="surface divide-y divide-[var(--line)] overflow-hidden">
            {page.sections.map(([title, text], index) => <article key={title} className="p-5 sm:p-7"><div className="flex items-start gap-4"><span className="grid size-8 flex-none place-items-center rounded-full bg-[var(--sage)] text-xs font-black text-[var(--forest)]">{index + 1}</span><div><h2 className="text-lg font-black text-[var(--ink)]">{title}</h2><p className="mt-2 text-sm leading-7 text-[var(--muted)]">{text}</p></div></div></article>)}
          </section>
        </div>
      </main>
    </PublicFrame>
  );
}

function SupportContent() {
  const [submitted, setSubmitted] = useState(false);
  const [topic, setTopic] = useState("Order or delivery");
  return (
    <PublicFrame>
      <main id="main-content" className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="max-w-3xl"><p className="eyebrow">Help centre</p><h1 className="font-display mt-3 text-5xl font-semibold tracking-[-0.05em] text-[var(--forest)]">We’ll help move the transaction forward.</h1><p className="mt-5 text-lg leading-8 text-[var(--muted)]">For urgent pickup, payment, or delivery issues, include the order reference so the team can see the complete event history.</p></div>
        <div className="mt-10 grid gap-5 md:grid-cols-3"><article className="surface p-5"><Phone className="text-[var(--forest)]" size={22} /><h2 className="mt-4 font-black">Pilot support line</h2><p className="mt-2 text-sm text-[var(--muted)]">+237 6 90 00 00 00</p><p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)]"><Clock3 size={14} /> Mon–Sat, 07:00–19:00</p></article><article className="surface p-5"><MessageCircle className="text-[var(--forest)]" size={22} /><h2 className="mt-4 font-black">WhatsApp operations</h2><p className="mt-2 text-sm text-[var(--muted)]">Critical pickup and delivery coordination</p><p className="mt-3 text-xs font-semibold text-[var(--forest)]">Pilot channel · demo only</p></article><article className="surface p-5"><Mail className="text-[var(--forest)]" size={22} /><h2 className="mt-4 font-black">Email</h2><p className="mt-2 text-sm text-[var(--muted)]">support@farmtomarket.cm</p><p className="mt-3 text-xs font-semibold text-[var(--muted)]">Typical response within one business day</p></article></div>
        <section className="surface mt-8 grid overflow-hidden lg:grid-cols-[.7fr_1.3fr]">
          <div className="bg-[var(--forest)] p-7 text-white sm:p-9"><span className="grid size-12 place-items-center rounded-xl bg-[var(--lime)] text-[var(--forest)]"><LifeBuoy size={21} /></span><h2 className="font-display mt-6 text-3xl font-semibold">Open a support request</h2><p className="mt-3 text-sm leading-7 text-white/65">This demo confirms the intake experience locally. A production deployment connects the form to the support queue and notification service.</p><ul className="mt-6 space-y-3 text-sm font-semibold text-white/80"><li className="flex gap-2"><ShieldCheck className="text-[var(--lime)]" size={17} /> Order-aware support</li><li className="flex gap-2"><FileText className="text-[var(--lime)]" size={17} /> Evidence and audit trail</li></ul></div>
          <div className="p-6 sm:p-9">{submitted ? <div className="grid min-h-80 place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]"><CheckCircle2 size={24} /></span><h2 className="mt-5 text-2xl font-black">Request received</h2><p className="mt-2 max-w-sm text-sm leading-6 text-[var(--muted)]">Demo ticket FTM-SUP-2026-0142 has been created. The team would reply through your in-app notification centre.</p><button onClick={() => setSubmitted(false)} className="mt-6 rounded-full border border-[var(--line)] px-5 py-2.5 text-sm font-bold text-[var(--forest)]">Open another</button></div></div> : <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Name<input required className={`${inputStyle} mt-2`} defaultValue="Aline M." /></label><label className="text-sm font-bold">Phone or email<input required className={`${inputStyle} mt-2`} defaultValue="+237 6 78 00 42 19" /></label></div><label className="block text-sm font-bold">Topic<select className={`${inputStyle} mt-2`} value={topic} onChange={(event) => setTopic(event.target.value)}><option>Order or delivery</option><option>Payment or transfer</option><option>Verification</option><option>Account access</option><option>Privacy request</option><option>Other</option></select></label><label className="block text-sm font-bold">Order reference <span className="font-normal text-[var(--muted)]">optional</span><input className={`${inputStyle} mt-2`} placeholder="e.g. FTM-260721-0041" /></label><label className="block text-sm font-bold">How can we help?<textarea required minLength={10} className="mt-2 min-h-32 w-full rounded-xl border border-[var(--line)] p-3.5 text-sm outline-none focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--sage)]" placeholder="Share the relevant details…" /></label><button className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--forest)] px-6 text-sm font-black text-white"><Send size={16} /> Submit request</button></form>}</div>
        </section>
      </main>
    </PublicFrame>
  );
}

export function InfoPage({ kind }: { kind: InfoPageKind }) {
  return kind === "support" ? <SupportContent /> : <LegalContent kind={kind} />;
}
