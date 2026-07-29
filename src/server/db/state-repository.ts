import "server-only";

import {
  Prisma,
  type AuditAction as DatabaseAuditAction,
} from "@/generated/prisma/client";
import type {
  Address,
  AuditAction,
  AuditLog,
  DisputeEvidence,
  DomainState,
  LocalisedText,
  ShipmentStop,
  UserRole,
} from "@/lib/domain";
import { DEMO_IDS } from "@/lib/seed-data";
import { getPrisma } from "@/server/db/prisma";
import {
  validateDomainState,
  type StateValidationResult,
} from "@/server/db/state-validation";

const STATE_META_ID = "primary";

const databaseAuditAction: Record<AuditAction, DatabaseAuditAction> = {
  "session.role_switched": "session_role_switched",
  "session.locale_changed": "session_locale_changed",
  "demo.reset": "demo_reset",
  "listing.created": "listing_created",
  "demand.created": "demand_created",
  "quote.submitted": "quote_submitted",
  "allocation.created": "allocation_created",
  "offer.created": "offer_created",
  "order.confirmed": "order_confirmed",
  "payment.confirmed": "payment_confirmed",
  "shipment.advanced": "shipment_advanced",
  "delivery.accepted": "delivery_accepted",
  "dispute.opened": "dispute_opened",
  "dispute.resolved": "dispute_resolved",
  "organisation.verification_changed":
    "organisation_verification_changed",
  "notification.read": "notification_read",
};

const domainAuditAction = Object.fromEntries(
  Object.entries(databaseAuditAction).map(([domain, database]) => [
    database,
    domain,
  ]),
) as Record<DatabaseAuditAction, AuditAction>;

type PresentationState = Partial<
  Pick<DomainState, "activeUserId" | "activeRole" | "locale">
>;

export class DatabaseNotSeededError extends Error {
  constructor() {
    super(
      "The FarmToMarket database has not been seeded. Run `npm run db:seed` before starting the app.",
    );
    this.name = "DatabaseNotSeededError";
  }
}

export class StateConflictError extends Error {
  constructor(public readonly currentUpdatedAt: string | null) {
    super(
      "The database changed after this browser loaded it. Reload the latest state before retrying.",
    );
    this.name = "StateConflictError";
  }
}

export class InvalidDomainStateError extends Error {
  constructor(public readonly fieldErrors: Record<string, string[]>) {
    super("The supplied application state failed structural validation.");
    this.name = "InvalidDomainStateError";
  }
}

function toDate(value: string): Date {
  return new Date(value);
}

function toCalendarDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function fromCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function optionalDate(value: string | undefined): Date | null {
  return value ? toDate(value) : null;
}

function optionalIso(value: Date | null): string | undefined {
  return value?.toISOString();
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function fromJson<T>(value: Prisma.JsonValue): T {
  return value as unknown as T;
}

function validated(value: unknown): DomainState {
  const result: StateValidationResult = validateDomainState(value);
  if (!result.success) {
    throw new InvalidDomainStateError(result.fieldErrors);
  }
  return result.state;
}

export function nextStateUpdatedAt(
  previous: Date | null,
  now = Date.now(),
): Date {
  return new Date(
    Math.max(now, (previous?.getTime() ?? 0) + 1),
  );
}

function selectPresentation(
  users: DomainState["users"],
  requested: PresentationState,
): Pick<DomainState, "activeUserId" | "activeRole" | "locale"> {
  const requestedUser = users.find(({ id }) => id === requested.activeUserId);
  const defaultUser =
    users.find(({ id }) => id === DEMO_IDS.users.buyerHotel) ?? users[0];

  if (!defaultUser) {
    throw new DatabaseNotSeededError();
  }

  const user = requestedUser ?? defaultUser;
  const activeRole =
    requested.activeRole && user.roles.includes(requested.activeRole)
      ? requested.activeRole
      : user.primaryRole;

  return {
    activeUserId: user.id,
    activeRole,
    locale: requested.locale ?? user.locale,
  };
}

export async function getDatabaseStateMetadata(): Promise<{
  schemaVersion: number;
  revision: number;
  updatedAt: string;
} | null> {
  const meta = await getPrisma().appStateMeta.findUnique({
    where: { id: STATE_META_ID },
  });
  return meta
    ? {
        schemaVersion: meta.schemaVersion,
        revision: meta.revision,
        updatedAt: meta.updatedAt.toISOString(),
      }
    : null;
}

export async function loadDomainState(
  presentation: PresentationState = {},
): Promise<DomainState> {
  return getPrisma().$transaction(
    (transaction) =>
      loadDomainStateSnapshot(transaction, presentation),
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 10_000,
      timeout: 30_000,
    },
  );
}

async function loadDomainStateSnapshot(
  prisma: Prisma.TransactionClient,
  presentation: PresentationState,
): Promise<DomainState> {
  const [
    meta,
    databaseUsers,
    roleAssignments,
    memberships,
    databaseOrganisations,
    organisationProducts,
    databaseProducts,
    databaseListings,
    databaseDemands,
    databaseDemandItems,
    databaseQuotes,
    databaseOrders,
    databaseOrderItems,
    databaseAllocations,
    databasePayments,
    databaseShipments,
    databaseNotifications,
    databaseDisputes,
    disputeAffectedItems,
    databaseAudits,
  ] = await Promise.all([
    prisma.appStateMeta.findUnique({ where: { id: STATE_META_ID } }),
    prisma.user.findMany({ orderBy: { id: "asc" } }),
    prisma.userRoleAssignment.findMany({
      orderBy: [{ userId: "asc" }, { role: "asc" }],
    }),
    prisma.organisationMember.findMany({
      orderBy: [{ organisationId: "asc" }, { userId: "asc" }],
    }),
    prisma.organisation.findMany({ orderBy: { id: "asc" } }),
    prisma.organisationProduct.findMany({
      orderBy: [{ organisationId: "asc" }, { productId: "asc" }],
    }),
    prisma.product.findMany({ orderBy: { id: "asc" } }),
    prisma.supplyListing.findMany({ orderBy: { id: "asc" } }),
    prisma.demandRequest.findMany({ orderBy: { id: "asc" } }),
    prisma.demandItem.findMany({ orderBy: { id: "asc" } }),
    prisma.quote.findMany({ orderBy: { id: "asc" } }),
    prisma.order.findMany({ orderBy: { id: "asc" } }),
    prisma.orderItem.findMany({ orderBy: { id: "asc" } }),
    prisma.fulfilmentAllocation.findMany({ orderBy: { id: "asc" } }),
    prisma.paymentTransaction.findMany({ orderBy: { id: "asc" } }),
    prisma.shipment.findMany({ orderBy: { id: "asc" } }),
    prisma.notification.findMany({ orderBy: { id: "asc" } }),
    prisma.dispute.findMany({ orderBy: { id: "asc" } }),
    prisma.disputeAffectedItem.findMany({
      orderBy: [{ disputeId: "asc" }, { orderItemId: "asc" }],
    }),
    prisma.auditLog.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!meta || databaseUsers.length === 0) {
    throw new DatabaseNotSeededError();
  }

  const rolesByUser = new Map<string, UserRole[]>();
  for (const assignment of roleAssignments) {
    const roles = rolesByUser.get(assignment.userId) ?? [];
    roles.push(assignment.role);
    rolesByUser.set(assignment.userId, roles);
  }

  const organisationsByUser = new Map<string, string[]>();
  const usersByOrganisation = new Map<string, string[]>();
  for (const membership of memberships) {
    const organisationIds =
      organisationsByUser.get(membership.userId) ?? [];
    organisationIds.push(membership.organisationId);
    organisationsByUser.set(membership.userId, organisationIds);

    const userIds =
      usersByOrganisation.get(membership.organisationId) ?? [];
    userIds.push(membership.userId);
    usersByOrganisation.set(membership.organisationId, userIds);
  }

  const productsByOrganisation = new Map<string, string[]>();
  for (const relation of organisationProducts) {
    const productIds =
      productsByOrganisation.get(relation.organisationId) ?? [];
    productIds.push(relation.productId);
    productsByOrganisation.set(relation.organisationId, productIds);
  }

  const demandItemIds = new Map<string, string[]>();
  for (const item of databaseDemandItems) {
    const ids = demandItemIds.get(item.demandId) ?? [];
    ids.push(item.id);
    demandItemIds.set(item.demandId, ids);
  }

  const orderItemIds = new Map<string, string[]>();
  for (const item of databaseOrderItems) {
    const ids = orderItemIds.get(item.orderId) ?? [];
    ids.push(item.id);
    orderItemIds.set(item.orderId, ids);
  }

  const allocationIds = new Map<string, string[]>();
  for (const allocation of databaseAllocations) {
    if (!allocation.orderId) continue;
    const ids = allocationIds.get(allocation.orderId) ?? [];
    ids.push(allocation.id);
    allocationIds.set(allocation.orderId, ids);
  }

  const affectedItemsByDispute = new Map<string, string[]>();
  for (const affectedItem of disputeAffectedItems) {
    const ids =
      affectedItemsByDispute.get(affectedItem.disputeId) ?? [];
    ids.push(affectedItem.orderItemId);
    affectedItemsByDispute.set(affectedItem.disputeId, ids);
  }

  const users: DomainState["users"] = databaseUsers.map((user) => ({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName: user.displayName,
    phone: user.phone,
    email: user.email ?? undefined,
    avatarUrl: user.avatarUrl ?? undefined,
    roles: rolesByUser.get(user.id) ?? [user.primaryRole],
    primaryRole: user.primaryRole,
    organisationIds: organisationsByUser.get(user.id) ?? [],
    locale: user.locale,
    status: user.status,
    lastActiveAt: user.lastActiveAt.toISOString(),
    createdAt: user.createdAt.toISOString(),
  }));

  const session = selectPresentation(users, presentation);
  const state: DomainState = {
    schemaVersion: 1,
    ...session,
    users,
    organisations: databaseOrganisations.map((organisation) => ({
      id: organisation.id,
      slug: organisation.slug,
      name: organisation.name,
      shortName: organisation.shortName,
      type: organisation.type,
      buyerType: organisation.buyerType ?? undefined,
      description: fromJson<LocalisedText>(organisation.description),
      contactPerson: organisation.contactPerson,
      phone: organisation.phone,
      email: organisation.email ?? undefined,
      registrationNumber: organisation.registrationNumber ?? undefined,
      produceCategoryIds:
        productsByOrganisation.get(organisation.id) ?? [],
      memberUserIds: usersByOrganisation.get(organisation.id) ?? [],
      addresses: fromJson<Address[]>(organisation.addresses),
      preferredPaymentProvider:
        organisation.preferredPaymentProvider ?? undefined,
      maskedPaymentAccount:
        organisation.maskedPaymentAccount ?? undefined,
      verificationStatus: organisation.verificationStatus,
      verifiedAt: optionalIso(organisation.verifiedAt),
      verifiedBy: organisation.verifiedById ?? undefined,
      verificationNotes: organisation.verificationNotes ?? undefined,
      performance: {
        completedOrders: organisation.completedOrders,
        cancellationRate: organisation.cancellationRate,
        averageRating: organisation.averageRating,
        onTimeDeliveryRate: organisation.onTimeDeliveryRate,
      },
      createdAt: organisation.createdAt.toISOString(),
      updatedAt: organisation.updatedAt.toISOString(),
    })),
    products: databaseProducts.map((product) => ({
      id: product.id,
      slug: product.slug,
      name: fromJson<LocalisedText>(product.name),
      description: fromJson<LocalisedText>(product.description),
      category: product.category,
      defaultUnit: product.defaultUnit,
      allowedUnits: product.allowedUnits,
      grades: product.grades,
      imageUrl: product.imageUrl,
      accent: product.accent,
      seasonMonths: product.seasonMonths,
      active: product.active,
    })),
    listings: databaseListings.map((listing) => ({
      id: listing.id,
      reference: listing.reference,
      farmerOrganisationId: listing.farmerOrganisationId,
      createdBy: listing.createdById,
      productId: listing.productId,
      availableQuantity: listing.availableQuantity,
      reservedQuantity: listing.reservedQuantity,
      unit: listing.unit,
      unitPrice: listing.unitPrice,
      minOrderQuantity: listing.minOrderQuantity,
      grade: listing.grade,
      location: fromJson<Address>(listing.location),
      availableFrom: fromCalendarDate(listing.availableFrom),
      availableUntil: fromCalendarDate(listing.availableUntil),
      imageUrls: listing.imageUrls,
      notes: listing.notes ?? undefined,
      status: listing.status,
      createdAt: listing.createdAt.toISOString(),
      updatedAt: listing.updatedAt.toISOString(),
    })),
    demands: databaseDemands.map((demand) => ({
      id: demand.id,
      reference: demand.reference,
      buyerOrganisationId: demand.buyerOrganisationId,
      createdBy: demand.createdById,
      title: demand.title,
      deliveryAddress: fromJson<Address>(demand.deliveryAddress),
      requiredDeliveryDate: fromCalendarDate(demand.requiredDeliveryDate),
      itemIds: demandItemIds.get(demand.id) ?? [],
      recurring: demand.recurring,
      recurrenceNote: demand.recurrenceNote ?? undefined,
      status: demand.status,
      notes: demand.notes ?? undefined,
      submittedAt: optionalIso(demand.submittedAt),
      createdAt: demand.createdAt.toISOString(),
      updatedAt: demand.updatedAt.toISOString(),
    })),
    demandItems: databaseDemandItems.map((item) => ({
      id: item.id,
      demandId: item.demandId,
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      grade: item.grade,
      targetUnitPrice: item.targetUnitPrice ?? undefined,
      notes: item.notes ?? undefined,
    })),
    quotes: databaseQuotes.map((quote) => ({
      id: quote.id,
      reference: quote.reference,
      demandItemId: quote.demandItemId,
      farmerOrganisationId: quote.farmerOrganisationId,
      submittedBy: quote.submittedById,
      sourceListingId: quote.sourceListingId ?? undefined,
      availableQuantity: quote.availableQuantity,
      unit: quote.unit,
      unitPrice: quote.unitPrice,
      availableDate: fromCalendarDate(quote.availableDate),
      notes: quote.notes ?? undefined,
      status: quote.status,
      submittedAt: quote.submittedAt.toISOString(),
      updatedAt: quote.updatedAt.toISOString(),
    })),
    orders: databaseOrders.map((order) => ({
      id: order.id,
      reference: order.reference,
      demandId: order.demandId ?? undefined,
      buyerOrganisationId: order.buyerOrganisationId,
      createdBy: order.createdById,
      itemIds: orderItemIds.get(order.id) ?? [],
      allocationIds: allocationIds.get(order.id) ?? [],
      deliveryAddress: fromJson<Address>(order.deliveryAddress),
      deliveryDate: fromCalendarDate(order.deliveryDate),
      status: order.status,
      subtotal: order.subtotal,
      serviceFee: order.serviceFee,
      deliveryFee: order.deliveryFee,
      total: order.total,
      currency: order.currency,
      paymentStatus: order.paymentStatus,
      shipmentStatus: order.shipmentStatus ?? undefined,
      buyerNote: order.buyerNote ?? undefined,
      operationsNote: order.operationsNote ?? undefined,
      quotedAt: optionalIso(order.quotedAt),
      confirmedAt: optionalIso(order.confirmedAt),
      deliveredAt: optionalIso(order.deliveredAt),
      acceptedAt: optionalIso(order.acceptedAt),
      completedAt: optionalIso(order.completedAt),
      cancelledAt: optionalIso(order.cancelledAt),
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    })),
    orderItems: databaseOrderItems.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      demandItemId: item.demandItemId ?? undefined,
      productId: item.productId,
      quantity: item.quantity,
      allocatedQuantity: item.allocatedQuantity,
      unit: item.unit,
      grade: item.grade,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
    })),
    allocations: databaseAllocations.map((allocation) => ({
      id: allocation.id,
      demandId: allocation.demandId,
      demandItemId: allocation.demandItemId,
      orderId: allocation.orderId ?? undefined,
      orderItemId: allocation.orderItemId ?? undefined,
      quoteId: allocation.quoteId ?? undefined,
      sourceListingId: allocation.sourceListingId ?? undefined,
      farmerOrganisationId: allocation.farmerOrganisationId,
      quantity: allocation.quantity,
      unit: allocation.unit,
      farmerUnitPrice: allocation.farmerUnitPrice,
      farmerTotal: allocation.farmerTotal,
      status: allocation.status,
      pickupAddress: fromJson<Address>(allocation.pickupAddress),
      pickupWindow: allocation.pickupWindow ?? undefined,
      farmerNote: allocation.farmerNote ?? undefined,
      operationsNote: allocation.operationsNote ?? undefined,
      createdBy: allocation.createdById,
      createdAt: allocation.createdAt.toISOString(),
      updatedAt: allocation.updatedAt.toISOString(),
    })),
    payments: databasePayments.map((payment) => ({
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      transactionReference: payment.transactionReference,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      payerMaskedAccount: payment.payerMaskedAccount ?? undefined,
      providerEventId: payment.providerEventId ?? undefined,
      failureReason: payment.failureReason ?? undefined,
      verifiedBy: payment.verifiedById ?? undefined,
      verifiedAt: optionalIso(payment.verifiedAt),
      initiatedAt: payment.initiatedAt.toISOString(),
      completedAt: optionalIso(payment.completedAt),
      updatedAt: payment.updatedAt.toISOString(),
    })),
    shipments: databaseShipments.map((shipment) => ({
      id: shipment.id,
      reference: shipment.reference,
      orderId: shipment.orderId,
      providerOrganisationId:
        shipment.providerOrganisationId ?? undefined,
      transporterName: shipment.transporterName,
      transporterPhone: shipment.transporterPhone,
      vehicleDetails: shipment.vehicleDetails ?? undefined,
      driverName: shipment.driverName ?? undefined,
      pickupStops: fromJson<ShipmentStop[]>(shipment.pickupStops),
      deliveryAddress: fromJson<Address>(shipment.deliveryAddress),
      plannedPickupAt: optionalIso(shipment.plannedPickupAt),
      expectedDeliveryAt: optionalIso(shipment.expectedDeliveryAt),
      status: shipment.status,
      exceptionNote: shipment.exceptionNote ?? undefined,
      deliveredAt: optionalIso(shipment.deliveredAt),
      createdBy: shipment.createdById,
      createdAt: shipment.createdAt.toISOString(),
      updatedAt: shipment.updatedAt.toISOString(),
    })),
    notifications: databaseNotifications.map((notification) => ({
      id: notification.id,
      recipientUserId: notification.recipientUserId,
      type: notification.type,
      title: fromJson<LocalisedText>(notification.title),
      message: fromJson<LocalisedText>(notification.message),
      channels: notification.channels,
      status: notification.status,
      entityType: notification.entityType ?? undefined,
      entityId: notification.entityId ?? undefined,
      deduplicationKey: notification.deduplicationKey,
      readAt: optionalIso(notification.readAt),
      createdAt: notification.createdAt.toISOString(),
    })),
    disputes: databaseDisputes.map((dispute) => ({
      id: dispute.id,
      reference: dispute.reference,
      orderId: dispute.orderId,
      openedBy: dispute.openedById,
      reason: dispute.reason,
      description: dispute.description,
      affectedOrderItemIds:
        affectedItemsByDispute.get(dispute.id) ?? [],
      affectedQuantity: dispute.affectedQuantity ?? undefined,
      requestedResolution: dispute.requestedResolution,
      status: dispute.status,
      evidence: fromJson<DisputeEvidence[]>(dispute.evidence),
      assignedTo: dispute.assignedToId ?? undefined,
      investigationNote: dispute.investigationNote ?? undefined,
      resolution: dispute.resolution ?? undefined,
      financialAdjustment: dispute.financialAdjustment,
      resolvedBy: dispute.resolvedById ?? undefined,
      resolvedAt: optionalIso(dispute.resolvedAt),
      openedAt: dispute.openedAt.toISOString(),
      updatedAt: dispute.updatedAt.toISOString(),
    })),
    audits: databaseAudits.map(
      (audit): AuditLog => ({
        id: audit.id,
        actorUserId: audit.actorUserId,
        actorRole: audit.actorRole,
        action: domainAuditAction[audit.action],
        targetType: audit.targetType,
        targetId: audit.targetId,
        summary: audit.summary,
        before: audit.before
          ? fromJson<Record<string, unknown>>(audit.before)
          : undefined,
        after: audit.after
          ? fromJson<Record<string, unknown>>(audit.after)
          : undefined,
        createdAt: audit.createdAt.toISOString(),
      }),
    ),
    updatedAt: meta.updatedAt.toISOString(),
  };

  return validated(JSON.parse(JSON.stringify(state)) as unknown);
}

async function clearDomainTables(transaction: Prisma.TransactionClient) {
  await transaction.disputeAffectedItem.deleteMany();
  await transaction.auditLog.deleteMany();
  await transaction.notification.deleteMany();
  await transaction.dispute.deleteMany();
  await transaction.shipment.deleteMany();
  await transaction.paymentTransaction.deleteMany();
  await transaction.fulfilmentAllocation.deleteMany();
  await transaction.orderItem.deleteMany();
  await transaction.order.deleteMany();
  await transaction.quote.deleteMany();
  await transaction.demandItem.deleteMany();
  await transaction.demandRequest.deleteMany();
  await transaction.supplyListing.deleteMany();
  await transaction.organisationProduct.deleteMany();
  await transaction.organisationMember.deleteMany();
  await transaction.organisation.deleteMany();
  await transaction.userRoleAssignment.deleteMany();
  await transaction.user.deleteMany();
  await transaction.product.deleteMany();
}

async function insertDomainState(
  transaction: Prisma.TransactionClient,
  state: DomainState,
) {
  if (state.users.length) {
    await transaction.user.createMany({
      data: state.users.map((user) => ({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        phone: user.phone,
        email: user.email,
        avatarUrl: user.avatarUrl,
        primaryRole: user.primaryRole,
        locale: user.locale,
        status: user.status,
        lastActiveAt: toDate(user.lastActiveAt),
        createdAt: toDate(user.createdAt),
      })),
    });
  }

  const roleAssignments = state.users.flatMap((user) =>
    user.roles.map((role) => ({ userId: user.id, role })),
  );
  if (roleAssignments.length) {
    await transaction.userRoleAssignment.createMany({
      data: roleAssignments,
    });
  }

  if (state.products.length) {
    await transaction.product.createMany({
      data: state.products.map((product) => ({
        id: product.id,
        slug: product.slug,
        name: toJson(product.name),
        description: toJson(product.description),
        category: product.category,
        defaultUnit: product.defaultUnit,
        allowedUnits: product.allowedUnits,
        grades: product.grades,
        imageUrl: product.imageUrl,
        accent: product.accent,
        seasonMonths: product.seasonMonths,
        active: product.active,
      })),
    });
  }

  if (state.organisations.length) {
    await transaction.organisation.createMany({
      data: state.organisations.map((organisation) => ({
        id: organisation.id,
        slug: organisation.slug,
        name: organisation.name,
        shortName: organisation.shortName,
        type: organisation.type,
        buyerType: organisation.buyerType,
        description: toJson(organisation.description),
        contactPerson: organisation.contactPerson,
        phone: organisation.phone,
        email: organisation.email,
        registrationNumber: organisation.registrationNumber,
        addresses: toJson(organisation.addresses),
        preferredPaymentProvider:
          organisation.preferredPaymentProvider,
        maskedPaymentAccount: organisation.maskedPaymentAccount,
        verificationStatus: organisation.verificationStatus,
        verifiedAt: optionalDate(organisation.verifiedAt),
        verifiedById: organisation.verifiedBy,
        verificationNotes: organisation.verificationNotes,
        completedOrders: organisation.performance.completedOrders,
        cancellationRate: organisation.performance.cancellationRate,
        averageRating: organisation.performance.averageRating,
        onTimeDeliveryRate:
          organisation.performance.onTimeDeliveryRate,
        createdAt: toDate(organisation.createdAt),
        updatedAt: toDate(organisation.updatedAt),
      })),
    });
  }

  const memberships = state.organisations.flatMap((organisation) =>
    organisation.memberUserIds.map((userId) => ({
      organisationId: organisation.id,
      userId,
    })),
  );
  if (memberships.length) {
    await transaction.organisationMember.createMany({ data: memberships });
  }

  const organisationProducts = state.organisations.flatMap(
    (organisation) =>
      organisation.produceCategoryIds.map((productId) => ({
        organisationId: organisation.id,
        productId,
      })),
  );
  if (organisationProducts.length) {
    await transaction.organisationProduct.createMany({
      data: organisationProducts,
    });
  }

  if (state.listings.length) {
    await transaction.supplyListing.createMany({
      data: state.listings.map((listing) => ({
        id: listing.id,
        reference: listing.reference,
        farmerOrganisationId: listing.farmerOrganisationId,
        createdById: listing.createdBy,
        productId: listing.productId,
        availableQuantity: listing.availableQuantity,
        reservedQuantity: listing.reservedQuantity,
        unit: listing.unit,
        unitPrice: listing.unitPrice,
        minOrderQuantity: listing.minOrderQuantity,
        grade: listing.grade,
        location: toJson(listing.location),
        availableFrom: toCalendarDate(listing.availableFrom),
        availableUntil: toCalendarDate(listing.availableUntil),
        imageUrls: listing.imageUrls,
        notes: listing.notes,
        status: listing.status,
        createdAt: toDate(listing.createdAt),
        updatedAt: toDate(listing.updatedAt),
      })),
    });
  }

  if (state.demands.length) {
    await transaction.demandRequest.createMany({
      data: state.demands.map((demand) => ({
        id: demand.id,
        reference: demand.reference,
        buyerOrganisationId: demand.buyerOrganisationId,
        createdById: demand.createdBy,
        title: demand.title,
        deliveryAddress: toJson(demand.deliveryAddress),
        requiredDeliveryDate: toCalendarDate(
          demand.requiredDeliveryDate,
        ),
        recurring: demand.recurring,
        recurrenceNote: demand.recurrenceNote,
        status: demand.status,
        notes: demand.notes,
        submittedAt: optionalDate(demand.submittedAt),
        createdAt: toDate(demand.createdAt),
        updatedAt: toDate(demand.updatedAt),
      })),
    });
  }

  if (state.demandItems.length) {
    await transaction.demandItem.createMany({
      data: state.demandItems.map((item) => ({
        id: item.id,
        demandId: item.demandId,
        productId: item.productId,
        quantity: item.quantity,
        unit: item.unit,
        grade: item.grade,
        targetUnitPrice: item.targetUnitPrice,
        notes: item.notes,
      })),
    });
  }

  if (state.quotes.length) {
    await transaction.quote.createMany({
      data: state.quotes.map((quote) => ({
        id: quote.id,
        reference: quote.reference,
        demandItemId: quote.demandItemId,
        farmerOrganisationId: quote.farmerOrganisationId,
        submittedById: quote.submittedBy,
        sourceListingId: quote.sourceListingId,
        availableQuantity: quote.availableQuantity,
        unit: quote.unit,
        unitPrice: quote.unitPrice,
        availableDate: toCalendarDate(quote.availableDate),
        notes: quote.notes,
        status: quote.status,
        submittedAt: toDate(quote.submittedAt),
        updatedAt: toDate(quote.updatedAt),
      })),
    });
  }

  if (state.orders.length) {
    await transaction.order.createMany({
      data: state.orders.map((order) => ({
        id: order.id,
        reference: order.reference,
        demandId: order.demandId,
        buyerOrganisationId: order.buyerOrganisationId,
        createdById: order.createdBy,
        deliveryAddress: toJson(order.deliveryAddress),
        deliveryDate: toCalendarDate(order.deliveryDate),
        status: order.status,
        subtotal: order.subtotal,
        serviceFee: order.serviceFee,
        deliveryFee: order.deliveryFee,
        total: order.total,
        currency: order.currency,
        paymentStatus: order.paymentStatus,
        shipmentStatus: order.shipmentStatus,
        buyerNote: order.buyerNote,
        operationsNote: order.operationsNote,
        quotedAt: optionalDate(order.quotedAt),
        confirmedAt: optionalDate(order.confirmedAt),
        deliveredAt: optionalDate(order.deliveredAt),
        acceptedAt: optionalDate(order.acceptedAt),
        completedAt: optionalDate(order.completedAt),
        cancelledAt: optionalDate(order.cancelledAt),
        createdAt: toDate(order.createdAt),
        updatedAt: toDate(order.updatedAt),
      })),
    });
  }

  if (state.orderItems.length) {
    await transaction.orderItem.createMany({
      data: state.orderItems.map((item) => ({
        id: item.id,
        orderId: item.orderId,
        demandItemId: item.demandItemId,
        productId: item.productId,
        quantity: item.quantity,
        allocatedQuantity: item.allocatedQuantity,
        unit: item.unit,
        grade: item.grade,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    });
  }

  if (state.allocations.length) {
    await transaction.fulfilmentAllocation.createMany({
      data: state.allocations.map((allocation) => ({
        id: allocation.id,
        demandId: allocation.demandId,
        demandItemId: allocation.demandItemId,
        orderId: allocation.orderId,
        orderItemId: allocation.orderItemId,
        quoteId: allocation.quoteId,
        sourceListingId: allocation.sourceListingId,
        farmerOrganisationId: allocation.farmerOrganisationId,
        quantity: allocation.quantity,
        unit: allocation.unit,
        farmerUnitPrice: allocation.farmerUnitPrice,
        farmerTotal: allocation.farmerTotal,
        status: allocation.status,
        pickupAddress: toJson(allocation.pickupAddress),
        pickupWindow: allocation.pickupWindow,
        farmerNote: allocation.farmerNote,
        operationsNote: allocation.operationsNote,
        createdById: allocation.createdBy,
        createdAt: toDate(allocation.createdAt),
        updatedAt: toDate(allocation.updatedAt),
      })),
    });
  }

  if (state.payments.length) {
    await transaction.paymentTransaction.createMany({
      data: state.payments.map((payment) => ({
        id: payment.id,
        orderId: payment.orderId,
        provider: payment.provider,
        transactionReference: payment.transactionReference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payerMaskedAccount: payment.payerMaskedAccount,
        providerEventId: payment.providerEventId,
        failureReason: payment.failureReason,
        verifiedById: payment.verifiedBy,
        verifiedAt: optionalDate(payment.verifiedAt),
        initiatedAt: toDate(payment.initiatedAt),
        completedAt: optionalDate(payment.completedAt),
        updatedAt: toDate(payment.updatedAt),
      })),
    });
  }

  if (state.shipments.length) {
    await transaction.shipment.createMany({
      data: state.shipments.map((shipment) => ({
        id: shipment.id,
        reference: shipment.reference,
        orderId: shipment.orderId,
        providerOrganisationId:
          shipment.providerOrganisationId,
        transporterName: shipment.transporterName,
        transporterPhone: shipment.transporterPhone,
        vehicleDetails: shipment.vehicleDetails,
        driverName: shipment.driverName,
        pickupStops: toJson(shipment.pickupStops),
        deliveryAddress: toJson(shipment.deliveryAddress),
        plannedPickupAt: optionalDate(shipment.plannedPickupAt),
        expectedDeliveryAt: optionalDate(
          shipment.expectedDeliveryAt,
        ),
        status: shipment.status,
        exceptionNote: shipment.exceptionNote,
        deliveredAt: optionalDate(shipment.deliveredAt),
        createdById: shipment.createdBy,
        createdAt: toDate(shipment.createdAt),
        updatedAt: toDate(shipment.updatedAt),
      })),
    });
  }

  if (state.notifications.length) {
    await transaction.notification.createMany({
      data: state.notifications.map((notification) => ({
        id: notification.id,
        recipientUserId: notification.recipientUserId,
        type: notification.type,
        title: toJson(notification.title),
        message: toJson(notification.message),
        channels: notification.channels,
        status: notification.status,
        entityType: notification.entityType,
        entityId: notification.entityId,
        deduplicationKey: notification.deduplicationKey,
        readAt: optionalDate(notification.readAt),
        createdAt: toDate(notification.createdAt),
      })),
    });
  }

  if (state.disputes.length) {
    await transaction.dispute.createMany({
      data: state.disputes.map((dispute) => ({
        id: dispute.id,
        reference: dispute.reference,
        orderId: dispute.orderId,
        openedById: dispute.openedBy,
        reason: dispute.reason,
        description: dispute.description,
        affectedQuantity: dispute.affectedQuantity,
        requestedResolution: dispute.requestedResolution,
        status: dispute.status,
        evidence: toJson(dispute.evidence),
        assignedToId: dispute.assignedTo,
        investigationNote: dispute.investigationNote,
        resolution: dispute.resolution,
        financialAdjustment: dispute.financialAdjustment,
        resolvedById: dispute.resolvedBy,
        resolvedAt: optionalDate(dispute.resolvedAt),
        openedAt: toDate(dispute.openedAt),
        updatedAt: toDate(dispute.updatedAt),
      })),
    });
  }

  const disputeAffectedItems = state.disputes.flatMap((dispute) =>
    dispute.affectedOrderItemIds.map((orderItemId) => ({
      disputeId: dispute.id,
      orderItemId,
    })),
  );
  if (disputeAffectedItems.length) {
    await transaction.disputeAffectedItem.createMany({
      data: disputeAffectedItems,
    });
  }

  if (state.audits.length) {
    await transaction.auditLog.createMany({
      data: state.audits.map((audit) => ({
        id: audit.id,
        actorUserId: audit.actorUserId,
        actorRole: audit.actorRole,
        action: databaseAuditAction[audit.action],
        targetType: audit.targetType,
        targetId: audit.targetId,
        summary: audit.summary,
        before: audit.before ? toJson(audit.before) : undefined,
        after: audit.after ? toJson(audit.after) : undefined,
        createdAt: toDate(audit.createdAt),
      })),
    });
  }
}

export type ReplaceDomainStateOptions = {
  expectedUpdatedAt?: string;
  force?: boolean;
};

export async function replaceDomainState(
  input: unknown,
  {
    expectedUpdatedAt,
    force = false,
  }: ReplaceDomainStateOptions = {},
): Promise<DomainState> {
  const state = validated(input);
  const prisma = getPrisma();

  try {
    await prisma.$transaction(
      async (transaction) => {
        if (force) {
          const current = await transaction.appStateMeta.findUnique({
            where: { id: STATE_META_ID },
          });
          const nextUpdatedAt = nextStateUpdatedAt(
            current?.updatedAt ?? null,
          );
          await transaction.appStateMeta.upsert({
            where: { id: STATE_META_ID },
            create: {
              id: STATE_META_ID,
              schemaVersion: state.schemaVersion,
              revision: 1,
              updatedAt: nextUpdatedAt,
            },
            update: {
              schemaVersion: state.schemaVersion,
              revision: { increment: 1 },
              updatedAt: nextUpdatedAt,
            },
          });
        } else {
          const expectedDate = expectedUpdatedAt
            ? new Date(expectedUpdatedAt)
            : null;
          if (
            !expectedDate ||
            Number.isNaN(expectedDate.getTime())
          ) {
            const current = await transaction.appStateMeta.findUnique({
              where: { id: STATE_META_ID },
            });
            throw new StateConflictError(
              current?.updatedAt.toISOString() ?? null,
            );
          }

          const claimed = await transaction.appStateMeta.updateMany({
            where: {
              id: STATE_META_ID,
              updatedAt: expectedDate,
            },
            data: {
              schemaVersion: state.schemaVersion,
              revision: { increment: 1 },
              updatedAt: nextStateUpdatedAt(expectedDate),
            },
          });

          if (claimed.count !== 1) {
            const current = await transaction.appStateMeta.findUnique({
              where: { id: STATE_META_ID },
            });
            throw new StateConflictError(
              current?.updatedAt.toISOString() ?? null,
            );
          }
        }

        await clearDomainTables(transaction);
        await insertDomainState(transaction, state);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  } catch (error) {
    if (
      error instanceof StateConflictError ||
      error instanceof InvalidDomainStateError
    ) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      const current = await getDatabaseStateMetadata();
      throw new StateConflictError(current?.updatedAt ?? null);
    }
    throw error;
  }

  return loadDomainState({
    activeUserId: state.activeUserId,
    activeRole: state.activeRole,
    locale: state.locale,
  });
}
