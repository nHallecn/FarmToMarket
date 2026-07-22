import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Building2,
  Check,
  ClipboardList,
  Headphones,
  MapPin,
  PackageCheck,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sprout,
  Star,
  Truck,
  Users,
} from "lucide-react";
import { Brand } from "./brand";

const trustItems = [
  { icon: BadgeCheck, label: "Verified profiles" },
  { icon: Banknote, label: "Clear, agreed pricing" },
  { icon: Truck, label: "Coordinated delivery" },
  { icon: ShieldCheck, label: "Traceable transactions" },
];

const steps = [
  {
    number: "01",
    icon: ClipboardList,
    title: "Publish what you need",
    body: "Buyers post structured demand. Farmers list harvest-ready supply with quantity, grade, location, and price.",
  },
  {
    number: "02",
    icon: Search,
    title: "We find the right fit",
    body: "Verified supply is matched to demand, and our team helps combine farmers when one harvest is not enough.",
  },
  {
    number: "03",
    icon: PackageCheck,
    title: "Track every handoff",
    body: "From confirmed payment to pickup and delivery, both sides see clear status updates and next steps.",
  },
];

const products = [
  {
    emoji: "🍅",
    name: "Fresh tomatoes",
    grade: "Grade A",
    location: "Bafoussam, West",
    quantity: "120 crates available",
    price: "18,500",
    unit: "per crate",
    tone: "bg-[var(--sage)]",
  },
  {
    emoji: "🍌",
    name: "Plantain bunches",
    grade: "Market grade",
    location: "Moungo, Littoral",
    quantity: "2.4 tonnes available",
    price: "14,000",
    unit: "per 50 kg",
    tone: "bg-[var(--lime)]",
  },
  {
    emoji: "🥔",
    name: "Irish potatoes",
    grade: "Premium washed",
    location: "Bamenda, North-West",
    quantity: "85 bags available",
    price: "22,000",
    unit: "per 50 kg",
    tone: "bg-[var(--cream)]",
  },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[var(--cream)]">
      <div className="pointer-events-none absolute -left-24 top-24 size-72 rounded-full bg-[var(--lime)] opacity-20 blur-3xl" />
      <div className="mx-auto grid min-h-[690px] w-full max-w-[1440px] items-center gap-12 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-20">
        <div className="relative z-10 max-w-[650px]">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--white)] px-3.5 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--forest)] shadow-sm">
            <span className="size-2 rounded-full bg-[var(--orange)]" />
            Grown in Cameroon. Built for business.
          </div>
          <h1 className="font-display max-w-[680px] text-[clamp(3.25rem,6.1vw,6.25rem)] font-semibold leading-[0.94] tracking-[-0.065em] text-[var(--ink)]">
            Fresh supply.
            <span className="block text-[var(--forest)]">Fewer unknowns.</span>
          </h1>
          <p className="mt-7 max-w-[585px] text-base leading-7 text-[var(--muted)] sm:text-lg sm:leading-8">
            FarmToMarket connects verified farmers with restaurants, retailers, hotels, and food businesses—then helps every order move from field to delivery.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register?role=buyer"
              className="group inline-flex h-14 items-center justify-center gap-2.5 rounded-full bg-[var(--forest)] px-7 text-sm font-bold text-[var(--white)] shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl"
            >
              Source fresh produce
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/register?role=farmer"
              className="inline-flex h-14 items-center justify-center rounded-full border border-[var(--forest)] px-7 text-sm font-bold text-[var(--forest)] transition-colors hover:bg-[var(--sage)]"
            >
              Sell your harvest
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]">
            {["Clear order status", "Local support", "Mobile-first"].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <span className="grid size-5 place-items-center rounded-full bg-[var(--sage)] text-[var(--forest)]">
                  <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                </span>
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[760px] lg:mx-0">
          <div className="absolute -right-5 -top-5 hidden size-28 rounded-[28px] border border-[var(--forest)]/15 lg:block" />
          <div className="relative aspect-[1.05/1] overflow-hidden rounded-[32px] bg-[var(--sage)] shadow-2xl sm:rounded-[42px] lg:aspect-[1.06/1]">
            <Image
              src="/farmtomarket-hero.webp"
              alt="FarmToMarket team inspecting fresh tomatoes, plantain, peppers, and onions at a produce collection point"
              fill
              preload
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover object-[62%_center]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--forest)]/50 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/25 bg-white/90 p-3 shadow-xl backdrop-blur sm:bottom-6 sm:left-6 sm:right-auto sm:min-w-[320px] sm:p-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]">
                <BadgeCheck aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-[var(--ink)]">Verified supply partner</span>
                <span className="block truncate text-xs text-[var(--muted)]">Quality and availability confirmed</span>
              </span>
              <span className="size-2.5 rounded-full bg-[var(--lime)] ring-4 ring-[var(--lime)]/20" />
            </div>
          </div>
          <div className="absolute -bottom-7 -right-1 hidden rounded-[22px] bg-[var(--lime)] px-5 py-4 text-[var(--forest)] shadow-xl sm:block lg:right-7">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] opacity-70">Order visibility</p>
            <p className="mt-1 text-lg font-bold">Field → buyer</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip() {
  return (
    <section id="trust" aria-label="The FarmToMarket promise" className="border-y border-[var(--line)] bg-[var(--white)]">
      <div className="mx-auto grid max-w-[1440px] grid-cols-2 px-5 sm:px-8 lg:grid-cols-4 lg:px-12">
        {trustItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={`flex min-h-28 items-center gap-3.5 py-5 sm:px-5 ${
                index % 2 === 0 ? "border-r border-[var(--line)]" : ""
              } ${index > 1 ? "border-t border-[var(--line)] lg:border-t-0" : ""} ${
                index > 0 ? "lg:border-l lg:border-r-0" : ""
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--sage)] text-[var(--forest)]">
                <Icon aria-hidden="true" className="size-[18px]" />
              </span>
              <span className="text-sm font-bold leading-5 text-[var(--ink)]">{item.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-[var(--white)] py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--forest)]">How it works</p>
            <h2 className="font-display mt-4 max-w-xl text-[clamp(2.4rem,4vw,4.35rem)] font-semibold leading-[1] tracking-[-0.05em] text-[var(--ink)]">
              One clear path from demand to delivery.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-[var(--muted)] lg:justify-self-end lg:text-lg lg:leading-8">
            We bring the marketplace, fulfillment plan, payment record, and shipment updates into one trusted workflow.
          </p>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-[30px] border border-[var(--line)] bg-[var(--cream)] lg:grid-cols-3">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.number}
                className={`relative p-7 sm:p-9 ${index > 0 ? "border-t border-[var(--line)] lg:border-l lg:border-t-0" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <span className="grid size-13 place-items-center rounded-[18px] bg-[var(--forest)] text-[var(--lime)]">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="text-4xl font-semibold tracking-[-0.06em] text-[var(--forest)] opacity-20">{step.number}</span>
                </div>
                <h3 className="mt-9 text-xl font-bold tracking-[-0.025em] text-[var(--ink)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{step.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function RolePathwaysSection() {
  return (
    <section id="pathways" className="bg-[var(--forest)] py-20 text-[var(--white)] sm:py-28">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--lime)]">Made for every side of the market</p>
            <h2 className="font-display mt-4 max-w-2xl text-[clamp(2.35rem,4vw,4.25rem)] font-semibold leading-[1] tracking-[-0.05em]">
              Your work, finally in one place.
            </h2>
          </div>
          <p className="max-w-md text-base leading-7 text-white/65">
            Purpose-built journeys keep farmers, procurement teams, and fulfillment staff focused on the next useful action.
          </p>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-3">
          <article className="group flex min-h-[355px] flex-col rounded-[28px] bg-[var(--lime)] p-7 text-[var(--forest)] transition-transform hover:-translate-y-1 sm:p-8">
            <span className="grid size-14 place-items-center rounded-[19px] bg-[var(--forest)] text-[var(--lime)]">
              <Sprout aria-hidden="true" className="size-7" />
            </span>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] opacity-65">For farmers & cooperatives</p>
            <h3 className="font-display mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em]">Turn harvests into reliable orders.</h3>
            <p className="mt-4 text-sm leading-6 opacity-75">List available produce, see matching buyer requests, prepare orders, and follow settlement status.</p>
            <Link href="/register?role=farmer" className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold">
              Start selling <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </article>

          <article className="group flex min-h-[355px] flex-col rounded-[28px] bg-[var(--white)] p-7 text-[var(--ink)] transition-transform hover:-translate-y-1 sm:p-8">
            <span className="grid size-14 place-items-center rounded-[19px] bg-[var(--orange)] text-[var(--white)]">
              <Building2 aria-hidden="true" className="size-7 text-[var(--forest)]" />
            </span>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-[var(--muted)]">For business buyers</p>
            <h3 className="font-display mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em]">Source at scale without the chase.</h3>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">Browse verified supply or post multi-item demand, compare offers, and track every delivery.</p>
            <Link href="/register?role=buyer" className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold text-[var(--forest)]">
              Start sourcing <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </article>

          <article className="group flex min-h-[355px] flex-col rounded-[28px] border border-white/15 bg-white/[0.07] p-7 text-[var(--white)] transition-transform hover:-translate-y-1 sm:p-8">
            <span className="grid size-14 place-items-center rounded-[19px] bg-white/10 text-[var(--lime)]">
              <Users aria-hidden="true" className="size-7" />
            </span>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-white/55">For operations teams</p>
            <h3 className="font-display mt-3 text-3xl font-semibold leading-tight tracking-[-0.035em]">Keep fulfillment moving.</h3>
            <p className="mt-4 text-sm leading-6 text-white/65">Build multi-farmer allocations, coordinate pickup, reconcile payments, and manage exceptions.</p>
            <Link href="/login" className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-bold text-[var(--lime)]">
              Team sign in <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

export function MarketplacePreviewSection() {
  return (
    <section id="marketplace" className="bg-[var(--cream)] py-20 sm:py-28">
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--forest)]">Marketplace preview</p>
            <h2 className="font-display mt-4 text-[clamp(2.4rem,4vw,4.25rem)] font-semibold leading-none tracking-[-0.05em] text-[var(--ink)]">
              Fresh now. Ready to move.
            </h2>
          </div>
          <Link href="/login" className="group inline-flex items-center gap-2 text-sm font-bold text-[var(--forest)]">
            Sign in to see all supply
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <article key={product.name} className="overflow-hidden rounded-[28px] border border-[var(--line)] bg-[var(--white)] shadow-lg transition-transform hover:-translate-y-1">
              <div className={`relative grid h-52 place-items-center overflow-hidden ${product.tone}`}>
                <span aria-hidden="true" className="select-none text-[6.5rem] drop-shadow-xl">{product.emoji}</span>
                <span className="absolute left-5 top-5 rounded-full bg-[var(--white)] px-3 py-1.5 text-xs font-bold text-[var(--forest)] shadow-sm">
                  {product.grade}
                </span>
                <span className="absolute bottom-5 right-5 inline-flex items-center gap-1 rounded-full bg-[var(--forest)] px-3 py-1.5 text-xs font-semibold text-[var(--white)]">
                  <BadgeCheck aria-hidden="true" className="size-3.5 text-[var(--lime)]" /> Verified
                </span>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold tracking-[-0.025em] text-[var(--ink)]">{product.name}</h3>
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                      <MapPin aria-hidden="true" className="size-3.5" /> {product.location}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs font-bold text-[var(--ink)]"><Star aria-hidden="true" className="size-3.5 fill-[var(--orange)] text-[var(--orange)]" /> 4.8</span>
                </div>
                <div className="mt-6 flex items-end justify-between gap-3 border-t border-[var(--line)] pt-5">
                  <div>
                    <p className="text-lg font-bold text-[var(--forest)]">FCFA {product.price}</p>
                    <p className="text-xs text-[var(--muted)]">{product.unit}</p>
                  </div>
                  <p className="text-right text-xs font-semibold leading-5 text-[var(--muted)]">{product.quantity}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-[var(--muted)]">Preview data shown for demonstration. Live availability is confirmed before order acceptance.</p>
      </div>
    </section>
  );
}

export function FinalCtaSection() {
  return (
    <section className="bg-[var(--white)] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
      <div className="relative mx-auto max-w-[1344px] overflow-hidden rounded-[34px] bg-[var(--orange)] px-6 py-14 text-center text-[var(--ink)] sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -left-20 -top-24 size-64 rounded-full border-[55px] border-white/10" />
        <div className="pointer-events-none absolute -bottom-28 -right-12 size-72 rounded-full border-[55px] border-[var(--forest)]/15" />
        <div className="relative mx-auto max-w-3xl">
          <span className="mx-auto grid size-14 place-items-center rounded-[20px] bg-[var(--white)] text-[var(--ink)] shadow-lg">
            <ShoppingBasket aria-hidden="true" className="size-6" />
          </span>
          <h2 className="font-display mt-7 text-[clamp(2.35rem,4vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.055em]">
            Better trade starts with one reliable order.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--ink)] sm:text-lg">
            Join the businesses and producers building a more dependable food supply chain in Cameroon.
          </p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-7 text-sm font-bold text-[var(--white)] shadow-lg">
              Create your account <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href="/login" className="inline-flex h-14 items-center justify-center rounded-full border border-[var(--ink)] px-7 text-sm font-bold text-[var(--ink)] transition-colors hover:bg-[var(--ink)]/10">
              I already have an account
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-[var(--forest)] text-[var(--white)]">
      <div className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8 lg:px-12">
        <div className="grid gap-10 border-b border-white/12 pb-12 md:grid-cols-[1.3fr_0.7fr_0.7fr]">
          <div>
            <Brand inverse />
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/60">Cameroon-grown produce, organized for dependable business supply.</p>
            <div className="mt-5 inline-flex items-center gap-2 text-sm text-white/75">
              <Headphones aria-hidden="true" className="size-4 text-[var(--lime)]" /> Local support for every order
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--lime)]">Platform</p>
            <div className="mt-5 flex flex-col gap-3 text-sm text-white/65">
              <Link href="#marketplace" className="hover:text-[var(--white)]">Browse supply</Link>
              <Link href="#how-it-works" className="hover:text-[var(--white)]">How it works</Link>
              <Link href="/register?role=farmer" className="hover:text-[var(--white)]">Sell produce</Link>
              <Link href="/login" className="hover:text-[var(--white)]">Team portal</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--lime)]">Built in Cameroon</p>
            <p className="mt-5 text-sm leading-6 text-white/60">Starting with focused production corridors and urban business demand.</p>
            <div className="mt-4 flex items-center gap-2 text-sm font-semibold"><span aria-hidden="true">🇨🇲</span> Cameroon</div>
          </div>
        </div>
        <div className="flex flex-col gap-4 pt-7 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 FarmToMarket Cameroon. All rights reserved.</p>
          <nav aria-label="Legal links" className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/support" className="hover:text-white">Support</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
