import { z } from "zod";

import {
  COPILOT_CONFIDENCE_LEVELS,
  COPILOT_DRAFT_KINDS,
  COPILOT_LOCALES,
  COPILOT_MESSAGE_ROLES,
  COPILOT_PRIORITIES,
  COPILOT_ROLES,
  type CopilotRequest,
  type CopilotResult,
} from "./copilot-contract";

export const COPILOT_REQUEST_LIMITS = {
  bodyBytes: 32_768,
  messageCharacters: 1_200,
  historyItems: 6,
  historyCharacters: 1_600,
  highlightItems: 8,
  highlightCharacters: 180,
  catalogItems: 24,
  metricItems: 24,
  metricKeyCharacters: 40,
  sectionCharacters: 80,
  organisationCharacters: 120,
} as const;

export const COMMERCIAL_UNITS = [
  "kg",
  "tonne",
  "bag_50kg",
  "crate",
  "basket",
  "bunch",
  "tray",
] as const;

export const PRODUCE_GRADES = [
  "premium",
  "grade_a",
  "grade_b",
  "standard",
] as const;

const boundedText = (maximum: number, label: string) =>
  z
    .string({ error: `${label} must be text.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(maximum, `${label} must contain at most ${maximum} characters.`);

const isoDateSchema = z
  .string({ error: "Current date must be text." })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date in YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(parsed.getTime()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a real calendar date in YYYY-MM-DD format.");

const uniqueValues = <T>(values: T[]) => new Set(values).size === values.length;

const productContextSchema = z
  .object({
    id: boundedText(80, "Product ID"),
    name: boundedText(120, "Product name"),
    defaultUnit: z.enum(COMMERCIAL_UNITS),
    allowedUnits: z
      .array(z.enum(COMMERCIAL_UNITS), {
        error: "Allowed units must be a list.",
      })
      .min(1, "Include at least one allowed unit.")
      .max(COMMERCIAL_UNITS.length)
      .refine(uniqueValues, "Allowed units must not contain duplicates."),
    grades: z
      .array(z.enum(PRODUCE_GRADES), {
        error: "Grades must be a list.",
      })
      .min(1, "Include at least one grade.")
      .max(PRODUCE_GRADES.length)
      .refine(uniqueValues, "Grades must not contain duplicates."),
  })
  .strict()
  .superRefine((product, context) => {
    if (!product.allowedUnits.includes(product.defaultUnit)) {
      context.addIssue({
        code: "custom",
        path: ["defaultUnit"],
        message: "The default unit must also be an allowed unit.",
      });
    }
  });

const metricsSchema = z
  .record(
    z
      .string()
      .trim()
      .min(1, "Metric names cannot be empty.")
      .max(
        COPILOT_REQUEST_LIMITS.metricKeyCharacters,
        `Metric names must contain at most ${COPILOT_REQUEST_LIMITS.metricKeyCharacters} characters.`,
      ),
    z
      .number({ error: "Metric values must be numbers." })
      .finite("Metric values must be finite numbers.")
      .min(-1_000_000_000)
      .max(1_000_000_000),
  )
  .superRefine((metrics, context) => {
    if (Object.keys(metrics).length > COPILOT_REQUEST_LIMITS.metricItems) {
      context.addIssue({
        code: "too_big",
        origin: "object",
        maximum: COPILOT_REQUEST_LIMITS.metricItems,
        inclusive: true,
        path: [],
        message: `Include at most ${COPILOT_REQUEST_LIMITS.metricItems} metrics.`,
      });
    }
  });

export const CopilotRequestSchema = z
  .object({
    role: z.enum(COPILOT_ROLES),
    locale: z.enum(COPILOT_LOCALES),
    message: boundedText(
      COPILOT_REQUEST_LIMITS.messageCharacters,
      "Message",
    ),
    history: z
      .array(
        z
          .object({
            role: z.enum(COPILOT_MESSAGE_ROLES),
            content: boundedText(
              COPILOT_REQUEST_LIMITS.historyCharacters,
              "History message",
            ),
          })
          .strict(),
        { error: "History must be a list." },
      )
      .max(
        COPILOT_REQUEST_LIMITS.historyItems,
        `Include at most ${COPILOT_REQUEST_LIMITS.historyItems} history messages.`,
      ),
    context: z
      .object({
        section: boundedText(
          COPILOT_REQUEST_LIMITS.sectionCharacters,
          "Section",
        ),
        organisationName: boundedText(
          COPILOT_REQUEST_LIMITS.organisationCharacters,
          "Organisation name",
        ),
        currentDate: isoDateSchema,
        metrics: metricsSchema,
        highlights: z
          .array(
            boundedText(
              COPILOT_REQUEST_LIMITS.highlightCharacters,
              "Highlight",
            ),
            { error: "Highlights must be a list." },
          )
          .max(
            COPILOT_REQUEST_LIMITS.highlightItems,
            `Include at most ${COPILOT_REQUEST_LIMITS.highlightItems} highlights.`,
          ),
        catalog: z
          .array(productContextSchema, {
            error: "Catalog must be a list.",
          })
          .max(
            COPILOT_REQUEST_LIMITS.catalogItems,
            `Include at most ${COPILOT_REQUEST_LIMITS.catalogItems} products.`,
          ),
      })
      .strict()
      .superRefine((contextValue, context) => {
        const productIds = contextValue.catalog.map((product) => product.id);
        if (!uniqueValues(productIds)) {
          context.addIssue({
            code: "custom",
            path: ["catalog"],
            message: "Catalog product IDs must be unique.",
          });
        }
      }),
  })
  .strict();

const resultDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

export const CopilotResultSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    answer: z.string().trim().min(1).max(1_500),
    actions: z
      .array(
        z
          .object({
            label: z.string().trim().min(1).max(80),
            detail: z.string().trim().min(1).max(240),
            priority: z.enum(COPILOT_PRIORITIES),
          })
          .strict(),
      )
      .max(5),
    risks: z.array(z.string().trim().min(1).max(240)).max(5),
    followUpQuestions: z.array(z.string().trim().min(1).max(240)).max(4),
    draft: z
      .object({
        kind: z.enum(COPILOT_DRAFT_KINDS),
        title: z.string().trim().min(1).max(160).nullable(),
        productName: z.string().trim().min(1).max(120).nullable(),
        productId: z.string().trim().min(1).max(80).nullable(),
        quantity: z.number().finite().positive().max(1_000_000).nullable(),
        unit: z.enum(COMMERCIAL_UNITS).nullable(),
        grade: z.enum(PRODUCE_GRADES).nullable(),
        date: resultDateSchema,
        priceFcfa: z.number().int().positive().max(1_000_000_000).nullable(),
        recurring: z.boolean().nullable(),
        notes: z.string().trim().min(1).max(500).nullable(),
      })
      .strict(),
    confidence: z.enum(COPILOT_CONFIDENCE_LEVELS),
    disclaimer: z.string().trim().min(1).max(400),
  })
  .strict();

type ValidatedCopilotRequest = z.infer<typeof CopilotRequestSchema>;
type ValidatedCopilotResult = z.infer<typeof CopilotResultSchema>;

const requestTypeCheck: CopilotRequest = {} as ValidatedCopilotRequest;
const resultTypeCheck: CopilotResult = {} as ValidatedCopilotResult;
void requestTypeCheck;
void resultTypeCheck;
