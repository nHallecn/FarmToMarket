export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--cream)]" aria-live="polite">
      <div className="flex flex-col items-center gap-4 text-[var(--forest)]">
        <span className="size-10 animate-spin rounded-full border-4 border-[var(--sage)] border-t-[var(--forest)]" />
        <p className="text-sm font-bold">Loading FarmToMarket…</p>
      </div>
    </main>
  );
}
