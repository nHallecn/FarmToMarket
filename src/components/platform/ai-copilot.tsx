"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  LoaderCircle,
  MessageCircleQuestion,
  Send,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import type {
  CopilotErrorPayload,
  CopilotMessage,
  CopilotResult,
  CopilotRole,
  CopilotSuccessPayload,
} from "@/lib/ai/copilot-contract";
import { formatFcfa } from "@/lib/domain";
import {
  addDays,
  buildCopilotContext,
  formatDraftGrade,
  formatDraftUnit,
  validateCopilotDraft,
  type DraftIssue,
} from "./ai-copilot-context";

const MAX_MESSAGE_LENGTH = 1_200;
const MAX_CONVERSATION_ENTRIES = 8;
const MAX_HISTORY_ENTRIES = 6;

interface ConversationEntry {
  id: string;
  role: "user" | "assistant";
  content: string;
  result?: CopilotResult;
  model?: string;
}

interface CopySet {
  open: string;
  title: string;
  subtitle: string;
  close: string;
  welcomeTitle: string;
  welcomeBody: string;
  promptLabel: string;
  placeholder: string;
  inputLabel: string;
  send: string;
  thinking: string;
  keyboardHint: string;
  privacy: string;
  reviewNotice: string;
  actions: string;
  risks: string;
  confidence: string;
  followUp: string;
  reviewDraft: string;
  confirmTitle: string;
  confirmBody: string;
  cancel: string;
  confirmSave: string;
  saving: string;
  savedDemand: string;
  savedListing: string;
  copyBrief: string;
  copied: string;
  copyFailed: string;
  product: string;
  quantity: string;
  unit: string;
  grade: string;
  date: string;
  price: string;
  recurrence: string;
  notes: string;
  yes: string;
  no: string;
  validationTitle: string;
  retry: string;
  unavailable: string;
  disclaimer: string;
}

const copySets: Record<"en" | "fr", CopySet> = {
  en: {
    open: "Ask FarmToMarket AI",
    title: "FarmToMarket Copilot",
    subtitle: "Practical help, grounded in this workspace",
    close: "Close Copilot",
    welcomeTitle: "What can I help you move forward?",
    welcomeBody:
      "Ask for a procurement draft, a clearer supply listing, or an operational priority brief.",
    promptLabel: "Try one of these",
    placeholder: "Ask about your next procurement, listing, or operation…",
    inputLabel: "Message FarmToMarket Copilot",
    send: "Send message",
    thinking: "Reviewing your workspace context…",
    keyboardHint: "Ctrl + Enter to send",
    privacy: "Only catalogue data and short operational summaries are shared with OpenAI.",
    reviewNotice: "AI suggestions can be incomplete. Review every recommendation before acting.",
    actions: "Recommended actions",
    risks: "Risks to review",
    confidence: "Confidence",
    followUp: "Continue the conversation",
    reviewDraft: "Review draft",
    confirmTitle: "Confirm this unpublished draft",
    confirmBody:
      "This creates a local draft only. It will not be submitted, published, or shared until you review it again in the workspace.",
    cancel: "Cancel",
    confirmSave: "Confirm & save draft",
    saving: "Saving draft…",
    savedDemand: "Demand saved as an unpublished draft.",
    savedListing: "Listing saved as an unpublished draft.",
    copyBrief: "Copy operations brief",
    copied: "Brief copied",
    copyFailed: "Could not copy the brief. Please select the text manually.",
    product: "Product",
    quantity: "Quantity",
    unit: "Unit",
    grade: "Grade",
    date: "Date",
    price: "Target / unit price",
    recurrence: "Recurring",
    notes: "Notes",
    yes: "Yes",
    no: "No",
    validationTitle: "This draft needs correction before it can be saved:",
    retry: "Try again",
    unavailable: "The Copilot could not answer just now.",
    disclaimer: "Decision support only — verify quantities, dates, quality, and prices.",
  },
  fr: {
    open: "Demander à l’IA FarmToMarket",
    title: "Copilote FarmToMarket",
    subtitle: "Une aide pratique basée sur cet espace de travail",
    close: "Fermer le copilote",
    welcomeTitle: "Que souhaitez-vous faire avancer ?",
    welcomeBody:
      "Demandez un brouillon d’achat, une annonce agricole plus claire ou un point sur les priorités opérationnelles.",
    promptLabel: "Essayez une suggestion",
    placeholder: "Posez une question sur vos achats, offres ou opérations…",
    inputLabel: "Message au copilote FarmToMarket",
    send: "Envoyer le message",
    thinking: "Analyse du contexte de votre espace…",
    keyboardHint: "Ctrl + Entrée pour envoyer",
    privacy: "Seuls le catalogue et de courts résumés opérationnels sont partagés avec OpenAI.",
    reviewNotice: "Les suggestions de l’IA peuvent être incomplètes. Vérifiez-les avant d’agir.",
    actions: "Actions recommandées",
    risks: "Risques à vérifier",
    confidence: "Confiance",
    followUp: "Poursuivre la conversation",
    reviewDraft: "Vérifier le brouillon",
    confirmTitle: "Confirmer ce brouillon non publié",
    confirmBody:
      "Cette action crée uniquement un brouillon local. Il ne sera ni soumis, ni publié, ni partagé avant une nouvelle vérification dans l’espace de travail.",
    cancel: "Annuler",
    confirmSave: "Confirmer et enregistrer",
    saving: "Enregistrement…",
    savedDemand: "Demande enregistrée comme brouillon non publié.",
    savedListing: "Offre enregistrée comme brouillon non publié.",
    copyBrief: "Copier le point opérationnel",
    copied: "Point copié",
    copyFailed: "Impossible de copier le point. Sélectionnez le texte manuellement.",
    product: "Produit",
    quantity: "Quantité",
    unit: "Unité",
    grade: "Qualité",
    date: "Date",
    price: "Prix cible / unitaire",
    recurrence: "Récurrent",
    notes: "Notes",
    yes: "Oui",
    no: "Non",
    validationTitle: "Ce brouillon doit être corrigé avant l’enregistrement :",
    retry: "Réessayer",
    unavailable: "Le copilote ne peut pas répondre pour le moment.",
    disclaimer: "Aide à la décision uniquement — vérifiez quantités, dates, qualité et prix.",
  },
};

const rolePrompts: Record<CopilotRole, Record<"en" | "fr", string[]>> = {
  buyer: {
    en: [
      "Draft a demand for 200 kg of grade A tomatoes needed next week.",
      "Which current supply gaps should I plan around?",
      "Help me improve this week’s procurement plan.",
    ],
    fr: [
      "Prépare une demande de 200 kg de tomates qualité A pour la semaine prochaine.",
      "Quels manques d’approvisionnement dois-je anticiper ?",
      "Aide-moi à améliorer le plan d’achat de cette semaine.",
    ],
  },
  farmer: {
    en: [
      "Draft a listing for produce I can supply this week.",
      "Which current buyer needs best match the catalogue?",
      "How can I make my next supply listing clearer?",
    ],
    fr: [
      "Prépare une offre pour les produits que je peux livrer cette semaine.",
      "Quels besoins acheteurs correspondent le mieux au catalogue ?",
      "Comment rendre ma prochaine offre plus claire ?",
    ],
  },
  operations: {
    en: [
      "Summarise today’s operational risks and priorities.",
      "Which deliveries or allocations need attention?",
      "Create a concise shift handover brief.",
    ],
    fr: [
      "Résume les risques et priorités opérationnels du jour.",
      "Quelles livraisons ou allocations demandent une attention ?",
      "Crée un point concis pour la relève d’équipe.",
    ],
  },
};

const draftIssueCopy: Record<DraftIssue, Record<"en" | "fr", string>> = {
  role_mismatch: {
    en: "This draft belongs in a different workspace role.",
    fr: "Ce brouillon appartient à un autre rôle de l’espace de travail.",
  },
  product_missing: {
    en: "The product is not active in the local catalogue.",
    fr: "Le produit n’est pas actif dans le catalogue local.",
  },
  quantity_invalid: {
    en: "The quantity must be a positive, reasonable number.",
    fr: "La quantité doit être un nombre positif et raisonnable.",
  },
  unit_invalid: {
    en: "The unit is not allowed for this catalogue product.",
    fr: "Cette unité n’est pas autorisée pour ce produit.",
  },
  grade_invalid: {
    en: "The grade is not available for this catalogue product.",
    fr: "Cette qualité n’est pas disponible pour ce produit.",
  },
  date_invalid: {
    en: "The date is missing or invalid.",
    fr: "La date est absente ou invalide.",
  },
  date_past: {
    en: "The date is in the past.",
    fr: "La date est déjà passée.",
  },
  title_invalid: {
    en: "The demand needs a clear title.",
    fr: "La demande doit avoir un titre clair.",
  },
  price_invalid: {
    en: "The listing needs a valid whole-FCFA unit price.",
    fr: "L’offre doit avoir un prix unitaire valide en FCFA entiers.",
  },
};

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSuccessPayload(value: unknown): value is CopilotSuccessPayload {
  if (!isRecord(value) || !isRecord(value.data) || typeof value.data.model !== "string") {
    return false;
  }
  const result = value.data.result;
  return (
    isRecord(result) &&
    typeof result.title === "string" &&
    typeof result.answer === "string" &&
    Array.isArray(result.actions) &&
    Array.isArray(result.risks) &&
    Array.isArray(result.followUpQuestions) &&
    isRecord(result.draft) &&
    typeof result.draft.kind === "string" &&
    typeof result.confidence === "string" &&
    typeof result.disclaimer === "string"
  );
}

function errorFromPayload(value: unknown, fallback: string) {
  if (isRecord(value) && typeof value.message === "string" && value.message.trim()) {
    return value.message.slice(0, 300);
  }
  return fallback;
}

function priorityClasses(priority: string) {
  if (priority === "urgent") return "bg-red-50 text-red-700 ring-red-200";
  if (priority === "monitor") return "bg-amber-50 text-amber-800 ring-amber-200";
  return "bg-[var(--sage)] text-[var(--forest)] ring-[var(--line)]";
}

function confidenceClasses(confidence: CopilotResult["confidence"]) {
  if (confidence === "high") return "bg-emerald-50 text-emerald-700";
  if (confidence === "low") return "bg-amber-50 text-amber-800";
  return "bg-sky-50 text-sky-700";
}

function operationsBrief(result: CopilotResult, copy: CopySet) {
  return [
    result.title,
    result.answer,
    result.actions.length
      ? `\n${copy.actions}:\n${result.actions.map((action) => `• ${action.label}: ${action.detail}`).join("\n")}`
      : "",
    result.risks.length ? `\n${copy.risks}:\n${result.risks.map((risk) => `• ${risk}`).join("\n")}` : "",
    `\n${copy.reviewNotice}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function AiCopilot({ role, section }: { role: CopilotRole; section: string }) {
  const app = useApp();
  const locale = app.locale === "fr" ? "fr" : "en";
  const copy = copySets[locale];
  const prompts = rolePrompts[role][locale];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ConversationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reviewingMessageId, setReviewingMessageId] = useState<string | null>(null);
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<{
    id: string;
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [copyState, setCopyState] = useState<{ id: string; status: "copied" | "error" } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const activeRequestRef = useRef<AbortController | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const context = useMemo(
    () =>
      buildCopilotContext({
        state: app.state,
        metrics: app.metrics,
        role,
        locale,
        section,
        organisationId: app.currentOrganisation?.id,
      }),
    [app.currentOrganisation?.id, app.metrics, app.state, locale, role, section],
  );

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const returnTarget = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.getAttribute("aria-hidden") !== "true");
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => {
        if (returnTarget?.isConnected) returnTarget.focus();
      });
    };
  }, [close, open]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [loading, messages, open]);

  useEffect(
    () => () => {
      activeRequestRef.current?.abort();
    },
    [],
  );

  const submit = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = input.replace(/\s+/g, " ").trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!message || loading) return;

    const history: CopilotMessage[] = messages
      .slice(-MAX_HISTORY_ENTRIES)
      .map(({ role: messageRole, content }) => ({
        role: messageRole,
        content: content.slice(0, 1_600),
      }));
    const userEntry: ConversationEntry = { id: makeId(), role: "user", content: message };
    setMessages((current) => [...current, userEntry].slice(-MAX_CONVERSATION_ENTRIES));
    setInput("");
    setError("");
    setReviewingMessageId(null);
    setDraftNotice(null);
    setCopyState(null);
    setLoading(true);

    const controller = new AbortController();
    activeRequestRef.current = controller;
    try {
      const response = await fetch("/api/v1/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, locale, message, history, context }),
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok || !isSuccessPayload(payload)) {
        throw new Error(errorFromPayload(payload as CopilotErrorPayload, copy.unavailable));
      }
      const assistantEntry: ConversationEntry = {
        id: makeId(),
        role: "assistant",
        content: payload.data.result.answer.slice(0, 1_600),
        result: payload.data.result,
        model: payload.data.model,
      };
      setMessages((current) => [...current, assistantEntry].slice(-MAX_CONVERSATION_ENTRIES));
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : copy.unavailable);
    } finally {
      if (activeRequestRef.current === controller) activeRequestRef.current = null;
      setLoading(false);
    }
  };

  const onComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const selectPrompt = (prompt: string) => {
    setInput(prompt.slice(0, MAX_MESSAGE_LENGTH));
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const saveDraft = async (messageId: string, result: CopilotResult) => {
    if (savingMessageId) return;
    const validation = validateCopilotDraft({
      draft: result.draft,
      products: app.state.products,
      role,
      currentDate: context.currentDate,
    });
    if (!validation.valid) return;
    const draft = result.draft;
    setSavingMessageId(messageId);
    setDraftNotice(null);
    try {
      if (
        draft.kind === "demand" &&
        draft.title &&
        draft.productId &&
        draft.quantity !== null &&
        draft.unit &&
        draft.grade &&
        draft.date
      ) {
        await app.actions.createDemand({
          buyerOrganisationId: app.currentOrganisation?.id,
          title: draft.title.trim().slice(0, 120),
          requiredDeliveryDate: draft.date,
          items: [
            {
              productId: draft.productId,
              quantity: draft.quantity,
              unit: draft.unit,
              grade: draft.grade,
              targetUnitPrice: draft.priceFcfa ?? undefined,
              notes: draft.notes?.trim().slice(0, 500) || undefined,
            },
          ],
          recurring: draft.recurring ?? false,
          recurrenceNote: draft.recurring
            ? locale === "fr"
              ? "Récurrence à confirmer avant publication."
              : "Recurrence to confirm before publishing."
            : undefined,
          notes: draft.notes?.trim().slice(0, 500) || undefined,
          submit: false,
        });
        setDraftNotice({ id: messageId, message: copy.savedDemand, type: "success" });
      } else if (
        draft.kind === "listing" &&
        draft.productId &&
        draft.quantity !== null &&
        draft.unit &&
        draft.grade &&
        draft.date &&
        draft.priceFcfa !== null
      ) {
        await app.actions.createListing({
          farmerOrganisationId: app.currentOrganisation?.id,
          productId: draft.productId,
          availableQuantity: draft.quantity,
          unit: draft.unit,
          unitPrice: draft.priceFcfa,
          minOrderQuantity: 1,
          grade: draft.grade,
          availableFrom: draft.date,
          availableUntil: addDays(draft.date, 14),
          notes: draft.notes?.trim().slice(0, 500) || undefined,
          status: "draft",
        });
        setDraftNotice({ id: messageId, message: copy.savedListing, type: "success" });
      }
      setReviewingMessageId(null);
    } catch (caught) {
      setDraftNotice({
        id: messageId,
        message: caught instanceof Error ? caught.message : copy.unavailable,
        type: "error",
      });
    } finally {
      setSavingMessageId(null);
    }
  };

  const copyOperationsBrief = async (messageId: string, result: CopilotResult) => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(operationsBrief(result, copy));
      setCopyState({ id: messageId, status: "copied" });
    } catch {
      setCopyState({ id: messageId, status: "error" });
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={`${open ? "hidden" : "inline-flex"} fixed bottom-[calc(5.6rem+env(safe-area-inset-bottom))] right-4 z-40 min-h-13 items-center gap-2.5 rounded-full bg-[var(--forest)] p-1.5 pr-4 text-sm font-black text-white shadow-[0_18px_45px_rgba(13,45,36,.3)] transition hover:-translate-y-0.5 hover:bg-[var(--forest-strong)] lg:bottom-6 lg:right-6`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="grid size-10 place-items-center rounded-full bg-[var(--lime)] text-[var(--forest)]">
          <Sparkles aria-hidden="true" size={19} />
        </span>
        <span>{copy.open}</span>
        <span className="rounded-full bg-white/12 px-2 py-1 text-[10px] tracking-wider">AI</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            tabIndex={-1}
            aria-label={copy.close}
            onClick={close}
            className="absolute inset-0 bg-[var(--forest-strong)]/55 backdrop-blur-sm"
          />
          <section
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-[var(--background)] shadow-2xl sm:w-[min(92vw,40rem)]"
          >
            <header className="relative overflow-hidden bg-[var(--forest)] px-5 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white sm:px-6">
              <div className="absolute -right-12 -top-16 size-44 rounded-full bg-[var(--lime)]/10" />
              <div className="relative flex items-start gap-3">
                <span className="grid size-11 flex-none place-items-center rounded-2xl bg-[var(--lime)] text-[var(--forest)] shadow-lg">
                  <Bot aria-hidden="true" size={22} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 id={titleId} className="font-display text-xl font-semibold sm:text-2xl">
                      {copy.title}
                    </h2>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-black tracking-wider text-[var(--lime)]">
                      AI
                    </span>
                  </div>
                  <p id={descriptionId} className="mt-1 text-xs leading-5 text-white/65 sm:text-sm">
                    {copy.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={copy.close}
                  className="grid size-10 flex-none place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
                >
                  <X aria-hidden="true" size={19} />
                </button>
              </div>
              <div className="relative mt-4 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-[11px] leading-4 text-white/70">
                <ShieldCheck aria-hidden="true" size={15} className="mt-0.5 flex-none text-[var(--lime)]" />
                <span>{copy.privacy}</span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
              {messages.length === 0 ? (
                <div className="animate-rise">
                  <div className="rounded-[1.5rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow-sm)] sm:p-6">
                    <span className="grid size-11 place-items-center rounded-2xl bg-[var(--orange-soft)] text-[var(--orange)]">
                      <MessageCircleQuestion aria-hidden="true" size={21} />
                    </span>
                    <h3 className="mt-4 text-lg font-black text-[var(--ink)]">{copy.welcomeTitle}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{copy.welcomeBody}</p>
                  </div>
                  <div className="mt-6">
                    <p className="text-xs font-black uppercase tracking-[0.13em] text-[var(--forest-soft)]">
                      {copy.promptLabel}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {prompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => selectPrompt(prompt)}
                          className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3.5 text-left text-sm font-bold leading-5 text-[var(--forest)] shadow-sm transition hover:border-[var(--forest)] hover:bg-[var(--cream)]"
                        >
                          <span className="flex items-start gap-3">
                            <Sparkles aria-hidden="true" size={16} className="mt-0.5 flex-none text-[var(--orange)]" />
                            <span>{prompt}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {messages.map((entry) => {
                    if (entry.role === "user") {
                      return (
                        <div key={entry.id} className="ml-auto max-w-[88%] rounded-[1.25rem] rounded-br-md bg-[var(--forest)] px-4 py-3 text-sm leading-6 text-white shadow-sm">
                          {entry.content}
                        </div>
                      );
                    }

                    const result = entry.result;
                    if (!result) return null;
                    const validation = validateCopilotDraft({
                      draft: result.draft,
                      products: app.state.products,
                      role,
                      currentDate: context.currentDate,
                    });
                    const isSavableDraft = result.draft.kind === "demand" || result.draft.kind === "listing";
                    const reviewing = reviewingMessageId === entry.id;
                    const entryDraftNotice = draftNotice?.id === entry.id ? draftNotice : null;
                    const draftSaved = entryDraftNotice?.type === "success";
                    const localProduct = validation.product;

                    return (
                      <article key={entry.id} className="overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-white shadow-[var(--shadow-sm)]">
                        <div className="border-b border-[var(--line)] bg-[var(--cream)]/55 px-4 py-4 sm:px-5">
                          <div className="flex items-start gap-3">
                            <span className="grid size-9 flex-none place-items-center rounded-xl bg-[var(--sage)] text-[var(--forest)]">
                              <Sparkles aria-hidden="true" size={17} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-black leading-5 text-[var(--ink)]">{result.title}</h3>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${confidenceClasses(result.confidence)}`}>
                                  {copy.confidence}: {result.confidence}
                                </span>
                                {entry.model ? <span className="text-[10px] text-[var(--muted)]">OpenAI · {entry.model}</span> : null}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-5 px-4 py-5 sm:px-5">
                          <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">{result.answer}</p>

                          {result.actions.length ? (
                            <section aria-label={copy.actions}>
                              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-[var(--forest-soft)]">{copy.actions}</h4>
                              <ul className="mt-3 space-y-2">
                                {result.actions.map((action, index) => (
                                  <li key={`${action.label}-${index}`} className="rounded-xl border border-[var(--line)] p-3">
                                    <div className="flex items-start gap-2.5">
                                      <CheckCircle2 aria-hidden="true" size={17} className="mt-0.5 flex-none text-[var(--forest)]" />
                                      <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="text-sm font-black text-[var(--ink)]">{action.label}</p>
                                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ring-1 ring-inset ${priorityClasses(action.priority)}`}>
                                            {action.priority}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{action.detail}</p>
                                      </div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </section>
                          ) : null}

                          {result.risks.length ? (
                            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4" aria-label={copy.risks}>
                              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-amber-900">
                                <AlertTriangle aria-hidden="true" size={16} /> {copy.risks}
                              </h4>
                              <ul className="mt-2 space-y-1.5 pl-5 text-xs leading-5 text-amber-900/80">
                                {result.risks.map((risk, index) => <li key={`${risk}-${index}`} className="list-disc">{risk}</li>)}
                              </ul>
                            </section>
                          ) : null}

                          {isSavableDraft ? (
                            <section className="rounded-2xl border border-[var(--line)] bg-[var(--cream)] p-4" aria-label={copy.reviewDraft}>
                              <div className="flex items-center gap-2">
                                <ClipboardCheck aria-hidden="true" size={18} className="text-[var(--forest)]" />
                                <h4 className="text-sm font-black text-[var(--ink)]">{result.draft.title || copy.reviewDraft}</h4>
                              </div>
                              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3">
                                <div><dt className="text-[var(--muted)]">{copy.product}</dt><dd className="mt-0.5 font-bold text-[var(--ink)]">{localProduct?.name[locale] || result.draft.productName || "—"}</dd></div>
                                <div><dt className="text-[var(--muted)]">{copy.quantity}</dt><dd className="mt-0.5 font-bold text-[var(--ink)]">{result.draft.quantity ?? "—"}</dd></div>
                                <div><dt className="text-[var(--muted)]">{copy.unit}</dt><dd className="mt-0.5 font-bold capitalize text-[var(--ink)]">{formatDraftUnit(result.draft.unit)}</dd></div>
                                <div><dt className="text-[var(--muted)]">{copy.grade}</dt><dd className="mt-0.5 font-bold capitalize text-[var(--ink)]">{formatDraftGrade(result.draft.grade)}</dd></div>
                                <div><dt className="text-[var(--muted)]">{copy.date}</dt><dd className="mt-0.5 font-bold text-[var(--ink)]">{result.draft.date ?? "—"}</dd></div>
                                <div><dt className="text-[var(--muted)]">{copy.price}</dt><dd className="mt-0.5 font-bold text-[var(--ink)]">{result.draft.priceFcfa === null ? "—" : formatFcfa(result.draft.priceFcfa, locale)}</dd></div>
                                <div><dt className="text-[var(--muted)]">{copy.recurrence}</dt><dd className="mt-0.5 font-bold text-[var(--ink)]">{result.draft.recurring ? copy.yes : copy.no}</dd></div>
                                {result.draft.notes ? <div className="col-span-2 sm:col-span-3"><dt className="text-[var(--muted)]">{copy.notes}</dt><dd className="mt-0.5 whitespace-pre-wrap font-bold leading-5 text-[var(--ink)]">{result.draft.notes}</dd></div> : null}
                              </dl>

                              {!validation.valid ? (
                                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                                  <p className="font-black">{copy.validationTitle}</p>
                                  <ul className="mt-1.5 list-disc space-y-1 pl-4">
                                    {validation.issues.map((issue) => <li key={issue}>{draftIssueCopy[issue][locale]}</li>)}
                                  </ul>
                                </div>
                              ) : reviewing ? (
                                <div className="mt-4 rounded-xl border-2 border-[var(--forest)] bg-white p-4">
                                  <p className="font-black text-[var(--ink)]">{copy.confirmTitle}</p>
                                  <p className="mt-1.5 text-xs leading-5 text-[var(--muted)]">{copy.confirmBody}</p>
                                  <div className="mt-4 flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setReviewingMessageId(null)} className="inline-flex min-h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-xs font-black text-[var(--forest)] hover:bg-[var(--cream)]">
                                      {copy.cancel}
                                    </button>
                                    <button type="button" disabled={savingMessageId !== null} onClick={() => void saveDraft(entry.id, result)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-4 text-xs font-black text-white hover:bg-[var(--forest-strong)] disabled:opacity-60">
                                      {savingMessageId === entry.id ? <LoaderCircle aria-hidden="true" size={15} className="animate-spin" /> : <Check aria-hidden="true" size={15} />}
                                      {savingMessageId === entry.id ? copy.saving : copy.confirmSave}
                                    </button>
                                  </div>
                                </div>
                              ) : !draftSaved ? (
                                <button type="button" onClick={() => setReviewingMessageId(entry.id)} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-[var(--forest)] px-4 text-xs font-black text-white hover:bg-[var(--forest-strong)]">
                                  <ClipboardCheck aria-hidden="true" size={15} /> {copy.reviewDraft}
                                </button>
                              ) : null}

                              {entryDraftNotice ? (
                                <p
                                  className={`mt-4 flex items-start gap-2 rounded-xl p-3 text-xs font-bold leading-5 ${entryDraftNotice.type === "success" ? "bg-emerald-50 text-emerald-800" : "border border-red-200 bg-red-50 text-red-800"}`}
                                  role={entryDraftNotice.type === "success" ? "status" : "alert"}
                                >
                                  {entryDraftNotice.type === "success" ? <CheckCircle2 aria-hidden="true" size={16} className="mt-0.5 flex-none" /> : <AlertTriangle aria-hidden="true" size={16} className="mt-0.5 flex-none" />}
                                  {entryDraftNotice.message}
                                </p>
                              ) : null}
                            </section>
                          ) : null}

                          {result.draft.kind === "operations_brief" ? (
                            <div>
                              <button type="button" onClick={() => copyOperationsBrief(entry.id, result)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white px-4 text-xs font-black text-[var(--forest)] hover:border-[var(--forest)] hover:bg-[var(--cream)]">
                                {copyState?.id === entry.id && copyState.status === "copied" ? <Check aria-hidden="true" size={15} /> : <Copy aria-hidden="true" size={15} />}
                                {copyState?.id === entry.id && copyState.status === "copied" ? copy.copied : copy.copyBrief}
                              </button>
                              {copyState?.id === entry.id && copyState.status === "error" ? <p className="mt-2 text-xs text-red-700" role="alert">{copy.copyFailed}</p> : null}
                            </div>
                          ) : null}

                          {result.followUpQuestions.length ? (
                            <section aria-label={copy.followUp}>
                              <h4 className="text-xs font-black uppercase tracking-[0.12em] text-[var(--forest-soft)]">{copy.followUp}</h4>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {result.followUpQuestions.map((question) => (
                                  <button key={question} type="button" onClick={() => selectPrompt(question)} className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-left text-xs font-bold leading-4 text-[var(--forest)] hover:border-[var(--forest)] hover:bg-[var(--cream)]">
                                    {question}
                                  </button>
                                ))}
                              </div>
                            </section>
                          ) : null}

                          <div className="border-t border-[var(--line)] pt-4 text-[11px] leading-5 text-[var(--muted)]">
                            <p>{result.disclaimer}</p>
                            <p className="mt-1 font-bold text-[var(--forest)]">{copy.reviewNotice}</p>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}

              {loading ? (
                <div className="mt-5 flex max-w-[88%] items-center gap-3 rounded-[1.25rem] rounded-bl-md border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)] shadow-sm" role="status">
                  <LoaderCircle aria-hidden="true" size={18} className="animate-spin text-[var(--forest)]" />
                  {copy.thinking}
                </div>
              ) : null}
              {error ? (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
                  <p className="font-bold">{error}</p>
                  <button type="button" onClick={() => { setError(""); inputRef.current?.focus(); }} className="mt-2 text-xs font-black underline underline-offset-2">
                    {copy.retry}
                  </button>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            <footer className="border-t border-[var(--line)] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
              <form onSubmit={submit}>
                <label htmlFor={`${titleId}-composer`} className="sr-only">{copy.inputLabel}</label>
                <div className="rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_10px_35px_rgba(14,45,36,.1)] focus-within:border-[var(--forest)] focus-within:ring-2 focus-within:ring-[var(--sage)]">
                  <textarea
                    ref={inputRef}
                    id={`${titleId}-composer`}
                    value={input}
                    onChange={(event) => setInput(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                    onKeyDown={onComposerKeyDown}
                    maxLength={MAX_MESSAGE_LENGTH}
                    rows={2}
                    disabled={loading}
                    placeholder={copy.placeholder}
                    className="max-h-36 min-h-14 w-full resize-none bg-transparent px-2 py-1.5 text-sm leading-5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
                  />
                  <div className="flex items-center justify-between gap-3 px-1">
                    <span className="text-[10px] text-[var(--muted)]">{copy.keyboardHint} · {input.length}/{MAX_MESSAGE_LENGTH}</span>
                    <button type="submit" disabled={loading || !input.trim()} aria-label={copy.send} className="grid size-10 flex-none place-items-center rounded-full bg-[var(--forest)] text-white transition hover:bg-[var(--forest-strong)] disabled:opacity-40">
                      {loading ? <LoaderCircle aria-hidden="true" size={17} className="animate-spin" /> : <Send aria-hidden="true" size={17} />}
                    </button>
                  </div>
                </div>
              </form>
              <p className="mt-2 text-center text-[10px] leading-4 text-[var(--muted)]">{copy.disclaimer}</p>
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}

export default AiCopilot;
