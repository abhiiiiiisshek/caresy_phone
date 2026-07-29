-- ============================================================================
-- 26. Billing — final amounts, cash/UPI collection
-- ============================================================================
-- Money columns on bookings, plus the two RPCs that are the ONLY way to write
-- them.
--
-- Why RPCs and not plain columns: the UPDATE policies on bookings are
-- row-level and unrestricted by column —
--   "Users and admins can update bookings"   USING (customer_user_id = auth.uid() OR is_admin())
--   "Companions update their assigned jobs"  USING (companion_user_id = auth.uid())
-- so a customer holding a valid session can PATCH any column of their own
-- booking. Postgres RLS cannot restrict columns. If final_amount_paise were an
-- ordinary column, `UPDATE bookings SET final_amount_paise = 0` from the
-- browser would be accepted. The trigger below closes that: payment columns
-- change only inside a transaction that a SECURITY DEFINER function has
-- flagged, and those functions compute the amount themselves.
--
-- The price rules are duplicated from packages/utils/src/pricing.ts. That is
-- deliberate: the client copy draws the quote, this copy decides what is owed.
-- A client-supplied amount would let a modified app bill anything. Keep the two
-- in step — pricing.check.ts pins the TS side.

ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS final_amount_paise INTEGER,
    ADD COLUMN IF NOT EXISTS payment_method     TEXT,      -- CASH | UPI
    ADD COLUMN IF NOT EXISTS payment_status     TEXT NOT NULL DEFAULT 'UNBILLED',
                                                           -- UNBILLED | PENDING | COLLECTED | WAIVED
    ADD COLUMN IF NOT EXISTS billed_minutes     INTEGER,
    ADD COLUMN IF NOT EXISTS collected_at       TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS collected_by       UUID REFERENCES auth.users(id);

DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_payment_status
        CHECK (payment_status IN ('UNBILLED', 'PENDING', 'COLLECTED', 'WAIVED'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_payment_method
        CHECK (payment_method IS NULL OR payment_method IN ('CASH', 'UPI'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Amounts are non-negative paise. Cheap insurance against a sign error in the
-- price function ever reaching a real bill.
DO $$ BEGIN
    ALTER TABLE bookings ADD CONSTRAINT chk_final_amount_sane
        CHECK (final_amount_paise IS NULL OR (final_amount_paise >= 0 AND final_amount_paise <= 10000000));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_bookings_awaiting_payment
    ON bookings(payment_status, collected_at) WHERE payment_status = 'PENDING';

-- ---------------------------------------------------------------------------
-- Price rules (mirror of packages/utils/src/pricing.ts)
-- ---------------------------------------------------------------------------
-- Two slabs and a meter: the slab the time reaches, plus Rs 4/min past it,
-- never more than a longer slab would have cost.
--
-- The cap is what keeps it monotonic. Without it 7h59m bills more than 8h00m,
-- so staying longer would cost less — indefensible on a phone call.
CREATE OR REPLACE FUNCTION public.price_for_minutes(p_minutes INTEGER)
RETURNS INTEGER LANGUAGE sql IMMUTABLE
AS $$
    WITH slabs(minutes, paise) AS (VALUES (60, 29900), (480, 159900)),
         used AS (SELECT GREATEST(0, COALESCE(p_minutes, 0)) AS m),
         -- The longest slab the time actually reaches; under an hour still
         -- lands on the first, which is the minimum charge for a visit.
         slab AS (
             SELECT s.minutes, s.paise FROM slabs s, used u
             WHERE u.m >= s.minutes
             ORDER BY s.minutes DESC LIMIT 1
         ),
         base AS (
             SELECT COALESCE((SELECT minutes FROM slab), 60) AS minutes,
                    COALESCE((SELECT paise   FROM slab), 29900) AS paise
         )
    SELECT LEAST(
        (SELECT b.paise + GREATEST(0, u.m - b.minutes - 15) * 400 FROM base b, used u),
        COALESCE((SELECT MIN(s.paise) FROM slabs s, used u WHERE s.minutes >= u.m), 2147483647)
    )::INTEGER;
$$;

COMMENT ON FUNCTION public.price_for_minutes(INTEGER) IS
    'Rs 299 first hour, Rs 4/min after 15 min grace, capped by the Rs 1,599 full day. Mirrors packages/utils/src/pricing.ts.';

-- ---------------------------------------------------------------------------
-- Lock the payment columns against direct UPDATE
-- ---------------------------------------------------------------------------
-- Only a transaction flagged by one of the SECURITY DEFINER functions below
-- may change these. Admins are exempt so ops can correct a bill by hand.
CREATE OR REPLACE FUNCTION public.guard_booking_payment_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF current_setting('caresy.billing', true) = 'on' OR is_admin() THEN
        RETURN NEW;
    END IF;

    IF NEW.final_amount_paise IS DISTINCT FROM OLD.final_amount_paise
       OR NEW.payment_status  IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method  IS DISTINCT FROM OLD.payment_method
       OR NEW.billed_minutes  IS DISTINCT FROM OLD.billed_minutes
       OR NEW.collected_at    IS DISTINCT FROM OLD.collected_at
       OR NEW.collected_by    IS DISTINCT FROM OLD.collected_by
    THEN
        RAISE EXCEPTION 'Payment fields are set by complete_booking() and record_payment(), not by direct update';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_booking_payment ON bookings;
CREATE TRIGGER trg_guard_booking_payment
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION guard_booking_payment_columns();

-- ---------------------------------------------------------------------------
-- complete_booking — the companion taps "Complete", the server prices it
-- ---------------------------------------------------------------------------
-- Time comes from actual_start_time (written when they tapped Start) to NOW(),
-- never from the client. The evening surcharge is read back from the quote
-- stored at booking time rather than recomputed, so a visit that happens to run
-- into the evening is not surcharged after the fact.
CREATE OR REPLACE FUNCTION public.complete_booking(p_booking UUID)
RETURNS TABLE (final_amount_paise INTEGER, billed_minutes INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking  bookings%ROWTYPE;
    v_minutes  INTEGER;
    v_evening  INTEGER;
    v_total    INTEGER;
BEGIN
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.companion_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the assigned companion may complete this booking';
    END IF;

    IF v_booking.status = 'COMPLETED' THEN
        -- Idempotent: a double tap on a flaky connection must not re-price.
        RETURN QUERY SELECT v_booking.final_amount_paise, v_booking.billed_minutes;
        RETURN;
    END IF;

    IF v_booking.actual_start_time IS NULL THEN
        RAISE EXCEPTION 'Start the job before completing it';
    END IF;

    -- Round part-minutes up, and never bill negative time if the clocks disagree.
    v_minutes := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (NOW() - v_booking.actual_start_time)) / 60.0))::INTEGER;

    v_evening := COALESCE((v_booking.service_metadata ->> 'eveningSurchargePaise')::INTEGER, 0);
    -- Clamp: service_metadata is client-written, so a tampered quote cannot
    -- inflate the bill beyond the one surcharge that exists.
    IF v_evening NOT IN (0, 9900) THEN
        v_evening := 0;
    END IF;

    v_total := price_for_minutes(v_minutes) + v_evening;

    PERFORM set_config('caresy.billing', 'on', true);  -- true = transaction-local
    UPDATE bookings SET
        status             = 'COMPLETED',
        actual_end_time    = NOW(),
        billed_minutes     = v_minutes,
        final_amount_paise = v_total,
        payment_status     = 'PENDING'
    WHERE id = p_booking;

    RETURN QUERY SELECT v_total, v_minutes;
END;
$$;

-- ---------------------------------------------------------------------------
-- record_payment — companion confirms cash or UPI landed
-- ---------------------------------------------------------------------------
-- Deliberately companion-only. A raw UPI link gives no confirmation callback,
-- so somebody has to assert the money arrived, and it must not be the person
-- who owes it — a customer-callable version would be a free-booking button.
CREATE OR REPLACE FUNCTION public.record_payment(p_booking UUID, p_method TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_booking bookings%ROWTYPE;
BEGIN
    IF p_method NOT IN ('CASH', 'UPI') THEN
        RAISE EXCEPTION 'Payment method must be CASH or UPI';
    END IF;

    SELECT * INTO v_booking FROM bookings WHERE id = p_booking AND deleted_at IS NULL;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found';
    END IF;

    IF v_booking.companion_user_id IS DISTINCT FROM auth.uid() AND NOT is_admin() THEN
        RAISE EXCEPTION 'Only the assigned companion may record payment';
    END IF;

    IF v_booking.payment_status = 'COLLECTED' THEN
        RETURN;  -- idempotent
    END IF;

    IF v_booking.payment_status <> 'PENDING' THEN
        RAISE EXCEPTION 'Complete the booking before recording payment';
    END IF;

    PERFORM set_config('caresy.billing', 'on', true);
    UPDATE bookings SET
        payment_method = p_method,
        payment_status = 'COLLECTED',
        collected_at   = NOW(),
        collected_by   = auth.uid()
    WHERE id = p_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_booking(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_payment(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_booking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_payment(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.price_for_minutes(INTEGER) TO authenticated, anon;

-- ---------------------------------------------------------------------------
-- Sanity checks — these run at migration time and fail loudly if the price
-- rules drift from packages/utils/src/pricing.check.ts.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ASSERT price_for_minutes(0)   =  29900, 'minimum charge';
    ASSERT price_for_minutes(60)  =  29900, '1 hour';
    ASSERT price_for_minutes(75)  =  29900, '15 min grace is free';
    ASSERT price_for_minutes(76)  =  30300, 'meter starts after grace';
    ASSERT price_for_minutes(120) =  47900, '2 hours';
    ASSERT price_for_minutes(240) =  95900, '4 hours';
    ASSERT price_for_minutes(479) = 159900, '7h59m capped at the day rate';
    ASSERT price_for_minutes(480) = 159900, 'full day';
    ASSERT price_for_minutes(720) = 249900, '12 hours';
    ASSERT price_for_minutes(-5)  =  29900, 'clock skew must not go negative';
END $$;
