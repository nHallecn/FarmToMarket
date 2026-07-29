import "server-only";

import { createHmac } from "node:crypto";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";

import type {
  CopilotDraft,
  CopilotLocale,
  CopilotRequest,
  CopilotResult,
} from "./copilot-contract";
import {
  buildCopilotInstructions,
  buildUntrustedProviderInput,
} from "./prompts";
import { CopilotResultSchema } from "./schemas";

export const DEFAULT_COPILOT_MODEL = "gpt-5.6-sol";
const MODERATION_MODEL = "omni-moderation-latest";
const MAX_OUTPUT_TOKENS = 1_600;

export type CopilotServiceErrorKind =
  | "not_configured"
  | "blocked"
  | "invalid_response"
  | "provider_limited"
  | "unavailable";

export class CopilotServiceError extends Error {
  constructor(readonly kind: CopilotServiceErrorKind) {
    super(kind);
    this.name = "CopilotServiceError";
  }
}

function providerStatus(error: unknown) {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return null;
  }
  return typeof error.status === "number" ? error.status : null;
}

let cachedClient: OpenAI | undefined;
let cachedApiKey: string | undefined;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new CopilotServiceError("not_configured");
  }

  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new OpenAI({
      apiKey,
      maxRetries: 1,
      timeout: 25_000,
    });
    cachedApiKey = apiKey;
  }

  return { client: cachedClient, apiKey };
}

function safetyIdentifier(clientFingerprint: string, apiKey: string) {
  const salt = process.env.OPENAI_SAFETY_SALT?.trim() || apiKey;
  const digest = createHmac("sha256", salt)
    .update(clientFingerprint)
    .digest("hex")
    .slice(0, 48);
  return `ftm_${digest}`;
}

function emptyDraft(): CopilotDraft {
  return {
    kind: "none",
    title: null,
    productName: null,
    productId: null,
    quantity: null,
    unit: null,
    grade: null,
    date: null,
    priceFcfa: null,
    recurring: null,
    notes: null,
  };
}

function extractExplicitFcfaAmounts(request: CopilotRequest) {
  const userText = [
    ...request.history
      .filter((message) => message.role === "user")
      .map((message) => message.content),
    request.message,
  ].join("\n");
  const amounts = new Set<number>();
  const patterns = [
    /(?:\b(?:xaf|fcfa|cfa)\b)\s*[:=]?\s*([0-9][0-9\s.,]*)/gi,
    /([0-9][0-9\s.,]*)\s*(?:\b(?:xaf|fcfa|cfa)\b)/gi,
  ];

  for (const pattern of patterns) {
    for (const match of userText.matchAll(pattern)) {
      const normalized = match[1]?.replace(/[\s.,]/g, "");
      if (!normalized) continue;
      const amount = Number(normalized);
      if (Number.isSafeInteger(amount) && amount > 0) amounts.add(amount);
    }
  }

  return amounts;
}

function stableDisclaimer(locale: CopilotLocale) {
  return locale === "fr"
    ? "Conseil généré par l’IA à partir des seules informations affichées. Vérifiez-le avant d’agir ; aucune transaction ni action externe n’a été effectuée."
    : "AI-generated guidance based only on the information shown. Review it before acting; no transaction or external action has been performed.";
}

export function normalizeCopilotResult(
  result: CopilotResult,
  request: CopilotRequest,
): CopilotResult {
  const expectedKind = {
    buyer: "demand",
    farmer: "listing",
    operations: "operations_brief",
  }[request.role] as CopilotDraft["kind"];

  if (result.draft.kind !== "none" && result.draft.kind !== expectedKind) {
    return {
      ...result,
      draft: emptyDraft(),
      disclaimer: stableDisclaimer(request.locale),
    };
  }

  let draft = { ...result.draft };
  if (draft.kind !== "none" && request.role !== "operations") {
    const product = request.context.catalog.find(
      (candidate) =>
        candidate.id === draft.productId ||
        candidate.name.toLocaleLowerCase() ===
          draft.productName?.toLocaleLowerCase(),
    );

    if (!product) {
      draft = {
        ...draft,
        productId: null,
        productName: null,
        unit: null,
        grade: null,
      };
    } else {
      draft.productId = product.id;
      draft.productName = product.name;
      if (draft.unit && !product.allowedUnits.includes(draft.unit)) {
        draft.unit = null;
      }
      if (draft.grade && !product.grades.includes(draft.grade)) {
        draft.grade = null;
      }
    }
  }

  if (request.role === "operations") {
    draft = {
      ...draft,
      productId: null,
      productName: null,
      quantity: null,
      unit: null,
      grade: null,
      priceFcfa: null,
      recurring: null,
    };
  } else if (
    draft.priceFcfa !== null &&
    !extractExplicitFcfaAmounts(request).has(draft.priceFcfa)
  ) {
    draft.priceFcfa = null;
  }

  return {
    ...result,
    draft,
    disclaimer: stableDisclaimer(request.locale),
  };
}

export async function generateCopilotResult(
  request: CopilotRequest,
  clientFingerprint: string,
) {
  const { client, apiKey } = getOpenAIClient();
  const model = process.env.OPENAI_MODEL?.trim() || DEFAULT_COPILOT_MODEL;
  const input = buildUntrustedProviderInput(request);

  try {
    const moderation = await client.moderations.create({
      model: MODERATION_MODEL,
      input,
    });

    if (moderation.results.some((result) => result.flagged)) {
      throw new CopilotServiceError("blocked");
    }

    const response = await client.responses.parse({
      model,
      instructions: buildCopilotInstructions(request.role, request.locale),
      input,
      text: {
        format: zodTextFormat(CopilotResultSchema, "farm_to_market_copilot"),
        verbosity: "low",
      },
      reasoning: { effort: "low" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      safety_identifier: safetyIdentifier(clientFingerprint, apiKey),
      store: false,
    });

    const parsed = response.output_parsed;
    if (!parsed) {
      throw new CopilotServiceError("invalid_response");
    }

    return {
      result: normalizeCopilotResult(parsed, request),
      model: response.model || model,
    };
  } catch (error) {
    if (error instanceof CopilotServiceError) throw error;
    const status = providerStatus(error);
    if (status === 401 || status === 403) {
      throw new CopilotServiceError("not_configured");
    }
    if (status === 429) {
      throw new CopilotServiceError("provider_limited");
    }
    throw new CopilotServiceError("unavailable");
  }
}
