import type {
  CommercialUnit,
  DashboardMetrics,
  DomainState,
  Product,
  ProduceGrade,
} from "../../lib/domain";
import type {
  CopilotContext,
  CopilotDraft,
  CopilotLocale,
  CopilotRole,
} from "../../lib/ai/copilot-contract";

const MAX_CATALOG_ITEMS = 24;
const MAX_HIGHLIGHTS = 8;
const MAX_HIGHLIGHT_LENGTH = 180;

const metricKeys: Record<CopilotRole, Array<keyof DashboardMetrics>> = {
  buyer: [
    "openDemands",
    "confirmedOrders",
    "totalOrders",
    "liveListings",
    "availableSupplyValue",
    "deliveriesDue",
    "unreadNotifications",
  ],
  farmer: [
    "openDemands",
    "confirmedOrders",
    "liveListings",
    "pickupsDue",
    "deliveriesDue",
    "unreadNotifications",
  ],
  operations: [
    "gmv",
    "totalOrders",
    "averageOrderValue",
    "successfulDeliveryRate",
    "cancellationRate",
    "disputeRate",
    "activeFarmers",
    "activeBuyers",
    "repeatBuyers",
    "openDemands",
    "unallocatedDemandItems",
    "confirmedOrders",
    "pickupsDue",
    "deliveriesDue",
    "paymentExceptions",
    "openDisputes",
    "liveListings",
    "availableSupplyValue",
  ],
};

function cleanText(value: string, maximum: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maximum);
}

function productName(product: Product | undefined, locale: CopilotLocale) {
  if (!product) return locale === "fr" ? "Produit inconnu" : "Unknown product";
  return cleanText(product.name[locale] || product.name.en, 120);
}

function statusSummary<T>(
  values: T[],
  status: (value: T) => string,
  label: string,
) {
  const counts = values.reduce<Record<string, number>>((result, value) => {
    const key = cleanText(status(value), 40);
    result[key] = (result[key] ?? 0) + 1;
    return result;
  }, {});
  const breakdown = Object.entries(counts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, count]) => `${key}: ${count}`)
    .join(", ");
  return breakdown ? `${label}: ${breakdown}.` : `${label}: none.`;
}

function buildBuyerHighlights(
  state: DomainState,
  locale: CopilotLocale,
  organisationId?: string,
) {
  const productById = new Map(state.products.map((product) => [product.id, product]));
  const ownDemands = state.demands
    .filter((demand) => !organisationId || demand.buyerOrganisationId === organisationId)
    .slice(0, 3)
    .map((demand) => {
      const items = state.demandItems
        .filter((item) => item.demandId === demand.id)
        .slice(0, 3)
        .map(
          (item) =>
            `${productName(productById.get(item.productId), locale)} ${item.quantity} ${item.unit}`,
        )
        .join(", ");
      return locale === "fr"
        ? `Demande ${demand.status}, livraison ${demand.requiredDeliveryDate}: ${items || "aucun article"}.`
        : `${demand.status} demand due ${demand.requiredDeliveryDate}: ${items || "no items"}.`;
    });
  const liveSupply = state.listings
    .filter((listing) => listing.status === "active")
    .slice(0, 4)
    .map((listing) => {
      const available = Math.max(0, listing.availableQuantity - listing.reservedQuantity);
      return locale === "fr"
        ? `Offre disponible: ${productName(productById.get(listing.productId), locale)}, ${available} ${listing.unit}, qualité ${listing.grade}, jusqu'au ${listing.availableUntil}.`
        : `Available supply: ${productName(productById.get(listing.productId), locale)}, ${available} ${listing.unit}, ${listing.grade}, through ${listing.availableUntil}.`;
    });
  return [...ownDemands, ...liveSupply];
}

function buildFarmerHighlights(
  state: DomainState,
  locale: CopilotLocale,
  organisationId?: string,
) {
  const productById = new Map(state.products.map((product) => [product.id, product]));
  const ownListings = state.listings
    .filter((listing) => !organisationId || listing.farmerOrganisationId === organisationId)
    .slice(0, 4)
    .map((listing) => {
      const available = Math.max(0, listing.availableQuantity - listing.reservedQuantity);
      return locale === "fr"
        ? `Votre offre ${listing.status}: ${productName(productById.get(listing.productId), locale)}, ${available} ${listing.unit} disponibles, qualité ${listing.grade}, jusqu'au ${listing.availableUntil}.`
        : `Your ${listing.status} listing: ${productName(productById.get(listing.productId), locale)}, ${available} ${listing.unit} available, ${listing.grade}, through ${listing.availableUntil}.`;
    });
  const openDemandIds = new Set(
    state.demands
      .filter((demand) => ["open", "matching", "allocating"].includes(demand.status))
      .map((demand) => demand.id),
  );
  const buyerNeeds = state.demandItems
    .filter((item) => openDemandIds.has(item.demandId))
    .slice(0, 4)
    .map((item) => {
      const demand = state.demands.find((candidate) => candidate.id === item.demandId);
      return locale === "fr"
        ? `Besoin acheteur: ${productName(productById.get(item.productId), locale)}, ${item.quantity} ${item.unit}, qualité ${item.grade}, livraison ${demand?.requiredDeliveryDate ?? "à confirmer"}.`
        : `Buyer need: ${productName(productById.get(item.productId), locale)}, ${item.quantity} ${item.unit}, ${item.grade}, due ${demand?.requiredDeliveryDate ?? "to be confirmed"}.`;
    });
  return [...ownListings, ...buyerNeeds];
}

function buildOperationsHighlights(state: DomainState, locale: CopilotLocale) {
  const productById = new Map(state.products.map((product) => [product.id, product]));
  const openDemandIds = new Set(
    state.demands
      .filter((demand) => ["open", "matching", "allocating", "offered"].includes(demand.status))
      .map((demand) => demand.id),
  );
  const shortages = state.demandItems
    .filter((item) => openDemandIds.has(item.demandId))
    .map((item) => {
      const allocated = state.allocations
        .filter(
          (allocation) =>
            allocation.demandItemId === item.id && allocation.status !== "cancelled",
        )
        .reduce((total, allocation) => total + allocation.quantity, 0);
      return { item, remaining: Math.max(0, item.quantity - allocated) };
    })
    .filter(({ remaining }) => remaining > 0)
    .slice(0, 3)
    .map(({ item, remaining }) => {
      const demand = state.demands.find((candidate) => candidate.id === item.demandId);
      return locale === "fr"
        ? `Demande non allouée: ${productName(productById.get(item.productId), locale)}, ${remaining} ${item.unit} restantes, livraison ${demand?.requiredDeliveryDate ?? "à confirmer"}.`
        : `Unallocated demand: ${productName(productById.get(item.productId), locale)}, ${remaining} ${item.unit} remaining, due ${demand?.requiredDeliveryDate ?? "to be confirmed"}.`;
    });
  const labels =
    locale === "fr"
      ? ["Commandes", "Expéditions", "Paiements", "Litiges"]
      : ["Orders", "Shipments", "Payments", "Disputes"];
  return [
    statusSummary(state.orders, (order) => order.status, labels[0]),
    statusSummary(state.shipments, (shipment) => shipment.status, labels[1]),
    statusSummary(state.payments, (payment) => payment.status, labels[2]),
    statusSummary(state.disputes, (dispute) => dispute.status, labels[3]),
    ...shortages,
  ];
}

export function buildCopilotContext({
  state,
  metrics,
  role,
  locale,
  section,
  organisationId,
}: {
  state: DomainState;
  metrics: DashboardMetrics;
  role: CopilotRole;
  locale: CopilotLocale;
  section: string;
  organisationId?: string;
}): CopilotContext {
  const highlights =
    role === "buyer"
      ? buildBuyerHighlights(state, locale, organisationId)
      : role === "farmer"
        ? buildFarmerHighlights(state, locale, organisationId)
        : buildOperationsHighlights(state, locale);

  return {
    section: cleanText(section, 80) || "dashboard",
    organisationName:
      locale === "fr"
        ? `Organisation ${role === "buyer" ? "acheteuse" : role === "farmer" ? "agricole" : "de la plateforme"} actuelle`
        : `Current ${role} organisation`,
    currentDate: new Date().toISOString().slice(0, 10),
    metrics: Object.fromEntries(
      metricKeys[role].map((key) => [
        key,
        Number.isFinite(metrics[key])
          ? Math.max(-1_000_000_000, Math.min(1_000_000_000, metrics[key]))
          : 0,
      ]),
    ),
    highlights: highlights
      .map((highlight) => cleanText(highlight, MAX_HIGHLIGHT_LENGTH))
      .filter(Boolean)
      .slice(0, MAX_HIGHLIGHTS),
    catalog: state.products
      .filter((product) => product.active)
      .slice(0, MAX_CATALOG_ITEMS)
      .map((product) => ({
        id: cleanText(product.id, 80),
        name: productName(product, locale),
        defaultUnit: product.defaultUnit,
        allowedUnits: [...product.allowedUnits],
        grades: [...product.grades],
      })),
  };
}

export type DraftIssue =
  | "role_mismatch"
  | "product_missing"
  | "quantity_invalid"
  | "unit_invalid"
  | "grade_invalid"
  | "date_invalid"
  | "date_past"
  | "title_invalid"
  | "price_invalid";

export interface DraftValidation {
  valid: boolean;
  issues: DraftIssue[];
  product?: Product;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateCopilotDraft({
  draft,
  products,
  role,
  currentDate,
}: {
  draft: CopilotDraft;
  products: Product[];
  role: CopilotRole;
  currentDate: string;
}): DraftValidation {
  const issues: DraftIssue[] = [];
  const expectedRole = draft.kind === "demand" ? "buyer" : draft.kind === "listing" ? "farmer" : null;
  if (!expectedRole || role !== expectedRole) issues.push("role_mismatch");

  const product = products.find(
    (candidate) => candidate.id === draft.productId && candidate.active,
  );
  if (!product) issues.push("product_missing");
  if (
    draft.quantity === null ||
    !Number.isFinite(draft.quantity) ||
    draft.quantity <= 0 ||
    draft.quantity > 1_000_000
  ) {
    issues.push("quantity_invalid");
  }
  if (!product || !draft.unit || !product.allowedUnits.includes(draft.unit)) {
    issues.push("unit_invalid");
  }
  if (!product || !draft.grade || !product.grades.includes(draft.grade)) {
    issues.push("grade_invalid");
  }
  if (!draft.date || !isValidDate(draft.date)) {
    issues.push("date_invalid");
  } else if (draft.date < currentDate) {
    issues.push("date_past");
  }
  if (draft.kind === "demand" && (!draft.title || draft.title.trim().length < 3)) {
    issues.push("title_invalid");
  }
  if (
    draft.kind === "listing" &&
    (draft.priceFcfa === null ||
      !Number.isInteger(draft.priceFcfa) ||
      draft.priceFcfa <= 0 ||
      draft.priceFcfa > 1_000_000_000)
  ) {
    issues.push("price_invalid");
  }

  return { valid: issues.length === 0, issues, product };
}

export function addDays(date: string, numberOfDays: number) {
  const result = new Date(`${date}T00:00:00.000Z`);
  result.setUTCDate(result.getUTCDate() + numberOfDays);
  return result.toISOString().slice(0, 10);
}

export function formatDraftUnit(unit: CommercialUnit | null) {
  return unit?.replaceAll("_", " ") ?? "—";
}

export function formatDraftGrade(grade: ProduceGrade | null) {
  return grade?.replaceAll("_", " ") ?? "—";
}
