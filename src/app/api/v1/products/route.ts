import { dataResponse, getRequestId } from "@/lib/api-helpers";
import { createSeedState } from "@/lib/seed-data";

export function GET(request: Request) {
  const requestId = getRequestId(request);
  const state = createSeedState();
  const items = [...state.products].sort((a, b) =>
    a.name.en.localeCompare(b.name.en),
  );

  return dataResponse(
    {
      items,
      count: items.length,
      demo: true,
    },
    { requestId },
  );
}
