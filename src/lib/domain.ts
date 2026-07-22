export type UUID = string;
export type ISODateTime = string;
export type ISODate = string;
export type Currency = "XAF";
export type Locale = "en" | "fr";

export type UserRole =
  | "farmer"
  | "buyer"
  | "operations"
  | "support"
  | "admin"
  | "transporter";

export type AccountStatus = "pending" | "active" | "suspended" | "rejected";
export type VerificationStatus = "pending" | "verified" | "rejected" | "suspended";
export type OrganisationType =
  | "farmer"
  | "cooperative"
  | "buyer"
  | "platform"
  | "logistics";
export type BuyerType =
  | "restaurant"
  | "hotel"
  | "retailer"
  | "caterer"
  | "wholesaler"
  | "mini_market"
  | "processor";

export type ProductCategory =
  | "fruit"
  | "vegetable"
  | "tuber"
  | "cereal"
  | "legume"
  | "spice";
export type CommercialUnit =
  | "kg"
  | "tonne"
  | "bag_50kg"
  | "crate"
  | "basket"
  | "bunch"
  | "tray";
export type ProduceGrade = "premium" | "grade_a" | "grade_b" | "standard";

export type ListingStatus = "draft" | "active" | "paused" | "sold" | "unavailable" | "closed";
export type DemandStatus =
  | "draft"
  | "open"
  | "matching"
  | "allocating"
  | "offered"
  | "fulfilled"
  | "cancelled"
  | "expired";
export type QuoteStatus = "submitted" | "shortlisted" | "accepted" | "declined" | "withdrawn";
export type OrderStatus =
  | "draft"
  | "requested"
  | "quoted"
  | "confirmed"
  | "ready_for_pickup"
  | "in_transit"
  | "delivered"
  | "accepted"
  | "completed"
  | "disputed"
  | "cancelled"
  | "refunded";
export type AllocationStatus =
  | "proposed"
  | "confirmed"
  | "ready_for_pickup"
  | "picked_up"
  | "delivered"
  | "cancelled";
export type PaymentProvider = "mtn_momo" | "orange_money" | "bank_transfer";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "partially_refunded"
  | "refunded";
export type ShipmentStatus =
  | "planned"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "delivered"
  | "exception"
  | "failed";
export type NotificationChannel = "in_app" | "sms" | "whatsapp" | "email";
export type NotificationType =
  | "verification"
  | "demand_match"
  | "quote"
  | "offer"
  | "order"
  | "payment"
  | "pickup"
  | "delivery"
  | "dispute"
  | "cancellation"
  | "system";
export type NotificationStatus = "queued" | "sent" | "delivered" | "failed" | "read";
export type DisputeReason =
  | "quality"
  | "quantity_shortage"
  | "late_delivery"
  | "damaged_goods"
  | "wrong_product"
  | "payment"
  | "other";
export type RequestedResolution = "replacement" | "partial_refund" | "full_refund" | "credit" | "other";
export type DisputeStatus = "open" | "under_review" | "resolved" | "partially_resolved" | "rejected";

export interface LocalisedText {
  en: string;
  fr: string;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface Address {
  id: UUID;
  label: string;
  kind: "farm" | "pickup" | "delivery" | "billing";
  addressLine: string;
  locality: string;
  city: string;
  region: string;
  countryCode: "CM";
  coordinates?: GeoPoint;
  instructions?: string;
  isDefault?: boolean;
}

export interface User {
  id: UUID;
  firstName: string;
  lastName: string;
  displayName: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  roles: UserRole[];
  primaryRole: UserRole;
  organisationIds: UUID[];
  locale: Locale;
  status: AccountStatus;
  lastActiveAt: ISODateTime;
  createdAt: ISODateTime;
}

export interface OrganisationPerformance {
  completedOrders: number;
  cancellationRate: number;
  averageRating: number | null;
  onTimeDeliveryRate: number | null;
}

export interface Organisation {
  id: UUID;
  slug: string;
  name: string;
  shortName: string;
  type: OrganisationType;
  buyerType?: BuyerType;
  description: LocalisedText;
  contactPerson: string;
  phone: string;
  email?: string;
  registrationNumber?: string;
  produceCategoryIds: UUID[];
  memberUserIds: UUID[];
  addresses: Address[];
  preferredPaymentProvider?: PaymentProvider;
  maskedPaymentAccount?: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: ISODateTime;
  verifiedBy?: UUID;
  verificationNotes?: string;
  performance: OrganisationPerformance;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** American-English alias for integrations that use the document's entity name. */
export type Organization = Organisation;

export interface Product {
  id: UUID;
  slug: string;
  name: LocalisedText;
  description: LocalisedText;
  category: ProductCategory;
  defaultUnit: CommercialUnit;
  allowedUnits: CommercialUnit[];
  grades: ProduceGrade[];
  imageUrl: string;
  accent: string;
  seasonMonths: number[];
  active: boolean;
}

export interface SupplyListing {
  id: UUID;
  reference: string;
  farmerOrganisationId: UUID;
  createdBy: UUID;
  productId: UUID;
  availableQuantity: number;
  reservedQuantity: number;
  unit: CommercialUnit;
  unitPrice: number;
  minOrderQuantity: number;
  grade: ProduceGrade;
  location: Address;
  availableFrom: ISODate;
  availableUntil: ISODate;
  imageUrls: string[];
  notes?: string;
  status: ListingStatus;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DemandRequest {
  id: UUID;
  reference: string;
  buyerOrganisationId: UUID;
  createdBy: UUID;
  title: string;
  deliveryAddress: Address;
  requiredDeliveryDate: ISODate;
  itemIds: UUID[];
  recurring: boolean;
  recurrenceNote?: string;
  status: DemandStatus;
  notes?: string;
  submittedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface DemandItem {
  id: UUID;
  demandId: UUID;
  productId: UUID;
  quantity: number;
  unit: CommercialUnit;
  grade: ProduceGrade;
  targetUnitPrice?: number;
  notes?: string;
}

export interface Quote {
  id: UUID;
  reference: string;
  demandItemId: UUID;
  farmerOrganisationId: UUID;
  submittedBy: UUID;
  sourceListingId?: UUID;
  availableQuantity: number;
  unit: CommercialUnit;
  unitPrice: number;
  availableDate: ISODate;
  notes?: string;
  status: QuoteStatus;
  submittedAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OrderItem {
  id: UUID;
  orderId: UUID;
  demandItemId?: UUID;
  productId: UUID;
  quantity: number;
  allocatedQuantity: number;
  unit: CommercialUnit;
  grade: ProduceGrade;
  unitPrice: number;
  lineTotal: number;
}

export interface Order {
  id: UUID;
  reference: string;
  demandId?: UUID;
  buyerOrganisationId: UUID;
  createdBy: UUID;
  itemIds: UUID[];
  allocationIds: UUID[];
  deliveryAddress: Address;
  deliveryDate: ISODate;
  status: OrderStatus;
  subtotal: number;
  serviceFee: number;
  deliveryFee: number;
  total: number;
  currency: Currency;
  paymentStatus: PaymentStatus;
  shipmentStatus?: ShipmentStatus;
  buyerNote?: string;
  operationsNote?: string;
  quotedAt?: ISODateTime;
  confirmedAt?: ISODateTime;
  deliveredAt?: ISODateTime;
  acceptedAt?: ISODateTime;
  completedAt?: ISODateTime;
  cancelledAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface FulfilmentAllocation {
  id: UUID;
  demandId: UUID;
  demandItemId: UUID;
  orderId?: UUID;
  orderItemId?: UUID;
  quoteId?: UUID;
  sourceListingId?: UUID;
  farmerOrganisationId: UUID;
  quantity: number;
  unit: CommercialUnit;
  farmerUnitPrice: number;
  farmerTotal: number;
  status: AllocationStatus;
  pickupAddress: Address;
  pickupWindow?: string;
  farmerNote?: string;
  operationsNote?: string;
  createdBy: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** American-English alias for API consumers. */
export type FulfillmentAllocation = FulfilmentAllocation;

export interface PaymentTransaction {
  id: UUID;
  orderId: UUID;
  provider: PaymentProvider;
  transactionReference: string;
  amount: number;
  currency: Currency;
  status: PaymentStatus;
  payerMaskedAccount?: string;
  providerEventId?: string;
  failureReason?: string;
  verifiedBy?: UUID;
  verifiedAt?: ISODateTime;
  initiatedAt: ISODateTime;
  completedAt?: ISODateTime;
  updatedAt: ISODateTime;
}

export interface ShipmentStop {
  id: UUID;
  allocationId?: UUID;
  address: Address;
  contactName: string;
  contactPhone: string;
  plannedAt?: ISODateTime;
  completedAt?: ISODateTime;
  proofUrl?: string;
  status: "pending" | "completed" | "missed";
}

export interface Shipment {
  id: UUID;
  reference: string;
  orderId: UUID;
  providerOrganisationId?: UUID;
  transporterName: string;
  transporterPhone: string;
  vehicleDetails?: string;
  driverName?: string;
  pickupStops: ShipmentStop[];
  deliveryAddress: Address;
  plannedPickupAt?: ISODateTime;
  expectedDeliveryAt?: ISODateTime;
  status: ShipmentStatus;
  exceptionNote?: string;
  deliveredAt?: ISODateTime;
  createdBy: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Notification {
  id: UUID;
  recipientUserId: UUID;
  type: NotificationType;
  title: LocalisedText;
  message: LocalisedText;
  channels: NotificationChannel[];
  status: NotificationStatus;
  entityType?: "organisation" | "listing" | "demand" | "quote" | "order" | "payment" | "shipment" | "dispute";
  entityId?: UUID;
  deduplicationKey: string;
  readAt?: ISODateTime;
  createdAt: ISODateTime;
}

export interface DisputeEvidence {
  id: UUID;
  kind: "photo" | "document" | "note";
  url?: string;
  description: string;
  addedBy: UUID;
  createdAt: ISODateTime;
}

export interface Dispute {
  id: UUID;
  reference: string;
  orderId: UUID;
  openedBy: UUID;
  reason: DisputeReason;
  description: string;
  affectedOrderItemIds: UUID[];
  affectedQuantity?: number;
  requestedResolution: RequestedResolution;
  status: DisputeStatus;
  evidence: DisputeEvidence[];
  assignedTo?: UUID;
  investigationNote?: string;
  resolution?: string;
  financialAdjustment: number;
  resolvedBy?: UUID;
  resolvedAt?: ISODateTime;
  openedAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type AuditAction =
  | "session.role_switched"
  | "session.locale_changed"
  | "demo.reset"
  | "listing.created"
  | "demand.created"
  | "quote.submitted"
  | "allocation.created"
  | "offer.created"
  | "order.confirmed"
  | "payment.confirmed"
  | "shipment.advanced"
  | "delivery.accepted"
  | "dispute.opened"
  | "dispute.resolved"
  | "organisation.verification_changed"
  | "notification.read";

export interface AuditLog {
  id: UUID;
  actorUserId: UUID;
  actorRole: UserRole;
  action: AuditAction;
  targetType:
    | "session"
    | "demo"
    | "organisation"
    | "listing"
    | "demand"
    | "quote"
    | "allocation"
    | "order"
    | "payment"
    | "shipment"
    | "notification"
    | "dispute";
  targetId: UUID;
  summary: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: ISODateTime;
}

export interface DomainState {
  schemaVersion: 1;
  activeUserId: UUID;
  activeRole: UserRole;
  locale: Locale;
  users: User[];
  organisations: Organisation[];
  products: Product[];
  listings: SupplyListing[];
  demands: DemandRequest[];
  demandItems: DemandItem[];
  quotes: Quote[];
  orders: Order[];
  orderItems: OrderItem[];
  allocations: FulfilmentAllocation[];
  payments: PaymentTransaction[];
  shipments: Shipment[];
  notifications: Notification[];
  disputes: Dispute[];
  audits: AuditLog[];
  updatedAt: ISODateTime;
}

export interface CreateListingInput {
  farmerOrganisationId?: UUID;
  productId: UUID;
  availableQuantity: number;
  unit: CommercialUnit;
  unitPrice: number;
  minOrderQuantity?: number;
  grade: ProduceGrade;
  location?: Address;
  availableFrom: ISODate;
  availableUntil: ISODate;
  imageUrls?: string[];
  notes?: string;
  status?: "draft" | "active";
}

export interface CreateDemandItemInput {
  productId: UUID;
  quantity: number;
  unit: CommercialUnit;
  grade: ProduceGrade;
  targetUnitPrice?: number;
  notes?: string;
}

export interface CreateDemandInput {
  buyerOrganisationId?: UUID;
  title: string;
  deliveryAddress?: Address;
  requiredDeliveryDate: ISODate;
  items: CreateDemandItemInput[];
  recurring?: boolean;
  recurrenceNote?: string;
  notes?: string;
  submit?: boolean;
}

export interface SubmitQuoteInput {
  demandItemId: UUID;
  farmerOrganisationId?: UUID;
  sourceListingId?: UUID;
  availableQuantity: number;
  unitPrice: number;
  availableDate: ISODate;
  notes?: string;
}

export interface CreateAllocationInput {
  demandItemId: UUID;
  quoteId?: UUID;
  sourceListingId?: UUID;
  farmerOrganisationId?: UUID;
  quantity: number;
  farmerUnitPrice?: number;
  pickupAddress?: Address;
  pickupWindow?: string;
  operationsNote?: string;
}

export interface CreateOfferInput {
  demandId: UUID;
  allocationIds?: UUID[];
  itemUnitPrices?: Record<UUID, number>;
  deliveryFee?: number;
  serviceFeeRate?: number;
  operationsNote?: string;
}

export interface ConfirmPaymentInput {
  orderId: UUID;
  provider: PaymentProvider;
  transactionReference: string;
  amount?: number;
  payerMaskedAccount?: string;
}

export interface OpenDisputeInput {
  orderId: UUID;
  reason: DisputeReason;
  description: string;
  affectedOrderItemIds?: UUID[];
  affectedQuantity?: number;
  requestedResolution: RequestedResolution;
  evidence?: Array<Pick<DisputeEvidence, "kind" | "url" | "description">>;
}

export interface ResolveDisputeInput {
  disputeId: UUID;
  status: Extract<DisputeStatus, "resolved" | "partially_resolved" | "rejected">;
  resolution: string;
  investigationNote?: string;
  financialAdjustment?: number;
  refundPayment?: boolean;
}

export interface VerifyOrganisationInput {
  organisationId: UUID;
  status: VerificationStatus;
  notes?: string;
}

export interface DashboardMetrics {
  gmv: number;
  totalOrders: number;
  averageOrderValue: number;
  successfulDeliveryRate: number;
  cancellationRate: number;
  disputeRate: number;
  activeFarmers: number;
  activeBuyers: number;
  repeatBuyers: number;
  openDemands: number;
  unallocatedDemandItems: number;
  confirmedOrders: number;
  pickupsDue: number;
  deliveriesDue: number;
  paymentExceptions: number;
  openDisputes: number;
  unreadNotifications: number;
  liveListings: number;
  availableSupplyValue: number;
}

const roundPercent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

const isCommercialOrder = (order: Order) =>
  !["draft", "requested", "quoted", "cancelled"].includes(order.status);

export function deriveDashboardMetrics(
  state: DomainState,
  userId: UUID = state.activeUserId,
): DashboardMetrics {
  const commercialOrders = state.orders.filter(isCommercialOrder);
  const grossOrders = commercialOrders.filter(
    (order) => order.paymentStatus === "succeeded" || order.paymentStatus === "partially_refunded",
  );
  const deliveryOutcomes = state.shipments.filter((shipment) =>
    ["delivered", "exception", "failed"].includes(shipment.status),
  );
  const successfulDeliveries = deliveryOutcomes.filter((shipment) => shipment.status === "delivered");
  const cancelledOrders = state.orders.filter((order) => order.status === "cancelled");
  const ordersWithDisputes = new Set(state.disputes.map((dispute) => dispute.orderId));
  const activeOrderStatuses: OrderStatus[] = [
    "confirmed",
    "ready_for_pickup",
    "in_transit",
    "delivered",
    "accepted",
  ];
  const activeDemandStatuses: DemandStatus[] = ["open", "matching", "allocating", "offered"];
  const openDemandIds = new Set(
    state.demands.filter((demand) => activeDemandStatuses.includes(demand.status)).map((demand) => demand.id),
  );
  const unallocatedDemandItems = state.demandItems.filter((item) => {
    if (!openDemandIds.has(item.demandId)) return false;
    const allocated = state.allocations
      .filter((allocation) => allocation.demandItemId === item.id && allocation.status !== "cancelled")
      .reduce((sum, allocation) => sum + allocation.quantity, 0);
    return allocated < item.quantity;
  }).length;
  const activeBuyerIds = new Set(
    [...state.demands, ...state.orders]
      .filter((entity) => "status" in entity && entity.status !== "cancelled")
      .map((entity) =>
        "buyerOrganisationId" in entity ? entity.buyerOrganisationId : "",
      )
      .filter(Boolean),
  );
  const activeFarmerIds = new Set([
    ...state.listings.filter((listing) => listing.status === "active").map((listing) => listing.farmerOrganisationId),
    ...state.allocations.filter((allocation) => allocation.status !== "cancelled").map((allocation) => allocation.farmerOrganisationId),
  ]);
  const ordersPerBuyer = commercialOrders.reduce<Record<UUID, number>>((counts, order) => {
    counts[order.buyerOrganisationId] = (counts[order.buyerOrganisationId] ?? 0) + 1;
    return counts;
  }, {});
  const activeUserNotifications = state.notifications.filter(
    (notification) => notification.recipientUserId === userId,
  );

  return {
    gmv: grossOrders.reduce((sum, order) => sum + order.total, 0),
    totalOrders: state.orders.length,
    averageOrderValue:
      commercialOrders.length === 0
        ? 0
        : Math.round(
            commercialOrders.reduce((sum, order) => sum + order.total, 0) / commercialOrders.length,
          ),
    successfulDeliveryRate: roundPercent(successfulDeliveries.length, deliveryOutcomes.length),
    cancellationRate: roundPercent(cancelledOrders.length, state.orders.length),
    disputeRate: roundPercent(ordersWithDisputes.size, commercialOrders.length),
    activeFarmers: state.organisations.filter(
      (organisation) =>
        (organisation.type === "farmer" || organisation.type === "cooperative") &&
        organisation.verificationStatus === "verified" &&
        activeFarmerIds.has(organisation.id),
    ).length,
    activeBuyers: state.organisations.filter(
      (organisation) =>
        organisation.type === "buyer" &&
        organisation.verificationStatus === "verified" &&
        activeBuyerIds.has(organisation.id),
    ).length,
    repeatBuyers: Object.values(ordersPerBuyer).filter((count) => count >= 2).length,
    openDemands: state.demands.filter((demand) => activeDemandStatuses.includes(demand.status)).length,
    unallocatedDemandItems,
    confirmedOrders: state.orders.filter((order) => activeOrderStatuses.includes(order.status)).length,
    pickupsDue: state.shipments.filter((shipment) =>
      ["planned", "pickup_scheduled"].includes(shipment.status),
    ).length,
    deliveriesDue: state.shipments.filter((shipment) =>
      ["picked_up", "in_transit"].includes(shipment.status),
    ).length,
    paymentExceptions: state.payments.filter((payment) => payment.status === "failed").length,
    openDisputes: state.disputes.filter((dispute) =>
      ["open", "under_review"].includes(dispute.status),
    ).length,
    unreadNotifications: activeUserNotifications.filter((notification) => !notification.readAt).length,
    liveListings: state.listings.filter((listing) => listing.status === "active").length,
    availableSupplyValue: state.listings
      .filter((listing) => listing.status === "active")
      .reduce(
        (sum, listing) =>
          sum + Math.max(0, listing.availableQuantity - listing.reservedQuantity) * listing.unitPrice,
        0,
      ),
  };
}

export function localise(text: LocalisedText, locale: Locale): string {
  return text[locale];
}

export function formatFcfa(amount: number, locale: Locale = "en"): string {
  const formatted = new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${formatted} FCFA`;
}

export function isRole(value: unknown): value is UserRole {
  return ["farmer", "buyer", "operations", "support", "admin", "transporter"].includes(
    value as UserRole,
  );
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}
