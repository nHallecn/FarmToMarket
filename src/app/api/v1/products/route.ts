import { dataResponse, getRequestId } from "@/lib/api-helpers";
import { loadDomainState } from "@/server/db/state-repository";
import { stateRouteError } from "@/server/db/state-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    const state = await loadDomainState();
    const items = [...state.products].sort((a, b) =>
      a.name.en.localeCompare(b.name.en),
    );

    return dataResponse(
      {
        items,
        count: items.length,
        persisted: true,
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}
