import { beforeEach, describe, expect, it } from "vitest";

import {
  consumeCopilotRateLimit,
  COPILOT_RATE_LIMIT,
  resetCopilotRateLimitForTests,
} from "./rate-limit";

describe("copilot rate limiter", () => {
  beforeEach(() => {
    resetCopilotRateLimitForTests();
  });

  it("allows ten requests and rejects the eleventh within a minute", () => {
    const now = 1_000_000;

    for (let index = 0; index < COPILOT_RATE_LIMIT.requests; index += 1) {
      expect(consumeCopilotRateLimit("client-a", now).allowed).toBe(true);
    }

    const rejected = consumeCopilotRateLimit("client-a", now);
    expect(rejected.allowed).toBe(false);
    expect(rejected.remaining).toBe(0);
    expect(rejected.retryAfterSeconds).toBe(60);
  });

  it("uses separate client buckets", () => {
    const now = 2_000_000;
    for (let index = 0; index < COPILOT_RATE_LIMIT.requests; index += 1) {
      consumeCopilotRateLimit("client-a", now);
    }

    expect(consumeCopilotRateLimit("client-b", now).allowed).toBe(true);
  });

  it("opens a fresh window after sixty seconds", () => {
    const now = 3_000_000;
    for (let index = 0; index <= COPILOT_RATE_LIMIT.requests; index += 1) {
      consumeCopilotRateLimit("client-a", now);
    }

    const reset = consumeCopilotRateLimit(
      "client-a",
      now + COPILOT_RATE_LIMIT.windowMs,
    );
    expect(reset.allowed).toBe(true);
    expect(reset.remaining).toBe(COPILOT_RATE_LIMIT.requests - 1);
  });
});
