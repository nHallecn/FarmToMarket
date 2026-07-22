"use client";

import { type ReactNode, useEffect } from "react";
import { ArrowUpRight, Inbox, Sprout, X } from "lucide-react";

export function humanize(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function formatDate(value?: string, locale = "en-CM") {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatRelativeDate(value: string) {
  const diff = new Date(value).getTime() - Date.now();
  const days = Math.round(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (Math.abs(days) < 7) return days > 0 ? `In ${days} days` : `${Math.abs(days)} days ago`;
  return formatDate(value);
}

const statusStyle = (status: string) => {
  if (["verified", "active", "completed", "accepted", "succeeded", "delivered", "resolved"].includes(status)) {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  if (["pending", "processing", "requested", "quoted", "open", "matching", "planned", "pickup_scheduled", "submitted", "under_review"].includes(status)) {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  if (["rejected", "failed", "cancelled", "suspended", "exception", "disputed", "refunded"].includes(status)) {
    return "bg-red-50 text-red-700 ring-red-200";
  }
  if (["confirmed", "offered", "allocating", "ready_for_pickup", "in_transit", "shortlisted"].includes(status)) {
    return "bg-sky-50 text-sky-800 ring-sky-200";
  }
  return "bg-slate-50 text-slate-700 ring-slate-200";
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className={`status-dot inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-inset ${statusStyle(status)}`}>
      {label ?? humanize(status)}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  detail,
  icon,
  tone = "forest",
}: {
  label: string;
  value: string | number;
  detail?: string;
  icon: ReactNode;
  tone?: "forest" | "orange" | "sage" | "cream";
}) {
  const tones = {
    forest: "bg-[var(--forest)] text-white",
    orange: "bg-[var(--orange-soft)] text-[var(--forest)]",
    sage: "bg-[var(--sage)] text-[var(--forest)]",
    cream: "bg-[var(--cream)] text-[var(--forest)]",
  };
  return (
    <article className="surface min-w-0 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
          <p className="mt-2 truncate text-2xl font-black tracking-[-0.04em] text-[var(--ink)] sm:text-[1.75rem]">{value}</p>
        </div>
        <span className={`grid size-10 flex-none place-items-center rounded-xl ${tones[tone]}`}>{icon}</span>
      </div>
      {detail ? <p className="mt-3 flex items-center gap-1 text-xs font-semibold text-[var(--muted)]"><ArrowUpRight aria-hidden="true" size={13} />{detail}</p> : null}
    </article>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--forest)] sm:text-4xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)] sm:text-base">{description}</p> : null}
      </div>
      {action ? <div className="flex-none">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label ? <div className="mb-2 flex items-center justify-between text-xs font-semibold text-[var(--muted)]"><span>{label}</span><span>{Math.round(safeValue)}%</span></div> : null}
      <div className="h-2 overflow-hidden rounded-full bg-[var(--cream-deep)]" aria-label={label} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(safeValue)}>
        <div className="h-full rounded-full bg-[var(--lime-strong)] transition-[width] duration-500" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export function ProductMark({ name, accent }: { name: string; accent?: string }) {
  return (
    <span className="grid size-12 flex-none place-items-center rounded-2xl text-[var(--forest)]" style={{ backgroundColor: accent || "var(--sage)" }} aria-hidden="true">
      <Sprout size={22} />
      <span className="sr-only">{name}</span>
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface grid min-h-64 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]"><Inbox aria-hidden="true" size={23} /></span>
        <h2 className="mt-4 text-lg font-black text-[var(--ink)]">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-2xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose, open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button aria-label="Close dialog" className="fixed inset-0 bg-[var(--forest-strong)]/65 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative mx-auto my-4 w-full ${width} animate-rise overflow-hidden rounded-[1.5rem] bg-white shadow-2xl`}>
        <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-7">
          <div>
            <h2 id="modal-title" className="font-display text-2xl font-semibold text-[var(--forest)]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
          <button type="button" aria-label="Close dialog" onClick={onClose} className="grid size-10 flex-none place-items-center rounded-full bg-[var(--cream)] text-[var(--forest)] hover:bg-[var(--sage)]"><X aria-hidden="true" size={18} /></button>
        </header>
        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-bold text-[var(--ink)]">
      <span>{label}</span>
      {hint ? <span className="ml-1 font-normal text-[var(--muted)]">{hint}</span> : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export const inputClass = "h-12 w-full rounded-xl border border-[var(--line)] bg-white px-3.5 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--sage)]";
export const textareaClass = "min-h-28 w-full resize-y rounded-xl border border-[var(--line)] bg-white px-3.5 py-3 text-sm text-[var(--ink)] shadow-sm outline-none transition focus:border-[var(--forest)] focus:ring-2 focus:ring-[var(--sage)]";
export const primaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(23,63,50,.15)] transition hover:-translate-y-0.5 hover:bg-[var(--forest-strong)] disabled:translate-y-0 disabled:opacity-50";
export const secondaryButtonClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-5 text-sm font-extrabold text-[var(--forest)] transition hover:border-[var(--forest)] hover:bg-[var(--cream)]";
