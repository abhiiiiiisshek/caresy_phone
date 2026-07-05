-- ====================================================
-- Caresy Database Schema Setup Script
-- Run this in the Supabase SQL Editor to initialize.
-- ====================================================

-- 1. Enums & Custom Types
DO $$ BEGIN
    CREATE TYPE booking_status_enum AS ENUM (
        'DRAFT',           -- User is filling out the form
        'PENDING',         -- Submitted, awaiting manual admin assignment
        'ASSIGNED',        -- Companion assigned, en route or scheduled
        'IN_PROGRESS',     -- Companion has checked in / started the job
        'COMPLETED',       -- Job finished successfully
        'CANCELLED'        -- Cancelled by customer or admin
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_type_enum AS ENUM (
        'INSTANT', 
        'SCHEDULED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE service_type_enum AS ENUM (
        'HOSPITAL_COMPANION',
        'MEDICINE_PICKUP',
        'DIAGNOSTIC_TEST',
        'QUEUE_MANAGEMENT',
        'DOCUMENTATION',
        'APPOINTMENT_ASSISTANCE',
        'SAFE_RETURN'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Helper Functions for Authentication and Authorization
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(email LIKE '%@caresy.co', FALSE)
    FROM auth.users
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Core Tables

-- A. patients
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    gender TEXT,
    age INTEGER CHECK (age > 0 AND age < 130),
    mobility_notes TEXT, -- e.g., "Uses wheelchair"
    emergency_contact_phone VARCHAR(15), 
    
    -- System Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ -- Soft Delete
);

-- B. locations
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Nullable if it's a global hospital
    title TEXT NOT NULL, -- e.g., "Max Hospital, Greater Noida", "Home"
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL DEFAULT 'Noida',
    state TEXT NOT NULL DEFAULT 'Uttar Pradesh',
    pincode VARCHAR(10) NOT NULL,
    latitude NUMERIC(10, 7), 
    longitude NUMERIC(10, 7),
    
    -- System Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- C. bookings
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Relationships
    customer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Who pays/booked
    patient_id UUID NOT NULL REFERENCES patients(id), -- Who receives care
    companion_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Attendant companion
    pickup_location_id UUID NOT NULL REFERENCES locations(id),
    destination_location_id UUID REFERENCES locations(id), 
    
    -- Core Logistics
    service_type service_type_enum NOT NULL,
    booking_type booking_type_enum NOT NULL,
    status booking_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Timestamps
    scheduled_start_time TIMESTAMPTZ,      -- Null if INSTANT
    actual_start_time TIMESTAMPTZ,
    actual_end_time TIMESTAMPTZ,
    
    -- Pricing & Context
    estimated_duration_minutes INTEGER,
    special_instructions TEXT,
    service_metadata JSONB, -- Flexible service-specific data
    
    -- System Fields
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_end_after_start CHECK (actual_end_time >= actual_start_time)
);

-- D. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    actor_id UUID, -- Who made the change (Admin ID, Customer ID, or System)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies

-- Patients Policies
CREATE POLICY "Users can view their own patients" 
    ON patients FOR SELECT 
    USING (customer_user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create their own patients" 
    ON patients FOR INSERT 
    WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Users can update their own patients" 
    ON patients FOR UPDATE 
    USING (customer_user_id = auth.uid() OR is_admin());

-- Locations Policies
CREATE POLICY "Users can view saved locations or global locations" 
    ON locations FOR SELECT 
    USING (customer_user_id = auth.uid() OR customer_user_id IS NULL OR is_admin());

CREATE POLICY "Users can create their own locations" 
    ON locations FOR INSERT 
    WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Users can update their own locations" 
    ON locations FOR UPDATE 
    USING (customer_user_id = auth.uid() OR is_admin());

-- Bookings Policies
CREATE POLICY "Users can view their own bookings" 
    ON bookings FOR SELECT 
    USING (customer_user_id = auth.uid() OR is_admin() OR companion_user_id = auth.uid());

CREATE POLICY "Users can create their own bookings" 
    ON bookings FOR INSERT 
    WITH CHECK (customer_user_id = auth.uid());

CREATE POLICY "Users and admins can update bookings" 
    ON bookings FOR UPDATE 
    USING (customer_user_id = auth.uid() OR is_admin());

-- Audit Logs Policies
CREATE POLICY "Admins can view audit logs" 
    ON audit_logs FOR SELECT 
    USING (is_admin());

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_patients_customer_user_id ON patients(customer_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_locations_city ON locations(city);
CREATE INDEX IF NOT EXISTS idx_locations_customer_user_id ON locations(customer_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_companion_id ON bookings(companion_user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_time ON bookings(scheduled_start_time) WHERE status IN ('PENDING', 'ASSIGNED');
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);

-- 7. Triggers and Functions

-- A. Auto-Update updated_at Timestamps
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_bookings
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_patients
BEFORE UPDATE ON patients
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_locations
BEFORE UPDATE ON locations
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

-- B. Audit Logging Trigger (Captures UPDATE and DELETE)
CREATE OR REPLACE FUNCTION trigger_audit_bookings()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, actor_id)
        VALUES ('bookings', OLD.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, auth.uid());
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_data, actor_id)
        VALUES ('bookings', OLD.id, 'DELETE', row_to_json(OLD)::jsonb, auth.uid());
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_bookings_changes
AFTER UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE PROCEDURE trigger_audit_bookings();
