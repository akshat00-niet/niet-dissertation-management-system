-- Migration: 021_supervisor_allocation_workflow_rpc.sql
-- Description: Atomic PostgreSQL RPCs for D.HOD Supervisor Allocation and Exceptional Reallocation Workflows
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 5H

-- ============================================================================
-- 1. Helper Function: get_dhod_allocation_queue
-- Description: Retrieves pending theses in APPROVED_FOR_ALLOCATION for the authenticated D.HOD's department,
--              including student profile details and their 4 ranked supervisor preferences.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_dhod_allocation_queue();
CREATE OR REPLACE FUNCTION public.get_dhod_allocation_queue()
RETURNS TABLE (
    thesis_id UUID,
    tracking_number VARCHAR(64),
    department_id UUID,
    student_id UUID,
    student_name VARCHAR(255),
    student_roll_number VARCHAR(32),
    proposed_title TEXT,
    broad_domain VARCHAR(255),
    problem_statement TEXT,
    expected_outcomes TEXT,
    current_state VARCHAR(64),
    current_stage VARCHAR(64),
    approved_at TIMESTAMPTZ,
    guide_id UUID,
    guide_name VARCHAR(255),
    co_guide_id UUID,
    co_guide_name VARCHAR(255),
    student_preferences JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_dept_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Resolve caller's department where they hold active DHOD role
    SELECT ura.department_id INTO v_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_caller_id
      AND ura.role_id = 'DHOD'
    LIMIT 1;

    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Caller is not an authorized Deputy Head of Department (D.HOD).' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        t.id AS thesis_id,
        t.tracking_number,
        t.department_id,
        t.student_id,
        stu_u.full_name AS student_name,
        sp.roll_number AS student_roll_number,
        a1.proposed_title,
        a1.broad_domain,
        a1.problem_statement,
        a1.expected_outcomes,
        t.current_state,
        t.current_stage,
        dd.decision_at AS approved_at,
        t.guide_id,
        g_u.full_name AS guide_name,
        t.co_guide_id,
        cg_u.full_name AS co_guide_name,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'preference_rank', gp.preference_rank,
                        'faculty_id', gp.faculty_id,
                        'faculty_name', fu.full_name,
                        'designation', fp.designation,
                        'active_guide_load', fp.active_guide_load,
                        'active_coguide_load', fp.active_coguide_load,
                        'is_available', fp.is_available
                    ) ORDER BY gp.preference_rank ASC
                )
                FROM public.guide_preferences gp
                JOIN public.users fu ON fu.id = gp.faculty_id
                JOIN public.faculty_profiles fp ON fp.user_id = gp.faculty_id
                WHERE gp.annexure_1_id = a1.id
            ),
            '[]'::jsonb
        ) AS student_preferences
    FROM public.theses t
    JOIN public.users stu_u ON stu_u.id = t.student_id
    JOIN public.student_profiles sp ON sp.user_id = t.student_id
    LEFT JOIN public.annexure_1_submissions a1 ON a1.thesis_id = t.id
    LEFT JOIN public.dcec_dockets ddock ON ddock.thesis_id = t.id AND ddock.docket_stage = 'ANNEXURE_1_SCREENING'
    LEFT JOIN public.dcec_decisions dd ON dd.docket_id = ddock.id AND dd.outcome = 'APPROVED'
    LEFT JOIN public.users g_u ON g_u.id = t.guide_id
    LEFT JOIN public.users cg_u ON cg_u.id = t.co_guide_id
    WHERE t.department_id = v_dept_id
      AND t.current_state IN ('APPROVED_FOR_ALLOCATION', 'SUPERVISORS_ALLOCATED')
    ORDER BY
        CASE WHEN t.current_state = 'APPROVED_FOR_ALLOCATION' THEN 1 ELSE 2 END,
        t.created_at ASC;
END;
$$;


-- ============================================================================
-- 2. Helper Function: get_department_faculty_alloc_options
-- Description: Retrieves active, eligible faculty in the caller's department with live loads.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_department_faculty_alloc_options();
CREATE OR REPLACE FUNCTION public.get_department_faculty_alloc_options()
RETURNS TABLE (
    faculty_id UUID,
    full_name VARCHAR(255),
    employee_code VARCHAR(32),
    designation VARCHAR(64),
    department_id UUID,
    active_guide_load INT,
    active_coguide_load INT,
    is_available BOOLEAN,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_dept_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- Resolve caller's department (DHOD or HOD)
    SELECT ura.department_id INTO v_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_caller_id
      AND ura.role_id IN ('DHOD', 'HOD')
    LIMIT 1;

    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to view faculty allocation options.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        fp.user_id AS faculty_id,
        u.full_name,
        fp.employee_code,
        fp.designation,
        fp.department_id,
        fp.active_guide_load,
        fp.active_coguide_load,
        fp.is_available,
        u.is_active
    FROM public.faculty_profiles fp
    JOIN public.users u ON u.id = fp.user_id
    WHERE fp.department_id = v_dept_id
      AND u.is_active = TRUE
    ORDER BY u.full_name ASC;
END;
$$;


-- ============================================================================
-- 3. Mutation Function: allocate_thesis_supervisors
-- Description: Executes atomic manual allocation of Primary Guide and Co-Guide by D.HOD.
--              Enforces distinct supervisors, department matching, availability, capacity (< 3),
--              pessimistic row locking, WORM audit logging, and notifications.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.allocate_thesis_supervisors(
    p_thesis_id UUID,
    p_guide_id UUID,
    p_co_guide_id UUID,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_dept_id UUID;
    v_thesis public.theses%ROWTYPE;
    v_guide_fp public.faculty_profiles%ROWTYPE;
    v_coguide_fp public.faculty_profiles%ROWTYPE;
    v_guide_active BOOLEAN;
    v_coguide_active BOOLEAN;
    v_alloc_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
BEGIN
    -- 1. Authentication & Caller Identity Resolution
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required to allocate supervisors.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify D.HOD Authority & Department Scope
    SELECT ura.department_id INTO v_caller_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_caller_id
      AND ura.role_id = 'DHOD'
    LIMIT 1;

    IF v_caller_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Only Deputy Head of Department (D.HOD) possesses supervisor allocation authority.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Inputs
    IF p_thesis_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: thesis_id is required.' USING ERRCODE = '23502';
    END IF;
    IF p_guide_id IS NULL OR p_co_guide_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Both Guide and Co-Guide must be selected.' USING ERRCODE = '23502';
    END IF;

    -- Invariant REQ-ALLOC-006: Guide != Co-Guide
    IF p_guide_id = p_co_guide_id THEN
        RAISE EXCEPTION 'IDENTICAL_SUPERVISORS: Primary Guide and Co-Guide cannot be the same faculty member.' USING ERRCODE = '23514';
    END IF;

    -- 4. Pessimistic Lock on Target Thesis
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Thesis not found: %', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- Tenancy check: D.HOD can only allocate in their own department
    IF v_thesis.department_id != v_caller_dept_id THEN
        RAISE EXCEPTION 'Forbidden: D.HOD cannot allocate supervisors for a thesis in another department.' USING ERRCODE = '42501';
    END IF;

    -- State check: Must be APPROVED_FOR_ALLOCATION
    IF v_thesis.current_state != 'APPROVED_FOR_ALLOCATION' THEN
        RAISE EXCEPTION 'InvalidState: Cannot allocate supervisors for thesis % in state % (expected APPROVED_FOR_ALLOCATION).',
            v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 5. Concurrency Protection: Pessimistic Row Lock on Faculty Profiles in Deterministic Order
    IF p_guide_id < p_co_guide_id THEN
        SELECT * INTO v_guide_fp FROM public.faculty_profiles WHERE user_id = p_guide_id FOR UPDATE;
        SELECT * INTO v_coguide_fp FROM public.faculty_profiles WHERE user_id = p_co_guide_id FOR UPDATE;
    ELSE
        SELECT * INTO v_coguide_fp FROM public.faculty_profiles WHERE user_id = p_co_guide_id FOR UPDATE;
        SELECT * INTO v_guide_fp FROM public.faculty_profiles WHERE user_id = p_guide_id FOR UPDATE;
    END IF;

    IF v_guide_fp.user_id IS NULL THEN
        RAISE EXCEPTION 'Primary Guide faculty profile not found: %', p_guide_id USING ERRCODE = 'P0002';
    END IF;
    IF v_coguide_fp.user_id IS NULL THEN
        RAISE EXCEPTION 'Co-Guide faculty profile not found: %', p_co_guide_id USING ERRCODE = 'P0002';
    END IF;

    -- 6. Validate Faculty Department Tenancy
    IF v_guide_fp.department_id != v_thesis.department_id THEN
        RAISE EXCEPTION 'Forbidden: Primary Guide must belong to the candidate''s department.' USING ERRCODE = '42501';
    END IF;
    IF v_coguide_fp.department_id != v_thesis.department_id THEN
        RAISE EXCEPTION 'Forbidden: Co-Guide must belong to the candidate''s department.' USING ERRCODE = '42501';
    END IF;

    -- 7. Validate Faculty Active Status & Availability
    SELECT is_active INTO v_guide_active FROM public.users WHERE id = p_guide_id;
    SELECT is_active INTO v_coguide_active FROM public.users WHERE id = p_co_guide_id;

    IF v_guide_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Selected Primary Guide is inactive.' USING ERRCODE = '23514';
    END IF;
    IF v_coguide_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Selected Co-Guide is inactive.' USING ERRCODE = '23514';
    END IF;

    IF v_guide_fp.is_available IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Selected Primary Guide is marked unavailable for dissertation supervision.' USING ERRCODE = '23514';
    END IF;
    IF v_coguide_fp.is_available IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Selected Co-Guide is marked unavailable for dissertation supervision.' USING ERRCODE = '23514';
    END IF;

    -- 8. Capacity Validation: REQ-ALLOC-004 & REQ-ALLOC-005 (Active Load <= 3)
    IF v_guide_fp.active_guide_load >= 3 THEN
        RAISE EXCEPTION 'SUPERVISOR_CAPACITY_BREACH: Primary Guide has reached maximum capacity load of 3 active dissertations.' USING ERRCODE = '23514';
    END IF;
    IF v_coguide_fp.active_coguide_load >= 3 THEN
        RAISE EXCEPTION 'SUPERVISOR_CAPACITY_BREACH: Co-Guide has reached maximum capacity load of 3 active dissertations.' USING ERRCODE = '23514';
    END IF;

    -- 9. Insert/Upsert into guide_allocations (triggers trg_sync_supervisors_after_alloc)
    INSERT INTO public.guide_allocations (
        thesis_id,
        guide_id,
        co_guide_id,
        allocated_by_dhod_id,
        allocated_at
    )
    VALUES (
        p_thesis_id,
        p_guide_id,
        p_co_guide_id,
        v_caller_id,
        clock_timestamp()
    )
    ON CONFLICT (thesis_id) DO UPDATE
    SET guide_id = EXCLUDED.guide_id,
        co_guide_id = EXCLUDED.co_guide_id,
        allocated_by_dhod_id = EXCLUDED.allocated_by_dhod_id,
        allocated_at = EXCLUDED.allocated_at
    RETURNING id INTO v_alloc_id;

    -- 10. Transition Thesis State to SUPERVISORS_ALLOCATED
    UPDATE public.theses
    SET current_state = 'SUPERVISORS_ALLOCATED',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 11. Record Immutable Audit Event (WORM Log)
    INSERT INTO public.audit_events (
        actor_user_id,
        active_role_id,
        action_code,
        target_entity_type,
        target_entity_id,
        previous_state,
        new_state,
        justification,
        client_ip,
        user_agent,
        correlation_id,
        timestamp_utc
    )
    VALUES (
        v_caller_id,
        'DHOD',
        'SUPERVISOR_ALLOCATED',
        'GUIDE_ALLOCATION',
        v_alloc_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'current_state', 'APPROVED_FOR_ALLOCATION',
            'guide_id', NULL,
            'co_guide_id', NULL
        ),
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'current_state', 'SUPERVISORS_ALLOCATED',
            'guide_id', p_guide_id,
            'co_guide_id', p_co_guide_id,
            'guide_load_after', v_guide_fp.active_guide_load + 1,
            'coguide_load_after', v_coguide_fp.active_coguide_load + 1
        ),
        NULL,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 12. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'SUPERVISORS_ALLOCATED',
        'THESIS',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'guide_id', p_guide_id,
            'co_guide_id', p_co_guide_id,
            'allocated_by', v_caller_id,
            'tracking_number', v_thesis.tracking_number
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 13. Create In-App Notification Message & Deliveries
    INSERT INTO public.notification_messages (
        event_id,
        category,
        priority,
        title,
        summary,
        action_url,
        created_at
    )
    VALUES (
        v_academic_event_id,
        'ALLOCATION',
        'NORMAL',
        'Supervisors Allocated: ' || v_thesis.tracking_number,
        'Primary Guide and Co-Guide have been assigned for dissertation ' || v_thesis.tracking_number || '.',
        '/app/student/dissertation',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    -- Notification Deliveries: (1) Student, (2) Guide, (3) Co-Guide
    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES
        (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, p_guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, p_co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- 14. Return JSON Payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'allocation_id', v_alloc_id,
        'thesis_id', p_thesis_id,
        'guide_id', p_guide_id,
        'co_guide_id', p_co_guide_id,
        'current_state', 'SUPERVISORS_ALLOCATED',
        'current_stage', 'ALLOCATION_STAGE',
        'allocated_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 4. Mutation Function: reallocate_thesis_supervisors
-- Description: Executes exceptional supervisor reallocation by D.HOD with mandatory justification.
--              Maintains append-only WORM history in guide_allocation_history and recalculates loads.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reallocate_thesis_supervisors(
    p_thesis_id UUID,
    p_new_guide_id UUID,
    p_new_co_guide_id UUID,
    p_justification TEXT,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_caller_dept_id UUID;
    v_thesis public.theses%ROWTYPE;
    v_old_guide_id UUID;
    v_old_co_guide_id UUID;
    v_new_guide_fp public.faculty_profiles%ROWTYPE;
    v_new_coguide_fp public.faculty_profiles%ROWTYPE;
    v_guide_active BOOLEAN;
    v_coguide_active BOOLEAN;
    v_history_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
BEGIN
    -- 1. Authentication
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required to reallocate supervisors.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify D.HOD Authority
    SELECT ura.department_id INTO v_caller_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_caller_id
      AND ura.role_id = 'DHOD'
    LIMIT 1;

    IF v_caller_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Only Deputy Head of Department (D.HOD) possesses supervisor reallocation authority.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Inputs
    IF p_thesis_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: thesis_id is required.' USING ERRCODE = '23502';
    END IF;
    IF p_new_guide_id IS NULL OR p_new_co_guide_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Both new Guide and new Co-Guide must be specified.' USING ERRCODE = '23502';
    END IF;
    IF p_justification IS NULL OR trim(p_justification) = '' THEN
        RAISE EXCEPTION 'Validation failed: Explicit institutional justification is mandatory for supervisor reallocation.' USING ERRCODE = '23514';
    END IF;
    IF p_new_guide_id = p_new_co_guide_id THEN
        RAISE EXCEPTION 'IDENTICAL_SUPERVISORS: New Primary Guide and new Co-Guide cannot be the same faculty member.' USING ERRCODE = '23514';
    END IF;

    -- 4. Pessimistic Lock on Target Thesis
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Thesis not found: %', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    IF v_thesis.department_id != v_caller_dept_id THEN
        RAISE EXCEPTION 'Forbidden: D.HOD cannot reallocate supervisors for a thesis in another department.' USING ERRCODE = '42501';
    END IF;

    -- Retrieve existing allocation
    SELECT guide_id, co_guide_id INTO v_old_guide_id, v_old_co_guide_id
    FROM public.guide_allocations
    WHERE thesis_id = p_thesis_id;

    IF v_old_guide_id IS NULL THEN
        RAISE EXCEPTION 'InvalidState: Thesis % does not have an existing supervisor allocation to reallocate.', v_thesis.tracking_number USING ERRCODE = '23514';
    END IF;

    -- 5. Lock New Faculty Profiles in Deterministic Order
    IF p_new_guide_id < p_new_co_guide_id THEN
        SELECT * INTO v_new_guide_fp FROM public.faculty_profiles WHERE user_id = p_new_guide_id FOR UPDATE;
        SELECT * INTO v_new_coguide_fp FROM public.faculty_profiles WHERE user_id = p_new_co_guide_id FOR UPDATE;
    ELSE
        SELECT * INTO v_new_coguide_fp FROM public.faculty_profiles WHERE user_id = p_new_co_guide_id FOR UPDATE;
        SELECT * INTO v_new_guide_fp FROM public.faculty_profiles WHERE user_id = p_new_guide_id FOR UPDATE;
    END IF;

    IF v_new_guide_fp.user_id IS NULL OR v_new_coguide_fp.user_id IS NULL THEN
        RAISE EXCEPTION 'Faculty profile not found for new supervisor(s).' USING ERRCODE = 'P0002';
    END IF;

    -- 6. Tenancy & Availability
    IF v_new_guide_fp.department_id != v_thesis.department_id OR v_new_coguide_fp.department_id != v_thesis.department_id THEN
        RAISE EXCEPTION 'Forbidden: New supervisors must belong to the candidate''s department.' USING ERRCODE = '42501';
    END IF;

    SELECT is_active INTO v_guide_active FROM public.users WHERE id = p_new_guide_id;
    SELECT is_active INTO v_coguide_active FROM public.users WHERE id = p_new_co_guide_id;

    IF v_guide_active IS NOT TRUE OR v_coguide_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Selected supervisor is inactive.' USING ERRCODE = '23514';
    END IF;
    IF v_new_guide_fp.is_available IS NOT TRUE OR v_new_coguide_fp.is_available IS NOT TRUE THEN
        RAISE EXCEPTION 'Validation failed: Selected supervisor is marked unavailable.' USING ERRCODE = '23514';
    END IF;

    -- 7. Capacity Checks on New Faculty (Allow if re-assigning same role to same faculty)
    IF p_new_guide_id != v_old_guide_id AND v_new_guide_fp.active_guide_load >= 3 THEN
        RAISE EXCEPTION 'SUPERVISOR_CAPACITY_BREACH: New Primary Guide has reached maximum capacity load of 3.' USING ERRCODE = '23514';
    END IF;
    IF p_new_co_guide_id != v_old_co_guide_id AND v_new_coguide_fp.active_coguide_load >= 3 THEN
        RAISE EXCEPTION 'SUPERVISOR_CAPACITY_BREACH: New Co-Guide has reached maximum capacity load of 3.' USING ERRCODE = '23514';
    END IF;

    -- 8. Record WORM History in guide_allocation_history
    INSERT INTO public.guide_allocation_history (
        thesis_id,
        previous_guide_id,
        previous_co_guide_id,
        new_guide_id,
        new_co_guide_id,
        action_by_dhod_id,
        justification,
        reallocated_at
    )
    VALUES (
        p_thesis_id,
        v_old_guide_id,
        v_old_co_guide_id,
        p_new_guide_id,
        p_new_co_guide_id,
        v_caller_id,
        p_justification,
        clock_timestamp()
    )
    RETURNING id INTO v_history_id;

    -- 9. Update guide_allocations (triggers trg_sync_supervisors_after_alloc to recalculate all loads)
    UPDATE public.guide_allocations
    SET guide_id = p_new_guide_id,
        co_guide_id = p_new_co_guide_id,
        allocated_by_dhod_id = v_caller_id,
        allocated_at = clock_timestamp()
    WHERE thesis_id = p_thesis_id;

    -- 10. Record WORM Audit Event
    INSERT INTO public.audit_events (
        actor_user_id,
        active_role_id,
        action_code,
        target_entity_type,
        target_entity_id,
        previous_state,
        new_state,
        justification,
        client_ip,
        user_agent,
        correlation_id,
        timestamp_utc
    )
    VALUES (
        v_caller_id,
        'DHOD',
        'SUPERVISOR_REALLOCATED',
        'THESIS',
        p_thesis_id,
        jsonb_build_object(
            'previous_guide_id', v_old_guide_id,
            'previous_co_guide_id', v_old_co_guide_id
        ),
        jsonb_build_object(
            'new_guide_id', p_new_guide_id,
            'new_co_guide_id', p_new_co_guide_id,
            'reallocation_history_id', v_history_id
        ),
        p_justification,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 11. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'SUPERVISOR_REALLOCATED',
        'THESIS',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'previous_guide_id', v_old_guide_id,
            'previous_co_guide_id', v_old_co_guide_id,
            'new_guide_id', p_new_guide_id,
            'new_co_guide_id', p_new_co_guide_id,
            'justification', p_justification
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 12. Create In-App Notification Message & Deliveries
    INSERT INTO public.notification_messages (
        event_id,
        category,
        priority,
        title,
        summary,
        action_url,
        created_at
    )
    VALUES (
        v_academic_event_id,
        'ALLOCATION',
        'HIGH',
        'Supervisor Reallocated: ' || v_thesis.tracking_number,
        'Supervisors have been reallocated for dissertation ' || v_thesis.tracking_number || '. Justification: ' || p_justification,
        '/app/student/dissertation',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    -- Deliveries: Student, New Guide, New Co-Guide, Old Guide, Old Co-Guide
    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES
        (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, p_new_guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, p_new_co_guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, v_old_guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, v_old_co_guide_id, 'IN_APP', 'PENDING', clock_timestamp())
    ON CONFLICT DO NOTHING;

    -- 13. Return JSON Payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'history_id', v_history_id,
        'thesis_id', p_thesis_id,
        'previous_guide_id', v_old_guide_id,
        'previous_co_guide_id', v_old_co_guide_id,
        'new_guide_id', p_new_guide_id,
        'new_co_guide_id', p_new_co_guide_id,
        'justification', p_justification,
        'reallocated_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 5. Grants & Security Hardening
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_dhod_allocation_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dhod_allocation_queue() TO authenticated;

REVOKE ALL ON FUNCTION public.get_department_faculty_alloc_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_department_faculty_alloc_options() TO authenticated;

REVOKE ALL ON FUNCTION public.allocate_thesis_supervisors(UUID, UUID, UUID, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.allocate_thesis_supervisors(UUID, UUID, UUID, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.reallocate_thesis_supervisors(UUID, UUID, UUID, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reallocate_thesis_supervisors(UUID, UUID, UUID, TEXT, VARCHAR, TEXT) TO authenticated;
