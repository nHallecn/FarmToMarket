import {
  dataResponse,
  errorResponse,
  getRequestId,
  type FieldErrors,
} from "@/lib/api-helpers";
import type { ProduceGrade } from "@/lib/domain";
import { loadDomainState } from "@/server/db/state-repository";
import { stateRouteError } from "@/server/db/state-http";

const grades: ProduceGrade[] = ["premium", "grade_a", "grade_b", "standard"];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const searchParams = new URL(request.url).searchParams;
  const productFilter = searchParams.get("product")?.trim().toLowerCase() ?? "";
  const locationFilter = searchParams.get("location")?.trim().toLowerCase() ?? "";
  const gradeFilter = searchParams.get("grade")?.trim().toLowerCase() ?? "";

  if (gradeFilter && !grades.includes(gradeFilter as ProduceGrade)) {
    const fieldErrors: FieldErrors = {
      grade: [`Grade must be one of: ${grades.join(", ")}.`],
    };
    return errorResponse({
      status: 400,
      code: "INVALID_QUERY",
      message: "One or more listing filters are invalid.",
      fieldErrors,
      requestId,
    });
  }

  try {
    const state = await loadDomainState();
    const products = new Map(state.products.map((product) => [product.id, product]));
    const organisations = new Map(
      state.organisations.map((organisation) => [organisation.id, organisation]),
    );

    const items = state.listings
      .filter((listing) => listing.status === "active")
      .filter((listing) => {
        const product = products.get(listing.productId);
        if (!productFilter) return true;
        return [product?.id, product?.slug, product?.name.en, product?.name.fr]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(productFilter));
      })
      .filter((listing) => {
        if (!locationFilter) return true;
        return [
          listing.location.addressLine,
          listing.location.locality,
          listing.location.city,
          listing.location.region,
        ].some((value) => value.toLowerCase().includes(locationFilter));
      })
      .filter((listing) => !gradeFilter || listing.grade === gradeFilter)
      .sort((a, b) => a.availableUntil.localeCompare(b.availableUntil))
      .map((listing) => {
        const product = products.get(listing.productId);
        const farmer = organisations.get(listing.farmerOrganisationId);
        return {
          ...listing,
          availableToAllocate: Math.max(
            0,
            listing.availableQuantity - listing.reservedQuantity,
          ),
          product: product
            ? {
                id: product.id,
                slug: product.slug,
                name: product.name,
                category: product.category,
              }
            : null,
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
        items,
        count: items.length,
        filters: {
          product: productFilter || null,
          location: locationFilter || null,
          grade: gradeFilter || null,
        },
        persisted: true,
      },
      { requestId },
    );
  } catch (error) {
    return stateRouteError(error, requestId);
  }
}
