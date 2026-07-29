import { describe, expect, it, vi } from "vitest";

import { createSeedState } from "@/lib/seed-data";

vi.mock("server-only", () => ({}));

import { validateDomainState } from "./state-validation";

function validationText(value: ReturnType<typeof validateDomainState>) {
  return value.success ? "" : JSON.stringify(value.fieldErrors);
}

describe("database state validation", () => {
  it("accepts the deterministic Cameroon pilot state", () => {
    expect(validateDomainState(createSeedState())).toEqual({
      success: true,
      state: createSeedState(),
    });
  });

  it("rejects duplicate records and broken foreign-key references", () => {
    const state = createSeedState();
    state.listings.push({ ...state.listings[0] });
    state.demands[0].buyerOrganisationId = crypto.randomUUID();

    const result = validateDomainState(state);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.values(result.fieldErrors).flat().join(" ")).toMatch(
      /Duplicate entity id|missing id/,
    );
  });

  it("rejects impossible listing reservations before a transaction starts", () => {
    const state = createSeedState();
    state.listings[0].reservedQuantity =
      state.listings[0].availableQuantity + 1;

    const result = validateDomainState(state);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(Object.values(result.fieldErrors).flat().join(" ")).toContain(
      "reserves more than its available quantity",
    );
  });

  it("mirrors PostgreSQL money, int32, rate, and order-total checks", () => {
    const state = createSeedState();
    state.listings[0].unitPrice = 0;
    state.quotes[0].unitPrice = 0;
    state.allocations[0].farmerUnitPrice = 0;
    state.payments[0].amount = 0;
    state.orders[0].serviceFee = 2_147_483_648;
    state.orders[1].total += 1;
    state.organisations[0].performance.cancellationRate = 101;
    state.organisations[1].performance.averageRating = 5.1;

    const text = validationText(validateDomainState(state));

    expect(text).toContain("listings.0.unitPrice");
    expect(text).toContain("quotes.0.unitPrice");
    expect(text).toContain("allocations.0.farmerUnitPrice");
    expect(text).toContain("payments.0.amount");
    expect(text).toContain("orders.0.serviceFee");
    expect(text).toContain("total must equal subtotal");
    expect(text).toContain("cancellationRate");
    expect(text).toContain("averageRating");
  });

  it("mirrors notification pairing and resolved-dispute checks", () => {
    const state = createSeedState();
    state.notifications[0].entityId = undefined;
    state.notifications[1].readAt = new Date().toISOString();
    state.disputes[1].resolution = undefined;
    state.disputes[1].resolvedBy = undefined;
    state.disputes[1].resolvedAt = undefined;

    const text = validationText(validateDomainState(state));

    expect(text).toContain(
      "entityType and entityId must be supplied together",
    );
    expect(text).toContain("with readAt must have read status");
    expect(text).toContain(
      "requires resolution, resolvedBy, and resolvedAt",
    );
  });

  it("rejects unique-key and one-open-dispute conflicts before SQL", () => {
    const state = createSeedState();
    state.listings[1].reference = state.listings[0].reference;
    state.payments[1].transactionReference =
      state.payments[0].transactionReference;
    state.disputes[1].orderId = state.disputes[0].orderId;
    state.disputes[1].affectedOrderItemIds = [
      ...state.disputes[0].affectedOrderItemIds,
    ];
    state.disputes[1].status = "under_review";

    const text = validationText(validateDomainState(state));

    expect(text).toContain("listing.reference must be unique");
    expect(text).toContain(
      "payment.transactionReference must be unique",
    );
    expect(text).toContain("cannot have more than one open dispute");
  });

  it("mirrors cross-column product, listing, allocation, item, and shipment checks", () => {
    const state = createSeedState();
    state.products[0].defaultUnit = "tray";
    state.listings[0].minOrderQuantity =
      state.listings[0].availableQuantity + 1;
    state.listings[1].availableUntil = "2026-01-01";
    state.orderItems[0].allocatedQuantity =
      state.orderItems[0].quantity + 1;
    state.allocations[1].orderId = undefined;
    state.shipments[0].plannedPickupAt = "2026-07-23T10:00:00.000Z";
    state.shipments[0].expectedDeliveryAt =
      "2026-07-23T09:00:00.000Z";

    const text = validationText(validateDomainState(state));

    expect(text).toContain(
      "default unit must be present in allowedUnits",
    );
    expect(text).toContain(
      "minimum order quantity exceeds its available quantity",
    );
    expect(text).toContain("availability ends before it starts");
    expect(text).toContain("allocated quantity exceeds its quantity");
    expect(text).toContain(
      "cannot reference an order item without an order",
    );
    expect(text).toContain("delivery cannot be expected before pickup");
  });
});
