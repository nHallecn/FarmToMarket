import {
  addFieldError,
  dataResponse,
  errorResponse,
  getRequestId,
  type FieldErrors,
} from "@/lib/api-helpers";
import {
  CopilotServiceError,
  generateCopilotResult,
} from "@/lib/ai/copilot-service";
import {
  consumeCopilotRateLimit,
  COPILOT_RATE_LIMIT,
} from "@/lib/ai/rate-limit";
import {
  BoundedJsonError,
  getClientFingerprint,
  readBoundedJson,
} from "@/lib/ai/request-utils";
import {
  COPILOT_REQUEST_LIMITS,
  CopilotRequestSchema,
} from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function validationErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path.length > 0 ? issue.path.join(".") : "body";
    addFieldError(errors, field, issue.message);
  }
  return errors;
}

function boundedJsonErrorResponse(error: BoundedJsonError, requestId: string) {
  if (error.kind === "unsupported_media_type") {
    return errorResponse({
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Send the copilot request as application/json.",
      requestId,
    });
  }

  if (error.kind === "payload_too_large") {
    return errorResponse({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "The copilot request is too large. Shorten it and try again.",
      requestId,
    });
  }

  return errorResponse({
    status: 400,
    code: "INVALID_JSON",
    message: "The request body must contain valid JSON.",
    requestId,
  });
}

function serviceErrorResponse(error: CopilotServiceError, requestId: string) {
  if (error.kind === "not_configured") {
    return errorResponse({
      status: 503,
      code: "AI_NOT_CONFIGURED",
      message: "The AI assistant is not configured yet. Please try again later.",
      requestId,
    });
  }

  if (error.kind === "blocked") {
    return errorResponse({
      status: 422,
      code: "CONTENT_NOT_SUPPORTED",
      message:
        "That request cannot be processed. Try asking about FarmToMarket sourcing, listings, or operations.",
      requestId,
    });
  }

  if (error.kind === "invalid_response") {
    return errorResponse({
      status: 502,
      code: "AI_RESPONSE_UNAVAILABLE",
      message: "The AI assistant could not prepare a safe response. Please try again.",
      requestId,
    });
  }

  if (error.kind === "provider_limited") {
    return errorResponse({
      status: 429,
      code: "AI_PROVIDER_LIMITED",
      message:
        "The OpenAI account is rate-limited or out of quota. Review API usage and billing, or try again later.",
      requestId,
    });
  }

  return errorResponse({
    status: 503,
    code: "AI_TEMPORARILY_UNAVAILABLE",
    message: "The AI assistant is temporarily unavailable. Please try again shortly.",
    requestId,
  });
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const clientFingerprint = getClientFingerprint(request);
  const rateLimit = consumeCopilotRateLimit(clientFingerprint);

  if (!rateLimit.allowed) {
    const response = errorResponse({
      status: 429,
      code: "RATE_LIMITED",
      message: `Too many copilot requests. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      requestId,
    });
    response.headers.set("retry-after", String(rateLimit.retryAfterSeconds));
    response.headers.set("x-ratelimit-limit", String(COPILOT_RATE_LIMIT.requests));
    response.headers.set("x-ratelimit-remaining", "0");
    return response;
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, COPILOT_REQUEST_LIMITS.bodyBytes);
  } catch (error) {
    if (error instanceof BoundedJsonError) {
      return boundedJsonErrorResponse(error, requestId);
    }
    return errorResponse({
      status: 400,
      code: "INVALID_REQUEST",
      message: "The copilot request could not be read.",
      requestId,
    });
  }

  const parsed = CopilotRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "The copilot request contains invalid fields.",
      fieldErrors: validationErrors(parsed.error.issues),
      requestId,
    });
  }

  try {
    const result = await generateCopilotResult(parsed.data, clientFingerprint);
    return dataResponse(result, { requestId });
  } catch (error) {
    if (error instanceof CopilotServiceError) {
      return serviceErrorResponse(error, requestId);
    }
    return errorResponse({
      status: 503,
      code: "AI_TEMPORARILY_UNAVAILABLE",
      message: "The AI assistant is temporarily unavailable. Please try again shortly.",
      requestId,
    });
  }
}
