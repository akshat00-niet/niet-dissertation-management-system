-- Migration: 026_annexure_6_confidential_evaluation_and_panel_rpc.sql
-- Description: Implement atomic RPCs for Confidential Supervisor Evaluation (Annexure 6) and Oral Defense Panel Constitution.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: Phase 5M Database & RPC Layer

-- ============================================================================
-- 1. RPC: submit_annexure_6_evaluation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_annexure_6_evaluation(
    p_thesis_id UUID,
    p_supervisor_score FLOAT,
    p_regularity_rating VARCHAR(32),
    p_technical_proficiency VARCHAR(32),
    p_rigor_rating VARCHAR(32),
    p_confidential_remarks TEXT,
    p_defense_recommendation VARCHAR(32),
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'PostgreSQL RPC/Vitest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_ann6_id UUID;
    v_event_id UUID;
    v_message_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_hod_id UUID;
    v_valid_ratings TEXT[] := ARRAY['EXEMPLARY', 'PROFICIENT', 'DEVELOPING', 'UNSATISFACTORY'];
    v_valid_recommendations TEXT[] := ARRAY['RECOMMENDED', 'REVISIONS_REQUIRED', 'NOT_RECOMMENDED'];
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.' USING ERRCODE = '28000';
    END IF;

    -- 2. Fetch thesis record with row lock
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis record % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Authorization guard: Only primary Guide of record may submit Annexure 6
    IF v_thesis.guide_id IS NULL OR v_thesis.guide_id != v_caller_id THEN
        RAISE EXCEPTION 'Authorization failed: Only the assigned primary Guide of record can submit Annexure 6 confidential evaluation.' USING ERRCODE = '42501';
    END IF;

    -- 4. Workflow State Guard: Thesis must be in ANNEXURE_6_PENDING
    IF v_thesis.current_state != 'ANNEXURE_6_PENDING' THEN
        RAISE EXCEPTION 'InvalidState: Thesis is in state %, but ANNEXURE_6_PENDING is required to submit Annexure 6.', v_thesis.current_state USING ERRCODE = '22023';
    END IF;

    -- 5. Validate Numerical Score
    IF p_supervisor_score IS NULL OR p_supervisor_score < 0.0 OR p_supervisor_score > 100.0 THEN
        RAISE EXCEPTION 'Validation failed: Supervisor score must be between 0.0 and 100.0 (received %).', p_supervisor_score USING ERRCODE = '23514';
    END IF;

    -- 6. Validate Dimensional Ratings
    IF p_regularity_rating IS NULL OR UPPER(trim(p_regularity_rating)) != ALL(v_valid_ratings) THEN
        RAISE EXCEPTION 'Validation failed: Invalid regularity rating "%". Allowed values: EXEMPLARY, PROFICIENT, DEVELOPING, UNSATISFACTORY.', p_regularity_rating USING ERRCODE = '23514';
    END IF;

    IF p_technical_proficiency IS NULL OR UPPER(trim(p_technical_proficiency)) != ALL(v_valid_ratings) THEN
        RAISE EXCEPTION 'Validation failed: Invalid technical proficiency rating "%". Allowed values: EXEMPLARY, PROFICIENT, DEVELOPING, UNSATISFACTORY.', p_technical_proficiency USING ERRCODE = '23514';
    END IF;

    IF p_rigor_rating IS NULL OR UPPER(trim(p_rigor_rating)) != ALL(v_valid_ratings) THEN
        RAISE EXCEPTION 'Validation failed: Invalid rigor rating "%". Allowed values: EXEMPLARY, PROFICIENT, DEVELOPING, UNSATISFACTORY.', p_rigor_rating USING ERRCODE = '23514';
    END IF;

    -- 7. Validate Defense Recommendation
    IF p_defense_recommendation IS NULL OR UPPER(trim(p_defense_recommendation)) != ALL(v_valid_recommendations) THEN
        RAISE EXCEPTION 'Validation failed: Invalid defense recommendation "%". Allowed values: RECOMMENDED, REVISIONS_REQUIRED, NOT_RECOMMENDED.', p_defense_recommendation USING ERRCODE = '23514';
    END IF;

    -- 8. Validate Confidential Remarks
    IF p_confidential_remarks IS NULL OR length(trim(p_confidential_remarks)) = 0 THEN
        RAISE EXCEPTION 'Validation failed: Confidential appraisal remarks are mandatory.' USING ERRCODE = '23514';
    END IF;

    IF length(p_confidential_remarks) > 4000 THEN
        RAISE EXCEPTION 'Validation failed: Confidential remarks must not exceed 4000 characters.' USING ERRCODE = '23514';
    END IF;

    -- 9. Check for duplicate evaluation (Immutability / Write-Once Guard)
    IF EXISTS (SELECT 1 FROM public.annexure_6_evaluations WHERE thesis_id = p_thesis_id) THEN
        RAISE EXCEPTION 'Conflict: Annexure 6 evaluation has already been submitted for this thesis and cannot be overwritten.' USING ERRCODE = '23505';
    END IF;

    -- 10. Insert into annexure_6_evaluations
    INSERT INTO public.annexure_6_evaluations (
        thesis_id,
        guide_id,
        supervisor_score,
        regularity_rating,
        technical_proficiency,
        rigor_rating,
        confidential_remarks,
        defense_recommendation,
        submitted_at
    )
    VALUES (
        p_thesis_id,
        v_caller_id,
        p_supervisor_score,
        UPPER(trim(p_regularity_rating)),
        UPPER(trim(p_technical_proficiency)),
        UPPER(trim(p_rigor_rating)),
        trim(p_confidential_remarks),
        UPPER(trim(p_defense_recommendation)),
        clock_timestamp()
    )
    RETURNING id INTO v_ann6_id;

    -- 11. Atomically advance Thesis state to DEFENSE_PANEL_CONSTITUTED
    UPDATE public.theses
    SET current_state = 'DEFENSE_PANEL_CONSTITUTED',
        current_stage = 'CONFIDENTIAL_EVALUATION_STAGE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 12. Record Legal Compliance Audit Event
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
        'GUIDE',
        'ANNEXURE_6_SUBMITTED',
        'ANNEXURE_6',
        v_ann6_id,
        jsonb_build_object('current_state', 'ANNEXURE_6_PENDING'),
        jsonb_build_object(
            'current_state', 'DEFENSE_PANEL_CONSTITUTED',
            'annexure_6_id', v_ann6_id,
            'supervisor_score', p_supervisor_score,
            'defense_recommendation', UPPER(trim(p_defense_recommendation))
        ),
        'Primary Guide submitted confidential Annexure 6 evaluation and recommendation.',
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 13. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'ANNEXURE_6_SUBMITTED',
        'theses',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'annexure_6_id', v_ann6_id,
            'defense_recommendation', UPPER(trim(p_defense_recommendation)),
            'submitted_at', clock_timestamp()
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_event_id;

    -- 14. Dispatch Confidential Notifications (HOD / DC only - ZERO student notification)
    SELECT u.id INTO v_hod_id
    FROM public.users u
    JOIN public.faculty_profiles fp ON fp.user_id = u.id
    JOIN public.user_role_assignments ura ON ura.user_id = u.id
    WHERE fp.department_id = v_thesis.department_id
      AND ura.role_id = 'HOD'
    LIMIT 1;

    IF v_hod_id IS NOT NULL THEN
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
            v_event_id,
            'EVALUATION',
            'NORMAL',
            'Annexure 6 Confidential Evaluation Submitted',
            'Primary Guide has submitted confidential supervisor evaluation for Thesis ' || COALESCE(v_thesis.tracking_number, p_thesis_id::text) || '. Defense panel appointment is now pending.',
            '/app/department/defense-panels/' || p_thesis_id,
            clock_timestamp()
        )
        RETURNING id INTO v_message_id;

        INSERT INTO public.notification_deliveries (
            message_id,
            recipient_user_id,
            channel,
            delivery_status,
            created_at
        )
        VALUES (
            v_message_id,
            v_hod_id,
            'IN_APP',
            'PENDING',
            clock_timestamp()
        );
    END IF;

    -- 15. Return structured JSONB response
    RETURN jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'annexure_6_id', v_ann6_id,
            'thesis_id', p_thesis_id,
            'supervisor_score', p_supervisor_score,
            'regularity_rating', UPPER(trim(p_regularity_rating)),
            'technical_proficiency', UPPER(trim(p_technical_proficiency)),
            'rigor_rating', UPPER(trim(p_rigor_rating)),
            'defense_recommendation', UPPER(trim(p_defense_recommendation)),
            'new_state', 'DEFENSE_PANEL_CONSTITUTED',
            'submitted_at', clock_timestamp()
        ),
        'message', 'Annexure 6 confidential supervisor evaluation successfully submitted.'
    );
END;
$$;


-- ============================================================================
-- 2. RPC: get_annexure_6_docket
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_annexure_6_docket(
    p_thesis_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_ann6 RECORD;
    v_is_guide BOOLEAN := FALSE;
    v_is_hod_or_chair BOOLEAN := FALSE;
    v_is_panel_member BOOLEAN := FALSE;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.' USING ERRCODE = '28000';
    END IF;

    -- 2. Fetch thesis record
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis record % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Strict Student Lockout (Security Invariant INV-ANN6-01)
    IF v_thesis.student_id = v_caller_id OR public.has_role('STUDENT') THEN
        RAISE EXCEPTION 'Authorization failed: Student candidates are strictly blocked from accessing Annexure 6 confidential evaluation.' USING ERRCODE = '42501';
    END IF;

    -- 4. Check Guide binding
    IF v_thesis.guide_id = v_caller_id THEN
        v_is_guide := TRUE;
    END IF;

    -- 5. Check Department HOD / DCEC Chair authority
    IF (v_thesis.department_id = public.jwt_dept_id() AND public.has_role('HOD', 'DCEC_CHAIR')) THEN
        v_is_hod_or_chair := TRUE;
    END IF;

    -- 6. Check Panel Member assignment
    IF public.is_assigned_panel_member(p_thesis_id) THEN
        v_is_panel_member := TRUE;
    END IF;

    -- 7. Multi-Layer Authorization Gate
    IF NOT (v_is_guide OR v_is_hod_or_chair OR v_is_panel_member) THEN
        RAISE EXCEPTION 'Authorization failed: You do not have permission to view confidential Annexure 6 evaluation for this thesis.' USING ERRCODE = '42501';
    END IF;

    -- 8. Fetch Annexure 6 record
    SELECT * INTO v_ann6
    FROM public.annexure_6_evaluations
    WHERE thesis_id = p_thesis_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'data', jsonb_build_object(
                'thesis_id', p_thesis_id,
                'tracking_number', v_thesis.tracking_number,
                'current_state', v_thesis.current_state,
                'is_submitted', FALSE,
                'evaluation', NULL
            ),
            'message', 'Annexure 6 evaluation is pending submission.'
        );
    END IF;

    -- 9. Return Full Confidential Dossier
    RETURN jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'current_state', v_thesis.current_state,
            'is_submitted', TRUE,
            'evaluation', jsonb_build_object(
                'id', v_ann6.id,
                'guide_id', v_ann6.guide_id,
                'supervisor_score', v_ann6.supervisor_score,
                'regularity_rating', v_ann6.regularity_rating,
                'technical_proficiency', v_ann6.technical_proficiency,
                'rigor_rating', v_ann6.rigor_rating,
                'confidential_remarks', v_ann6.confidential_remarks,
                'defense_recommendation', v_ann6.defense_recommendation,
                'submitted_at', v_ann6.submitted_at
            )
        ),
        'message', 'Annexure 6 evaluation retrieved successfully.'
    );
END;
$$;


-- ============================================================================
-- 3. RPC: constitute_defense_panel
-- ============================================================================
CREATE OR REPLACE FUNCTION public.constitute_defense_panel(
    p_thesis_id UUID,
    p_member_1_faculty_id UUID,
    p_member_2_faculty_id UUID,
    p_chair_faculty_id UUID,
    p_scheduled_at TIMESTAMPTZ,
    p_venue_or_link TEXT,
    p_rubric_version_id UUID DEFAULT NULL,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'PostgreSQL RPC/Vitest'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_m1_profile RECORD;
    v_m2_profile RECORD;
    v_rubric_ver_id UUID := p_rubric_version_id;
    v_viva_defense_id UUID;
    v_defense_panel_id UUID;
    v_m1_assign_id UUID;
    v_m2_assign_id UUID;
    v_event_id UUID;
    v_msg_panel_id UUID;
    v_msg_student_id UUID;
    v_correlation_id UUID := gen_random_uuid();
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.' USING ERRCODE = '28000';
    END IF;

    -- 2. Fetch thesis with lock
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis record % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Department Tenancy & RBAC Guard: Caller must be HOD or DC in the candidate's department
    IF v_thesis.department_id != public.jwt_dept_id() OR NOT public.has_role('HOD', 'DC') THEN
        RAISE EXCEPTION 'Authorization failed: Only the HOD or DC of the candidate''s department can constitute a defense panel.' USING ERRCODE = '42501';
    END IF;

    -- 4. Workflow State Guard: Thesis must be in DEFENSE_PANEL_CONSTITUTED
    IF v_thesis.current_state != 'DEFENSE_PANEL_CONSTITUTED' THEN
        RAISE EXCEPTION 'InvalidState: Thesis is in state %, but DEFENSE_PANEL_CONSTITUTED is required to constitute defense panel.', v_thesis.current_state USING ERRCODE = '22023';
    END IF;

    -- 5. Panel Size Invariant: Exactly 2 distinct members required
    IF p_member_1_faculty_id IS NULL OR p_member_2_faculty_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Exactly two panel member faculty IDs are required.' USING ERRCODE = '23514';
    END IF;

    IF p_member_1_faculty_id = p_member_2_faculty_id THEN
        RAISE EXCEPTION 'Validation failed: Panel members must be two distinct faculty members.' USING ERRCODE = '23514';
    END IF;

    -- 6. Panel Chair Invariant: Exactly 1 chair, and chair must be member 1 or member 2
    IF p_chair_faculty_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: A panel chair must be designated.' USING ERRCODE = '23514';
    END IF;

    IF p_chair_faculty_id != p_member_1_faculty_id AND p_chair_faculty_id != p_member_2_faculty_id THEN
        RAISE EXCEPTION 'Validation failed: Designated panel chair must be one of the two appointed panel members.' USING ERRCODE = '23514';
    END IF;

    -- 7. Conflict-of-Interest Guards: Neither Guide nor Co-Guide may be on the panel
    IF v_thesis.guide_id IS NOT NULL AND (p_member_1_faculty_id = v_thesis.guide_id OR p_member_2_faculty_id = v_thesis.guide_id) THEN
        RAISE EXCEPTION 'Conflict: The primary Guide cannot be appointed as an oral defense panel member for their own student.' USING ERRCODE = '23514';
    END IF;

    IF v_thesis.co_guide_id IS NOT NULL AND (p_member_1_faculty_id = v_thesis.co_guide_id OR p_member_2_faculty_id = v_thesis.co_guide_id) THEN
        RAISE EXCEPTION 'Conflict: The Co-Guide cannot be appointed as an oral defense panel member for their own student.' USING ERRCODE = '23514';
    END IF;

    -- 8. Verify faculty existence and department eligibility
    SELECT * INTO v_m1_profile
    FROM public.faculty_profiles
    WHERE user_id = p_member_1_faculty_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Faculty profile for Member 1 (%) not found.', p_member_1_faculty_id USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_m2_profile
    FROM public.faculty_profiles
    WHERE user_id = p_member_2_faculty_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Faculty profile for Member 2 (%) not found.', p_member_2_faculty_id USING ERRCODE = 'P0002';
    END IF;

    -- Department Tenancy: Panel members must belong to the department (or approved interdisciplinary)
    IF v_m1_profile.department_id != v_thesis.department_id THEN
        RAISE EXCEPTION 'Validation failed: Member 1 faculty does not belong to the candidate''s department.' USING ERRCODE = '23514';
    END IF;

    IF v_m2_profile.department_id != v_thesis.department_id THEN
        RAISE EXCEPTION 'Validation failed: Member 2 faculty does not belong to the candidate''s department.' USING ERRCODE = '23514';
    END IF;

    -- 9. Schedule Validation
    IF p_scheduled_at IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Oral defense schedule timestamp is mandatory.' USING ERRCODE = '23514';
    END IF;

    IF p_venue_or_link IS NULL OR length(trim(p_venue_or_link)) = 0 THEN
        RAISE EXCEPTION 'Validation failed: Defense venue or online meeting link is mandatory.' USING ERRCODE = '23514';
    END IF;

    -- 10. Rubric Version Resolution
    IF v_rubric_ver_id IS NULL THEN
        -- Resolve published FINAL_VIVA rubric version for this department
        SELECT rv.id INTO v_rubric_ver_id
        FROM public.rubric_versions rv
        JOIN public.rubrics r ON r.id = rv.rubric_id
        WHERE r.department_id = v_thesis.department_id
          AND r.milestone_type = 'FINAL_VIVA'
          AND rv.is_published = TRUE
        ORDER BY rv.version_number DESC
        LIMIT 1;

        -- Fallback: Any published rubric version for department
        IF v_rubric_ver_id IS NULL THEN
            SELECT rv.id INTO v_rubric_ver_id
            FROM public.rubric_versions rv
            JOIN public.rubrics r ON r.id = rv.rubric_id
            WHERE r.department_id = v_thesis.department_id
              AND rv.is_published = TRUE
            ORDER BY rv.version_number DESC
            LIMIT 1;
        END IF;

        -- Fallback: Any published rubric version in system
        IF v_rubric_ver_id IS NULL THEN
            SELECT rv.id INTO v_rubric_ver_id
            FROM public.rubric_versions rv
            WHERE rv.is_published = TRUE
            ORDER BY rv.version_number DESC
            LIMIT 1;
        END IF;

        IF v_rubric_ver_id IS NULL THEN
            RAISE EXCEPTION 'ConfigurationError: No published evaluation rubric version found for viva defense.' USING ERRCODE = '23514';
        END IF;
    ELSE
        -- Validate provided rubric version exists and is published
        IF NOT EXISTS (SELECT 1 FROM public.rubric_versions WHERE id = v_rubric_ver_id AND is_published = TRUE) THEN
            RAISE EXCEPTION 'Validation failed: Rubric version % does not exist or is not published.', v_rubric_ver_id USING ERRCODE = '23514';
        END IF;
    END IF;

    -- 11. Duplicate Panel Guard
    IF EXISTS (SELECT 1 FROM public.viva_defenses WHERE thesis_id = p_thesis_id AND defense_cycle_index = 1) THEN
        RAISE EXCEPTION 'Conflict: Oral defense session and panel already constituted for Cycle 1 of this thesis.' USING ERRCODE = '23505';
    END IF;

    -- ========================================================================
    -- ATOMIC TRANSACTION EXECUTION
    -- ========================================================================

    -- A. Insert viva_defenses
    INSERT INTO public.viva_defenses (
        thesis_id,
        defense_cycle_index,
        rubric_version_id,
        composite_score,
        outcome,
        panel_summary,
        scheduled_at,
        conducted_at
    )
    VALUES (
        p_thesis_id,
        1,
        v_rubric_ver_id,
        NULL,
        'SCHEDULED',
        trim(p_venue_or_link),
        p_scheduled_at,
        NULL
    )
    RETURNING id INTO v_viva_defense_id;

    -- B. Insert defense_panels
    INSERT INTO public.defense_panels (
        viva_defense_id,
        constituted_by_hod_id,
        constituted_at
    )
    VALUES (
        v_viva_defense_id,
        v_caller_id,
        clock_timestamp()
    )
    RETURNING id INTO v_defense_panel_id;

    -- C. Insert Member 1 Assignment
    INSERT INTO public.panel_member_assignments (
        panel_id,
        faculty_id,
        evaluator_role,
        is_panel_chair
    )
    VALUES (
        v_defense_panel_id,
        p_member_1_faculty_id,
        'INTERNAL_EXPERT',
        (p_member_1_faculty_id = p_chair_faculty_id)
    )
    RETURNING id INTO v_m1_assign_id;

    -- D. Insert Member 2 Assignment
    INSERT INTO public.panel_member_assignments (
        panel_id,
        faculty_id,
        evaluator_role,
        is_panel_chair
    )
    VALUES (
        v_defense_panel_id,
        p_member_2_faculty_id,
        'INTERNAL_EXPERT',
        (p_member_2_faculty_id = p_chair_faculty_id)
    )
    RETURNING id INTO v_m2_assign_id;

    -- E. Advance Thesis State to VIVA_DEFENSE_SCHEDULED (Stage: VIVA_DEFENSE_STAGE)
    UPDATE public.theses
    SET current_state = 'VIVA_DEFENSE_SCHEDULED',
        current_stage = 'VIVA_DEFENSE_STAGE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- F. Record Audit Event
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
        CASE WHEN public.has_role('HOD') THEN 'HOD' ELSE 'DC' END,
        'DEFENSE_PANEL_APPOINTED',
        'DEFENSE_PANEL',
        v_defense_panel_id,
        jsonb_build_object('current_state', 'DEFENSE_PANEL_CONSTITUTED'),
        jsonb_build_object(
            'current_state', 'VIVA_DEFENSE_SCHEDULED',
            'viva_defense_id', v_viva_defense_id,
            'defense_panel_id', v_defense_panel_id,
            'member_1_id', p_member_1_faculty_id,
            'member_2_id', p_member_2_faculty_id,
            'chair_id', p_chair_faculty_id,
            'scheduled_at', p_scheduled_at,
            'venue', p_venue_or_link
        ),
        'Department constituted 2-member expert oral defense panel and scheduled viva defense.',
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- G. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'DEFENSE_PANEL_APPOINTED',
        'theses',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'viva_defense_id', v_viva_defense_id,
            'defense_panel_id', v_defense_panel_id,
            'chair_id', p_chair_faculty_id,
            'scheduled_at', p_scheduled_at
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_event_id;

    -- H. Notifications to Appointed Panel Members
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
        v_event_id,
        'DEFENSE',
        'HIGH',
        'Appointed as Oral Defense Panel Examiner',
        'You have been appointed as an expert examiner for the dissertation viva defense of Thesis ' || COALESCE(v_thesis.tracking_number, p_thesis_id::text) || ' scheduled on ' || to_char(p_scheduled_at, 'YYYY-MM-DD HH24:MI') || '.',
        '/app/panel/assignments/' || v_viva_defense_id,
        clock_timestamp()
    )
    RETURNING id INTO v_msg_panel_id;

    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES
        (v_msg_panel_id, p_member_1_faculty_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_msg_panel_id, p_member_2_faculty_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- I. Notification to Student & Supervisors (Defense Scheduled - Public details only)
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
        v_event_id,
        'DEFENSE',
        'URGENT',
        'Oral Viva Defense Scheduled',
        'Final oral viva defense has been scheduled for ' || to_char(p_scheduled_at, 'YYYY-MM-DD HH24:MI') || ' at ' || p_venue_or_link || '.',
        '/app/student/viva/' || v_viva_defense_id,
        clock_timestamp()
    )
    RETURNING id INTO v_msg_student_id;

    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES
        (v_msg_student_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_msg_student_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());

    IF v_thesis.co_guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_msg_student_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- J. Structured Return
    RETURN jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'viva_defense_id', v_viva_defense_id,
            'defense_panel_id', v_defense_panel_id,
            'thesis_id', p_thesis_id,
            'member_1_assignment_id', v_m1_assign_id,
            'member_2_assignment_id', v_m2_assign_id,
            'member_1_faculty_id', p_member_1_faculty_id,
            'member_2_faculty_id', p_member_2_faculty_id,
            'chair_faculty_id', p_chair_faculty_id,
            'scheduled_at', p_scheduled_at,
            'venue_or_link', p_venue_or_link,
            'rubric_version_id', v_rubric_ver_id,
            'new_state', 'VIVA_DEFENSE_SCHEDULED',
            'new_stage', 'VIVA_DEFENSE_STAGE'
        ),
        'message', 'Oral defense panel constituted and viva session successfully scheduled.'
    );
END;
$$;


-- ============================================================================
-- 4. RPC: get_defense_panel_details
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_defense_panel_details(
    p_thesis_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_viva RECORD;
    v_panel RECORD;
    v_members JSONB;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.' USING ERRCODE = '28000';
    END IF;

    -- 2. Fetch thesis
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis record % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Tenancy & Role Gate
    IF NOT (
        v_thesis.student_id = v_caller_id
        OR v_thesis.guide_id = v_caller_id
        OR v_thesis.co_guide_id = v_caller_id
        OR (v_thesis.department_id = public.jwt_dept_id() AND public.has_role('HOD', 'DC', 'DCEC_CHAIR'))
        OR public.is_assigned_panel_member(p_thesis_id)
        OR public.has_role('ADMIN')
    ) THEN
        RAISE EXCEPTION 'Authorization failed: You do not have permission to view defense panel details for this thesis.' USING ERRCODE = '42501';
    END IF;

    -- 4. Fetch latest viva defense session
    SELECT * INTO v_viva
    FROM public.viva_defenses
    WHERE thesis_id = p_thesis_id
    ORDER BY defense_cycle_index DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'data', jsonb_build_object(
                'thesis_id', p_thesis_id,
                'is_constituted', FALSE,
                'panel', NULL
            ),
            'message', 'Defense panel has not yet been constituted.'
        );
    END IF;

    -- 5. Fetch defense panel
    SELECT * INTO v_panel
    FROM public.defense_panels
    WHERE viva_defense_id = v_viva.id;

    -- 6. Fetch members with user details
    SELECT jsonb_agg(
        jsonb_build_object(
            'assignment_id', pma.id,
            'faculty_id', pma.faculty_id,
            'faculty_name', u.full_name,
            'faculty_email', u.institutional_email,
            'designation', fp.designation,
            'evaluator_role', pma.evaluator_role,
            'is_panel_chair', pma.is_panel_chair
        )
    ) INTO v_members
    FROM public.panel_member_assignments pma
    JOIN public.users u ON u.id = pma.faculty_id
    JOIN public.faculty_profiles fp ON fp.user_id = pma.faculty_id
    WHERE pma.panel_id = v_panel.id;

    -- 7. Return structured details
    RETURN jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'thesis_id', p_thesis_id,
            'is_constituted', TRUE,
            'viva_defense_id', v_viva.id,
            'defense_cycle_index', v_viva.defense_cycle_index,
            'scheduled_at', v_viva.scheduled_at,
            'conducted_at', v_viva.conducted_at,
            'outcome', v_viva.outcome,
            'venue_or_link', v_viva.panel_summary,
            'panel_id', v_panel.id,
            'constituted_by_hod_id', v_panel.constituted_by_hod_id,
            'constituted_at', v_panel.constituted_at,
            'members', COALESCE(v_members, '[]'::jsonb)
        ),
        'message', 'Defense panel details retrieved successfully.'
    );
END;
$$;


-- ============================================================================
-- 5. RPC: list_department_annexure_6_queue
-- ============================================================================
CREATE OR REPLACE FUNCTION public.list_department_annexure_6_queue(
    p_department_id UUID,
    p_status VARCHAR(32) DEFAULT 'ALL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_theses JSONB;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required: Caller is not authenticated.' USING ERRCODE = '28000';
    END IF;

    -- 2. Authorization guard: HOD, DC, or DCEC Chair of specified department
    IF p_department_id != public.jwt_dept_id() OR NOT public.has_role('HOD', 'DC', 'DCEC_CHAIR', 'ADMIN') THEN
        RAISE EXCEPTION 'Authorization failed: You do not have permission to view the Annexure 6 queue for this department.' USING ERRCODE = '42501';
    END IF;

    -- 3. Query queue items (status-only view for coordination; marks restricted to authorized roles)
    SELECT jsonb_agg(
        jsonb_build_object(
            'thesis_id', t.id,
            'tracking_number', t.tracking_number,
            'student_id', t.student_id,
            'student_name', u_stu.full_name,
            'student_email', u_stu.institutional_email,
            'roll_number', sp.roll_number,
            'guide_id', t.guide_id,
            'guide_name', u_guide.full_name,
            'co_guide_id', t.co_guide_id,
            'co_guide_name', u_cog.full_name,
            'current_state', t.current_state,
            'current_stage', t.current_stage,
            'has_annexure_6', (a6.id IS NOT NULL),
            'annexure_6_submitted_at', a6.submitted_at,
            'defense_recommendation', a6.defense_recommendation,
            'has_defense_panel', (dp.id IS NOT NULL),
            'viva_scheduled_at', vd.scheduled_at
        )
        ORDER BY t.updated_at DESC
    ) INTO v_theses
    FROM public.theses t
    JOIN public.users u_stu ON u_stu.id = t.student_id
    JOIN public.student_profiles sp ON sp.user_id = t.student_id
    LEFT JOIN public.users u_guide ON u_guide.id = t.guide_id
    LEFT JOIN public.users u_cog ON u_cog.id = t.co_guide_id
    LEFT JOIN public.annexure_6_evaluations a6 ON a6.thesis_id = t.id
    LEFT JOIN public.viva_defenses vd ON vd.thesis_id = t.id AND vd.defense_cycle_index = 1
    LEFT JOIN public.defense_panels dp ON dp.viva_defense_id = vd.id
    WHERE t.department_id = p_department_id
      AND (
          (p_status = 'ALL' AND t.current_state IN ('ANNEXURE_6_PENDING', 'DEFENSE_PANEL_CONSTITUTED', 'VIVA_DEFENSE_SCHEDULED'))
          OR (p_status = 'PENDING_EVALUATION' AND t.current_state = 'ANNEXURE_6_PENDING')
          OR (p_status = 'PENDING_PANEL' AND t.current_state = 'DEFENSE_PANEL_CONSTITUTED')
          OR (p_status = 'SCHEDULED' AND t.current_state = 'VIVA_DEFENSE_SCHEDULED')
      );

    RETURN jsonb_build_object(
        'success', TRUE,
        'data', COALESCE(v_theses, '[]'::jsonb),
        'message', 'Department Annexure 6 queue retrieved successfully.'
    );
END;
$$;


-- ============================================================================
-- 6. TEST RESET HELPER: reset_annexure_6_for_testing
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_annexure_6_for_testing(
    p_thesis_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_panel_id UUID;
    v_viva_id UUID;
BEGIN
    SET LOCAL session_replication_role = replica;

    -- Delete panel assignments, panels, viva defenses, and annexure 6 evaluations
    SELECT dp.id, vd.id INTO v_panel_id, v_viva_id
    FROM public.viva_defenses vd
    LEFT JOIN public.defense_panels dp ON dp.viva_defense_id = vd.id
    WHERE vd.thesis_id = p_thesis_id;

    IF v_panel_id IS NOT NULL THEN
        DELETE FROM public.panel_member_assignments WHERE panel_id = v_panel_id;
        DELETE FROM public.defense_panels WHERE id = v_panel_id;
    END IF;

    IF v_viva_id IS NOT NULL THEN
        DELETE FROM public.panel_member_evaluations WHERE viva_defense_id = v_viva_id;
        DELETE FROM public.viva_defenses WHERE id = v_viva_id;
    END IF;

    DELETE FROM public.annexure_6_evaluations WHERE thesis_id = p_thesis_id;

    -- Reset thesis state back to ANNEXURE_6_PENDING
    UPDATE public.theses
    SET current_state = 'ANNEXURE_6_PENDING',
        current_stage = 'CONFIDENTIAL_EVALUATION_STAGE',
        guide_id = COALESCE(guide_id, '33333333-3333-3333-3333-333333333333'::uuid),
        co_guide_id = COALESCE(co_guide_id, '55555555-5555-5555-5555-555555555555'::uuid),
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Annexure 6 and Defense Panel state reset successfully for testing.'
    );
END;
$$;


-- ============================================================================
-- 7. SECURITY HARDENING: Explicit Revocation and Grants
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.submit_annexure_6_evaluation FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_annexure_6_docket FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.constitute_defense_panel FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_defense_panel_details FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_department_annexure_6_queue FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reset_annexure_6_for_testing FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.submit_annexure_6_evaluation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_annexure_6_docket TO authenticated;
GRANT EXECUTE ON FUNCTION public.constitute_defense_panel TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_defense_panel_details TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_department_annexure_6_queue TO authenticated;
GRANT EXECUTE ON FUNCTION public.reset_annexure_6_for_testing TO authenticated;
