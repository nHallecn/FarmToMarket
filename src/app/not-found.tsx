import Link from "next/link";
import { ArrowLeft, Sprout } from "lucide-react";

export default function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--cream)] px-5">
      <section className="max-w-lg text-center">
        <Sprout className="mx-auto text-[var(--orange)]" size={42} />
        <p className="eyebrow mt-6">404 · Plot not found</p>
        <h1 className="font-display mt-3 text-5xl font-semibold text-[var(--forest)]">
          Nothing is growing here yet.
        </h1>
        <p className="mt-4 text-lg leading-8 text-[var(--muted)]">
          The page may have moved, or the link is no longer active.
        </p>
        <Link href="/" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--forest)] px-6 py-3 font-bold text-white">
          <ArrowLeft aria-hidden="true" size={17} /> Back home
        </Link>
      </section>
    </main>
  );
}
