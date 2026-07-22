"use client";

import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileCheck2,
  HandCoins,
  ImagePlus,
  Info,
  Leaf,
  MapPin,
  PackageCheck,
  Plus,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Sprout,
  Star,
  Truck,
  WalletCards,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import {
  formatFcfa,
  localise,
  type CommercialUnit,
  type DemandItem,
  type DemandRequest,
  type ListingStatus,
  type ProduceGrade,
  type QuoteStatus,
  type SupplyListing,
  type UUID,
} from "@/lib/domain";
import {
  EmptyState,
  Field,
  KpiCard,
  Modal,
  ProductMark,
  ProgressBar,
  SectionHeading,
  StatusBadge,
  formatDate,
  humanize,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  textareaClass,
} from "./shared";

type AppContext = ReturnType<typeof useApp>;
type Notice = { kind: "success" | "error"; message: string } | null;
type RunAction = (message: string, task: () => void) => boolean;

type ListingDraft = {
  productId: UUID;
  availableQuantity: string;
  unit: CommercialUnit;
  unitPrice: string;
  minOrderQuantity: string;
  grade: ProduceGrade;
  availableFrom: string;
  availableUntil: string;
  notes: string;
  status: "draft" | "active";
};

type QuoteDraft = {
  demandItemId: UUID;
  sourceListingId: UUID | "";
  availableQuantity: string;
  unitPrice: string;
  availableDate: string;
  notes: string;
};

const sectionCopy: Record<string, { eyebrow: string; title: string; description: string }> = {
  dashboard: {
    eyebrow: "Farm overview",
    title: "Good morning, producer",
    description: "See what needs attention across your harvest, buyer requests, pickups, and settlements.",
  },
  supply: {
    eyebrow: "Harvest availability",
    title: "My supply",
    description: "Publish clear quantities, grades, prices, and availability windows for buyers and fulfillment teams.",
  },
  requests: {
    eyebrow: "Matching demand",
    title: "Buyer requests",
    description: "Respond to structured business demand that matches the products your organisation supplies.",
  },
  quotes: {
    eyebrow: "Commercial responses",
    title: "My quotes",
    description: "Follow every price and quantity response from submission through selection.",
  },
  orders: {
    eyebrow: "Your allocations only",
    title: "Orders & pickups",
    description: "Prepare your share of each order without exposing another farmer’s commercial information.",
  },
  payments: {
    eyebrow: "Settlement visibility",
    title: "Settlements",
    description: "Track the value of your fulfilled allocations and their settlement readiness.",
  },
  notifications: {
    eyebrow: "Activity centre",
    title: "Notifications",
    description: "Keep up with matching demand, quote decisions, pickup instructions, and payment updates.",
  },
  profile: {
    eyebrow: "Trust profile",
    title: "Profile & verification",
    description: "Review the information buyers and operations rely on before assigning commercial orders.",
  },
};

const activeDemandStatuses = new Set(["open", "matching", "allocating"]);

function localeCode(locale: "en" | "fr") {
  return locale === "fr" ? "fr-CM" : "en-CM";
}

function quantityLabel(value: number, unit: CommercialUnit) {
  return `${new Intl.NumberFormat("en-CM", { maximumFractionDigits: 1 }).format(value)} ${humanize(unit).toLowerCase()}`;
}

function percent(part: number, whole: number) {
  return whole <= 0 ? 0 : Math.min(100, Math.round((part / whole) * 100));
}

function previousDay(value: string) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

function todayDate() {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function productFor(app: AppContext, productId: UUID) {
  return app.state.products.find((product) => product.id === productId);
}

function demandForItem(app: AppContext, item: DemandItem) {
  return app.state.demands.find((demand) => demand.id === item.demandId);
}

function orderItemProductId(app: AppContext, allocation: AppContext["state"]["allocations"][number]) {
  const orderItem = allocation.orderItemId
    ? app.state.orderItems.find((item) => item.id === allocation.orderItemId)
    : undefined;
  const demandItem = app.state.demandItems.find((item) => item.id === allocation.demandItemId);
  return orderItem?.productId ?? demandItem?.productId;
}

function Surface({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`surface ${className}`}>{children}</section>;
}

function IconButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="grid size-9 place-items-center rounded-full text-[var(--muted)] hover:bg-[var(--cream)] hover:text-[var(--forest)]">
      <Icon aria-hidden="true" size={17} />
    </button>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--forest)] hover:underline">
      {children}<ArrowRight aria-hidden="true" className="size-3.5 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function DataPair({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-[var(--ink)]">{value}</dd>
    </div>
  );
}

function ListingStatusFilter({ value, onChange, counts }: { value: ListingStatus | "all"; onChange: (value: ListingStatus | "all") => void; counts: Record<string, number> }) {
  const filters: Array<ListingStatus | "all"> = ["all", "active", "draft", "paused", "sold", "closed"];
  return (
    <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Filter listings">
      {filters.map((filter) => (
        <button
          key={filter}
          type="button"
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-extrabold transition ${
            value === filter
              ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--white)]"
              : "border-[var(--line)] bg-[var(--white)] text-[var(--muted)] hover:border-[var(--forest)]/30"
          }`}
        >
          {humanize(filter)}
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${value === filter ? "bg-white/15" : "bg-[var(--cream)]"}`}>
            {counts[filter] ?? 0}
          </span>
        </button>
      ))}
    </div>
  );
}

export function FarmerWorkspace({ section }: { section: string }) {
  const app = useApp();
  const [notice, setNotice] = useState<Notice>(null);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [listingFilter, setListingFilter] = useState<ListingStatus | "all">("all");
  const [quoteFilter, setQuoteFilter] = useState<QuoteStatus | "all">("all");
  const firstProduct = app.state.products.find((product) => product.active) ?? app.state.products[0];
  const [listingDraft, setListingDraft] = useState<ListingDraft>(() => ({
    productId: firstProduct?.id ?? "",
    availableQuantity: "",
    unit: firstProduct?.defaultUnit ?? "kg",
    unitPrice: "",
    minOrderQuantity: "1",
    grade: firstProduct?.grades[0] ?? "standard",
    availableFrom: "",
    availableUntil: "",
    notes: "",
    status: "active",
  }));
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>({
    demandItemId: "",
    sourceListingId: "",
    availableQuantity: "",
    unitPrice: "",
    availableDate: "",
    notes: "",
  });

  const organisation = app.currentOrganisation;
  const organisationId = organisation?.id;
  const farmerListings = useMemo(
    () => app.state.listings.filter((listing) => listing.farmerOrganisationId === organisationId),
    [app.state.listings, organisationId],
  );
  const farmerQuotes = useMemo(
    () => app.state.quotes.filter((quote) => quote.farmerOrganisationId === organisationId),
    [app.state.quotes, organisationId],
  );
  const farmerAllocations = useMemo(
    () => app.state.allocations.filter((allocation) => allocation.farmerOrganisationId === organisationId),
    [app.state.allocations, organisationId],
  );
  const matchingDemands = useMemo(() => {
    const productIds = new Set(organisation?.produceCategoryIds ?? []);
    return app.state.demands.filter(
      (demand) =>
        activeDemandStatuses.has(demand.status) &&
        demand.itemIds.some((itemId) => {
          const item = app.state.demandItems.find((candidate) => candidate.id === itemId);
          return item ? productIds.has(item.productId) : false;
        }),
    );
  }, [app.state.demandItems, app.state.demands, organisation?.produceCategoryIds]);

  const activeSection = sectionCopy[section] ? section : "dashboard";
  const copy = sectionCopy[activeSection];
  const verified = organisation?.verificationStatus === "verified";

  const runAction: RunAction = (message, task) => {
    try {
      task();
      setNotice({ kind: "success", message });
      return true;
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "That action could not be completed.",
      });
      return false;
    }
  };

  const openListingModal = () => {
    const product = app.state.products.find((candidate) => candidate.active) ?? app.state.products[0];
    const today = todayDate();
    setListingDraft({
      productId: product?.id ?? "",
      availableQuantity: "",
      unit: product?.defaultUnit ?? "kg",
      unitPrice: "",
      minOrderQuantity: "1",
      grade: product?.grades[0] ?? "standard",
      availableFrom: today,
      availableUntil: addDays(today, 14),
      notes: "",
      status: verified ? "active" : "draft",
    });
    setNotice(null);
    setListingModalOpen(true);
  };

  const openQuoteModal = (itemId: UUID) => {
    const item = app.state.demandItems.find((candidate) => candidate.id === itemId);
    if (!item) return;
    const demand = demandForItem(app, item);
    const matchingListing = farmerListings.find(
      (listing) =>
        listing.status === "active" &&
        listing.productId === item.productId &&
        listing.unit === item.unit &&
        listing.availableQuantity > listing.reservedQuantity,
    );
    const remaining = matchingListing
      ? matchingListing.availableQuantity - matchingListing.reservedQuantity
      : item.quantity;
    setQuoteDraft({
      demandItemId: item.id,
      sourceListingId: matchingListing?.id ?? "",
      availableQuantity: String(Math.min(item.quantity, remaining)),
      unitPrice: String(matchingListing?.unitPrice ?? item.targetUnitPrice ?? ""),
      availableDate: demand ? previousDay(demand.requiredDeliveryDate) : todayDate(),
      notes: "",
    });
    setNotice(null);
    setQuoteModalOpen(true);
  };

  const handleCreateListing = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const created = runAction("Supply listing created and added to your workspace.", () => {
      app.actions.createListing({
        farmerOrganisationId: organisationId,
        productId: listingDraft.productId,
        availableQuantity: Number(listingDraft.availableQuantity),
        unit: listingDraft.unit,
        unitPrice: Number(listingDraft.unitPrice),
        minOrderQuantity: Number(listingDraft.minOrderQuantity),
        grade: listingDraft.grade,
        availableFrom: listingDraft.availableFrom,
        availableUntil: listingDraft.availableUntil,
        notes: listingDraft.notes.trim() || undefined,
        status: listingDraft.status,
      });
    });
    if (created) setListingModalOpen(false);
  };

  const handleSubmitQuote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const submitted = runAction("Your quote was submitted to the buyer request.", () => {
      app.actions.submitQuote({
        demandItemId: quoteDraft.demandItemId,
        farmerOrganisationId: organisationId,
        sourceListingId: quoteDraft.sourceListingId || undefined,
        availableQuantity: Number(quoteDraft.availableQuantity),
        unitPrice: Number(quoteDraft.unitPrice),
        availableDate: quoteDraft.availableDate,
        notes: quoteDraft.notes.trim() || undefined,
      });
    });
    if (submitted) setQuoteModalOpen(false);
  };

  if (!organisation || !["farmer", "cooperative"].includes(organisation.type)) {
    return (
      <Surface className="grid min-h-64 place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]"><Sprout aria-hidden="true" size={22} /></span>
          <p className="mt-4 text-sm font-bold text-[var(--ink)]">Preparing your farmer organisation…</p>
        </div>
      </Surface>
    );
  }

  const content = (() => {
    switch (activeSection) {
      case "supply":
        return <SupplySection app={app} listings={farmerListings} filter={listingFilter} onFilterChange={setListingFilter} onCreate={openListingModal} />;
      case "requests":
        return <RequestsSection app={app} demands={matchingDemands} organisationId={organisation.id} verified={verified} onQuote={openQuoteModal} />;
      case "quotes":
        return <QuotesSection app={app} quotes={farmerQuotes} filter={quoteFilter} onFilterChange={setQuoteFilter} />;
      case "orders":
        return <OrdersSection app={app} allocations={farmerAllocations} />;
      case "payments":
        return <PaymentsSection app={app} allocations={farmerAllocations} />;
      case "notifications":
        return <NotificationsSection app={app} runAction={runAction} />;
      case "profile":
        return <ProfileSection app={app} />;
      default:
        return <DashboardSection app={app} listings={farmerListings} quotes={farmerQuotes} allocations={farmerAllocations} demands={matchingDemands} onCreate={openListingModal} />;
    }
  })();

  const pageAction = activeSection === "supply" || activeSection === "dashboard" ? (
    <button type="button" onClick={openListingModal} className={primaryButtonClass}>
      <Plus aria-hidden="true" size={17} /> Add supply
    </button>
  ) : undefined;

  const selectedQuoteItem = app.state.demandItems.find((item) => item.id === quoteDraft.demandItemId);
  const selectedQuoteDemand = selectedQuoteItem ? demandForItem(app, selectedQuoteItem) : undefined;
  const quoteListings = selectedQuoteItem
    ? farmerListings.filter(
        (listing) =>
          listing.status === "active" &&
          listing.productId === selectedQuoteItem.productId &&
          listing.unit === selectedQuoteItem.unit &&
          listing.availableQuantity > listing.reservedQuantity,
      )
    : [];

  return (
    <div className="min-w-0">
      <SectionHeading eyebrow={copy.eyebrow} title={copy.title} description={copy.description} action={pageAction} />

      {notice ? (
        <div role="status" className={`mt-5 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-bold ${notice.kind === "success" ? "border-[var(--sage)] bg-[var(--sage)] text-[var(--forest)]" : "border-[var(--orange)]/30 bg-[var(--orange-soft)] text-[var(--ink)]"}`}>
          {notice.kind === "success" ? <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" /> : <AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />}
          <span className="min-w-0 flex-1">{notice.message}</span>
          <IconButton icon={X} label="Dismiss message" onClick={() => setNotice(null)} />
        </div>
      ) : null}

      <div className="mt-6">{content}</div>

      <Modal open={listingModalOpen} onClose={() => setListingModalOpen(false)} title="Add available supply" description="Publish a clear, time-bound harvest offer for matching and fulfillment.">
        <form onSubmit={handleCreateListing} className="space-y-5">
          {!verified ? (
            <div className="flex gap-3 rounded-2xl border border-[var(--lime)] bg-[var(--lime)]/25 p-4 text-sm text-[var(--forest)]">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p><strong>Draft only.</strong> Your organisation must be verified before supply can be published as active.</p>
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Product">
              <select
                required
                className={inputClass}
                value={listingDraft.productId}
                onChange={(event) => {
                  const product = app.state.products.find((candidate) => candidate.id === event.target.value);
                  if (!product) return;
                  setListingDraft((current) => ({ ...current, productId: product.id, unit: product.defaultUnit, grade: product.grades[0] }));
                }}
              >
                {app.state.products.filter((product) => product.active).map((product) => <option key={product.id} value={product.id}>{localise(product.name, app.locale)}</option>)}
              </select>
            </Field>
            <Field label="Grade">
              <select required className={inputClass} value={listingDraft.grade} onChange={(event) => setListingDraft((current) => ({ ...current, grade: event.target.value as ProduceGrade }))}>
                {(productFor(app, listingDraft.productId)?.grades ?? []).map((grade) => <option key={grade} value={grade}>{humanize(grade)}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Available quantity">
              <input required min="0.01" step="0.01" type="number" inputMode="decimal" className={inputClass} value={listingDraft.availableQuantity} onChange={(event) => setListingDraft((current) => ({ ...current, availableQuantity: event.target.value }))} placeholder="e.g. 40" />
            </Field>
            <Field label="Unit">
              <select required className={inputClass} value={listingDraft.unit} onChange={(event) => setListingDraft((current) => ({ ...current, unit: event.target.value as CommercialUnit }))}>
                {(productFor(app, listingDraft.productId)?.allowedUnits ?? []).map((unit) => <option key={unit} value={unit}>{humanize(unit)}</option>)}
              </select>
            </Field>
            <Field label="Minimum order">
              <input required min="0.01" step="0.01" type="number" inputMode="decimal" className={inputClass} value={listingDraft.minOrderQuantity} onChange={(event) => setListingDraft((current) => ({ ...current, minOrderQuantity: event.target.value }))} />
            </Field>
          </div>
          <Field label="Unit price" hint="whole FCFA amount">
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--forest)]">FCFA</span>
              <input required min="0" step="1" type="number" inputMode="numeric" className={`${inputClass} pl-14`} value={listingDraft.unitPrice} onChange={(event) => setListingDraft((current) => ({ ...current, unitPrice: event.target.value }))} placeholder="0" />
            </div>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Available from">
              <input required type="date" className={inputClass} value={listingDraft.availableFrom} onChange={(event) => setListingDraft((current) => ({ ...current, availableFrom: event.target.value }))} />
            </Field>
            <Field label="Available until">
              <input required type="date" min={listingDraft.availableFrom} className={inputClass} value={listingDraft.availableUntil} onChange={(event) => setListingDraft((current) => ({ ...current, availableUntil: event.target.value }))} />
            </Field>
          </div>
          <Field label="Publishing status">
            <select className={inputClass} value={listingDraft.status} onChange={(event) => setListingDraft((current) => ({ ...current, status: event.target.value as "draft" | "active" }))}>
              <option value="draft">Save as draft</option>
              <option value="active" disabled={!verified}>Publish as active</option>
            </select>
          </Field>
          <Field label="Harvest notes" hint="optional">
            <textarea className={textareaClass} value={listingDraft.notes} onChange={(event) => setListingDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Packaging, average weight, loading hours, or handling notes…" />
          </Field>
          <div className="flex items-center gap-3 rounded-2xl bg-[var(--cream)] p-4 text-xs leading-5 text-[var(--muted)]">
            <ImagePlus aria-hidden="true" className="size-5 shrink-0 text-[var(--forest)]" /> The catalogue product image is used in this demo. Production uploads will be compressed before publishing.
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setListingModalOpen(false)} className={secondaryButtonClass}>Cancel</button>
            <button type="submit" className={primaryButtonClass}><Leaf aria-hidden="true" size={17} /> {listingDraft.status === "active" ? "Publish supply" : "Save draft"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={quoteModalOpen} onClose={() => setQuoteModalOpen(false)} title="Respond to buyer request" description={selectedQuoteDemand ? `${selectedQuoteDemand.reference} · ${selectedQuoteDemand.title}` : "Enter the quantity and price you can reliably fulfill."}>
        {selectedQuoteItem ? (
          <form onSubmit={handleSubmitQuote} className="space-y-5">
            <div className="flex items-center gap-4 rounded-2xl bg-[var(--cream)] p-4">
              {(() => {
                const product = productFor(app, selectedQuoteItem.productId);
                return <ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} />;
              })()}
              <div className="min-w-0 flex-1">
                <p className="font-extrabold text-[var(--ink)]">{localise(productFor(app, selectedQuoteItem.productId)?.name ?? { en: "Produce", fr: "Produit" }, app.locale)}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Requested: {quantityLabel(selectedQuoteItem.quantity, selectedQuoteItem.unit)} · {humanize(selectedQuoteItem.grade)}</p>
              </div>
              {selectedQuoteItem.targetUnitPrice ? <p className="text-right text-xs font-bold text-[var(--forest)]">Target<br />{formatFcfa(selectedQuoteItem.targetUnitPrice, app.locale)}</p> : null}
            </div>
            {!verified ? (
              <div className="flex gap-3 rounded-2xl border border-[var(--orange)]/25 bg-[var(--orange-soft)] p-4 text-sm text-[var(--ink)]"><AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />Verification is required before a commercial quote can be submitted.</div>
            ) : null}
            <Field label="Use an active supply listing" hint="optional">
              <select
                className={inputClass}
                value={quoteDraft.sourceListingId}
                onChange={(event) => {
                  const listing = farmerListings.find((candidate) => candidate.id === event.target.value);
                  setQuoteDraft((current) => ({
                    ...current,
                    sourceListingId: event.target.value,
                    unitPrice: listing ? String(listing.unitPrice) : current.unitPrice,
                    availableQuantity: listing ? String(Math.min(selectedQuoteItem.quantity, listing.availableQuantity - listing.reservedQuantity)) : current.availableQuantity,
                  }));
                }}
              >
                <option value="">No linked listing</option>
                {quoteListings.map((listing) => <option key={listing.id} value={listing.id}>{listing.reference} · {quantityLabel(listing.availableQuantity - listing.reservedQuantity, listing.unit)} free</option>)}
              </select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quantity you can supply">
                <input required min="0.01" step="0.01" type="number" inputMode="decimal" className={inputClass} value={quoteDraft.availableQuantity} onChange={(event) => setQuoteDraft((current) => ({ ...current, availableQuantity: event.target.value }))} />
              </Field>
              <Field label="Unit">
                <input disabled className={`${inputClass} disabled:bg-[var(--cream)]`} value={humanize(selectedQuoteItem.unit)} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your unit price" hint="FCFA">
                <input required min="0" step="1" type="number" inputMode="numeric" className={inputClass} value={quoteDraft.unitPrice} onChange={(event) => setQuoteDraft((current) => ({ ...current, unitPrice: event.target.value }))} />
              </Field>
              <Field label="Produce ready on">
                <input required type="date" max={selectedQuoteDemand ? previousDay(selectedQuoteDemand.requiredDeliveryDate) : undefined} className={inputClass} value={quoteDraft.availableDate} onChange={(event) => setQuoteDraft((current) => ({ ...current, availableDate: event.target.value }))} />
              </Field>
            </div>
            <Field label="Message to fulfillment" hint="optional">
              <textarea className={textareaClass} value={quoteDraft.notes} onChange={(event) => setQuoteDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="Loading time, packaging, partial quantity, or other useful details…" />
            </Field>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--white)] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Estimated allocation value</p>
              <p className="mt-2 text-xl font-black text-[var(--forest)]">{formatFcfa((Number(quoteDraft.availableQuantity) || 0) * (Number(quoteDraft.unitPrice) || 0), app.locale)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">Final quantity is confirmed by fulfillment before the order is created.</p>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setQuoteModalOpen(false)} className={secondaryButtonClass}>Cancel</button>
              <button type="submit" disabled={!verified} className={primaryButtonClass}><Send aria-hidden="true" size={16} /> Submit quote</button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function DashboardSection({ app, listings, quotes, allocations, demands, onCreate }: { app: AppContext; listings: SupplyListing[]; quotes: AppContext["state"]["quotes"]; allocations: AppContext["state"]["allocations"]; demands: DemandRequest[]; onCreate: () => void }) {
  const organisation = app.currentOrganisation!;
  const liveListings = listings.filter((listing) => listing.status === "active");
  const openQuotes = quotes.filter((quote) => ["submitted", "shortlisted"].includes(quote.status));
  const upcoming = allocations.filter((allocation) => ["proposed", "confirmed", "ready_for_pickup"].includes(allocation.status));
  const completedValue = allocations
    .filter((allocation) => {
      const order = allocation.orderId ? app.state.orders.find((candidate) => candidate.id === allocation.orderId) : undefined;
      return order?.status === "completed";
    })
    .reduce((sum, allocation) => sum + allocation.farmerTotal, 0);
  const availableValue = liveListings.reduce((sum, listing) => sum + Math.max(0, listing.availableQuantity - listing.reservedQuantity) * listing.unitPrice, 0);
  const unread = app.state.notifications.filter((notification) => notification.recipientUserId === app.currentUser?.id && !notification.readAt).length;
  const urgentAllocation = upcoming.find((allocation) => ["confirmed", "ready_for_pickup"].includes(allocation.status)) ?? upcoming[0];

  let nextAction = {
    icon: Sparkles,
    eyebrow: "Grow your reach",
    title: "Add another harvest window",
    body: "Fresh availability helps operations match your produce before buyers need it.",
    href: "/farmer/supply",
    label: "Add available supply",
  };
  if (organisation.verificationStatus !== "verified") {
    nextAction = { icon: ShieldCheck, eyebrow: "Verification required", title: "Complete your trust profile", body: "Active commercial allocations begin after your organisation details are reviewed.", href: "/farmer/profile", label: "Review verification" };
  } else if (urgentAllocation) {
    nextAction = { icon: PackageCheck, eyebrow: "Next order action", title: urgentAllocation.status === "ready_for_pickup" ? "Prepare produce for pickup" : "Allocation under preparation", body: `${quantityLabel(urgentAllocation.quantity, urgentAllocation.unit)} · ${urgentAllocation.pickupWindow ?? "Pickup timing will be confirmed"}`, href: "/farmer/orders", label: "View allocation" };
  } else if (demands.length > 0) {
    nextAction = { icon: ShoppingBasket, eyebrow: "New buyer demand", title: `${demands.length} request${demands.length === 1 ? "" : "s"} match your produce`, body: "Review quantities and dates, then quote only what you can reliably fulfill.", href: "/farmer/requests", label: "Review requests" };
  } else if (unread > 0) {
    nextAction = { icon: Bell, eyebrow: "Stay up to date", title: `${unread} unread notification${unread === 1 ? "" : "s"}`, body: "Important status changes and pickup instructions appear in your activity centre.", href: "/farmer/notifications", label: "Open notifications" };
  }
  const NextIcon = nextAction.icon;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Live listings" value={liveListings.length} detail={`${formatFcfa(availableValue, app.locale)} available value`} icon={<Wheat aria-hidden="true" size={19} />} tone="sage" />
        <KpiCard label="Quotes in review" value={openQuotes.length} detail={`${quotes.filter((quote) => quote.status === "accepted").length} accepted overall`} icon={<ReceiptText aria-hidden="true" size={19} />} tone="cream" />
        <KpiCard label="Upcoming allocations" value={upcoming.length} detail={upcoming[0]?.pickupWindow ?? "No pickup scheduled"} icon={<Truck aria-hidden="true" size={19} />} tone="orange" />
        <KpiCard label="Completed value" value={formatFcfa(completedValue, app.locale)} detail="Your completed allocations" icon={<HandCoins aria-hidden="true" size={19} />} tone="forest" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.16fr_0.84fr]">
        <section className="relative overflow-hidden rounded-[28px] bg-[var(--forest)] p-6 text-[var(--white)] shadow-[var(--shadow-lg)] sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border-[40px] border-white/[0.06]" />
          <div className="relative flex h-full min-h-[280px] flex-col">
            <div className="flex items-center justify-between gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-[var(--lime)] text-[var(--forest)]"><NextIcon aria-hidden="true" size={23} /></span>
              <span className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/70">{nextAction.eyebrow}</span>
            </div>
            <h2 className="font-display mt-8 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">{nextAction.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/65">{nextAction.body}</p>
            {nextAction.href === "/farmer/supply" ? (
              <button type="button" onClick={onCreate} className="mt-auto inline-flex w-fit items-center gap-2 pt-8 text-sm font-extrabold text-[var(--lime)]">{nextAction.label}<ArrowRight aria-hidden="true" size={16} /></button>
            ) : (
              <Link href={nextAction.href} className="mt-auto inline-flex w-fit items-center gap-2 pt-8 text-sm font-extrabold text-[var(--lime)]">{nextAction.label}<ArrowRight aria-hidden="true" size={16} /></Link>
            )}
          </div>
        </section>

        <Surface className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-[var(--muted)]">Organisation health</p>
              <h2 className="mt-2 text-xl font-black tracking-[-0.025em] text-[var(--ink)]">{organisation.shortName}</h2>
            </div>
            <StatusBadge status={organisation.verificationStatus} />
          </div>
          <div className="mt-6 space-y-5">
            <ProgressBar value={organisation.performance.onTimeDeliveryRate ?? 0} label="On-time fulfillment" />
            <div className="grid grid-cols-3 gap-3 border-y border-[var(--line)] py-5 text-center">
              <div><p className="text-xl font-black text-[var(--forest)]">{organisation.performance.completedOrders}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Completed</p></div>
              <div><p className="text-xl font-black text-[var(--forest)]">{organisation.performance.averageRating?.toFixed(1) ?? "—"}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Rating</p></div>
              <div><p className="text-xl font-black text-[var(--forest)]">{organisation.performance.cancellationRate}%</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Cancelled</p></div>
            </div>
            <InlineLink href="/farmer/profile">View trust profile</InlineLink>
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <div><h2 className="font-black text-[var(--ink)]">Supply at a glance</h2><p className="mt-1 text-xs text-[var(--muted)]">Free quantity after current reservations</p></div>
            <InlineLink href="/farmer/supply">All supply</InlineLink>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {liveListings.slice(0, 3).map((listing) => {
              const product = productFor(app, listing.productId);
              const free = Math.max(0, listing.availableQuantity - listing.reservedQuantity);
              return (
                <div key={listing.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Produce"}</p><p className="mt-1 text-xs text-[var(--muted)]">{quantityLabel(free, listing.unit)} free · {formatFcfa(listing.unitPrice, app.locale)}/{humanize(listing.unit).toLowerCase()}</p></div>
                  <StatusBadge status={listing.status} />
                </div>
              );
            })}
            {liveListings.length === 0 ? <div className="p-6 text-sm text-[var(--muted)]">No active supply yet.</div> : null}
          </div>
        </Surface>

        <Surface className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 sm:px-6">
            <div><h2 className="font-black text-[var(--ink)]">Demand matching your farm</h2><p className="mt-1 text-xs text-[var(--muted)]">Open business requests by required date</p></div>
            <InlineLink href="/farmer/requests">All requests</InlineLink>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {demands.slice(0, 3).map((demand) => {
              const buyer = app.state.organisations.find((candidate) => candidate.id === demand.buyerOrganisationId);
              const matches = demand.itemIds.filter((itemId) => {
                const item = app.state.demandItems.find((candidate) => candidate.id === itemId);
                return item ? organisation.produceCategoryIds.includes(item.productId) : false;
              }).length;
              return (
                <div key={demand.id} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--cream)] text-[var(--forest)]"><ShoppingBasket aria-hidden="true" size={19} /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-[var(--ink)]">{demand.title}</p><p className="mt-1 text-xs text-[var(--muted)]">{buyer?.shortName ?? "Verified buyer"} · {matches} matching line{matches === 1 ? "" : "s"}</p></div>
                  <div className="text-right"><p className="text-xs font-extrabold text-[var(--forest)]">{formatDate(demand.requiredDeliveryDate, localeCode(app.locale))}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">Delivery</p></div>
                </div>
              );
            })}
            {demands.length === 0 ? <div className="p-6 text-sm text-[var(--muted)]">No matching demand is open right now.</div> : null}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function SupplySection({ app, listings, filter, onFilterChange, onCreate }: { app: AppContext; listings: SupplyListing[]; filter: ListingStatus | "all"; onFilterChange: (value: ListingStatus | "all") => void; onCreate: () => void }) {
  const counts = listings.reduce<Record<string, number>>((result, listing) => {
    result[listing.status] = (result[listing.status] ?? 0) + 1;
    result.all = (result.all ?? 0) + 1;
    return result;
  }, {});
  const shown = filter === "all" ? listings : listings.filter((listing) => listing.status === filter);
  const totalFree = listings.filter((listing) => listing.status === "active").reduce((sum, listing) => sum + Math.max(0, listing.availableQuantity - listing.reservedQuantity) * listing.unitPrice, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Active supply" value={counts.active ?? 0} detail={`${listings.length} listings total`} icon={<Wheat aria-hidden="true" size={19} />} tone="sage" />
        <KpiCard label="Reserved" value={listings.reduce((sum, listing) => sum + listing.reservedQuantity, 0)} detail="Across all commercial units" icon={<PackageCheck aria-hidden="true" size={19} />} tone="orange" />
        <KpiCard label="Available value" value={formatFcfa(totalFree, app.locale)} detail="At your published prices" icon={<Banknote aria-hidden="true" size={19} />} tone="forest" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <ListingStatusFilter value={filter} onChange={onFilterChange} counts={counts} />
        <p className="shrink-0 text-xs text-[var(--muted)]">Showing {shown.length} of {listings.length}</p>
      </div>

      {shown.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((listing) => {
            const product = productFor(app, listing.productId);
            const free = Math.max(0, listing.availableQuantity - listing.reservedQuantity);
            const reservedPercent = percent(listing.reservedQuantity, listing.availableQuantity);
            return (
              <article key={listing.id} className="surface overflow-hidden">
                <div className="flex items-start gap-4 border-b border-[var(--line)] bg-[var(--cream)]/65 p-5">
                  <ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} />
                  <div className="min-w-0 flex-1"><p className="truncate text-lg font-black tracking-[-0.025em] text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Produce"}</p><p className="mt-1 text-xs font-bold text-[var(--muted)]">{listing.reference}</p></div>
                  <StatusBadge status={listing.status} />
                </div>
                <div className="p-5">
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <DataPair label="Free to match" value={quantityLabel(free, listing.unit)} />
                    <DataPair label="Unit price" value={formatFcfa(listing.unitPrice, app.locale)} />
                    <DataPair label="Grade" value={humanize(listing.grade)} />
                    <DataPair label="Minimum order" value={quantityLabel(listing.minOrderQuantity, listing.unit)} />
                  </dl>
                  <div className="mt-5 border-t border-[var(--line)] pt-5">
                    <ProgressBar value={reservedPercent} label={`${quantityLabel(listing.reservedQuantity, listing.unit)} reserved`} />
                  </div>
                  <div className="mt-5 flex items-center gap-2 text-xs text-[var(--muted)]"><CalendarDays aria-hidden="true" size={15} className="text-[var(--forest)]" /> {formatDate(listing.availableFrom, localeCode(app.locale))} – {formatDate(listing.availableUntil, localeCode(app.locale))}</div>
                  <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-[var(--muted)]"><MapPin aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-[var(--forest)]" /> {listing.location.locality}, {listing.location.region}</div>
                  {listing.notes ? <p className="mt-4 rounded-xl bg-[var(--cream)] p-3 text-xs leading-5 text-[var(--muted)]">{listing.notes}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No supply in this view" description="Choose another status or add a fresh harvest listing." action={<button type="button" onClick={onCreate} className={primaryButtonClass}><Plus aria-hidden="true" size={16} /> Add supply</button>} />
      )}
    </div>
  );
}

function RequestsSection({ app, demands, organisationId, verified, onQuote }: { app: AppContext; demands: DemandRequest[]; organisationId: UUID; verified: boolean; onQuote: (itemId: UUID) => void }) {
  const organisation = app.state.organisations.find((candidate) => candidate.id === organisationId);
  const productIds = new Set(organisation?.produceCategoryIds ?? []);

  if (demands.length === 0) {
    return <EmptyState title="No matching requests right now" description="Buyer demand that matches your produce catalogue will appear here as soon as it is published." action={<InlineLink href="/farmer/supply">Keep your supply current</InlineLink>} />;
  }

  return (
    <div className="space-y-5">
      {!verified ? (
        <div className="flex flex-col gap-4 rounded-[22px] border border-[var(--lime)] bg-[var(--lime)]/25 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--forest)]" /><div><p className="text-sm font-black text-[var(--ink)]">Browse now, quote after verification</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">You can review matching demand while operations completes your organisation check.</p></div></div>
          <InlineLink href="/farmer/profile">View verification</InlineLink>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-[var(--ink)]">{demands.length} open request{demands.length === 1 ? "" : "s"}</p>
        <span className="inline-flex items-center gap-2 rounded-full bg-[var(--sage)] px-3 py-1.5 text-xs font-extrabold text-[var(--forest)]"><Sparkles aria-hidden="true" size={14} /> Product-matched</span>
      </div>

      {demands.map((demand) => {
        const buyer = app.state.organisations.find((candidate) => candidate.id === demand.buyerOrganisationId);
        const items = demand.itemIds
          .map((itemId) => app.state.demandItems.find((candidate) => candidate.id === itemId))
          .filter((item): item is DemandItem => Boolean(item));
        const matchingCount = items.filter((item) => productIds.has(item.productId)).length;
        return (
          <article key={demand.id} className="surface overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-[var(--line)] bg-[var(--cream)]/60 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><StatusBadge status={demand.status} /><span className="text-xs font-bold text-[var(--muted)]">{demand.reference}</span>{demand.recurring ? <span className="rounded-full border border-[var(--line)] bg-[var(--white)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--forest)]">Recurring</span> : null}</div>
                <h2 className="font-display mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{demand.title}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]"><span className="inline-flex items-center gap-1.5"><Building2 aria-hidden="true" size={14} /> {buyer?.shortName ?? "Verified business buyer"}</span><span className="inline-flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} /> {demand.deliveryAddress.city}, {demand.deliveryAddress.region}</span></p>
              </div>
              <div className="shrink-0 rounded-2xl bg-[var(--white)] px-4 py-3 shadow-sm sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Required delivery</p><p className="mt-1 text-sm font-black text-[var(--forest)]">{formatDate(demand.requiredDeliveryDate, localeCode(app.locale))}</p><p className="mt-1 text-[10px] text-[var(--muted)]">{matchingCount} line{matchingCount === 1 ? "" : "s"} fit your catalogue</p></div>
            </div>

            <div className="divide-y divide-[var(--line)]">
              {items.map((item) => {
                const product = productFor(app, item.productId);
                const matches = productIds.has(item.productId);
                const ownQuote = app.state.quotes.find((quote) => quote.demandItemId === item.id && quote.farmerOrganisationId === organisationId);
                return (
                  <div key={item.id} className={`grid gap-4 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6 ${matches ? "bg-[var(--white)]" : "bg-[var(--cream)]/35"}`}>
                    <div className="flex min-w-0 items-start gap-4">
                      <ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Produce"}</h3>{matches ? <span className="rounded-full bg-[var(--sage)] px-2 py-0.5 text-[10px] font-extrabold text-[var(--forest)]">You supply this</span> : <span className="text-[10px] font-bold text-[var(--muted)]">Other supplier needed</span>}</div>
                        <p className="mt-1.5 text-sm font-bold text-[var(--forest)]">{quantityLabel(item.quantity, item.unit)} · {humanize(item.grade)}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">Target {item.targetUnitPrice ? `${formatFcfa(item.targetUnitPrice, app.locale)} per ${humanize(item.unit).toLowerCase()}` : "price not disclosed"}{item.notes ? ` · ${item.notes}` : ""}</p>
                      </div>
                    </div>
                    {matches ? (
                      ownQuote ? (
                        <div className="flex items-center gap-3 sm:justify-end"><div className="sm:text-right"><StatusBadge status={ownQuote.status} /><p className="mt-1 text-[10px] text-[var(--muted)]">{ownQuote.reference}</p></div><Link href="/farmer/quotes" aria-label="View submitted quote" className="grid size-10 place-items-center rounded-full border border-[var(--line)] text-[var(--forest)] hover:bg-[var(--cream)]"><ChevronRight aria-hidden="true" size={17} /></Link></div>
                      ) : (
                        <button type="button" disabled={!verified} onClick={() => onQuote(item.id)} className={primaryButtonClass}><Send aria-hidden="true" size={16} /> Quote this line</button>
                      )
                    ) : null}
                  </div>
                );
              })}
            </div>
            {(demand.notes || demand.recurrenceNote) ? <div className="grid gap-3 border-t border-[var(--line)] bg-[var(--cream)]/45 px-5 py-4 text-xs leading-5 text-[var(--muted)] sm:grid-cols-2 sm:px-6">{demand.notes ? <p><strong className="text-[var(--ink)]">Buyer note:</strong> {demand.notes}</p> : <span />}{demand.recurrenceNote ? <p><strong className="text-[var(--ink)]">Repeat plan:</strong> {demand.recurrenceNote}</p> : null}</div> : null}
          </article>
        );
      })}
    </div>
  );
}

function QuotesSection({ app, quotes, filter, onFilterChange }: { app: AppContext; quotes: AppContext["state"]["quotes"]; filter: QuoteStatus | "all"; onFilterChange: (value: QuoteStatus | "all") => void }) {
  const statuses: Array<QuoteStatus | "all"> = ["all", "submitted", "shortlisted", "accepted", "declined", "withdrawn"];
  const shown = filter === "all" ? quotes : quotes.filter((quote) => quote.status === filter);
  const totalValue = quotes.reduce((sum, quote) => sum + quote.availableQuantity * quote.unitPrice, 0);
  const acceptanceRate = percent(quotes.filter((quote) => quote.status === "accepted").length, quotes.filter((quote) => ["accepted", "declined"].includes(quote.status)).length);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Submitted" value={quotes.length} detail={`${quotes.filter((quote) => quote.status === "shortlisted").length} currently shortlisted`} icon={<Send aria-hidden="true" size={19} />} tone="sage" />
        <KpiCard label="Quoted value" value={formatFcfa(totalValue, app.locale)} detail="Before final allocation" icon={<ReceiptText aria-hidden="true" size={19} />} tone="cream" />
        <KpiCard label="Decision rate" value={`${acceptanceRate}%`} detail="Accepted among decided quotes" icon={<CheckCircle2 aria-hidden="true" size={19} />} tone="forest" />
      </div>

      <div className="hide-scrollbar flex gap-2 overflow-x-auto pb-1" aria-label="Filter quotes">
        {statuses.map((status) => {
          const count = status === "all" ? quotes.length : quotes.filter((quote) => quote.status === status).length;
          return <button key={status} type="button" aria-pressed={filter === status} onClick={() => onFilterChange(status)} className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-extrabold ${filter === status ? "border-[var(--forest)] bg-[var(--forest)] text-[var(--white)]" : "border-[var(--line)] bg-[var(--white)] text-[var(--muted)]"}`}>{humanize(status)}<span className={`rounded-full px-1.5 py-0.5 text-[10px] ${filter === status ? "bg-white/15" : "bg-[var(--cream)]"}`}>{count}</span></button>;
        })}
      </div>

      {shown.length > 0 ? (
        <div className="grid gap-5 lg:grid-cols-2">
          {shown.map((quote) => {
            const item = app.state.demandItems.find((candidate) => candidate.id === quote.demandItemId);
            const demand = item ? demandForItem(app, item) : undefined;
            const product = item ? productFor(app, item.productId) : undefined;
            const buyer = demand ? app.state.organisations.find((candidate) => candidate.id === demand.buyerOrganisationId) : undefined;
            const listing = quote.sourceListingId ? app.state.listings.find((candidate) => candidate.id === quote.sourceListingId) : undefined;
            return (
              <article key={quote.id} className="surface p-5 sm:p-6">
                <div className="flex items-start gap-4">
                  <ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} />
                  <div className="min-w-0 flex-1"><p className="text-xs font-bold text-[var(--muted)]">{quote.reference}</p><h2 className="mt-1 truncate text-lg font-black text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Produce quote"}</h2><p className="mt-1 truncate text-xs text-[var(--muted)]">{demand?.reference} · {buyer?.shortName ?? "Business buyer"}</p></div>
                  <StatusBadge status={quote.status} />
                </div>
                <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 border-y border-[var(--line)] py-5 sm:grid-cols-3">
                  <DataPair label="Your quantity" value={quantityLabel(quote.availableQuantity, quote.unit)} />
                  <DataPair label="Your price" value={formatFcfa(quote.unitPrice, app.locale)} />
                  <DataPair label="Quote value" value={formatFcfa(quote.availableQuantity * quote.unitPrice, app.locale)} />
                  <DataPair label="Ready date" value={formatDate(quote.availableDate, localeCode(app.locale))} />
                  <DataPair label="Buyer delivery" value={formatDate(demand?.requiredDeliveryDate, localeCode(app.locale))} />
                  <DataPair label="Source" value={listing?.reference ?? "Direct availability"} />
                </dl>
                {quote.notes ? <p className="mt-4 rounded-xl bg-[var(--cream)] p-3 text-xs leading-5 text-[var(--muted)]">{quote.notes}</p> : null}
                <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--muted)]"><span>Submitted {formatDate(quote.submittedAt, localeCode(app.locale))}</span>{quote.status === "shortlisted" ? <span className="font-extrabold text-[var(--forest)]">Operations is reviewing your fit</span> : null}</div>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState title="No quotes in this view" description="Quotes matching this status will appear here." action={<InlineLink href="/farmer/requests">Find buyer requests</InlineLink>} />
      )}
    </div>
  );
}

function OrdersSection({ app, allocations }: { app: AppContext; allocations: AppContext["state"]["allocations"] }) {
  const planned = allocations.filter((allocation) => !allocation.orderId);
  const orderIds = Array.from(new Set(allocations.map((allocation) => allocation.orderId).filter((id): id is UUID => Boolean(id))));
  const orderRows = orderIds
    .map((orderId) => {
      const order = app.state.orders.find((candidate) => candidate.id === orderId);
      const ownAllocations = allocations.filter((allocation) => allocation.orderId === orderId);
      return order ? { order, ownAllocations } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.order.updatedAt.localeCompare(a.order.updatedAt));

  if (allocations.length === 0) {
    return <EmptyState title="No fulfillment allocations yet" description="Accepted quotes and direct supply matches will appear here without revealing another farmer’s data." action={<InlineLink href="/farmer/requests">Review buyer requests</InlineLink>} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--cream)] p-5 text-sm leading-6 text-[var(--muted)]">
        <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--forest)]" />
        <p><strong className="text-[var(--ink)]">Your commercial details stay private.</strong> Multi-supplier orders show only your allocated products, farmer price, pickup point, and settlement value.</p>
      </div>

      {planned.length > 0 ? (
        <Surface className="overflow-hidden">
          <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6"><h2 className="font-black text-[var(--ink)]">Allocations being planned</h2><p className="mt-1 text-xs text-[var(--muted)]">These quantities are proposed while operations completes the consolidated order.</p></div>
          <div className="divide-y divide-[var(--line)]">
            {planned.map((allocation) => {
              const productId = orderItemProductId(app, allocation);
              const product = productId ? productFor(app, productId) : undefined;
              return <div key={allocation.id} className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6"><div className="flex min-w-0 items-center gap-4"><ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Produce allocation"}</p><p className="mt-1 text-xs text-[var(--muted)]">{quantityLabel(allocation.quantity, allocation.unit)} · {allocation.pickupWindow ?? "Pickup timing pending"}</p></div></div><div className="flex items-center justify-between gap-4 sm:justify-end"><div className="sm:text-right"><p className="text-sm font-black text-[var(--forest)]">{formatFcfa(allocation.farmerTotal, app.locale)}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">Your value</p></div><StatusBadge status={allocation.status} /></div></div>;
            })}
          </div>
        </Surface>
      ) : null}

      <div className="space-y-5">
        {orderRows.map(({ order, ownAllocations }) => {
          const buyer = app.state.organisations.find((candidate) => candidate.id === order.buyerOrganisationId);
          const shipment = app.state.shipments.find((candidate) => candidate.orderId === order.id);
          const ownValue = ownAllocations.reduce((sum, allocation) => sum + allocation.farmerTotal, 0);
          const hasOtherSuppliers = order.allocationIds.length > ownAllocations.length;
          return (
            <article key={order.id} className="surface overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-[var(--line)] bg-[var(--cream)]/55 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                <div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={order.status} /><span className="text-xs font-bold text-[var(--muted)]">{order.reference}</span>{hasOtherSuppliers ? <span className="rounded-full bg-[var(--sage)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--forest)]">Consolidated order</span> : null}</div><h2 className="mt-3 text-lg font-black text-[var(--ink)]">Delivery to {buyer?.shortName ?? order.deliveryAddress.city}</h2><p className="mt-1 text-xs text-[var(--muted)]">{order.deliveryAddress.city}, {order.deliveryAddress.region} · Due {formatDate(order.deliveryDate, localeCode(app.locale))}</p></div>
                <div className="rounded-2xl bg-[var(--white)] px-4 py-3 shadow-sm sm:text-right"><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--muted)]">Your settlement value</p><p className="mt-1 text-lg font-black text-[var(--forest)]">{formatFcfa(ownValue, app.locale)}</p></div>
              </div>
              <div className="divide-y divide-[var(--line)]">
                {ownAllocations.map((allocation) => {
                  const productId = orderItemProductId(app, allocation);
                  const product = productId ? productFor(app, productId) : undefined;
                  const pickupStop = shipment?.pickupStops.find((stop) => stop.allocationId === allocation.id);
                  return (
                    <div key={allocation.id} className="grid gap-5 p-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.72fr)]">
                      <div className="flex min-w-0 gap-4"><ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} /><div className="min-w-0"><p className="font-extrabold text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Your allocation"}</p><p className="mt-1.5 text-sm font-bold text-[var(--forest)]">{quantityLabel(allocation.quantity, allocation.unit)} at {formatFcfa(allocation.farmerUnitPrice, app.locale)}/{humanize(allocation.unit).toLowerCase()}</p><div className="mt-2"><StatusBadge status={allocation.status} /></div>{allocation.farmerNote ? <p className="mt-2 text-xs text-[var(--muted)]">{allocation.farmerNote}</p> : null}</div></div>
                      <div className="rounded-2xl border border-[var(--line)] bg-[var(--cream)]/55 p-4"><p className="flex items-center gap-2 text-xs font-black text-[var(--ink)]"><Truck aria-hidden="true" size={15} className="text-[var(--forest)]" /> Pickup instructions</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{allocation.pickupWindow ?? (shipment?.plannedPickupAt ? formatDate(shipment.plannedPickupAt, localeCode(app.locale)) : "Operations will confirm the pickup window.")}</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{pickupStop?.address.label ?? allocation.pickupAddress.label}</p>{shipment?.driverName ? <p className="mt-2 text-xs font-bold text-[var(--forest)]">{shipment.driverName} · {shipment.transporterPhone}</p> : null}</div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-2 border-t border-[var(--line)] bg-[var(--cream)]/35 px-5 py-4 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>{shipment ? `${shipment.reference} · ${humanize(shipment.status)}` : "Shipment planning begins after order confirmation."}</span>{hasOtherSuppliers ? <span className="inline-flex items-center gap-1.5 font-bold text-[var(--forest)]"><ShieldCheck aria-hidden="true" size={14} /> Other supplier details are hidden</span> : null}</div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type SettlementState = "settled" | "eligible" | "buyer_paid" | "pending" | "on_hold";

function settlementState(app: AppContext, allocation: AppContext["state"]["allocations"][number]): SettlementState {
  const order = allocation.orderId ? app.state.orders.find((candidate) => candidate.id === allocation.orderId) : undefined;
  if (!order) return "pending";
  if (order.status === "disputed") return "on_hold";
  if (order.status === "completed") return "settled";
  const buyerPaymentSucceeded = app.state.payments.some((payment) => payment.orderId === order.id && payment.status === "succeeded");
  if (buyerPaymentSucceeded && allocation.status === "delivered") return "eligible";
  if (buyerPaymentSucceeded) return "buyer_paid";
  return "pending";
}

function settlementLabel(status: SettlementState) {
  const labels: Record<SettlementState, string> = {
    settled: "Settled",
    eligible: "Ready for review",
    buyer_paid: "Buyer paid",
    pending: "Pending",
    on_hold: "On hold",
  };
  return labels[status];
}

function settlementBadgeStatus(status: SettlementState) {
  if (status === "settled") return "completed";
  if (status === "eligible" || status === "buyer_paid") return "processing";
  if (status === "on_hold") return "disputed";
  return "pending";
}

function PaymentsSection({ app, allocations }: { app: AppContext; allocations: AppContext["state"]["allocations"] }) {
  const organisation = app.currentOrganisation!;
  const rows = allocations
    .filter((allocation) => allocation.orderId)
    .map((allocation) => {
      const order = app.state.orders.find((candidate) => candidate.id === allocation.orderId);
      const productId = orderItemProductId(app, allocation);
      const product = productId ? productFor(app, productId) : undefined;
      return order ? { allocation, order, product, status: settlementState(app, allocation) } : null;
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => b.order.updatedAt.localeCompare(a.order.updatedAt));
  const settled = rows.filter((row) => row.status === "settled").reduce((sum, row) => sum + row.allocation.farmerTotal, 0);
  const eligible = rows.filter((row) => ["eligible", "buyer_paid"].includes(row.status)).reduce((sum, row) => sum + row.allocation.farmerTotal, 0);
  const onHold = rows.filter((row) => row.status === "on_hold").reduce((sum, row) => sum + row.allocation.farmerTotal, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Settled value" value={formatFcfa(settled, app.locale)} detail="Completed allocations" icon={<CircleDollarSign aria-hidden="true" size={19} />} tone="forest" />
        <KpiCard label="In settlement flow" value={formatFcfa(eligible, app.locale)} detail="Paid orders moving to completion" icon={<HandCoins aria-hidden="true" size={19} />} tone="sage" />
        <KpiCard label="On hold" value={formatFcfa(onHold, app.locale)} detail={onHold > 0 ? "Pending issue resolution" : "No held allocation value"} icon={<AlertCircle aria-hidden="true" size={19} />} tone="orange" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Surface className="overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-[var(--line)] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="font-black text-[var(--ink)]">Allocation settlements</h2><p className="mt-1 text-xs text-[var(--muted)]">Only your farmer value is shown—never the buyer total or another supplier’s price.</p></div><span className="text-xs font-bold text-[var(--muted)]">{rows.length} record{rows.length === 1 ? "" : "s"}</span></div>
          {rows.length > 0 ? (
            <div className="divide-y divide-[var(--line)]">
              {rows.map(({ allocation, order, product, status }) => (
                <div key={allocation.id} className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-6">
                  <div className="flex min-w-0 items-center gap-4"><ProductMark name={product ? localise(product.name, app.locale) : "Produce"} accent={product?.accent} /><div className="min-w-0"><p className="truncate text-sm font-extrabold text-[var(--ink)]">{product ? localise(product.name, app.locale) : "Produce allocation"}</p><p className="mt-1 text-xs text-[var(--muted)]">{order.reference} · {quantityLabel(allocation.quantity, allocation.unit)}</p><p className="mt-1 text-[10px] text-[var(--muted)]">Updated {formatDate(order.updatedAt, localeCode(app.locale))}</p></div></div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end"><div className="sm:text-right"><p className="text-base font-black text-[var(--forest)]">{formatFcfa(allocation.farmerTotal, app.locale)}</p><p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--muted)]">Your allocation</p></div><StatusBadge status={settlementBadgeStatus(status)} label={settlementLabel(status)} /></div>
                </div>
              ))}
            </div>
          ) : <div className="p-8 text-center text-sm text-[var(--muted)]">Settlement records appear after your produce is allocated to an order.</div>}
        </Surface>

        <div className="space-y-5">
          <Surface className="p-5 sm:p-6">
            <div className="flex items-start gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]"><WalletCards aria-hidden="true" size={20} /></span><div><p className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--muted)]">Preferred payout route</p><h2 className="mt-2 font-black text-[var(--ink)]">{organisation.preferredPaymentProvider ? humanize(organisation.preferredPaymentProvider) : "Not configured"}</h2><p className="mt-1 text-sm text-[var(--muted)]">{organisation.maskedPaymentAccount ?? "Add an approved payout account during verification."}</p></div></div>
            <div className="mt-5 border-t border-[var(--line)] pt-5"><InlineLink href="/farmer/profile">Review payment profile</InlineLink></div>
          </Surface>
          <Surface className="p-5 sm:p-6">
            <p className="flex items-center gap-2 text-sm font-black text-[var(--ink)]"><Info aria-hidden="true" size={17} className="text-[var(--forest)]" /> How settlement status works</p>
            <ol className="mt-4 space-y-4 text-xs leading-5 text-[var(--muted)]">
              <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--cream)] font-black text-[var(--forest)]">1</span><span><strong className="text-[var(--ink)]">Buyer paid</strong><br />Payment is confirmed by the external provider.</span></li>
              <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--cream)] font-black text-[var(--forest)]">2</span><span><strong className="text-[var(--ink)]">Delivery accepted</strong><br />The order clears its acceptance or issue window.</span></li>
              <li className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--cream)] font-black text-[var(--forest)]">3</span><span><strong className="text-[var(--ink)]">Settlement recorded</strong><br />Your allocation is marked complete in the transaction record.</span></li>
            </ol>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function notificationIcon(type: AppContext["state"]["notifications"][number]["type"]): LucideIcon {
  if (type === "demand_match") return ShoppingBasket;
  if (type === "quote") return ReceiptText;
  if (type === "pickup" || type === "delivery") return Truck;
  if (type === "payment") return CircleDollarSign;
  if (type === "verification") return BadgeCheck;
  if (type === "order" || type === "offer") return PackageCheck;
  return Bell;
}

function NotificationsSection({ app, runAction }: { app: AppContext; runAction: RunAction }) {
  const notifications = app.state.notifications
    .filter((notification) => notification.recipientUserId === app.currentUser?.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = notifications.filter((notification) => !notification.readAt);

  const markAllRead = () => {
    runAction("All notifications marked as read.", () => {
      unread.forEach((notification) => app.actions.markNotificationRead(notification.id));
    });
  };

  if (notifications.length === 0) {
    return <EmptyState title="No notifications yet" description="Demand matches, quote decisions, pickup instructions, and settlement changes will appear here." />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
      <Surface className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-5 sm:px-6"><div><h2 className="font-black text-[var(--ink)]">Recent activity</h2><p className="mt-1 text-xs text-[var(--muted)]">{unread.length} unread of {notifications.length}</p></div>{unread.length > 0 ? <button type="button" onClick={markAllRead} className={secondaryButtonClass}><Check aria-hidden="true" size={15} /> Mark all read</button> : null}</div>
        <div className="divide-y divide-[var(--line)]">
          {notifications.map((notification) => {
            const Icon = notificationIcon(notification.type);
            return (
              <article key={notification.id} className={`flex gap-4 px-5 py-5 sm:px-6 ${notification.readAt ? "bg-[var(--white)]" : "bg-[var(--sage)]/30"}`}>
                <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${notification.readAt ? "bg-[var(--cream)] text-[var(--forest)]" : "bg-[var(--forest)] text-[var(--lime)]"}`}><Icon aria-hidden="true" size={19} /></span>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1"><h3 className="text-sm font-black text-[var(--ink)]">{localise(notification.title, app.locale)}</h3><span className="text-[10px] font-bold text-[var(--muted)]">{formatDate(notification.createdAt, localeCode(app.locale))}</span></div><p className="mt-1.5 text-sm leading-6 text-[var(--muted)]">{localise(notification.message, app.locale)}</p><div className="mt-3 flex flex-wrap items-center gap-2"><span className="rounded-full border border-[var(--line)] bg-[var(--white)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--muted)]">{humanize(notification.type)}</span>{notification.channels.map((channel) => <span key={channel} className="text-[10px] font-bold text-[var(--muted)]">{humanize(channel)}</span>)}</div></div>
                {!notification.readAt ? <button type="button" aria-label={`Mark ${localise(notification.title, app.locale)} as read`} onClick={() => runAction("Notification marked as read.", () => app.actions.markNotificationRead(notification.id))} className="mt-1 grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-[var(--white)] text-[var(--forest)] hover:bg-[var(--cream)]"><Check aria-hidden="true" size={16} /></button> : null}
              </article>
            );
          })}
        </div>
      </Surface>

      <div className="space-y-5">
        <Surface className="p-5">
          <span className="grid size-11 place-items-center rounded-2xl bg-[var(--lime)] text-[var(--forest)]"><Bell aria-hidden="true" size={20} /></span>
          <h2 className="mt-4 font-black text-[var(--ink)]">Delivery channels</h2>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">In-app updates remain your source of truth even when SMS or WhatsApp delivery is delayed.</p>
          <div className="mt-5 space-y-3">
            {[{ label: "In-app", active: true }, { label: "SMS", active: notifications.some((item) => item.channels.includes("sms")) }, { label: "WhatsApp", active: notifications.some((item) => item.channels.includes("whatsapp")) }, { label: "Email", active: Boolean(app.currentUser?.email) }].map((channel) => <div key={channel.label} className="flex items-center justify-between text-xs"><span className="font-bold text-[var(--ink)]">{channel.label}</span><span className={`rounded-full px-2.5 py-1 font-extrabold ${channel.active ? "bg-[var(--sage)] text-[var(--forest)]" : "bg-[var(--cream)] text-[var(--muted)]"}`}>{channel.active ? "Available" : "Not set"}</span></div>)}
          </div>
        </Surface>
        <Surface className="p-5"><p className="text-sm font-black text-[var(--ink)]">Need help with an update?</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Contact support if an order status does not match what happened at pickup or delivery.</p><div className="mt-4"><InlineLink href="/support">Contact support</InlineLink></div></Surface>
      </div>
    </div>
  );
}

function ProfileSection({ app }: { app: AppContext }) {
  const organisation = app.currentOrganisation!;
  const user = app.currentUser;
  const checklist = [
    { label: "Primary contact", complete: Boolean(organisation.contactPerson && organisation.phone), detail: organisation.contactPerson },
    { label: "Registration or identity", complete: Boolean(organisation.registrationNumber || organisation.type === "farmer"), detail: organisation.registrationNumber ?? "Individual farmer profile" },
    { label: "Farm or pickup location", complete: organisation.addresses.some((address) => ["farm", "pickup"].includes(address.kind)), detail: organisation.addresses[0]?.label ?? "Not provided" },
    { label: "Produce catalogue", complete: organisation.produceCategoryIds.length > 0, detail: `${organisation.produceCategoryIds.length} product${organisation.produceCategoryIds.length === 1 ? "" : "s"}` },
    { label: "Settlement method", complete: Boolean(organisation.preferredPaymentProvider && organisation.maskedPaymentAccount), detail: organisation.preferredPaymentProvider ? humanize(organisation.preferredPaymentProvider) : "Not configured" },
    { label: "Marketplace verification", complete: organisation.verificationStatus === "verified", detail: humanize(organisation.verificationStatus) },
  ];
  const completion = percent(checklist.filter((item) => item.complete).length, checklist.length);
  const products = organisation.produceCategoryIds.map((id) => productFor(app, id)).filter((product): product is NonNullable<typeof product> => Boolean(product));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] bg-[var(--forest)] p-6 text-[var(--white)] shadow-[var(--shadow-lg)] sm:p-8">
        <div className="pointer-events-none absolute -right-12 -top-20 size-64 rounded-full border-[46px] border-white/[0.06]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
          <div className="flex items-start gap-4"><span className="grid size-14 shrink-0 place-items-center rounded-[18px] bg-[var(--lime)] text-[var(--forest)]"><ShieldCheck aria-hidden="true" size={25} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-white/60">Organisation trust profile</p><StatusBadge status={organisation.verificationStatus} /></div><h2 className="font-display mt-3 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{organisation.name}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-white/65">{localise(organisation.description, app.locale)}</p></div></div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-5 backdrop-blur"><div className="flex items-center justify-between gap-3"><p className="text-xs font-extrabold uppercase tracking-[0.1em] text-white/65">Profile completion</p><p className="text-lg font-black text-[var(--lime)]">{completion}%</p></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[var(--lime)]" style={{ width: `${completion}%` }} /></div><p className="mt-3 text-xs leading-5 text-white/60">Complete records help operations assign orders and coordinate pickups with fewer calls.</p></div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
        <div className="space-y-6">
          <Surface className="p-5 sm:p-6">
            <div className="flex items-center justify-between"><h2 className="font-black text-[var(--ink)]">Verification checklist</h2><span className="text-xs font-extrabold text-[var(--forest)]">{checklist.filter((item) => item.complete).length}/{checklist.length} ready</span></div>
            <div className="mt-5 space-y-4">
              {checklist.map((item) => <div key={item.label} className="flex items-start gap-3"><span className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${item.complete ? "bg-[var(--sage)] text-[var(--forest)]" : "bg-[var(--orange-soft)] text-[var(--ink)]"}`}>{item.complete ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : <Clock3 aria-hidden="true" size={12} />}</span><div><p className="text-sm font-extrabold text-[var(--ink)]">{item.label}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{item.detail}</p></div></div>)}
            </div>
            {organisation.verificationNotes ? <div className="mt-6 rounded-2xl bg-[var(--cream)] p-4"><p className="text-xs font-extrabold text-[var(--ink)]">Latest verification note</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{organisation.verificationNotes}</p></div> : null}
          </Surface>

          <Surface className="p-5 sm:p-6">
            <h2 className="font-black text-[var(--ink)]">Fulfillment track record</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-[var(--cream)] p-4"><p className="text-2xl font-black text-[var(--forest)]">{organisation.performance.completedOrders}</p><p className="mt-1 text-xs text-[var(--muted)]">Completed orders</p></div>
              <div className="rounded-2xl bg-[var(--cream)] p-4"><p className="flex items-center gap-1 text-2xl font-black text-[var(--forest)]">{organisation.performance.averageRating?.toFixed(1) ?? "—"}<Star aria-hidden="true" className="size-4 fill-[var(--orange)] text-[var(--orange)]" /></p><p className="mt-1 text-xs text-[var(--muted)]">Average rating</p></div>
            </div>
            <div className="mt-5"><ProgressBar value={organisation.performance.onTimeDeliveryRate ?? 0} label="On-time fulfillment" /></div>
            <p className="mt-4 text-xs text-[var(--muted)]">Cancellation rate: <strong className="text-[var(--ink)]">{organisation.performance.cancellationRate}%</strong></p>
          </Surface>
        </div>

        <div className="space-y-6">
          <Surface className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6"><h2 className="font-black text-[var(--ink)]">Organisation details</h2><p className="mt-1 text-xs text-[var(--muted)]">Private contact and settlement data is visible only to authorized roles.</p></div>
            <dl className="grid gap-x-6 gap-y-5 p-5 sm:grid-cols-2 sm:p-6">
              <DataPair label="Contact person" value={organisation.contactPerson} />
              <DataPair label="Phone" value={organisation.phone} />
              <DataPair label="Email" value={organisation.email ?? user?.email ?? "Not provided"} />
              <DataPair label="Registration" value={organisation.registrationNumber ?? "Individual profile"} />
              <DataPair label="Organisation type" value={humanize(organisation.type)} />
              <DataPair label="Member account" value={user?.displayName ?? "Not set"} />
              <DataPair label="Preferred settlement" value={organisation.preferredPaymentProvider ? humanize(organisation.preferredPaymentProvider) : "Not set"} />
              <DataPair label="Settlement account" value={organisation.maskedPaymentAccount ?? "Not set"} />
            </dl>
          </Surface>

          <Surface className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6"><h2 className="font-black text-[var(--ink)]">Farm & pickup locations</h2></div>
            {organisation.addresses.length > 0 ? <div className="divide-y divide-[var(--line)]">{organisation.addresses.map((address) => <div key={address.id} className="flex gap-4 px-5 py-5 sm:px-6"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-[var(--sage)] text-[var(--forest)]"><MapPin aria-hidden="true" size={19} /></span><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold text-[var(--ink)]">{address.label}</p><span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-[10px] font-bold text-[var(--muted)]">{humanize(address.kind)}</span></div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{address.addressLine}, {address.locality}, {address.city} · {address.region}</p>{address.instructions ? <p className="mt-2 text-xs font-semibold text-[var(--forest)]">{address.instructions}</p> : null}</div></div>)}</div> : <div className="p-6 text-sm text-[var(--muted)]">No pickup location is available.</div>}
          </Surface>

          <Surface className="overflow-hidden">
            <div className="border-b border-[var(--line)] px-5 py-5 sm:px-6"><h2 className="font-black text-[var(--ink)]">Produce catalogue</h2><p className="mt-1 text-xs text-[var(--muted)]">Used to match your organisation with buyer demand.</p></div>
            {products.length > 0 ? <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">{products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] p-3"><ProductMark name={localise(product.name, app.locale)} accent={product.accent} /><div><p className="text-sm font-extrabold text-[var(--ink)]">{localise(product.name, app.locale)}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">{humanize(product.category)}</p></div></div>)}</div> : <div className="p-6 text-sm text-[var(--muted)]">No produce categories selected.</div>}
          </Surface>

          <div className="flex flex-col gap-3 rounded-[22px] border border-[var(--line)] bg-[var(--cream)] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><FileCheck2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-[var(--forest)]" /><div><p className="text-sm font-black text-[var(--ink)]">Need to correct profile information?</p><p className="mt-1 text-xs text-[var(--muted)]">Support can request and review updated verification evidence.</p></div></div><InlineLink href="/support">Contact support</InlineLink></div>
        </div>
      </div>
    </div>
  );
}
