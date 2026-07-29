import { describe, expect, it, vi } from "vitest";

import { Prisma } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

import {
  parseBoundedJsonBody,
  stateRouteError,
} from "./state-http";

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("constraint failure", {
    code,
    clientVersion: "7.9.1",
  });
}

describe("database state HTTP boundary", () => {
  it.each([
    ["P2002", 409, "UNIQUE_CONSTRAINT_CONFLICT"],
    ["P2003", 422, "RELATION_CONSTRAINT_VIOLATION"],
    ["P2004", 422, "DATABASE_CONSTRAINT_VIOLATION"],
  ])("maps %s to a client-actionable response", async (code, status, bodyCode) => {
    const response = stateRouteError(
      prismaError(code),
      crypto.randomUUID(),
    );

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({
      code: bodyCode,
    });
  });

  it("stops reading JSON after the route-specific byte limit", async () => {
    const response = await parseBoundedJsonBody(
      new Request("http://localhost/api/v1/demands", {
        method: "POST",
        body: JSON.stringify({ payload: "x".repeat(256) }),
      }),
      128,
    );

    expect(response).toMatchObject({
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
    });
  });
});
