import {
  dataResponse,
  errorResponse,
  getRequestId,
} from "@/lib/api-helpers";
import { loadDomainState } from "@/server/db/state-repository";
import { stateRouteError } from "@/server/db/state-http";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestId = getRequestId(request);
  const { id } = await params;
  const lookup = id.trim().toLowerCase();
  try {
    const state = await loadDomainState();
    const order = state.orders.find(
      (candidate) =>
        candidate.id.toLowerCase() === lookup ||
        candidate.reference.toLowerCase() === lookup,
    );

    if (!order) {
      return errorResponse({
        status: 404,
        code: "ORDER_NOT_FOUND",
        message: `No order was found for '${id}'.`,
        requestId,
      });
    }

    const products = new Map(state.products.map((product) => [product.id, product]));
    const organisations = new Map(
      state.organisations.map((organisation) => [organisation.id, organisation]),
    );
    const buyer = organisations.get(order.buyerOrganisationId);
    const items = state.orderItems
      .filter((item) => order.itemIds.includes(item.id) || item.orderId === order.id)
      .map((item) => ({
        ...item,
        product: products.get(item.productId) ?? null,
      }));
    const allocations = state.allocations
      .filter(
        (allocation) =>
          order.allocationIds.includes(allocation.id) || allocation.orderId === order.id,
      )
      .map((allocation) => {
        const farmer = organisations.get(allocation.farmerOrganisationId);
        return {
          ...allocation,
          farmer: farmer
            ? {
                id: farmer.id,
                name: farmer.name,
                shortName: farmer.shortName,
                verificationStatus: farmer.verificationStatus,
              }
            : null,
        };
      });

    return dataResponse(
      {
        order,
        buyer: buyer
          ? {
              id: buyer.id,
              name: buyer.name,
              shortName: buyer.shortName,
              type: buyer.type,
              verificationStatus: buyer.verificationStatus,
            }
          : null,
        items,
        allocations,
        payments: state.payments.filter((payment) => payment.orderId === order.id),
        shipments: state.shipments.filter((shipment) => shipment.orderId === order.id),
        disputes: state.disputes.filter((dispute) => dispute.orderId === order.id),
        auditEvents: state.audits.filter(
          (event) =>
            (event.targetType === "order" && event.targetId === order.id) ||
            (event.targetType === "payment" &&
              state.payments.some(
                (payment) => payment.id === event.targetId && payment.orderId === order.id,
              )) ||
            (event.targetType === "shipment" &&
              state.shipments.some(
                (shipment) => shipment.id === event.targetId && shipment.orderId === order.id,
              )) ||
            (event.targetType === "dispute" &&
              state.disputes.some(
                (dispute) => dispute.id === event.targetId && dispute.orderId === order.id,
              )),
        ),
        persisted: true,
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}
