"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  deriveDashboardMetrics,
  isLocale,
  isRole,
  type Address,
  type AuditAction,
  type AuditLog,
  type ConfirmPaymentInput,
  type CreateAllocationInput,
  type CreateDemandInput,
  type CreateListingInput,
  type CreateOfferInput,
  type Dispute,
  type DomainState,
  type FulfilmentAllocation,
  type Locale,
  type Notification,
  type OpenDisputeInput,
  type Order,
  type OrderItem,
  type Organisation,
  type PaymentTransaction,
  type ResolveDisputeInput,
  type Shipment,
  type ShipmentStatus,
  type SubmitQuoteInput,
  type SupplyListing,
  type User,
  type UserRole,
  type UUID,
  type VerifyOrganisationInput,
} from "@/lib/domain";
import { createSeedState } from "@/lib/seed-data";

export const APP_SESSION_STORAGE_KEY = "farmtomarket-cameroon:v1:browser-session";

type BrowserSession = Pick<DomainState, "activeUserId" | "activeRole" | "locale">;

interface StateApiPayload {
  data?: {
    state?: unknown;
    persisted?: unknown;
  };
  message?: unknown;
}

export interface AppActions {
  switchRole: (role: UserRole) => void;
  switchUser: (userId: UUID) => void;
  switchLocale: (locale: Locale) => void;
  setLocale: (locale: Locale) => void;
  resetDemo: () => Promise<void>;
  createListing: (input: CreateListingInput) => Promise<UUID>;
  createDemand: (input: CreateDemandInput) => Promise<UUID>;
  submitQuote: (input: SubmitQuoteInput) => Promise<UUID>;
  createAllocation: (input: CreateAllocationInput) => Promise<UUID>;
  createOffer: (input: CreateOfferInput) => Promise<UUID>;
  confirmOrder: (orderId: UUID) => Promise<void>;
  confirmPayment: (input: ConfirmPaymentInput) => Promise<UUID>;
  advanceShipment: (shipmentId: UUID) => Promise<void>;
  acceptDelivery: (orderId: UUID) => Promise<void>;
  openDispute: (input: OpenDisputeInput) => Promise<UUID>;
  resolveDispute: (input: ResolveDisputeInput) => Promise<void>;
  verifyOrganisation: (input: VerifyOrganisationInput) => Promise<void>;
  markNotificationRead: (notificationId: UUID) => Promise<void>;
}

export interface AppContextValue {
  state: DomainState;
  hydrated: boolean;
  isHydrated: boolean;
  isPersisting: boolean;
  loadError: string | null;
  persistenceError: string | null;
  retryHydration: () => void;
  clearPersistenceError: () => void;
  currentUser?: User;
  currentOrganisation?: Organisation;
  currentRole: UserRole;
  locale: Locale;
  metrics: ReturnType<typeof deriveDashboardMetrics>;
  actions: AppActions;
}

const AppContext = createContext<AppContextValue | null>(null);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertPositive(value: number, label: string) {
  assert(Number.isFinite(value) && value > 0, `${label} must be greater than zero.`);
}

function assertFcfa(value: number, label: string) {
  assert(Number.isInteger(value) && value >= 0, `${label} must be a whole FCFA amount.`);
}

function assertRole(state: DomainState, allowed: UserRole[], action: string) {
  assert(allowed.includes(state.activeRole), `${state.activeRole} users cannot ${action}.`);
}

function makeId(): UUID {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const random = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `${random()}${random()}-${random()}-4${random().slice(1)}-8${random().slice(1)}-${random()}${random()}${random()}`;
}

function compactDate(now: string) {
  return now.slice(2, 10).replaceAll("-", "");
}

function reference(prefix: string, count: number, now: string) {
  return `${prefix}-${compactDate(now)}-${String(count + 1).padStart(4, "0")}`;
}

function audit(
  state: DomainState,
  action: AuditAction,
  targetType: AuditLog["targetType"],
  targetId: UUID,
  summary: string,
  now: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
): AuditLog {
  return {
    id: makeId(),
    actorUserId: state.activeUserId,
    actorRole: state.activeRole,
    action,
    targetType,
    targetId,
    summary,
    before,
    after,
    createdAt: now,
  };
}

function finish(state: DomainState, event: AuditLog, now: string): DomainState {
  return { ...state, audits: [...state.audits, event], updatedAt: now };
}

function notification(
  recipientUserId: UUID,
  type: Notification["type"],
  title: Notification["title"],
  message: Notification["message"],
  entityType: Notification["entityType"],
  entityId: UUID,
  now: string,
): Notification {
  return {
    id: makeId(),
    recipientUserId,
    type,
    title,
    message,
    channels: ["in_app"],
    status: "delivered",
    entityType,
    entityId,
    deduplicationKey: `${type}:${entityId}:${recipientUserId}:${now}`,
    createdAt: now,
  };
}

function organisationForRole(
  state: DomainState,
  role: "farmer" | "buyer",
  suppliedId?: UUID,
): Organisation {
  const currentUser = state.users.find((user) => user.id === state.activeUserId);
  const allowedTypes = role === "farmer" ? ["farmer", "cooperative"] : ["buyer"];
  const organisation = state.organisations.find(
    (candidate) =>
      candidate.id === suppliedId ||
      (!suppliedId &&
        currentUser?.organisationIds.includes(candidate.id) &&
        allowedTypes.includes(candidate.type)),
  );
  assert(organisation && allowedTypes.includes(organisation.type), `No ${role} organisation is available.`);
  return organisation;
}

function firstAddress(organisation: Organisation, kinds: Address["kind"][]) {
  const result =
    organisation.addresses.find((candidate) => kinds.includes(candidate.kind)) ??
    organisation.addresses[0];
  assert(result, `${organisation.name} needs an address before continuing.`);
  return result;
}

function usersForOrganisation(state: DomainState, organisationId: UUID) {
  const organisation = state.organisations.find((candidate) => candidate.id === organisationId);
  return organisation?.memberUserIds ?? [];
}

function restoreState(value: unknown): DomainState | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DomainState>;
  if (
    candidate.schemaVersion !== 1 ||
    !isRole(candidate.activeRole) ||
    !isLocale(candidate.locale) ||
    typeof candidate.activeUserId !== "string"
  ) {
    return null;
  }
  const arrayKeys: Array<keyof DomainState> = [
    "users",
    "organisations",
    "products",
    "listings",
    "demands",
    "demandItems",
    "quotes",
    "orders",
    "orderItems",
    "allocations",
    "payments",
    "shipments",
    "notifications",
    "disputes",
    "audits",
  ];
  if (arrayKeys.some((key) => !Array.isArray(candidate[key]))) return null;
  const state = candidate as DomainState;
  const activeUser = state.users.find((user) => user.id === state.activeUserId);
  if (!activeUser || !activeUser.roles.includes(state.activeRole)) return null;
  return state;
}

function parseStateResponse(value: unknown): DomainState {
  if (!value || typeof value !== "object") {
    throw new Error("The database returned an invalid response.");
  }
  const payload = value as StateApiPayload;
  const state = restoreState(payload.data?.state);
  if (!state || payload.data?.persisted !== true) {
    throw new Error("The database returned an invalid application state.");
  }
  return state;
}

function responseMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object") return fallback;
  const message = (value as StateApiPayload).message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return (await response.json()) as unknown;
  } catch {
    return null;
  }
}

function overlaySession(state: DomainState, session: Partial<BrowserSession>): DomainState {
  const requestedRole = isRole(session.activeRole) ? session.activeRole : state.activeRole;
  const requestedUser =
    typeof session.activeUserId === "string"
      ? state.users.find(
          (user) =>
            user.id === session.activeUserId &&
            user.status === "active" &&
            user.roles.includes(requestedRole),
        )
      : undefined;
  const canonicalUser = state.users.find(
    (user) =>
      user.id === state.activeUserId &&
      user.status === "active" &&
      user.roles.includes(requestedRole),
  );
  const roleUser =
    state.users.find(
      (user) =>
        user.primaryRole === requestedRole &&
        user.status === "active" &&
        user.roles.includes(requestedRole),
    ) ??
    state.users.find(
      (user) => user.status === "active" && user.roles.includes(requestedRole),
    );
  const user = requestedUser ?? canonicalUser ?? roleUser;
  if (!user) return state;
  const locale = isLocale(session.locale) ? session.locale : state.locale;
  return {
    ...state,
    activeUserId: user.id,
    activeRole: requestedRole,
    locale,
  };
}

function readBrowserSession(state: DomainState): DomainState {
  let session: Partial<BrowserSession> = {};
  try {
    const raw = window.localStorage.getItem(APP_SESSION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (parsed && typeof parsed === "object") {
      const candidate = parsed as Partial<BrowserSession>;
      session = {
        activeUserId:
          typeof candidate.activeUserId === "string" ? candidate.activeUserId : undefined,
        activeRole: isRole(candidate.activeRole) ? candidate.activeRole : undefined,
        locale: isLocale(candidate.locale) ? candidate.locale : undefined,
      };
    }
    const legacyRole = window.localStorage.getItem("farmtomarket-role");
    if (!session.activeRole && isRole(legacyRole)) session.activeRole = legacyRole;
  } catch {
    // A blocked browser store should not prevent canonical database hydration.
  }
  return overlaySession(state, session);
}

const shipmentTransitions: Partial<Record<ShipmentStatus, ShipmentStatus>> = {
  planned: "pickup_scheduled",
  pickup_scheduled: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
  exception: "in_transit",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMarketplaceWorkspace =
    pathname === "/buyer" ||
    pathname.startsWith("/buyer/") ||
    pathname === "/farmer" ||
    pathname.startsWith("/farmer/") ||
    pathname === "/operations" ||
    pathname.startsWith("/operations/");
  const [state, setState] = useState<DomainState>(() => createSeedState());
  const [hydrated, setHydrated] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [hydrationAttempt, setHydrationAttempt] = useState(0);
  const stateRef = useRef(state);
  const mountedRef = useRef(false);
  const serverUpdatedAtRef = useRef<string | null>(null);
  const mutationVersionRef = useRef(0);
  const pendingWritesRef = useRef(0);
  const writeEpochRef = useRef(0);
  const recoveringRef = useRef(false);
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const completeWrite = useCallback(() => {
    pendingWritesRef.current = Math.max(0, pendingWritesRef.current - 1);
    if (mountedRef.current) setIsPersisting(pendingWritesRef.current > 0);
  }, []);

  const reconcilePersistedState = useCallback(
    (canonical: DomainState, mutationVersion: number) => {
      serverUpdatedAtRef.current = canonical.updatedAt;
      if (!mountedRef.current) return;
      setPersistenceError(null);
      if (mutationVersionRef.current !== mutationVersion) return;
      const next = overlaySession(canonical, stateRef.current);
      stateRef.current = next;
      setState(next);
    },
    [],
  );

  const recoverCanonicalState = useCallback(async (saveError: string) => {
    recoveringRef.current = true;
    writeEpochRef.current += 1;
    mutationVersionRef.current += 1;
    serverUpdatedAtRef.current = null;
    const session: BrowserSession = {
      activeUserId: stateRef.current.activeUserId,
      activeRole: stateRef.current.activeRole,
      locale: stateRef.current.locale,
    };
    if (mountedRef.current) {
      setHydrated(false);
      setPersistenceError(saveError);
    }

    try {
      const response = await fetch("/api/v1/state", {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(
          responseMessage(payload, "The canonical database state could not be reloaded."),
        );
      }
      const canonical = parseStateResponse(payload);
      const next = overlaySession(canonical, session);
      serverUpdatedAtRef.current = canonical.updatedAt;
      if (mountedRef.current) {
        stateRef.current = next;
        setState(next);
        setLoadError(null);
        setHydrated(true);
        setPersistenceError(saveError);
      }
    } catch (error) {
      if (mountedRef.current) {
        setLoadError(
          error instanceof Error
            ? `${saveError} ${error.message}`
            : `${saveError} The canonical database state could not be reloaded.`,
        );
        setHydrated(false);
      }
    } finally {
      recoveringRef.current = false;
    }
  }, []);

  const enqueueStateWrite = useCallback(
    (snapshot: DomainState, mutationVersion: number) => {
      const writeEpoch = writeEpochRef.current;
      let resolveCompletion!: () => void;
      let rejectCompletion!: (error: Error) => void;
      const completion = new Promise<void>((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
      });
      pendingWritesRef.current += 1;
      if (mountedRef.current) {
        setIsPersisting(true);
        setPersistenceError(null);
      }
      writeQueueRef.current = writeQueueRef.current.then(async () => {
        try {
          if (writeEpoch !== writeEpochRef.current) {
            rejectCompletion(
              new Error("This change was cancelled while the database state was reloaded."),
            );
            return;
          }
          const expectedUpdatedAt = serverUpdatedAtRef.current;
          if (!expectedUpdatedAt) {
            throw new Error("The database revision is unavailable. Reload the workspace.");
          }
          const response = await fetch("/api/v1/state", {
            method: "PUT",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ state: snapshot, expectedUpdatedAt }),
          });
          const payload = await readJson(response);
          if (!response.ok) {
            const fallback =
              response.status === 409
                ? "This data changed in another session. Reload before making more changes."
                : "The latest change could not be saved to the database.";
            throw new Error(responseMessage(payload, fallback));
          }
          reconcilePersistedState(parseStateResponse(payload), mutationVersion);
          resolveCompletion();
        } catch (caught) {
          const error =
            caught instanceof Error
              ? caught
              : new Error("The latest change could not be saved to the database.");
          await recoverCanonicalState(error.message);
          rejectCompletion(error);
        } finally {
          completeWrite();
        }
      });
      return completion;
    },
    [completeWrite, reconcilePersistedState, recoverCanonicalState],
  );

  const enqueueReset = useCallback(
    (mutationVersion: number) => {
      const writeEpoch = writeEpochRef.current;
      let resolveCompletion!: () => void;
      let rejectCompletion!: (error: Error) => void;
      const completion = new Promise<void>((resolve, reject) => {
        resolveCompletion = resolve;
        rejectCompletion = reject;
      });
      pendingWritesRef.current += 1;
      if (mountedRef.current) {
        setIsPersisting(true);
        setPersistenceError(null);
      }
      writeQueueRef.current = writeQueueRef.current.then(async () => {
        try {
          if (writeEpoch !== writeEpochRef.current) {
            rejectCompletion(
              new Error("The reset was cancelled while the database state was reloaded."),
            );
            return;
          }
          const response = await fetch("/api/v1/state/reset", {
            method: "POST",
            headers: { Accept: "application/json" },
          });
          const payload = await readJson(response);
          if (!response.ok) {
            throw new Error(
              responseMessage(payload, "The demo database could not be reset."),
            );
          }
          reconcilePersistedState(parseStateResponse(payload), mutationVersion);
          resolveCompletion();
        } catch (caught) {
          const error =
            caught instanceof Error
              ? caught
              : new Error("The demo database could not be reset.");
          await recoverCanonicalState(error.message);
          rejectCompletion(error);
        } finally {
          completeWrite();
        }
      });
      return completion;
    },
    [completeWrite, reconcilePersistedState, recoverCanonicalState],
  );

  const commit = useCallback(
    (
      recipe: (current: DomainState) => DomainState,
      options: { persist?: boolean } = {},
    ) => {
      if (options.persist !== false) {
        assert(!recoveringRef.current, "The workspace is reloading its database state.");
      }
      const current = stateRef.current;
      const next = recipe(current);
      if (next === current) return Promise.resolve(next);
      stateRef.current = next;
      setState(next);
      if (options.persist !== false) {
        const mutationVersion = mutationVersionRef.current + 1;
        mutationVersionRef.current = mutationVersion;
        return enqueueStateWrite(next, mutationVersion).then(() => next);
      }
      return Promise.resolve(next);
    },
    [enqueueStateWrite],
  );

  useEffect(() => {
    const controller = new AbortController();

    void (async () => {
      try {
        const response = await fetch("/api/v1/state", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error(
            responseMessage(payload, "The workspace database could not be loaded."),
          );
        }
        const canonical = parseStateResponse(payload);
        const next = readBrowserSession(canonical);
        if (controller.signal.aborted) return;
        serverUpdatedAtRef.current = canonical.updatedAt;
        mutationVersionRef.current += 1;
        stateRef.current = next;
        setState(next);
        setHydrated(true);
      } catch (error) {
        if (controller.signal.aborted) return;
        serverUpdatedAtRef.current = null;
        setHydrated(false);
        setLoadError(
          error instanceof Error
            ? error.message
            : "The workspace database could not be loaded.",
        );
      }
    })();

    return () => controller.abort();
  }, [hydrationAttempt]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const session: BrowserSession = {
        activeUserId: state.activeUserId,
        activeRole: state.activeRole,
        locale: state.locale,
      };
      window.localStorage.setItem(APP_SESSION_STORAGE_KEY, JSON.stringify(session));
      if (["buyer", "farmer", "operations"].includes(state.activeRole)) {
        window.localStorage.setItem("farmtomarket-role", state.activeRole);
      }
    } catch {
      // Browser session preferences are optional; canonical data is in PostgreSQL.
    }
  }, [hydrated, state.activeRole, state.activeUserId, state.locale]);

  const retryHydration = useCallback(() => {
    writeEpochRef.current += 1;
    mutationVersionRef.current += 1;
    recoveringRef.current = false;
    serverUpdatedAtRef.current = null;
    setHydrated(false);
    setLoadError(null);
    setPersistenceError(null);
    setHydrationAttempt((current) => current + 1);
  }, []);

  const clearPersistenceError = useCallback(() => {
    setPersistenceError(null);
  }, []);

  const switchRole = useCallback(
    (role: UserRole) => {
      void commit((current) => {
        const user =
          current.users.find(
            (candidate) => candidate.primaryRole === role && candidate.status === "active",
          ) ??
          current.users.find(
            (candidate) => candidate.roles.includes(role) && candidate.status === "active",
          );
        assert(user, `No active demo user is available for the ${role} role.`);
        if (current.activeUserId === user.id && current.activeRole === role) return current;
        return { ...current, activeUserId: user.id, activeRole: role };
      }, { persist: false });
    },
    [commit],
  );

  const switchUser = useCallback(
    (userId: UUID) => {
      void commit((current) => {
        const user = current.users.find((candidate) => candidate.id === userId);
        assert(user && user.status === "active", "That demo user is not active.");
        const role = user.roles.includes(current.activeRole) ? current.activeRole : user.primaryRole;
        if (current.activeUserId === user.id && current.activeRole === role) return current;
        return { ...current, activeUserId: user.id, activeRole: role };
      }, { persist: false });
    },
    [commit],
  );

  const switchLocale = useCallback(
    (locale: Locale) => {
      void commit((current) => {
        if (current.locale === locale) return current;
        return { ...current, locale };
      }, { persist: false });
    },
    [commit],
  );

  const resetDemo = useCallback(async () => {
    assert(!recoveringRef.current, "The workspace is reloading its database state.");
    const current = stateRef.current;
    const now = new Date().toISOString();
    const reset = overlaySession(
      { ...createSeedState(), updatedAt: now },
      current,
    );
    const mutationVersion = mutationVersionRef.current + 1;
    mutationVersionRef.current = mutationVersion;
    stateRef.current = reset;
    setState(reset);
    await enqueueReset(mutationVersion);
  }, [enqueueReset]);

  const createListing = useCallback(
    async (input: CreateListingInput) => {
      const id = makeId();
      await commit((current) => {
        assertRole(current, ["farmer", "operations", "admin"], "create a supply listing");
        assertPositive(input.availableQuantity, "Available quantity");
        assertFcfa(input.unitPrice, "Unit price");
        assertPositive(input.minOrderQuantity ?? 1, "Minimum order quantity");
        assert(input.availableUntil >= input.availableFrom, "Availability end date must follow the start date.");
        const organisation = organisationForRole(current, "farmer", input.farmerOrganisationId);
        const product = current.products.find((candidate) => candidate.id === input.productId && candidate.active);
        assert(product, "Select an active catalogue product.");
        assert(product.allowedUnits.includes(input.unit), "That unit is not supported for this product.");
        const requestedStatus = input.status ?? "active";
        assert(
          requestedStatus === "draft" || organisation.verificationStatus === "verified",
          "Only verified farmers can publish active supply.",
        );
        const now = new Date().toISOString();
        const listing: SupplyListing = {
          id,
          reference: reference("LST-CM", current.listings.length, now),
          farmerOrganisationId: organisation.id,
          createdBy: current.activeUserId,
          productId: product.id,
          availableQuantity: input.availableQuantity,
          reservedQuantity: 0,
          unit: input.unit,
          unitPrice: input.unitPrice,
          minOrderQuantity: input.minOrderQuantity ?? 1,
          grade: input.grade,
          location: input.location ?? firstAddress(organisation, ["farm", "pickup"]),
          availableFrom: input.availableFrom,
          availableUntil: input.availableUntil,
          imageUrls: input.imageUrls ?? [product.imageUrl],
          notes: input.notes,
          status: requestedStatus,
          createdAt: now,
          updatedAt: now,
        };
        const next = { ...current, listings: [listing, ...current.listings] };
        return finish(
          next,
          audit(
            current,
            "listing.created",
            "listing",
            id,
            `Created ${product.name.en} supply listing ${listing.reference}.`,
            now,
            undefined,
            { status: listing.status, quantity: listing.availableQuantity, unitPrice: listing.unitPrice },
          ),
          now,
        );
      });
      return id;
    },
    [commit],
  );

  const createDemand = useCallback(
    async (input: CreateDemandInput) => {
      const id = makeId();
      const itemIds = input.items.map(() => makeId());
      await commit((current) => {
        assertRole(current, ["buyer", "operations", "admin"], "create a demand request");
        assert(input.title.trim().length >= 3, "Give the demand a short title.");
        assert(input.items.length > 0, "Add at least one product to the demand.");
        const organisation = organisationForRole(current, "buyer", input.buyerOrganisationId);
        assert(organisation.verificationStatus !== "suspended", "This buyer organisation is suspended.");
        const now = new Date().toISOString();
        const submit = input.submit ?? true;
        const items = input.items.map((item, index) => {
          assertPositive(item.quantity, "Demand quantity");
          if (item.targetUnitPrice !== undefined) assertFcfa(item.targetUnitPrice, "Target unit price");
          const product = current.products.find((candidate) => candidate.id === item.productId && candidate.active);
          assert(product, "One of the selected products is unavailable.");
          assert(product.allowedUnits.includes(item.unit), `${product.name.en} cannot be ordered in that unit.`);
          return {
            id: itemIds[index],
            demandId: id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
            grade: item.grade,
            targetUnitPrice: item.targetUnitPrice,
            notes: item.notes,
          };
        });
        const demand = {
          id,
          reference: reference("DM", current.demands.length, now),
          buyerOrganisationId: organisation.id,
          createdBy: current.activeUserId,
          title: input.title.trim(),
          deliveryAddress: input.deliveryAddress ?? firstAddress(organisation, ["delivery"]),
          requiredDeliveryDate: input.requiredDeliveryDate,
          itemIds,
          recurring: input.recurring ?? false,
          recurrenceNote: input.recurrenceNote,
          status: submit ? ("open" as const) : ("draft" as const),
          notes: input.notes,
          submittedAt: submit ? now : undefined,
          createdAt: now,
          updatedAt: now,
        };
        const farmerRecipients = submit
          ? current.users.filter(
              (user) =>
                user.status === "active" &&
                user.roles.includes("farmer") &&
                user.organisationIds.some((organisationId) => {
                  const farmer = current.organisations.find((candidate) => candidate.id === organisationId);
                  return farmer?.produceCategoryIds.some((productId) =>
                    input.items.some((item) => item.productId === productId),
                  );
                }),
            )
          : [];
        const newNotifications = farmerRecipients.map((user) =>
          notification(
            user.id,
            "demand_match",
            { en: "New buyer demand", fr: "Nouvelle demande acheteur" },
            {
              en: `${organisation.shortName} posted ${demand.title}.`,
              fr: `${organisation.shortName} a publié ${demand.title}.`,
            },
            "demand",
            id,
            now,
          ),
        );
        const next = {
          ...current,
          demands: [demand, ...current.demands],
          demandItems: [...items, ...current.demandItems],
          notifications: [...newNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "demand.created",
            "demand",
            id,
            `Created demand ${demand.reference} with ${items.length} item${items.length === 1 ? "" : "s"}.`,
            now,
            undefined,
            { status: demand.status, itemCount: items.length },
          ),
          now,
        );
      });
      return id;
    },
    [commit],
  );

  const submitQuote = useCallback(
    async (input: SubmitQuoteInput) => {
      const id = makeId();
      await commit((current) => {
        assertRole(current, ["farmer"], "submit a farmer quote");
        assertPositive(input.availableQuantity, "Available quantity");
        assertFcfa(input.unitPrice, "Unit price");
        const organisation = organisationForRole(current, "farmer", input.farmerOrganisationId);
        assert(organisation.verificationStatus === "verified", "Verification is required before quoting.");
        const item = current.demandItems.find((candidate) => candidate.id === input.demandItemId);
        assert(item, "Demand item not found.");
        const demand = current.demands.find((candidate) => candidate.id === item.demandId);
        assert(demand && ["open", "matching", "allocating"].includes(demand.status), "This demand is not accepting quotes.");
        const listing = input.sourceListingId
          ? current.listings.find((candidate) => candidate.id === input.sourceListingId)
          : undefined;
        if (listing) {
          assert(listing.farmerOrganisationId === organisation.id, "The source listing belongs to another farmer.");
          assert(listing.productId === item.productId && listing.unit === item.unit, "The source listing does not match the demand item.");
          assert(listing.availableQuantity - listing.reservedQuantity >= input.availableQuantity, "The source listing has insufficient available quantity.");
        }
        const now = new Date().toISOString();
        const quote = {
          id,
          reference: reference("QT", current.quotes.length, now),
          demandItemId: item.id,
          farmerOrganisationId: organisation.id,
          submittedBy: current.activeUserId,
          sourceListingId: input.sourceListingId,
          availableQuantity: input.availableQuantity,
          unit: item.unit,
          unitPrice: input.unitPrice,
          availableDate: input.availableDate,
          notes: input.notes,
          status: "submitted" as const,
          submittedAt: now,
          updatedAt: now,
        };
        const buyerNotifications = usersForOrganisation(current, demand.buyerOrganisationId).map((userId) =>
          notification(
            userId,
            "quote",
            { en: "New supply response", fr: "Nouvelle offre de fournisseur" },
            {
              en: `${organisation.shortName} responded to ${demand.reference}.`,
              fr: `${organisation.shortName} a répondu à ${demand.reference}.`,
            },
            "quote",
            id,
            now,
          ),
        );
        const next = {
          ...current,
          quotes: [quote, ...current.quotes],
          demands: current.demands.map((candidate) =>
            candidate.id === demand.id
              ? { ...candidate, status: "matching" as const, updatedAt: now }
              : candidate,
          ),
          notifications: [...buyerNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "quote.submitted",
            "quote",
            id,
            `Submitted quote ${quote.reference} for ${input.availableQuantity} ${item.unit}.`,
            now,
            undefined,
            { quantity: input.availableQuantity, unitPrice: input.unitPrice },
          ),
          now,
        );
      });
      return id;
    },
    [commit],
  );

  const createAllocation = useCallback(
    async (input: CreateAllocationInput) => {
      const id = makeId();
      await commit((current) => {
        assertRole(current, ["operations", "admin"], "create a fulfilment allocation");
        assertPositive(input.quantity, "Allocation quantity");
        const item = current.demandItems.find((candidate) => candidate.id === input.demandItemId);
        assert(item, "Demand item not found.");
        const demand = current.demands.find((candidate) => candidate.id === item.demandId);
        assert(demand && ["open", "matching", "allocating"].includes(demand.status), "This demand can no longer be allocated.");
        const quote = input.quoteId
          ? current.quotes.find((candidate) => candidate.id === input.quoteId)
          : undefined;
        assert(!input.quoteId || quote, "Quote not found.");
        assert(!quote || quote.demandItemId === item.id, "The quote belongs to another demand item.");
        const listingId = input.sourceListingId ?? quote?.sourceListingId;
        const listing = listingId
          ? current.listings.find((candidate) => candidate.id === listingId)
          : undefined;
        assert(!listingId || listing, "Source listing not found.");
        const farmerOrganisationId =
          input.farmerOrganisationId ?? quote?.farmerOrganisationId ?? listing?.farmerOrganisationId;
        assert(farmerOrganisationId, "Select a supplying farmer organisation.");
        const organisation = organisationForRole(current, "farmer", farmerOrganisationId);
        assert(!quote || quote.farmerOrganisationId === organisation.id, "Quote and farmer do not match.");
        assert(!listing || listing.farmerOrganisationId === organisation.id, "Listing and farmer do not match.");
        assert(!listing || (listing.productId === item.productId && listing.unit === item.unit), "Listing and demand item do not match.");
        const allocatedToItem = current.allocations
          .filter((allocation) => allocation.demandItemId === item.id && allocation.status !== "cancelled")
          .reduce((sum, allocation) => sum + allocation.quantity, 0);
        assert(allocatedToItem + input.quantity <= item.quantity, "Allocation would exceed the requested quantity.");
        if (quote) {
          const usedQuoteQuantity = current.allocations
            .filter((allocation) => allocation.quoteId === quote.id && allocation.status !== "cancelled")
            .reduce((sum, allocation) => sum + allocation.quantity, 0);
          assert(usedQuoteQuantity + input.quantity <= quote.availableQuantity, "Allocation would exceed the quoted quantity.");
        }
        if (listing) {
          const proposedListingQuantity = current.allocations
            .filter(
              (allocation) =>
                allocation.sourceListingId === listing.id &&
                allocation.status === "proposed" &&
                !allocation.orderId,
            )
            .reduce((sum, allocation) => sum + allocation.quantity, 0);
          assert(
            proposedListingQuantity + input.quantity <= listing.availableQuantity - listing.reservedQuantity,
            "The listing does not have enough unreserved quantity.",
          );
        }
        const unitPrice = input.farmerUnitPrice ?? quote?.unitPrice ?? listing?.unitPrice;
        assert(unitPrice !== undefined, "Enter the agreed farmer unit price.");
        assertFcfa(unitPrice, "Farmer unit price");
        const now = new Date().toISOString();
        const allocation: FulfilmentAllocation = {
          id,
          demandId: demand.id,
          demandItemId: item.id,
          quoteId: quote?.id,
          sourceListingId: listing?.id,
          farmerOrganisationId: organisation.id,
          quantity: input.quantity,
          unit: item.unit,
          farmerUnitPrice: unitPrice,
          farmerTotal: Math.round(input.quantity * unitPrice),
          status: "proposed",
          pickupAddress: input.pickupAddress ?? firstAddress(organisation, ["pickup", "farm"]),
          pickupWindow: input.pickupWindow,
          operationsNote: input.operationsNote,
          createdBy: current.activeUserId,
          createdAt: now,
          updatedAt: now,
        };
        const next = {
          ...current,
          allocations: [allocation, ...current.allocations],
          quotes: current.quotes.map((candidate) =>
            candidate.id === quote?.id
              ? { ...candidate, status: "shortlisted" as const, updatedAt: now }
              : candidate,
          ),
          demands: current.demands.map((candidate) =>
            candidate.id === demand.id
              ? { ...candidate, status: "allocating" as const, updatedAt: now }
              : candidate,
          ),
        };
        return finish(
          next,
          audit(
            current,
            "allocation.created",
            "allocation",
            id,
            `Allocated ${input.quantity} ${item.unit} from ${organisation.shortName}.`,
            now,
            undefined,
            { farmerOrganisationId: organisation.id, quantity: input.quantity, unitPrice },
          ),
          now,
        );
      });
      return id;
    },
    [commit],
  );

  const createOffer = useCallback(
    async (input: CreateOfferInput) => {
      const orderId = makeId();
      await commit((current) => {
        assertRole(current, ["operations", "admin"], "create a consolidated offer");
        const demand = current.demands.find((candidate) => candidate.id === input.demandId);
        assert(demand && ["open", "matching", "allocating"].includes(demand.status), "This demand cannot receive another offer.");
        const demandItems = current.demandItems.filter((item) => demand.itemIds.includes(item.id));
        const requestedIds = input.allocationIds ? new Set(input.allocationIds) : null;
        const selected = current.allocations.filter(
          (allocation) =>
            allocation.demandId === demand.id &&
            allocation.status === "proposed" &&
            !allocation.orderId &&
            (!requestedIds || requestedIds.has(allocation.id)),
        );
        assert(selected.length > 0, "Create at least one allocation before preparing an offer.");
        assert(
          demandItems.every((item) => selected.some((allocation) => allocation.demandItemId === item.id)),
          "Every demand line needs at least one allocation before an offer can be created.",
        );
        if (requestedIds) {
          assert(selected.length === requestedIds.size, "One or more selected allocations are unavailable.");
        }
        const now = new Date().toISOString();
        const itemByDemandId = new Map<UUID, OrderItem>();
        const orderItems: OrderItem[] = demandItems.map((item) => {
          const itemAllocations = selected.filter((allocation) => allocation.demandItemId === item.id);
          const quantity = itemAllocations.reduce((sum, allocation) => sum + allocation.quantity, 0);
          assert(quantity <= item.quantity, "Allocated quantity exceeds the demand line.");
          const maxFarmerPrice = Math.max(...itemAllocations.map((allocation) => allocation.farmerUnitPrice));
          const unitPrice =
            input.itemUnitPrices?.[item.id] ??
            item.targetUnitPrice ??
            Math.ceil((maxFarmerPrice * 1.08) / 50) * 50;
          assertFcfa(unitPrice, "Buyer unit price");
          const orderItem: OrderItem = {
            id: makeId(),
            orderId,
            demandItemId: item.id,
            productId: item.productId,
            quantity,
            allocatedQuantity: quantity,
            unit: item.unit,
            grade: item.grade,
            unitPrice,
            lineTotal: Math.round(quantity * unitPrice),
          };
          itemByDemandId.set(item.id, orderItem);
          return orderItem;
        });
        const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
        const serviceFeeRate = input.serviceFeeRate ?? 0.05;
        assert(serviceFeeRate >= 0 && serviceFeeRate <= 1, "Service fee rate must be between 0 and 1.");
        const serviceFee = Math.round(subtotal * serviceFeeRate);
        const deliveryFee = input.deliveryFee ?? 35_000;
        assertFcfa(deliveryFee, "Delivery fee");
        const order: Order = {
          id: orderId,
          reference: reference("FTM-CM", current.orders.length, now),
          demandId: demand.id,
          buyerOrganisationId: demand.buyerOrganisationId,
          createdBy: current.activeUserId,
          itemIds: orderItems.map((item) => item.id),
          allocationIds: selected.map((allocation) => allocation.id),
          deliveryAddress: demand.deliveryAddress,
          deliveryDate: demand.requiredDeliveryDate,
          status: "quoted",
          subtotal,
          serviceFee,
          deliveryFee,
          total: subtotal + serviceFee + deliveryFee,
          currency: "XAF",
          paymentStatus: "pending",
          operationsNote: input.operationsNote,
          quotedAt: now,
          createdAt: now,
          updatedAt: now,
        };
        const buyerNotifications = usersForOrganisation(current, demand.buyerOrganisationId).map((userId) =>
          notification(
            userId,
            "offer",
            { en: "Consolidated offer ready", fr: "Offre consolidée disponible" },
            {
              en: `${order.reference} is ready for your review and confirmation.`,
              fr: `${order.reference} est prête pour votre examen et confirmation.`,
            },
            "order",
            orderId,
            now,
          ),
        );
        const selectedIds = new Set(selected.map((allocation) => allocation.id));
        const selectedQuoteIds = new Set(
          selected.map((allocation) => allocation.quoteId).filter((id): id is UUID => Boolean(id)),
        );
        const next = {
          ...current,
          orders: [order, ...current.orders],
          orderItems: [...orderItems, ...current.orderItems],
          allocations: current.allocations.map((allocation) =>
            selectedIds.has(allocation.id)
              ? {
                  ...allocation,
                  orderId,
                  orderItemId: itemByDemandId.get(allocation.demandItemId)?.id,
                  updatedAt: now,
                }
              : allocation,
          ),
          quotes: current.quotes.map((quote) =>
            selectedQuoteIds.has(quote.id)
              ? { ...quote, status: "accepted" as const, updatedAt: now }
              : quote,
          ),
          demands: current.demands.map((candidate) =>
            candidate.id === demand.id
              ? { ...candidate, status: "offered" as const, updatedAt: now }
              : candidate,
          ),
          notifications: [...buyerNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "offer.created",
            "order",
            orderId,
            `Created consolidated offer ${order.reference}.`,
            now,
            undefined,
            { allocationCount: selected.length, total: order.total, currency: "XAF" },
          ),
          now,
        );
      });
      return orderId;
    },
    [commit],
  );

  const confirmOrder = useCallback(
    async (orderId: UUID) => {
      await commit((current) => {
        assertRole(current, ["buyer", "operations", "admin"], "confirm an order");
        const order = current.orders.find((candidate) => candidate.id === orderId);
        assert(order && order.status === "quoted", "Only a quoted offer can be confirmed.");
        if (current.activeRole === "buyer") {
          const buyerUser = current.users.find((user) => user.id === current.activeUserId);
          assert(
            buyerUser?.organisationIds.includes(order.buyerOrganisationId),
            "This offer belongs to another buyer organisation.",
          );
        }
        const allocations = current.allocations.filter((allocation) => order.allocationIds.includes(allocation.id));
        assert(allocations.length > 0, "The order has no supply allocations.");
        allocations.forEach((allocation) => {
          const organisation = current.organisations.find(
            (candidate) => candidate.id === allocation.farmerOrganisationId,
          );
          assert(organisation?.verificationStatus === "verified", `${organisation?.shortName ?? "A supplier"} must be verified first.`);
          if (allocation.sourceListingId) {
            const listing = current.listings.find((candidate) => candidate.id === allocation.sourceListingId);
            assert(listing?.status === "active", "An allocated listing is no longer active.");
            assert(
              listing.availableQuantity - listing.reservedQuantity >= allocation.quantity,
              `${listing.reference} no longer has enough unreserved quantity.`,
            );
          }
        });
        const now = new Date().toISOString();
        const buyer = current.organisations.find((candidate) => candidate.id === order.buyerOrganisationId);
        const logistics = current.organisations.find((candidate) => candidate.type === "logistics");
        const shipmentId = makeId();
        const shipment: Shipment = {
          id: shipmentId,
          reference: reference("SHP-CM", current.shipments.length, now),
          orderId: order.id,
          providerOrganisationId: logistics?.id,
          transporterName: logistics?.name ?? "Transport pending assignment",
          transporterPhone: logistics?.phone ?? "Pending",
          driverName: logistics?.contactPerson,
          pickupStops: allocations.map((allocation) => {
            const supplier = current.organisations.find(
              (candidate) => candidate.id === allocation.farmerOrganisationId,
            );
            return {
              id: makeId(),
              allocationId: allocation.id,
              address: allocation.pickupAddress,
              contactName: supplier?.contactPerson ?? "Supplier contact",
              contactPhone: supplier?.phone ?? "Pending",
              status: "pending" as const,
            };
          }),
          deliveryAddress: order.deliveryAddress,
          status: "planned",
          createdBy: current.activeUserId,
          createdAt: now,
          updatedAt: now,
        };
        const existingPayment = current.payments.find((payment) => payment.orderId === order.id);
        const pendingPayment: PaymentTransaction | undefined = existingPayment
          ? undefined
          : {
              id: makeId(),
              orderId: order.id,
              provider: buyer?.preferredPaymentProvider ?? "bank_transfer",
              transactionReference: `PENDING-${order.reference}`,
              amount: order.total,
              currency: "XAF",
              status: "pending",
              initiatedAt: now,
              updatedAt: now,
            };
        const listingAllocationQuantities = allocations.reduce<Record<UUID, number>>((totals, allocation) => {
          if (allocation.sourceListingId) {
            totals[allocation.sourceListingId] =
              (totals[allocation.sourceListingId] ?? 0) + allocation.quantity;
          }
          return totals;
        }, {});
        const farmerNotifications = allocations.flatMap((allocation) =>
          usersForOrganisation(current, allocation.farmerOrganisationId).map((userId) =>
            notification(
              userId,
              "order",
              { en: "Allocation confirmed", fr: "Allocation confirmée" },
              {
                en: `${allocation.quantity} ${allocation.unit} is confirmed for ${order.reference}.`,
                fr: `${allocation.quantity} ${allocation.unit} est confirmé pour ${order.reference}.`,
              },
              "order",
              order.id,
              now,
            ),
          ),
        );
        const next = {
          ...current,
          orders: current.orders.map((candidate) =>
            candidate.id === order.id
              ? {
                  ...candidate,
                  status: "confirmed" as const,
                  shipmentStatus: "planned" as const,
                  confirmedAt: now,
                  updatedAt: now,
                }
              : candidate,
          ),
          allocations: current.allocations.map((allocation) =>
            order.allocationIds.includes(allocation.id)
              ? { ...allocation, status: "confirmed" as const, updatedAt: now }
              : allocation,
          ),
          listings: current.listings.map((listing) => {
            const quantity = listingAllocationQuantities[listing.id];
            return quantity
              ? { ...listing, reservedQuantity: listing.reservedQuantity + quantity, updatedAt: now }
              : listing;
          }),
          payments: pendingPayment ? [pendingPayment, ...current.payments] : current.payments,
          shipments: [shipment, ...current.shipments],
          notifications: [...farmerNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "order.confirmed",
            "order",
            order.id,
            `Confirmed order ${order.reference} and reserved its supply.`,
            now,
            { status: order.status },
            { status: "confirmed", shipmentId },
          ),
          now,
        );
      });
    },
    [commit],
  );

  const confirmPayment = useCallback(
    async (input: ConfirmPaymentInput) => {
      let resultId = makeId();
      await commit((current) => {
        assertRole(current, ["buyer", "operations", "admin"], "confirm a payment");
        assert(input.transactionReference.trim().length > 0, "Enter the provider transaction reference.");
        const order = current.orders.find((candidate) => candidate.id === input.orderId);
        assert(order && !["cancelled", "refunded"].includes(order.status), "This order cannot receive a payment.");
        if (current.activeRole === "buyer") {
          const buyerUser = current.users.find((user) => user.id === current.activeUserId);
          assert(
            buyerUser?.organisationIds.includes(order.buyerOrganisationId),
            "This order belongs to another buyer organisation.",
          );
        }
        const amount = input.amount ?? order.total;
        assertFcfa(amount, "Payment amount");
        assert(amount === order.total, "The confirmed payment must match the order total.");
        const reusable = current.payments.find(
          (payment) =>
            payment.orderId === order.id &&
            ["pending", "processing", "failed"].includes(payment.status),
        );
        if (reusable) resultId = reusable.id;
        const duplicate = current.payments.find(
          (payment) =>
            payment.id !== reusable?.id &&
            payment.provider === input.provider &&
            payment.transactionReference === input.transactionReference.trim(),
        );
        assert(!duplicate, "That provider transaction reference has already been used.");
        const existingSuccess = current.payments.find(
          (payment) => payment.orderId === order.id && payment.status === "succeeded",
        );
        if (existingSuccess) {
          resultId = existingSuccess.id;
          return current;
        }
        const now = new Date().toISOString();
        const completed: PaymentTransaction = {
          ...(reusable ?? {
            id: resultId,
            orderId: order.id,
            currency: "XAF" as const,
            initiatedAt: now,
          }),
          provider: input.provider,
          transactionReference: input.transactionReference.trim(),
          amount,
          payerMaskedAccount: input.payerMaskedAccount,
          status: "succeeded",
          verifiedBy: current.activeUserId,
          verifiedAt: now,
          completedAt: now,
          updatedAt: now,
        };
        const buyerNotifications = usersForOrganisation(current, order.buyerOrganisationId).map((userId) =>
          notification(
            userId,
            "payment",
            { en: "Payment confirmed", fr: "Paiement confirmé" },
            {
              en: `Payment for ${order.reference} has been confirmed.`,
              fr: `Le paiement de ${order.reference} a été confirmé.`,
            },
            "payment",
            completed.id,
            now,
          ),
        );
        const next = {
          ...current,
          payments: reusable
            ? current.payments.map((payment) => (payment.id === reusable.id ? completed : payment))
            : [completed, ...current.payments],
          orders: current.orders.map((candidate) =>
            candidate.id === order.id
              ? { ...candidate, paymentStatus: "succeeded" as const, updatedAt: now }
              : candidate,
          ),
          notifications: [...buyerNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "payment.confirmed",
            "payment",
            completed.id,
            `Confirmed ${input.provider} payment for ${order.reference}.`,
            now,
            reusable ? { status: reusable.status, transactionReference: reusable.transactionReference } : undefined,
            { status: "succeeded", transactionReference: completed.transactionReference, amount },
          ),
          now,
        );
      });
      return resultId;
    },
    [commit],
  );

  const advanceShipment = useCallback(
    async (shipmentId: UUID) => {
      await commit((current) => {
        assertRole(current, ["operations", "admin", "transporter"], "advance a shipment");
        const shipment = current.shipments.find((candidate) => candidate.id === shipmentId);
        assert(shipment, "Shipment not found.");
        const nextStatus = shipmentTransitions[shipment.status];
        assert(nextStatus, `${shipment.status} is a terminal shipment status.`);
        const order = current.orders.find((candidate) => candidate.id === shipment.orderId);
        assert(order && !["draft", "requested", "quoted", "cancelled", "refunded"].includes(order.status), "The order is not confirmed for movement.");
        if (["picked_up", "in_transit", "delivered"].includes(nextStatus)) {
          assert(order.paymentStatus === "succeeded", "Confirm payment before produce is picked up.");
        }
        const now = new Date().toISOString();
        const orderStatus: Order["status"] =
          nextStatus === "pickup_scheduled" || nextStatus === "picked_up"
            ? "ready_for_pickup"
            : nextStatus === "in_transit"
              ? "in_transit"
              : nextStatus === "delivered"
                ? "delivered"
                : order.status;
        const allocationStatus: FulfilmentAllocation["status"] | undefined =
          nextStatus === "pickup_scheduled"
            ? "ready_for_pickup"
            : nextStatus === "picked_up" || nextStatus === "in_transit"
              ? "picked_up"
              : nextStatus === "delivered"
                ? "delivered"
                : undefined;
        const buyerNotifications =
          nextStatus === "in_transit" || nextStatus === "delivered"
            ? usersForOrganisation(current, order.buyerOrganisationId).map((userId) =>
                notification(
                  userId,
                  nextStatus === "delivered" ? "delivery" : "pickup",
                  nextStatus === "delivered"
                    ? { en: "Delivery arrived", fr: "Livraison arrivée" }
                    : { en: "Order on the way", fr: "Commande en route" },
                  nextStatus === "delivered"
                    ? {
                        en: `${order.reference} is ready for acceptance.`,
                        fr: `${order.reference} est prête pour acceptation.`,
                      }
                    : {
                        en: `${order.reference} is now in transit.`,
                        fr: `${order.reference} est maintenant en route.`,
                      },
                  nextStatus === "delivered" ? "order" : "shipment",
                  nextStatus === "delivered" ? order.id : shipment.id,
                  now,
                ),
              )
            : [];
        const next = {
          ...current,
          shipments: current.shipments.map((candidate) =>
            candidate.id === shipment.id
              ? {
                  ...candidate,
                  status: nextStatus,
                  exceptionNote: nextStatus === "in_transit" ? undefined : candidate.exceptionNote,
                  deliveredAt: nextStatus === "delivered" ? now : candidate.deliveredAt,
                  pickupStops:
                    nextStatus === "picked_up"
                      ? candidate.pickupStops.map((stop) => ({
                          ...stop,
                          status: "completed" as const,
                          completedAt: now,
                        }))
                      : candidate.pickupStops,
                  updatedAt: now,
                }
              : candidate,
          ),
          orders: current.orders.map((candidate) =>
            candidate.id === order.id
              ? {
                  ...candidate,
                  status: orderStatus,
                  shipmentStatus: nextStatus,
                  deliveredAt: nextStatus === "delivered" ? now : candidate.deliveredAt,
                  updatedAt: now,
                }
              : candidate,
          ),
          allocations: allocationStatus
            ? current.allocations.map((allocation) =>
                order.allocationIds.includes(allocation.id)
                  ? { ...allocation, status: allocationStatus, updatedAt: now }
                  : allocation,
              )
            : current.allocations,
          notifications: [...buyerNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "shipment.advanced",
            "shipment",
            shipment.id,
            `Advanced ${shipment.reference} to ${nextStatus}.`,
            now,
            { status: shipment.status },
            { status: nextStatus },
          ),
          now,
        );
      });
    },
    [commit],
  );

  const acceptDelivery = useCallback(
    async (orderId: UUID) => {
      await commit((current) => {
        assertRole(current, ["buyer", "operations", "admin"], "accept a delivery");
        const order = current.orders.find((candidate) => candidate.id === orderId);
        assert(order?.status === "delivered", "Only a delivered order can be accepted.");
        if (current.activeRole === "buyer") {
          const buyerUser = current.users.find((user) => user.id === current.activeUserId);
          assert(
            buyerUser?.organisationIds.includes(order.buyerOrganisationId),
            "This delivery belongs to another buyer organisation.",
          );
        }
        const now = new Date().toISOString();
        const listingAllocationQuantities = current.allocations
          .filter((allocation) => order.allocationIds.includes(allocation.id))
          .reduce<Record<UUID, number>>((totals, allocation) => {
            if (allocation.sourceListingId) {
              totals[allocation.sourceListingId] =
                (totals[allocation.sourceListingId] ?? 0) + allocation.quantity;
            }
            return totals;
          }, {});
        const next = {
          ...current,
          orders: current.orders.map((candidate) =>
            candidate.id === order.id
              ? { ...candidate, status: "accepted" as const, acceptedAt: now, updatedAt: now }
              : candidate,
          ),
          listings: current.listings.map((listing) => {
            const quantity = listingAllocationQuantities[listing.id];
            if (!quantity) return listing;
            return {
              ...listing,
              availableQuantity: Math.max(0, listing.availableQuantity - quantity),
              reservedQuantity: Math.max(0, listing.reservedQuantity - quantity),
              updatedAt: now,
            };
          }),
          demands: order.demandId
            ? current.demands.map((demand) =>
                demand.id === order.demandId
                  ? { ...demand, status: "fulfilled" as const, updatedAt: now }
                  : demand,
              )
            : current.demands,
        };
        return finish(
          next,
          audit(
            current,
            "delivery.accepted",
            "order",
            order.id,
            `Accepted delivery for ${order.reference}.`,
            now,
            { status: order.status },
            { status: "accepted" },
          ),
          now,
        );
      });
    },
    [commit],
  );

  const openDispute = useCallback(
    async (input: OpenDisputeInput) => {
      const id = makeId();
      await commit((current) => {
        assertRole(current, ["buyer", "support", "operations", "admin"], "open a dispute");
        const order = current.orders.find((candidate) => candidate.id === input.orderId);
        assert(order && ["delivered", "accepted"].includes(order.status), "A dispute can only be opened after delivery.");
        if (current.activeRole === "buyer") {
          const buyerUser = current.users.find((user) => user.id === current.activeUserId);
          assert(
            buyerUser?.organisationIds.includes(order.buyerOrganisationId),
            "This order belongs to another buyer organisation.",
          );
        }
        assert(
          !current.disputes.some(
            (dispute) => dispute.orderId === order.id && ["open", "under_review"].includes(dispute.status),
          ),
          "This order already has an open dispute.",
        );
        assert(input.description.trim().length >= 10, "Describe the issue in a little more detail.");
        if (input.affectedQuantity !== undefined) assertPositive(input.affectedQuantity, "Affected quantity");
        const now = new Date().toISOString();
        const supportUser = current.users.find(
          (user) => user.status === "active" && user.roles.includes("support"),
        );
        const dispute: Dispute = {
          id,
          reference: reference("DSP", current.disputes.length, now),
          orderId: order.id,
          openedBy: current.activeUserId,
          reason: input.reason,
          description: input.description.trim(),
          affectedOrderItemIds: input.affectedOrderItemIds ?? order.itemIds,
          affectedQuantity: input.affectedQuantity,
          requestedResolution: input.requestedResolution,
          status: supportUser ? "under_review" : "open",
          evidence: (input.evidence ?? []).map((item) => ({
            id: makeId(),
            ...item,
            addedBy: current.activeUserId,
            createdAt: now,
          })),
          assignedTo: supportUser?.id,
          financialAdjustment: 0,
          openedAt: now,
          updatedAt: now,
        };
        const supportNotifications = supportUser
          ? [
              notification(
                supportUser.id,
                "dispute",
                { en: "New dispute assigned", fr: "Nouveau litige assigné" },
                {
                  en: `${dispute.reference} was opened for ${order.reference}.`,
                  fr: `${dispute.reference} a été ouvert pour ${order.reference}.`,
                },
                "dispute",
                id,
                now,
              ),
            ]
          : [];
        const next = {
          ...current,
          disputes: [dispute, ...current.disputes],
          orders: current.orders.map((candidate) =>
            candidate.id === order.id
              ? { ...candidate, status: "disputed" as const, updatedAt: now }
              : candidate,
          ),
          notifications: [...supportNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "dispute.opened",
            "dispute",
            id,
            `Opened ${dispute.reason} dispute ${dispute.reference}.`,
            now,
            undefined,
            { status: dispute.status, requestedResolution: dispute.requestedResolution },
          ),
          now,
        );
      });
      return id;
    },
    [commit],
  );

  const resolveDispute = useCallback(
    async (input: ResolveDisputeInput) => {
      await commit((current) => {
        assertRole(current, ["support", "operations", "admin"], "resolve a dispute");
        const dispute = current.disputes.find((candidate) => candidate.id === input.disputeId);
        assert(dispute && ["open", "under_review"].includes(dispute.status), "This dispute is not open.");
        assert(input.resolution.trim().length >= 5, "Record a clear resolution.");
        const order = current.orders.find((candidate) => candidate.id === dispute.orderId);
        assert(order, "The disputed order was not found.");
        const adjustment = input.financialAdjustment ?? 0;
        assertFcfa(adjustment, "Financial adjustment");
        assert(adjustment <= order.total, "Financial adjustment cannot exceed the order total.");
        const now = new Date().toISOString();
        const refundStatus: Extract<
          PaymentTransaction["status"],
          "refunded" | "partially_refunded"
        > | undefined =
          input.refundPayment && adjustment > 0
            ? adjustment >= order.total
              ? "refunded"
              : "partially_refunded"
            : undefined;
        const nextOrderStatus: Order["status"] =
          refundStatus === "refunded" ? "refunded" : "completed";
        const listingAllocationQuantities = current.allocations
          .filter((allocation) => order.allocationIds.includes(allocation.id))
          .reduce<Record<UUID, number>>((totals, allocation) => {
            if (allocation.sourceListingId) {
              totals[allocation.sourceListingId] =
                (totals[allocation.sourceListingId] ?? 0) + allocation.quantity;
            }
            return totals;
          }, {});
        const openerNotification = notification(
          dispute.openedBy,
          "dispute",
          { en: "Dispute decision recorded", fr: "Décision de litige enregistrée" },
          {
            en: `${dispute.reference} was ${input.status.replaceAll("_", " ")}.`,
            fr: `${dispute.reference} a été traité.`,
          },
          "dispute",
          dispute.id,
          now,
        );
        const next = {
          ...current,
          disputes: current.disputes.map((candidate) =>
            candidate.id === dispute.id
              ? {
                  ...candidate,
                  status: input.status,
                  resolution: input.resolution.trim(),
                  investigationNote: input.investigationNote ?? candidate.investigationNote,
                  financialAdjustment: adjustment,
                  resolvedBy: current.activeUserId,
                  resolvedAt: now,
                  updatedAt: now,
                }
              : candidate,
          ),
          orders: current.orders.map((candidate) =>
            candidate.id === order.id
              ? {
                  ...candidate,
                  status: nextOrderStatus,
                  paymentStatus: refundStatus ?? candidate.paymentStatus,
                  completedAt: nextOrderStatus === "completed" ? now : candidate.completedAt,
                  updatedAt: now,
                }
              : candidate,
          ),
          payments: refundStatus
            ? current.payments.map((payment) =>
                payment.orderId === order.id && payment.status === "succeeded"
                  ? { ...payment, status: refundStatus, updatedAt: now }
                  : payment,
              )
            : current.payments,
          listings: current.listings.map((listing) => {
            const quantity = listingAllocationQuantities[listing.id];
            if (!quantity) return listing;
            return {
              ...listing,
              availableQuantity: Math.max(0, listing.availableQuantity - quantity),
              reservedQuantity: Math.max(0, listing.reservedQuantity - quantity),
              updatedAt: now,
            };
          }),
          demands: order.demandId
            ? current.demands.map((demand) =>
                demand.id === order.demandId
                  ? { ...demand, status: "fulfilled" as const, updatedAt: now }
                  : demand,
              )
            : current.demands,
          notifications: [openerNotification, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "dispute.resolved",
            "dispute",
            dispute.id,
            `Resolved ${dispute.reference} as ${input.status}.`,
            now,
            { status: dispute.status },
            { status: input.status, financialAdjustment: adjustment },
          ),
          now,
        );
      });
    },
    [commit],
  );

  const verifyOrganisation = useCallback(
    async (input: VerifyOrganisationInput) => {
      await commit((current) => {
        assertRole(current, ["operations", "admin"], "change organisation verification");
        const organisation = current.organisations.find(
          (candidate) => candidate.id === input.organisationId,
        );
        assert(organisation, "Organisation not found.");
        if (input.status === "rejected" || input.status === "suspended") {
          assert(input.notes?.trim(), "Record a reason for rejection or suspension.");
        }
        const now = new Date().toISOString();
        const memberNotifications = organisation.memberUserIds.map((userId) =>
          notification(
            userId,
            "verification",
            {
              en: `Verification ${input.status}`,
              fr: `Vérification : ${input.status}`,
            },
            {
              en: `${organisation.shortName} is now ${input.status}.`,
              fr: `${organisation.shortName} est maintenant ${input.status}.`,
            },
            "organisation",
            organisation.id,
            now,
          ),
        );
        const next = {
          ...current,
          organisations: current.organisations.map((candidate) =>
            candidate.id === organisation.id
              ? {
                  ...candidate,
                  verificationStatus: input.status,
                  verificationNotes: input.notes?.trim() ?? candidate.verificationNotes,
                  verifiedAt: input.status === "verified" ? now : candidate.verifiedAt,
                  verifiedBy: input.status === "verified" ? current.activeUserId : candidate.verifiedBy,
                  updatedAt: now,
                }
              : candidate,
          ),
          users: current.users.map((user) =>
            organisation.memberUserIds.includes(user.id)
              ? {
                  ...user,
                  status:
                    input.status === "verified"
                      ? ("active" as const)
                      : input.status === "suspended"
                        ? ("suspended" as const)
                        : input.status === "rejected"
                          ? ("rejected" as const)
                          : user.status,
                }
              : user,
          ),
          listings: current.listings.map((listing) =>
            listing.farmerOrganisationId === organisation.id &&
            input.status === "verified" &&
            listing.status === "draft"
              ? { ...listing, status: "active" as const, updatedAt: now }
              : listing.farmerOrganisationId === organisation.id &&
                  ["rejected", "suspended"].includes(input.status) &&
                  listing.status === "active"
                ? { ...listing, status: "paused" as const, updatedAt: now }
                : listing,
          ),
          notifications: [...memberNotifications, ...current.notifications],
        };
        return finish(
          next,
          audit(
            current,
            "organisation.verification_changed",
            "organisation",
            organisation.id,
            `Changed ${organisation.shortName} verification to ${input.status}.`,
            now,
            { verificationStatus: organisation.verificationStatus },
            { verificationStatus: input.status, notes: input.notes },
          ),
          now,
        );
      });
    },
    [commit],
  );

  const markNotificationRead = useCallback(
    async (notificationId: UUID) => {
      await commit((current) => {
        const item = current.notifications.find((candidate) => candidate.id === notificationId);
        assert(item, "Notification not found.");
        if (item.readAt) return current;
        assert(
          item.recipientUserId === current.activeUserId || ["admin", "support"].includes(current.activeRole),
          "You cannot update another user's notification.",
        );
        const now = new Date().toISOString();
        const next = {
          ...current,
          notifications: current.notifications.map((candidate) =>
            candidate.id === item.id
              ? { ...candidate, status: "read" as const, readAt: now }
              : candidate,
          ),
        };
        return finish(
          next,
          audit(
            current,
            "notification.read",
            "notification",
            item.id,
            "Marked an in-app notification as read.",
            now,
          ),
          now,
        );
      });
    },
    [commit],
  );

  const actions = useMemo<AppActions>(
    () => ({
      switchRole,
      switchUser,
      switchLocale,
      setLocale: switchLocale,
      resetDemo,
      createListing,
      createDemand,
      submitQuote,
      createAllocation,
      createOffer,
      confirmOrder,
      confirmPayment,
      advanceShipment,
      acceptDelivery,
      openDispute,
      resolveDispute,
      verifyOrganisation,
      markNotificationRead,
    }),
    [
      acceptDelivery,
      advanceShipment,
      confirmOrder,
      confirmPayment,
      createAllocation,
      createDemand,
      createListing,
      createOffer,
      markNotificationRead,
      openDispute,
      resetDemo,
      resolveDispute,
      submitQuote,
      switchLocale,
      switchRole,
      switchUser,
      verifyOrganisation,
    ],
  );

  const currentUser = useMemo(
    () => state.users.find((user) => user.id === state.activeUserId),
    [state.activeUserId, state.users],
  );
  const currentOrganisation = useMemo(() => {
    const organisationIds = currentUser?.organisationIds ?? [];
    const preferredTypes =
      state.activeRole === "farmer"
        ? ["farmer", "cooperative"]
        : state.activeRole === "buyer"
          ? ["buyer"]
          : state.activeRole === "transporter"
            ? ["logistics"]
            : ["platform"];
    return (
      state.organisations.find(
        (organisation) =>
          organisationIds.includes(organisation.id) && preferredTypes.includes(organisation.type),
      ) ?? state.organisations.find((organisation) => organisationIds.includes(organisation.id))
    );
  }, [currentUser?.organisationIds, state.activeRole, state.organisations]);
  const metrics = useMemo(
    () => deriveDashboardMetrics(state, state.activeUserId),
    [state],
  );
  const value = useMemo<AppContextValue>(
    () => ({
      state,
      hydrated,
      isHydrated: hydrated,
      isPersisting,
      loadError,
      persistenceError,
      retryHydration,
      clearPersistenceError,
      currentUser,
      currentOrganisation,
      currentRole: state.activeRole,
      locale: state.locale,
      metrics,
      actions,
    }),
    [
      actions,
      clearPersistenceError,
      currentOrganisation,
      currentUser,
      hydrated,
      isPersisting,
      loadError,
      metrics,
      persistenceError,
      retryHydration,
      state,
    ],
  );

  return (
    <AppContext.Provider value={value}>
      {isMarketplaceWorkspace && !hydrated && loadError ? (
        <main className="grid min-h-screen place-items-center bg-[var(--cream)] px-6">
          <section
            className="surface w-full max-w-lg p-7 text-center sm:p-9"
            role="alert"
            aria-live="assertive"
          >
            <p className="eyebrow">Database connection</p>
            <h1 className="font-display mt-3 text-3xl font-bold text-[var(--forest-strong)]">
              We could not load your workspace
            </h1>
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">{loadError}</p>
            <button
              type="button"
              onClick={retryHydration}
              className="mt-6 rounded-xl bg-[var(--forest)] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--forest-strong)]"
            >
              Retry database connection
            </button>
          </section>
        </main>
      ) : (
        children
      )}
      {isMarketplaceWorkspace && hydrated && persistenceError ? (
        <div
          className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-2xl items-start justify-between gap-4 rounded-2xl border border-red-200 bg-white p-4 text-sm shadow-xl"
          role="alert"
          aria-live="assertive"
        >
          <div>
            <p className="font-extrabold text-red-800">Database save failed</p>
            <p className="mt-1 leading-5 text-red-700">{persistenceError}</p>
          </div>
          <button
            type="button"
            onClick={clearPersistenceError}
            className="shrink-0 font-extrabold text-red-800 underline underline-offset-2"
          >
            Dismiss
          </button>
        </div>
      ) : null}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider.");
  return context;
}

export function useAppState() {
  return useApp().state;
}

export function useAppActions() {
  return useApp().actions;
}

export default AppProvider;
