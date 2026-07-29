import "server-only";

import { z } from "zod";

import type { DomainState } from "@/lib/domain";

const uuid = z.string().uuid();
const isoDate = z.iso.date();
const isoDateTime = z.iso.datetime({ offset: true });
const POSTGRES_INT_MAX = 2_147_483_647;
const nonNegativeNumber = z.number().finite().nonnegative();
const positiveNumber = z.number().finite().positive();
const nonNegativeInteger = z
  .number()
  .int()
  .min(0)
  .max(POSTGRES_INT_MAX);
const money = nonNegativeInteger;
const positiveMoney = z
  .number()
  .int()
  .min(1)
  .max(POSTGRES_INT_MAX);

const userRole = z.enum([
  "farmer",
  "buyer",
  "operations",
  "support",
  "admin",
  "transporter",
]);
const locale = z.enum(["en", "fr"]);
const commercialUnit = z.enum([
  "kg",
  "tonne",
  "bag_50kg",
  "crate",
  "basket",
  "bunch",
  "tray",
]);
const produceGrade = z.enum(["premium", "grade_a", "grade_b", "standard"]);
const paymentProvider = z.enum(["mtn_momo", "orange_money", "bank_transfer"]);
const paymentStatus = z.enum([
  "pending",
  "processing",
  "succeeded",
  "failed",
  "partially_refunded",
  "refunded",
]);
const shipmentStatus = z.enum([
  "planned",
  "pickup_scheduled",
  "picked_up",
  "in_transit",
  "delivered",
  "exception",
  "failed",
]);

const localisedText = z.strictObject({
  en: z.string(),
  fr: z.string(),
});

const address = z.strictObject({
  id: uuid,
  label: z.string(),
  kind: z.enum(["farm", "pickup", "delivery", "billing"]),
  addressLine: z.string(),
  locality: z.string(),
  city: z.string(),
  region: z.string(),
  countryCode: z.literal("CM"),
  coordinates: z
    .strictObject({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
    })
    .optional(),
  instructions: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const user = z.strictObject({
  id: uuid,
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  avatarUrl: z.string().optional(),
  roles: z.array(userRole).min(1),
  primaryRole: userRole,
  organisationIds: z.array(uuid),
  locale,
  status: z.enum(["pending", "active", "suspended", "rejected"]),
  lastActiveAt: isoDateTime,
  createdAt: isoDateTime,
});

const organisation = z.strictObject({
  id: uuid,
  slug: z.string(),
  name: z.string(),
  shortName: z.string(),
  type: z.enum(["farmer", "cooperative", "buyer", "platform", "logistics"]),
  buyerType: z
    .enum([
      "restaurant",
      "hotel",
      "retailer",
      "caterer",
      "wholesaler",
      "mini_market",
      "processor",
    ])
    .optional(),
  description: localisedText,
  contactPerson: z.string(),
  phone: z.string(),
  email: z.string().email().optional(),
  registrationNumber: z.string().optional(),
  produceCategoryIds: z.array(uuid),
  memberUserIds: z.array(uuid),
  addresses: z.array(address),
  preferredPaymentProvider: paymentProvider.optional(),
  maskedPaymentAccount: z.string().optional(),
  verificationStatus: z.enum([
    "pending",
    "verified",
    "rejected",
    "suspended",
  ]),
  verifiedAt: isoDateTime.optional(),
  verifiedBy: uuid.optional(),
  verificationNotes: z.string().optional(),
  performance: z.strictObject({
    completedOrders: nonNegativeInteger,
    cancellationRate: z.number().finite().min(0).max(100),
    averageRating: z.number().finite().min(0).max(5).nullable(),
    onTimeDeliveryRate: z
      .number()
      .finite()
      .min(0)
      .max(100)
      .nullable(),
  }),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const product = z.strictObject({
  id: uuid,
  slug: z.string(),
  name: localisedText,
  description: localisedText,
  category: z.enum([
    "fruit",
    "vegetable",
    "tuber",
    "cereal",
    "legume",
    "spice",
  ]),
  defaultUnit: commercialUnit,
  allowedUnits: z.array(commercialUnit).min(1),
  grades: z.array(produceGrade).min(1),
  imageUrl: z.string(),
  accent: z.string(),
  seasonMonths: z.array(z.number().int().min(1).max(12)),
  active: z.boolean(),
});

const listing = z.strictObject({
  id: uuid,
  reference: z.string(),
  farmerOrganisationId: uuid,
  createdBy: uuid,
  productId: uuid,
  availableQuantity: positiveNumber,
  reservedQuantity: nonNegativeNumber,
  unit: commercialUnit,
  unitPrice: positiveMoney,
  minOrderQuantity: positiveNumber,
  grade: produceGrade,
  location: address,
  availableFrom: isoDate,
  availableUntil: isoDate,
  imageUrls: z.array(z.string()),
  notes: z.string().optional(),
  status: z.enum([
    "draft",
    "active",
    "paused",
    "sold",
    "unavailable",
    "closed",
  ]),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const demand = z.strictObject({
  id: uuid,
  reference: z.string(),
  buyerOrganisationId: uuid,
  createdBy: uuid,
  title: z.string(),
  deliveryAddress: address,
  requiredDeliveryDate: isoDate,
  itemIds: z.array(uuid),
  recurring: z.boolean(),
  recurrenceNote: z.string().optional(),
  status: z.enum([
    "draft",
    "open",
    "matching",
    "allocating",
    "offered",
    "fulfilled",
    "cancelled",
    "expired",
  ]),
  notes: z.string().optional(),
  submittedAt: isoDateTime.optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const demandItem = z.strictObject({
  id: uuid,
  demandId: uuid,
  productId: uuid,
  quantity: positiveNumber,
  unit: commercialUnit,
  grade: produceGrade,
  targetUnitPrice: positiveMoney.optional(),
  notes: z.string().optional(),
});

const quote = z.strictObject({
  id: uuid,
  reference: z.string(),
  demandItemId: uuid,
  farmerOrganisationId: uuid,
  submittedBy: uuid,
  sourceListingId: uuid.optional(),
  availableQuantity: positiveNumber,
  unit: commercialUnit,
  unitPrice: positiveMoney,
  availableDate: isoDate,
  notes: z.string().optional(),
  status: z.enum([
    "submitted",
    "shortlisted",
    "accepted",
    "declined",
    "withdrawn",
  ]),
  submittedAt: isoDateTime,
  updatedAt: isoDateTime,
});

const order = z.strictObject({
  id: uuid,
  reference: z.string(),
  demandId: uuid.optional(),
  buyerOrganisationId: uuid,
  createdBy: uuid,
  itemIds: z.array(uuid),
  allocationIds: z.array(uuid),
  deliveryAddress: address,
  deliveryDate: isoDate,
  status: z.enum([
    "draft",
    "requested",
    "quoted",
    "confirmed",
    "ready_for_pickup",
    "in_transit",
    "delivered",
    "accepted",
    "completed",
    "disputed",
    "cancelled",
    "refunded",
  ]),
  subtotal: money,
  serviceFee: money,
  deliveryFee: money,
  total: money,
  currency: z.literal("XAF"),
  paymentStatus,
  shipmentStatus: shipmentStatus.optional(),
  buyerNote: z.string().optional(),
  operationsNote: z.string().optional(),
  quotedAt: isoDateTime.optional(),
  confirmedAt: isoDateTime.optional(),
  deliveredAt: isoDateTime.optional(),
  acceptedAt: isoDateTime.optional(),
  completedAt: isoDateTime.optional(),
  cancelledAt: isoDateTime.optional(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const orderItem = z.strictObject({
  id: uuid,
  orderId: uuid,
  demandItemId: uuid.optional(),
  productId: uuid,
  quantity: positiveNumber,
  allocatedQuantity: nonNegativeNumber,
  unit: commercialUnit,
  grade: produceGrade,
  unitPrice: positiveMoney,
  lineTotal: money,
});

const allocation = z.strictObject({
  id: uuid,
  demandId: uuid,
  demandItemId: uuid,
  orderId: uuid.optional(),
  orderItemId: uuid.optional(),
  quoteId: uuid.optional(),
  sourceListingId: uuid.optional(),
  farmerOrganisationId: uuid,
  quantity: positiveNumber,
  unit: commercialUnit,
  farmerUnitPrice: positiveMoney,
  farmerTotal: money,
  status: z.enum([
    "proposed",
    "confirmed",
    "ready_for_pickup",
    "picked_up",
    "delivered",
    "cancelled",
  ]),
  pickupAddress: address,
  pickupWindow: z.string().optional(),
  farmerNote: z.string().optional(),
  operationsNote: z.string().optional(),
  createdBy: uuid,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const payment = z.strictObject({
  id: uuid,
  orderId: uuid,
  provider: paymentProvider,
  transactionReference: z.string(),
  amount: positiveMoney,
  currency: z.literal("XAF"),
  status: paymentStatus,
  payerMaskedAccount: z.string().optional(),
  providerEventId: z.string().optional(),
  failureReason: z.string().optional(),
  verifiedBy: uuid.optional(),
  verifiedAt: isoDateTime.optional(),
  initiatedAt: isoDateTime,
  completedAt: isoDateTime.optional(),
  updatedAt: isoDateTime,
});

const shipmentStop = z.strictObject({
  id: uuid,
  allocationId: uuid.optional(),
  address,
  contactName: z.string(),
  contactPhone: z.string(),
  plannedAt: isoDateTime.optional(),
  completedAt: isoDateTime.optional(),
  proofUrl: z.string().optional(),
  status: z.enum(["pending", "completed", "missed"]),
});

const shipment = z.strictObject({
  id: uuid,
  reference: z.string(),
  orderId: uuid,
  providerOrganisationId: uuid.optional(),
  transporterName: z.string(),
  transporterPhone: z.string(),
  vehicleDetails: z.string().optional(),
  driverName: z.string().optional(),
  pickupStops: z.array(shipmentStop),
  deliveryAddress: address,
  plannedPickupAt: isoDateTime.optional(),
  expectedDeliveryAt: isoDateTime.optional(),
  status: shipmentStatus,
  exceptionNote: z.string().optional(),
  deliveredAt: isoDateTime.optional(),
  createdBy: uuid,
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
});

const notification = z.strictObject({
  id: uuid,
  recipientUserId: uuid,
  type: z.enum([
    "verification",
    "demand_match",
    "quote",
    "offer",
    "order",
    "payment",
    "pickup",
    "delivery",
    "dispute",
    "cancellation",
    "system",
  ]),
  title: localisedText,
  message: localisedText,
  channels: z.array(z.enum(["in_app", "sms", "whatsapp", "email"])).min(1),
  status: z.enum(["queued", "sent", "delivered", "failed", "read"]),
  entityType: z
    .enum([
      "organisation",
      "listing",
      "demand",
      "quote",
      "order",
      "payment",
      "shipment",
      "dispute",
    ])
    .optional(),
  entityId: uuid.optional(),
  deduplicationKey: z.string(),
  readAt: isoDateTime.optional(),
  createdAt: isoDateTime,
});

const dispute = z.strictObject({
  id: uuid,
  reference: z.string(),
  orderId: uuid,
  openedBy: uuid,
  reason: z.enum([
    "quality",
    "quantity_shortage",
    "late_delivery",
    "damaged_goods",
    "wrong_product",
    "payment",
    "other",
  ]),
  description: z.string(),
  affectedOrderItemIds: z.array(uuid),
  affectedQuantity: positiveNumber.optional(),
  requestedResolution: z.enum([
    "replacement",
    "partial_refund",
    "full_refund",
    "credit",
    "other",
  ]),
  status: z.enum([
    "open",
    "under_review",
    "resolved",
    "partially_resolved",
    "rejected",
  ]),
  evidence: z.array(
    z.strictObject({
      id: uuid,
      kind: z.enum(["photo", "document", "note"]),
      url: z.string().optional(),
      description: z.string(),
      addedBy: uuid,
      createdAt: isoDateTime,
    }),
  ),
  assignedTo: uuid.optional(),
  investigationNote: z.string().optional(),
  resolution: z.string().optional(),
  financialAdjustment: money,
  resolvedBy: uuid.optional(),
  resolvedAt: isoDateTime.optional(),
  openedAt: isoDateTime,
  updatedAt: isoDateTime,
});

const audit = z.strictObject({
  id: uuid,
  actorUserId: uuid,
  actorRole: userRole,
  action: z.enum([
    "session.role_switched",
    "session.locale_changed",
    "demo.reset",
    "listing.created",
    "demand.created",
    "quote.submitted",
    "allocation.created",
    "offer.created",
    "order.confirmed",
    "payment.confirmed",
    "shipment.advanced",
    "delivery.accepted",
    "dispute.opened",
    "dispute.resolved",
    "organisation.verification_changed",
    "notification.read",
  ]),
  targetType: z.enum([
    "session",
    "demo",
    "organisation",
    "listing",
    "demand",
    "quote",
    "allocation",
    "order",
    "payment",
    "shipment",
    "notification",
    "dispute",
  ]),
  targetId: uuid,
  summary: z.string(),
  before: z.record(z.string(), z.unknown()).optional(),
  after: z.record(z.string(), z.unknown()).optional(),
  createdAt: isoDateTime,
});

const domainStateSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    activeUserId: uuid,
    activeRole: userRole,
    locale,
    users: z.array(user),
    organisations: z.array(organisation),
    products: z.array(product),
    listings: z.array(listing),
    demands: z.array(demand),
    demandItems: z.array(demandItem),
    quotes: z.array(quote),
    orders: z.array(order),
    orderItems: z.array(orderItem),
    allocations: z.array(allocation),
    payments: z.array(payment),
    shipments: z.array(shipment),
    notifications: z.array(notification),
    disputes: z.array(dispute),
    audits: z.array(audit),
    updatedAt: isoDateTime,
  })
  .superRefine((state, context) => {
    const collections = {
      users: state.users,
      organisations: state.organisations,
      products: state.products,
      listings: state.listings,
      demands: state.demands,
      demandItems: state.demandItems,
      quotes: state.quotes,
      orders: state.orders,
      orderItems: state.orderItems,
      allocations: state.allocations,
      payments: state.payments,
      shipments: state.shipments,
      notifications: state.notifications,
      disputes: state.disputes,
      audits: state.audits,
    } as const;

    let entityCount = 0;
    for (const [collectionName, collection] of Object.entries(
      collections,
    )) {
      entityCount += collection.length;
      if (collection.length > 10_000) {
        context.addIssue({
          code: "custom",
          message: `${collectionName} exceeds the 10,000 entity limit.`,
        });
      }
      const ids = new Set<string>();
      for (const entity of collection) {
        if (ids.has(entity.id)) {
          context.addIssue({
            code: "custom",
            message: `Duplicate entity id '${entity.id}'.`,
          });
        }
        ids.add(entity.id);
      }
    }
    if (entityCount > 50_000) {
      context.addIssue({
        code: "custom",
        message: "Application state exceeds the 50,000 total entity limit.",
      });
    }

    const users = new Set(state.users.map(({ id }) => id));
    const organisations = new Set(state.organisations.map(({ id }) => id));
    const products = new Set(state.products.map(({ id }) => id));
    const listings = new Set(state.listings.map(({ id }) => id));
    const demands = new Set(state.demands.map(({ id }) => id));
    const demandById = new Map(
      state.demands.map((item) => [item.id, item] as const),
    );
    const demandItems = new Map(
      state.demandItems.map((item) => [item.id, item] as const),
    );
    const quotes = new Set(state.quotes.map(({ id }) => id));
    const orders = new Set(state.orders.map(({ id }) => id));
    const orderById = new Map(
      state.orders.map((item) => [item.id, item] as const),
    );
    const orderItems = new Map(
      state.orderItems.map((item) => [item.id, item] as const),
    );
    const allocations = new Set(state.allocations.map(({ id }) => id));
    const activeUser = state.users.find(
      ({ id }) => id === state.activeUserId,
    );
    if (!activeUser) {
      context.addIssue({
        code: "custom",
        path: ["activeUserId"],
        message: "Active user must identify a user in the state.",
      });
    } else if (!activeUser.roles.includes(state.activeRole)) {
      context.addIssue({
        code: "custom",
        path: ["activeRole"],
        message: "Active role must be assigned to the active user.",
      });
    }

    const requireReference = (
      exists: boolean,
      collection: string,
      id: string | undefined,
    ) => {
      if (!exists) {
        context.addIssue({
          code: "custom",
          message: `${collection} references missing id '${id ?? ""}'.`,
        });
      }
    };
    let relationCount = 0;
    const requireUniqueReferences = (
      ids: readonly string[],
      collection: string,
    ) => {
      relationCount += ids.length;
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: "custom",
          message: `${collection} contains duplicate relation ids.`,
        });
      }
    };
    const requireUniqueColumn = <T,>(
      items: readonly T[],
      value: (item: T) => string | undefined,
      collection: string,
    ) => {
      const seen = new Set<string>();
      for (const item of items) {
        const candidate = value(item);
        if (candidate === undefined) continue;
        if (seen.has(candidate)) {
          context.addIssue({
            code: "custom",
            message: `${collection} must be unique; duplicate value '${candidate}'.`,
          });
        }
        seen.add(candidate);
      }
    };

    requireUniqueColumn(state.users, (item) => item.phone, "user.phone");
    requireUniqueColumn(state.users, (item) => item.email, "user.email");
    requireUniqueColumn(
      state.organisations,
      (item) => item.slug,
      "organisation.slug",
    );
    requireUniqueColumn(
      state.organisations,
      (item) => item.registrationNumber,
      "organisation.registrationNumber",
    );
    requireUniqueColumn(state.products, (item) => item.slug, "product.slug");
    requireUniqueColumn(
      state.listings,
      (item) => item.reference,
      "listing.reference",
    );
    requireUniqueColumn(
      state.demands,
      (item) => item.reference,
      "demand.reference",
    );
    requireUniqueColumn(
      state.quotes,
      (item) => item.reference,
      "quote.reference",
    );
    requireUniqueColumn(
      state.orders,
      (item) => item.reference,
      "order.reference",
    );
    requireUniqueColumn(
      state.payments,
      (item) => item.transactionReference,
      "payment.transactionReference",
    );
    requireUniqueColumn(
      state.payments,
      (item) => item.providerEventId,
      "payment.providerEventId",
    );
    requireUniqueColumn(
      state.shipments,
      (item) => item.reference,
      "shipment.reference",
    );
    requireUniqueColumn(
      state.notifications,
      (item) => item.deduplicationKey,
      "notification.deduplicationKey",
    );
    requireUniqueColumn(
      state.disputes,
      (item) => item.reference,
      "dispute.reference",
    );

    for (const item of state.organisations) {
      if (item.buyerType && item.type !== "buyer") {
        context.addIssue({
          code: "custom",
          message: `Organisation '${item.id}' can only have buyerType when type is buyer.`,
        });
      }
      requireUniqueReferences(
        item.memberUserIds,
        "organisation.memberUserIds",
      );
      requireUniqueReferences(
        item.produceCategoryIds,
        "organisation.produceCategoryIds",
      );
      item.memberUserIds.forEach((id) =>
        requireReference(users.has(id), "organisation.memberUserIds", id),
      );
      item.produceCategoryIds.forEach((id) =>
        requireReference(products.has(id), "organisation.produceCategoryIds", id),
      );
      if (item.verifiedBy) {
        requireReference(users.has(item.verifiedBy), "organisation.verifiedBy", item.verifiedBy);
      }
    }
    for (const item of state.users) {
      requireUniqueReferences(
        item.organisationIds,
        "user.organisationIds",
      );
      if (new Set(item.roles).size !== item.roles.length) {
        context.addIssue({
          code: "custom",
          message: `User '${item.id}' contains duplicate role assignments.`,
        });
      }
      item.organisationIds.forEach((id) =>
        requireReference(organisations.has(id), "user.organisationIds", id),
      );
      requireReference(
        item.roles.includes(item.primaryRole),
        "user.primaryRole",
        item.primaryRole,
      );
    }
    for (const item of state.products) {
      if (!item.allowedUnits.includes(item.defaultUnit)) {
        context.addIssue({
          code: "custom",
          message: `Product '${item.id}' default unit must be present in allowedUnits.`,
        });
      }
    }
    const organisationById = new Map(
      state.organisations.map((item) => [item.id, item] as const),
    );
    const userById = new Map(
      state.users.map((item) => [item.id, item] as const),
    );
    for (const item of state.users) {
      for (const organisationId of item.organisationIds) {
        if (
          !organisationById
            .get(organisationId)
            ?.memberUserIds.includes(item.id)
        ) {
          context.addIssue({
            code: "custom",
            message: `Membership '${item.id}:${organisationId}' is missing from organisation.memberUserIds.`,
          });
        }
      }
    }
    for (const item of state.organisations) {
      for (const userId of item.memberUserIds) {
        if (!userById.get(userId)?.organisationIds.includes(item.id)) {
          context.addIssue({
            code: "custom",
            message: `Membership '${userId}:${item.id}' is missing from user.organisationIds.`,
          });
        }
      }
    }
    for (const item of state.listings) {
      requireReference(organisations.has(item.farmerOrganisationId), "listing.farmerOrganisationId", item.farmerOrganisationId);
      requireReference(users.has(item.createdBy), "listing.createdBy", item.createdBy);
      requireReference(products.has(item.productId), "listing.productId", item.productId);
      if (item.reservedQuantity > item.availableQuantity) {
        context.addIssue({
          code: "custom",
          message: `Listing '${item.id}' reserves more than its available quantity.`,
        });
      }
      if (item.minOrderQuantity > item.availableQuantity) {
        context.addIssue({
          code: "custom",
          message: `Listing '${item.id}' minimum order quantity exceeds its available quantity.`,
        });
      }
      if (item.availableUntil < item.availableFrom) {
        context.addIssue({
          code: "custom",
          message: `Listing '${item.id}' availability ends before it starts.`,
        });
      }
    }
    for (const item of state.demands) {
      requireUniqueReferences(item.itemIds, "demand.itemIds");
      requireReference(organisations.has(item.buyerOrganisationId), "demand.buyerOrganisationId", item.buyerOrganisationId);
      requireReference(users.has(item.createdBy), "demand.createdBy", item.createdBy);
      item.itemIds.forEach((id) => {
        const child = demandItems.get(id);
        requireReference(child?.demandId === item.id, "demand.itemIds", id);
      });
    }
    for (const item of state.demandItems) {
      requireReference(demands.has(item.demandId), "demandItem.demandId", item.demandId);
      requireReference(products.has(item.productId), "demandItem.productId", item.productId);
      requireReference(
        demandById.get(item.demandId)?.itemIds.includes(item.id) ===
          true,
        "demandItem.parentItemIds",
        item.id,
      );
    }
    for (const item of state.quotes) {
      requireReference(demandItems.has(item.demandItemId), "quote.demandItemId", item.demandItemId);
      requireReference(organisations.has(item.farmerOrganisationId), "quote.farmerOrganisationId", item.farmerOrganisationId);
      requireReference(users.has(item.submittedBy), "quote.submittedBy", item.submittedBy);
      if (item.sourceListingId) {
        requireReference(listings.has(item.sourceListingId), "quote.sourceListingId", item.sourceListingId);
      }
    }
    for (const item of state.orders) {
      requireUniqueReferences(item.itemIds, "order.itemIds");
      requireUniqueReferences(
        item.allocationIds,
        "order.allocationIds",
      );
      if (item.demandId) {
        requireReference(demands.has(item.demandId), "order.demandId", item.demandId);
      }
      requireReference(organisations.has(item.buyerOrganisationId), "order.buyerOrganisationId", item.buyerOrganisationId);
      requireReference(users.has(item.createdBy), "order.createdBy", item.createdBy);
      item.itemIds.forEach((id) => {
        const child = orderItems.get(id);
        requireReference(child?.orderId === item.id, "order.itemIds", id);
      });
      item.allocationIds.forEach((id) =>
        requireReference(allocations.has(id), "order.allocationIds", id),
      );
      if (
        item.total !==
        item.subtotal + item.serviceFee + item.deliveryFee
      ) {
        context.addIssue({
          code: "custom",
          message: `Order '${item.id}' total must equal subtotal plus service and delivery fees.`,
        });
      }
    }
    for (const item of state.orderItems) {
      requireReference(orders.has(item.orderId), "orderItem.orderId", item.orderId);
      requireReference(products.has(item.productId), "orderItem.productId", item.productId);
      requireReference(
        orderById.get(item.orderId)?.itemIds.includes(item.id) === true,
        "orderItem.parentItemIds",
        item.id,
      );
      if (item.demandItemId) {
        requireReference(demandItems.has(item.demandItemId), "orderItem.demandItemId", item.demandItemId);
      }
      if (item.allocatedQuantity > item.quantity) {
        context.addIssue({
          code: "custom",
          message: `Order item '${item.id}' allocated quantity exceeds its quantity.`,
        });
      }
    }
    for (const item of state.allocations) {
      requireReference(demands.has(item.demandId), "allocation.demandId", item.demandId);
      requireReference(demandItems.has(item.demandItemId), "allocation.demandItemId", item.demandItemId);
      requireReference(organisations.has(item.farmerOrganisationId), "allocation.farmerOrganisationId", item.farmerOrganisationId);
      requireReference(users.has(item.createdBy), "allocation.createdBy", item.createdBy);
      if (item.orderId) requireReference(orders.has(item.orderId), "allocation.orderId", item.orderId);
      if (item.orderId) {
        requireReference(
          orderById
            .get(item.orderId)
            ?.allocationIds.includes(item.id) === true,
          "allocation.parentAllocationIds",
          item.id,
        );
      }
      if (item.orderItemId) requireReference(orderItems.has(item.orderItemId), "allocation.orderItemId", item.orderItemId);
      if (item.orderItemId && !item.orderId) {
        context.addIssue({
          code: "custom",
          message: `Allocation '${item.id}' cannot reference an order item without an order.`,
        });
      }
      if (item.quoteId) requireReference(quotes.has(item.quoteId), "allocation.quoteId", item.quoteId);
      if (item.sourceListingId) requireReference(listings.has(item.sourceListingId), "allocation.sourceListingId", item.sourceListingId);
    }
    for (const item of state.payments) {
      requireReference(orders.has(item.orderId), "payment.orderId", item.orderId);
      if (item.verifiedBy) requireReference(users.has(item.verifiedBy), "payment.verifiedBy", item.verifiedBy);
    }
    for (const item of state.shipments) {
      requireReference(orders.has(item.orderId), "shipment.orderId", item.orderId);
      requireReference(users.has(item.createdBy), "shipment.createdBy", item.createdBy);
      if (item.providerOrganisationId) requireReference(organisations.has(item.providerOrganisationId), "shipment.providerOrganisationId", item.providerOrganisationId);
      item.pickupStops.forEach((stop) => {
        if (stop.allocationId) requireReference(allocations.has(stop.allocationId), "shipment.pickupStops.allocationId", stop.allocationId);
      });
      if (
        item.plannedPickupAt &&
        item.expectedDeliveryAt &&
        new Date(item.expectedDeliveryAt).getTime() <
          new Date(item.plannedPickupAt).getTime()
      ) {
        context.addIssue({
          code: "custom",
          message: `Shipment '${item.id}' delivery cannot be expected before pickup.`,
        });
      }
    }
    for (const item of state.notifications) {
      requireReference(users.has(item.recipientUserId), "notification.recipientUserId", item.recipientUserId);
      if ((item.entityType === undefined) !== (item.entityId === undefined)) {
        context.addIssue({
          code: "custom",
          message: `Notification '${item.id}' entityType and entityId must be supplied together.`,
        });
      }
      if (item.readAt && item.status !== "read") {
        context.addIssue({
          code: "custom",
          message: `Notification '${item.id}' with readAt must have read status.`,
        });
      }
    }
    const unresolvedDisputeByOrder = new Set<string>();
    for (const item of state.disputes) {
      requireUniqueReferences(
        item.affectedOrderItemIds,
        "dispute.affectedOrderItemIds",
      );
      requireReference(orders.has(item.orderId), "dispute.orderId", item.orderId);
      requireReference(users.has(item.openedBy), "dispute.openedBy", item.openedBy);
      item.affectedOrderItemIds.forEach((id) =>
        requireReference(orderItems.get(id)?.orderId === item.orderId, "dispute.affectedOrderItemIds", id),
      );
      if (item.assignedTo) requireReference(users.has(item.assignedTo), "dispute.assignedTo", item.assignedTo);
      if (item.resolvedBy) requireReference(users.has(item.resolvedBy), "dispute.resolvedBy", item.resolvedBy);
      item.evidence.forEach((evidenceItem) =>
        requireReference(users.has(evidenceItem.addedBy), "dispute.evidence.addedBy", evidenceItem.addedBy),
      );
      if (
        ["resolved", "partially_resolved", "rejected"].includes(
          item.status,
        ) &&
        (item.resolution === undefined ||
          item.resolvedBy === undefined ||
          item.resolvedAt === undefined)
      ) {
        context.addIssue({
          code: "custom",
          message: `Resolved dispute '${item.id}' requires resolution, resolvedBy, and resolvedAt.`,
        });
      }
      if (["open", "under_review"].includes(item.status)) {
        if (unresolvedDisputeByOrder.has(item.orderId)) {
          context.addIssue({
            code: "custom",
            message: `Order '${item.orderId}' cannot have more than one open dispute.`,
          });
        }
        unresolvedDisputeByOrder.add(item.orderId);
      }
    }
    for (const item of state.audits) {
      requireReference(users.has(item.actorUserId), "audit.actorUserId", item.actorUserId);
      requireReference(
        userById.get(item.actorUserId)?.roles.includes(item.actorRole) ===
          true,
        "audit.actorRole",
        item.actorRole,
      );
    }
    if (relationCount > 100_000) {
      context.addIssue({
        code: "custom",
        message:
          "Application state exceeds the 100,000 relationship limit.",
      });
    }
  });

export type StateValidationResult =
  | { success: true; state: DomainState }
  | { success: false; fieldErrors: Record<string, string[]> };

export function validateDomainState(value: unknown): StateValidationResult {
  const result = domainStateSchema.safeParse(value);
  if (result.success) {
    return { success: true, state: result.data as DomainState };
  }

  const fieldErrors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.length > 0 ? issue.path.join(".") : "state";
    (fieldErrors[path] ??= []).push(issue.message);
  }
  return { success: false, fieldErrors };
}
