import "server-only";

import { Prisma } from "@/generated/prisma/client";
import {
  errorResponse,
  isRecord,
  type FieldErrors,
} from "@/lib/api-helpers";
import {
  DatabaseConfigurationError,
} from "@/server/db/prisma";
import {
  DatabaseNotSeededError,
  InvalidDomainStateError,
  StateConflictError,
} from "@/server/db/state-repository";

export const MAX_STATE_BODY_BYTES = 5 * 1024 * 1024;

export type ParsedBody =
  | { ok: true; value: unknown }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      fieldErrors?: FieldErrors;
    };

export function isSameOrigin(request: Request): boolean {
  const suppliedOrigin = request.headers.get("origin");
  if (!suppliedOrigin || suppliedOrigin === "null") {
    return false;
  }

  try {
    return (
      new URL(suppliedOrigin).origin === new URL(request.url).origin &&
      !["cross-site", "same-site"].includes(
        request.headers.get("sec-fetch-site") ?? "",
      )
    );
  } catch {
    return false;
  }
}

export async function parseBoundedJsonBody(
  request: Request,
  maximumBytes = MAX_STATE_BODY_BYTES,
): Promise<ParsedBody> {
  const limitLabel =
    maximumBytes >= 1024 * 1024
      ? `${maximumBytes / (1024 * 1024)} MiB`
      : `${maximumBytes / 1024} KiB`;
  const contentLength = request.headers.get("content-length");
  if (
    contentLength &&
    Number.isFinite(Number(contentLength)) &&
    Number(contentLength) > maximumBytes
  ) {
    return {
      ok: false,
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: `JSON payloads are limited to ${limitLabel}.`,
    };
  }

  let text = "";
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const decoder = new TextDecoder();
      let received = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        received += chunk.value.byteLength;
        if (received > maximumBytes) {
          await reader.cancel();
          return {
            ok: false,
            status: 413,
            code: "PAYLOAD_TOO_LARGE",
            message: `JSON payloads are limited to ${limitLabel}.`,
          };
        }
        text += decoder.decode(chunk.value, { stream: true });
      }
      text += decoder.decode();
    }
  } catch {
    return {
      ok: false,
      status: 400,
      code: "INVALID_BODY",
      message: "The request body could not be read.",
    };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      status: 400,
      code: "INVALID_JSON",
      message: "The request body must contain valid JSON.",
    };
  }
}

export function stateRouteError(
  error: unknown,
  requestId: string,
): Response {
  if (error instanceof StateConflictError) {
    return errorResponse({
      status: 409,
      code: "STATE_CONFLICT",
      message: error.message,
      fieldErrors: {
        expectedUpdatedAt: [
          error.currentUpdatedAt
            ? `The current database revision is ${error.currentUpdatedAt}.`
            : "The database has no current revision.",
        ],
      },
      requestId,
    });
  }

  if (error instanceof InvalidDomainStateError) {
    return errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: error.message,
      fieldErrors: error.fieldErrors,
      requestId,
    });
  }

  if (error instanceof DatabaseConfigurationError) {
    return errorResponse({
      status: 503,
      code: "DATABASE_NOT_CONFIGURED",
      message: error.message,
      requestId,
    });
  }

  if (error instanceof DatabaseNotSeededError) {
    return errorResponse({
      status: 503,
      code: "DATABASE_NOT_SEEDED",
      message: error.message,
      requestId,
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return errorResponse({
      status: 409,
      code: "UNIQUE_CONSTRAINT_CONFLICT",
      message:
        "The database already contains a record with one of the supplied unique values.",
      fieldErrors: {
        state: [
          "Reload the latest state and use unique references before retrying.",
        ],
      },
      requestId,
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    ["P2003", "P2004"].includes(error.code)
  ) {
    return errorResponse({
      status: 422,
      code:
        error.code === "P2003"
          ? "RELATION_CONSTRAINT_VIOLATION"
          : "DATABASE_CONSTRAINT_VIOLATION",
      message:
        error.code === "P2003"
          ? "One or more records reference an entity that does not exist."
          : "The supplied state violates a database domain constraint.",
      fieldErrors: {
        state: [
          "Reload the latest state and correct the invalid records before retrying.",
        ],
      },
      requestId,
    });
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientInitializationError
  ) {
    console.error("FarmToMarket database request failed", {
      requestId,
      name: error.name,
      code:
        error instanceof Prisma.PrismaClientKnownRequestError
          ? error.code
          : undefined,
    });
    return errorResponse({
      status: 503,
      code: "DATABASE_UNAVAILABLE",
      message:
        "The PostgreSQL database is unavailable. Check DATABASE_URL and the database service.",
      requestId,
    });
  }

  console.error("Unexpected FarmToMarket state request failure", {
    requestId,
    error,
  });
  return errorResponse({
    status: 500,
    code: "INTERNAL_ERROR",
    message: "The persistent application state could not be processed.",
    requestId,
  });
}

export function isStateSyncBody(
  value: unknown,
): value is { state: unknown; expectedUpdatedAt: string } {
  return (
    isRecord(value) &&
    "state" in value &&
    typeof value.expectedUpdatedAt === "string"
  );
}
