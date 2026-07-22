"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--cream)] px-5">
      <section className="surface max-w-lg p-8 text-center sm:p-11">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--orange-soft)] text-[var(--orange)]"><AlertTriangle size={24} /></span>
        <p className="eyebrow mt-6">Something went off route</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--forest)]">This update could not be completed.</h1>
        <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Your saved demo data is still available. Try the action again or return to the home page.</p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><button onClick={reset} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-5 text-sm font-black text-white"><RefreshCw size={16} /> Try again</button><Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--line)] px-5 text-sm font-black text-[var(--forest)]">Back home</Link></div>
      </section>
    </main>
  );
}
