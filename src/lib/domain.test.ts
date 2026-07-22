import { describe, expect, it } from "vitest";
import {
  deriveDashboardMetrics,
  formatFcfa,
  localise,
  type FulfilmentAllocation,
} from "./domain";
import { createSeedState, seedState } from "./seed-data";

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const entityCollections = [
  seedState.users,
  seedState.organisations,
  seedState.products,
  seedState.listings,
  seedState.demands,
  seedState.demandItems,
  seedState.quotes,
  seedState.orders,
  seedState.orderItems,
  seedState.allocations,
  seedState.payments,
  seedState.shipments,
  seedState.notifications,
  seedState.disputes,
  seedState.audits,
] as const;

describe("Cameroon pilot seed", () => {
  it("contains the expected rich pilot dataset", () => {
    expect({
      users: seedState.users.length,
      organisations: seedState.organisations.length,
      products: seedState.products.length,
      listings: seedState.listings.length,
      demands: seedState.demands.length,
      demandItems: seedState.demandItems.length,
      quotes: seedState.quotes.length,
      orders: seedState.orders.length,
      orderItems: seedState.orderItems.length,
      allocations: seedState.allocations.length,
      payments: seedState.payments.length,
      shipments: seedState.shipments.length,
      notifications: seedState.notifications.length,
      disputes: seedState.disputes.length,
      audits: seedState.audits.length,
    }).toEqual({
      users: 10,
      organisations: 8,
      products: 10,
      listings: 8,
      demands: 6,
      demandItems: 12,
      quotes: 8,
      orders: 6,
      orderItems: 10,
      allocations: 12,
      payments: 5,
      shipments: 5,
      notifications: 11,
      disputes: 2,
      audits: 7,
    });
  });

  it("uses unique UUID-like identifiers for top-level entities", () => {
    const ids = entityCollections.flatMap((collection) => collection.map((entity) => entity.id));

    expect(ids.every((id) => uuidLike.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps core entity references resolvable", () => {
    const userIds = new Set(seedState.users.map((user) => user.id));
    const organisationIds = new Set(seedState.organisations.map((organisation) => organisation.id));
    const productIds = new Set(seedState.products.map((product) => product.id));
    const listingIds = new Set(seedState.listings.map((listing) => listing.id));
    const demandIds = new Set(seedState.demands.map((demand) => demand.id));
    const demandItemIds = new Set(seedState.demandItems.map((item) => item.id));
    const quoteIds = new Set(seedState.quotes.map((quote) => quote.id));
    const orderIds = new Set(seedState.orders.map((order) => order.id));
    const orderItemIds = new Set(seedState.orderItems.map((item) => item.id));
    const allocationIds = new Set(seedState.allocations.map((allocation) => allocation.id));

    for (const user of seedState.users) {
      expect(user.organisationIds.every((id) => organisationIds.has(id))).toBe(true);
    }
    for (const organisation of seedState.organisations) {
      expect(organisation.memberUserIds.every((id) => userIds.has(id))).toBe(true);
      expect(organisation.produceCategoryIds.every((id) => productIds.has(id))).toBe(true);
    }
    for (const listing of seedState.listings) {
      expect(organisationIds.has(listing.farmerOrganisationId)).toBe(true);
      expect(productIds.has(listing.productId)).toBe(true);
      expect(userIds.has(listing.createdBy)).toBe(true);
    }
    for (const demand of seedState.demands) {
      expect(organisationIds.has(demand.buyerOrganisationId)).toBe(true);
      expect(demand.itemIds.every((id) => demandItemIds.has(id))).toBe(true);
    }
    for (const item of seedState.demandItems) {
      expect(demandIds.has(item.demandId)).toBe(true);
      expect(productIds.has(item.productId)).toBe(true);
    }
    for (const quote of seedState.quotes) {
      expect(demandItemIds.has(quote.demandItemId)).toBe(true);
      expect(organisationIds.has(quote.farmerOrganisationId)).toBe(true);
      expect(quote.sourceListingId ? listingIds.has(quote.sourceListingId) : true).toBe(true);
    }
    for (const order of seedState.orders) {
      expect(organisationIds.has(order.buyerOrganisationId)).toBe(true);
      expect(order.itemIds.every((id) => orderItemIds.has(id))).toBe(true);
      expect(order.allocationIds.every((id) => allocationIds.has(id))).toBe(true);
    }
    for (const allocation of seedState.allocations) {
      expect(demandIds.has(allocation.demandId)).toBe(true);
      expect(demandItemIds.has(allocation.demandItemId)).toBe(true);
      expect(organisationIds.has(allocation.farmerOrganisationId)).toBe(true);
      expect(allocation.quoteId ? quoteIds.has(allocation.quoteId) : true).toBe(true);
      expect(allocation.orderId ? orderIds.has(allocation.orderId) : true).toBe(true);
      expect(allocation.orderItemId ? orderItemIds.has(allocation.orderItemId) : true).toBe(true);
    }
  });

  it("returns an isolated copy when resetting the demo", () => {
    const copy = createSeedState();
    copy.users[0].displayName = "Changed in copy";
    copy.listings[0].availableQuantity = 0;

    expect(seedState.users[0].displayName).not.toBe("Changed in copy");
    expect(seedState.listings[0].availableQuantity).toBeGreaterThan(0);
    expect(copy).not.toBe(seedState);
  });
});

describe("dashboard metric derivation", () => {
  it("derives the expected pilot KPIs from seed state", () => {
    expect(deriveDashboardMetrics(seedState)).toEqual({
      gmv: 2_223_800,
      totalOrders: 6,
      averageOrderValue: 555_950,
      successfulDeliveryRate: 75,
      cancellationRate: 16.7,
      disputeRate: 50,
      activeFarmers: 2,
      activeBuyers: 2,
      repeatBuyers: 1,
      openDemands: 2,
      unallocatedDemandItems: 1,
      confirmedOrders: 2,
      pickupsDue: 0,
      deliveriesDue: 1,
      paymentExceptions: 1,
      openDisputes: 1,
      unreadNotifications: 3,
      liveListings: 7,
      availableSupplyValue: 4_017_800,
    });
  });

  it("scopes unread-notification metrics to the supplied user", () => {
    const buyer = seedState.users.find((user) => user.primaryRole === "buyer");
    const operations = seedState.users.find((user) => user.primaryRole === "operations");

    expect(buyer).toBeDefined();
    expect(operations).toBeDefined();
    expect(deriveDashboardMetrics(seedState, buyer!.id).unreadNotifications).toBe(3);
    expect(deriveDashboardMetrics(seedState, operations!.id).unreadNotifications).toBe(1);
  });
});

describe("localised commercial formatting", () => {
  it("selects the requested language", () => {
    const copy = { en: "Fresh tomatoes", fr: "Tomates fraîches" };

    expect(localise(copy, "en")).toBe("Fresh tomatoes");
    expect(localise(copy, "fr")).toBe("Tomates fraîches");
  });

  it("formats rounded whole FCFA amounts for English and French", () => {
    expect(formatFcfa(1_234_567.6, "en")).toBe("1,234,568 FCFA");
    expect(formatFcfa(1_234_567.6, "fr")).toBe("1 234 568 FCFA");
    expect(formatFcfa(0, "en")).toBe("0 FCFA");
  });
});

describe("commercial invariants", () => {
  it("never allocates more than a demand item requests", () => {
    for (const item of seedState.demandItems) {
      const allocatedQuantity = seedState.allocations
        .filter(
          (allocation) =>
            allocation.demandItemId === item.id && allocation.status !== "cancelled",
        )
        .reduce((sum, allocation) => sum + allocation.quantity, 0);

      expect(allocatedQuantity, `allocation capacity for demand item ${item.id}`).toBeLessThanOrEqual(
        item.quantity,
      );
    }
  });

  it("keeps committed and proposed allocation quantities within listing stock", () => {
    for (const listing of seedState.listings) {
      const listingAllocations = seedState.allocations.filter(
        (allocation) => allocation.sourceListingId === listing.id,
      );
      const committed = listingAllocations
        .filter((allocation) => !["proposed", "cancelled"].includes(allocation.status))
        .reduce((sum, allocation) => sum + allocation.quantity, 0);
      const proposed = listingAllocations
        .filter((allocation) => allocation.status === "proposed")
        .reduce((sum, allocation) => sum + allocation.quantity, 0);

      expect(committed, `reserved stock for ${listing.reference}`).toBe(listing.reservedQuantity);
      expect(proposed, `proposed stock for ${listing.reference}`).toBeLessThanOrEqual(
        listing.availableQuantity - listing.reservedQuantity,
      );

      for (const allocation of listingAllocations) {
        const demandItem = seedState.demandItems.find(
          (item) => item.id === allocation.demandItemId,
        );
        expect(demandItem).toBeDefined();
        expect(allocation.farmerOrganisationId).toBe(listing.farmerOrganisationId);
        expect(demandItem!.productId).toBe(listing.productId);
        expect(allocation.unit).toBe(listing.unit);
      }
    }
  });

  it("uses unique provider and transaction-reference pairs", () => {
    const keys = seedState.payments.map(
      (payment) => `${payment.provider}:${payment.transactionReference}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("reconciles every order subtotal, fee total, and line amount in whole FCFA", () => {
    for (const order of seedState.orders) {
      const items = seedState.orderItems.filter((item) => order.itemIds.includes(item.id));
      const itemSubtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

      expect(itemSubtotal, `item subtotal for ${order.reference}`).toBe(order.subtotal);
      expect(order.total, `commercial total for ${order.reference}`).toBe(
        order.subtotal + order.serviceFee + order.deliveryFee,
      );
      expect(
        [order.subtotal, order.serviceFee, order.deliveryFee, order.total].every(Number.isInteger),
      ).toBe(true);

      for (const item of items) {
        expect(item.lineTotal).toBe(item.quantity * item.unitPrice);
        expect(Number.isInteger(item.unitPrice)).toBe(true);
        expect(Number.isInteger(item.lineTotal)).toBe(true);
      }
    }
  });

  it("keeps each order item's allocated quantity reconciled", () => {
    for (const item of seedState.orderItems) {
      const allocated = seedState.allocations
        .filter(
          (allocation) =>
            allocation.orderItemId === item.id && allocation.status !== "cancelled",
        )
        .reduce((sum, allocation) => sum + allocation.quantity, 0);

      expect(allocated, `allocated quantity for order item ${item.id}`).toBe(item.allocatedQuantity);
    }
  });

  it("supports farmer-isolated views for multi-supplier orders", () => {
    const multiSupplierOrders = seedState.orders.filter((order) => {
      const farmerIds = new Set(
        seedState.allocations
          .filter((allocation) => order.allocationIds.includes(allocation.id))
          .map((allocation) => allocation.farmerOrganisationId),
      );
      return farmerIds.size > 1;
    });

    expect(multiSupplierOrders.length).toBeGreaterThan(0);

    for (const order of multiSupplierOrders) {
      const orderAllocations = seedState.allocations.filter((allocation) =>
        order.allocationIds.includes(allocation.id),
      );
      const farmerIds = new Set(
        orderAllocations.map((allocation) => allocation.farmerOrganisationId),
      );

      for (const farmerOrganisationId of farmerIds) {
        const visibleAllocations = orderAllocations.filter(
          (allocation) => allocation.farmerOrganisationId === farmerOrganisationId,
        );
        const competingAllocationIds = new Set(
          orderAllocations
            .filter((allocation) => allocation.farmerOrganisationId !== farmerOrganisationId)
            .map((allocation) => allocation.id),
        );
        const farmerOrderItemIds = new Set(
          visibleAllocations
            .map((allocation) => allocation.orderItemId)
            .filter((id): id is string => Boolean(id)),
        );
        const visibleOrderItems = seedState.orderItems.filter((item) =>
          farmerOrderItemIds.has(item.id),
        );

        expect(visibleAllocations.length).toBeGreaterThan(0);
        expect(
          visibleAllocations.every(
            (allocation) => allocation.farmerOrganisationId === farmerOrganisationId,
          ),
        ).toBe(true);
        expect(
          visibleAllocations.some((allocation) => competingAllocationIds.has(allocation.id)),
        ).toBe(false);
        expect(
          visibleOrderItems.every((item) => farmerOrderItemIds.has(item.id)),
        ).toBe(true);

        for (const allocation of visibleAllocations as FulfilmentAllocation[]) {
          expect(allocation).not.toHaveProperty("buyerOrganisationId");
          expect(allocation).not.toHaveProperty("paymentStatus");
          expect(allocation).not.toHaveProperty("transactionReference");
          expect(allocation).not.toHaveProperty("otherFarmerAllocations");
        }
      }
    }
  });
});
