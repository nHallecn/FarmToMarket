export type FieldErrors = Record<string, string[]>;

type ErrorOptions = {
  status: number;
  code: string;
  message: string;
  requestId: string;
  fieldErrors?: FieldErrors;
};

type SuccessOptions = {
  status?: number;
  requestId: string;
  headers?: HeadersInit;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseHeaders(requestId: string, headers?: HeadersInit) {
  const result = new Headers(headers);
  result.set("cache-control", "no-store");
  result.set("x-request-id", requestId);
  return result;
}

export function getRequestId(request: Request) {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && uuidPattern.test(supplied) ? supplied : crypto.randomUUID();
}

export function dataResponse<T>(data: T, options: SuccessOptions) {
  return Response.json(
    { data },
    {
      status: options.status ?? 200,
      headers: responseHeaders(options.requestId, options.headers),
    },
  );
}

export function errorResponse({
  status,
  code,
  message,
  requestId,
  fieldErrors = {},
}: ErrorOptions) {
  return Response.json(
    { code, message, fieldErrors, requestId },
    {
      status,
      headers: responseHeaders(requestId),
    },
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function addFieldError(
  errors: FieldErrors,
  field: string,
  message: string,
) {
  (errors[field] ??= []).push(message);
}
