-- Migration: 002_rls_helper_functions.sql
-- Description: Define all custom RLS security-definer helper functions in the public schema for Supabase compatibility.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 002 of 018

BEGIN;

-- Safe Conditional Schema Check for Local Validation Environments
-- On Supabase Cloud, auth schema and auth.uid()/auth.jwt() pre-exist; on local Postgres, stubs are provided.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
        CREATE SCHEMA auth;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth' AND p.proname = 'uid') THEN
        EXECUTE 'CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS ''SELECT NULL::UUID''';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth' AND p.proname = 'jwt') THEN
        EXECUTE 'CREATE FUNCTION auth.jwt() RETURNS JSONB LANGUAGE sql STABLE AS ''SELECT NULL::JSONB''';
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 1. Helper Function: Extract Department Tenancy with Safe Local Fallback
CREATE OR REPLACE FUNCTION public.jwt_dept_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_dept_id UUID;
BEGIN
    -- First attempt: Extract from JWT app_metadata claim if present
    BEGIN
        v_dept_id := (auth.jwt() -> 'app_metadata' ->> 'department_id')::UUID;
    EXCEPTION WHEN OTHERS THEN
        v_dept_id := NULL;
    END;

    -- Second attempt / Fallback: Query active user_role_assignments table
    IF v_dept_id IS NULL THEN
        SELECT department_id INTO v_dept_id
        FROM public.user_role_assignments
        WHERE user_id = auth.uid()
          AND is_active = TRUE
          AND department_id IS NOT NULL
        LIMIT 1;
    END IF;

    RETURN v_dept_id;
END;
$$;

-- 2. Helper Function: Check Active Role Membership (Canonical Role Identifiers)
CREATE OR REPLACE FUNCTION public.has_role(VARIADIC allowed_roles text[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_has_role BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        WHERE ura.user_id = auth.uid()
          AND ura.is_active = TRUE
          AND ura.role_id = ANY(allowed_roles)
    ) INTO v_has_role;

    RETURN COALESCE(v_has_role, FALSE);
END;
$$;

-- 3. Helper Function: Check Primary Guide Assignment
CREATE OR REPLACE FUNCTION public.is_assigned_guide(p_thesis_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_is_guide BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.theses t
        WHERE t.id = p_thesis_id
          AND t.guide_id = auth.uid()
    ) INTO v_is_guide;

    RETURN COALESCE(v_is_guide, FALSE);
END;
$$;

-- 4. Helper Function: Check Co-Guide Assignment
CREATE OR REPLACE FUNCTION public.is_assigned_coguide(p_thesis_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_is_coguide BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.theses t
        WHERE t.id = p_thesis_id
          AND t.co_guide_id = auth.uid()
    ) INTO v_is_coguide;

    RETURN COALESCE(v_is_coguide, FALSE);
END;
$$;

-- 5. Helper Function: Check Defense Panel Membership
CREATE OR REPLACE FUNCTION public.is_assigned_panel_member(p_thesis_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_is_panel BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.viva_defenses vd
        JOIN public.defense_panels dp ON dp.viva_defense_id = vd.id
        JOIN public.panel_member_assignments pma ON pma.panel_id = dp.id
        WHERE vd.thesis_id = p_thesis_id
          AND pma.faculty_id = auth.uid()
    ) INTO v_is_panel;

    RETURN COALESCE(v_is_panel, FALSE);
END;
$$;

-- 6. Helper Function: Check Active DCEC Chair Authority (HOD or Valid Delegation)
CREATE OR REPLACE FUNCTION public.is_active_dcec_chair(p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_is_chair BOOLEAN;
BEGIN
    -- Check if user is HOD of the department
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        WHERE ura.user_id = auth.uid()
          AND ura.role_id = 'HOD'
          AND ura.department_id = p_department_id
          AND ura.is_active = TRUE
    ) INTO v_is_chair;

    IF v_is_chair THEN
        RETURN TRUE;
    END IF;

    -- Check if user holds an active, unrevoked DCEC Chair delegation in the department
    SELECT EXISTS (
        SELECT 1
        FROM public.dcec_delegations dd
        WHERE dd.department_id = p_department_id
          AND dd.dhod_user_id = auth.uid()
          AND dd.is_revoked = FALSE
          AND CURRENT_TIMESTAMP >= dd.effective_from
          AND CURRENT_TIMESTAMP <= dd.effective_until
    ) INTO v_is_chair;

    RETURN COALESCE(v_is_chair, FALSE);
END;
$$;

-- Grant Execution Rights to Supabase standard roles
GRANT EXECUTE ON FUNCTION public.jwt_dept_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(VARIADIC text[]) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_guide(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_coguide(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_assigned_panel_member(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_dcec_chair(UUID) TO authenticated, service_role;

COMMIT;
