import {
  dataResponse,
  errorResponse,
  getRequestId,
} from "@/lib/api-helpers";
import { checkDatabaseConnection } from "@/server/db/prisma";
import { getDatabaseStateMetadata } from "@/server/db/state-repository";
import { stateRouteError } from "@/server/db/state-http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  try {
    await checkDatabaseConnection();
    const database = await getDatabaseStateMetadata();
    if (!database) {
      return errorResponse({
        status: 503,
        code: "DATABASE_NOT_SEEDED",
        message:
          "PostgreSQL is reachable, but the FarmToMarket seed has not been loaded.",
        requestId,
      });
    }

    return dataResponse(
      {
        status: "ok",
        service: "FarmToMarket API",
        version: "v1",
        timestamp: new Date().toISOString(),
        database: {
          status: "ready",
          provider: "postgresql",
          schemaVersion: database.schemaVersion,
          revision: database.revision,
          updatedAt: database.updatedAt,
        },
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}
