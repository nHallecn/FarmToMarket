import Image from "next/image";
import { BadgeCheck, CheckCircle2, ShieldCheck } from "lucide-react";
import { Brand } from "./brand";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AuthShell({ eyebrow, title, description, children }: AuthShellProps) {
  return (
    <main id="main-content" className="grid min-h-screen bg-[var(--cream)] lg:grid-cols-[minmax(420px,0.88fr)_minmax(560px,1.12fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[var(--forest)] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
        <Image
          src="/farmtomarket-hero.webp"
          alt="Fresh produce being checked at a FarmToMarket collection point"
          fill
          preload
          sizes="45vw"
          className="object-cover object-[58%_center]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--forest)]/75 via-[var(--forest)]/30 to-[var(--forest)]/95" />
        <div className="relative z-10">
          <Brand inverse />
        </div>

        <div className="relative z-10 max-w-xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--lime)] backdrop-blur">
            <ShieldCheck aria-hidden="true" className="size-4" /> Built for trusted trade
          </span>
          <blockquote className="font-display mt-6 text-[clamp(2.35rem,4vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--white)]">
            From the field to your business, with every step accounted for.
          </blockquote>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-white/80">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur"><BadgeCheck className="size-4 text-[var(--lime)]" /> Verified partners</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur"><CheckCircle2 className="size-4 text-[var(--lime)]" /> Clear order status</span>
          </div>
        </div>
      </aside>

      <section className="flex min-h-screen flex-col px-5 py-6 sm:px-8 lg:px-12 lg:py-10 xl:px-20">
        <div className="flex items-center justify-between lg:hidden">
          <Brand />
          <span className="rounded-full bg-[var(--sage)] px-3 py-1.5 text-xs font-bold text-[var(--forest)]">Cameroon</span>
        </div>

        <div className="mx-auto flex w-full max-w-[600px] flex-1 flex-col justify-center py-10 lg:py-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--forest)]">{eyebrow}</p>
          <h1 className="font-display mt-3 text-[clamp(2.4rem,5vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-[var(--ink)]">{title}</h1>
          <p className="mt-4 max-w-lg text-sm leading-6 text-[var(--muted)] sm:text-base sm:leading-7">{description}</p>
          <div className="mt-8">{children}</div>
        </div>

        <div className="mx-auto flex w-full max-w-[600px] items-center justify-between border-t border-[var(--line)] pt-5 text-xs text-[var(--muted)]">
          <span>Prototype access</span>
          <span>English · Français</span>
        </div>
      </section>
    </main>
  );
}
