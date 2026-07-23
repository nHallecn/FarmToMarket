import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";

import {
  COPILOT_REQUEST_LIMITS,
  CopilotRequestSchema,
  CopilotResultSchema,
} from "./schemas";

function validRequest() {
  return {
    role: "buyer",
    locale: "en",
    message: "Draft a demand for 250 kg of tomatoes.",
    history: [],
    context: {
      section: "Demand planning",
      organisationName: "Demo Hotel",
      currentDate: "2026-07-22",
      metrics: { openDemands: 2 },
      highlights: ["Two deliveries need review"],
      catalog: [
        {
          id: "product-tomato",
          name: "Tomato",
          defaultUnit: "kg",
          allowedUnits: ["kg", "crate"],
          grades: ["premium", "grade_a"],
        },
      ],
    },
  };
}

describe("CopilotRequestSchema", () => {
  it("accepts and trims a bounded request", () => {
    const request = validRequest();
    request.message = "  Help me prepare this demand.  ";

    const parsed = CopilotRequestSchema.parse(request);

    expect(parsed.message).toBe("Help me prepare this demand.");
  });

  it("rejects unknown fields at every object boundary", () => {
    const request = validRequest() as ReturnType<typeof validRequest> & {
      apiKey?: string;
    };
    request.apiKey = "must-not-be-accepted";
    request.context.catalog[0] = {
      ...request.context.catalog[0],
      phone: "+237600000000",
    } as (typeof request.context.catalog)[number];

    const parsed = CopilotRequestSchema.safeParse(request);

    expect(parsed.success).toBe(false);
  });

  it("enforces message and collection bounds", () => {
    const request = validRequest();
    request.message = "x".repeat(
      COPILOT_REQUEST_LIMITS.messageCharacters + 1,
    );
    request.context.highlights = Array.from(
      { length: COPILOT_REQUEST_LIMITS.highlightItems + 1 },
      (_, index) => `Highlight ${index}`,
    );

    const parsed = CopilotRequestSchema.safeParse(request);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining(["message", "context.highlights"]),
      );
    }
  });

  it("rejects impossible dates and inconsistent catalog units", () => {
    const request = validRequest();
    request.context.currentDate = "2026-02-30";
    request.context.catalog[0].defaultUnit = "tonne";

    const parsed = CopilotRequestSchema.safeParse(request);

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join("."))).toEqual(
        expect.arrayContaining([
          "context.currentDate",
          "context.catalog.0.defaultUnit",
        ]),
      );
    }
  });
});

describe("CopilotResultSchema", () => {
  it("converts to a strict Responses API structured-output format", () => {
    const format = zodTextFormat(
      CopilotResultSchema,
      "farm_to_market_copilot",
    );

    expect(format).toMatchObject({
      type: "json_schema",
      name: "farm_to_market_copilot",
      strict: true,
    });
  });

  it("requires every nullable draft field while accepting null values", () => {
    const parsed = CopilotResultSchema.safeParse({
      title: "Demand draft",
      answer: "Review this draft before submitting it.",
      actions: [],
      risks: [],
      followUpQuestions: [],
      draft: {
        kind: "none",
        title: null,
        productName: null,
        productId: null,
        quantity: null,
        unit: null,
        grade: null,
        date: null,
        priceFcfa: null,
        recurring: null,
        notes: null,
      },
      confidence: "medium",
      disclaimer: "Review AI-generated guidance before acting.",
    });

    expect(parsed.success).toBe(true);
  });
});
