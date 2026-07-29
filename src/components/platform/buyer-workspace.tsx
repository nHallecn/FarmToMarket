"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Filter,
  MapPin,
  PackageCheck,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Star,
  Trash2,
  Truck,
  WalletCards,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import {
  formatFcfa,
  localise,
  type CommercialUnit,
  type CreateDemandItemInput,
  type DisputeReason,
  type Order,
  type PaymentProvider,
  type ProduceGrade,
  type RequestedResolution,
} from "@/lib/domain";
import {
  EmptyState,
  Field,
  formatDate,
  formatRelativeDate,
  humanize,
  inputClass,
  KpiCard,
  Modal,
  primaryButtonClass,
  ProductMark,
  ProgressBar,
  secondaryButtonClass,
  SectionHeading,
  StatusBadge,
  textareaClass,
} from "./shared";

type DemandLineDraft = CreateDemandItemInput & { key: number };

const orderSteps = [
  "requested",
  "quoted",
  "confirmed",
  "ready_for_pickup",
  "in_transit",
  "delivered",
  "accepted",
  "completed",
] as const;

function BuyerOrderTimeline({ order }: { order: Order }) {
  const current = Math.max(0, orderSteps.indexOf(order.status as (typeof orderSteps)[number]));
  return (
    <ol className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8" aria-label="Order progress">
      {orderSteps.map((step, index) => {
        const complete = index <= current && !["cancelled", "refunded", "disputed"].includes(order.status);
        return (
          <li key={step} className="min-w-0">
            <div className={`h-1.5 rounded-full ${complete ? "bg-[var(--lime-strong)]" : "bg-[var(--cream-deep)]"}`} />
            <p className={`mt-2 truncate text-[10px] font-bold ${complete ? "text-[var(--forest)]" : "text-[var(--muted)]"}`}>{humanize(step)}</p>
          </li>
        );
      })}
    </ol>
  );
}

function DemandForm({ onClose, initialProductId }: { onClose: () => void; initialProductId?: string }) {
  const { state, currentOrganisation, actions } = useApp();
  const firstProduct = initialProductId ?? state.products[0]?.id ?? "";
  const [title, setTitle] = useState("Weekly kitchen restock");
  const [date, setDate] = useState("2026-07-29");
  const [recurring, setRecurring] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<DemandLineDraft[]>([
    { key: 1, productId: firstProduct, quantity: 100, unit: "kg", grade: "grade_a", targetUnitPrice: 650 },
  ]);

  const updateLine = (key: number, patch: Partial<DemandLineDraft>) => {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await actions.createDemand({
        title,
        requiredDeliveryDate: date,
        items: lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
          unit: line.unit,
          grade: line.grade,
          targetUnitPrice: line.targetUnitPrice,
          notes: line.notes,
        })),
        recurring,
        recurrenceNote: recurring ? "Operational follow-up every week" : undefined,
        notes,
        submit: true,
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create demand.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Request title">
          <input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
        </Field>
        <Field label="Delivery date">
          <input className={inputClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
        </Field>
      </div>
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black text-[var(--ink)]">Products needed</p>
            <p className="mt-0.5 text-xs text-[var(--muted)]">Add everything for one delivery.</p>
          </div>
          <button
            type="button"
            onClick={() => setLines((current) => [...current, { key: Math.max(...current.map((line) => line.key), 0) + 1, productId: state.products[0]?.id ?? "", quantity: 50, unit: "kg", grade: "standard", targetUnitPrice: 500 }])}
            className={secondaryButtonClass}
          >
            <Plus aria-hidden="true" size={15} /> Add item
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {lines.map((line, index) => {
            const product = state.products.find((item) => item.id === line.productId);
            return (
              <div key={line.key} className="rounded-xl border border-[var(--line)] bg-white p-3.5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-[var(--muted)]">Item {index + 1}</span>
                  {lines.length > 1 ? <button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} className="text-red-600"><Trash2 aria-hidden="true" size={16} /></button> : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Product">
                    <select className={inputClass} value={line.productId} onChange={(event) => { const nextProduct = state.products.find((item) => item.id === event.target.value); updateLine(line.key, { productId: event.target.value, unit: nextProduct?.defaultUnit ?? "kg" }); }}>
                      {state.products.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name.en}</option>)}
                    </select>
                  </Field>
                  <Field label="Quantity">
                    <input className={inputClass} type="number" min="1" value={line.quantity} onChange={(event) => updateLine(line.key, { quantity: Number(event.target.value) })} required />
                  </Field>
                  <Field label="Unit">
                    <select className={inputClass} value={line.unit} onChange={(event) => updateLine(line.key, { unit: event.target.value as CommercialUnit })}>
                      {(product?.allowedUnits ?? ["kg"]).map((unit) => <option key={unit} value={unit}>{humanize(unit)}</option>)}
                    </select>
                  </Field>
                  <Field label="Target / unit" hint="optional">
                    <input className={inputClass} type="number" min="0" value={line.targetUnitPrice ?? ""} onChange={(event) => updateLine(line.key, { targetUnitPrice: event.target.value ? Number(event.target.value) : undefined })} />
                  </Field>
                </div>
                <div className="mt-3 max-w-xs">
                  <Field label="Preferred grade">
                    <select className={inputClass} value={line.grade} onChange={(event) => updateLine(line.key, { grade: event.target.value as ProduceGrade })}>
                      {(product?.grades ?? ["standard"]).map((grade) => <option key={grade} value={grade}>{humanize(grade)}</option>)}
                    </select>
                  </Field>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <Field label="Delivery notes" hint="optional">
        <textarea className={textareaClass} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Access instructions, packaging preferences, receiving hours…" />
      </Field>
      <label className="flex items-start gap-3 rounded-xl border border-[var(--line)] p-4">
        <input type="checkbox" checked={recurring} onChange={(event) => setRecurring(event.target.checked)} className="mt-1 size-4 accent-[var(--forest)]" />
        <span><span className="block text-sm font-bold">This is a repeat need</span><span className="mt-0.5 block text-xs leading-5 text-[var(--muted)]">Operations will follow up; no automatic billing is created.</span></span>
      </label>
      <div className="rounded-xl bg-[var(--sage)] p-4 text-sm text-[var(--forest)]">
        <strong>Deliver to:</strong> {currentOrganisation?.addresses.find((item) => item.kind === "delivery")?.addressLine ?? "your default business address"}
      </div>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={pending} onClick={onClose} className={secondaryButtonClass}>Cancel</button>
        <button type="submit" disabled={pending} className={primaryButtonClass}><ShoppingBasket aria-hidden="true" size={17} /> {pending ? "Publishing…" : "Publish demand"}</button>
      </div>
    </form>
  );
}

function PaymentForm({ order, onClose }: { order: Order; onClose: () => void }) {
  const { actions } = useApp();
  const [provider, setProvider] = useState<PaymentProvider>("mtn_momo");
  const [reference, setReference] = useState(`FTM-${order.reference.slice(-4)}-DEMO`);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await actions.confirmPayment({ orderId: order.id, provider, transactionReference: reference, amount: order.total, payerMaskedAccount: "+237 6•• •• 41 08" });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment could not be confirmed.");
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-2xl bg-[var(--forest)] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider text-white/60">Amount due</p>
        <p className="mt-2 text-3xl font-black">{formatFcfa(order.total)}</p>
        <p className="mt-2 text-xs text-white/60">Demo payment: no real charge will be made.</p>
      </div>
      <Field label="Payment method">
        <select className={inputClass} value={provider} onChange={(event) => setProvider(event.target.value as PaymentProvider)}>
          <option value="mtn_momo">MTN Mobile Money</option><option value="orange_money">Orange Money</option><option value="bank_transfer">Business bank transfer</option>
        </select>
      </Field>
      <Field label="Transaction / transfer reference">
        <input className={inputClass} value={reference} onChange={(event) => setReference(event.target.value)} required minLength={5} />
      </Field>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}><ShieldCheck aria-hidden="true" size={17} /> {pending ? "Confirming…" : "Confirm sandbox payment"}</button>
    </form>
  );
}

function DisputeForm({ order, onClose }: { order: Order; onClose: () => void }) {
  const { actions } = useApp();
  const [reason, setReason] = useState<DisputeReason>("quality");
  const [resolution, setResolution] = useState<RequestedResolution>("partial_refund");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError("");
    try {
      await actions.openDispute({ orderId: order.id, reason, requestedResolution: resolution, description, evidence: [{ kind: "note", description: "Buyer submitted written evidence in demo." }] });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to open the dispute.");
    } finally {
      setPending(false);
    }
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Issue">
          <select className={inputClass} value={reason} onChange={(event) => setReason(event.target.value as DisputeReason)}>
            <option value="quality">Quality</option><option value="quantity_shortage">Quantity shortage</option><option value="late_delivery">Late delivery</option><option value="damaged_goods">Damaged goods</option><option value="wrong_product">Wrong product</option><option value="other">Other</option>
          </select>
        </Field>
        <Field label="Requested outcome">
          <select className={inputClass} value={resolution} onChange={(event) => setResolution(event.target.value as RequestedResolution)}>
            <option value="partial_refund">Partial refund</option><option value="replacement">Replacement</option><option value="full_refund">Full refund</option><option value="credit">Account credit</option><option value="other">Other</option>
          </select>
        </Field>
      </div>
      <Field label="What happened?">
        <textarea className={textareaClass} minLength={10} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the affected products, quantity, and what you observed…" />
      </Field>
      {error ? <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <button className={`${primaryButtonClass} w-full`} type="submit" disabled={pending}><FileText aria-hidden="true" size={17} /> {pending ? "Submitting…" : "Submit for review"}</button>
    </form>
  );
}

export function BuyerWorkspace({ section }: { section: string }) {
  const { state, currentUser, currentOrganisation, locale, actions } = useApp();
  const [demandOpen, setDemandOpen] = useState(false);
  const [initialProduct, setInitialProduct] = useState<string>();
  const [paymentOrder, setPaymentOrder] = useState<Order>();
  const [disputeOrder, setDisputeOrder] = useState<Order>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<
    { kind: "success" | "error"; message: string } | null
  >(null);
  const pendingActionRef = useRef(false);
  const buyerId = currentOrganisation?.type === "buyer" ? currentOrganisation.id : state.organisations.find((item) => item.type === "buyer")?.id;
  const buyerDemands = state.demands.filter((item) => item.buyerOrganisationId === buyerId);
  const buyerOrders = state.orders.filter((item) => item.buyerOrganisationId === buyerId);
  const buyerPayments = state.payments.filter((payment) => buyerOrders.some((order) => order.id === payment.orderId));
  const notifications = state.notifications.filter((item) => item.recipientUserId === currentUser?.id);
  const productFor = (id: string) => state.products.find((item) => item.id === id);
  const openDemand = (productId?: string) => { setInitialProduct(productId); setDemandOpen(true); };
  const runAction = async (
    key: string,
    successMessage: string,
    task: () => Promise<unknown>,
  ) => {
    if (pendingActionRef.current) return;
    pendingActionRef.current = true;
    setPendingAction(key);
    setActionNotice(null);
    try {
      await task();
      setActionNotice({ kind: "success", message: successMessage });
    } catch (caught) {
      setActionNotice({
        kind: "error",
        message: caught instanceof Error ? caught.message : "That action could not be saved.",
      });
    } finally {
      pendingActionRef.current = false;
      setPendingAction(null);
    }
  };

  const filteredListings = state.listings.filter((listing) => {
    if (listing.status !== "active") return false;
    const product = productFor(listing.productId);
    const term = search.trim().toLowerCase();
    return (category === "all" || product?.category === category) && (!term || product?.name.en.toLowerCase().includes(term) || listing.location.city.toLowerCase().includes(term));
  });

  const latestOrder = buyerOrders.find((order) => !["completed", "cancelled", "refunded"].includes(order.status)) ?? buyerOrders[0];
  const pendingOffers = buyerOrders.filter((order) => order.status === "quoted").length;
  const deliveriesDue = buyerOrders.filter((order) => ["ready_for_pickup", "in_transit", "delivered"].includes(order.status)).length;

  const pageHeader = (title: string, description: string, action?: React.ReactNode) => <SectionHeading eyebrow="Buyer workspace" title={title} description={description} action={action} />;

  let content: React.ReactNode;

  if (section === "marketplace") {
    content = (
      <div className="space-y-6">
        {pageHeader("Verified supply, ready when you are", "Search live produce from verified farms and cooperatives.", <button onClick={() => openDemand()} className={primaryButtonClass}><Plus aria-hidden="true" size={17} /> Post a demand</button>)}
        <div className="surface flex flex-col gap-3 p-3 sm:flex-row">
          <label className="relative flex-1"><Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={18} /><span className="sr-only">Search supply</span><input className={`${inputClass} pl-11`} placeholder="Search products or city" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
          <label className="relative sm:w-52"><Filter aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={17} /><span className="sr-only">Filter by category</span><select className={`${inputClass} pl-11`} value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{Array.from(new Set(state.products.map((item) => item.category))).map((item) => <option key={item} value={item}>{humanize(item)}</option>)}</select></label>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredListings.map((listing) => {
            const product = productFor(listing.productId); const farmer = state.organisations.find((item) => item.id === listing.farmerOrganisationId);
            return <article key={listing.id} className="surface overflow-hidden transition-transform hover:-translate-y-1">
              <div className="h-2" style={{ background: product?.accent ?? "var(--lime)" }} />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3"><ProductMark name={product?.name.en ?? "Produce"} accent={product?.accent} /><StatusBadge status={listing.grade} /></div>
                <h2 className="mt-4 text-xl font-black text-[var(--ink)]">{product ? localise(product.name, locale) : "Produce"}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--muted)]"><MapPin aria-hidden="true" size={14} />{listing.location.locality}, {listing.location.region}</p>
                <div className="my-5 grid grid-cols-2 gap-3 rounded-xl bg-[var(--cream)] p-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Available</p><p className="mt-1 font-black">{listing.availableQuantity - listing.reservedQuantity} {humanize(listing.unit)}</p></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">Price</p><p className="mt-1 font-black">{formatFcfa(listing.unitPrice)}<span className="text-xs font-medium text-[var(--muted)]"> / {humanize(listing.unit)}</span></p></div></div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--forest)]"><BadgeCheck aria-hidden="true" size={15} /> {farmer?.shortName ?? "Verified supplier"}<span className="ml-auto text-[var(--muted)]">{farmer?.performance.averageRating ?? "New"} <Star className="inline fill-current" size={12} /></span></div>
                <button onClick={() => openDemand(listing.productId)} className={`${primaryButtonClass} mt-5 w-full`}>Request this supply <ArrowRight aria-hidden="true" size={16} /></button>
              </div>
            </article>;
          })}
        </div>
        {filteredListings.length === 0 ? <EmptyState title="No supply matches those filters" description="Clear a filter or post a demand so operations can source it across the network." action={<button onClick={() => openDemand()} className={primaryButtonClass}>Post demand</button>} /> : null}
      </div>
    );
  } else if (section === "demands") {
    content = <div className="space-y-6">{pageHeader("My procurement demands", "Track farmer interest, fulfillment coverage, and platform offers in one place.", <button onClick={() => openDemand()} className={primaryButtonClass}><Plus aria-hidden="true" size={17} /> New demand</button>)}
      <div className="grid gap-4 lg:grid-cols-2">{buyerDemands.map((demand) => { const items = state.demandItems.filter((item) => item.demandId === demand.id); const quotes = state.quotes.filter((quote) => items.some((item) => item.id === quote.demandItemId)); const required = items.reduce((sum, item) => sum + item.quantity, 0); const allocated = state.allocations.filter((allocation) => allocation.demandId === demand.id && allocation.status !== "cancelled").reduce((sum, allocation) => sum + allocation.quantity, 0); return <article key={demand.id} className="surface p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[var(--muted)]">{demand.reference}</p><h2 className="mt-1 text-lg font-black">{demand.title}</h2></div><StatusBadge status={demand.status} /></div><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[var(--muted)]"><span className="flex items-center gap-1.5"><CalendarDays size={15} />{formatDate(demand.requiredDeliveryDate)}</span><span className="flex items-center gap-1.5"><MapPin size={15} />{demand.deliveryAddress.city}</span></div><div className="mt-5 space-y-2">{items.map((item) => { const product = productFor(item.productId); return <div key={item.id} className="flex items-center gap-3 rounded-xl bg-[var(--cream)] p-3"><ProductMark name={product?.name.en ?? "Produce"} accent={product?.accent} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{product?.name.en}</p><p className="mt-0.5 text-xs text-[var(--muted)]">{item.quantity} {humanize(item.unit)} · {humanize(item.grade)}</p></div></div>; })}</div><div className="mt-5"><ProgressBar value={required ? (allocated / required) * 100 : 0} label="Fulfillment allocated" /></div><div className="mt-4 flex items-center justify-between text-xs font-bold text-[var(--muted)]"><span>{quotes.length} farmer response{quotes.length === 1 ? "" : "s"}</span><span>{allocated} / {required} units covered</span></div></article>; })}</div>
      {buyerDemands.length === 0 ? <EmptyState title="No demands yet" description="Post the products and delivery date you need; verified farmers can respond with full or partial quantities." action={<button onClick={() => openDemand()} className={primaryButtonClass}>Create demand</button>} /> : null}
    </div>;
  } else if (section === "orders") {
    content = <div className="space-y-6">{pageHeader("Orders and deliveries", "One consolidated order, even when several farmers are supplying it.")}
      <div className="space-y-4">{buyerOrders.map((order) => { const items = state.orderItems.filter((item) => order.itemIds.includes(item.id)); const shipment = state.shipments.find((item) => item.orderId === order.id); return <article key={order.id} className="surface p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><p className="text-xs font-black text-[var(--muted)]">{order.reference}</p><StatusBadge status={order.status} /></div><h2 className="mt-2 text-xl font-black">{items.map((item) => productFor(item.productId)?.name.en).join(", ")}</h2><p className="mt-1 text-sm text-[var(--muted)]">Delivery {formatDate(order.deliveryDate)} · {order.deliveryAddress.city}</p></div><div className="sm:text-right"><p className="text-2xl font-black text-[var(--forest)]">{formatFcfa(order.total, locale)}</p><StatusBadge status={order.paymentStatus} label={`Payment ${humanize(order.paymentStatus)}`} /></div></div><BuyerOrderTimeline order={order} />
        <div className="mt-5 grid gap-3 rounded-2xl bg-[var(--cream)] p-4 sm:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Items</p><p className="mt-1 text-sm font-bold">{items.length} product line{items.length === 1 ? "" : "s"}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Sourcing</p><p className="mt-1 text-sm font-bold">{order.allocationIds.length} verified supplier{order.allocationIds.length === 1 ? "" : "s"}</p></div><div><p className="text-[10px] font-black uppercase tracking-wider text-[var(--muted)]">Delivery</p><p className="mt-1 text-sm font-bold">{shipment ? humanize(shipment.status) : "Planning pending"}</p></div></div>
        <div className="mt-5 flex flex-wrap gap-2">
          {order.status === "quoted" ? (
            <button
              disabled={pendingAction !== null}
              onClick={() =>
                void runAction(
                  `confirm:${order.id}`,
                  `${order.reference} confirmed.`,
                  () => actions.confirmOrder(order.id),
                )
              }
              className={primaryButtonClass}
            >
              <Check aria-hidden="true" size={16} />{" "}
              {pendingAction === `confirm:${order.id}` ? "Confirming…" : "Confirm offer"}
            </button>
          ) : null}
          {order.status === "confirmed" && order.paymentStatus !== "succeeded" ? (
            <button disabled={pendingAction !== null} onClick={() => setPaymentOrder(order)} className={primaryButtonClass}>
              <WalletCards aria-hidden="true" size={16} /> Pay securely
            </button>
          ) : null}
          {order.status === "delivered" ? (
            <>
              <button
                disabled={pendingAction !== null}
                onClick={() =>
                  void runAction(
                    `accept:${order.id}`,
                    `${order.reference} delivery accepted.`,
                    () => actions.acceptDelivery(order.id),
                  )
                }
                className={primaryButtonClass}
              >
                <CheckCircle2 aria-hidden="true" size={16} />{" "}
                {pendingAction === `accept:${order.id}` ? "Accepting…" : "Accept delivery"}
              </button>
              <button disabled={pendingAction !== null} onClick={() => setDisputeOrder(order)} className={secondaryButtonClass}>Report a problem</button>
            </>
          ) : null}
          <button className={secondaryButtonClass}><Download aria-hidden="true" size={16} /> Receipt</button>
        </div>
      </article>; })}</div>
      {buyerOrders.length === 0 ? <EmptyState title="No orders yet" description="Orders appear after operations prepares a consolidated offer for one of your demands." /> : null}
    </div>;
  } else if (section === "payments") {
    content = <div className="space-y-6">{pageHeader("Payments and receipts", "Provider references and reconciliation status for every commercial order.")}
      <div className="grid gap-4 md:grid-cols-3"><KpiCard label="Paid to date" value={formatFcfa(buyerPayments.filter((item) => item.status === "succeeded").reduce((sum, item) => sum + item.amount, 0))} icon={<CircleDollarSign size={19} />} tone="sage" /><KpiCard label="Transactions" value={buyerPayments.length} icon={<ReceiptText size={19} />} tone="cream" /><KpiCard label="Payment exceptions" value={buyerPayments.filter((item) => item.status === "failed").length} icon={<Banknote size={19} />} tone="orange" /></div>
      <div className="surface overflow-hidden"><div className="border-b border-[var(--line)] p-5"><h2 className="font-black">Transaction history</h2></div><div className="divide-y divide-[var(--line)]">{buyerPayments.map((payment) => { const order = buyerOrders.find((item) => item.id === payment.orderId); return <div key={payment.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"><span className="grid size-11 place-items-center rounded-xl bg-[var(--sage)] text-[var(--forest)]"><WalletCards size={19} /></span><div className="min-w-0 flex-1"><p className="font-black">{humanize(payment.provider)} · {order?.reference}</p><p className="mt-1 text-xs text-[var(--muted)]">{payment.transactionReference} · {formatDate(payment.initiatedAt)}</p></div><div className="sm:text-right"><p className="font-black">{formatFcfa(payment.amount)}</p><StatusBadge status={payment.status} /></div></div>; })}{buyerPayments.length === 0 ? <div className="p-8 text-center text-sm text-[var(--muted)]">No transactions have been recorded yet.</div> : null}</div></div>
    </div>;
  } else if (section === "notifications") {
    content = <div className="space-y-6">{pageHeader("Notification centre", "Order-critical updates remain available here even if an external message is delayed.")}
      <div className="surface divide-y divide-[var(--line)] overflow-hidden">{notifications.map((item) => <button key={item.id} type="button" disabled={pendingAction !== null} onClick={() => { if (!item.readAt) void runAction(`notification:${item.id}`, "Notification marked as read.", () => actions.markNotificationRead(item.id)); }} className={`flex w-full items-start gap-4 p-5 text-left disabled:cursor-wait disabled:opacity-70 ${item.readAt ? "bg-white" : "bg-[var(--sage)]/45"}`}><span className={`mt-0.5 grid size-10 flex-none place-items-center rounded-xl ${item.readAt ? "bg-[var(--cream)] text-[var(--muted)]" : "bg-[var(--forest)] text-white"}`}><Bell size={17} /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="font-black">{localise(item.title, locale)}</span>{!item.readAt ? <span className="size-2 rounded-full bg-[var(--orange)]" /> : null}</span><span className="mt-1 block text-sm leading-6 text-[var(--muted)]">{localise(item.message, locale)}</span><span className="mt-2 block text-xs font-semibold text-[var(--muted)]">{formatRelativeDate(item.createdAt)}</span></span><ChevronRight className="mt-2 flex-none text-[var(--muted)]" size={17} /></button>)}{notifications.length === 0 ? <div className="p-10 text-center text-sm text-[var(--muted)]">You are all caught up.</div> : null}</div>
    </div>;
  } else if (section === "profile") {
    content = <div className="space-y-6">{pageHeader("Business profile", "The verified identity and delivery details farmers and operations can trust.")}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"><section className="surface p-6"><div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-2xl bg-[var(--forest)] text-xl font-black text-white">{currentOrganisation?.shortName.slice(0, 2)}</span><div><h2 className="text-xl font-black">{currentOrganisation?.name}</h2><p className="mt-1 text-sm text-[var(--muted)]">{humanize(currentOrganisation?.buyerType ?? "business buyer")}</p></div><StatusBadge status={currentOrganisation?.verificationStatus ?? "pending"} /></div><div className="mt-7 grid gap-5 border-t border-[var(--line)] pt-6 sm:grid-cols-2"><div><p className="text-xs font-bold text-[var(--muted)]">Contact person</p><p className="mt-1 font-semibold">{currentOrganisation?.contactPerson}</p></div><div><p className="text-xs font-bold text-[var(--muted)]">Phone</p><p className="mt-1 font-semibold">{currentOrganisation?.phone}</p></div><div><p className="text-xs font-bold text-[var(--muted)]">Email</p><p className="mt-1 font-semibold">{currentOrganisation?.email}</p></div><div><p className="text-xs font-bold text-[var(--muted)]">Registration</p><p className="mt-1 font-semibold">{currentOrganisation?.registrationNumber ?? "On file"}</p></div></div></section><section className="surface p-6"><h2 className="flex items-center gap-2 font-black"><MapPin size={18} /> Saved locations</h2><div className="mt-4 space-y-3">{currentOrganisation?.addresses.map((address) => <div key={address.id} className="rounded-xl bg-[var(--cream)] p-4"><div className="flex items-center justify-between"><p className="text-sm font-black">{address.label}</p>{address.isDefault ? <span className="text-[10px] font-black uppercase text-[var(--forest)]">Default</span> : null}</div><p className="mt-1 text-xs leading-5 text-[var(--muted)]">{address.addressLine}, {address.locality}, {address.city}</p></div>)}</div></section></div>
    </div>;
  } else {
    content = <div className="space-y-6">
      {pageHeader(`Good morning, ${currentUser?.firstName ?? "buyer"}`, "Here is what needs your attention across today’s procurement.", <button onClick={() => openDemand()} className={primaryButtonClass}><Plus aria-hidden="true" size={17} /> Post a demand</button>)}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><KpiCard label="Open demands" value={buyerDemands.filter((item) => ["open", "matching", "allocating", "offered"].includes(item.status)).length} detail="Across all product lines" icon={<ShoppingBasket size={19} />} tone="sage" /><KpiCard label="Offers waiting" value={pendingOffers} detail="Ready for confirmation" icon={<FileText size={19} />} tone="orange" /><KpiCard label="Active orders" value={buyerOrders.filter((item) => ["confirmed", "ready_for_pickup", "in_transit", "delivered"].includes(item.status)).length} detail="Payment to acceptance" icon={<PackageCheck size={19} />} tone="cream" /><KpiCard label="Deliveries due" value={deliveriesDue} detail="Keep receiving ready" icon={<Truck size={19} />} tone="forest" /></div>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <section className="surface p-5 sm:p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Live order</p><h2 className="mt-2 text-xl font-black">{latestOrder?.reference ?? "No active order"}</h2></div>{latestOrder ? <StatusBadge status={latestOrder.status} /> : null}</div>{latestOrder ? <><p className="mt-4 text-sm text-[var(--muted)]">{state.orderItems.filter((item) => latestOrder.itemIds.includes(item.id)).map((item) => `${productFor(item.productId)?.name.en} · ${item.quantity} ${humanize(item.unit)}`).join("  •  ")}</p><BuyerOrderTimeline order={latestOrder} /><div className="mt-6 flex items-center justify-between rounded-2xl bg-[var(--cream)] p-4"><div><p className="text-xs font-bold text-[var(--muted)]">Order total</p><p className="mt-1 text-xl font-black text-[var(--forest)]">{formatFcfa(latestOrder.total)}</p></div><Link href="/buyer/orders" className={secondaryButtonClass}>View order <ArrowRight size={15} /></Link></div></> : <p className="mt-5 text-sm text-[var(--muted)]">Post a demand to start sourcing your next delivery.</p>}</section>
        <section className="overflow-hidden rounded-[1.25rem] bg-[var(--forest)] p-6 text-white shadow-[var(--shadow-sm)]"><span className="grid size-11 place-items-center rounded-xl bg-[var(--lime)] text-[var(--forest)]"><Clock3 size={20} /></span><p className="eyebrow mt-6 !text-[var(--lime)]">Procurement shortcut</p><h2 className="font-display mt-2 text-2xl font-semibold">Need several products for one date?</h2><p className="mt-3 text-sm leading-6 text-white/66">Post one multi-item request. Operations combines verified farmer supply into one offer and delivery.</p><button onClick={() => openDemand()} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--lime)] px-5 text-sm font-black text-[var(--forest)]">Build a request <ArrowRight size={16} /></button></section>
      </div>
      <section><div className="mb-4 flex items-end justify-between"><div><p className="eyebrow">Available now</p><h2 className="font-display mt-2 text-2xl font-semibold text-[var(--forest)]">Fresh from verified suppliers</h2></div><Link href="/buyer/marketplace" className="text-sm font-black text-[var(--forest)]">View all</Link></div><div className="grid gap-4 md:grid-cols-3">{state.listings.filter((item) => item.status === "active").slice(0, 3).map((listing) => { const product = productFor(listing.productId); return <button key={listing.id} onClick={() => openDemand(listing.productId)} className="surface flex items-center gap-4 p-4 text-left transition-transform hover:-translate-y-0.5"><ProductMark name={product?.name.en ?? "Produce"} accent={product?.accent} /><span className="min-w-0 flex-1"><span className="block truncate font-black">{product?.name.en}</span><span className="mt-1 block text-xs text-[var(--muted)]">{listing.availableQuantity} {humanize(listing.unit)} · {formatFcfa(listing.unitPrice)}/{humanize(listing.unit)}</span></span><ChevronRight className="text-[var(--muted)]" size={17} /></button>; })}</div></section>
    </div>;
  }

  return (
    <>
      {actionNotice ? (
        <div
          role="status"
          className={`mb-5 rounded-xl p-3 text-sm font-semibold ${
            actionNotice.kind === "success"
              ? "bg-[var(--sage)] text-[var(--forest)]"
              : "bg-red-50 text-red-700"
          }`}
        >
          {actionNotice.message}
        </div>
      ) : null}
      {content}
      <Modal open={demandOpen} onClose={() => setDemandOpen(false)} title="Post a buyer demand" description="Farmers may quote partial quantities; operations will consolidate the offer." width="max-w-4xl"><DemandForm onClose={() => setDemandOpen(false)} initialProductId={initialProduct} /></Modal>
      <Modal open={Boolean(paymentOrder)} onClose={() => setPaymentOrder(undefined)} title="Confirm payment" description="Use a licensed external provider or verified business transfer.">{paymentOrder ? <PaymentForm order={paymentOrder} onClose={() => setPaymentOrder(undefined)} /> : null}</Modal>
      <Modal open={Boolean(disputeOrder)} onClose={() => setDisputeOrder(undefined)} title="Report a delivery problem" description="Support will review the complete order, shipment, and evidence record.">{disputeOrder ? <DisputeForm order={disputeOrder} onClose={() => setDisputeOrder(undefined)} /> : null}</Modal>
    </>
  );
}
