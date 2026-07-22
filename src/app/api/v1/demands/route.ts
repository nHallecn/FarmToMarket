import {
  addFieldError,
  dataResponse,
  errorResponse,
  getRequestId,
  isRecord,
  type FieldErrors,
} from "@/lib/api-helpers";
import type {
  Address,
  CommercialUnit,
  DemandItem,
  DemandRequest,
  ProduceGrade,
} from "@/lib/domain";
import { createSeedState } from "@/lib/seed-data";

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateOptionalString(
  value: unknown,
  field: string,
  errors: FieldErrors,
  maximumLength: number,
) {
  if (value === undefined) return;
  if (typeof value !== "string") {
    addFieldError(errors, field, "Must be a string.");
  } else if (value.trim().length > maximumLength) {
    addFieldError(
      errors,
      field,
      `Must contain at most ${maximumLength} characters.`,
    );
  }
}

function validateAddress(value: unknown, errors: FieldErrors) {
  if (value === undefined) return;
  if (!isRecord(value)) {
    addFieldError(errors, "deliveryAddress", "Must be an address object.");
    return;
  }

  const requiredFields = ["addressLine", "locality", "city", "region"] as const;
  for (const field of requiredFields) {
    const fieldValue = trimmedString(value[field]);
    if (!fieldValue) {
      addFieldError(
        errors,
        `deliveryAddress.${field}`,
        "This field is required.",
      );
    } else if (fieldValue.length > 160) {
      addFieldError(
        errors,
        `deliveryAddress.${field}`,
        "Must contain at most 160 characters.",
      );
    }
  }
  validateOptionalString(value.label, "deliveryAddress.label", errors, 80);
  validateOptionalString(
    value.instructions,
    "deliveryAddress.instructions",
    errors,
    500,
  );
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse({
      status: 400,
      code: "INVALID_JSON",
      message: "The request body must contain valid JSON.",
      requestId,
    });
  }

  if (!isRecord(body)) {
    return errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "The demand payload is invalid.",
      fieldErrors: { body: ["Must be a JSON object."] },
      requestId,
    });
  }

  const state = createSeedState();
  const errors: FieldErrors = {};
  const title = trimmedString(body.title);
  const buyerOrganisationId = trimmedString(body.buyerOrganisationId);
  const requiredDeliveryDate = trimmedString(body.requiredDeliveryDate);
  const buyer = state.organisations.find(
    (organisation) => organisation.id === buyerOrganisationId,
  );

  if (!title) {
    addFieldError(errors, "title", "Title is required.");
  } else if (title.length < 3 || title.length > 160) {
    addFieldError(errors, "title", "Title must contain 3 to 160 characters.");
  }

  if (!buyerOrganisationId) {
    addFieldError(errors, "buyerOrganisationId", "Buyer organisation is required.");
  } else if (!buyer || buyer.type !== "buyer") {
    addFieldError(
      errors,
      "buyerOrganisationId",
      "Must identify a buyer organisation in the demo dataset.",
    );
  } else if (!buyer.memberUserIds[0]) {
    addFieldError(
      errors,
      "buyerOrganisationId",
      "The buyer organisation has no member who can create demand.",
    );
  }

  if (!requiredDeliveryDate) {
    addFieldError(errors, "requiredDeliveryDate", "Delivery date is required.");
  } else if (!isIsoDate(requiredDeliveryDate)) {
    addFieldError(
      errors,
      "requiredDeliveryDate",
      "Use a real calendar date in YYYY-MM-DD format.",
    );
  } else if (requiredDeliveryDate < new Date().toISOString().slice(0, 10)) {
    addFieldError(
      errors,
      "requiredDeliveryDate",
      "Delivery date cannot be in the past.",
    );
  }

  if (!Array.isArray(body.items)) {
    addFieldError(errors, "items", "Items must be an array.");
  } else if (body.items.length === 0) {
    addFieldError(errors, "items", "Add at least one demand item.");
  } else if (body.items.length > 20) {
    addFieldError(errors, "items", "A demand can contain at most 20 items.");
  } else {
    body.items.forEach((item, index) => {
      const prefix = `items.${index}`;
      if (!isRecord(item)) {
        addFieldError(errors, prefix, "Must be an item object.");
        return;
      }

      const productId = trimmedString(item.productId);
      const product = state.products.find((candidate) => candidate.id === productId);
      const unit = trimmedString(item.unit);
      const grade = trimmedString(item.grade);

      if (!productId) {
        addFieldError(errors, `${prefix}.productId`, "Product is required.");
      } else if (!product?.active) {
        addFieldError(
          errors,
          `${prefix}.productId`,
          "Must identify an active catalogue product.",
        );
      }

      if (
        typeof item.quantity !== "number" ||
        !Number.isFinite(item.quantity) ||
        item.quantity <= 0
      ) {
        addFieldError(
          errors,
          `${prefix}.quantity`,
          "Quantity must be a positive number.",
        );
      } else if (item.quantity > 1_000_000) {
        addFieldError(
          errors,
          `${prefix}.quantity`,
          "Quantity must not exceed 1,000,000 units.",
        );
      }

      if (!unit) {
        addFieldError(errors, `${prefix}.unit`, "Unit is required.");
      } else if (product && !product.allowedUnits.includes(unit as CommercialUnit)) {
        addFieldError(
          errors,
          `${prefix}.unit`,
          `Allowed units for this product: ${product.allowedUnits.join(", ")}.`,
        );
      }

      if (!grade) {
        addFieldError(errors, `${prefix}.grade`, "Grade is required.");
      } else if (product && !product.grades.includes(grade as ProduceGrade)) {
        addFieldError(
          errors,
          `${prefix}.grade`,
          `Allowed grades for this product: ${product.grades.join(", ")}.`,
        );
      }

      if (
        item.targetUnitPrice !== undefined &&
        (typeof item.targetUnitPrice !== "number" ||
          !Number.isInteger(item.targetUnitPrice) ||
          item.targetUnitPrice <= 0)
      ) {
        addFieldError(
          errors,
          `${prefix}.targetUnitPrice`,
          "Target unit price must be a positive whole FCFA amount.",
        );
      }
      validateOptionalString(item.notes, `${prefix}.notes`, errors, 500);
    });
  }

  if (body.recurring !== undefined && typeof body.recurring !== "boolean") {
    addFieldError(errors, "recurring", "Must be true or false.");
  }
  if (body.submit !== undefined && typeof body.submit !== "boolean") {
    addFieldError(errors, "submit", "Must be true or false.");
  }
  validateOptionalString(body.recurrenceNote, "recurrenceNote", errors, 500);
  validateOptionalString(body.notes, "notes", errors, 1_000);
  validateAddress(body.deliveryAddress, errors);

  if (buyer && body.deliveryAddress === undefined && buyer.addresses.length === 0) {
    addFieldError(
      errors,
      "deliveryAddress",
      "Provide a delivery address because this buyer has no saved address.",
    );
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "The demand payload contains invalid fields.",
      fieldErrors: errors,
      requestId,
    });
  }

  if (!buyer || !Array.isArray(body.items)) {
    return errorResponse({
      status: 500,
      code: "DEMO_STATE_ERROR",
      message: "The demo demand could not be assembled.",
      requestId,
    });
  }

  const demandId = crypto.randomUUID();
  const now = new Date().toISOString();
  const submit = body.submit !== false;
  const suppliedAddress = isRecord(body.deliveryAddress)
    ? body.deliveryAddress
    : undefined;
  const savedAddress =
    buyer.addresses.find((address) => address.kind === "delivery" && address.isDefault) ??
    buyer.addresses.find((address) => address.kind === "delivery") ??
    buyer.addresses[0];
  const deliveryAddress: Address = suppliedAddress
    ? {
        id: crypto.randomUUID(),
        label: trimmedString(suppliedAddress.label) || "Delivery address",
        kind: "delivery",
        addressLine: trimmedString(suppliedAddress.addressLine),
        locality: trimmedString(suppliedAddress.locality),
        city: trimmedString(suppliedAddress.city),
        region: trimmedString(suppliedAddress.region),
        countryCode: "CM",
        instructions:
          trimmedString(suppliedAddress.instructions) || undefined,
        isDefault: false,
      }
    : { ...savedAddress };

  const items: DemandItem[] = body.items.map((item) => {
    const input = item as Record<string, unknown>;
    return {
      id: crypto.randomUUID(),
      demandId,
      productId: trimmedString(input.productId),
      quantity: input.quantity as number,
      unit: trimmedString(input.unit) as CommercialUnit,
      grade: trimmedString(input.grade) as ProduceGrade,
      targetUnitPrice:
        typeof input.targetUnitPrice === "number"
          ? input.targetUnitPrice
          : undefined,
      notes: trimmedString(input.notes) || undefined,
    };
  });

  const demand: DemandRequest = {
    id: demandId,
    reference: `DM-DEMO-${demandId.slice(0, 8).toUpperCase()}`,
    buyerOrganisationId: buyer.id,
    createdBy: buyer.memberUserIds[0],
    title,
    deliveryAddress,
    requiredDeliveryDate,
    itemIds: items.map((item) => item.id),
    recurring: body.recurring === true,
    recurrenceNote: trimmedString(body.recurrenceNote) || undefined,
    status: submit ? "open" : "draft",
    notes: trimmedString(body.notes) || undefined,
    submittedAt: submit ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  return dataResponse(
    {
      demand,
      items,
      demo: true,
      persisted: false,
      notice:
        "This response demonstrates the V1 contract. It was validated but not persisted.",
    },
    { status: 201, requestId },
  );
}
