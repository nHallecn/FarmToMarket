import {
  dataResponse,
  errorResponse,
  getRequestId,
} from "@/lib/api-helpers";
import { deriveDashboardMetrics } from "@/lib/domain";
import { createSeedState } from "@/lib/seed-data";

const allowedRoles = new Set(["operations", "admin"]);

export function GET(request: Request) {
  const requestId = getRequestId(request);
  const role = request.headers.get("x-demo-role")?.trim().toLowerCase() ?? "";

  if (!allowedRoles.has(role)) {
    return errorResponse({
      status: 403,
      code: "FORBIDDEN",
      message:
        "This demo endpoint requires x-demo-role: operations or x-demo-role: admin.",
      requestId,
    });
  }

  const state = createSeedState();
  const operationsUser = state.users.find((user) =>
    user.roles.includes(role === "admin" ? "admin" : "operations"),
  );
  const metrics = deriveDashboardMetrics(
    state,
    operationsUser?.id ?? state.activeUserId,
  );
  const verificationReviews = state.organisations.filter(
    (organisation) => organisation.verificationStatus === "pending",
  ).length;

  return dataResponse(
    {
      metrics,
      actionQueues: {
        verificationReviews,
        unallocatedDemandItems: metrics.unallocatedDemandItems,
        pickupsDue: metrics.pickupsDue,
        deliveriesDue: metrics.deliveriesDue,
        paymentExceptions: metrics.paymentExceptions,
        openDisputes: metrics.openDisputes,
      },
      recentOrders: [...state.orders]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5)
        .map((order) => ({
          id: order.id,
          reference: order.reference,
          buyerOrganisationId: order.buyerOrganisationId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          shipmentStatus: order.shipmentStatus,
          total: order.total,
          currency: order.currency,
          deliveryDate: order.deliveryDate,
          updatedAt: order.updatedAt,
        })),
      sourceSnapshotAt: state.updatedAt,
      generatedAt: new Date().toISOString(),
      authorisedAs: role,
      demo: true,
    },
    { requestId },
  );
}
