import { dataResponse, getRequestId } from "@/lib/api-helpers";

export function GET(request: Request) {
  const requestId = getRequestId(request);

  return dataResponse(
    {
      status: "ok",
      service: "FarmToMarket demo API",
      version: "v1",
      timestamp: new Date().toISOString(),
      demo: true,
    },
    { requestId },
  );
}
