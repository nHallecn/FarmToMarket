import type { CommercialUnit, ProduceGrade } from "@/lib/domain";

export const COPILOT_ROLES = ["buyer", "farmer", "operations"] as const;
export const COPILOT_LOCALES = ["en", "fr"] as const;
export const COPILOT_MESSAGE_ROLES = ["user", "assistant"] as const;
export const COPILOT_PRIORITIES = ["urgent", "recommended", "monitor"] as const;
export const COPILOT_DRAFT_KINDS = [
  "none",
  "demand",
  "listing",
  "operations_brief",
] as const;
export const COPILOT_CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export type CopilotRole = (typeof COPILOT_ROLES)[number];
export type CopilotLocale = (typeof COPILOT_LOCALES)[number];
export type CopilotMessageRole = (typeof COPILOT_MESSAGE_ROLES)[number];
export type CopilotPriority = (typeof COPILOT_PRIORITIES)[number];
export type CopilotDraftKind = (typeof COPILOT_DRAFT_KINDS)[number];
export type CopilotConfidence = (typeof COPILOT_CONFIDENCE_LEVELS)[number];

export interface CopilotProductContext {
  id: string;
  name: string;
  defaultUnit: CommercialUnit;
  allowedUnits: CommercialUnit[];
  grades: ProduceGrade[];
}

export interface CopilotContext {
  section: string;
  organisationName: string;
  currentDate: string;
  metrics: Record<string, number>;
  highlights: string[];
  catalog: CopilotProductContext[];
}

export interface CopilotMessage {
  role: CopilotMessageRole;
  content: string;
}

export interface CopilotRequest {
  role: CopilotRole;
  locale: CopilotLocale;
  message: string;
  history: CopilotMessage[];
  context: CopilotContext;
}

export interface CopilotAction {
  label: string;
  detail: string;
  priority: CopilotPriority;
}

export interface CopilotDraft {
  kind: CopilotDraftKind;
  title: string | null;
  productName: string | null;
  productId: string | null;
  quantity: number | null;
  unit: CommercialUnit | null;
  grade: ProduceGrade | null;
  date: string | null;
  priceFcfa: number | null;
  recurring: boolean | null;
  notes: string | null;
}

export interface CopilotResult {
  title: string;
  answer: string;
  actions: CopilotAction[];
  risks: string[];
  followUpQuestions: string[];
  draft: CopilotDraft;
  confidence: CopilotConfidence;
  disclaimer: string;
}

export interface CopilotSuccessPayload {
  data: {
    result: CopilotResult;
    model: string;
  };
}

export interface CopilotErrorPayload {
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}
