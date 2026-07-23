import { describe, expect, it } from "vitest";
import { deriveDashboardMetrics, type CommercialUnit } from "../../lib/domain";
import type { CopilotDraft } from "../../lib/ai/copilot-contract";
import { createSeedState } from "../../lib/seed-data";
import { buildCopilotContext, validateCopilotDraft } from "./ai-copilot-context";

describe("buildCopilotContext", () => {
  it("builds a bounded context without contact, payment-reference, or evidence data", () => {
    const state = createSeedState();
    const context = buildCopilotContext({
      state,
      metrics: deriveDashboardMetrics(state),
      role: "operations",
      locale: "en",
      section: "dashboard".repeat(20),
      organisationId: state.organisations[0]?.id,
    });
    const serialized = JSON.stringify(context);
    const privateValues = [
      ...state.organisations.flatMap((organisation) => [organisation.phone, organisation.email]),
      ...state.users.flatMap((user) => [user.phone, user.email]),
      ...state.payments.map((payment) => payment.transactionReference),
      ...state.disputes.flatMap((dispute) =>
        dispute.evidence.map((evidence) => evidence.url),
      ),
      ...state.shipments.flatMap((shipment) =>
        shipment.pickupStops.map((stop) => stop.proofUrl),
      ),
    ].filter((value): value is string => typeof value === "string" && value.length > 3);

    expect(context.section.length).toBeLessThanOrEqual(80);
    expect(context.organisationName.length).toBeLessThanOrEqual(120);
    expect(context.highlights.length).toBeLessThanOrEqual(8);
    expect(context.highlights.every((highlight) => highlight.length <= 180)).toBe(true);
    expect(context.catalog.length).toBeLessThanOrEqual(24);
    expect(context.catalog.every((product) => product.id.length <= 80 && product.name.length <= 120)).toBe(true);
    expect(Object.keys(context.metrics).length).toBeLessThanOrEqual(24);
    expect(privateValues.every((value) => !serialized.includes(value))).toBe(true);
  });
});

describe("validateCopilotDraft", () => {
  const state = createSeedState();
  const product = state.products.find((candidate) => candidate.active) ?? state.products[0];
  if (!product) throw new Error("Seed catalogue requires at least one product.");

  const demand: CopilotDraft = {
    kind: "demand",
    title: "Weekly tomato demand",
    productName: product.name.en,
    productId: product.id,
    quantity: 100,
    unit: product.defaultUnit,
    grade: product.grades[0],
    date: "2026-07-30",
    priceFcfa: 650,
    recurring: false,
    notes: null,
  };

  it("accepts a catalogue-aligned buyer demand", () => {
    const validation = validateCopilotDraft({
      draft: demand,
      products: state.products,
      role: "buyer",
      currentDate: "2026-07-22",
    });

    expect(validation.valid).toBe(true);
    expect(validation.issues).toEqual([]);
    expect(validation.product?.id).toBe(product.id);
  });

  it("rejects role mismatches, past dates, unsupported units, and zero-price listings", () => {
    const units: CommercialUnit[] = [
      "kg",
      "tonne",
      "bag_50kg",
      "crate",
      "basket",
      "bunch",
      "tray",
    ];
    const unsupportedUnit = units.find((unit) => !product.allowedUnits.includes(unit));
    expect(unsupportedUnit).toBeDefined();

    const validation = validateCopilotDraft({
      draft: {
        ...demand,
        kind: "listing",
        title: null,
        unit: unsupportedUnit ?? product.defaultUnit,
        date: "2026-07-21",
        priceFcfa: 0,
      },
      products: state.products,
      role: "buyer",
      currentDate: "2026-07-22",
    });

    expect(validation.valid).toBe(false);
    expect(validation.issues).toEqual(
      expect.arrayContaining(["role_mismatch", "unit_invalid", "date_past", "price_invalid"]),
    );
  });
});
