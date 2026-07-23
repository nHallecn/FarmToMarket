import { describe, expect, it } from "vitest";

import { redactPersonalData, redactUnknownStrings } from "./privacy";

describe("AI provider redaction", () => {
  it("redacts email addresses and labeled phone numbers", () => {
    const redacted = redactPersonalData(
      "Email buyer@example.com or WhatsApp: +237 699 123 456.",
    );

    expect(redacted).not.toContain("buyer@example.com");
    expect(redacted).not.toContain("699 123 456");
    expect(redacted).toContain("[email redacted]");
    expect(redacted).toContain("[phone redacted]");
  });

  it("preserves agricultural quantities, dates, and FCFA prices", () => {
    const text = "Deliver 1,250 kg on 2026-08-10 at 850 FCFA per kg.";

    expect(redactPersonalData(text)).toBe(text);
  });

  it("redacts strings recursively without changing numeric metrics", () => {
    const value = redactUnknownStrings({
      message: "Contact: 677 123 456",
      metrics: { openOrders: 12 },
      highlights: ["farmer@example.cm"],
    });

    expect(value.message).toContain("[phone redacted]");
    expect(value.metrics.openOrders).toBe(12);
    expect(value.highlights[0]).toBe("[email redacted]");
  });
});
