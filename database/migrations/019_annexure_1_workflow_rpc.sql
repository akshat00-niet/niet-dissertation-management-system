-- Migration: 019_annexure_1_workflow_rpc.sql
-- Description: Create hardened atomic submit_annexure_1, save_annexure_1_draft, get_department_faculty_options, check_title_collision, and testing helper RPC functions.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 019 - Hardened Security Boundary

-- ============================================================================
-- 1. Helper Function: get_department_faculty_options
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_department_faculty_options(p_department_id UUID)
RETURNS TABLE (
    user_id UUID,
    full_name VARCHAR(255),
    designation VARCHAR(128),
    department_code VARCHAR(32),
    is_available BOOLEAN,
    active_guide_load INT,
    active_coguide_load INT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
    SELECT
        fp.user_id,
        u.full_name,
        fp.designation,
        d.code AS department_code,
        fp.is_available,
        fp.active_guide_load,
        fp.active_coguide_load
    FROM public.faculty_profiles fp
    JOIN public.users u ON u.id = fp.user_id
    JOIN public.departments d ON d.id = fp.department_id
    WHERE fp.department_id = p_department_id
      AND fp.is_available = TRUE
      AND u.is_active = TRUE
    ORDER BY u.full_name ASC;
$$;

-- ============================================================================
-- 2. Helper Function: check_title_collision
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_title_collision(
    p_title TEXT,
    p_exclude_thesis_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_normalized TEXT;
    v_exists BOOLEAN;
BEGIN
    IF p_title IS NULL OR trim(p_title) = '' THEN
        RETURN FALSE;
    END IF;

    v_normalized := lower(regexp_replace(trim(p_title), '\s+', ' ', 'g'));

    SELECT EXISTS (
        SELECT 1
        FROM public.thesis_titles tt
        JOIN public.theses t ON t.id = tt.thesis_id
        WHERE tt.normalized_title = v_normalized
          AND (p_exclude_thesis_id IS NULL OR tt.thesis_id != p_exclude_thesis_id)
          AND t.current_state NOT IN ('ARCHIVED', 'PROPOSAL_REJECTED_TERMINAL')
    ) INTO v_exists;

    RETURN v_exists;
END;
$$;

-- ============================================================================
-- 3. Atomic Function: save_annexure_1_draft
-- ============================================================================
CREATE OR REPLACE FUNCTION public.save_annexure_1_draft(
    p_thesis_id UUID,
    p_proposed_title TEXT,
    p_broad_domain VARCHAR(255),
    p_problem_statement TEXT,
    p_expected_outcomes TEXT,
    p_preferences JSONB DEFAULT '[]'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id UUID;
    v_student_eligible BOOLEAN;
    v_thesis RECORD;
    v_annexure_1_id UUID;
    v_pref RECORD;
BEGIN
    -- 1. Resolve and verify authenticated caller
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify caller is an eligible student
    SELECT is_eligible INTO v_student_eligible
    FROM public.student_profiles
    WHERE user_id = v_student_id;

    IF NOT FOUND OR v_student_eligible IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: Caller is not an eligible student candidate.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate thesis ownership and current state
    SELECT id, department_id, current_state
    INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id AND student_id = v_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis not found or not owned by authenticated student.' USING ERRCODE = 'P0002';
    END IF;

    IF v_thesis.current_state NOT IN ('DRAFT_PROPOSAL', 'ANNEXURE_1_REVISION', 'TOPIC_SUBMITTED', 'DRAFT') THEN
        RAISE EXCEPTION 'InvalidState: Cannot save draft when thesis is in state %.', v_thesis.current_state USING ERRCODE = '22023';
    END IF;

    -- 4. Upsert Annexure 1 record in DRAFT status
    INSERT INTO public.annexure_1_submissions (
        thesis_id,
        proposed_title,
        broad_domain,
        problem_statement,
        expected_outcomes,
        status,
        submitted_at
    ) VALUES (
        p_thesis_id,
        COALESCE(p_proposed_title, ''),
        COALESCE(p_broad_domain, ''),
        COALESCE(p_problem_statement, ''),
        COALESCE(p_expected_outcomes, ''),
        'DRAFT',
        clock_timestamp()
    )
    ON CONFLICT (thesis_id) DO UPDATE SET
        proposed_title = EXCLUDED.proposed_title,
        broad_domain = EXCLUDED.broad_domain,
        problem_statement = EXCLUDED.problem_statement,
        expected_outcomes = EXCLUDED.expected_outcomes,
        status = 'DRAFT'
    RETURNING id INTO v_annexure_1_id;

    -- 5. Update thesis_titles if proposed_title is provided
    IF p_proposed_title IS NOT NULL AND trim(p_proposed_title) != '' THEN
        INSERT INTO public.thesis_titles (
            thesis_id,
            proposed_title,
            normalized_title,
            is_approved
        ) VALUES (
            p_thesis_id,
            p_proposed_title,
            lower(regexp_replace(trim(p_proposed_title), '\s+', ' ', 'g')),
            FALSE
        )
        ON CONFLICT (thesis_id) DO UPDATE SET
            proposed_title = EXCLUDED.proposed_title;
    END IF;

    -- 6. Replace Guide Preferences if provided (validating faculty department if non-empty)
    IF p_preferences IS NOT NULL AND jsonb_typeof(p_preferences) = 'array' THEN
        DELETE FROM public.guide_preferences WHERE annexure_1_id = v_annexure_1_id;

        FOR v_pref IN SELECT * FROM jsonb_to_recordset(p_preferences) AS x(
            faculty_id UUID,
            preference_rank INT,
            domain_justification TEXT
        )
        LOOP
            IF v_pref.faculty_id IS NOT NULL AND v_pref.preference_rank BETWEEN 1 AND 4 THEN
                -- Verify faculty belongs to the thesis department
                IF EXISTS (
                    SELECT 1 FROM public.faculty_profiles
                    WHERE user_id = v_pref.faculty_id AND department_id = v_thesis.department_id
                ) THEN
                    INSERT INTO public.guide_preferences (
                        annexure_1_id,
                        preference_rank,
                        faculty_id,
                        domain_justification
                    ) VALUES (
                        v_annexure_1_id,
                        v_pref.preference_rank,
                        v_pref.faculty_id,
                        v_pref.domain_justification
                    );
                END IF;
            END IF;
        END LOOP;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'annexure_1_id', v_annexure_1_id,
        'status', 'DRAFT'
    );
END;
$$;

-- ============================================================================
-- 4. Atomic Function: submit_annexure_1
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_annexure_1(
    p_thesis_id UUID,
    p_proposed_title TEXT,
    p_broad_domain VARCHAR(255),
    p_problem_statement TEXT,
    p_expected_outcomes TEXT,
    p_preferences JSONB,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_student_id UUID;
    v_student_eligible BOOLEAN;
    v_thesis RECORD;
    v_annexure_1_id UUID;
    v_pref RECORD;
    v_pref_count INT;
    v_distinct_faculty_count INT;
    v_distinct_ranks_count INT;
    v_valid_dept_faculty_count INT;
    v_event_id UUID;
    v_msg_id UUID;
    v_dc_user_id UUID;
BEGIN
    -- 1. Resolve and verify authenticated caller
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify caller is an eligible student
    SELECT is_eligible INTO v_student_eligible
    FROM public.student_profiles
    WHERE user_id = v_student_id;

    IF NOT FOUND OR v_student_eligible IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: Caller is not an eligible student candidate.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate thesis ownership and state boundary
    SELECT id, tracking_number, department_id, current_state
    INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id AND student_id = v_student_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found or not owned by authenticated student.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    IF v_thesis.current_state NOT IN ('DRAFT_PROPOSAL', 'ANNEXURE_1_REVISION', 'TOPIC_SUBMITTED', 'DRAFT') THEN
        RAISE EXCEPTION 'InvalidState: Cannot submit Annexure 1 when thesis is in state %.', v_thesis.current_state USING ERRCODE = '22023';
    END IF;

    -- 4. Validate required input text fields
    IF trim(COALESCE(p_proposed_title, '')) = '' THEN
        RAISE EXCEPTION 'Validation: Proposed thesis title is required.' USING ERRCODE = '22023';
    END IF;
    IF length(trim(p_proposed_title)) < 5 THEN
        RAISE EXCEPTION 'Validation: Proposed thesis title must be at least 5 characters.' USING ERRCODE = '22023';
    END IF;
    IF trim(COALESCE(p_broad_domain, '')) = '' THEN
        RAISE EXCEPTION 'Validation: Broad research domain is required.' USING ERRCODE = '22023';
    END IF;
    IF trim(COALESCE(p_problem_statement, '')) = '' OR length(trim(p_problem_statement)) < 20 THEN
        RAISE EXCEPTION 'Validation: Problem statement must be at least 20 characters.' USING ERRCODE = '22023';
    END IF;
    IF trim(COALESCE(p_expected_outcomes, '')) = '' OR length(trim(p_expected_outcomes)) < 10 THEN
        RAISE EXCEPTION 'Validation: Expected outcomes must be at least 10 characters.' USING ERRCODE = '22023';
    END IF;

    -- 5. Title Collision Verification (cannot collide with other active theses)
    IF public.check_title_collision(p_proposed_title, p_thesis_id) THEN
        RAISE EXCEPTION 'Conflict: The proposed dissertation title is already registered by another active candidate.' USING ERRCODE = '23505';
    END IF;

    -- 6. Validate preferences structure: exactly 4 distinct ranked preferences
    IF p_preferences IS NULL OR jsonb_typeof(p_preferences) != 'array' THEN
        RAISE EXCEPTION 'Validation: Preferences array is required.' USING ERRCODE = '22023';
    END IF;

    SELECT
        count(*),
        count(DISTINCT faculty_id),
        count(DISTINCT preference_rank)
    INTO v_pref_count, v_distinct_faculty_count, v_distinct_ranks_count
    FROM jsonb_to_recordset(p_preferences) AS x(
        faculty_id UUID,
        preference_rank INT,
        domain_justification TEXT
    );

    IF v_pref_count != 4 OR v_distinct_faculty_count != 4 THEN
        RAISE EXCEPTION 'Validation: Exactly four (4) distinct faculty preferences are required.' USING ERRCODE = '22023';
    END IF;

    IF v_distinct_ranks_count != 4 OR EXISTS (
        SELECT 1 FROM jsonb_to_recordset(p_preferences) AS x(preference_rank INT)
        WHERE preference_rank NOT BETWEEN 1 AND 4
    ) THEN
        RAISE EXCEPTION 'Validation: Preference ranks must be distinct integers from 1 to 4.' USING ERRCODE = '22023';
    END IF;

    -- 7. Validate faculty department and availability invariants
    SELECT count(*) INTO v_valid_dept_faculty_count
    FROM jsonb_to_recordset(p_preferences) AS x(faculty_id UUID)
    JOIN public.faculty_profiles fp ON fp.user_id = x.faculty_id
    JOIN public.users u ON u.id = fp.user_id
    WHERE fp.department_id = v_thesis.department_id
      AND fp.is_available = TRUE
      AND u.is_active = TRUE;

    IF v_valid_dept_faculty_count != 4 THEN
        RAISE EXCEPTION 'Validation: All four supervisor preferences must be active, available faculty from your department.' USING ERRCODE = '22023';
    END IF;

    -- 8. Upsert Annexure 1 record in SUBMITTED status
    INSERT INTO public.annexure_1_submissions (
        thesis_id,
        proposed_title,
        broad_domain,
        problem_statement,
        expected_outcomes,
        status,
        submitted_at
    ) VALUES (
        p_thesis_id,
        trim(p_proposed_title),
        trim(p_broad_domain),
        trim(p_problem_statement),
        trim(p_expected_outcomes),
        'SUBMITTED',
        clock_timestamp()
    )
    ON CONFLICT (thesis_id) DO UPDATE SET
        proposed_title = EXCLUDED.proposed_title,
        broad_domain = EXCLUDED.broad_domain,
        problem_statement = EXCLUDED.problem_statement,
        expected_outcomes = EXCLUDED.expected_outcomes,
        status = 'SUBMITTED',
        submitted_at = clock_timestamp()
    RETURNING id INTO v_annexure_1_id;

    -- 9. Upsert thesis title (normalizes title and resets approved title)
    INSERT INTO public.thesis_titles (
        thesis_id,
        proposed_title,
        normalized_title,
        is_approved,
        final_approved_title
    ) VALUES (
        p_thesis_id,
        trim(p_proposed_title),
        lower(regexp_replace(trim(p_proposed_title), '\s+', ' ', 'g')),
        FALSE,
        NULL
    )
    ON CONFLICT (thesis_id) DO UPDATE SET
        proposed_title = EXCLUDED.proposed_title,
        final_approved_title = NULL,
        is_approved = FALSE;

    -- 10. Insert exactly 4 guide preferences
    DELETE FROM public.guide_preferences WHERE annexure_1_id = v_annexure_1_id;

    FOR v_pref IN SELECT * FROM jsonb_to_recordset(p_preferences) AS x(
        faculty_id UUID,
        preference_rank INT,
        domain_justification TEXT
    )
    LOOP
        INSERT INTO public.guide_preferences (
            annexure_1_id,
            preference_rank,
            faculty_id,
            domain_justification
        ) VALUES (
            v_annexure_1_id,
            v_pref.preference_rank,
            v_pref.faculty_id,
            v_pref.domain_justification
        );
    END LOOP;

    -- 11. Transition Thesis aggregate state
    UPDATE public.theses
    SET current_state = 'ANNEXURE_1_SUBMITTED',
        current_stage = 'PROPOSAL_STAGE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 12. Record Immutable Audit Log Entry
    INSERT INTO public.audit_events (
        actor_user_id,
        active_role_id,
        action_code,
        target_entity_type,
        target_entity_id,
        previous_state,
        new_state,
        client_ip,
        user_agent,
        correlation_id
    ) VALUES (
        v_student_id,
        'STUDENT',
        'ANNEXURE_1_SUBMITTED',
        'theses',
        p_thesis_id,
        jsonb_build_object('state', v_thesis.current_state),
        jsonb_build_object('state', 'ANNEXURE_1_SUBMITTED', 'annexure_1_id', v_annexure_1_id),
        p_client_ip,
        p_user_agent,
        gen_random_uuid()
    );

    -- 13. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload
    ) VALUES (
        'ANNEXURE_1_SUBMITTED',
        'theses',
        p_thesis_id,
        v_student_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'department_id', v_thesis.department_id,
            'proposed_title', p_proposed_title
        )
    )
    RETURNING id INTO v_event_id;

    -- 14. Notify Department Coordinator (DC) derived authoritatively from database
    SELECT ura.user_id INTO v_dc_user_id
    FROM public.user_role_assignments ura
    WHERE ura.role_id = 'DC' AND ura.department_id = v_thesis.department_id
    LIMIT 1;

    IF v_dc_user_id IS NOT NULL THEN
        INSERT INTO public.notification_messages (
            event_id,
            category,
            priority,
            title,
            summary,
            action_url
        ) VALUES (
            v_event_id,
            'DCEC_WORKFLOW',
            'NORMAL',
            'New Annexure 1 Proposal Submitted',
            'A candidate has submitted Annexure 1 for dissertation tracking number ' || v_thesis.tracking_number || '.',
            '/app/dc/screening'
        )
        RETURNING id INTO v_msg_id;

        INSERT INTO public.notification_deliveries (
            message_id,
            recipient_user_id,
            channel,
            delivery_status
        ) VALUES (
            v_msg_id,
            v_dc_user_id,
            'IN_APP',
            'PENDING'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'thesis_id', p_thesis_id,
        'tracking_number', v_thesis.tracking_number,
        'current_state', 'ANNEXURE_1_SUBMITTED',
        'annexure_1_id', v_annexure_1_id,
        'submitted_at', clock_timestamp()
    );
END;
$$;

-- ============================================================================
-- 5. Test Helper Function: reset_thesis_for_testing
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_thesis_for_testing(p_thesis_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.theses
    SET current_state = 'DRAFT_PROPOSAL',
        current_stage = 'PROPOSAL_STAGE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    DELETE FROM public.guide_preferences WHERE annexure_1_id IN (
        SELECT id FROM public.annexure_1_submissions WHERE thesis_id = p_thesis_id
    );

    DELETE FROM public.annexure_1_submissions WHERE thesis_id = p_thesis_id;
END;
$$;

-- ============================================================================
-- 6. Test Helper Function: restore_thesis_a_seed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.restore_thesis_a_seed()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.theses
    SET current_state = 'PROPOSAL_APPROVED',
        current_stage = 'STAGE_3_PROGRESS',
        guide_id = '33333333-3333-3333-3333-333333333333',
        co_guide_id = '55555555-5555-5555-5555-555555555555',
        updated_at = clock_timestamp()
    WHERE id = '60000000-0000-0000-0000-000000000001';

    UPDATE public.thesis_titles
    SET proposed_title = 'Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure',
        final_approved_title = 'Deep Learning Based Anomaly Detection for Critical Healthcare IoT Infrastructure',
        normalized_title = 'deep learning based anomaly detection for critical healthcare iot infrastructure',
        is_approved = TRUE
    WHERE thesis_id = '60000000-0000-0000-0000-000000000001';
END;
$$;

-- ============================================================================
-- Explicit Permissions & Execution Hardening
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_department_faculty_options(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_department_faculty_options(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.check_title_collision(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_title_collision(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.save_annexure_1_draft(UUID, TEXT, VARCHAR, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_annexure_1_draft(UUID, TEXT, VARCHAR, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_annexure_1(UUID, TEXT, VARCHAR, TEXT, TEXT, JSONB, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_annexure_1(UUID, TEXT, VARCHAR, TEXT, TEXT, JSONB, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.reset_thesis_for_testing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_thesis_for_testing(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.restore_thesis_a_seed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.restore_thesis_a_seed() TO authenticated;
