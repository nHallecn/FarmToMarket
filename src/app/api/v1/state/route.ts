import {
  dataResponse,
  errorResponse,
  getRequestId,
} from "@/lib/api-helpers";
import {
  loadDomainState,
  replaceDomainState,
} from "@/server/db/state-repository";
import {
  isSameOrigin,
  isStateSyncBody,
  parseBoundedJsonBody,
  stateRouteError,
} from "@/server/db/state-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_STATE_READS !== "true"
  ) {
    return errorResponse({
      status: 403,
      code: "DEMO_STATE_READS_DISABLED",
      message:
        "The cross-role demo snapshot is disabled in production. Set ALLOW_DEMO_STATE_READS=true only for an intentional synthetic pilot.",
      requestId,
    });
  }

  try {
    const state = await loadDomainState();
    return dataResponse(
      {
        state,
        persisted: true,
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = getRequestId(request);
  if (!isSameOrigin(request)) {
    return errorResponse({
      status: 403,
      code: "ORIGIN_FORBIDDEN",
      message: "State updates must originate from this application.",
      requestId,
    });
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_STATE_WRITES !== "true"
  ) {
    return errorResponse({
      status: 403,
      code: "DEMO_STATE_WRITES_DISABLED",
      message:
        "Full-state demo writes are disabled in production. Set ALLOW_DEMO_STATE_WRITES=true only for an intentional demo environment.",
      requestId,
    });
  }

  const parsed = await parseBoundedJsonBody(request);
  if (!parsed.ok) {
    return errorResponse({
      status: parsed.status,
      code: parsed.code,
      message: parsed.message,
      fieldErrors: parsed.fieldErrors,
      requestId,
    });
  }

  if (!isStateSyncBody(parsed.value)) {
    return errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message:
        "The request must contain state and expectedUpdatedAt fields.",
      fieldErrors: {
        body: [
          "Use { state: DomainState, expectedUpdatedAt: ISO timestamp }.",
        ],
      },
      requestId,
    });
  }

  const expectedDate = new Date(parsed.value.expectedUpdatedAt);
  if (
    Number.isNaN(expectedDate.getTime()) ||
    expectedDate.toISOString() !== parsed.value.expectedUpdatedAt
  ) {
    return errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "expectedUpdatedAt must be a canonical ISO timestamp.",
      fieldErrors: {
        expectedUpdatedAt: [
          "Use the updatedAt value returned by the last state request.",
        ],
      },
      requestId,
    });
  }

  try {
    const state = await replaceDomainState(parsed.value.state, {
      expectedUpdatedAt: parsed.value.expectedUpdatedAt,
    });
    return dataResponse(
      {
        state,
        persisted: true,
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}
