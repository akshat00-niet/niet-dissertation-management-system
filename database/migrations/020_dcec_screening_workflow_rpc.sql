-- Migration: 020_dcec_screening_workflow_rpc.sql
-- Description: Implement atomic Department Coordinator (DC) screening and DCEC Chair decision workflow RPCs.
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 020 - DC Screening & DCEC Chair Decision Workflow

-- ============================================================================
-- 1. Helper Function: get_dc_screening_queue
-- Description: Retrieves pending Annexure 1 proposals for the authenticated DC's department.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_dc_screening_queue();
CREATE OR REPLACE FUNCTION public.get_dc_screening_queue()
RETURNS TABLE (
    thesis_id UUID,
    tracking_number VARCHAR(64),
    department_id UUID,
    student_id UUID,
    student_name VARCHAR(255),
    student_roll_number VARCHAR(64),
    proposed_title TEXT,
    broad_domain VARCHAR(255),
    annexure_1_id UUID,
    current_state VARCHAR(64),
    current_stage VARCHAR(64),
    submitted_at TIMESTAMPTZ,
    docket_id UUID,
    is_eligible BOOLEAN,
    documents_complete BOOLEAN,
    dc_verification_notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID;
    v_dept_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- Verify caller holds active DC role in their department
    SELECT ura.department_id INTO v_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_caller_id
      AND ura.role_id = 'DC'
      AND ura.is_active = TRUE
    LIMIT 1;

    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Caller is not an authorized Department Coordinator.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        t.id AS thesis_id,
        t.tracking_number,
        t.department_id,
        t.student_id,
        u.full_name AS student_name,
        sp.roll_number AS student_roll_number,
        a1.proposed_title,
        a1.broad_domain,
        a1.id AS annexure_1_id,
        t.current_state::VARCHAR(64),
        t.current_stage::VARCHAR(64),
        a1.submitted_at,
        dd.id AS docket_id,
        COALESCE(dd.is_eligible, sp.is_eligible) AS is_eligible,
        COALESCE(dd.documents_complete, TRUE) AS documents_complete,
        dd.dc_verification_notes
    FROM public.theses t
    JOIN public.users u ON u.id = t.student_id
    JOIN public.student_profiles sp ON sp.user_id = t.student_id
    LEFT JOIN public.annexure_1_submissions a1 ON a1.thesis_id = t.id
    LEFT JOIN public.dcec_dockets dd ON dd.thesis_id = t.id AND dd.docket_stage = 'ANNEXURE_1_SCREENING'
    WHERE t.department_id = v_dept_id
      AND t.current_state IN ('ANNEXURE_1_SUBMITTED', 'DC_VERIFICATION_QUEUE', 'DCEC_SCREENING_QUEUE')
    ORDER BY a1.submitted_at ASC NULLS LAST;
END;
$$;

-- ============================================================================
-- 2. Helper Function: get_dcec_screening_queue
-- Description: Retrieves dockets queued for DCEC review in the caller's department.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_dcec_screening_queue();
CREATE OR REPLACE FUNCTION public.get_dcec_screening_queue()
RETURNS TABLE (
    docket_id UUID,
    thesis_id UUID,
    tracking_number VARCHAR(64),
    department_id UUID,
    student_id UUID,
    student_name VARCHAR(255),
    student_roll_number VARCHAR(64),
    proposed_title TEXT,
    broad_domain VARCHAR(255),
    problem_statement TEXT,
    expected_outcomes TEXT,
    annexure_1_id UUID,
    current_state VARCHAR(64),
    current_stage VARCHAR(64),
    dc_user_id UUID,
    dc_name VARCHAR(255),
    is_eligible BOOLEAN,
    documents_complete BOOLEAN,
    dc_verification_notes TEXT,
    docket_compiled_at TIMESTAMPTZ,
    decision_id UUID,
    outcome VARCHAR(32),
    formal_remarks TEXT,
    decision_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID;
    v_dept_id UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- Resolve caller department from active HOD, DHOD, DC, or DCEC_MEMBER assignment
    SELECT ura.department_id INTO v_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_caller_id
      AND ura.role_id IN ('HOD', 'DHOD', 'DC', 'DCEC_MEMBER')
      AND ura.is_active = TRUE
    LIMIT 1;

    IF v_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Caller is not an authorized department academic member.' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT
        dd.id AS docket_id,
        t.id AS thesis_id,
        t.tracking_number,
        t.department_id,
        t.student_id,
        u.full_name AS student_name,
        sp.roll_number AS student_roll_number,
        a1.proposed_title,
        a1.broad_domain,
        a1.problem_statement,
        a1.expected_outcomes,
        a1.id AS annexure_1_id,
        t.current_state::VARCHAR(64),
        t.current_stage::VARCHAR(64),
        dd.dc_user_id,
        dc_u.full_name AS dc_name,
        dd.is_eligible,
        dd.documents_complete,
        dd.dc_verification_notes,
        dd.compiled_at AS docket_compiled_at,
        dec.id AS decision_id,
        dec.outcome,
        dec.formal_remarks,
        dec.decision_at
    FROM public.dcec_dockets dd
    JOIN public.theses t ON t.id = dd.thesis_id
    JOIN public.users u ON u.id = t.student_id
    JOIN public.student_profiles sp ON sp.user_id = t.student_id
    JOIN public.users dc_u ON dc_u.id = dd.dc_user_id
    LEFT JOIN public.annexure_1_submissions a1 ON a1.thesis_id = t.id
    LEFT JOIN public.dcec_decisions dec ON dec.docket_id = dd.id
    WHERE t.department_id = v_dept_id
      AND dd.docket_stage = 'ANNEXURE_1_SCREENING'
      AND t.current_state IN ('DCEC_SCREENING_QUEUE', 'APPROVED_FOR_ALLOCATION', 'ANNEXURE_1_REVISION', 'PROPOSAL_REJECTED_TERMINAL')
    ORDER BY dd.compiled_at DESC;
END;
$$;

-- ============================================================================
-- 3. Atomic Function: verify_and_forward_dcec_docket
-- Description: DC Maker verification of candidate eligibility, documents, and forwarding to DCEC Chair.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verify_and_forward_dcec_docket(
    p_thesis_id UUID,
    p_is_eligible BOOLEAN,
    p_documents_complete BOOLEAN,
    p_dc_verification_notes TEXT DEFAULT NULL,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_dc_id UUID;
    v_dc_dept_id UUID;
    v_thesis RECORD;
    v_annexure_1 RECORD;
    v_pref_count INT;
    v_docket_id UUID;
    v_event_id UUID;
    v_msg_id UUID;
    v_chair_user_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_dc_id := auth.uid();
    IF v_dc_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify caller has active DC role in their department
    SELECT ura.department_id INTO v_dc_dept_id
    FROM public.user_role_assignments ura
    WHERE ura.user_id = v_dc_id
      AND ura.role_id = 'DC'
      AND ura.is_active = TRUE
    LIMIT 1;

    IF v_dc_dept_id IS NULL THEN
        RAISE EXCEPTION 'Forbidden: Caller does not possess active Department Coordinator authority.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate thesis existence, department tenancy, and lifecycle state
    SELECT id, tracking_number, department_id, current_state, current_stage
    INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- Tenancy check
    IF v_thesis.department_id != v_dc_dept_id THEN
        RAISE EXCEPTION 'Forbidden: Department Coordinator cannot verify thesis from another department.' USING ERRCODE = '42501';
    END IF;

    -- State guard
    IF v_thesis.current_state NOT IN ('ANNEXURE_1_SUBMITTED', 'DC_VERIFICATION_QUEUE') THEN
        RAISE EXCEPTION 'InvalidState: Thesis % cannot be verified in state %.', v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '22023';
    END IF;

    -- 4. Verify Annexure 1 proposal existence and complete 4 preferences
    SELECT id, proposed_title, status INTO v_annexure_1
    FROM public.annexure_1_submissions
    WHERE thesis_id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Annexure 1 proposal record missing for thesis %.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    SELECT count(*) INTO v_pref_count
    FROM public.guide_preferences
    WHERE annexure_1_id = v_annexure_1.id;

    IF v_pref_count != 4 THEN
        RAISE EXCEPTION 'Validation: Docket verification requires exactly 4 distinct supervisor preferences.' USING ERRCODE = '22023';
    END IF;

    -- 5. Upsert DCEC Docket record
    INSERT INTO public.dcec_dockets (
        thesis_id,
        docket_stage,
        dc_user_id,
        is_eligible,
        documents_complete,
        dc_verification_notes,
        compiled_at
    ) VALUES (
        p_thesis_id,
        'ANNEXURE_1_SCREENING',
        v_dc_id,
        p_is_eligible,
        p_documents_complete,
        p_dc_verification_notes,
        clock_timestamp()
    )
    RETURNING id INTO v_docket_id;

    -- 6. Transition Thesis state to DCEC_SCREENING_QUEUE
    UPDATE public.theses
    SET current_state = 'DCEC_SCREENING_QUEUE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 7. Record Immutable Audit Event
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
        v_dc_id,
        'DC',
        'DCEC_DOCKET_VERIFIED',
        'dcec_dockets',
        v_docket_id,
        jsonb_build_object('state', v_thesis.current_state),
        jsonb_build_object('state', 'DCEC_SCREENING_QUEUE', 'docket_id', v_docket_id, 'is_eligible', p_is_eligible, 'documents_complete', p_documents_complete),
        p_client_ip,
        p_user_agent,
        gen_random_uuid()
    );

    -- 8. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload
    ) VALUES (
        'DCEC_DOCKET_VERIFIED',
        'theses',
        p_thesis_id,
        v_dc_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'docket_id', v_docket_id,
            'tracking_number', v_thesis.tracking_number,
            'department_id', v_thesis.department_id,
            'is_eligible', p_is_eligible,
            'documents_complete', p_documents_complete
        )
    )
    RETURNING id INTO v_event_id;

    -- 9. Notify Department DCEC Chair (HOD or active delegated D.HOD)
    SELECT ura.user_id INTO v_chair_user_id
    FROM public.user_role_assignments ura
    WHERE ura.role_id = 'HOD' AND ura.department_id = v_thesis.department_id AND ura.is_active = TRUE
    LIMIT 1;

    IF v_chair_user_id IS NOT NULL THEN
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
            'Screening Docket Ready for Review',
            'DC has verified Annexure 1 proposal for dissertation ' || v_thesis.tracking_number || '. Ready for DCEC Chair decision.',
            '/app/dcec/screening'
        )
        RETURNING id INTO v_msg_id;

        INSERT INTO public.notification_deliveries (
            message_id,
            recipient_user_id,
            channel,
            delivery_status
        ) VALUES (
            v_msg_id,
            v_chair_user_id,
            'IN_APP',
            'PENDING'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'docket_id', v_docket_id,
        'thesis_id', p_thesis_id,
        'current_state', 'DCEC_SCREENING_QUEUE',
        'compiled_at', clock_timestamp()
    );
END;
$$;

-- ============================================================================
-- 4. Atomic Function: record_dcec_screening_decision
-- Description: DCEC Chair Checker sign-off rendering binding screening decision.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_dcec_screening_decision(
    p_docket_id UUID,
    p_outcome VARCHAR(32),
    p_formal_remarks TEXT,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_chair_id UUID;
    v_docket RECORD;
    v_thesis RECORD;
    v_annexure_1 RECORD;
    v_is_chair BOOLEAN;
    v_decision_id UUID;
    v_event_id UUID;
    v_msg_id UUID;
    v_dhod_user_id UUID;
    v_new_thesis_state VARCHAR(64);
    v_new_thesis_stage VARCHAR(64);
    v_new_ann1_status VARCHAR(32);
    v_active_role VARCHAR(16);
BEGIN
    -- 1. Authenticate caller
    v_chair_id := auth.uid();
    IF v_chair_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate outcome value
    IF p_outcome NOT IN ('APPROVED', 'REVISION_REQUIRED', 'REJECTED') THEN
        RAISE EXCEPTION 'Validation: Invalid DCEC screening outcome %.', p_outcome USING ERRCODE = '22023';
    END IF;

    -- Mandatory formal remarks for decisions
    IF trim(COALESCE(p_formal_remarks, '')) = '' THEN
        RAISE EXCEPTION 'Validation: Formal remarks are mandatory for DCEC screening decisions.' USING ERRCODE = '22023';
    END IF;

    -- 3. Resolve docket, thesis, and department
    SELECT dd.id, dd.thesis_id, dd.docket_stage, dd.compiled_at
    INTO v_docket
    FROM public.dcec_dockets dd
    WHERE dd.id = p_docket_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: DCEC docket % not found.', p_docket_id USING ERRCODE = 'P0002';
    END IF;

    SELECT t.id, t.tracking_number, t.department_id, t.student_id, t.current_state, t.current_stage
    INTO v_thesis
    FROM public.theses t
    WHERE t.id = v_docket.thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Associated thesis % not found.', v_docket.thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Verify caller holds active DCEC Chair authority for the thesis department
    v_is_chair := public.is_active_dcec_chair(v_thesis.department_id);
    IF v_is_chair IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: Caller is not the authorized DCEC Chair for department %.', v_thesis.department_id USING ERRCODE = '42501';
    END IF;

    -- Determine active role for audit log
    IF EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_id = v_chair_id AND role_id = 'HOD' AND department_id = v_thesis.department_id AND is_active = TRUE
    ) THEN
        v_active_role := 'HOD';
    ELSE
        v_active_role := 'DHOD';
    END IF;

    -- 5. Validate lifecycle state guard (must be in DCEC_SCREENING_QUEUE)
    IF v_thesis.current_state != 'DCEC_SCREENING_QUEUE' THEN
        RAISE EXCEPTION 'InvalidState: Cannot record DCEC decision for thesis % in state %.', v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '22023';
    END IF;

    -- Duplicate decision check
    IF EXISTS (SELECT 1 FROM public.dcec_decisions WHERE docket_id = p_docket_id) THEN
        RAISE EXCEPTION 'Conflict: A binding decision has already been recorded for docket %.', p_docket_id USING ERRCODE = '23505';
    END IF;

    -- 6. Map target states based on outcome
    IF p_outcome = 'APPROVED' THEN
        v_new_thesis_state := 'APPROVED_FOR_ALLOCATION';
        v_new_thesis_stage := 'ALLOCATION_STAGE';
        v_new_ann1_status := 'APPROVED';
    ELSIF p_outcome = 'REVISION_REQUIRED' THEN
        v_new_thesis_state := 'ANNEXURE_1_REVISION';
        v_new_thesis_stage := v_thesis.current_stage;
        v_new_ann1_status := 'REVISION_REQUIRED';
    ELSE -- REJECTED
        v_new_thesis_state := 'PROPOSAL_REJECTED_TERMINAL';
        v_new_thesis_stage := v_thesis.current_stage;
        v_new_ann1_status := 'REJECTED';
    END IF;

    -- 7. Insert into dcec_decisions
    INSERT INTO public.dcec_decisions (
        docket_id,
        chair_user_id,
        outcome,
        formal_remarks,
        decision_at
    ) VALUES (
        p_docket_id,
        v_chair_id,
        p_outcome,
        trim(p_formal_remarks),
        clock_timestamp()
    )
    RETURNING id INTO v_decision_id;

    -- 8. Update Annexure 1 submission status
    UPDATE public.annexure_1_submissions
    SET status = v_new_ann1_status
    WHERE thesis_id = v_thesis.id;

    -- 9. Update Thesis lifecycle state and stage
    UPDATE public.theses
    SET current_state = v_new_thesis_state,
        current_stage = v_new_thesis_stage,
        updated_at = clock_timestamp()
    WHERE id = v_thesis.id;

    -- 10. Record Immutable Audit Event
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
        v_chair_id,
        v_active_role,
        'DCEC_DECISION_RECORDED',
        'dcec_decisions',
        v_decision_id,
        jsonb_build_object('state', v_thesis.current_state, 'stage', v_thesis.current_stage),
        jsonb_build_object('state', v_new_thesis_state, 'stage', v_new_thesis_stage, 'outcome', p_outcome, 'decision_id', v_decision_id),
        p_client_ip,
        p_user_agent,
        gen_random_uuid()
    );

    -- 11. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload
    ) VALUES (
        'DCEC_SCREENING_DECIDED',
        'theses',
        v_thesis.id,
        v_chair_id,
        jsonb_build_object(
            'thesis_id', v_thesis.id,
            'docket_id', p_docket_id,
            'decision_id', v_decision_id,
            'outcome', p_outcome,
            'new_state', v_new_thesis_state,
            'formal_remarks', p_formal_remarks
        )
    )
    RETURNING id INTO v_event_id;

    -- 12. Notification Deliveries
    -- Candidate Notification
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
        CASE WHEN p_outcome = 'APPROVED' THEN 'NORMAL' ELSE 'HIGH' END,
        'Annexure 1 Proposal: ' || p_outcome,
        'DCEC screening decision rendered for your dissertation proposal. Status: ' || p_outcome || '.',
        '/app/student/annexure-1'
    )
    RETURNING id INTO v_msg_id;

    INSERT INTO public.notification_deliveries (
        message_id,
        recipient_user_id,
        channel,
        delivery_status
    ) VALUES (
        v_msg_id,
        v_thesis.student_id,
        'IN_APP',
        'PENDING'
    );

    -- If Approved, also notify D.HOD for supervisor allocation
    IF p_outcome = 'APPROVED' THEN
        SELECT ura.user_id INTO v_dhod_user_id
        FROM public.user_role_assignments ura
        WHERE ura.role_id = 'DHOD' AND ura.department_id = v_thesis.department_id AND ura.is_active = TRUE
        LIMIT 1;

        IF v_dhod_user_id IS NOT NULL THEN
            INSERT INTO public.notification_deliveries (
                message_id,
                recipient_user_id,
                channel,
                delivery_status
            ) VALUES (
                v_msg_id,
                v_dhod_user_id,
                'IN_APP',
                'PENDING'
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'decision_id', v_decision_id,
        'docket_id', p_docket_id,
        'thesis_id', v_thesis.id,
        'outcome', p_outcome,
        'current_state', v_new_thesis_state,
        'current_stage', v_new_thesis_stage,
        'decision_at', clock_timestamp()
    );
END;
$$;

-- ============================================================================
-- 5. Function: create_dcec_delegation
-- Description: Allows Head of Department (HOD) to delegate Chair authority to Deputy HOD (D.HOD).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_dcec_delegation(
    p_department_id UUID,
    p_dhod_user_id UUID,
    p_effective_from TIMESTAMPTZ,
    p_effective_until TIMESTAMPTZ,
    p_delegation_reason TEXT,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hod_id UUID;
    v_delegation_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_hod_id := auth.uid();
    IF v_hod_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Verify caller is active HOD for the specified department
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_id = v_hod_id AND role_id = 'HOD' AND department_id = p_department_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Forbidden: Caller is not the Head of Department for department %.', p_department_id USING ERRCODE = '42501';
    END IF;

    -- 3. Verify delegated user is active D.HOD in the same department
    IF NOT EXISTS (
        SELECT 1 FROM public.user_role_assignments
        WHERE user_id = p_dhod_user_id AND role_id = 'DHOD' AND department_id = p_department_id AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Validation: Delegated user is not an active Deputy HOD in department %.', p_department_id USING ERRCODE = '22023';
    END IF;

    -- 4. Invariant checks
    IF p_effective_from >= p_effective_until THEN
        RAISE EXCEPTION 'Validation: effective_from must be strictly before effective_until.' USING ERRCODE = '22023';
    END IF;

    IF trim(COALESCE(p_delegation_reason, '')) = '' THEN
        RAISE EXCEPTION 'Validation: Delegation reason is mandatory.' USING ERRCODE = '22023';
    END IF;

    -- 5. Insert delegation
    INSERT INTO public.dcec_delegations (
        department_id,
        hod_user_id,
        dhod_user_id,
        effective_from,
        effective_until,
        is_revoked,
        delegation_reason,
        created_at
    ) VALUES (
        p_department_id,
        v_hod_id,
        p_dhod_user_id,
        p_effective_from,
        p_effective_until,
        FALSE,
        trim(p_delegation_reason),
        clock_timestamp()
    )
    RETURNING id INTO v_delegation_id;

    -- 6. Audit event
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
        v_hod_id,
        'HOD',
        'DCEC_DELEGATION_CREATED',
        'dcec_delegations',
        v_delegation_id,
        NULL,
        jsonb_build_object('delegation_id', v_delegation_id, 'dhod_user_id', p_dhod_user_id, 'effective_from', p_effective_from, 'effective_until', p_effective_until),
        p_client_ip,
        p_user_agent,
        gen_random_uuid()
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'delegation_id', v_delegation_id,
        'department_id', p_department_id,
        'dhod_user_id', p_dhod_user_id,
        'effective_from', p_effective_from,
        'effective_until', p_effective_until
    );
END;
$$;

-- ============================================================================
-- Explicit Permissions & Execution Hardening
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_dc_screening_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dc_screening_queue() TO authenticated;

REVOKE ALL ON FUNCTION public.get_dcec_screening_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_dcec_screening_queue() TO authenticated;

REVOKE ALL ON FUNCTION public.verify_and_forward_dcec_docket(UUID, BOOLEAN, BOOLEAN, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_and_forward_dcec_docket(UUID, BOOLEAN, BOOLEAN, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_dcec_screening_decision(UUID, VARCHAR, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_dcec_screening_decision(UUID, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.create_dcec_delegation(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_dcec_delegation(UUID, UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, VARCHAR, TEXT) TO authenticated;
