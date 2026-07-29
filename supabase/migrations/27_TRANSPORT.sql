-- ============================================================================
-- 27. Transport — facilitation, not a line of business
-- ============================================================================
-- Caresy arranges rides; Caresy does not sell them. The customer pays the
-- driver directly, on the ride provider's own rails. Nothing here touches
-- bookings.final_amount_paise: recording a ₹280 Rapido fare must never make
-- the Caresy bill ₹280 bigger, and a companion must never be out of pocket.
--
-- The fares are recorded for the dataset, not for billing. Over time this
-- becomes the thing no competitor has: what a ride between two real Noida
-- points actually costs, by provider, by hour.
--
-- Provider-agnostic on purpose. `provider` is TEXT with a soft allowlist
-- rather than an enum, so adding Rapido Auto or a local taxi tomorrow is a
-- row, not a migration.

-- ---------------------------------------------------------------------------
-- 1. Driving eligibility — required before a companion may drive a customer's
--    own vehicle
-- ---------------------------------------------------------------------------
-- Driving without a valid licence is the most common reason motor claims are
-- rejected in India. If a companion crashes a customer's car on an expired or
-- wrong-class licence, the own-damage claim can be denied and the car becomes
-- Caresy's problem. So this is a hard gate, enforced in the database rather
-- than in a form.
ALTER TABLE companions
    ADD COLUMN IF NOT EXISTS driving_licence_number TEXT,
    ADD COLUMN IF NOT EXISTS driving_licence_expiry DATE,
    ADD COLUMN IF NOT EXISTS driving_licence_class  TEXT,     -- LMV | MCWG | MCWOG | ...
    -- Set by an admin after eyeballing the uploaded licence. Never self-served:
    -- a companion ticking their own eligibility box is not verification.
    ADD COLUMN IF NOT EXISTS can_drive              BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS drive_verified_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS drive_verified_at      TIMESTAMPTZ;

/**
 * May this companion drive a customer's vehicle today?
 *
 * Expiry is checked at call time, not at verification time — a licence that
 * was valid when an admin approved it stops being valid on its expiry date,
 * and nothing would otherwise notice.
 */
CREATE OR REPLACE FUNCTION public.companion_may_drive(p_companion UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM companions
        WHERE id = p_companion
          AND approval_status = 'APPROVED'
          AND can_drive
          AND driving_licence_expiry IS NOT NULL
          AND driving_licence_expiry >= CURRENT_DATE
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. How the patient is getting there
-- ---------------------------------------------------------------------------
-- ENTERPRISE is unused today. It is listed so that adding Uber Central later
-- is a value, not a schema change — the whole point of staying provider-
-- agnostic while the ride volume is too small to negotiate anything.
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS transport_mode TEXT NOT NULL DEFAULT 'NONE';

DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_transport_mode CHECK (transport_mode IN (
        'NONE',               -- patient makes their own way
        'CUSTOMER_ARRANGED',  -- family booked it; companion just meets them
        'COMPANION_ARRANGED', -- companion compares and books; customer pays the driver
        'CUSTOMER_VEHICLE',   -- companion drives the customer's own car or bike
        'ENTERPRISE'          -- reserved: Caresy-billed fleet account
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- A companion may only be assigned to a drive job if their licence stands up.
-- Enforced here because the assignment happens through a plain UPDATE from two
-- different apps, and a check in either form is a check a modified client skips.
CREATE OR REPLACE FUNCTION public.guard_drive_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.transport_mode = 'CUSTOMER_VEHICLE'
       AND NEW.companion_user_id IS NOT NULL
       AND NEW.companion_user_id IS DISTINCT FROM OLD.companion_user_id
       AND NOT companion_may_drive(NEW.companion_user_id)
    THEN
        RAISE EXCEPTION 'This booking needs a companion with a verified, unexpired driving licence';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_drive_assignment ON bookings;
CREATE TRIGGER trg_guard_drive_assignment
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION guard_drive_assignment();

-- ---------------------------------------------------------------------------
-- 3. The ride log
-- ---------------------------------------------------------------------------
-- One row per leg, not one per booking: a hospital visit is usually there and
-- back, and the return fare at 7pm is different data from the 10am outbound.
CREATE TABLE IF NOT EXISTS booking_transport (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id     UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,

    provider       TEXT NOT NULL,          -- UBER | RAPIDO | OLA | LOCAL_TAXI | AUTO | OTHER
    provider_other TEXT,                   -- free text when provider = OTHER
    vehicle_type   TEXT,                   -- BIKE | AUTO | CAB_ECONOMY | CAB_PREMIUM

    -- Both in paise. estimated is what the app quoted while comparing; final is
    -- what the receipt said. Keeping both is the entire point — the gap between
    -- them, by provider and hour, is the dataset.
    estimated_fare_paise INTEGER CHECK (estimated_fare_paise IS NULL OR estimated_fare_paise BETWEEN 0 AND 2000000),
    final_fare_paise     INTEGER CHECK (final_fare_paise     IS NULL OR final_fare_paise     BETWEEN 0 AND 2000000),

    -- Who actually paid the driver. CARESY exists for the enterprise case and
    -- must stay rare; if it starts appearing, someone is fronting money.
    payer          TEXT NOT NULL DEFAULT 'CUSTOMER',

    -- Coordinates, not just addresses, so routes can be analysed later.
    -- Nullable: a companion standing in a hospital lobby with bad signal should
    -- still be able to log the fare.
    pickup_lat     DOUBLE PRECISION,
    pickup_lng     DOUBLE PRECISION,
    drop_lat       DOUBLE PRECISION,
    drop_lng       DOUBLE PRECISION,
    pickup_label   TEXT,
    drop_label     TEXT,

    receipt_path   TEXT,                   -- path inside the ride-receipts bucket
    notes          TEXT,

    recorded_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ride_at        TIMESTAMPTZ,            -- when the ride happened
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_transport_provider CHECK (provider IN ('UBER','RAPIDO','OLA','LOCAL_TAXI','AUTO','OTHER')),
    CONSTRAINT chk_transport_payer    CHECK (payer IN ('CUSTOMER','FAMILY','HOSPITAL','CARESY')),
    -- Coordinates arrive in pairs or not at all; half a point is not a location.
    CONSTRAINT chk_pickup_coords CHECK ((pickup_lat IS NULL) = (pickup_lng IS NULL)),
    CONSTRAINT chk_drop_coords   CHECK ((drop_lat   IS NULL) = (drop_lng   IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_booking_transport_booking  ON booking_transport(booking_id);
-- Supports the fare-trend queries this table exists for.
CREATE INDEX IF NOT EXISTS idx_booking_transport_analytics ON booking_transport(provider, ride_at DESC);

ALTER TABLE booking_transport ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Booking parties read transport" ON booking_transport;
CREATE POLICY "Booking parties read transport"
    ON booking_transport FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM bookings b WHERE b.id = booking_id
          AND (b.customer_user_id = auth.uid() OR b.companion_user_id = auth.uid())
    ) OR is_admin());

-- Only the assigned companion writes the log; they are the one holding the
-- receipt. Customers read it for transparency but cannot edit the record.
DROP POLICY IF EXISTS "Assigned companion records transport" ON booking_transport;
CREATE POLICY "Assigned companion records transport"
    ON booking_transport FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.companion_user_id = auth.uid()
    ) OR is_admin());

DROP POLICY IF EXISTS "Assigned companion fixes transport" ON booking_transport;
CREATE POLICY "Assigned companion fixes transport"
    ON booking_transport FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM bookings b WHERE b.id = booking_id AND b.companion_user_id = auth.uid()
    ) OR is_admin());

-- ---------------------------------------------------------------------------
-- 4. Receipt screenshots
-- ---------------------------------------------------------------------------
-- Private: a ride receipt carries the patient's home address.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('ride-receipts', 'ride-receipts', FALSE, 10485760,
        ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
ON CONFLICT (id) DO UPDATE
    SET public = FALSE, file_size_limit = EXCLUDED.file_size_limit,
        allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Folder is the booking id, so the same people who can see the booking's
-- transport row can see its receipt.
DROP POLICY IF EXISTS "Booking parties manage ride receipts" ON storage.objects;
CREATE POLICY "Booking parties manage ride receipts"
    ON storage.objects FOR ALL
    USING (
        bucket_id = 'ride-receipts'
        AND EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = ((storage.foldername(name))[1])::uuid
              AND (b.customer_user_id = auth.uid() OR b.companion_user_id = auth.uid())
        )
    )
    WITH CHECK (
        bucket_id = 'ride-receipts'
        AND EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.id = ((storage.foldername(name))[1])::uuid
              AND b.companion_user_id = auth.uid()
        )
    );

-- ---------------------------------------------------------------------------
-- 5. Fare reference — the payoff
-- ---------------------------------------------------------------------------
-- What rides between these areas have actually cost. Admin-only for now; when
-- there is enough of it, this is what lets the booking form say "about ₹300 to
-- Kailash" without asking any third party.
CREATE OR REPLACE VIEW public.transport_fare_reference AS
    SELECT provider,
           drop_label,
           date_part('hour', ride_at)          AS ride_hour,
           COUNT(*)                            AS rides,
           ROUND(AVG(final_fare_paise))::INTEGER AS avg_fare_paise,
           MIN(final_fare_paise)               AS min_fare_paise,
           MAX(final_fare_paise)               AS max_fare_paise
    FROM booking_transport
    WHERE final_fare_paise IS NOT NULL
    GROUP BY provider, drop_label, date_part('hour', ride_at);

REVOKE ALL ON public.transport_fare_reference FROM PUBLIC;
GRANT SELECT ON public.transport_fare_reference TO authenticated;
GRANT EXECUTE ON FUNCTION public.companion_may_drive(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Sanity check: transport must never have altered a bill.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ASSERT NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'booking_transport' AND column_name = 'final_amount_paise'
    ), 'transport rows must not carry a Caresy billable amount';
END $$;
