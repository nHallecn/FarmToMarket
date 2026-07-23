import { createHash } from "node:crypto";

export type BoundedJsonErrorKind =
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_json";

export class BoundedJsonError extends Error {
  constructor(readonly kind: BoundedJsonErrorKind) {
    super(kind);
    this.name = "BoundedJsonError";
  }
}

function contentLength(request: Request) {
  const value = request.headers.get("content-length");
  if (!value) return null;

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function readBoundedJson(request: Request, maximumBytes: number) {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();

  if (contentType !== "application/json") {
    throw new BoundedJsonError("unsupported_media_type");
  }

  const advertisedLength = contentLength(request);
  if (advertisedLength !== null && advertisedLength > maximumBytes) {
    throw new BoundedJsonError("payload_too_large");
  }

  const reader = request.body?.getReader();
  if (!reader) {
    throw new BoundedJsonError("invalid_json");
  }

  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytesRead = 0;
  let text = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maximumBytes) {
        await reader.cancel();
        throw new BoundedJsonError("payload_too_large");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof BoundedJsonError) throw error;
    throw new BoundedJsonError("invalid_json");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new BoundedJsonError("invalid_json");
  }
}

function firstForwardedAddress(request: Request) {
  return request.headers
    .get("x-forwarded-for")
    ?.split(",", 1)[0]
    ?.trim()
    .slice(0, 128);
}

export function getClientFingerprint(request: Request) {
  const address =
    firstForwardedAddress(request) ||
    request.headers.get("x-real-ip")?.trim().slice(0, 128) ||
    "unknown-address";
  const userAgent =
    request.headers.get("user-agent")?.trim().slice(0, 256) ||
    "unknown-agent";

  return createHash("sha256")
    .update(`farmtomarket-copilot-v1\0${address}\0${userAgent}`)
    .digest("hex");
}

