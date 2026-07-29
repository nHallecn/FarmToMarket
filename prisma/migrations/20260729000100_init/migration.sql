-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('farmer', 'buyer', 'operations', 'support', 'admin', 'transporter');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'fr');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('pending', 'active', 'suspended', 'rejected');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "OrganisationType" AS ENUM ('farmer', 'cooperative', 'buyer', 'platform', 'logistics');

-- CreateEnum
CREATE TYPE "BuyerType" AS ENUM ('restaurant', 'hotel', 'retailer', 'caterer', 'wholesaler', 'mini_market', 'processor');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('fruit', 'vegetable', 'tuber', 'cereal', 'legume', 'spice');

-- CreateEnum
CREATE TYPE "CommercialUnit" AS ENUM ('kg', 'tonne', 'bag_50kg', 'crate', 'basket', 'bunch', 'tray');

-- CreateEnum
CREATE TYPE "ProduceGrade" AS ENUM ('premium', 'grade_a', 'grade_b', 'standard');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('draft', 'active', 'paused', 'sold', 'unavailable', 'closed');

-- CreateEnum
CREATE TYPE "DemandStatus" AS ENUM ('draft', 'open', 'matching', 'allocating', 'offered', 'fulfilled', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('submitted', 'shortlisted', 'accepted', 'declined', 'withdrawn');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('draft', 'requested', 'quoted', 'confirmed', 'ready_for_pickup', 'in_transit', 'delivered', 'accepted', 'completed', 'disputed', 'cancelled', 'refunded');

-- CreateEnum
CREATE TYPE "AllocationStatus" AS ENUM ('proposed', 'confirmed', 'ready_for_pickup', 'picked_up', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('mtn_momo', 'orange_money', 'bank_transfer');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'partially_refunded', 'refunded');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('XAF');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('planned', 'pickup_scheduled', 'picked_up', 'in_transit', 'delivered', 'exception', 'failed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('in_app', 'sms', 'whatsapp', 'email');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('verification', 'demand_match', 'quote', 'offer', 'order', 'payment', 'pickup', 'delivery', 'dispute', 'cancellation', 'system');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('queued', 'sent', 'delivered', 'failed', 'read');

-- CreateEnum
CREATE TYPE "NotificationEntityType" AS ENUM ('organisation', 'listing', 'demand', 'quote', 'order', 'payment', 'shipment', 'dispute');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('quality', 'quantity_shortage', 'late_delivery', 'damaged_goods', 'wrong_product', 'payment', 'other');

-- CreateEnum
CREATE TYPE "RequestedResolution" AS ENUM ('replacement', 'partial_refund', 'full_refund', 'credit', 'other');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'under_review', 'resolved', 'partially_resolved', 'rejected');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('session.role_switched', 'session.locale_changed', 'demo.reset', 'listing.created', 'demand.created', 'quote.submitted', 'allocation.created', 'offer.created', 'order.confirmed', 'payment.confirmed', 'shipment.advanced', 'delivery.accepted', 'dispute.opened', 'dispute.resolved', 'organisation.verification_changed', 'notification.read');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('session', 'demo', 'organisation', 'listing', 'demand', 'quote', 'allocation', 'order', 'payment', 'shipment', 'notification', 'dispute');

-- CreateTable
CREATE TABLE "app_state_meta" (
    "id" VARCHAR(32) NOT NULL DEFAULT 'primary',
    "schema_version" INTEGER NOT NULL DEFAULT 1,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_state_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "avatar_url" TEXT,
    "primary_role" "UserRole" NOT NULL,
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "status" "AccountStatus" NOT NULL DEFAULT 'pending',
    "last_active_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "organisations" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "type" "OrganisationType" NOT NULL,
    "buyer_type" "BuyerType",
    "description" JSONB NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "registration_number" TEXT,
    "addresses" JSONB NOT NULL,
    "preferred_payment_provider" "PaymentProvider",
    "masked_payment_account" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(3),
    "verified_by_id" UUID,
    "verification_notes" TEXT,
    "completed_orders" INTEGER NOT NULL DEFAULT 0,
    "cancellation_rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "average_rating" DOUBLE PRECISION,
    "on_time_delivery_rate" DOUBLE PRECISION,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_members" (
    "organisation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisation_members_pkey" PRIMARY KEY ("organisation_id","user_id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "description" JSONB NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "default_unit" "CommercialUnit" NOT NULL,
    "allowed_units" "CommercialUnit"[] DEFAULT ARRAY[]::"CommercialUnit"[],
    "grades" "ProduceGrade"[] DEFAULT ARRAY[]::"ProduceGrade"[],
    "image_url" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "season_months" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organisation_products" (
    "organisation_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "organisation_products_pkey" PRIMARY KEY ("organisation_id","product_id")
);

-- CreateTable
CREATE TABLE "supply_listings" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "farmer_organisation_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "available_quantity" DOUBLE PRECISION NOT NULL,
    "reserved_quantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" "CommercialUnit" NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "min_order_quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "grade" "ProduceGrade" NOT NULL,
    "location" JSONB NOT NULL,
    "available_from" DATE NOT NULL,
    "available_until" DATE NOT NULL,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "status" "ListingStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "supply_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_requests" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "buyer_organisation_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "delivery_address" JSONB NOT NULL,
    "required_delivery_date" DATE NOT NULL,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_note" TEXT,
    "status" "DemandStatus" NOT NULL DEFAULT 'draft',
    "notes" TEXT,
    "submitted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "demand_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demand_items" (
    "id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "CommercialUnit" NOT NULL,
    "grade" "ProduceGrade" NOT NULL,
    "target_unit_price" INTEGER,
    "notes" TEXT,

    CONSTRAINT "demand_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "demand_item_id" UUID NOT NULL,
    "farmer_organisation_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "source_listing_id" UUID,
    "available_quantity" DOUBLE PRECISION NOT NULL,
    "unit" "CommercialUnit" NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "available_date" DATE NOT NULL,
    "notes" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'submitted',
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "demand_id" UUID,
    "buyer_organisation_id" UUID NOT NULL,
    "created_by_id" UUID NOT NULL,
    "delivery_address" JSONB NOT NULL,
    "delivery_date" DATE NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'draft',
    "subtotal" INTEGER NOT NULL,
    "service_fee" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'XAF',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "shipment_status" "ShipmentStatus",
    "buyer_note" TEXT,
    "operations_note" TEXT,
    "quoted_at" TIMESTAMPTZ(3),
    "confirmed_at" TIMESTAMPTZ(3),
    "delivered_at" TIMESTAMPTZ(3),
    "accepted_at" TIMESTAMPTZ(3),
    "completed_at" TIMESTAMPTZ(3),
    "cancelled_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "demand_item_id" UUID,
    "product_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "allocated_quantity" DOUBLE PRECISION NOT NULL,
    "unit" "CommercialUnit" NOT NULL,
    "grade" "ProduceGrade" NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "line_total" INTEGER NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfilment_allocations" (
    "id" UUID NOT NULL,
    "demand_id" UUID NOT NULL,
    "demand_item_id" UUID NOT NULL,
    "order_id" UUID,
    "order_item_id" UUID,
    "quote_id" UUID,
    "source_listing_id" UUID,
    "farmer_organisation_id" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" "CommercialUnit" NOT NULL,
    "farmer_unit_price" INTEGER NOT NULL,
    "farmer_total" INTEGER NOT NULL,
    "status" "AllocationStatus" NOT NULL DEFAULT 'proposed',
    "pickup_address" JSONB NOT NULL,
    "pickup_window" TEXT,
    "farmer_note" TEXT,
    "operations_note" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "fulfilment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "transaction_reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'XAF',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "payer_masked_account" TEXT,
    "provider_event_id" TEXT,
    "failure_reason" TEXT,
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(3),
    "initiated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "provider_organisation_id" UUID,
    "transporter_name" TEXT NOT NULL,
    "transporter_phone" TEXT NOT NULL,
    "vehicle_details" TEXT,
    "driver_name" TEXT,
    "pickup_stops" JSONB NOT NULL,
    "delivery_address" JSONB NOT NULL,
    "planned_pickup_at" TIMESTAMPTZ(3),
    "expected_delivery_at" TIMESTAMPTZ(3),
    "status" "ShipmentStatus" NOT NULL DEFAULT 'planned',
    "exception_note" TEXT,
    "delivered_at" TIMESTAMPTZ(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipient_user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" JSONB NOT NULL,
    "message" JSONB NOT NULL,
    "channels" "NotificationChannel"[] DEFAULT ARRAY[]::"NotificationChannel"[],
    "status" "NotificationStatus" NOT NULL DEFAULT 'queued',
    "entity_type" "NotificationEntityType",
    "entity_id" UUID,
    "deduplication_key" TEXT NOT NULL,
    "read_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "reference" TEXT NOT NULL,
    "order_id" UUID NOT NULL,
    "opened_by_id" UUID NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "affected_quantity" DOUBLE PRECISION,
    "requested_resolution" "RequestedResolution" NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "evidence" JSONB NOT NULL,
    "assigned_to_id" UUID,
    "investigation_note" TEXT,
    "resolution" TEXT,
    "financial_adjustment" INTEGER NOT NULL DEFAULT 0,
    "resolved_by_id" UUID,
    "resolved_at" TIMESTAMPTZ(3),
    "opened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispute_affected_items" (
    "dispute_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,

    CONSTRAINT "dispute_affected_items_pkey" PRIMARY KEY ("dispute_id","order_item_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID NOT NULL,
    "actor_role" "UserRole" NOT NULL,
    "action" "AuditAction" NOT NULL,
    "target_type" "AuditTargetType" NOT NULL,
    "target_id" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Required PostgreSQL list columns are represented as non-null arrays in the
-- application domain. Prisma scalar lists do not emit NOT NULL themselves.
ALTER TABLE "products"
    ALTER COLUMN "allowed_units" SET NOT NULL,
    ALTER COLUMN "grades" SET NOT NULL,
    ALTER COLUMN "season_months" SET NOT NULL;

ALTER TABLE "supply_listings"
    ALTER COLUMN "image_urls" SET NOT NULL;

ALTER TABLE "notifications"
    ALTER COLUMN "channels" SET NOT NULL;

-- Domain invariants that Prisma cannot currently express in schema.prisma.
ALTER TABLE "app_state_meta"
    ADD CONSTRAINT "app_state_meta_singleton_ck" CHECK ("id" = 'primary'),
    ADD CONSTRAINT "app_state_meta_schema_version_ck" CHECK ("schema_version" > 0),
    ADD CONSTRAINT "app_state_meta_revision_ck" CHECK ("revision" >= 0);

ALTER TABLE "organisations"
    ADD CONSTRAINT "organisations_buyer_type_ck"
        CHECK ("buyer_type" IS NULL OR "type" = 'buyer'),
    ADD CONSTRAINT "organisations_description_ck"
        CHECK (
            jsonb_typeof("description") = 'object'
            AND jsonb_typeof("description" -> 'en') = 'string'
            AND jsonb_typeof("description" -> 'fr') = 'string'
        ),
    ADD CONSTRAINT "organisations_addresses_ck"
        CHECK (jsonb_typeof("addresses") = 'array'),
    ADD CONSTRAINT "organisations_completed_orders_ck"
        CHECK ("completed_orders" >= 0),
    ADD CONSTRAINT "organisations_cancellation_rate_ck"
        CHECK ("cancellation_rate" BETWEEN 0 AND 100),
    ADD CONSTRAINT "organisations_average_rating_ck"
        CHECK ("average_rating" IS NULL OR "average_rating" BETWEEN 0 AND 5),
    ADD CONSTRAINT "organisations_on_time_delivery_rate_ck"
        CHECK ("on_time_delivery_rate" IS NULL OR "on_time_delivery_rate" BETWEEN 0 AND 100);

ALTER TABLE "products"
    ADD CONSTRAINT "products_name_ck"
        CHECK (
            jsonb_typeof("name") = 'object'
            AND jsonb_typeof("name" -> 'en') = 'string'
            AND jsonb_typeof("name" -> 'fr') = 'string'
        ),
    ADD CONSTRAINT "products_description_ck"
        CHECK (
            jsonb_typeof("description") = 'object'
            AND jsonb_typeof("description" -> 'en') = 'string'
            AND jsonb_typeof("description" -> 'fr') = 'string'
        ),
    ADD CONSTRAINT "products_allowed_units_ck"
        CHECK (
            cardinality("allowed_units") > 0
            AND array_position("allowed_units", "default_unit") IS NOT NULL
        ),
    ADD CONSTRAINT "products_grades_ck"
        CHECK (cardinality("grades") > 0),
    ADD CONSTRAINT "products_season_months_ck"
        CHECK (
            "season_months" <@ ARRAY[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]::INTEGER[]
        );

ALTER TABLE "supply_listings"
    ADD CONSTRAINT "supply_listings_quantities_ck"
        CHECK (
            "available_quantity" > 0
            AND "reserved_quantity" >= 0
            AND "reserved_quantity" <= "available_quantity"
            AND "min_order_quantity" > 0
            AND "min_order_quantity" <= "available_quantity"
        ),
    ADD CONSTRAINT "supply_listings_unit_price_ck"
        CHECK ("unit_price" > 0),
    ADD CONSTRAINT "supply_listings_availability_ck"
        CHECK ("available_until" >= "available_from"),
    ADD CONSTRAINT "supply_listings_location_ck"
        CHECK (
            jsonb_typeof("location") = 'object'
            AND "location" ->> 'countryCode' = 'CM'
        );

ALTER TABLE "demand_requests"
    ADD CONSTRAINT "demand_requests_delivery_address_ck"
        CHECK (
            jsonb_typeof("delivery_address") = 'object'
            AND "delivery_address" ->> 'countryCode' = 'CM'
        );

ALTER TABLE "demand_items"
    ADD CONSTRAINT "demand_items_quantity_ck"
        CHECK ("quantity" > 0),
    ADD CONSTRAINT "demand_items_target_unit_price_ck"
        CHECK ("target_unit_price" IS NULL OR "target_unit_price" > 0);

ALTER TABLE "quotes"
    ADD CONSTRAINT "quotes_available_quantity_ck"
        CHECK ("available_quantity" > 0),
    ADD CONSTRAINT "quotes_unit_price_ck"
        CHECK ("unit_price" > 0);

ALTER TABLE "orders"
    ADD CONSTRAINT "orders_money_ck"
        CHECK (
            "subtotal" >= 0
            AND "service_fee" >= 0
            AND "delivery_fee" >= 0
            AND "total" >= 0
            AND "total" = "subtotal" + "service_fee" + "delivery_fee"
        ),
    ADD CONSTRAINT "orders_delivery_address_ck"
        CHECK (
            jsonb_typeof("delivery_address") = 'object'
            AND "delivery_address" ->> 'countryCode' = 'CM'
        );

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_quantities_ck"
        CHECK (
            "quantity" > 0
            AND "allocated_quantity" >= 0
            AND "allocated_quantity" <= "quantity"
        ),
    ADD CONSTRAINT "order_items_money_ck"
        CHECK ("unit_price" > 0 AND "line_total" >= 0);

ALTER TABLE "fulfilment_allocations"
    ADD CONSTRAINT "fulfilment_allocations_quantity_ck"
        CHECK ("quantity" > 0),
    ADD CONSTRAINT "fulfilment_allocations_money_ck"
        CHECK ("farmer_unit_price" > 0 AND "farmer_total" >= 0),
    ADD CONSTRAINT "fulfilment_allocations_order_link_ck"
        CHECK ("order_item_id" IS NULL OR "order_id" IS NOT NULL),
    ADD CONSTRAINT "fulfilment_allocations_pickup_address_ck"
        CHECK (
            jsonb_typeof("pickup_address") = 'object'
            AND "pickup_address" ->> 'countryCode' = 'CM'
        );

ALTER TABLE "payment_transactions"
    ADD CONSTRAINT "payment_transactions_amount_ck"
        CHECK ("amount" > 0);

ALTER TABLE "shipments"
    ADD CONSTRAINT "shipments_pickup_stops_ck"
        CHECK (jsonb_typeof("pickup_stops") = 'array'),
    ADD CONSTRAINT "shipments_delivery_address_ck"
        CHECK (
            jsonb_typeof("delivery_address") = 'object'
            AND "delivery_address" ->> 'countryCode' = 'CM'
        ),
    ADD CONSTRAINT "shipments_schedule_ck"
        CHECK (
            "planned_pickup_at" IS NULL
            OR "expected_delivery_at" IS NULL
            OR "expected_delivery_at" >= "planned_pickup_at"
        );

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_title_ck"
        CHECK (
            jsonb_typeof("title") = 'object'
            AND jsonb_typeof("title" -> 'en') = 'string'
            AND jsonb_typeof("title" -> 'fr') = 'string'
        ),
    ADD CONSTRAINT "notifications_message_ck"
        CHECK (
            jsonb_typeof("message") = 'object'
            AND jsonb_typeof("message" -> 'en') = 'string'
            AND jsonb_typeof("message" -> 'fr') = 'string'
        ),
    ADD CONSTRAINT "notifications_channels_ck"
        CHECK (cardinality("channels") > 0),
    ADD CONSTRAINT "notifications_entity_pair_ck"
        CHECK (
            ("entity_type" IS NULL AND "entity_id" IS NULL)
            OR ("entity_type" IS NOT NULL AND "entity_id" IS NOT NULL)
        ),
    ADD CONSTRAINT "notifications_read_status_ck"
        CHECK ("read_at" IS NULL OR "status" = 'read');

ALTER TABLE "disputes"
    ADD CONSTRAINT "disputes_affected_quantity_ck"
        CHECK ("affected_quantity" IS NULL OR "affected_quantity" > 0),
    ADD CONSTRAINT "disputes_financial_adjustment_ck"
        CHECK ("financial_adjustment" >= 0),
    ADD CONSTRAINT "disputes_evidence_ck"
        CHECK (jsonb_typeof("evidence") = 'array'),
    ADD CONSTRAINT "disputes_resolution_ck"
        CHECK (
            "status" NOT IN ('resolved', 'partially_resolved', 'rejected')
            OR (
                "resolution" IS NOT NULL
                AND "resolved_by_id" IS NOT NULL
                AND "resolved_at" IS NOT NULL
            )
        );

ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_before_ck"
        CHECK ("before" IS NULL OR jsonb_typeof("before") = 'object'),
    ADD CONSTRAINT "audit_logs_after_ck"
        CHECK ("after" IS NULL OR jsonb_typeof("after") = 'object');

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at");

-- CreateIndex
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments"("role");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_registration_number_key" ON "organisations"("registration_number");

-- CreateIndex
CREATE INDEX "organisations_type_verification_status_idx" ON "organisations"("type", "verification_status");

-- CreateIndex
CREATE INDEX "organisations_verified_by_id_idx" ON "organisations"("verified_by_id");

-- CreateIndex
CREATE INDEX "organisation_members_user_id_idx" ON "organisation_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_category_active_idx" ON "products"("category", "active");

-- CreateIndex
CREATE INDEX "organisation_products_product_id_idx" ON "organisation_products"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "supply_listings_reference_key" ON "supply_listings"("reference");

-- CreateIndex
CREATE INDEX "supply_listings_farmer_organisation_id_status_idx" ON "supply_listings"("farmer_organisation_id", "status");

-- CreateIndex
CREATE INDEX "supply_listings_product_id_status_available_from_idx" ON "supply_listings"("product_id", "status", "available_from");

-- CreateIndex
CREATE INDEX "supply_listings_created_by_id_idx" ON "supply_listings"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "demand_requests_reference_key" ON "demand_requests"("reference");

-- CreateIndex
CREATE INDEX "demand_requests_buyer_organisation_id_status_idx" ON "demand_requests"("buyer_organisation_id", "status");

-- CreateIndex
CREATE INDEX "demand_requests_status_required_delivery_date_idx" ON "demand_requests"("status", "required_delivery_date");

-- CreateIndex
CREATE INDEX "demand_requests_created_by_id_idx" ON "demand_requests"("created_by_id");

-- CreateIndex
CREATE INDEX "demand_items_demand_id_idx" ON "demand_items"("demand_id");

-- CreateIndex
CREATE INDEX "demand_items_product_id_grade_idx" ON "demand_items"("product_id", "grade");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_reference_key" ON "quotes"("reference");

-- CreateIndex
CREATE INDEX "quotes_demand_item_id_status_idx" ON "quotes"("demand_item_id", "status");

-- CreateIndex
CREATE INDEX "quotes_farmer_organisation_id_status_idx" ON "quotes"("farmer_organisation_id", "status");

-- CreateIndex
CREATE INDEX "quotes_source_listing_id_idx" ON "quotes"("source_listing_id");

-- CreateIndex
CREATE INDEX "quotes_submitted_by_id_idx" ON "quotes"("submitted_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_reference_key" ON "orders"("reference");

-- CreateIndex
CREATE INDEX "orders_buyer_organisation_id_status_idx" ON "orders"("buyer_organisation_id", "status");

-- CreateIndex
CREATE INDEX "orders_demand_id_idx" ON "orders"("demand_id");

-- CreateIndex
CREATE INDEX "orders_status_delivery_date_idx" ON "orders"("status", "delivery_date");

-- CreateIndex
CREATE INDEX "orders_payment_status_idx" ON "orders"("payment_status");

-- CreateIndex
CREATE INDEX "orders_created_by_id_idx" ON "orders"("created_by_id");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_demand_item_id_idx" ON "order_items"("demand_item_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_demand_id_status_idx" ON "fulfilment_allocations"("demand_id", "status");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_demand_item_id_status_idx" ON "fulfilment_allocations"("demand_item_id", "status");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_order_id_idx" ON "fulfilment_allocations"("order_id");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_order_item_id_idx" ON "fulfilment_allocations"("order_item_id");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_quote_id_idx" ON "fulfilment_allocations"("quote_id");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_source_listing_id_idx" ON "fulfilment_allocations"("source_listing_id");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_farmer_organisation_id_status_idx" ON "fulfilment_allocations"("farmer_organisation_id", "status");

-- CreateIndex
CREATE INDEX "fulfilment_allocations_created_by_id_idx" ON "fulfilment_allocations"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transaction_reference_key" ON "payment_transactions"("transaction_reference");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_provider_event_id_key" ON "payment_transactions"("provider_event_id");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_status_idx" ON "payment_transactions"("order_id", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_provider_status_idx" ON "payment_transactions"("provider", "status");

-- CreateIndex
CREATE INDEX "payment_transactions_verified_by_id_idx" ON "payment_transactions"("verified_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_reference_key" ON "shipments"("reference");

-- CreateIndex
CREATE INDEX "shipments_order_id_status_idx" ON "shipments"("order_id", "status");

-- CreateIndex
CREATE INDEX "shipments_provider_organisation_id_idx" ON "shipments"("provider_organisation_id");

-- CreateIndex
CREATE INDEX "shipments_status_expected_delivery_at_idx" ON "shipments"("status", "expected_delivery_at");

-- CreateIndex
CREATE INDEX "shipments_created_by_id_idx" ON "shipments"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_deduplication_key_key" ON "notifications"("deduplication_key");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_read_at_idx" ON "notifications"("recipient_user_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_user_id_status_created_at_idx" ON "notifications"("recipient_user_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_entity_type_entity_id_idx" ON "notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_reference_key" ON "disputes"("reference");

-- A buyer can have only one unresolved dispute workflow for an order.
CREATE UNIQUE INDEX "disputes_one_open_per_order_idx"
ON "disputes"("order_id")
WHERE "status" IN ('open', 'under_review');

-- CreateIndex
CREATE INDEX "disputes_order_id_status_idx" ON "disputes"("order_id", "status");

-- CreateIndex
CREATE INDEX "disputes_opened_by_id_idx" ON "disputes"("opened_by_id");

-- CreateIndex
CREATE INDEX "disputes_assigned_to_id_status_idx" ON "disputes"("assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "disputes_resolved_by_id_idx" ON "disputes"("resolved_by_id");

-- CreateIndex
CREATE INDEX "dispute_affected_items_order_item_id_idx" ON "dispute_affected_items"("order_item_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_target_type_target_id_created_at_idx" ON "audit_logs"("target_type", "target_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_products" ADD CONSTRAINT "organisation_products_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organisation_products" ADD CONSTRAINT "organisation_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_listings" ADD CONSTRAINT "supply_listings_farmer_organisation_id_fkey" FOREIGN KEY ("farmer_organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_listings" ADD CONSTRAINT "supply_listings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supply_listings" ADD CONSTRAINT "supply_listings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_buyer_organisation_id_fkey" FOREIGN KEY ("buyer_organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_requests" ADD CONSTRAINT "demand_requests_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_items" ADD CONSTRAINT "demand_items_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "demand_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demand_items" ADD CONSTRAINT "demand_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_demand_item_id_fkey" FOREIGN KEY ("demand_item_id") REFERENCES "demand_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_farmer_organisation_id_fkey" FOREIGN KEY ("farmer_organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_source_listing_id_fkey" FOREIGN KEY ("source_listing_id") REFERENCES "supply_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "demand_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_organisation_id_fkey" FOREIGN KEY ("buyer_organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_demand_item_id_fkey" FOREIGN KEY ("demand_item_id") REFERENCES "demand_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_demand_id_fkey" FOREIGN KEY ("demand_id") REFERENCES "demand_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_demand_item_id_fkey" FOREIGN KEY ("demand_item_id") REFERENCES "demand_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_source_listing_id_fkey" FOREIGN KEY ("source_listing_id") REFERENCES "supply_listings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_farmer_organisation_id_fkey" FOREIGN KEY ("farmer_organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfilment_allocations" ADD CONSTRAINT "fulfilment_allocations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_provider_organisation_id_fkey" FOREIGN KEY ("provider_organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_fkey" FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_id_fkey" FOREIGN KEY ("opened_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_affected_items" ADD CONSTRAINT "dispute_affected_items_dispute_id_fkey" FOREIGN KEY ("dispute_id") REFERENCES "disputes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispute_affected_items" ADD CONSTRAINT "dispute_affected_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
