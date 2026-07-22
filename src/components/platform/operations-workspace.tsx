"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Boxes,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileCheck2,
  Gavel,
  History,
  Leaf,
  MapPin,
  PackageCheck,
  Percent,
  RefreshCcw,
  Route,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Truck,
  UserCheck,
  Users,
  WalletCards,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import {
  formatFcfa,
  localise,
  type AuditLog,
  type CommercialUnit,
  type DemandItem,
  type DemandRequest,
  type Dispute,
  type DomainState,
  type Order,
  type OrderStatus,
  type ShipmentStatus,
  type VerificationStatus,
} from "@/lib/domain";

type AppContext = ReturnType<typeof useApp>;
type RunAction = (message: string, task: () => void) => void;
type Notice = { kind: "success" | "error"; message: string } | null;

const sectionCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Live operations",
    title: "Command centre",
    description: "One view of demand, sourcing, money movement, and delivery risk.",
  },
  verifications: {
    eyebrow: "Trust operations",
    title: "Verification queue",
    description: "Review farmer and buyer organisations before they transact.",
  },
  fulfillment: {
    eyebrow: "Supply orchestration",
    title: "Fulfilment builder",
    description: "Close sourcing gaps and turn demand into consolidated offers.",
  },
  orders: {
    eyebrow: "Commercial control",
    title: "Order control centre",
    description: "Follow every consolidated order from quote to completion.",
  },
  logistics: {
    eyebrow: "Field movement",
    title: "Shipment planner",
    description: "Coordinate pickups, transport partners, and delivery exceptions.",
  },
  payments: {
    eyebrow: "Financial operations",
    title: "Payments & reconciliation",
    description: "Match external references and keep order funds auditable.",
  },
  disputes: {
    eyebrow: "Resolution desk",
    title: "Dispute workbench",
    description: "Bring order, delivery, and evidence context into one decision.",
  },
  catalogue: {
    eyebrow: "Commercial vocabulary",
    title: "Catalogue overview",
    description: "Monitor product coverage, active supply, units, and grades.",
  },
  audit: {
    eyebrow: "Governance",
    title: "Audit trail",
    description: "Review append-only records of sensitive operational decisions.",
  },
};

const orderFlow: OrderStatus[] = [
  "requested",
  "quoted",
  "confirmed",
  "ready_for_pickup",
  "in_transit",
  "delivered",
  "accepted",
  "completed",
];

const shipmentNext: Record<ShipmentStatus, string> = {
  planned: "Schedule pickup",
  pickup_scheduled: "Confirm pickup",
  picked_up: "Start transit",
  in_transit: "Mark delivered",
  delivered: "Delivered",
  exception: "Resume movement",
  failed: "Shipment closed",
};

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string | undefined, locale: "en" | "fr", withTime = false) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
}

function compactDate(value: string, locale: "en" | "fr") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function quantity(value: number, unit: CommercialUnit) {
  return `${new Intl.NumberFormat("en-CM", { maximumFractionDigits: 1 }).format(value)} ${label(unit).toLowerCase()}`;
}

function toneFor(status: string) {
  if (
    [
      "active",
      "verified",
      "succeeded",
      "delivered",
      "accepted",
      "completed",
      "resolved",
      "ready_for_pickup",
    ].includes(status)
  ) {
    return "border-[var(--sage)] bg-[var(--sage)] text-[var(--forest)]";
  }
  if (["failed", "rejected", "cancelled", "refunded", "exception", "suspended"].includes(status)) {
    return "border-[var(--orange)]/20 bg-[var(--orange-soft)] text-[#9a4521]";
  }
  if (["pending", "open", "under_review", "processing", "planned", "requested"].includes(status)) {
    return "border-[var(--lime)] bg-[var(--lime)]/35 text-[var(--forest-strong)]";
  }
  return "border-[var(--line)] bg-[var(--cream)] text-[var(--muted)]";
}

function StatusPill({ status, dot = true }: { status: string; dot?: boolean }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.69rem] font-extrabold tracking-wide ${toneFor(status)}`}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label(status)}
    </span>
  );
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[1.4rem] border border-[var(--line)] bg-[var(--white)] shadow-[var(--shadow-sm)] ${className}`}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div>
        <h2 className="text-base font-extrabold tracking-[-0.02em] text-[var(--forest-strong)]">{title}</h2>
        {description && <p className="mt-1 text-sm leading-5 text-[var(--muted)]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
  icon: Icon,
  variant = "primary",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  variant?: "primary" | "secondary" | "danger" | "quiet";
  title?: string;
}) {
  const variants = {
    primary:
      "border-[var(--forest)] bg-[var(--forest)] text-white hover:bg-[var(--forest-strong)]",
    secondary:
      "border-[var(--line)] bg-white text-[var(--forest)] hover:border-[var(--forest)]/30 hover:bg-[var(--sage)]/45",
    danger:
      "border-[var(--orange)]/25 bg-[var(--orange-soft)] text-[#873b1d] hover:bg-[var(--orange)] hover:text-white",
    quiet: "border-transparent bg-transparent text-[var(--forest)] hover:bg-[var(--sage)]/55",
  };
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]}`}
    >
      {Icon && <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />}
      {children}
    </button>
  );
}

function EmptyState({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center px-6 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-sm font-extrabold text-[var(--forest-strong)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{detail}</p>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label: metricLabel,
  value,
  note,
  accent = false,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`relative min-w-0 overflow-hidden rounded-[1.35rem] border p-5 shadow-[var(--shadow-sm)] ${
        accent
          ? "border-[var(--forest)] bg-[var(--forest)] text-white"
          : "border-[var(--line)] bg-[var(--white)] text-[var(--forest-strong)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-bold ${accent ? "text-white/65" : "text-[var(--muted)]"}`}>{metricLabel}</p>
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
            accent ? "bg-[var(--lime)] text-[var(--forest)]" : "bg-[var(--sage)] text-[var(--forest)]"
          }`}
        >
          <Icon aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" strokeWidth={2.25} />
        </span>
      </div>
      <p className="mt-5 truncate text-[1.65rem] font-black tracking-[-0.045em]">{value}</p>
      <p className={`mt-1 text-xs ${accent ? "text-white/65" : "text-[var(--muted)]"}`}>{note}</p>
    </div>
  );
}

function ProgressBar({ value, labelText }: { value: number; labelText: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-bold text-[var(--muted)]">{labelText}</span>
        <span className="font-black text-[var(--forest)]">{Math.round(clamped)}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={labelText}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(clamped)}
        className="h-2 overflow-hidden rounded-full bg-[var(--cream-deep)]"
      >
        <div
          className="h-full rounded-full bg-[var(--lime-strong)] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function getOrganisation(state: DomainState, id: string) {
  return state.organisations.find((organisation) => organisation.id === id);
}

function getProduct(state: DomainState, id: string) {
  return state.products.find((product) => product.id === id);
}

function getOrder(state: DomainState, id: string) {
  return state.orders.find((order) => order.id === id);
}

function countAllocated(state: DomainState, itemId: string) {
  return state.allocations
    .filter((allocation) => allocation.demandItemId === itemId && allocation.status !== "cancelled")
    .reduce((sum, allocation) => sum + allocation.quantity, 0);
}

function queueState(app: AppContext) {
  const { state, metrics } = app;
  return [
    {
      label: "Verification reviews",
      count: state.organisations.filter((organisation) => organisation.verificationStatus === "pending").length,
      detail: "Organisations awaiting a trust decision",
      icon: UserCheck,
      section: "verifications",
    },
    {
      label: "Sourcing gaps",
      count: metrics.unallocatedDemandItems,
      detail: "Demand lines still below full coverage",
      icon: Boxes,
      section: "fulfillment",
    },
    {
      label: "Field movements",
      count: metrics.pickupsDue + metrics.deliveriesDue,
      detail: "Pickups and deliveries needing attention",
      icon: Truck,
      section: "logistics",
    },
    {
      label: "Exceptions",
      count: metrics.paymentExceptions + metrics.openDisputes,
      detail: "Payment failures and open disputes",
      icon: AlertTriangle,
      section: "disputes",
    },
  ];
}

export function OperationsWorkspace({ section }: { section: string }) {
  const app = useApp();
  const [notice, setNotice] = useState<Notice>(null);
  const activeSection = sectionCopy[section] ? section : "dashboard";
  const copy = sectionCopy[activeSection];

  const runAction: RunAction = (message, task) => {
    try {
      task();
      setNotice({ kind: "success", message });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "That action could not be completed.",
      });
    }
  };

  const content = (() => {
    switch (activeSection) {
      case "verifications":
        return <VerificationsSection app={app} runAction={runAction} />;
      case "fulfillment":
        return <FulfilmentSection app={app} runAction={runAction} />;
      case "orders":
        return <OrdersSection app={app} />;
      case "logistics":
        return <LogisticsSection app={app} runAction={runAction} />;
      case "payments":
        return <PaymentsSection app={app} runAction={runAction} />;
      case "disputes":
        return <DisputesSection app={app} runAction={runAction} />;
      case "catalogue":
        return <CatalogueSection app={app} />;
      case "audit":
        return <AuditSection app={app} />;
      default:
        return <DashboardSection app={app} />;
    }
  })();

  return (
    <div className="min-w-0" aria-busy={!app.hydrated}>
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">{copy.eyebrow}</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--forest-strong)] sm:text-[2.3rem]">
            {copy.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">{copy.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--line)] bg-white px-3.5 text-xs font-bold text-[var(--muted)]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--lime-strong)] opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--lime-strong)]" />
            </span>
            Live demo state · {formatDate(app.state.updatedAt, app.locale, true)}
          </div>
          {activeSection === "dashboard" && (
            <ActionButton
              icon={RefreshCcw}
              variant="secondary"
              onClick={() => runAction("Demo data restored to its starting state.", app.actions.resetDemo)}
            >
              Reset demo
            </ActionButton>
          )}
        </div>
      </header>

      {notice && (
        <div
          role="status"
          className={`mb-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold ${
            notice.kind === "success"
              ? "border-[var(--sage)] bg-[var(--sage)]/65 text-[var(--forest)]"
              : "border-[var(--orange)]/25 bg-[var(--orange-soft)] text-[#873b1d]"
          }`}
        >
          {notice.kind === "success" ? (
            <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0" />
          ) : (
            <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
          )}
          <span className="min-w-0 flex-1">{notice.message}</span>
          <button
            type="button"
            onClick={() => setNotice(null)}
            aria-label="Dismiss message"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg hover:bg-black/5"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      )}

      {content}
    </div>
  );
}

function DashboardSection({ app }: { app: AppContext }) {
  const { state, metrics, locale } = app;
  const queues = queueState(app);
  const activeOrders = state.orders
    .filter((order) => !["completed", "cancelled", "refunded"].includes(order.status))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);
  const openDemands = state.demands
    .filter((demand) => ["open", "matching", "allocating", "offered"].includes(demand.status))
    .slice(0, 4);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          icon={CircleDollarSign}
          label="Gross merchandise value"
          value={formatFcfa(metrics.gmv, locale)}
          note={`${metrics.totalOrders} orders recorded`}
          accent
        />
        <KpiCard
          icon={ShoppingBasket}
          label="Average order value"
          value={formatFcfa(metrics.averageOrderValue, locale)}
          note={`${metrics.confirmedOrders} currently active`}
        />
        <KpiCard
          icon={PackageCheck}
          label="Successful delivery"
          value={`${metrics.successfulDeliveryRate}%`}
          note={`${metrics.deliveriesDue} deliveries still due`}
        />
        <KpiCard
          icon={Users}
          label="Trading network"
          value={`${metrics.activeFarmers} / ${metrics.activeBuyers}`}
          note="Active farmers / active buyers"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.12fr_.88fr]">
        <Surface>
          <SectionHeading
            title="Action queues"
            description="Prioritised work across trust, sourcing, logistics, and support."
            action={
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--cream)] px-3 py-1.5 text-xs font-extrabold text-[var(--forest)]">
                <Activity aria-hidden="true" className="h-3.5 w-3.5" />
                {queues.reduce((sum, queue) => sum + queue.count, 0)} open
              </span>
            }
          />
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2">
            {queues.map((queue) => {
              const Icon = queue.icon;
              return (
                <Link
                  key={queue.label}
                  href={`/operations/${queue.section}`}
                  className="group flex min-h-36 items-start gap-4 bg-white p-5 transition hover:bg-[var(--sage)]/35 sm:p-6"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--sage)] text-[var(--forest)] transition group-hover:bg-[var(--lime)]">
                    <Icon aria-hidden="true" className="h-[1.15rem] w-[1.15rem]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold text-[var(--forest-strong)]">{queue.label}</span>
                      <span className="text-xl font-black text-[var(--forest)]">{queue.count}</span>
                    </span>
                    <span className="mt-2 block text-xs leading-5 text-[var(--muted)]">{queue.detail}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            title="Pilot health"
            description="Commercial signals across completed and active trade."
          />
          <div className="space-y-5 p-5 sm:p-6">
            <ProgressBar value={100 - metrics.cancellationRate} labelText="Order retention" />
            <ProgressBar value={100 - metrics.disputeRate} labelText="Dispute-free orders" />
            <ProgressBar value={metrics.successfulDeliveryRate} labelText="Delivery success" />
            <div className="grid grid-cols-3 gap-2 pt-2">
              {[
                { value: metrics.repeatBuyers, label: "Repeat buyers" },
                { value: metrics.liveListings, label: "Live listings" },
                { value: metrics.openDemands, label: "Open demands" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl bg-[var(--cream)] px-3 py-4 text-center">
                  <p className="text-xl font-black text-[var(--forest)]">{item.value}</p>
                  <p className="mt-1 text-[0.65rem] font-bold leading-4 text-[var(--muted)]">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
        <Surface className="overflow-hidden">
          <SectionHeading
            title="Orders in motion"
            description="The latest consolidated orders that still need a next step."
            action={
              <Link
                href="/operations/orders"
                className="inline-flex items-center gap-1 text-xs font-extrabold text-[var(--forest)] hover:underline"
              >
                Open control centre <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {activeOrders.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="No active orders" detail="New confirmed orders will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-[var(--line)] bg-[var(--cream)]/55 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                    <th className="px-6 py-3 font-extrabold">Order</th>
                    <th className="px-4 py-3 font-extrabold">Buyer</th>
                    <th className="px-4 py-3 font-extrabold">Delivery</th>
                    <th className="px-4 py-3 font-extrabold">Status</th>
                    <th className="px-6 py-3 text-right font-extrabold">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {activeOrders.map((order) => (
                    <tr key={order.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--sage)]/20">
                      <td className="px-6 py-4">
                        <p className="text-sm font-extrabold text-[var(--forest-strong)]">{order.reference}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{order.itemIds.length} line items</p>
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-[var(--foreground)]">
                        {getOrganisation(state, order.buyerOrganisationId)?.shortName ?? "Buyer"}
                      </td>
                      <td className="px-4 py-4 text-sm text-[var(--muted)]">{compactDate(order.deliveryDate, locale)}</td>
                      <td className="px-4 py-4"><StatusPill status={order.status} /></td>
                      <td className="px-6 py-4 text-right text-sm font-black text-[var(--forest)]">
                        {formatFcfa(order.total, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Surface>

        <Surface>
          <SectionHeading title="Demand pulse" description="Coverage on the most recent buyer requests." />
          <div className="divide-y divide-[var(--line)]">
            {openDemands.length === 0 ? (
              <EmptyState icon={Leaf} title="Demand is clear" detail="There are no active sourcing requests." />
            ) : (
              openDemands.map((demand) => {
                const items = state.demandItems.filter((item) => demand.itemIds.includes(item.id));
                const requested = items.reduce((sum, item) => sum + item.quantity, 0);
                const allocated = items.reduce((sum, item) => sum + Math.min(item.quantity, countAllocated(state, item.id)), 0);
                const coverage = requested === 0 ? 0 : (allocated / requested) * 100;
                return (
                  <div key={demand.id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-[var(--forest-strong)]">{demand.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {getOrganisation(state, demand.buyerOrganisationId)?.shortName ?? "Buyer"} · {items.length} items
                        </p>
                      </div>
                      <StatusPill status={demand.status} />
                    </div>
                    <div className="mt-4">
                      <ProgressBar value={coverage} labelText={`${Math.round(coverage)}% allocated`} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function VerificationsSection({ app, runAction }: { app: AppContext; runAction: RunAction }) {
  const { state, actions, locale } = app;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const pending = state.organisations.filter((organisation) => organisation.verificationStatus === "pending");
  const decided = state.organisations
    .filter((organisation) => organisation.verificationStatus !== "pending")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const verifiedCount = state.organisations.filter(
    (organisation) => organisation.verificationStatus === "verified",
  ).length;

  const decide = (organisationId: string, status: VerificationStatus) => {
    const organisation = getOrganisation(state, organisationId);
    runAction(
      `${organisation?.shortName ?? "Organisation"} marked ${label(status).toLowerCase()}.`,
      () => actions.verifyOrganisation({ organisationId, status, notes: notes[organisationId]?.trim() || undefined }),
    );
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={Clock3}
          label="Awaiting review"
          value={String(pending.length)}
          note="Farmer and buyer profiles"
          accent={pending.length > 0}
        />
        <KpiCard
          icon={BadgeCheck}
          label="Verified network"
          value={String(verifiedCount)}
          note="Eligible to transact"
        />
        <KpiCard
          icon={ShieldCheck}
          label="Decision rate"
          value={`${state.organisations.length === 0 ? 0 : Math.round((decided.length / state.organisations.length) * 100)}%`}
          note="Profiles reviewed"
        />
      </div>

      <Surface>
        <SectionHeading
          title="Decision queue"
          description="Check business identity, location, contact ownership, and operating profile."
          action={<StatusPill status={pending.length > 0 ? "pending" : "completed"} />}
        />
        {pending.length === 0 ? (
          <EmptyState
            icon={BadgeCheck}
            title="Verification queue cleared"
            detail="New farmer and buyer submissions will be added here for review."
          />
        ) : (
          <div className="grid gap-4 p-4 lg:grid-cols-2 sm:p-6">
            {pending.map((organisation) => {
              const primaryAddress = organisation.addresses.find((address) => address.isDefault) ?? organisation.addresses[0];
              const categories = organisation.produceCategoryIds
                .map((productId) => getProduct(state, productId))
                .filter(Boolean)
                .map((product) => localise(product!.name, locale));
              return (
                <article
                  key={organisation.id}
                  className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--cream)]/40 p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--forest)] text-sm font-black text-white">
                      {organisation.shortName.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-black tracking-[-0.02em] text-[var(--forest-strong)]">
                            {organisation.name}
                          </h3>
                          <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">
                            {label(organisation.type)} · submitted {compactDate(organisation.createdAt, locale)}
                          </p>
                        </div>
                        <StatusPill status={organisation.verificationStatus} />
                      </div>
                    </div>
                  </div>

                  <dl className="mt-5 grid gap-3 rounded-2xl border border-[var(--line)] bg-white p-4 text-xs sm:grid-cols-2">
                    <div>
                      <dt className="font-bold text-[var(--muted)]">Primary contact</dt>
                      <dd className="mt-1 font-extrabold text-[var(--forest-strong)]">{organisation.contactPerson}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[var(--muted)]">Phone</dt>
                      <dd className="mt-1 font-extrabold text-[var(--forest-strong)]">{organisation.phone}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[var(--muted)]">Location</dt>
                      <dd className="mt-1 font-extrabold text-[var(--forest-strong)]">
                        {primaryAddress ? `${primaryAddress.locality}, ${primaryAddress.region}` : "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-[var(--muted)]">Registration</dt>
                      <dd className="mt-1 font-extrabold text-[var(--forest-strong)]">
                        {organisation.registrationNumber ?? "Individual operator"}
                      </dd>
                    </div>
                  </dl>

                  {categories.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {categories.slice(0, 4).map((category) => (
                        <span
                          key={category}
                          className="rounded-full bg-[var(--sage)] px-2.5 py-1 text-[0.68rem] font-extrabold text-[var(--forest)]"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  )}

                  <label className="mt-4 block text-xs font-extrabold text-[var(--forest-strong)]" htmlFor={`note-${organisation.id}`}>
                    Decision note <span className="font-normal text-[var(--muted)]">(optional)</span>
                  </label>
                  <textarea
                    id={`note-${organisation.id}`}
                    rows={2}
                    value={notes[organisation.id] ?? ""}
                    onChange={(event) =>
                      setNotes((current) => ({ ...current, [organisation.id]: event.target.value }))
                    }
                    placeholder="Add the reason or evidence checked…"
                    className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]/70 focus:border-[var(--forest)]"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton icon={Check} onClick={() => decide(organisation.id, "verified")}>
                      Approve profile
                    </ActionButton>
                    <ActionButton
                      icon={XCircle}
                      variant="danger"
                      disabled={!notes[organisation.id]?.trim()}
                      title={!notes[organisation.id]?.trim() ? "Add a decision note before rejecting this profile." : undefined}
                      onClick={() => decide(organisation.id, "rejected")}
                    >
                      Reject
                    </ActionButton>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Surface>

      <Surface className="overflow-hidden">
        <SectionHeading title="Recent decisions" description="Latest verification states across the network." />
        {decided.length === 0 ? (
          <EmptyState icon={History} title="No decisions yet" detail="Approved and rejected profiles will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left">
              <thead className="border-b border-[var(--line)] bg-[var(--cream)]/55 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-3 font-extrabold">Organisation</th>
                  <th className="px-4 py-3 font-extrabold">Type</th>
                  <th className="px-4 py-3 font-extrabold">Location</th>
                  <th className="px-4 py-3 font-extrabold">Decision</th>
                  <th className="px-6 py-3 text-right font-extrabold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {decided.slice(0, 8).map((organisation) => (
                  <tr key={organisation.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="px-6 py-4">
                      <p className="text-sm font-extrabold text-[var(--forest-strong)]">{organisation.name}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{organisation.contactPerson}</p>
                    </td>
                    <td className="px-4 py-4 text-sm font-bold text-[var(--muted)]">{label(organisation.type)}</td>
                    <td className="px-4 py-4 text-sm text-[var(--muted)]">{organisation.addresses[0]?.region ?? "—"}</td>
                    <td className="px-4 py-4"><StatusPill status={organisation.verificationStatus} /></td>
                    <td className="px-6 py-4 text-right text-xs font-bold text-[var(--muted)]">
                      {formatDate(organisation.updatedAt, locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

function candidateForItem(state: DomainState, item: DemandItem) {
  const itemAllocations = state.allocations.filter(
    (allocation) => allocation.demandItemId === item.id && allocation.status !== "cancelled",
  );
  const eligibleQuotes = state.quotes
    .filter((quote) => quote.demandItemId === item.id && ["submitted", "shortlisted", "accepted"].includes(quote.status))
    .map((quote) => {
      const used = itemAllocations
        .filter((allocation) => allocation.quoteId === quote.id)
        .reduce((sum, allocation) => sum + allocation.quantity, 0);
      return { kind: "quote" as const, quote, available: Math.max(0, quote.availableQuantity - used) };
    })
    .filter((candidate) => candidate.available > 0)
    .sort((a, b) => a.quote.unitPrice - b.quote.unitPrice);
  if (eligibleQuotes[0]) return eligibleQuotes[0];

  const eligibleListings = state.listings
    .filter((listing) => {
      const organisation = getOrganisation(state, listing.farmerOrganisationId);
      return (
        listing.productId === item.productId &&
        listing.status === "active" &&
        listing.unit === item.unit &&
        listing.availableQuantity - listing.reservedQuantity > 0 &&
        organisation?.verificationStatus === "verified"
      );
    })
    .sort((a, b) => a.unitPrice - b.unitPrice);
  const listing = eligibleListings[0];
  return listing
    ? { kind: "listing" as const, listing, available: listing.availableQuantity - listing.reservedQuantity }
    : undefined;
}

function FulfilmentSection({ app, runAction }: { app: AppContext; runAction: RunAction }) {
  const { state, actions, locale, metrics } = app;
  const activeDemands = state.demands
    .filter((demand) => ["open", "matching", "allocating", "offered"].includes(demand.status))
    .sort((a, b) => a.requiredDeliveryDate.localeCompare(b.requiredDeliveryDate));

  const allocate = (item: DemandItem) => {
    const alreadyAllocated = countAllocated(state, item.id);
    const remaining = Math.max(0, item.quantity - alreadyAllocated);
    const candidate = candidateForItem(state, item);
    if (!candidate || remaining <= 0) return;
    const allocatedQuantity = Math.min(remaining, candidate.available);
    if (candidate.kind === "quote") {
      actions.createAllocation({
        demandItemId: item.id,
        quoteId: candidate.quote.id,
        sourceListingId: candidate.quote.sourceListingId,
        farmerOrganisationId: candidate.quote.farmerOrganisationId,
        quantity: allocatedQuantity,
        farmerUnitPrice: candidate.quote.unitPrice,
        operationsNote: "Allocated from the operations fulfilment builder.",
      });
    } else {
      actions.createAllocation({
        demandItemId: item.id,
        sourceListingId: candidate.listing.id,
        farmerOrganisationId: candidate.listing.farmerOrganisationId,
        quantity: allocatedQuantity,
        farmerUnitPrice: candidate.listing.unitPrice,
        operationsNote: "Allocated from verified active supply.",
      });
    }
  };

  const sendOffer = (demand: DemandRequest) => {
    const allocationIds = state.allocations
      .filter(
        (allocation) =>
          allocation.demandId === demand.id &&
          !allocation.orderId &&
          allocation.status === "proposed",
      )
      .map((allocation) => allocation.id);
    actions.createOffer({
      demandId: demand.id,
      allocationIds,
      deliveryFee: 25_000,
      serviceFeeRate: 0.04,
      operationsNote: "Supply verified and consolidated by FarmToMarket operations.",
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ShoppingBasket} label="Open demand" value={String(metrics.openDemands)} note="Buyer requests in sourcing" accent />
        <KpiCard icon={Boxes} label="Sourcing gaps" value={String(metrics.unallocatedDemandItems)} note="Lines below full coverage" />
        <KpiCard icon={Leaf} label="Candidate quotes" value={String(state.quotes.filter((quote) => ["submitted", "shortlisted"].includes(quote.status)).length)} note="Farmer responses to review" />
        <KpiCard icon={CircleDollarSign} label="Available supply" value={formatFcfa(metrics.availableSupplyValue, locale)} note={`${metrics.liveListings} active listings`} />
      </div>

      {activeDemands.length === 0 ? (
        <Surface>
          <EmptyState icon={PackageCheck} title="Sourcing queue cleared" detail="Open buyer demand will appear here for allocation." />
        </Surface>
      ) : (
        <div className="space-y-5">
          {activeDemands.map((demand) => {
            const buyer = getOrganisation(state, demand.buyerOrganisationId);
            const items = state.demandItems.filter((item) => demand.itemIds.includes(item.id));
            const fullCoverage = items.length > 0 && items.every((item) => countAllocated(state, item.id) >= item.quantity);
            const totalRequested = items.reduce((sum, item) => sum + item.quantity, 0);
            const totalAllocated = items.reduce(
              (sum, item) => sum + Math.min(item.quantity, countAllocated(state, item.id)),
              0,
            );
            const overallCoverage = totalRequested === 0 ? 0 : (totalAllocated / totalRequested) * 100;
            const offerAlreadySent = ["offered", "fulfilled"].includes(demand.status);
            return (
              <Surface key={demand.id} className="overflow-hidden">
                <div className="bg-[var(--forest)] px-5 py-5 text-white sm:px-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[0.68rem] font-extrabold tracking-wide text-white/75">
                          {demand.reference}
                        </span>
                        <StatusPill status={demand.status} />
                        {demand.recurring && (
                          <span className="rounded-full bg-[var(--lime)] px-2.5 py-1 text-[0.68rem] font-extrabold text-[var(--forest)]">
                            Repeat demand
                          </span>
                        )}
                      </div>
                      <h2 className="mt-3 text-xl font-black tracking-[-0.025em]">{demand.title}</h2>
                      <p className="mt-1 text-sm text-white/65">
                        {buyer?.name ?? "Buyer"} · due {formatDate(demand.requiredDeliveryDate, locale)} · {demand.deliveryAddress.city}
                      </p>
                    </div>
                    <div className="min-w-[13rem] rounded-2xl bg-white/10 p-4">
                      <div className="flex items-center justify-between text-xs font-bold text-white/65">
                        <span>Overall allocation</span>
                        <span className="text-white">{Math.round(overallCoverage)}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
                        <div className="h-full rounded-full bg-[var(--lime)]" style={{ width: `${Math.min(100, overallCoverage)}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-[var(--line)]">
                  {items.map((item) => {
                    const product = getProduct(state, item.productId);
                    const allocated = countAllocated(state, item.id);
                    const remaining = Math.max(0, item.quantity - allocated);
                    const coverage = item.quantity === 0 ? 0 : (allocated / item.quantity) * 100;
                    const candidate = candidateForItem(state, item);
                    const candidateOrgId =
                      candidate?.kind === "quote"
                        ? candidate.quote.farmerOrganisationId
                        : candidate?.kind === "listing"
                          ? candidate.listing.farmerOrganisationId
                          : undefined;
                    const candidatePrice =
                      candidate?.kind === "quote"
                        ? candidate.quote.unitPrice
                        : candidate?.kind === "listing"
                          ? candidate.listing.unitPrice
                          : undefined;
                    return (
                      <div key={item.id} className="grid gap-5 p-5 lg:grid-cols-[1.05fr_.8fr_auto] lg:items-center sm:p-6">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <span
                              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl"
                              style={{ backgroundColor: product?.accent || "var(--sage)" }}
                              aria-hidden="true"
                            >
                              <Leaf className="h-5 w-5 text-[var(--forest)]" />
                            </span>
                            <div>
                              <h3 className="font-extrabold text-[var(--forest-strong)]">
                                {product ? localise(product.name, locale) : "Produce"}
                              </h3>
                              <p className="mt-0.5 text-xs text-[var(--muted)]">
                                {quantity(item.quantity, item.unit)} requested · {label(item.grade)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 max-w-md">
                            <ProgressBar value={coverage} labelText={`${quantity(allocated, item.unit)} allocated`} />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-[var(--line)] bg-[var(--cream)]/55 p-4">
                          {remaining <= 0 ? (
                            <div className="flex items-center gap-3 text-sm font-extrabold text-[var(--forest)]">
                              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
                              Fully covered
                            </div>
                          ) : candidate && candidateOrgId && candidatePrice !== undefined ? (
                            <div>
                              <p className="text-[0.68rem] font-extrabold uppercase tracking-[0.11em] text-[var(--muted)]">Best next source</p>
                              <p className="mt-2 text-sm font-extrabold text-[var(--forest-strong)]">
                                {getOrganisation(state, candidateOrgId)?.shortName ?? "Verified farmer"}
                              </p>
                              <p className="mt-1 text-xs text-[var(--muted)]">
                                {quantity(candidate.available, item.unit)} available · {formatFcfa(candidatePrice, locale)}/{label(item.unit).toLowerCase()}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-start gap-3 text-sm">
                              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--orange)]" />
                              <div>
                                <p className="font-extrabold text-[var(--forest-strong)]">No eligible source</p>
                                <p className="mt-1 text-xs text-[var(--muted)]">Request more farmer responses for {quantity(remaining, item.unit)}.</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <ActionButton
                          icon={remaining <= 0 ? Check : Sparkles}
                          disabled={remaining <= 0 || !candidate}
                          onClick={() =>
                            runAction(
                              `${product ? localise(product.name, locale) : "Demand item"} allocation added.`,
                              () => allocate(item),
                            )
                          }
                        >
                          {remaining <= 0
                            ? "Covered"
                            : candidate
                              ? `Allocate ${quantity(Math.min(remaining, candidate.available), item.unit)}`
                              : "Find supply"}
                        </ActionButton>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--cream)]/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
                    {fullCoverage ? (
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-[var(--forest)]" />
                    ) : (
                      <Clock3 aria-hidden="true" className="h-4 w-4 text-[var(--orange)]" />
                    )}
                    {fullCoverage ? "Every line is covered and ready to consolidate." : "Complete all line allocations before sending an offer."}
                  </div>
                  <ActionButton
                    icon={FileCheck2}
                    disabled={!fullCoverage || offerAlreadySent}
                    onClick={() =>
                      runAction(`Consolidated offer created for ${demand.reference}.`, () => sendOffer(demand))
                    }
                  >
                    {offerAlreadySent ? "Offer sent" : "Create consolidated offer"}
                  </ActionButton>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OrderTimeline({ order }: { order: Order }) {
  const isTerminalException = ["disputed", "cancelled", "refunded"].includes(order.status);
  const statusIndex = orderFlow.indexOf(order.status);
  const currentIndex =
    statusIndex >= 0
      ? statusIndex
      : order.deliveredAt
        ? orderFlow.indexOf("delivered")
        : order.confirmedAt
          ? orderFlow.indexOf("confirmed")
          : -1;
  return (
    <ol aria-label={`Order progress for ${order.reference}`} className="grid grid-cols-4 gap-y-5 sm:grid-cols-8">
      {orderFlow.map((status, index) => {
        const complete = index <= currentIndex;
        const current = !isTerminalException && index === currentIndex;
        return (
          <li key={status} className="relative min-w-0 text-center">
            {index > 0 && (
              <span
                aria-hidden="true"
                className={`absolute right-1/2 top-[0.78rem] h-0.5 w-full ${complete ? "bg-[var(--lime-strong)]" : "bg-[var(--line)]"}`}
              />
            )}
            <span
              className={`relative mx-auto grid h-6 w-6 place-items-center rounded-full border-2 ${
                complete
                  ? "border-[var(--lime-strong)] bg-[var(--lime)] text-[var(--forest)]"
                  : "border-[var(--line)] bg-white text-[var(--muted)]"
              }`}
            >
              {complete ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            </span>
            <span className={`mt-2 block px-1 text-[0.59rem] font-bold leading-3 ${current ? "text-[var(--forest)]" : "text-[var(--muted)]"}`}>
              {label(status)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function OrdersSection({ app }: { app: AppContext }) {
  const { state, locale, metrics } = app;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const orders = useMemo(
    () =>
      [...state.orders]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .filter((order) => {
          const buyer = getOrganisation(state, order.buyerOrganisationId);
          const haystack = `${order.reference} ${order.status} ${buyer?.name ?? ""}`.toLowerCase();
          return haystack.includes(query.trim().toLowerCase());
        }),
    [query, state],
  );
  const selectedOrder =
    state.orders.find((order) => order.id === selectedId) ??
    orders.find((order) => !["completed", "cancelled", "refunded"].includes(order.status)) ??
    orders[0];
  const selectedItems = selectedOrder
    ? state.orderItems.filter((item) => selectedOrder.itemIds.includes(item.id) || item.orderId === selectedOrder.id)
    : [];
  const selectedAllocations = selectedOrder
    ? state.allocations.filter((allocation) => allocation.orderId === selectedOrder.id)
    : [];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard icon={ShoppingBasket} label="All orders" value={String(metrics.totalOrders)} note="Across every lifecycle stage" accent />
        <KpiCard icon={PackageCheck} label="Active orders" value={String(metrics.confirmedOrders)} note="Confirmed through accepted" />
        <KpiCard icon={Banknote} label="Average value" value={formatFcfa(metrics.averageOrderValue, locale)} note="Per commercial order" />
        <KpiCard icon={Percent} label="Cancellation rate" value={`${metrics.cancellationRate}%`} note={`${metrics.disputeRate}% dispute rate`} />
      </div>

      {selectedOrder && (
        <Surface className="overflow-hidden">
          <div className="bg-[var(--forest)] px-5 py-6 text-white sm:px-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={selectedOrder.status} />
                  <StatusPill status={selectedOrder.paymentStatus} />
                  {selectedOrder.shipmentStatus && <StatusPill status={selectedOrder.shipmentStatus} />}
                </div>
                <h2 className="mt-4 text-2xl font-black tracking-[-0.035em]">{selectedOrder.reference}</h2>
                <p className="mt-1 text-sm text-white/65">
                  {getOrganisation(state, selectedOrder.buyerOrganisationId)?.name ?? "Buyer"} · delivery {formatDate(selectedOrder.deliveryDate, locale)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-[0.64rem] font-bold uppercase tracking-wider text-white/55">Order value</p>
                  <p className="mt-1 text-sm font-black">{formatFcfa(selectedOrder.total, locale)}</p>
                </div>
                <div className="rounded-xl bg-white/10 px-4 py-3">
                  <p className="text-[0.64rem] font-bold uppercase tracking-wider text-white/55">Suppliers</p>
                  <p className="mt-1 text-sm font-black">{new Set(selectedAllocations.map((allocation) => allocation.farmerOrganisationId)).size}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-white/10 px-4 py-3 sm:col-span-1">
                  <p className="text-[0.64rem] font-bold uppercase tracking-wider text-white/55">Destination</p>
                  <p className="mt-1 truncate text-sm font-black">{selectedOrder.deliveryAddress.city}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            {["disputed", "cancelled", "refunded"].includes(selectedOrder.status) && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[var(--orange)]/25 bg-[var(--orange-soft)] px-4 py-3 text-sm font-bold text-[#873b1d]">
                <AlertTriangle aria-hidden="true" className="h-5 w-5 shrink-0" />
                This order left the standard fulfilment path: {label(selectedOrder.status)}.
              </div>
            )}
            <OrderTimeline order={selectedOrder} />
          </div>

          <div className="grid border-t border-[var(--line)] lg:grid-cols-[1.2fr_.8fr]">
            <div className="border-b border-[var(--line)] p-5 lg:border-b-0 lg:border-r sm:p-7">
              <h3 className="text-sm font-extrabold text-[var(--forest-strong)]">Commercial lines</h3>
              <div className="mt-4 space-y-3">
                {selectedItems.length === 0 ? (
                  <p className="rounded-2xl bg-[var(--cream)] p-4 text-sm text-[var(--muted)]">No line items recorded.</p>
                ) : (
                  selectedItems.map((item) => {
                    const product = getProduct(state, item.productId);
                    return (
                      <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-[var(--line)] p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--sage)] text-[var(--forest)]">
                          <Leaf aria-hidden="true" className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-extrabold text-[var(--forest-strong)]">
                            {product ? localise(product.name, locale) : "Produce"}
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {quantity(item.quantity, item.unit)} · {label(item.grade)} · {quantity(item.allocatedQuantity, item.unit)} allocated
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[var(--forest)]">{formatFcfa(item.lineTotal, locale)}</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            <div className="bg-[var(--cream)]/35 p-5 sm:p-7">
              <h3 className="text-sm font-extrabold text-[var(--forest-strong)]">Order summary</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4 text-[var(--muted)]"><dt>Produce subtotal</dt><dd className="font-bold">{formatFcfa(selectedOrder.subtotal, locale)}</dd></div>
                <div className="flex justify-between gap-4 text-[var(--muted)]"><dt>Service fee</dt><dd className="font-bold">{formatFcfa(selectedOrder.serviceFee, locale)}</dd></div>
                <div className="flex justify-between gap-4 text-[var(--muted)]"><dt>Delivery fee</dt><dd className="font-bold">{formatFcfa(selectedOrder.deliveryFee, locale)}</dd></div>
                <div className="flex justify-between gap-4 border-t border-[var(--line)] pt-3 text-[var(--forest-strong)]"><dt className="font-extrabold">Total</dt><dd className="font-black">{formatFcfa(selectedOrder.total, locale)}</dd></div>
              </dl>
              {selectedOrder.operationsNote && (
                <div className="mt-5 rounded-2xl border border-[var(--line)] bg-white p-4">
                  <p className="text-[0.65rem] font-extrabold uppercase tracking-wider text-[var(--muted)]">Operations note</p>
                  <p className="mt-2 text-xs leading-5 text-[var(--foreground)]">{selectedOrder.operationsNote}</p>
                </div>
              )}
            </div>
          </div>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SectionHeading
          title="Order register"
          description="Select an order to inspect its line items and lifecycle."
          action={
            <label className="relative block">
              <span className="sr-only">Search orders</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search orders"
                className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--forest)] sm:w-56"
              />
            </label>
          }
        />
        {orders.length === 0 ? (
          <EmptyState icon={Search} title="No matching orders" detail="Try a different reference, buyer, or status." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left">
              <thead className="border-b border-[var(--line)] bg-[var(--cream)]/55 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                <tr>
                  <th className="px-6 py-3 font-extrabold">Reference</th>
                  <th className="px-4 py-3 font-extrabold">Buyer</th>
                  <th className="px-4 py-3 font-extrabold">Order status</th>
                  <th className="px-4 py-3 font-extrabold">Payment</th>
                  <th className="px-4 py-3 font-extrabold">Delivery</th>
                  <th className="px-4 py-3 text-right font-extrabold">Total</th>
                  <th className="px-6 py-3"><span className="sr-only">View</span></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    className={`border-b border-[var(--line)] last:border-0 ${selectedOrder?.id === order.id ? "bg-[var(--sage)]/30" : "hover:bg-[var(--cream)]/40"}`}
                  >
                    <td className="px-6 py-4 text-sm font-extrabold text-[var(--forest-strong)]">{order.reference}</td>
                    <td className="px-4 py-4 text-sm font-bold text-[var(--foreground)]">{getOrganisation(state, order.buyerOrganisationId)?.shortName ?? "Buyer"}</td>
                    <td className="px-4 py-4"><StatusPill status={order.status} /></td>
                    <td className="px-4 py-4"><StatusPill status={order.paymentStatus} /></td>
                    <td className="px-4 py-4 text-sm text-[var(--muted)]">{compactDate(order.deliveryDate, locale)}</td>
                    <td className="px-4 py-4 text-right text-sm font-black text-[var(--forest)]">{formatFcfa(order.total, locale)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedId(order.id)}
                        aria-label={`Inspect order ${order.reference}`}
                        className="inline-grid h-9 w-9 place-items-center rounded-xl border border-[var(--line)] text-[var(--forest)] hover:bg-[var(--sage)]"
                      >
                        <ChevronRight aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

function LogisticsSection({ app, runAction }: { app: AppContext; runAction: RunAction }) {
  const { state, metrics, actions, locale } = app;
  const shipments = [...state.shipments].sort((a, b) => {
    const exceptionA = ["exception", "failed"].includes(a.status) ? 0 : 1;
    const exceptionB = ["exception", "failed"].includes(b.status) ? 0 : 1;
    return exceptionA - exceptionB || b.updatedAt.localeCompare(a.updatedAt);
  });
  const exceptions = shipments.filter((shipment) => ["exception", "failed"].includes(shipment.status)).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={Route} label="Pickups due" value={String(metrics.pickupsDue)} note="Planned or scheduled" accent />
        <KpiCard icon={Truck} label="Deliveries due" value={String(metrics.deliveriesDue)} note="Picked up or in transit" />
        <KpiCard icon={AlertTriangle} label="Exceptions" value={String(exceptions)} note="Movement needing intervention" />
      </div>

      {shipments.length === 0 ? (
        <Surface><EmptyState icon={Truck} title="No shipments planned" detail="Shipments appear after a confirmed, paid order is assigned for transport." /></Surface>
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {shipments.map((shipment) => {
            const order = getOrder(state, shipment.orderId);
            const buyer = order ? getOrganisation(state, order.buyerOrganisationId) : undefined;
            const completeStops = shipment.pickupStops.filter((stop) => stop.status === "completed").length;
            const canAdvance = !["delivered", "failed"].includes(shipment.status);
            return (
              <Surface key={shipment.id} className="overflow-hidden">
                <div className={`px-5 py-5 sm:px-6 ${shipment.status === "exception" ? "bg-[var(--orange-soft)]" : "bg-[var(--forest)] text-white"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[0.68rem] font-extrabold uppercase tracking-wider ${shipment.status === "exception" ? "text-[#873b1d]/65" : "text-white/55"}`}>{shipment.reference}</span>
                        <StatusPill status={shipment.status} />
                      </div>
                      <h2 className={`mt-3 text-lg font-black ${shipment.status === "exception" ? "text-[var(--forest-strong)]" : "text-white"}`}>
                        {order?.reference ?? "Order"} · {buyer?.shortName ?? "Buyer"}
                      </h2>
                      <p className={`mt-1 text-xs ${shipment.status === "exception" ? "text-[#873b1d]/70" : "text-white/60"}`}>
                        {shipment.transporterName} · {shipment.vehicleDetails ?? "Vehicle pending"}
                      </p>
                    </div>
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${shipment.status === "exception" ? "bg-white text-[var(--orange)]" : "bg-white/10 text-[var(--lime)]"}`}>
                      <Truck aria-hidden="true" className="h-5 w-5" />
                    </span>
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  {shipment.exceptionNote && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[var(--orange)]/20 bg-[var(--orange-soft)] p-4 text-sm text-[#873b1d]">
                      <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                      <div><p className="font-extrabold">Shipment exception</p><p className="mt-1 text-xs leading-5">{shipment.exceptionNote}</p></div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--sage)] text-[var(--forest)]"><Route aria-hidden="true" className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[var(--muted)]">Route progress</p>
                      <p className="text-sm font-extrabold text-[var(--forest-strong)]">{completeStops} of {shipment.pickupStops.length} pickups complete</p>
                    </div>
                  </div>

                  <div className="relative mt-5 space-y-4 before:absolute before:bottom-4 before:left-[0.68rem] before:top-4 before:w-px before:bg-[var(--line)]">
                    {shipment.pickupStops.map((stop, index) => (
                      <div key={stop.id} className="relative flex gap-3">
                        <span className={`relative z-10 mt-0.5 grid h-[1.4rem] w-[1.4rem] shrink-0 place-items-center rounded-full border-2 ${stop.status === "completed" ? "border-[var(--lime-strong)] bg-[var(--lime)] text-[var(--forest)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}>
                          {stop.status === "completed" ? <Check aria-hidden="true" className="h-3 w-3" strokeWidth={3} /> : <span className="text-[0.55rem] font-black">{index + 1}</span>}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-extrabold text-[var(--forest-strong)]">{stop.contactName}</p>
                            <span className="text-[0.68rem] font-bold text-[var(--muted)]">{formatDate(stop.plannedAt, locale, true)}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">{stop.address.locality}, {stop.address.region}</p>
                        </div>
                      </div>
                    ))}
                    <div className="relative flex gap-3">
                      <span className="relative z-10 mt-0.5 grid h-[1.4rem] w-[1.4rem] shrink-0 place-items-center rounded-full border-2 border-[var(--forest)] bg-[var(--forest)] text-white"><MapPin aria-hidden="true" className="h-3 w-3" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-extrabold text-[var(--forest-strong)]">{shipment.deliveryAddress.label}</p>
                          <span className="text-[0.68rem] font-bold text-[var(--muted)]">{formatDate(shipment.expectedDeliveryAt, locale, true)}</span>
                        </div>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">{shipment.deliveryAddress.addressLine}, {shipment.deliveryAddress.city}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--cream)]/45 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <p className="text-xs font-bold text-[var(--muted)]">Driver: {shipment.driverName ?? shipment.transporterName} · {shipment.transporterPhone}</p>
                  <ActionButton
                    icon={canAdvance ? ArrowRight : CheckCircle2}
                    disabled={!canAdvance}
                    onClick={() => runAction(`${shipment.reference} moved to its next milestone.`, () => actions.advanceShipment(shipment.id))}
                  >
                    {shipmentNext[shipment.status]}
                  </ActionButton>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PaymentsSection({ app, runAction }: { app: AppContext; runAction: RunAction }) {
  const { state, metrics, actions, locale } = app;
  const [query, setQuery] = useState("");
  const [references, setReferences] = useState<Record<string, string>>({});
  const payments = useMemo(
    () =>
      [...state.payments]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .filter((payment) => {
          const order = getOrder(state, payment.orderId);
          return `${payment.transactionReference} ${payment.provider} ${payment.status} ${order?.reference ?? ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase());
        }),
    [query, state],
  );
  const pendingOrders = state.orders.filter(
    (order) =>
      ["confirmed", "ready_for_pickup"].includes(order.status) &&
      !["succeeded", "partially_refunded", "refunded"].includes(order.paymentStatus),
  );
  const settled = state.payments
    .filter((payment) => ["succeeded", "partially_refunded"].includes(payment.status))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const confirmTransfer = (order: Order) => {
    const existing = state.payments.find(
      (payment) => payment.orderId === order.id && ["pending", "processing"].includes(payment.status),
    );
    const latestAttempt = state.payments.find(
      (payment) => payment.orderId === order.id && payment.status !== "succeeded",
    );
    const transactionReference = references[order.id]?.trim() || existing?.transactionReference;
    if (!transactionReference) throw new Error("Enter the verified provider or bank reference first.");
    actions.confirmPayment({
      orderId: order.id,
      provider: existing?.provider ?? latestAttempt?.provider ?? "bank_transfer",
      transactionReference,
      amount: order.total,
      payerMaskedAccount: existing?.payerMaskedAccount ?? latestAttempt?.payerMaskedAccount,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={CircleDollarSign} label="Reconciled value" value={formatFcfa(settled, locale)} note="Successful external transactions" accent />
        <KpiCard icon={Clock3} label="Awaiting payment" value={String(pendingOrders.length)} note="Commercial orders to reconcile" />
        <KpiCard icon={AlertTriangle} label="Payment exceptions" value={String(metrics.paymentExceptions)} note="Failed provider references" />
      </div>

      {pendingOrders.length > 0 && (
        <Surface>
          <SectionHeading
            title="Manual reconciliation queue"
            description="Verify the submitted reference against the external provider or bank statement."
            action={<StatusPill status="pending" />}
          />
          <div className="grid gap-3 p-4 lg:grid-cols-2 sm:p-6">
            {pendingOrders.map((order) => {
              const payment = state.payments.find(
                (transaction) => transaction.orderId === order.id && transaction.status !== "succeeded",
              );
              return (
                <article key={order.id} className="rounded-[1.25rem] border border-[var(--line)] bg-[var(--cream)]/45 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-extrabold uppercase tracking-wider text-[var(--muted)]">{order.reference}</p>
                      <h3 className="mt-1 text-base font-black text-[var(--forest-strong)]">
                        {getOrganisation(state, order.buyerOrganisationId)?.name ?? "Buyer"}
                      </h3>
                    </div>
                    <StatusPill status={payment?.status ?? order.paymentStatus} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 text-xs">
                    <div><dt className="font-bold text-[var(--muted)]">Amount expected</dt><dd className="mt-1 font-black text-[var(--forest)]">{formatFcfa(order.total, locale)}</dd></div>
                    <div><dt className="font-bold text-[var(--muted)]">Provider</dt><dd className="mt-1 font-extrabold text-[var(--forest-strong)]">{payment ? label(payment.provider) : "Bank transfer"}</dd></div>
                    <div className="col-span-2"><dt className="font-bold text-[var(--muted)]">Reference</dt><dd className="mt-1 break-all font-mono text-xs font-extrabold text-[var(--forest-strong)]">{payment?.transactionReference ?? "Reference pending operations entry"}</dd></div>
                  </dl>
                  {payment?.failureReason && <p className="mt-3 rounded-xl bg-[var(--orange-soft)] px-3 py-2 text-xs font-bold text-[#873b1d]">{payment.failureReason}</p>}
                  <label htmlFor={`payment-reference-${order.id}`} className="mt-4 block text-xs font-extrabold text-[var(--forest-strong)]">
                    Verified provider / bank reference
                  </label>
                  <input
                    id={`payment-reference-${order.id}`}
                    value={references[order.id] ?? (payment && ["pending", "processing"].includes(payment.status) ? payment.transactionReference : "")}
                    onChange={(event) =>
                      setReferences((current) => ({ ...current, [order.id]: event.target.value }))
                    }
                    placeholder="e.g. AFB-260722-123456"
                    className="mt-2 h-11 w-full rounded-xl border border-[var(--line)] bg-white px-3 font-mono text-sm outline-none placeholder:font-sans placeholder:text-[var(--muted)]/70 focus:border-[var(--forest)]"
                  />
                  <div className="mt-4 flex justify-end">
                    <ActionButton
                      icon={CheckCircle2}
                      disabled={
                        !(references[order.id]?.trim() || (payment && ["pending", "processing"].includes(payment.status)))
                      }
                      title={
                        references[order.id]?.trim() || (payment && ["pending", "processing"].includes(payment.status))
                          ? undefined
                          : "Enter the verified payment reference first."
                      }
                      onClick={() => runAction(`Payment confirmed for ${order.reference}.`, () => confirmTransfer(order))}
                    >
                      Verify transfer
                    </ActionButton>
                  </div>
                </article>
              );
            })}
          </div>
        </Surface>
      )}

      <Surface className="overflow-hidden">
        <SectionHeading
          title="Transaction register"
          description="External references and the latest reconciliation state."
          action={
            <label className="relative block">
              <span className="sr-only">Search transactions</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search reference"
                className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--forest)] sm:w-56"
              />
            </label>
          }
        />
        {payments.length === 0 ? (
          <EmptyState icon={WalletCards} title="No transactions found" detail="Payment attempts will appear here with provider references." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-[var(--line)] bg-[var(--cream)]/55 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                <tr><th className="px-6 py-3 font-extrabold">Reference</th><th className="px-4 py-3 font-extrabold">Order</th><th className="px-4 py-3 font-extrabold">Provider</th><th className="px-4 py-3 font-extrabold">Status</th><th className="px-4 py-3 font-extrabold">Updated</th><th className="px-6 py-3 text-right font-extrabold">Amount</th></tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--cream)]/35">
                    <td className="px-6 py-4 font-mono text-xs font-extrabold text-[var(--forest-strong)]">{payment.transactionReference}</td>
                    <td className="px-4 py-4 text-sm font-extrabold text-[var(--forest)]">{getOrder(state, payment.orderId)?.reference ?? "Order"}</td>
                    <td className="px-4 py-4 text-sm font-bold text-[var(--muted)]">{label(payment.provider)}</td>
                    <td className="px-4 py-4"><StatusPill status={payment.status} /></td>
                    <td className="px-4 py-4 text-xs font-bold text-[var(--muted)]">{formatDate(payment.updatedAt, locale)}</td>
                    <td className="px-6 py-4 text-right text-sm font-black text-[var(--forest)]">{formatFcfa(payment.amount, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

function DisputesSection({ app, runAction }: { app: AppContext; runAction: RunAction }) {
  const { state, actions, locale, metrics } = app;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const disputes = [...state.disputes].sort((a, b) => {
    const openA = ["open", "under_review"].includes(a.status) ? 0 : 1;
    const openB = ["open", "under_review"].includes(b.status) ? 0 : 1;
    return openA - openB || b.updatedAt.localeCompare(a.updatedAt);
  });
  const resolvedCount = disputes.filter((dispute) => ["resolved", "partially_resolved", "rejected"].includes(dispute.status)).length;
  const exposure = disputes
    .filter((dispute) => ["open", "under_review"].includes(dispute.status))
    .reduce((sum, dispute) => {
      const order = getOrder(state, dispute.orderId);
      return sum + (order?.total ?? 0);
    }, 0);

  const resolve = (
    dispute: Dispute,
    status: "resolved" | "partially_resolved" | "rejected",
  ) => {
    const note = notes[dispute.id]?.trim();
    const order = getOrder(state, dispute.orderId);
    const partialAdjustment = status === "partially_resolved" ? Math.round((order?.total ?? 0) * 0.1) : 0;
    actions.resolveDispute({
      disputeId: dispute.id,
      status,
      resolution:
        note ||
        (status === "rejected"
          ? "Claim reviewed against the order and delivery evidence; no adjustment approved."
          : status === "partially_resolved"
            ? "Partial commercial adjustment approved after evidence review."
            : "Claim resolved after review of the complete order and delivery record."),
      investigationNote: note || "Operations reviewed order, shipment, and submitted evidence.",
      financialAdjustment: partialAdjustment,
      refundPayment: status === "partially_resolved" && partialAdjustment > 0,
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={Gavel} label="Open disputes" value={String(metrics.openDisputes)} note="Cases awaiting a decision" accent={metrics.openDisputes > 0} />
        <KpiCard icon={CircleDollarSign} label="Value under review" value={formatFcfa(exposure, locale)} note="Order value, not refund amount" />
        <KpiCard icon={CheckCircle2} label="Closed cases" value={String(resolvedCount)} note={`${metrics.disputeRate}% order dispute rate`} />
      </div>

      {disputes.length === 0 ? (
        <Surface><EmptyState icon={CheckCircle2} title="No disputes recorded" detail="Buyer-reported delivery issues will be assembled here with evidence." /></Surface>
      ) : (
        <div className="space-y-5">
          {disputes.map((dispute) => {
            const order = getOrder(state, dispute.orderId);
            const buyer = order ? getOrganisation(state, order.buyerOrganisationId) : undefined;
            const isOpen = ["open", "under_review"].includes(dispute.status);
            return (
              <Surface key={dispute.id} className="overflow-hidden">
                <div className="grid lg:grid-cols-[.78fr_1.22fr]">
                  <div className={`p-5 sm:p-6 ${isOpen ? "bg-[var(--forest)] text-white" : "bg-[var(--cream)]/55 text-[var(--forest-strong)]"}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[0.67rem] font-extrabold uppercase tracking-wider ${isOpen ? "text-white/55" : "text-[var(--muted)]"}`}>{dispute.reference}</span>
                      <StatusPill status={dispute.status} />
                    </div>
                    <h2 className="mt-4 text-xl font-black tracking-[-0.03em]">{label(dispute.reason)}</h2>
                    <p className={`mt-2 text-sm leading-6 ${isOpen ? "text-white/70" : "text-[var(--muted)]"}`}>{dispute.description}</p>
                    <dl className={`mt-5 space-y-3 border-t pt-5 text-xs ${isOpen ? "border-white/15" : "border-[var(--line)]"}`}>
                      <div className="flex justify-between gap-4"><dt className={isOpen ? "text-white/55" : "text-[var(--muted)]"}>Order</dt><dd className="font-extrabold">{order?.reference ?? "Unknown"}</dd></div>
                      <div className="flex justify-between gap-4"><dt className={isOpen ? "text-white/55" : "text-[var(--muted)]"}>Buyer</dt><dd className="text-right font-extrabold">{buyer?.shortName ?? "Buyer"}</dd></div>
                      <div className="flex justify-between gap-4"><dt className={isOpen ? "text-white/55" : "text-[var(--muted)]"}>Requested</dt><dd className="font-extrabold">{label(dispute.requestedResolution)}</dd></div>
                      <div className="flex justify-between gap-4"><dt className={isOpen ? "text-white/55" : "text-[var(--muted)]"}>Opened</dt><dd className="font-extrabold">{formatDate(dispute.openedAt, locale)}</dd></div>
                    </dl>
                  </div>

                  <div className="p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-extrabold text-[var(--forest-strong)]">Evidence & decision</h3>
                      <span className="rounded-full bg-[var(--cream)] px-2.5 py-1 text-[0.67rem] font-extrabold text-[var(--muted)]">
                        {dispute.evidence.length} evidence item{dispute.evidence.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {dispute.evidence.length === 0 ? (
                        <div className="col-span-full rounded-2xl border border-dashed border-[var(--line)] p-4 text-xs text-[var(--muted)]">No media attached; review the written claim and shipment record.</div>
                      ) : (
                        dispute.evidence.map((evidence) => (
                          <div key={evidence.id} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--cream)]/35 p-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--sage)] text-[var(--forest)]"><FileCheck2 aria-hidden="true" className="h-4 w-4" /></span>
                            <div className="min-w-0"><p className="text-xs font-extrabold text-[var(--forest-strong)]">{label(evidence.kind)}</p><p className="mt-1 text-xs leading-4 text-[var(--muted)]">{evidence.description}</p></div>
                          </div>
                        ))
                      )}
                    </div>

                    {isOpen ? (
                      <>
                        <label htmlFor={`resolution-${dispute.id}`} className="mt-5 block text-xs font-extrabold text-[var(--forest-strong)]">Resolution record</label>
                        <textarea
                          id={`resolution-${dispute.id}`}
                          rows={3}
                          value={notes[dispute.id] ?? ""}
                          onChange={(event) => setNotes((current) => ({ ...current, [dispute.id]: event.target.value }))}
                          placeholder="Record evidence reviewed, decision rationale, and any adjustment…"
                          className="mt-2 w-full resize-none rounded-xl border border-[var(--line)] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted)]/70 focus:border-[var(--forest)]"
                        />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <ActionButton icon={CheckCircle2} onClick={() => runAction(`${dispute.reference} resolved.`, () => resolve(dispute, "resolved"))}>Resolve</ActionButton>
                          <ActionButton icon={CircleDollarSign} variant="secondary" onClick={() => runAction(`${dispute.reference} partially resolved with an adjustment.`, () => resolve(dispute, "partially_resolved"))}>Partial adjustment</ActionButton>
                          <ActionButton icon={XCircle} variant="danger" onClick={() => runAction(`${dispute.reference} claim rejected.`, () => resolve(dispute, "rejected"))}>Reject claim</ActionButton>
                        </div>
                      </>
                    ) : (
                      <div className="mt-5 rounded-2xl border border-[var(--sage)] bg-[var(--sage)]/45 p-4">
                        <p className="text-[0.67rem] font-extrabold uppercase tracking-wider text-[var(--forest)]">Recorded resolution</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{dispute.resolution ?? "Decision recorded."}</p>
                        {dispute.financialAdjustment > 0 && <p className="mt-2 text-xs font-extrabold text-[var(--forest)]">Adjustment: {formatFcfa(dispute.financialAdjustment, locale)}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CatalogueSection({ app }: { app: AppContext }) {
  const { state, metrics, locale } = app;
  const [query, setQuery] = useState("");
  const products = useMemo(
    () =>
      state.products.filter((product) =>
        `${localise(product.name, locale)} ${product.category}`.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [locale, query, state.products],
  );
  const activeCategories = new Set(state.products.filter((product) => product.active).map((product) => product.category)).size;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={Leaf} label="Catalogue products" value={String(state.products.length)} note={`${activeCategories} produce categories`} accent />
        <KpiCard icon={Boxes} label="Live supply" value={String(metrics.liveListings)} note="Published farmer listings" />
        <KpiCard icon={CircleDollarSign} label="Supply value" value={formatFcfa(metrics.availableSupplyValue, locale)} note="At current listing prices" />
      </div>

      <Surface>
        <SectionHeading
          title="Controlled product catalogue"
          description="Configured units and grades used across listings, demand, and orders."
          action={
            <label className="relative block">
              <span className="sr-only">Search catalogue</span>
              <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search produce"
                className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--forest)] sm:w-56"
              />
            </label>
          }
        />
        {products.length === 0 ? (
          <EmptyState icon={Search} title="No matching products" detail="Try another product name or category." />
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 sm:p-6">
            {products.map((product) => {
              const listings = state.listings.filter((listing) => listing.productId === product.id);
              const activeListings = listings.filter((listing) => listing.status === "active");
              const available = activeListings.reduce(
                (sum, listing) => sum + Math.max(0, listing.availableQuantity - listing.reservedQuantity),
                0,
              );
              const averagePrice = activeListings.length
                ? activeListings.reduce((sum, listing) => sum + listing.unitPrice, 0) / activeListings.length
                : 0;
              return (
                <article key={product.id} className="overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-white">
                  <div className="relative h-24 overflow-hidden p-4" style={{ backgroundColor: product.accent || "var(--sage)" }}>
                    <Leaf aria-hidden="true" className="absolute -bottom-7 -right-4 h-24 w-24 rotate-[-18deg] text-[var(--forest)]/10" strokeWidth={1.2} />
                    <div className="relative flex items-start justify-between gap-3">
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-wider text-[var(--forest)]">{label(product.category)}</span>
                      <StatusPill status={product.active ? "active" : "paused"} />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-black text-[var(--forest-strong)]">{localise(product.name, locale)}</h3>
                    <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-[var(--muted)]">{localise(product.description, locale)}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-[var(--cream)] px-3 py-2.5"><p className="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--muted)]">Live listings</p><p className="mt-1 text-sm font-black text-[var(--forest)]">{activeListings.length}</p></div>
                      <div className="rounded-xl bg-[var(--cream)] px-3 py-2.5"><p className="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--muted)]">Available</p><p className="mt-1 truncate text-sm font-black text-[var(--forest)]">{quantity(available, product.defaultUnit)}</p></div>
                    </div>
                    <dl className="mt-4 space-y-2 text-xs">
                      <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">Default unit</dt><dd className="font-extrabold text-[var(--forest-strong)]">{label(product.defaultUnit)}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">Grades</dt><dd className="truncate text-right font-extrabold text-[var(--forest-strong)]">{product.grades.map(label).join(", ")}</dd></div>
                      <div className="flex justify-between gap-3"><dt className="font-bold text-[var(--muted)]">Average ask</dt><dd className="font-extrabold text-[var(--forest-strong)]">{averagePrice ? `${formatFcfa(averagePrice, locale)}/${label(product.defaultUnit).toLowerCase()}` : "No live price"}</dd></div>
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Surface>

      <Surface className="overflow-hidden">
        <SectionHeading title="Active listing coverage" description="Verified supply currently exposed to matching and operations." />
        {state.listings.filter((listing) => listing.status === "active").length === 0 ? (
          <EmptyState icon={Leaf} title="No active listings" detail="Verified farmer supply will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-[var(--line)] bg-[var(--cream)]/55 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]"><tr><th className="px-6 py-3 font-extrabold">Listing</th><th className="px-4 py-3 font-extrabold">Farmer</th><th className="px-4 py-3 font-extrabold">Product</th><th className="px-4 py-3 font-extrabold">Availability</th><th className="px-4 py-3 font-extrabold">Grade</th><th className="px-6 py-3 text-right font-extrabold">Price</th></tr></thead>
              <tbody>
                {state.listings.filter((listing) => listing.status === "active").map((listing) => (
                  <tr key={listing.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--cream)]/35">
                    <td className="px-6 py-4 text-sm font-extrabold text-[var(--forest-strong)]">{listing.reference}</td>
                    <td className="px-4 py-4 text-sm font-bold text-[var(--foreground)]">{getOrganisation(state, listing.farmerOrganisationId)?.shortName ?? "Farmer"}</td>
                    <td className="px-4 py-4 text-sm font-bold text-[var(--muted)]">{getProduct(state, listing.productId) ? localise(getProduct(state, listing.productId)!.name, locale) : "Produce"}</td>
                    <td className="px-4 py-4 text-sm text-[var(--muted)]">{quantity(Math.max(0, listing.availableQuantity - listing.reservedQuantity), listing.unit)}</td>
                    <td className="px-4 py-4"><StatusPill status={listing.grade} dot={false} /></td>
                    <td className="px-6 py-4 text-right text-sm font-black text-[var(--forest)]">{formatFcfa(listing.unitPrice, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}

function escapeCsv(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function exportAuditCsv(audits: AuditLog[]) {
  const rows = [
    ["Timestamp", "Actor role", "Action", "Target type", "Target ID", "Summary"],
    ...audits.map((audit) => [audit.createdAt, audit.actorRole, audit.action, audit.targetType, audit.targetId, audit.summary]),
  ];
  const blob = new Blob([rows.map((row) => row.map(escapeCsv).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "farmtomarket-audit-log.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function AuditSection({ app }: { app: AppContext }) {
  const { state, locale } = app;
  const [query, setQuery] = useState("");
  const audits = useMemo(
    () =>
      [...state.audits]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .filter((audit) =>
          `${audit.action} ${audit.summary} ${audit.actorRole} ${audit.targetType}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
        ),
    [query, state.audits],
  );
  const uniqueActors = new Set(state.audits.map((audit) => audit.actorUserId)).size;
  const sensitiveDecisions = state.audits.filter((audit) =>
    ["organisation.verification_changed", "payment.confirmed", "dispute.resolved"].includes(audit.action),
  ).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard icon={History} label="Audit events" value={String(state.audits.length)} note="Append-only demo records" accent />
        <KpiCard icon={Users} label="Unique actors" value={String(uniqueActors)} note="Users represented in the trail" />
        <KpiCard icon={ShieldCheck} label="Sensitive decisions" value={String(sensitiveDecisions)} note="Trust, payment, and disputes" />
      </div>

      <Surface className="overflow-hidden">
        <SectionHeading
          title="Immutable activity log"
          description="Actor, action, target, and timestamp for sensitive platform changes."
          action={
            <div className="flex flex-wrap gap-2">
              <label className="relative block">
                <span className="sr-only">Search audit log</span>
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search activity"
                  className="h-10 w-full rounded-xl border border-[var(--line)] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--forest)] sm:w-52"
                />
              </label>
              <ActionButton icon={Download} variant="secondary" disabled={audits.length === 0} onClick={() => exportAuditCsv(audits)}>Export CSV</ActionButton>
            </div>
          }
        />
        {audits.length === 0 ? (
          <EmptyState icon={History} title="No matching audit events" detail="Try a broader search or perform a demo action." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-[var(--line)] bg-[var(--cream)]/55 text-[0.68rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                <tr><th className="px-6 py-3 font-extrabold">Time</th><th className="px-4 py-3 font-extrabold">Actor</th><th className="px-4 py-3 font-extrabold">Event</th><th className="px-4 py-3 font-extrabold">Summary</th><th className="px-6 py-3 font-extrabold">Target</th></tr>
              </thead>
              <tbody>
                {audits.map((audit) => {
                  const actor = state.users.find((user) => user.id === audit.actorUserId);
                  return (
                    <tr key={audit.id} className="border-b border-[var(--line)] last:border-0 align-top hover:bg-[var(--cream)]/35">
                      <td className="whitespace-nowrap px-6 py-4 text-xs font-bold text-[var(--muted)]">{formatDate(audit.createdAt, locale, true)}</td>
                      <td className="px-4 py-4"><p className="text-sm font-extrabold text-[var(--forest-strong)]">{actor?.displayName ?? "System actor"}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{label(audit.actorRole)}</p></td>
                      <td className="px-4 py-4"><span className="inline-flex rounded-lg bg-[var(--sage)] px-2.5 py-1 font-mono text-[0.68rem] font-extrabold text-[var(--forest)]">{audit.action}</span></td>
                      <td className="max-w-md px-4 py-4 text-sm leading-5 text-[var(--foreground)]">{audit.summary}</td>
                      <td className="px-6 py-4"><p className="text-xs font-extrabold text-[var(--forest-strong)]">{label(audit.targetType)}</p><p className="mt-1 max-w-36 truncate font-mono text-[0.65rem] text-[var(--muted)]" title={audit.targetId}>{audit.targetId}</p></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Surface>
    </div>
  );
}
