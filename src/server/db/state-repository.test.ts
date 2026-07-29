import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { nextStateUpdatedAt } from "./state-repository";

describe("database state revision timestamps", () => {
  it("advances by at least one millisecond when the clock has not moved", () => {
    const previous = new Date("2026-07-29T12:00:00.500Z");

    expect(
      nextStateUpdatedAt(previous, previous.getTime()).toISOString(),
    ).toBe("2026-07-29T12:00:00.501Z");
  });

  it("uses the current clock when it is later than the prior token", () => {
    const previous = new Date("2026-07-29T12:00:00.500Z");
    const now = new Date("2026-07-29T12:00:02.000Z");

    expect(
      nextStateUpdatedAt(previous, now.getTime()).toISOString(),
    ).toBe(now.toISOString());
  });
});
