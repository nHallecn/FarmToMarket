const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const LABELED_PHONE_PATTERN =
  /\b(phone|telephone|t[eé]l(?:[eé]phone)?|mobile|portable|whatsapp|contact)\s*[:=\-]?\s*(?:\+?\d[\d\s().-]{7,}\d)/gi;
const INTERNATIONAL_PHONE_PATTERN = /\+\d(?:[\d\s().-]{7,}\d)/g;

export function redactPersonalData(value: string) {
  return value
    .replace(EMAIL_PATTERN, "[email redacted]")
    .replace(LABELED_PHONE_PATTERN, (_match, label: string) =>
      `${label}: [phone redacted]`,
    )
    .replace(INTERNATIONAL_PHONE_PATTERN, "[phone redacted]");
}

export function redactUnknownStrings<T>(value: T): T {
  if (typeof value === "string") {
    return redactPersonalData(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactUnknownStrings(item)) as T;
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        redactUnknownStrings(item),
      ]),
    ) as T;
  }

  return value;
}

