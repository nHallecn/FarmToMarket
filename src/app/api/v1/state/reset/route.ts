import {
  dataResponse,
  errorResponse,
  getRequestId,
} from "@/lib/api-helpers";
import { createSeedState } from "@/lib/seed-data";
import { replaceDomainState } from "@/server/db/state-repository";
import {
  isSameOrigin,
  stateRouteError,
} from "@/server/db/state-http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  if (!isSameOrigin(request)) {
    return errorResponse({
      status: 403,
      code: "ORIGIN_FORBIDDEN",
      message: "Database resets must originate from this application.",
      requestId,
    });
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_RESET !== "true"
  ) {
    return errorResponse({
      status: 403,
      code: "DEMO_RESET_DISABLED",
      message:
        "Database reset is disabled in production. Set ALLOW_DEMO_RESET=true only for an intentional demo environment.",
      requestId,
    });
  }

  try {
    const state = await replaceDomainState(createSeedState(), {
      force: true,
    });
    return dataResponse(
      {
        state,
        persisted: true,
        reset: true,
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}
