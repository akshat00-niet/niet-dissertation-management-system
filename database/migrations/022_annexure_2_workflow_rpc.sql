-- Migration: 022_annexure_2_workflow_rpc.sql
-- Description: Atomic PostgreSQL RPCs for Collaborative Problem Formulation and Annexure 2 Title Approval Workflows
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 5I-A

-- ============================================================================
-- 1. Helper Function: get_annexure_2_workspace
-- Description: Securely retrieves the Annexure 2 aggregate for Student, assigned Guide,
--              assigned Co-Guide, or authorized Department Academic Officials.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_annexure_2_workspace(UUID);
CREATE OR REPLACE FUNCTION public.get_annexure_2_workspace(
    p_thesis_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_student RECORD;
    v_guide RECORD;
    v_coguide RECORD;
    v_annexure_1 RECORD;
    v_annexure_2 RECORD;
    v_endorsements JSONB;
    v_title_record RECORD;
    v_is_authorized BOOLEAN := FALSE;
    v_is_student BOOLEAN := FALSE;
    v_is_guide BOOLEAN := FALSE;
    v_is_coguide BOOLEAN := FALSE;
    v_is_dcec_chair BOOLEAN := FALSE;
    v_has_dept_role BOOLEAN := FALSE;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch thesis details
    SELECT
        t.id,
        t.tracking_number,
        t.department_id,
        d.name AS department_name,
        d.code AS department_code,
        t.student_id,
        t.guide_id,
        t.co_guide_id,
        t.current_state,
        t.current_stage,
        t.created_at,
        t.updated_at
    INTO v_thesis
    FROM public.theses t
    JOIN public.departments d ON d.id = t.department_id
    WHERE t.id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Determine caller relationships and authorization
    IF v_caller_id = v_thesis.student_id THEN
        v_is_student := TRUE;
        v_is_authorized := TRUE;
    END IF;

    IF v_thesis.guide_id IS NOT NULL AND v_caller_id = v_thesis.guide_id THEN
        v_is_guide := TRUE;
        v_is_authorized := TRUE;
    END IF;

    IF v_thesis.co_guide_id IS NOT NULL AND v_caller_id = v_thesis.co_guide_id THEN
        v_is_coguide := TRUE;
        v_is_authorized := TRUE;
    END IF;

    -- Check department official roles
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        WHERE ura.user_id = v_caller_id
          AND ura.department_id = v_thesis.department_id
          AND ura.role_id IN ('HOD', 'DHOD', 'DC', 'DCEC_MEMBER')
          AND ura.is_active = TRUE
    ) INTO v_has_dept_role;

    IF v_has_dept_role THEN
        v_is_authorized := TRUE;
    END IF;

    v_is_dcec_chair := public.is_active_dcec_chair(v_thesis.department_id);

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to access Annexure 2 workspace for thesis %.', p_thesis_id USING ERRCODE = '42501';
    END IF;

    -- 4. Fetch Student Profile
    SELECT
        u.id,
        u.full_name,
        u.institutional_email AS email,
        sp.roll_number,
        sp.enrollment_number,
        sp.batch_name AS batch
    INTO v_student
    FROM public.users u
    JOIN public.student_profiles sp ON sp.user_id = u.id
    WHERE u.id = v_thesis.student_id;

    -- 5. Fetch Primary Guide Profile
    IF v_thesis.guide_id IS NOT NULL THEN
        SELECT
            u.id,
            u.full_name,
            u.institutional_email AS email,
            fp.employee_code,
            fp.designation,
            fp.active_guide_load,
            fp.active_coguide_load
        INTO v_guide
        FROM public.users u
        JOIN public.faculty_profiles fp ON fp.user_id = u.id
        WHERE u.id = v_thesis.guide_id;
    END IF;

    -- 6. Fetch Co-Guide Profile
    IF v_thesis.co_guide_id IS NOT NULL THEN
        SELECT
            u.id,
            u.full_name,
            u.institutional_email AS email,
            fp.employee_code,
            fp.designation,
            fp.active_guide_load,
            fp.active_coguide_load
        INTO v_coguide
        FROM public.users u
        JOIN public.faculty_profiles fp ON fp.user_id = u.id
        WHERE u.id = v_thesis.co_guide_id;
    END IF;

    -- 7. Fetch Annexure 1 reference data
    SELECT
        a1.id,
        a1.proposed_title,
        a1.broad_domain,
        a1.problem_statement,
        a1.expected_outcomes,
        a1.status,
        a1.submitted_at
    INTO v_annexure_1
    FROM public.annexure_1_submissions a1
    WHERE a1.thesis_id = p_thesis_id;

    -- 8. Fetch Annexure 2 submission
    SELECT
        a2.id,
        a2.thesis_id,
        a2.final_title,
        a2.refined_problem,
        a2.methodology,
        a2.timeline_milestones,
        a2.status,
        a2.submitted_at
    INTO v_annexure_2
    FROM public.annexure_2_submissions a2
    WHERE a2.thesis_id = p_thesis_id;

    -- 9. Fetch Supervisor Endorsements for Stage ANNEXURE_2
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', se.id,
                'faculty_id', se.faculty_id,
                'faculty_name', fu.full_name,
                'supervisor_role', se.supervisor_role,
                'stage', se.stage,
                'is_endorsed', se.is_endorsed,
                'remarks', se.remarks,
                'endorsed_at', se.endorsed_at
            ) ORDER BY se.endorsed_at ASC
        ),
        '[]'::jsonb
    ) INTO v_endorsements
    FROM public.supervisor_endorsements se
    JOIN public.users fu ON fu.id = se.faculty_id
    WHERE se.thesis_id = p_thesis_id
      AND se.stage = 'ANNEXURE_2';

    -- 10. Fetch Title record
    SELECT
        tt.id,
        tt.proposed_title,
        tt.final_approved_title,
        tt.normalized_title,
        tt.is_approved,
        tt.approved_at
    INTO v_title_record
    FROM public.thesis_titles tt
    WHERE tt.thesis_id = p_thesis_id;

    -- 11. Return aggregate
    RETURN jsonb_build_object(
        'thesis', jsonb_build_object(
            'id', v_thesis.id,
            'tracking_number', v_thesis.tracking_number,
            'department_id', v_thesis.department_id,
            'department_name', v_thesis.department_name,
            'department_code', v_thesis.department_code,
            'current_state', v_thesis.current_state,
            'current_stage', v_thesis.current_stage,
            'created_at', v_thesis.created_at,
            'updated_at', v_thesis.updated_at
        ),
        'student', CASE WHEN v_student.id IS NOT NULL THEN jsonb_build_object(
            'id', v_student.id,
            'full_name', v_student.full_name,
            'email', v_student.email,
            'roll_number', v_student.roll_number,
            'enrollment_number', v_student.enrollment_number,
            'batch', v_student.batch
        ) ELSE NULL END,
        'guide', CASE WHEN v_guide.id IS NOT NULL THEN jsonb_build_object(
            'id', v_guide.id,
            'full_name', v_guide.full_name,
            'email', v_guide.email,
            'employee_code', v_guide.employee_code,
            'designation', v_guide.designation,
            'active_guide_load', v_guide.active_guide_load,
            'active_coguide_load', v_guide.active_coguide_load
        ) ELSE NULL END,
        'co_guide', CASE WHEN v_coguide.id IS NOT NULL THEN jsonb_build_object(
            'id', v_coguide.id,
            'full_name', v_coguide.full_name,
            'email', v_coguide.email,
            'employee_code', v_coguide.employee_code,
            'designation', v_coguide.designation,
            'active_guide_load', v_coguide.active_guide_load,
            'active_coguide_load', v_coguide.active_coguide_load
        ) ELSE NULL END,
        'annexure_1', CASE WHEN v_annexure_1.id IS NOT NULL THEN jsonb_build_object(
            'id', v_annexure_1.id,
            'proposed_title', v_annexure_1.proposed_title,
            'broad_domain', v_annexure_1.broad_domain,
            'problem_statement', v_annexure_1.problem_statement,
            'expected_outcomes', v_annexure_1.expected_outcomes,
            'status', v_annexure_1.status,
            'submitted_at', v_annexure_1.submitted_at
        ) ELSE NULL END,
        'annexure_2', CASE WHEN v_annexure_2.id IS NOT NULL THEN jsonb_build_object(
            'id', v_annexure_2.id,
            'thesis_id', v_annexure_2.thesis_id,
            'final_title', v_annexure_2.final_title,
            'refined_problem', v_annexure_2.refined_problem,
            'methodology', v_annexure_2.methodology,
            'timeline_milestones', v_annexure_2.timeline_milestones,
            'status', v_annexure_2.status,
            'submitted_at', v_annexure_2.submitted_at
        ) ELSE NULL END,
        'endorsements', v_endorsements,
        'title_record', CASE WHEN v_title_record.id IS NOT NULL THEN jsonb_build_object(
            'id', v_title_record.id,
            'proposed_title', v_title_record.proposed_title,
            'final_approved_title', v_title_record.final_approved_title,
            'normalized_title', v_title_record.normalized_title,
            'is_approved', v_title_record.is_approved,
            'approved_at', v_title_record.approved_at
        ) ELSE NULL END,
        'permissions', jsonb_build_object(
            'is_student', v_is_student,
            'is_guide', v_is_guide,
            'is_coguide', v_is_coguide,
            'is_dcec_chair', v_is_dcec_chair,
            'can_edit', (v_is_student AND v_thesis.current_state IN ('SUPERVISORS_ALLOCATED', 'COLLABORATIVE_PROBLEM_FORMULATION', 'ANNEXURE_2_REVISION')),
            'can_submit', (v_is_student AND v_thesis.current_state IN ('SUPERVISORS_ALLOCATED', 'COLLABORATIVE_PROBLEM_FORMULATION', 'ANNEXURE_2_REVISION')),
            'can_endorse', ((v_is_guide OR v_is_coguide) AND v_thesis.current_state = 'ANNEXURE_2_SUBMITTED'),
            'can_approve', (v_is_dcec_chair AND v_thesis.current_state = 'ANNEXURE_2_SUPERVISOR_ENDORSED')
        )
    );
END;
$$;


-- ============================================================================
-- 2. Mutation Function: save_annexure_2_draft
-- Description: Allows student candidate to draft/refine Annexure 2 proposal
--              prior to formal submission.
-- ============================================================================
DROP FUNCTION IF EXISTS public.save_annexure_2_draft(UUID, TEXT, TEXT, TEXT, JSONB);
CREATE OR REPLACE FUNCTION public.save_annexure_2_draft(
    p_thesis_id UUID,
    p_final_title TEXT,
    p_refined_problem TEXT,
    p_methodology TEXT,
    p_timeline_milestones JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_ann2_id UUID;
    v_new_state VARCHAR(64);
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate thesis existence and ownership
    SELECT id, tracking_number, department_id, student_id, guide_id, co_guide_id, current_state, current_stage
    INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    IF v_thesis.student_id != v_caller_id THEN
        RAISE EXCEPTION 'Forbidden: Only the candidate student of record can save Annexure 2 draft.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate supervisor allocation exists
    IF v_thesis.guide_id IS NULL OR v_thesis.co_guide_id IS NULL THEN
        RAISE EXCEPTION 'InvalidState: Supervisors must be allocated before initiating Annexure 2 formulation.' USING ERRCODE = '23514';
    END IF;

    -- 4. Lifecycle state guard
    IF v_thesis.current_state NOT IN ('SUPERVISORS_ALLOCATED', 'COLLABORATIVE_PROBLEM_FORMULATION', 'ANNEXURE_2_REVISION') THEN
        RAISE EXCEPTION 'InvalidState: Cannot save Annexure 2 draft for thesis % in state %.', v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 5. Validate input formats
    IF trim(COALESCE(p_final_title, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Finalized dissertation title cannot be empty.' USING ERRCODE = '23502';
    END IF;

    IF p_timeline_milestones IS NOT NULL AND jsonb_typeof(p_timeline_milestones) != 'array' THEN
        RAISE EXCEPTION 'Validation failed: Timeline milestones must be a valid JSON array.' USING ERRCODE = '22023';
    END IF;

    -- 6. Upsert Annexure 2 submission in DRAFT status
    INSERT INTO public.annexure_2_submissions (
        thesis_id,
        final_title,
        refined_problem,
        methodology,
        timeline_milestones,
        status,
        submitted_at
    )
    VALUES (
        p_thesis_id,
        trim(p_final_title),
        trim(COALESCE(p_refined_problem, '')),
        trim(COALESCE(p_methodology, '')),
        COALESCE(p_timeline_milestones, '[]'::jsonb),
        'DRAFT',
        clock_timestamp()
    )
    ON CONFLICT (thesis_id) DO UPDATE
    SET final_title = EXCLUDED.final_title,
        refined_problem = EXCLUDED.refined_problem,
        methodology = EXCLUDED.methodology,
        timeline_milestones = EXCLUDED.timeline_milestones,
        status = 'DRAFT'
    RETURNING id INTO v_ann2_id;

    -- 7. Advance state if currently in SUPERVISORS_ALLOCATED
    v_new_state := v_thesis.current_state;
    IF v_thesis.current_state = 'SUPERVISORS_ALLOCATED' THEN
        v_new_state := 'COLLABORATIVE_PROBLEM_FORMULATION';
        UPDATE public.theses
        SET current_state = 'COLLABORATIVE_PROBLEM_FORMULATION',
            current_stage = 'TOPIC_APPROVAL_STAGE',
            updated_at = clock_timestamp()
        WHERE id = p_thesis_id;
    END IF;

    -- 8. Return result
    RETURN jsonb_build_object(
        'success', TRUE,
        'annexure_2_id', v_ann2_id,
        'thesis_id', p_thesis_id,
        'status', 'DRAFT',
        'current_state', v_new_state
    );
END;
$$;


-- ============================================================================
-- 3. Mutation Function: submit_annexure_2
-- Description: Student formally submits Annexure 2 for Dual Supervisor Endorsement.
--              Validates title uniqueness, resets previous endorsements if revising,
--              records audit/events, and delivers notifications to Guide and Co-Guide.
-- ============================================================================
DROP FUNCTION IF EXISTS public.submit_annexure_2(UUID, TEXT, TEXT, TEXT, JSONB, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.submit_annexure_2(
    p_thesis_id UUID,
    p_final_title TEXT,
    p_refined_problem TEXT,
    p_methodology TEXT,
    p_timeline_milestones JSONB,
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
    v_thesis public.theses%ROWTYPE;
    v_ann2_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
    v_normalized_title TEXT;
    v_existing_thesis_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    IF v_thesis.student_id != v_caller_id THEN
        RAISE EXCEPTION 'Forbidden: Only the student candidate of record can submit Annexure 2.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate state guard
    IF v_thesis.current_state NOT IN ('SUPERVISORS_ALLOCATED', 'COLLABORATIVE_PROBLEM_FORMULATION', 'ANNEXURE_2_REVISION') THEN
        RAISE EXCEPTION 'InvalidState: Cannot submit Annexure 2 for thesis % in state %.', v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 4. Validate supervisors allocated
    IF v_thesis.guide_id IS NULL OR v_thesis.co_guide_id IS NULL THEN
        RAISE EXCEPTION 'InvalidState: Primary Guide and Co-Guide must be allocated before submitting Annexure 2.' USING ERRCODE = '23514';
    END IF;

    -- 5. Validate input contents
    IF trim(COALESCE(p_final_title, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Finalized dissertation title is mandatory.' USING ERRCODE = '23502';
    END IF;
    IF trim(COALESCE(p_refined_problem, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Refined problem statement is mandatory.' USING ERRCODE = '23502';
    END IF;
    IF trim(COALESCE(p_methodology, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Research methodology description is mandatory.' USING ERRCODE = '23502';
    END IF;
    IF p_timeline_milestones IS NULL OR jsonb_typeof(p_timeline_milestones) != 'array' OR jsonb_array_length(p_timeline_milestones) = 0 THEN
        RAISE EXCEPTION 'Validation failed: Timeline milestones must be a non-empty JSON array.' USING ERRCODE = '22023';
    END IF;

    -- 6. Check Title Uniqueness against other active dissertations in cohort
    v_normalized_title := lower(regexp_replace(trim(both from p_final_title), '\s+', ' ', 'g'));
    SELECT tt.thesis_id INTO v_existing_thesis_id
    FROM public.thesis_titles tt
    JOIN public.theses ot ON ot.id = tt.thesis_id
    WHERE lower(tt.normalized_title) = v_normalized_title
      AND tt.thesis_id != p_thesis_id
      AND ot.current_state NOT IN ('ARCHIVED', 'PROPOSAL_REJECTED_TERMINAL')
    LIMIT 1;

    IF v_existing_thesis_id IS NOT NULL THEN
        RAISE EXCEPTION 'DUPLICATE_TITLE_COLLISION: Proposed title collides with an existing active dissertation in the cohort.' USING ERRCODE = '23505';
    END IF;

    -- 7. Upsert Annexure 2 submission in SUBMITTED status
    INSERT INTO public.annexure_2_submissions (
        thesis_id,
        final_title,
        refined_problem,
        methodology,
        timeline_milestones,
        status,
        submitted_at
    )
    VALUES (
        p_thesis_id,
        trim(p_final_title),
        trim(p_refined_problem),
        trim(p_methodology),
        p_timeline_milestones,
        'SUBMITTED',
        clock_timestamp()
    )
    ON CONFLICT (thesis_id) DO UPDATE
    SET final_title = EXCLUDED.final_title,
        refined_problem = EXCLUDED.refined_problem,
        methodology = EXCLUDED.methodology,
        timeline_milestones = EXCLUDED.timeline_milestones,
        status = 'SUBMITTED',
        submitted_at = EXCLUDED.submitted_at
    RETURNING id INTO v_ann2_id;

    -- 8. Advance Thesis state to ANNEXURE_2_SUBMITTED
    UPDATE public.theses
    SET current_state = 'ANNEXURE_2_SUBMITTED',
        current_stage = 'TOPIC_APPROVAL_STAGE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 10. Record Immutable Audit Event
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
        'STUDENT',
        'ANNEXURE_2_SUBMITTED',
        'ANNEXURE_2',
        v_ann2_id,
        jsonb_build_object('current_state', v_thesis.current_state),
        jsonb_build_object(
            'current_state', 'ANNEXURE_2_SUBMITTED',
            'annexure_2_id', v_ann2_id,
            'final_title', trim(p_final_title)
        ),
        NULL,
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
        'ANNEXURE_2_SUBMITTED',
        'THESIS',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'annexure_2_id', v_ann2_id,
            'tracking_number', v_thesis.tracking_number,
            'guide_id', v_thesis.guide_id,
            'co_guide_id', v_thesis.co_guide_id,
            'final_title', trim(p_final_title)
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
        'TITLE_APPROVAL',
        'HIGH',
        'Annexure 2 Submitted for Endorsement: ' || v_thesis.tracking_number,
        'Candidate has submitted Annexure 2 (Formal Title Approval Request) for dissertation ' || v_thesis.tracking_number || '. Endorsement required.',
        '/app/guide/endorsements',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    -- Deliveries to Primary Guide and Co-Guide
    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES
        (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
        (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- 13. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'annexure_2_id', v_ann2_id,
        'thesis_id', p_thesis_id,
        'current_state', 'ANNEXURE_2_SUBMITTED',
        'current_stage', 'TOPIC_APPROVAL_STAGE',
        'submitted_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 4. Mutation Function: endorse_annexure_2
-- Description: Electronic sign-off by Primary Guide or Co-Guide.
--              If endorsed, checks for dual endorsement completion.
--              If both endorsed -> transitions to ANNEXURE_2_SUPERVISOR_ENDORSED.
--              If revision requested -> transitions to COLLABORATIVE_PROBLEM_FORMULATION.
-- ============================================================================
DROP FUNCTION IF EXISTS public.endorse_annexure_2(UUID, BOOLEAN, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.endorse_annexure_2(
    p_thesis_id UUID,
    p_is_endorsed BOOLEAN,
    p_remarks TEXT DEFAULT NULL,
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
    v_thesis public.theses%ROWTYPE;
    v_supervisor_role VARCHAR(16);
    v_faculty_active BOOLEAN;
    v_endorsement_id UUID;
    v_endorsed_count INT := 0;
    v_is_fully_endorsed BOOLEAN := FALSE;
    v_new_thesis_state VARCHAR(64);
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
    v_chair_user_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Determine and validate supervisor role
    IF v_caller_id = v_thesis.guide_id THEN
        v_supervisor_role := 'GUIDE';
    ELSIF v_caller_id = v_thesis.co_guide_id THEN
        v_supervisor_role := 'CO_GUIDE';
    ELSE
        RAISE EXCEPTION 'Forbidden: Caller is not an assigned supervisor (Primary Guide or Co-Guide) for thesis %.', p_thesis_id USING ERRCODE = '42501';
    END IF;

    -- 4. Validate supervisor active status
    SELECT is_active INTO v_faculty_active
    FROM public.users
    WHERE id = v_caller_id;

    IF v_faculty_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Forbidden: Faculty account is not active.' USING ERRCODE = '42501';
    END IF;

    -- 5. Lifecycle state guard
    IF v_thesis.current_state != 'ANNEXURE_2_SUBMITTED' THEN
        RAISE EXCEPTION 'InvalidState: Cannot endorse Annexure 2 for thesis % in state % (expected ANNEXURE_2_SUBMITTED).',
            v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 6. Validate input parameters
    IF p_is_endorsed IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Endorsement decision (is_endorsed) is required.' USING ERRCODE = '23502';
    END IF;

    IF p_is_endorsed IS FALSE AND trim(COALESCE(p_remarks, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Formal feedback remarks are mandatory when requesting revision on Annexure 2.' USING ERRCODE = '23514';
    END IF;

    -- 7. Upsert Supervisor Endorsement record
    INSERT INTO public.supervisor_endorsements (
        thesis_id,
        faculty_id,
        supervisor_role,
        stage,
        is_endorsed,
        remarks,
        endorsed_at
    )
    VALUES (
        p_thesis_id,
        v_caller_id,
        v_supervisor_role,
        'ANNEXURE_2',
        p_is_endorsed,
        p_remarks,
        clock_timestamp()
    )
    RETURNING id INTO v_endorsement_id;

    -- 8. Branch based on endorsement decision
    IF p_is_endorsed IS FALSE THEN
        -- Supervisor requested changes -> Return to COLLABORATIVE_PROBLEM_FORMULATION
        v_new_thesis_state := 'COLLABORATIVE_PROBLEM_FORMULATION';

        UPDATE public.theses
        SET current_state = 'COLLABORATIVE_PROBLEM_FORMULATION',
            updated_at = clock_timestamp()
        WHERE id = p_thesis_id;

        UPDATE public.annexure_2_submissions
        SET status = 'REVISION_REQUIRED'
        WHERE thesis_id = p_thesis_id;

        -- Record Audit Event
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
            v_supervisor_role,
            'ANNEXURE_2_REVISION_REQUESTED',
            'SUPERVISOR_ENDORSEMENT',
            v_endorsement_id,
            jsonb_build_object('current_state', 'ANNEXURE_2_SUBMITTED'),
            jsonb_build_object('current_state', 'COLLABORATIVE_PROBLEM_FORMULATION', 'role', v_supervisor_role),
            p_remarks,
            p_client_ip,
            p_user_agent,
            v_correlation_id,
            clock_timestamp()
        );

        -- Emit Academic Event
        INSERT INTO public.academic_events (
            event_type,
            entity_type,
            entity_id,
            actor_user_id,
            payload,
            emitted_at
        )
        VALUES (
            'ANNEXURE_2_REVISION_REQUESTED',
            'THESIS',
            p_thesis_id,
            v_caller_id,
            jsonb_build_object(
                'supervisor_role', v_supervisor_role,
                'remarks', p_remarks,
                'tracking_number', v_thesis.tracking_number
            ),
            clock_timestamp()
        )
        RETURNING id INTO v_academic_event_id;

        -- Notify Student and collaborating supervisor
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
            'ACTION_REQUIRED',
            'HIGH',
            'Annexure 2 Revision Requested: ' || v_thesis.tracking_number,
            v_supervisor_role || ' has requested revisions on Annexure 2: ' || p_remarks,
            '/app/student/annexure-2',
            clock_timestamp()
        )
        RETURNING id INTO v_notif_msg_id;

        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES
            (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
            (v_notif_msg_id, CASE WHEN v_caller_id = v_thesis.guide_id THEN v_thesis.co_guide_id ELSE v_thesis.guide_id END, 'IN_APP', 'PENDING', clock_timestamp());

    ELSE
        -- Positive Endorsement -> Check Dual Endorsement Condition
        SELECT count(*) INTO v_endorsed_count
        FROM public.supervisor_endorsements
        WHERE thesis_id = p_thesis_id
          AND stage = 'ANNEXURE_2'
          AND is_endorsed = TRUE
          AND faculty_id IN (v_thesis.guide_id, v_thesis.co_guide_id);

        IF v_endorsed_count = 2 THEN
            v_is_fully_endorsed := TRUE;
            v_new_thesis_state := 'ANNEXURE_2_SUPERVISOR_ENDORSED';

            UPDATE public.theses
            SET current_state = 'ANNEXURE_2_SUPERVISOR_ENDORSED',
                updated_at = clock_timestamp()
            WHERE id = p_thesis_id;

            UPDATE public.annexure_2_submissions
            SET status = 'ENDORSED'
            WHERE thesis_id = p_thesis_id;

            -- Record Audit Event: Full Endorsement
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
                v_supervisor_role,
                'ANNEXURE_2_ENDORSED',
                'SUPERVISOR_ENDORSEMENT',
                v_endorsement_id,
                jsonb_build_object('current_state', 'ANNEXURE_2_SUBMITTED'),
                jsonb_build_object(
                    'current_state', 'ANNEXURE_2_SUPERVISOR_ENDORSED',
                    'is_fully_endorsed', TRUE,
                    'supervisor_role', v_supervisor_role
                ),
                p_remarks,
                p_client_ip,
                p_user_agent,
                v_correlation_id,
                clock_timestamp()
            );

            -- Emit Academic Event
            INSERT INTO public.academic_events (
                event_type,
                entity_type,
                entity_id,
                actor_user_id,
                payload,
                emitted_at
            )
            VALUES (
                'ANNEXURE_2_FULLY_ENDORSED',
                'THESIS',
                p_thesis_id,
                v_caller_id,
                jsonb_build_object(
                    'tracking_number', v_thesis.tracking_number,
                    'guide_id', v_thesis.guide_id,
                    'co_guide_id', v_thesis.co_guide_id
                ),
                clock_timestamp()
            )
            RETURNING id INTO v_academic_event_id;

            -- Notify DCEC Chair and Candidate
            SELECT ura.user_id INTO v_chair_user_id
            FROM public.user_role_assignments ura
            WHERE ura.role_id = 'HOD'
              AND ura.department_id = v_thesis.department_id
              AND ura.is_active = TRUE
            LIMIT 1;

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
                'SCREENING',
                'NORMAL',
                'Annexure 2 Fully Endorsed: ' || v_thesis.tracking_number,
                'Primary Guide and Co-Guide have endorsed Annexure 2 for dissertation ' || v_thesis.tracking_number || '. Ready for DCEC Chair title approval.',
                '/app/dcec/title-approvals',
                clock_timestamp()
            )
            RETURNING id INTO v_notif_msg_id;

            IF v_chair_user_id IS NOT NULL THEN
                INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
                VALUES (v_notif_msg_id, v_chair_user_id, 'IN_APP', 'PENDING', clock_timestamp());
            END IF;

            INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
            VALUES (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp());

        ELSE
            -- Single endorsement so far -> remain in ANNEXURE_2_SUBMITTED
            v_new_thesis_state := 'ANNEXURE_2_SUBMITTED';

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
                v_supervisor_role,
                'ANNEXURE_2_ENDORSED',
                'SUPERVISOR_ENDORSEMENT',
                v_endorsement_id,
                jsonb_build_object('current_state', 'ANNEXURE_2_SUBMITTED'),
                jsonb_build_object(
                    'current_state', 'ANNEXURE_2_SUBMITTED',
                    'is_fully_endorsed', FALSE,
                    'supervisor_role', v_supervisor_role
                ),
                p_remarks,
                p_client_ip,
                p_user_agent,
                v_correlation_id,
                clock_timestamp()
            );

            INSERT INTO public.academic_events (
                event_type,
                entity_type,
                entity_id,
                actor_user_id,
                payload,
                emitted_at
            )
            VALUES (
                'ANNEXURE_2_PARTIALLY_ENDORSED',
                'THESIS',
                p_thesis_id,
                v_caller_id,
                jsonb_build_object(
                    'supervisor_role', v_supervisor_role,
                    'tracking_number', v_thesis.tracking_number
                ),
                clock_timestamp()
            );
        END IF;
    END IF;

    -- 9. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'endorsement_id', v_endorsement_id,
        'thesis_id', p_thesis_id,
        'supervisor_role', v_supervisor_role,
        'is_endorsed', p_is_endorsed,
        'is_fully_endorsed', v_is_fully_endorsed,
        'current_state', v_new_thesis_state,
        'endorsed_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 5. Mutation Function: decide_annexure_2_title_dcec
-- Description: DCEC Chair Checker sign-off on formal dissertation title approval.
--              Atomically baselines final_approved_title in thesis_titles and
--              unlocks RESEARCH_AND_PROGRESS_STAGE (Annexure 4 Logbook).
-- ============================================================================
DROP FUNCTION IF EXISTS public.decide_annexure_2_title_dcec(UUID, VARCHAR, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.decide_annexure_2_title_dcec(
    p_thesis_id UUID,
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
    v_thesis public.theses%ROWTYPE;
    v_ann2 RECORD;
    v_endorsed_count INT := 0;
    v_is_chair BOOLEAN;
    v_active_role VARCHAR(16);
    v_new_thesis_state VARCHAR(64);
    v_new_thesis_stage VARCHAR(64);
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_chair_id := auth.uid();
    IF v_chair_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Verify DCEC Chair authority for thesis department
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

    -- 4. Lifecycle state guard
    IF v_thesis.current_state != 'ANNEXURE_2_SUPERVISOR_ENDORSED' THEN
        RAISE EXCEPTION 'InvalidState: Cannot decide Annexure 2 title for thesis % in state % (expected ANNEXURE_2_SUPERVISOR_ENDORSED).',
            v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 5. Re-verify dual supervisor endorsements under lock
    SELECT count(*) INTO v_endorsed_count
    FROM public.supervisor_endorsements
    WHERE thesis_id = p_thesis_id
      AND stage = 'ANNEXURE_2'
      AND is_endorsed = TRUE
      AND faculty_id IN (v_thesis.guide_id, v_thesis.co_guide_id);

    IF v_endorsed_count < 2 THEN
        RAISE EXCEPTION 'InvalidState: Cannot approve title for thesis % because dual supervisor endorsements are incomplete (%/2).',
            v_thesis.tracking_number, v_endorsed_count USING ERRCODE = '23514';
    END IF;

    -- 6. Validate outcome & formal remarks
    IF p_outcome NOT IN ('APPROVED', 'REVISION_REQUIRED') THEN
        RAISE EXCEPTION 'Validation failed: Invalid title decision outcome % (expected APPROVED or REVISION_REQUIRED).', p_outcome USING ERRCODE = '22023';
    END IF;

    IF trim(COALESCE(p_formal_remarks, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Formal remarks are mandatory for DCEC Chair title decisions.' USING ERRCODE = '23502';
    END IF;

    -- 7. Fetch Annexure 2 submission
    SELECT * INTO v_ann2
    FROM public.annexure_2_submissions
    WHERE thesis_id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Annexure 2 submission record missing for thesis %.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 8. Branch based on outcome
    IF p_outcome = 'APPROVED' THEN
        v_new_thesis_state := 'ANNEXURE_2_DCEC_APPROVED';
        v_new_thesis_stage := 'RESEARCH_AND_PROGRESS_STAGE';

        -- Update thesis_titles: baseline final approved title
        UPDATE public.thesis_titles
        SET final_approved_title = v_ann2.final_title,
            is_approved = TRUE,
            approved_at = clock_timestamp()
        WHERE thesis_id = p_thesis_id;

        -- Update Annexure 2 status
        UPDATE public.annexure_2_submissions
        SET status = 'APPROVED'
        WHERE thesis_id = p_thesis_id;

        -- Update Thesis state and stage
        UPDATE public.theses
        SET current_state = 'ANNEXURE_2_DCEC_APPROVED',
            current_stage = 'RESEARCH_AND_PROGRESS_STAGE',
            updated_at = clock_timestamp()
        WHERE id = p_thesis_id;

        -- Record Immutable Audit Event
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
            v_chair_id,
            v_active_role,
            'TITLE_FORMALLY_APPROVED',
            'THESIS_TITLE',
            p_thesis_id,
            jsonb_build_object('current_state', 'ANNEXURE_2_SUPERVISOR_ENDORSED'),
            jsonb_build_object(
                'current_state', 'ANNEXURE_2_DCEC_APPROVED',
                'final_approved_title', v_ann2.final_title,
                'stage', 'RESEARCH_AND_PROGRESS_STAGE'
            ),
            p_formal_remarks,
            p_client_ip,
            p_user_agent,
            v_correlation_id,
            clock_timestamp()
        );

        -- Emit Academic Domain Event
        INSERT INTO public.academic_events (
            event_type,
            entity_type,
            entity_id,
            actor_user_id,
            payload,
            emitted_at
        )
        VALUES (
            'ANNEXURE_2_APPROVED',
            'THESIS',
            p_thesis_id,
            v_chair_id,
            jsonb_build_object(
                'final_approved_title', v_ann2.final_title,
                'tracking_number', v_thesis.tracking_number,
                'stage', 'RESEARCH_AND_PROGRESS_STAGE'
            ),
            clock_timestamp()
        )
        RETURNING id INTO v_academic_event_id;

        -- Create Notification Message
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
            'WORKFLOW',
            'NORMAL',
            'Dissertation Title Formally Approved: ' || v_thesis.tracking_number,
            'DCEC Chair has approved dissertation title "' || v_ann2.final_title || '" for ' || v_thesis.tracking_number || '. Digital logbook (Annexure 4) is now unlocked.',
            '/app/student/dissertation',
            clock_timestamp()
        )
        RETURNING id INTO v_notif_msg_id;

        -- Deliveries to Student, Primary Guide, and Co-Guide
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES
            (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
            (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
            (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());

    ELSE -- REVISION_REQUIRED
        v_new_thesis_state := 'ANNEXURE_2_REVISION';
        v_new_thesis_stage := v_thesis.current_stage;

        -- Update Annexure 2 status
        UPDATE public.annexure_2_submissions
        SET status = 'REVISION_REQUIRED'
        WHERE thesis_id = p_thesis_id;

        -- Update Thesis state
        UPDATE public.theses
        SET current_state = 'ANNEXURE_2_REVISION',
            updated_at = clock_timestamp()
        WHERE id = p_thesis_id;

        -- Record Immutable Audit Event
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
            v_chair_id,
            v_active_role,
            'ANNEXURE_2_REVISION_REQUESTED',
            'ANNEXURE_2',
            v_ann2.id,
            jsonb_build_object('current_state', 'ANNEXURE_2_SUPERVISOR_ENDORSED'),
            jsonb_build_object('current_state', 'ANNEXURE_2_REVISION'),
            p_formal_remarks,
            p_client_ip,
            p_user_agent,
            v_correlation_id,
            clock_timestamp()
        );

        -- Emit Academic Domain Event
        INSERT INTO public.academic_events (
            event_type,
            entity_type,
            entity_id,
            actor_user_id,
            payload,
            emitted_at
        )
        VALUES (
            'ANNEXURE_2_REVISION_REQUESTED',
            'THESIS',
            p_thesis_id,
            v_chair_id,
            jsonb_build_object(
                'tracking_number', v_thesis.tracking_number,
                'formal_remarks', p_formal_remarks
            ),
            clock_timestamp()
        )
        RETURNING id INTO v_academic_event_id;

        -- Create Notification Message
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
            'ACTION_REQUIRED',
            'HIGH',
            'Annexure 2 Title Revision Ordered: ' || v_thesis.tracking_number,
            'DCEC Chair has requested revisions on Annexure 2 title docket: ' || p_formal_remarks,
            '/app/student/annexure-2',
            clock_timestamp()
        )
        RETURNING id INTO v_notif_msg_id;

        -- Deliveries to Student, Primary Guide, and Co-Guide
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES
            (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
            (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp()),
            (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- 9. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'thesis_id', p_thesis_id,
        'outcome', p_outcome,
        'final_approved_title', CASE WHEN p_outcome = 'APPROVED' THEN v_ann2.final_title ELSE NULL END,
        'current_state', v_new_thesis_state,
        'current_stage', v_new_thesis_stage,
        'decided_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 6. Grants & Security Hardening
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_annexure_2_workspace(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_annexure_2_workspace(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.save_annexure_2_draft(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_annexure_2_draft(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_annexure_2(UUID, TEXT, TEXT, TEXT, JSONB, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_annexure_2(UUID, TEXT, TEXT, TEXT, JSONB, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.endorse_annexure_2(UUID, BOOLEAN, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.endorse_annexure_2(UUID, BOOLEAN, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.decide_annexure_2_title_dcec(UUID, VARCHAR, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.decide_annexure_2_title_dcec(UUID, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated;

-- ============================================================================
-- 7. Test Helper Function: reset_thesis_annexure_2_for_testing
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_thesis_annexure_2_for_testing(p_thesis_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    DELETE FROM public.annexure_2_submissions WHERE thesis_id = p_thesis_id;

    ALTER TABLE public.supervisor_endorsements DISABLE TRIGGER trg_immutable_supervisor_endorsements;
    DELETE FROM public.supervisor_endorsements WHERE thesis_id = p_thesis_id;
    ALTER TABLE public.supervisor_endorsements ENABLE TRIGGER trg_immutable_supervisor_endorsements;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_thesis_annexure_2_for_testing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_thesis_annexure_2_for_testing(UUID) TO authenticated;
