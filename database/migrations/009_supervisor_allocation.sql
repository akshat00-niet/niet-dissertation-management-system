-- Migration: 009_supervisor_allocation.sql
-- Description: Create supervisor allocation, allocation history, and faculty load synchronization triggers.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 009 of 018

-- Table 24: guide_allocations (Manual Allocation by D.HOD)
CREATE TABLE guide_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    guide_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    co_guide_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    allocated_by_dhod_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT uq_guide_alloc_thesis UNIQUE (thesis_id),
    CONSTRAINT chk_guide_alloc_distinct CHECK (guide_id != co_guide_id)
);

-- Table 25: guide_allocation_history (Append-Only Reallocation Audit Log)
CREATE TABLE guide_allocation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thesis_id UUID NOT NULL REFERENCES theses(id) ON DELETE RESTRICT,
    previous_guide_id UUID DEFAULT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    previous_co_guide_id UUID DEFAULT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    new_guide_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    new_co_guide_id UUID NOT NULL REFERENCES faculty_profiles(user_id) ON DELETE RESTRICT,
    action_by_dhod_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    justification TEXT NOT NULL,
    reallocated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CONSTRAINT chk_realloc_distinct CHECK (new_guide_id != new_co_guide_id)
);

-- Faculty Load Sync Function & Trigger
CREATE OR REPLACE FUNCTION public.fn_sync_thesis_supervisors_and_loads()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Synchronize supervisor foreign keys on the parent theses record
    UPDATE public.theses
    SET guide_id = NEW.guide_id,
        co_guide_id = NEW.co_guide_id,
        updated_at = clock_timestamp()
    WHERE id = NEW.thesis_id;

    -- Recalculate Guide load for assigned faculty
    UPDATE public.faculty_profiles
    SET active_guide_load = (
        SELECT COUNT(*)
        FROM public.theses
        WHERE guide_id = NEW.guide_id
          AND current_state NOT IN ('ARCHIVED', 'PROPOSAL_REJECTED_TERMINAL')
    )
    WHERE user_id = NEW.guide_id;

    -- Recalculate Co-Guide load for assigned faculty
    UPDATE public.faculty_profiles
    SET active_coguide_load = (
        SELECT COUNT(*)
        FROM public.theses
        WHERE co_guide_id = NEW.co_guide_id
          AND current_state NOT IN ('ARCHIVED', 'PROPOSAL_REJECTED_TERMINAL')
    )
    WHERE user_id = NEW.co_guide_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_supervisors_after_alloc
AFTER INSERT OR UPDATE ON guide_allocations
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_thesis_supervisors_and_loads();

CREATE INDEX idx_guide_alloc_thesis ON guide_allocations(thesis_id);
CREATE INDEX idx_guide_alloc_guide ON guide_allocations(guide_id);
CREATE INDEX idx_guide_alloc_coguide ON guide_allocations(co_guide_id);
CREATE INDEX idx_guide_alloc_hist_thesis ON guide_allocation_history(thesis_id);
