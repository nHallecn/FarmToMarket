import Link from "next/link";
import { CloudOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="grid min-h-screen place-items-center bg-[var(--cream)] px-5"
    >
      <section className="surface max-w-lg p-8 text-center sm:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]">
          <CloudOff aria-hidden="true" size={28} />
        </span>
        <p className="eyebrow mt-6">Connection paused</p>
        <h1 className="font-display mt-3 text-4xl font-semibold text-[var(--forest)]">
          Your work is still here.
        </h1>
        <p className="mt-4 leading-7 text-[var(--muted)]">
          FarmToMarket keeps supported drafts on this device. Reconnect to sync
          new listings, quotes, and order updates.
        </p>
        <Link
          href="/login"
          className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-6 font-bold text-white transition-transform hover:-translate-y-0.5"
        >
          <RefreshCw aria-hidden="true" size={17} />
          Try again
        </Link>
      </section>
    </main>
  );
}
