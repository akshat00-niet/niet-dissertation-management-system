-- Migration: 023_digital_logbook_workflow_rpc.sql
-- Description: Atomic PostgreSQL RPCs for Digital Logbook (Annexure 4) and Periodic Progress Tracking Workflows
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 5J-A

-- ============================================================================
-- 1. Helper Function: get_digital_logbook_workspace
-- Description: Securely retrieves the Digital Logbook & Progress Tracking aggregate
--              for Student, assigned Guide, assigned Co-Guide, or authorized
--              Department Academic Officials.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_digital_logbook_workspace(UUID);
CREATE OR REPLACE FUNCTION public.get_digital_logbook_workspace(
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
    v_title_record RECORD;
    v_entries JSONB;
    v_reports JSONB;
    v_is_authorized BOOLEAN := FALSE;
    v_is_student BOOLEAN := FALSE;
    v_is_guide BOOLEAN := FALSE;
    v_is_coguide BOOLEAN := FALSE;
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

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to access Digital Logbook workspace for thesis %.', p_thesis_id USING ERRCODE = '42501';
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

    -- 7. Fetch Title record
    SELECT
        tt.id,
        tt.proposed_title,
        tt.final_approved_title,
        tt.is_approved
    INTO v_title_record
    FROM public.thesis_titles tt
    WHERE tt.thesis_id = p_thesis_id;

    -- 8. Fetch Digital Logbook Entries with Verifications
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', dle.id,
                'thesis_id', dle.thesis_id,
                'student_id', dle.student_id,
                'meeting_mode', dle.meeting_mode,
                'meeting_link', dle.meeting_link,
                'meeting_location', dle.meeting_location,
                'meeting_date', dle.meeting_date,
                'discussion_agenda', dle.discussion_agenda,
                'progress_discussed', dle.progress_discussed,
                'action_items', dle.action_items,
                'next_target_date', dle.next_target_date,
                'status', dle.status,
                'created_at', dle.created_at,
                'updated_at', dle.updated_at,
                'verifications', COALESCE(
                    (
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'id', lv.id,
                                'verifier_faculty_id', lv.verifier_faculty_id,
                                'verifier_name', vu.full_name,
                                'outcome', lv.outcome,
                                'feedback_remarks', lv.feedback_remarks,
                                'verified_at', lv.verified_at
                            ) ORDER BY lv.verified_at DESC
                        )
                        FROM public.logbook_verifications lv
                        JOIN public.users vu ON vu.id = lv.verifier_faculty_id
                        WHERE lv.logbook_entry_id = dle.id
                    ),
                    '[]'::jsonb
                )
            ) ORDER BY dle.meeting_date DESC, dle.created_at DESC
        ),
        '[]'::jsonb
    ) INTO v_entries
    FROM public.digital_logbook_entries dle
    WHERE dle.thesis_id = p_thesis_id;

    -- 9. Fetch Periodic Progress Reports with Acknowledgment info
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ppr.id,
                'thesis_id', ppr.thesis_id,
                'student_id', ppr.student_id,
                'report_type', ppr.report_type,
                'period_start', ppr.period_start,
                'period_end', ppr.period_end,
                'summary_work_done', ppr.summary_work_done,
                'milestones_achieved', ppr.milestones_achieved,
                'issues_faced', ppr.issues_faced,
                'status', ppr.status,
                'submitted_at', ppr.submitted_at,
                'is_acknowledged', EXISTS (
                    SELECT 1 FROM public.audit_events ae
                    WHERE ae.action_code = 'PROGRESS_REPORT_ACKNOWLEDGED'
                      AND ae.target_entity_id = ppr.id
                ),
                'acknowledged_at', (
                    SELECT ae.timestamp_utc FROM public.audit_events ae
                    WHERE ae.action_code = 'PROGRESS_REPORT_ACKNOWLEDGED'
                      AND ae.target_entity_id = ppr.id
                    ORDER BY ae.timestamp_utc DESC
                    LIMIT 1
                ),
                'acknowledged_by_name', (
                    SELECT au.full_name FROM public.audit_events ae
                    JOIN public.users au ON au.id = ae.actor_user_id
                    WHERE ae.action_code = 'PROGRESS_REPORT_ACKNOWLEDGED'
                      AND ae.target_entity_id = ppr.id
                    ORDER BY ae.timestamp_utc DESC
                    LIMIT 1
                ),
                'supervisor_remarks', (
                    SELECT ae.justification FROM public.audit_events ae
                    WHERE ae.action_code = 'PROGRESS_REPORT_ACKNOWLEDGED'
                      AND ae.target_entity_id = ppr.id
                    ORDER BY ae.timestamp_utc DESC
                    LIMIT 1
                )
            ) ORDER BY ppr.submitted_at DESC
        ),
        '[]'::jsonb
    ) INTO v_reports
    FROM public.periodic_progress_reports ppr
    WHERE ppr.thesis_id = p_thesis_id;

    -- 10. Return aggregate
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
        'approved_title', v_title_record.final_approved_title,
        'is_title_approved', COALESCE(v_title_record.is_approved, FALSE),
        'logbook_entries', v_entries,
        'periodic_reports', v_reports,
        'permissions', jsonb_build_object(
            'is_student', v_is_student,
            'is_guide', v_is_guide,
            'is_coguide', v_is_coguide,
            'is_dept_official', v_has_dept_role,
            'can_create_entry', (v_is_student AND v_thesis.current_stage = 'RESEARCH_AND_PROGRESS_STAGE'),
            'can_submit_progress_report', (v_is_student AND v_thesis.current_stage = 'RESEARCH_AND_PROGRESS_STAGE'),
            'can_verify', ((v_is_guide OR v_is_coguide) AND v_thesis.current_stage = 'RESEARCH_AND_PROGRESS_STAGE'),
            'can_acknowledge_report', ((v_is_guide OR v_is_coguide) AND v_thesis.current_stage = 'RESEARCH_AND_PROGRESS_STAGE')
        )
    );
END;
$$;


-- ============================================================================
-- 2. Mutation Function: save_digital_logbook_entry_draft
-- Description: Allows candidate student to draft/update a meeting logbook entry
--              prior to formal submission.
-- ============================================================================
DROP FUNCTION IF EXISTS public.save_digital_logbook_entry_draft(UUID, UUID, VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, TEXT, DATE);
CREATE OR REPLACE FUNCTION public.save_digital_logbook_entry_draft(
    p_thesis_id UUID,
    p_entry_id UUID DEFAULT NULL,
    p_meeting_mode VARCHAR DEFAULT 'OFFLINE',
    p_meeting_link TEXT DEFAULT NULL,
    p_meeting_location VARCHAR DEFAULT NULL,
    p_meeting_date TIMESTAMPTZ DEFAULT clock_timestamp(),
    p_discussion_agenda TEXT DEFAULT '',
    p_progress_discussed TEXT DEFAULT '',
    p_action_items TEXT DEFAULT '',
    p_next_target_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days')::DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis RECORD;
    v_entry RECORD;
    v_target_entry_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate thesis existence and ownership
    SELECT id, tracking_number, student_id, current_state, current_stage
    INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    IF v_thesis.student_id != v_caller_id THEN
        RAISE EXCEPTION 'Forbidden: Only the candidate student of record can save logbook entries.' USING ERRCODE = '42501';
    END IF;

    -- 3. Stage guard: must be in research execution / progress stage
    IF v_thesis.current_stage != 'RESEARCH_AND_PROGRESS_STAGE' THEN
        RAISE EXCEPTION 'InvalidState: Digital Logbook is only active during RESEARCH_AND_PROGRESS_STAGE (current stage: %).', v_thesis.current_stage USING ERRCODE = '23514';
    END IF;

    -- 4. Validate meeting mode parameters
    IF p_meeting_mode NOT IN ('ONLINE', 'OFFLINE') THEN
        RAISE EXCEPTION 'Validation failed: Invalid meeting mode % (expected ONLINE or OFFLINE).', p_meeting_mode USING ERRCODE = '22023';
    END IF;

    IF p_meeting_mode = 'ONLINE' AND trim(COALESCE(p_meeting_link, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Meeting URL/link is required for ONLINE meetings.' USING ERRCODE = '23502';
    END IF;

    IF p_meeting_mode = 'OFFLINE' AND trim(COALESCE(p_meeting_location, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Meeting location/room is required for OFFLINE meetings.' USING ERRCODE = '23502';
    END IF;

    -- 5. Insert or Update draft
    IF p_entry_id IS NULL THEN
        INSERT INTO public.digital_logbook_entries (
            thesis_id,
            student_id,
            meeting_mode,
            meeting_link,
            meeting_location,
            meeting_date,
            discussion_agenda,
            progress_discussed,
            action_items,
            next_target_date,
            status,
            created_at,
            updated_at
        )
        VALUES (
            p_thesis_id,
            v_caller_id,
            p_meeting_mode,
            CASE WHEN p_meeting_mode = 'ONLINE' THEN trim(p_meeting_link) ELSE NULL END,
            CASE WHEN p_meeting_mode = 'OFFLINE' THEN trim(p_meeting_location) ELSE NULL END,
            COALESCE(p_meeting_date, clock_timestamp()),
            trim(COALESCE(p_discussion_agenda, '')),
            trim(COALESCE(p_progress_discussed, '')),
            trim(COALESCE(p_action_items, '')),
            COALESCE(p_next_target_date, (CURRENT_DATE + INTERVAL '7 days')::DATE),
            'DRAFT',
            clock_timestamp(),
            clock_timestamp()
        )
        RETURNING id INTO v_target_entry_id;
    ELSE
        SELECT * INTO v_entry
        FROM public.digital_logbook_entries
        WHERE id = p_entry_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'NotFound: Logbook entry % not found.', p_entry_id USING ERRCODE = 'P0002';
        END IF;

        IF v_entry.thesis_id != p_thesis_id OR v_entry.student_id != v_caller_id THEN
            RAISE EXCEPTION 'Forbidden: Cannot edit logbook entry belonging to another thesis or student.' USING ERRCODE = '42501';
        END IF;

        IF v_entry.status NOT IN ('DRAFT', 'REVISION_REQUIRED') THEN
            RAISE EXCEPTION 'InvalidState: Cannot edit logbook entry in status % (must be DRAFT or REVISION_REQUIRED).', v_entry.status USING ERRCODE = '23514';
        END IF;

        UPDATE public.digital_logbook_entries
        SET meeting_mode = p_meeting_mode,
            meeting_link = CASE WHEN p_meeting_mode = 'ONLINE' THEN trim(p_meeting_link) ELSE NULL END,
            meeting_location = CASE WHEN p_meeting_mode = 'OFFLINE' THEN trim(p_meeting_location) ELSE NULL END,
            meeting_date = COALESCE(p_meeting_date, v_entry.meeting_date),
            discussion_agenda = trim(COALESCE(p_discussion_agenda, v_entry.discussion_agenda)),
            progress_discussed = trim(COALESCE(p_progress_discussed, v_entry.progress_discussed)),
            action_items = trim(COALESCE(p_action_items, v_entry.action_items)),
            next_target_date = COALESCE(p_next_target_date, v_entry.next_target_date),
            status = 'DRAFT',
            updated_at = clock_timestamp()
        WHERE id = p_entry_id
        RETURNING id INTO v_target_entry_id;
    END IF;

    -- 6. Return response
    RETURN jsonb_build_object(
        'success', TRUE,
        'entry_id', v_target_entry_id,
        'thesis_id', p_thesis_id,
        'status', 'DRAFT'
    );
END;
$$;


-- ============================================================================
-- 3. Mutation Function: submit_digital_logbook_entry
-- Description: Student formally submits a meeting logbook entry for supervisory
--              verification. Validates fields, sets status = 'SUBMITTED',
--              records audit event, and delivers notifications to Guide and Co-Guide.
-- ============================================================================
DROP FUNCTION IF EXISTS public.submit_digital_logbook_entry(UUID, UUID, VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, TEXT, DATE, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.submit_digital_logbook_entry(
    p_thesis_id UUID,
    p_entry_id UUID DEFAULT NULL,
    p_meeting_mode VARCHAR DEFAULT 'OFFLINE',
    p_meeting_link TEXT DEFAULT NULL,
    p_meeting_location VARCHAR DEFAULT NULL,
    p_meeting_date TIMESTAMPTZ DEFAULT clock_timestamp(),
    p_discussion_agenda TEXT DEFAULT '',
    p_progress_discussed TEXT DEFAULT '',
    p_action_items TEXT DEFAULT '',
    p_next_target_date DATE DEFAULT (CURRENT_DATE + INTERVAL '7 days')::DATE,
    p_client_ip VARCHAR DEFAULT '127.0.0.1',
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
    v_entry RECORD;
    v_prev_status VARCHAR(32) := 'NONE';
    v_target_entry_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
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
        RAISE EXCEPTION 'Forbidden: Only the candidate student of record can submit logbook entries.' USING ERRCODE = '42501';
    END IF;

    -- 3. Stage guard: must be in research execution / progress stage
    IF v_thesis.current_stage != 'RESEARCH_AND_PROGRESS_STAGE' THEN
        RAISE EXCEPTION 'InvalidState: Digital Logbook is only active during RESEARCH_AND_PROGRESS_STAGE (current stage: %).', v_thesis.current_stage USING ERRCODE = '23514';
    END IF;

    -- 4. Validate mandatory input fields
    IF p_meeting_mode NOT IN ('ONLINE', 'OFFLINE') THEN
        RAISE EXCEPTION 'Validation failed: Invalid meeting mode % (expected ONLINE or OFFLINE).', p_meeting_mode USING ERRCODE = '22023';
    END IF;

    IF p_meeting_mode = 'ONLINE' AND trim(COALESCE(p_meeting_link, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Meeting URL/link is mandatory for ONLINE meetings.' USING ERRCODE = '23502';
    END IF;

    IF p_meeting_mode = 'OFFLINE' AND trim(COALESCE(p_meeting_location, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Meeting location/room is mandatory for OFFLINE meetings.' USING ERRCODE = '23502';
    END IF;

    IF trim(COALESCE(p_discussion_agenda, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Discussion agenda is mandatory.' USING ERRCODE = '23502';
    END IF;

    IF trim(COALESCE(p_progress_discussed, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Progress discussed summary is mandatory.' USING ERRCODE = '23502';
    END IF;

    IF trim(COALESCE(p_action_items, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Action items / targets are mandatory.' USING ERRCODE = '23502';
    END IF;

    IF p_meeting_date IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Meeting date/time is mandatory.' USING ERRCODE = '23502';
    END IF;

    IF p_next_target_date IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Next target date is mandatory.' USING ERRCODE = '23502';
    END IF;

    -- 5. Insert or Update entry
    IF p_entry_id IS NULL THEN
        INSERT INTO public.digital_logbook_entries (
            thesis_id,
            student_id,
            meeting_mode,
            meeting_link,
            meeting_location,
            meeting_date,
            discussion_agenda,
            progress_discussed,
            action_items,
            next_target_date,
            status,
            created_at,
            updated_at
        )
        VALUES (
            p_thesis_id,
            v_caller_id,
            p_meeting_mode,
            CASE WHEN p_meeting_mode = 'ONLINE' THEN trim(p_meeting_link) ELSE NULL END,
            CASE WHEN p_meeting_mode = 'OFFLINE' THEN trim(p_meeting_location) ELSE NULL END,
            p_meeting_date,
            trim(p_discussion_agenda),
            trim(p_progress_discussed),
            trim(p_action_items),
            p_next_target_date,
            'SUBMITTED',
            clock_timestamp(),
            clock_timestamp()
        )
        RETURNING id INTO v_target_entry_id;
    ELSE
        SELECT * INTO v_entry
        FROM public.digital_logbook_entries
        WHERE id = p_entry_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'NotFound: Logbook entry % not found.', p_entry_id USING ERRCODE = 'P0002';
        END IF;

        IF v_entry.thesis_id != p_thesis_id OR v_entry.student_id != v_caller_id THEN
            RAISE EXCEPTION 'Forbidden: Cannot submit logbook entry belonging to another thesis or student.' USING ERRCODE = '42501';
        END IF;

        IF v_entry.status NOT IN ('DRAFT', 'REVISION_REQUIRED') THEN
            RAISE EXCEPTION 'InvalidState: Cannot submit logbook entry in status % (must be DRAFT or REVISION_REQUIRED).', v_entry.status USING ERRCODE = '23514';
        END IF;

        v_prev_status := v_entry.status;

        UPDATE public.digital_logbook_entries
        SET meeting_mode = p_meeting_mode,
            meeting_link = CASE WHEN p_meeting_mode = 'ONLINE' THEN trim(p_meeting_link) ELSE NULL END,
            meeting_location = CASE WHEN p_meeting_mode = 'OFFLINE' THEN trim(p_meeting_location) ELSE NULL END,
            meeting_date = p_meeting_date,
            discussion_agenda = trim(p_discussion_agenda),
            progress_discussed = trim(p_progress_discussed),
            action_items = trim(p_action_items),
            next_target_date = p_next_target_date,
            status = 'SUBMITTED',
            updated_at = clock_timestamp()
        WHERE id = p_entry_id
        RETURNING id INTO v_target_entry_id;
    END IF;

    -- 6. Record Immutable Audit Event
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
        'LOGBOOK_ENTRY_CREATED',
        'LOGBOOK_ENTRY',
        v_target_entry_id,
        jsonb_build_object('status', v_prev_status),
        jsonb_build_object(
            'status', 'SUBMITTED',
            'meeting_mode', p_meeting_mode,
            'meeting_date', p_meeting_date,
            'discussion_agenda', trim(p_discussion_agenda)
        ),
        NULL,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 7. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'LOGBOOK_ENTRY_SUBMITTED',
        'LOGBOOK_ENTRY',
        v_target_entry_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'meeting_mode', p_meeting_mode,
            'meeting_date', p_meeting_date
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 8. Create Notification Message & Deliveries for Guide and Co-Guide
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
        'NORMAL',
        'Logbook Entry Submitted: ' || v_thesis.tracking_number,
        'Candidate has submitted a new digital logbook meeting entry (' || p_meeting_mode || ') for dissertation ' || v_thesis.tracking_number || '. Verification required.',
        '/app/guide/logbook',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    IF v_thesis.guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    IF v_thesis.co_guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- 9. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'entry_id', v_target_entry_id,
        'thesis_id', p_thesis_id,
        'status', 'SUBMITTED',
        'submitted_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 4. Mutation Function: verify_digital_logbook_entry
-- Description: Electronic sign-off by assigned Primary Guide or Co-Guide.
--              For VERIFIED: updates status = 'VERIFIED', creates append-only
--              logbook_verifications row, and notifies student.
--              For REVISION_REQUESTED: updates status = 'REVISION_REQUIRED',
--              requires non-empty remarks, and notifies student with HIGH priority.
-- ============================================================================
DROP FUNCTION IF EXISTS public.verify_digital_logbook_entry(UUID, VARCHAR, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.verify_digital_logbook_entry(
    p_entry_id UUID,
    p_outcome VARCHAR,
    p_feedback_remarks TEXT DEFAULT NULL,
    p_client_ip VARCHAR DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_entry public.digital_logbook_entries%ROWTYPE;
    v_thesis public.theses%ROWTYPE;
    v_verifier_role VARCHAR(16);
    v_new_status VARCHAR(32);
    v_verification_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock entry row with FOR UPDATE
    SELECT * INTO v_entry
    FROM public.digital_logbook_entries
    WHERE id = p_entry_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Logbook entry % not found.', p_entry_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = v_entry.thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Associated thesis % not found.', v_entry.thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Authorize supervisor role
    IF v_caller_id = v_thesis.guide_id THEN
        v_verifier_role := 'GUIDE';
    ELSIF v_caller_id = v_thesis.co_guide_id THEN
        v_verifier_role := 'CO_GUIDE';
    ELSE
        RAISE EXCEPTION 'Forbidden: Caller is not an assigned supervisor (Guide or Co-Guide) for thesis %.', v_thesis.tracking_number USING ERRCODE = '42501';
    END IF;

    -- Candidate cannot self-verify
    IF v_caller_id = v_thesis.student_id THEN
        RAISE EXCEPTION 'Forbidden: Candidate cannot verify own logbook entries.' USING ERRCODE = '42501';
    END IF;

    -- 5. Lifecycle status guard: must be currently SUBMITTED
    IF v_entry.status != 'SUBMITTED' THEN
        RAISE EXCEPTION 'InvalidState: Cannot verify logbook entry in status % (expected SUBMITTED).', v_entry.status USING ERRCODE = '23514';
    END IF;

    -- 6. Validate outcome
    IF p_outcome NOT IN ('VERIFIED', 'REVISION_REQUESTED') THEN
        RAISE EXCEPTION 'Validation failed: Invalid verification outcome % (expected VERIFIED or REVISION_REQUESTED).', p_outcome USING ERRCODE = '22023';
    END IF;

    IF p_outcome = 'REVISION_REQUESTED' AND trim(COALESCE(p_feedback_remarks, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Formal feedback remarks are mandatory when requesting logbook revision.' USING ERRCODE = '23514';
    END IF;

    -- 7. Insert Append-Only Verification Row
    INSERT INTO public.logbook_verifications (
        logbook_entry_id,
        verifier_faculty_id,
        outcome,
        feedback_remarks,
        verified_at
    )
    VALUES (
        p_entry_id,
        v_caller_id,
        p_outcome,
        trim(COALESCE(p_feedback_remarks, '')),
        clock_timestamp()
    )
    RETURNING id INTO v_verification_id;

    -- 8. Update Logbook Entry Status
    IF p_outcome = 'VERIFIED' THEN
        v_new_status := 'VERIFIED';
    ELSE
        v_new_status := 'REVISION_REQUIRED';
    END IF;

    UPDATE public.digital_logbook_entries
    SET status = v_new_status,
        updated_at = clock_timestamp()
    WHERE id = p_entry_id;

    -- 9. Record Immutable Audit Event
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
        v_verifier_role,
        CASE WHEN p_outcome = 'VERIFIED' THEN 'LOGBOOK_ENTRY_VERIFIED' ELSE 'LOGBOOK_ENTRY_RETURNED' END,
        'LOGBOOK_ENTRY',
        p_entry_id,
        jsonb_build_object('status', 'SUBMITTED'),
        jsonb_build_object(
            'status', v_new_status,
            'outcome', p_outcome,
            'verifier_role', v_verifier_role,
            'verification_id', v_verification_id
        ),
        p_feedback_remarks,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 10. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        CASE WHEN p_outcome = 'VERIFIED' THEN 'LOGBOOK_ENTRY_VERIFIED' ELSE 'LOGBOOK_ENTRY_RETURNED' END,
        'LOGBOOK_ENTRY',
        p_entry_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', v_thesis.id,
            'tracking_number', v_thesis.tracking_number,
            'outcome', p_outcome,
            'verifier_role', v_verifier_role
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 11. Create In-App Notification Message & Delivery for Student
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
        CASE WHEN p_outcome = 'VERIFIED' THEN 'WORKFLOW' ELSE 'ACTION_REQUIRED' END,
        CASE WHEN p_outcome = 'VERIFIED' THEN 'NORMAL' ELSE 'HIGH' END,
        CASE WHEN p_outcome = 'VERIFIED'
            THEN 'Logbook Entry Verified: ' || v_thesis.tracking_number
            ELSE 'Logbook Entry Revision Requested: ' || v_thesis.tracking_number
        END,
        CASE WHEN p_outcome = 'VERIFIED'
            THEN v_verifier_role || ' has verified meeting logbook entry for ' || v_thesis.tracking_number || '.'
            ELSE v_verifier_role || ' requested revisions on meeting logbook entry: ' || trim(COALESCE(p_feedback_remarks, ''))
        END,
        '/app/student/logbook',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- 12. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'entry_id', p_entry_id,
        'thesis_id', v_thesis.id,
        'outcome', p_outcome,
        'status', v_new_status,
        'verified_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 5. Mutation Function: submit_periodic_progress_report
-- Description: Student submits periodic weekly/monthly progress update.
--              Inserts immutable row into periodic_progress_reports, records
--              audit event, and notifies supervisors.
-- ============================================================================
DROP FUNCTION IF EXISTS public.submit_periodic_progress_report(UUID, VARCHAR, DATE, DATE, TEXT, TEXT, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.submit_periodic_progress_report(
    p_thesis_id UUID,
    p_report_type VARCHAR,
    p_period_start DATE,
    p_period_end DATE,
    p_summary_work_done TEXT,
    p_milestones_achieved TEXT,
    p_issues_faced TEXT DEFAULT NULL,
    p_client_ip VARCHAR DEFAULT '127.0.0.1',
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
    v_report_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
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
        RAISE EXCEPTION 'Forbidden: Only the candidate student of record can submit periodic progress reports.' USING ERRCODE = '42501';
    END IF;

    -- 3. Stage guard
    IF v_thesis.current_stage != 'RESEARCH_AND_PROGRESS_STAGE' THEN
        RAISE EXCEPTION 'InvalidState: Periodic progress reporting is only active during RESEARCH_AND_PROGRESS_STAGE (current stage: %).', v_thesis.current_stage USING ERRCODE = '23514';
    END IF;

    -- 4. Validate parameters
    IF p_report_type NOT IN ('WEEKLY', 'MONTHLY') THEN
        RAISE EXCEPTION 'Validation failed: Invalid report type % (expected WEEKLY or MONTHLY).', p_report_type USING ERRCODE = '22023';
    END IF;

    IF p_period_start IS NULL OR p_period_end IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Reporting period start and end dates are mandatory.' USING ERRCODE = '23502';
    END IF;

    IF p_period_start >= p_period_end THEN
        RAISE EXCEPTION 'Validation failed: Period start date must precede period end date.' USING ERRCODE = '23514';
    END IF;

    IF trim(COALESCE(p_summary_work_done, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Summary of work done is mandatory.' USING ERRCODE = '23502';
    END IF;

    IF trim(COALESCE(p_milestones_achieved, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Milestones achieved is mandatory.' USING ERRCODE = '23502';
    END IF;

    -- 5. Insert immutable progress report
    INSERT INTO public.periodic_progress_reports (
        thesis_id,
        student_id,
        report_type,
        period_start,
        period_end,
        summary_work_done,
        milestones_achieved,
        issues_faced,
        status,
        submitted_at
    )
    VALUES (
        p_thesis_id,
        v_caller_id,
        p_report_type,
        p_period_start,
        p_period_end,
        trim(p_summary_work_done),
        trim(p_milestones_achieved),
        trim(COALESCE(p_issues_faced, '')),
        'SUBMITTED',
        clock_timestamp()
    )
    RETURNING id INTO v_report_id;

    -- 6. Record Immutable Audit Event
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
        'PROGRESS_REPORT_SUBMITTED',
        'PERIODIC_PROGRESS_REPORT',
        v_report_id,
        jsonb_build_object('status', 'NONE'),
        jsonb_build_object(
            'status', 'SUBMITTED',
            'report_type', p_report_type,
            'period_start', p_period_start,
            'period_end', p_period_end
        ),
        NULL,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 7. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'PROGRESS_REPORT_SUBMITTED',
        'PERIODIC_PROGRESS_REPORT',
        v_report_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'report_type', p_report_type,
            'period_start', p_period_start,
            'period_end', p_period_end
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 8. Create In-App Notification Message & Deliveries for Guide and Co-Guide
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
        'NORMAL',
        p_report_type || ' Progress Report Submitted: ' || v_thesis.tracking_number,
        'Candidate has submitted a ' || lower(p_report_type) || ' progress update for dissertation ' || v_thesis.tracking_number || '.',
        '/app/guide/progress',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    IF v_thesis.guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    IF v_thesis.co_guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- 9. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'report_id', v_report_id,
        'thesis_id', p_thesis_id,
        'report_type', p_report_type,
        'status', 'SUBMITTED',
        'submitted_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 6. Mutation Function: acknowledge_periodic_progress_report
-- Description: Supervisor reviews and acknowledges periodic progress report.
--              Records PROGRESS_REPORT_ACKNOWLEDGED in audit_events and
--              academic_events, delivers notification to candidate, WITHOUT
--              modifying the append-only periodic_progress_reports table.
-- ============================================================================
DROP FUNCTION IF EXISTS public.acknowledge_periodic_progress_report(UUID, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.acknowledge_periodic_progress_report(
    p_report_id UUID,
    p_remarks TEXT DEFAULT NULL,
    p_client_ip VARCHAR DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_report public.periodic_progress_reports%ROWTYPE;
    v_thesis public.theses%ROWTYPE;
    v_supervisor_role VARCHAR(16);
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch report
    SELECT * INTO v_report
    FROM public.periodic_progress_reports
    WHERE id = p_report_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Progress report % not found.', p_report_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = v_report.thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Associated thesis % not found.', v_report.thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Authorize supervisor
    IF v_caller_id = v_thesis.guide_id THEN
        v_supervisor_role := 'GUIDE';
    ELSIF v_caller_id = v_thesis.co_guide_id THEN
        v_supervisor_role := 'CO_GUIDE';
    ELSE
        RAISE EXCEPTION 'Forbidden: Caller is not an assigned supervisor (Guide or Co-Guide) for thesis %.', v_thesis.tracking_number USING ERRCODE = '42501';
    END IF;

    -- 5. Check if already acknowledged
    IF EXISTS (
        SELECT 1 FROM public.audit_events ae
        WHERE ae.action_code = 'PROGRESS_REPORT_ACKNOWLEDGED'
          AND ae.target_entity_id = p_report_id
    ) THEN
        RETURN jsonb_build_object(
            'success', TRUE,
            'report_id', p_report_id,
            'thesis_id', v_thesis.id,
            'status', 'ACKNOWLEDGED',
            'message', 'Report already acknowledged.'
        );
    END IF;

    -- 6. Record Immutable Audit Event (without modifying append-only periodic_progress_reports)
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
        'PROGRESS_REPORT_ACKNOWLEDGED',
        'PERIODIC_PROGRESS_REPORT',
        p_report_id,
        jsonb_build_object('status', 'SUBMITTED'),
        jsonb_build_object(
            'status', 'ACKNOWLEDGED',
            'supervisor_role', v_supervisor_role,
            'remarks', trim(COALESCE(p_remarks, ''))
        ),
        p_remarks,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 7. Emit Academic Domain Event
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'PROGRESS_REPORT_ACKNOWLEDGED',
        'PERIODIC_PROGRESS_REPORT',
        p_report_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', v_thesis.id,
            'tracking_number', v_thesis.tracking_number,
            'supervisor_role', v_supervisor_role,
            'remarks', p_remarks
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 8. Create In-App Notification Message & Delivery for Student
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
        v_report.report_type || ' Progress Report Acknowledged: ' || v_thesis.tracking_number,
        v_supervisor_role || ' has reviewed and acknowledged your ' || lower(v_report.report_type) || ' progress update.',
        '/app/student/progress',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- 9. Return JSON payload
    RETURN jsonb_build_object(
        'success', TRUE,
        'report_id', p_report_id,
        'thesis_id', v_thesis.id,
        'status', 'ACKNOWLEDGED',
        'acknowledged_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 7. Explicit Permissions & Execution Hardening
-- ============================================================================
REVOKE ALL ON FUNCTION public.get_digital_logbook_workspace(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_digital_logbook_workspace(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.save_digital_logbook_entry_draft(UUID, UUID, VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, TEXT, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_digital_logbook_entry_draft(UUID, UUID, VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, TEXT, DATE) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_digital_logbook_entry(UUID, UUID, VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, TEXT, DATE, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_digital_logbook_entry(UUID, UUID, VARCHAR, TEXT, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, TEXT, DATE, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.verify_digital_logbook_entry(UUID, VARCHAR, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_digital_logbook_entry(UUID, VARCHAR, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_periodic_progress_report(UUID, VARCHAR, DATE, DATE, TEXT, TEXT, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_periodic_progress_report(UUID, VARCHAR, DATE, DATE, TEXT, TEXT, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.acknowledge_periodic_progress_report(UUID, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.acknowledge_periodic_progress_report(UUID, TEXT, VARCHAR, TEXT) TO authenticated;


-- ============================================================================
-- 8. Test Helper Function: reset_digital_logbook_for_testing
-- Description: Cleanly clears logbook entries, verifications, and progress reports
--              for test suite isolation.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_digital_logbook_for_testing(p_thesis_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    ALTER TABLE public.logbook_verifications DISABLE TRIGGER trg_immutable_logbook_verifications;
    DELETE FROM public.logbook_verifications WHERE logbook_entry_id IN (
        SELECT id FROM public.digital_logbook_entries WHERE thesis_id = p_thesis_id
    );
    ALTER TABLE public.logbook_verifications ENABLE TRIGGER trg_immutable_logbook_verifications;

    DELETE FROM public.digital_logbook_entries WHERE thesis_id = p_thesis_id;

    ALTER TABLE public.periodic_progress_reports DISABLE TRIGGER trg_immutable_periodic_progress;
    DELETE FROM public.periodic_progress_reports WHERE thesis_id = p_thesis_id;
    ALTER TABLE public.periodic_progress_reports ENABLE TRIGGER trg_immutable_periodic_progress;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_digital_logbook_for_testing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_digital_logbook_for_testing(UUID) TO authenticated;
