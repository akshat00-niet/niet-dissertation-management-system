-- Migration: 025_annexure_5_submission_workflow_rpc.sql
-- Description: Production Workflow RPC Layer for Final Dissertation Submission (Annexure 5),
--              Turnitin/DrillBit Similarity Compliance Verification, Dual Supervisor Endorsements,
--              and Automatic Transition to Annexure 6 Confidential Evaluation Stage.
-- Phase: Phase 5L-A (Database & Workflow RPC Layer)
-- Target Engine: PostgreSQL 15+ (Supabase Self-Hosted / Cloud)
-- Security: SECURITY DEFINER, Explicit search_path = public, pg_temp, RBAC Enforced via auth.uid()

-- ============================================================================
-- 1. Mutation Function: submit_annexure_5_package
-- Description: Allows student candidate to formally submit their final dissertation package
--              including manuscript PDF, synopsis PDF, similarity certificate PDF,
--              artifact/repository URL, and originality percentages (<10% Plagiarism, 0% AI).
-- ============================================================================
DROP FUNCTION IF EXISTS public.submit_annexure_5_package(UUID, UUID, UUID, UUID, TEXT, FLOAT, FLOAT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.submit_annexure_5_package(
    p_thesis_id UUID,
    p_manuscript_document_id UUID,
    p_synopsis_document_id UUID,
    p_similarity_certificate_id UUID,
    p_repository_url TEXT DEFAULT NULL,
    p_plagiarism_percentage FLOAT DEFAULT 0.0,
    p_ai_similarity_percentage FLOAT DEFAULT 0.0,
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
    v_ann5_id UUID;
    v_doc_manuscript RECORD;
    v_doc_synopsis RECORD;
    v_doc_cert RECORD;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Verify student ownership
    IF v_thesis.student_id != v_caller_id THEN
        RAISE EXCEPTION 'Forbidden: Only the assigned student candidate can submit Annexure 5.' USING ERRCODE = '42501';
    END IF;

    -- 4. Verify lifecycle state guard (must be in ANNEXURE_5_PREPARATION)
    IF v_thesis.current_state != 'ANNEXURE_5_PREPARATION' THEN
        RAISE EXCEPTION 'InvalidState: Thesis % is in state % (must be ANNEXURE_5_PREPARATION to submit Annexure 5).',
            v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 5. Verify Guide allocation
    IF v_thesis.guide_id IS NULL THEN
        RAISE EXCEPTION 'InvalidState: Thesis must have an allocated Primary Guide before submitting Annexure 5.' USING ERRCODE = '23514';
    END IF;

    -- 6. Validate mandatory document inputs
    IF p_manuscript_document_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Manuscript document ID is mandatory.' USING ERRCODE = '23502';
    END IF;
    IF p_synopsis_document_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Synopsis document ID is mandatory.' USING ERRCODE = '23502';
    END IF;
    IF p_similarity_certificate_id IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Similarity certificate document ID is mandatory.' USING ERRCODE = '23502';
    END IF;

    -- 7. Validate Plagiarism and AI Similarity institutional benchmarks
    IF p_plagiarism_percentage IS NULL OR p_plagiarism_percentage < 0.0 OR p_plagiarism_percentage >= 10.0 THEN
        RAISE EXCEPTION 'Validation failed: Plagiarism similarity percentage must be >= 0.0 and < 10.0 (received %).',
            p_plagiarism_percentage USING ERRCODE = '23514';
    END IF;

    IF p_ai_similarity_percentage IS NULL OR p_ai_similarity_percentage != 0.0 THEN
        RAISE EXCEPTION 'Validation failed: AI content similarity percentage must be strictly 0.0 (received %).',
            p_ai_similarity_percentage USING ERRCODE = '23514';
    END IF;

    -- 8. Validate Document references and types
    SELECT * INTO v_doc_manuscript
    FROM public.documents
    WHERE id = p_manuscript_document_id AND thesis_id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Manuscript document % not found for this thesis.', p_manuscript_document_id USING ERRCODE = 'P0002';
    END IF;
    IF v_doc_manuscript.document_type != 'THESIS_MANUSCRIPT_ANNEXURE_5' THEN
        RAISE EXCEPTION 'Validation failed: Document % is not of type THESIS_MANUSCRIPT_ANNEXURE_5.', p_manuscript_document_id USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_doc_synopsis
    FROM public.documents
    WHERE id = p_synopsis_document_id AND thesis_id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Synopsis document % not found for this thesis.', p_synopsis_document_id USING ERRCODE = 'P0002';
    END IF;
    IF v_doc_synopsis.document_type != 'SYNOPSIS_DOCUMENT' THEN
        RAISE EXCEPTION 'Validation failed: Document % is not of type SYNOPSIS_DOCUMENT.', p_synopsis_document_id USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_doc_cert
    FROM public.documents
    WHERE id = p_similarity_certificate_id AND thesis_id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Similarity certificate document % not found for this thesis.', p_similarity_certificate_id USING ERRCODE = 'P0002';
    END IF;
    IF v_doc_cert.document_type != 'SIMILARITY_CERTIFICATE' THEN
        RAISE EXCEPTION 'Validation failed: Document % is not of type SIMILARITY_CERTIFICATE.', p_similarity_certificate_id USING ERRCODE = '23514';
    END IF;

    -- 9. Upsert into annexure_5_submissions
    INSERT INTO public.annexure_5_submissions (
        thesis_id,
        manuscript_document_id,
        synopsis_document_id,
        similarity_certificate_id,
        repository_url,
        plagiarism_percentage,
        ai_similarity_percentage,
        status,
        submitted_at
    )
    VALUES (
        p_thesis_id,
        p_manuscript_document_id,
        p_synopsis_document_id,
        p_similarity_certificate_id,
        trim(p_repository_url),
        p_plagiarism_percentage,
        p_ai_similarity_percentage,
        'SUBMITTED',
        clock_timestamp()
    )
    ON CONFLICT (thesis_id) DO UPDATE
    SET manuscript_document_id = EXCLUDED.manuscript_document_id,
        synopsis_document_id = EXCLUDED.synopsis_document_id,
        similarity_certificate_id = EXCLUDED.similarity_certificate_id,
        repository_url = EXCLUDED.repository_url,
        plagiarism_percentage = EXCLUDED.plagiarism_percentage,
        ai_similarity_percentage = EXCLUDED.ai_similarity_percentage,
        status = 'SUBMITTED',
        submitted_at = EXCLUDED.submitted_at
    RETURNING id INTO v_ann5_id;

    -- 10. Advance Thesis state to ANNEXURE_5_SUBMITTED
    UPDATE public.theses
    SET current_state = 'ANNEXURE_5_SUBMITTED',
        current_stage = 'FINAL_SUBMISSION_STAGE',
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 11. Record Immutable Audit Event
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
        'ANNEXURE_5_SUBMITTED',
        'ANNEXURE_5',
        v_ann5_id,
        jsonb_build_object('current_state', v_thesis.current_state),
        jsonb_build_object(
            'current_state', 'ANNEXURE_5_SUBMITTED',
            'annexure_5_id', v_ann5_id,
            'plagiarism_percentage', p_plagiarism_percentage,
            'ai_similarity_percentage', p_ai_similarity_percentage,
            'repository_url', p_repository_url
        ),
        'Student submitted final dissertation manuscript and similarity certificate for supervisor endorsement.',
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
        'ANNEXURE_5_SUBMITTED',
        'theses',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'annexure_5_id', v_ann5_id,
            'plagiarism_percentage', p_plagiarism_percentage,
            'ai_similarity_percentage', p_ai_similarity_percentage
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 13. Create In-App Notifications for Guide and Co-Guide
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
        'FINAL_SUBMISSION',
        'HIGH',
        'Annexure 5 Submitted for Endorsement: ' || v_thesis.tracking_number,
        'Candidate has submitted final dissertation manuscript (Plagiarism: ' || p_plagiarism_percentage || '%, AI: ' || p_ai_similarity_percentage || '%). Supervisory endorsement required.',
        '/app/guide/theses',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());

    IF v_thesis.co_guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- 14. Return Structured Result
    RETURN jsonb_build_object(
        'success', TRUE,
        'annexure_5_id', v_ann5_id,
        'thesis_id', p_thesis_id,
        'current_state', 'ANNEXURE_5_SUBMITTED',
        'current_stage', 'FINAL_SUBMISSION_STAGE',
        'plagiarism_percentage', p_plagiarism_percentage,
        'ai_similarity_percentage', p_ai_similarity_percentage,
        'submitted_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 2. Mutation Function: endorse_annexure_5_submission
-- Description: Electronic sign-off by Primary Guide or Co-Guide on Annexure 5.
--              If both required supervisors have endorsed (or Guide if no Co-Guide),
--              transitions thesis state automatically to ANNEXURE_6_PENDING
--              in CONFIDENTIAL_EVALUATION_STAGE.
-- ============================================================================
DROP FUNCTION IF EXISTS public.endorse_annexure_5_submission(UUID, BOOLEAN, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.endorse_annexure_5_submission(
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
    v_endorsement_id UUID;
    v_endorsed_count INT := 0;
    v_required_count INT := 1;
    v_is_fully_endorsed BOOLEAN := FALSE;
    v_new_thesis_state VARCHAR(64);
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
    v_hod_user_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Lock thesis row with FOR UPDATE
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Determine and validate supervisor assignment
    IF v_caller_id = v_thesis.guide_id THEN
        v_supervisor_role := 'GUIDE';
    ELSIF v_thesis.co_guide_id IS NOT NULL AND v_caller_id = v_thesis.co_guide_id THEN
        v_supervisor_role := 'CO_GUIDE';
    ELSE
        RAISE EXCEPTION 'Forbidden: Caller is not an assigned supervisor (Guide/Co-Guide) for thesis %.', p_thesis_id USING ERRCODE = '42501';
    END IF;

    -- 4. Lifecycle state guard
    IF v_thesis.current_state != 'ANNEXURE_5_SUBMITTED' THEN
        RAISE EXCEPTION 'InvalidState: Cannot endorse Annexure 5 for thesis % in state % (expected ANNEXURE_5_SUBMITTED).',
            v_thesis.tracking_number, v_thesis.current_state USING ERRCODE = '23514';
    END IF;

    -- 5. Validate input parameters
    IF p_is_endorsed IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Endorsement decision (is_endorsed) is required.' USING ERRCODE = '23502';
    END IF;

    IF p_is_endorsed IS FALSE AND trim(COALESCE(p_remarks, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Formal remarks are mandatory when requesting revision on Annexure 5.' USING ERRCODE = '23514';
    END IF;

    -- 6. Branch based on endorsement decision
    IF p_is_endorsed IS FALSE THEN
        -- Supervisor requested changes -> Return to ANNEXURE_5_PREPARATION
        v_new_thesis_state := 'ANNEXURE_5_PREPARATION';

        UPDATE public.theses
        SET current_state = 'ANNEXURE_5_PREPARATION',
            updated_at = clock_timestamp()
        WHERE id = p_thesis_id;

        UPDATE public.annexure_5_submissions
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
            'ANNEXURE_5_REVISION_REQUESTED',
            'ANNEXURE_5',
            p_thesis_id,
            jsonb_build_object('current_state', 'ANNEXURE_5_SUBMITTED'),
            jsonb_build_object(
                'current_state', 'ANNEXURE_5_PREPARATION',
                'supervisor_role', v_supervisor_role,
                'remarks', p_remarks
            ),
            p_remarks,
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
            'ANNEXURE_5_REVISION_REQUESTED',
            'theses',
            p_thesis_id,
            v_caller_id,
            jsonb_build_object(
                'thesis_id', p_thesis_id,
                'supervisor_role', v_supervisor_role,
                'remarks', p_remarks,
                'tracking_number', v_thesis.tracking_number
            ),
            clock_timestamp()
        )
        RETURNING id INTO v_academic_event_id;

        -- Notify Student and Collaborating Supervisor
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
            'Annexure 5 Revision Requested: ' || v_thesis.tracking_number,
            v_supervisor_role || ' has requested corrections on Annexure 5: ' || p_remarks,
            '/app/student/defenses',
            clock_timestamp()
        )
        RETURNING id INTO v_notif_msg_id;

        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp());

        IF v_supervisor_role = 'GUIDE' AND v_thesis.co_guide_id IS NOT NULL THEN
            INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
            VALUES (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
        ELSIF v_supervisor_role = 'CO_GUIDE' THEN
            INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
            VALUES (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());
        END IF;

        RETURN jsonb_build_object(
            'success', TRUE,
            'action', 'REVISION_REQUESTED',
            'thesis_id', p_thesis_id,
            'current_state', 'ANNEXURE_5_PREPARATION',
            'supervisor_role', v_supervisor_role,
            'remarks', p_remarks
        );
    END IF;

    -- 7. Positive Endorsement -> Insert into supervisor_endorsements
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
        'ANNEXURE_5',
        TRUE,
        p_remarks,
        clock_timestamp()
    )
    RETURNING id INTO v_endorsement_id;

    -- 8. Check Required Endorsement Count
    IF v_thesis.co_guide_id IS NOT NULL THEN
        v_required_count := 2;
    ELSE
        v_required_count := 1;
    END IF;

    SELECT count(*) INTO v_endorsed_count
    FROM public.supervisor_endorsements
    WHERE thesis_id = p_thesis_id
      AND stage = 'ANNEXURE_5'
      AND is_endorsed = TRUE
      AND faculty_id IN (v_thesis.guide_id, COALESCE(v_thesis.co_guide_id, v_thesis.guide_id));

    IF v_endorsed_count >= v_required_count THEN
        v_is_fully_endorsed := TRUE;
        v_new_thesis_state := 'ANNEXURE_6_PENDING';

        -- Advance Thesis to CONFIDENTIAL_EVALUATION_STAGE and ANNEXURE_6_PENDING
        UPDATE public.theses
        SET current_state = 'ANNEXURE_6_PENDING',
            current_stage = 'CONFIDENTIAL_EVALUATION_STAGE',
            updated_at = clock_timestamp()
        WHERE id = p_thesis_id;

        UPDATE public.annexure_5_submissions
        SET status = 'SUPERVISOR_ENDORSED'
        WHERE thesis_id = p_thesis_id;
    ELSE
        v_is_fully_endorsed := FALSE;
        v_new_thesis_state := 'ANNEXURE_5_SUBMITTED';
    END IF;

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
        v_supervisor_role,
        'ANNEXURE_5_ENDORSED',
        'ANNEXURE_5',
        v_endorsement_id,
        jsonb_build_object('current_state', 'ANNEXURE_5_SUBMITTED'),
        jsonb_build_object(
            'current_state', v_new_thesis_state,
            'supervisor_role', v_supervisor_role,
            'is_fully_endorsed', v_is_fully_endorsed,
            'endorsed_count', v_endorsed_count,
            'required_count', v_required_count,
            'remarks', p_remarks
        ),
        p_remarks,
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
        CASE WHEN v_is_fully_endorsed THEN 'ANNEXURE_5_SUPERVISOR_ENDORSED' ELSE 'ANNEXURE_5_PARTIALLY_ENDORSED' END,
        'theses',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'supervisor_role', v_supervisor_role,
            'is_fully_endorsed', v_is_fully_endorsed,
            'endorsed_count', v_endorsed_count,
            'required_count', v_required_count
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 11. Dispatch In-App Notifications
    IF v_is_fully_endorsed THEN
        -- Resolve HOD for Department Notification
        SELECT ura.user_id INTO v_hod_user_id
        FROM public.user_role_assignments ura
        WHERE ura.department_id = v_thesis.department_id
          AND ura.role_id = 'HOD'
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
            'FINAL_SUBMISSION',
            'NORMAL',
            'Annexure 5 Endorsed: ' || v_thesis.tracking_number,
            'All supervisory endorsements completed for dissertation ' || v_thesis.tracking_number || '. Unlocked Annexure 6 evaluation.',
            '/app/guide/theses',
            clock_timestamp()
        )
        RETURNING id INTO v_notif_msg_id;

        -- Notify Student, Guide, and HOD
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES
            (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp()),
            (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());

        IF v_hod_user_id IS NOT NULL THEN
            INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
            VALUES (v_notif_msg_id, v_hod_user_id, 'IN_APP', 'PENDING', clock_timestamp());
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'action', 'ENDORSED',
        'endorsement_id', v_endorsement_id,
        'thesis_id', p_thesis_id,
        'current_state', v_new_thesis_state,
        'is_fully_endorsed', v_is_fully_endorsed,
        'endorsed_count', v_endorsed_count,
        'required_count', v_required_count
    );
END;
$$;


-- ============================================================================
-- 3. Mutation Function: request_annexure_5_revision
-- Description: Explicit revision request endpoint for assigned Guide or Co-Guide.
--              Transitions thesis state from ANNEXURE_5_SUBMITTED -> ANNEXURE_5_PREPARATION.
-- ============================================================================
DROP FUNCTION IF EXISTS public.request_annexure_5_revision(UUID, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.request_annexure_5_revision(
    p_thesis_id UUID,
    p_revision_notes TEXT,
    p_client_ip VARCHAR(45) DEFAULT '127.0.0.1',
    p_user_agent TEXT DEFAULT 'Antigravity-Client'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN public.endorse_annexure_5_submission(
        p_thesis_id,
        FALSE,
        p_revision_notes,
        p_client_ip,
        p_user_agent
    );
END;
$$;


-- ============================================================================
-- 4. Query Function: get_annexure_5_docket
-- Description: Retrieves complete Annexure 5 dossier including submission metadata,
--              manuscript, synopsis, similarity certificate, and supervisor endorsement history.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_annexure_5_docket(UUID);
CREATE OR REPLACE FUNCTION public.get_annexure_5_docket(
    p_thesis_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_thesis public.theses%ROWTYPE;
    v_student RECORD;
    v_guide RECORD;
    v_coguide RECORD;
    v_title_record RECORD;
    v_ann5 RECORD;
    v_endorsements JSONB;
    v_manuscript_doc JSONB;
    v_synopsis_doc JSONB;
    v_cert_doc JSONB;
    v_is_authorized BOOLEAN := FALSE;
    v_has_dept_role BOOLEAN := FALSE;
    v_is_student BOOLEAN := FALSE;
    v_is_guide BOOLEAN := FALSE;
    v_is_coguide BOOLEAN := FALSE;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch thesis row
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Check caller authorization
    IF public.has_role('ADMIN') THEN
        v_is_authorized := TRUE;
    END IF;

    IF v_caller_id = v_thesis.student_id THEN
        v_is_student := TRUE;
        v_is_authorized := TRUE;
    END IF;

    IF v_caller_id = v_thesis.guide_id THEN
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
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to access Annexure 5 docket for thesis %.', p_thesis_id USING ERRCODE = '42501';
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
            fp.designation
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
            fp.designation
        INTO v_coguide
        FROM public.users u
        JOIN public.faculty_profiles fp ON fp.user_id = u.id
        WHERE u.id = v_thesis.co_guide_id;
    END IF;

    -- 7. Fetch Approved Title Record
    SELECT * INTO v_title_record
    FROM public.thesis_titles
    WHERE thesis_id = p_thesis_id;

    -- 8. Fetch Annexure 5 Submission Record
    SELECT * INTO v_ann5
    FROM public.annexure_5_submissions
    WHERE thesis_id = p_thesis_id;

    -- 9. Fetch Associated Document Details
    IF v_ann5.id IS NOT NULL THEN
        -- Manuscript Document
        SELECT jsonb_build_object(
            'document_id', d.id,
            'document_type', d.document_type,
            'version_id', dv.id,
            'version_number', dv.version_number,
            'original_filename', dv.original_filename,
            'mime_type', dv.mime_type,
            'file_size_bytes', dv.file_size_bytes,
            'sha256_checksum', dv.sha256_checksum,
            'storage_object_key', dv.storage_object_key,
            'uploaded_at', dv.created_at
        ) INTO v_manuscript_doc
        FROM public.documents d
        LEFT JOIN public.document_versions dv ON dv.id = d.current_version_id
        WHERE d.id = v_ann5.manuscript_document_id;

        -- Synopsis Document
        SELECT jsonb_build_object(
            'document_id', d.id,
            'document_type', d.document_type,
            'version_id', dv.id,
            'version_number', dv.version_number,
            'original_filename', dv.original_filename,
            'mime_type', dv.mime_type,
            'file_size_bytes', dv.file_size_bytes,
            'sha256_checksum', dv.sha256_checksum,
            'storage_object_key', dv.storage_object_key,
            'uploaded_at', dv.created_at
        ) INTO v_synopsis_doc
        FROM public.documents d
        LEFT JOIN public.document_versions dv ON dv.id = d.current_version_id
        WHERE d.id = v_ann5.synopsis_document_id;

        -- Similarity Certificate Document
        SELECT jsonb_build_object(
            'document_id', d.id,
            'document_type', d.document_type,
            'version_id', dv.id,
            'version_number', dv.version_number,
            'original_filename', dv.original_filename,
            'mime_type', dv.mime_type,
            'file_size_bytes', dv.file_size_bytes,
            'sha256_checksum', dv.sha256_checksum,
            'storage_object_key', dv.storage_object_key,
            'uploaded_at', dv.created_at
        ) INTO v_cert_doc
        FROM public.documents d
        LEFT JOIN public.document_versions dv ON dv.id = d.current_version_id
        WHERE d.id = v_ann5.similarity_certificate_id;
    END IF;

    -- 10. Fetch Supervisor Endorsements History
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', se.id,
            'faculty_id', se.faculty_id,
            'faculty_name', u.full_name,
            'supervisor_role', se.supervisor_role,
            'is_endorsed', se.is_endorsed,
            'remarks', se.remarks,
            'endorsed_at', se.endorsed_at
        ) ORDER BY se.endorsed_at ASC
    ), '[]'::jsonb) INTO v_endorsements
    FROM public.supervisor_endorsements se
    JOIN public.users u ON u.id = se.faculty_id
    WHERE se.thesis_id = p_thesis_id AND se.stage = 'ANNEXURE_5';

    -- 11. Assemble Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'thesis', jsonb_build_object(
            'id', v_thesis.id,
            'tracking_number', v_thesis.tracking_number,
            'department_id', v_thesis.department_id,
            'current_state', v_thesis.current_state,
            'current_stage', v_thesis.current_stage,
            'student', jsonb_build_object(
                'id', v_student.id,
                'name', v_student.full_name,
                'email', v_student.email,
                'roll_number', v_student.roll_number,
                'enrollment_number', v_student.enrollment_number,
                'batch', v_student.batch
            ),
            'guide', CASE WHEN v_guide.id IS NOT NULL THEN jsonb_build_object(
                'id', v_guide.id,
                'name', v_guide.full_name,
                'email', v_guide.email,
                'employee_code', v_guide.employee_code,
                'designation', v_guide.designation
            ) ELSE NULL END,
            'co_guide', CASE WHEN v_coguide.id IS NOT NULL THEN jsonb_build_object(
                'id', v_coguide.id,
                'name', v_coguide.full_name,
                'email', v_coguide.email,
                'employee_code', v_coguide.employee_code,
                'designation', v_coguide.designation
            ) ELSE NULL END,
            'approved_title', CASE WHEN v_title_record.id IS NOT NULL THEN v_title_record.final_approved_title ELSE NULL END
        ),
        'annexure_5', CASE WHEN v_ann5.id IS NOT NULL THEN jsonb_build_object(
            'id', v_ann5.id,
            'thesis_id', v_ann5.thesis_id,
            'repository_url', v_ann5.repository_url,
            'plagiarism_percentage', v_ann5.plagiarism_percentage,
            'ai_similarity_percentage', v_ann5.ai_similarity_percentage,
            'status', v_ann5.status,
            'submitted_at', v_ann5.submitted_at,
            'manuscript_document', v_manuscript_doc,
            'synopsis_document', v_synopsis_doc,
            'similarity_certificate_document', v_cert_doc
        ) ELSE NULL END,
        'endorsements', v_endorsements,
        'permissions', jsonb_build_object(
            'is_student', v_is_student,
            'is_guide', v_is_guide,
            'is_coguide', v_is_coguide,
            'can_submit', (v_is_student AND v_thesis.current_state = 'ANNEXURE_5_PREPARATION'),
            'can_endorse', ((v_is_guide OR v_is_coguide) AND v_thesis.current_state = 'ANNEXURE_5_SUBMITTED')
        )
    );
END;
$$;


-- ============================================================================
-- 5. Query Function: list_department_annexure_5_submissions
-- Description: Department cohort overview of final dissertation submissions.
-- ============================================================================
DROP FUNCTION IF EXISTS public.list_department_annexure_5_submissions(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION public.list_department_annexure_5_submissions(
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
    v_is_authorized BOOLEAN := FALSE;
    v_records JSONB;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate department authority
    IF public.has_role('ADMIN') THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.user_role_assignments ura
            WHERE ura.user_id = v_caller_id
              AND ura.department_id = p_department_id
              AND ura.role_id IN ('HOD', 'DHOD', 'DC', 'DCEC_MEMBER', 'GUIDE', 'CO_GUIDE')
              AND ura.is_active = TRUE
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to list final submissions for department %.', p_department_id USING ERRCODE = '42501';
    END IF;

    -- 3. Query Cohort Final Submissions
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'thesis_id', t.id,
            'tracking_number', t.tracking_number,
            'current_state', t.current_state,
            'current_stage', t.current_stage,
            'student_id', u_stu.id,
            'student_name', u_stu.full_name,
            'roll_number', sp.roll_number,
            'guide_id', u_gui.id,
            'guide_name', u_gui.full_name,
            'co_guide_id', u_cog.id,
            'co_guide_name', u_cog.full_name,
            'approved_title', tt.final_approved_title,
            'annexure_5_id', a5.id,
            'plagiarism_percentage', a5.plagiarism_percentage,
            'ai_similarity_percentage', a5.ai_similarity_percentage,
            'submission_status', a5.status,
            'submitted_at', a5.submitted_at
        ) ORDER BY t.tracking_number ASC
    ), '[]'::jsonb) INTO v_records
    FROM public.theses t
    JOIN public.users u_stu ON u_stu.id = t.student_id
    JOIN public.student_profiles sp ON sp.user_id = u_stu.id
    LEFT JOIN public.users u_gui ON u_gui.id = t.guide_id
    LEFT JOIN public.users u_cog ON u_cog.id = t.co_guide_id
    LEFT JOIN public.thesis_titles tt ON tt.thesis_id = t.id
    LEFT JOIN public.annexure_5_submissions a5 ON a5.thesis_id = t.id
    WHERE t.department_id = p_department_id
      AND (
          p_status IS NULL OR p_status = 'ALL'
          OR (p_status = 'SUBMITTED' AND t.current_state = 'ANNEXURE_5_SUBMITTED')
          OR (p_status = 'PREPARATION' AND t.current_state = 'ANNEXURE_5_PREPARATION')
          OR (p_status = 'ENDORSED' AND t.current_state IN ('ANNEXURE_5_SUPERVISOR_ENDORSED', 'ANNEXURE_6_PENDING'))
      );

    RETURN jsonb_build_object(
        'success', TRUE,
        'department_id', p_department_id,
        'count', jsonb_array_length(v_records),
        'data', v_records
    );
END;
$$;


-- ============================================================================
-- 6. Test Helper Function: reset_annexure_5_for_testing
-- Description: Cleanly clears Annexure 5 submissions and endorsements
--              for test suite isolation without violating production triggers.
-- ============================================================================
DROP FUNCTION IF EXISTS public.reset_annexure_5_for_testing(UUID);
CREATE OR REPLACE FUNCTION public.reset_annexure_5_for_testing(p_thesis_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    SET LOCAL session_replication_role = replica;
    DELETE FROM public.supervisor_endorsements WHERE thesis_id = p_thesis_id AND stage = 'ANNEXURE_5';
    DELETE FROM public.annexure_5_submissions WHERE thesis_id = p_thesis_id;
    UPDATE public.theses
    SET current_state = 'ANNEXURE_5_PREPARATION',
        current_stage = 'FINAL_SUBMISSION_STAGE'
    WHERE id = p_thesis_id;
END;
$$;


-- ============================================================================
-- Permissions Hardening: REVOKE PUBLIC, GRANT authenticated
-- ============================================================================
REVOKE ALL ON FUNCTION public.submit_annexure_5_package(UUID, UUID, UUID, UUID, TEXT, FLOAT, FLOAT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_annexure_5_package(UUID, UUID, UUID, UUID, TEXT, FLOAT, FLOAT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.endorse_annexure_5_submission(UUID, BOOLEAN, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.endorse_annexure_5_submission(UUID, BOOLEAN, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.request_annexure_5_revision(UUID, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_annexure_5_revision(UUID, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_annexure_5_docket(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_annexure_5_docket(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.list_department_annexure_5_submissions(UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_department_annexure_5_submissions(UUID, VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.reset_annexure_5_for_testing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_annexure_5_for_testing(UUID) TO authenticated;
