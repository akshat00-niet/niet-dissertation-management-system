-- Migration: 024_milestone_rubric_evaluation_rpc.sql
-- Description: Atomic PostgreSQL RPCs for Dynamic 4-Column Rubrics and Milestone Presentations (P1, P2, P3) Workflows
-- Target Engine: PostgreSQL 15+ (Hosted via Supabase)
-- Phase: 5K-A

-- ============================================================================
-- 1. Mutation Function: create_rubric_version_draft
-- Description: System Administrator creates a master rubric or new version draft
--              with dimensional criteria rows and dynamic 4-column achievement tiers.
--              Validates schema, /100 score model, level indices (1..4), and score percentages.
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_rubric_version_draft(UUID, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.create_rubric_version_draft(
    p_department_id UUID,
    p_milestone_type VARCHAR,
    p_title VARCHAR,
    p_criteria JSONB,
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
    v_is_admin BOOLEAN := FALSE;
    v_rubric_id UUID;
    v_rubric_version_id UUID;
    v_version_number INT := 1;
    v_crit_elem JSONB;
    v_level_elem JSONB;
    v_criterion_id UUID;
    v_seq_order INT := 0;
    v_levels JSONB;
    v_level_idx INT;
    v_score_pct FLOAT;
    v_max_marks FLOAT;
    v_correlation_id UUID := gen_random_uuid();
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate ADMIN Authorization
    SELECT public.has_role('ADMIN') INTO v_is_admin;
    IF NOT v_is_admin THEN
        RAISE EXCEPTION 'Forbidden: Only system administrators can create or configure rubric drafts.' USING ERRCODE = '42501';
    END IF;

    -- 3. Validate Inputs
    IF NOT EXISTS (SELECT 1 FROM public.departments WHERE id = p_department_id) THEN
        RAISE EXCEPTION 'NotFound: Department % does not exist.', p_department_id USING ERRCODE = 'P0002';
    END IF;

    IF p_milestone_type NOT IN ('P1', 'P2', 'P3', 'FINAL_VIVA') THEN
        RAISE EXCEPTION 'Validation failed: Invalid milestone type % (must be P1, P2, P3, or FINAL_VIVA).', p_milestone_type USING ERRCODE = '23514';
    END IF;

    IF trim(COALESCE(p_title, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Rubric title is mandatory.' USING ERRCODE = '23502';
    END IF;

    IF p_criteria IS NULL OR jsonb_typeof(p_criteria) != 'array' OR jsonb_array_length(p_criteria) = 0 THEN
        RAISE EXCEPTION 'Validation failed: Rubric must contain at least one criterion.' USING ERRCODE = '23502';
    END IF;

    -- 4. Find or Create Master Rubric Header
    SELECT id INTO v_rubric_id
    FROM public.rubrics
    WHERE department_id = p_department_id AND milestone_type = p_milestone_type
    LIMIT 1;

    IF v_rubric_id IS NULL THEN
        INSERT INTO public.rubrics (
            department_id,
            milestone_type,
            title,
            max_score,
            created_at
        )
        VALUES (
            p_department_id,
            p_milestone_type,
            trim(p_title),
            100.0,
            clock_timestamp()
        )
        RETURNING id INTO v_rubric_id;
    END IF;

    -- 5. Calculate Next Version Index
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_version_number
    FROM public.rubric_versions
    WHERE rubric_id = v_rubric_id;

    -- 6. Insert Rubric Version Draft (Unpublished)
    INSERT INTO public.rubric_versions (
        rubric_id,
        version_number,
        is_published,
        effective_from,
        created_at
    )
    VALUES (
        v_rubric_id,
        v_version_number,
        FALSE,
        CURRENT_DATE,
        clock_timestamp()
    )
    RETURNING id INTO v_rubric_version_id;

    -- 7. Insert Criteria and Dynamic 4 Achievement Levels
    FOR v_crit_elem IN SELECT * FROM jsonb_array_elements(p_criteria)
    LOOP
        v_seq_order := v_seq_order + 1;
        v_max_marks := (v_crit_elem->>'max_marks')::FLOAT;

        IF v_max_marks IS NULL OR v_max_marks <= 0.0 OR v_max_marks > 100.0 THEN
            RAISE EXCEPTION 'Validation failed: Criterion max_marks must be between 0.0 and 100.0.' USING ERRCODE = '23514';
        END IF;

        IF trim(COALESCE(v_crit_elem->>'criterion_title', '')) = '' THEN
            RAISE EXCEPTION 'Validation failed: Criterion title cannot be empty.' USING ERRCODE = '23502';
        END IF;

        -- Insert Criterion
        INSERT INTO public.rubric_criteria (
            rubric_version_id,
            sequence_order,
            criterion_title,
            description,
            max_marks
        )
        VALUES (
            v_rubric_version_id,
            v_seq_order,
            trim(v_crit_elem->>'criterion_title'),
            trim(COALESCE(v_crit_elem->>'description', '')),
            v_max_marks
        )
        RETURNING id INTO v_criterion_id;

        -- Validate 4 Achievement Tiers
        v_levels := v_crit_elem->'achievement_levels';
        IF v_levels IS NULL OR jsonb_typeof(v_levels) != 'array' OR jsonb_array_length(v_levels) != 4 THEN
            RAISE EXCEPTION 'Validation failed: Each criterion must define exactly 4 achievement tiers (Level 1 to 4).' USING ERRCODE = '23514';
        END IF;

        FOR v_level_elem IN SELECT * FROM jsonb_array_elements(v_levels)
        LOOP
            v_level_idx := (v_level_elem->>'level_index')::INT;
            v_score_pct := (v_level_elem->>'score_percentage')::FLOAT;

            IF v_level_idx IS NULL OR v_level_idx NOT BETWEEN 1 AND 4 THEN
                RAISE EXCEPTION 'Validation failed: Achievement level_index must be between 1 and 4.' USING ERRCODE = '23514';
            END IF;

            IF v_score_pct IS NULL OR v_score_pct < 0.0 OR v_score_pct > 1.0 THEN
                RAISE EXCEPTION 'Validation failed: Achievement score_percentage must be between 0.0 and 1.0.' USING ERRCODE = '23514';
            END IF;

            IF trim(COALESCE(v_level_elem->>'label', '')) = '' THEN
                RAISE EXCEPTION 'Validation failed: Achievement level label cannot be empty.' USING ERRCODE = '23502';
            END IF;

            INSERT INTO public.rubric_achievement_levels (
                criterion_id,
                level_index,
                label,
                descriptor,
                score_percentage
            )
            VALUES (
                v_criterion_id,
                v_level_idx,
                trim(v_level_elem->>'label'),
                trim(COALESCE(v_level_elem->>'descriptor', '')),
                v_score_pct
            );
        END LOOP;
    END LOOP;

    -- 8. Record Immutable Audit Event
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
        'ADMIN',
        'RUBRIC_CREATED',
        'RUBRIC',
        v_rubric_id,
        NULL,
        jsonb_build_object(
            'rubric_version_id', v_rubric_version_id,
            'version_number', v_version_number,
            'milestone_type', p_milestone_type,
            'department_id', p_department_id,
            'criteria_count', v_seq_order
        ),
        NULL,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 9. Return Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'rubric_id', v_rubric_id,
        'rubric_version_id', v_rubric_version_id,
        'version_number', v_version_number,
        'milestone_type', p_milestone_type,
        'is_published', FALSE,
        'criteria_count', v_seq_order
    );
END;
$$;


-- ============================================================================
-- 2. Mutation Function: publish_rubric_version
-- Description: HOD or System Administrator formally publishes an immutable
--              rubric version. Enforces total max_marks = 100.0, marks version published,
--              supersedes past versions, records audit/domain events, and notifies faculty.
-- ============================================================================
DROP FUNCTION IF EXISTS public.publish_rubric_version(UUID, DATE, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.publish_rubric_version(
    p_rubric_version_id UUID,
    p_effective_from DATE DEFAULT CURRENT_DATE,
    p_justification TEXT DEFAULT 'Official cohort rubric publication',
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
    v_is_admin BOOLEAN := FALSE;
    v_is_hod BOOLEAN := FALSE;
    v_version_rec RECORD;
    v_total_marks FLOAT;
    v_criteria_count INT;
    v_incomplete_criteria INT;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
    v_faculty_user RECORD;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch rubric version and master rubric details
    SELECT
        rv.id,
        rv.rubric_id,
        rv.version_number,
        rv.is_published,
        rv.effective_from,
        rv.effective_until,
        r.department_id,
        r.milestone_type,
        r.title AS rubric_title
    INTO v_version_rec
    FROM public.rubric_versions rv
    JOIN public.rubrics r ON r.id = rv.rubric_id
    WHERE rv.id = p_rubric_version_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Rubric version % not found.', p_rubric_version_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Authorize caller (ADMIN or HOD of department)
    SELECT public.has_role('ADMIN') INTO v_is_admin;
    SELECT EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        WHERE ura.user_id = v_caller_id
          AND ura.department_id = v_version_rec.department_id
          AND ura.role_id = 'HOD'
          AND ura.is_active = TRUE
    ) INTO v_is_hod;

    IF NOT (v_is_admin OR v_is_hod) THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to publish rubric version for department %.', v_version_rec.department_id USING ERRCODE = '42501';
    END IF;

    -- 4. Check If Already Published
    IF v_version_rec.is_published THEN
        RAISE EXCEPTION 'InvalidState: Rubric version % is already published.', p_rubric_version_id USING ERRCODE = '23514';
    END IF;

    -- 5. Validate Criteria Marks Sum = 100.0
    SELECT COALESCE(SUM(max_marks), 0.0), COUNT(*)
    INTO v_total_marks, v_criteria_count
    FROM public.rubric_criteria
    WHERE rubric_version_id = p_rubric_version_id;

    IF v_criteria_count = 0 THEN
        RAISE EXCEPTION 'Validation failed: Cannot publish rubric version with 0 criteria.' USING ERRCODE = '23514';
    END IF;

    IF v_total_marks != 100.0 THEN
        RAISE EXCEPTION 'Cannot publish rubric version: Total criteria marks sum to %, but exactly 100.0 is required.', v_total_marks USING ERRCODE = '23514';
    END IF;

    -- 6. Validate 4 Achievement Tiers per Criterion
    SELECT COUNT(*) INTO v_incomplete_criteria
    FROM public.rubric_criteria c
    WHERE c.rubric_version_id = p_rubric_version_id
      AND (
          SELECT COUNT(*)
          FROM public.rubric_achievement_levels l
          WHERE l.criterion_id = c.id
      ) != 4;

    IF v_incomplete_criteria > 0 THEN
        RAISE EXCEPTION 'Cannot publish rubric version: Every criterion must have exactly 4 achievement levels.' USING ERRCODE = '23514';
    END IF;

    -- 7. Supersede Previously Published Versions
    UPDATE public.rubric_versions
    SET effective_until = COALESCE(p_effective_from, CURRENT_DATE)
    WHERE rubric_id = v_version_rec.rubric_id
      AND id != p_rubric_version_id
      AND is_published = TRUE
      AND (effective_until IS NULL OR effective_until > COALESCE(p_effective_from, CURRENT_DATE));

    -- 8. Publish Current Version
    UPDATE public.rubric_versions
    SET is_published = TRUE,
        effective_from = COALESCE(p_effective_from, CURRENT_DATE),
        effective_until = NULL
    WHERE id = p_rubric_version_id;

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
        CASE WHEN v_is_admin THEN 'ADMIN' ELSE 'HOD' END,
        'RUBRIC_VERSION_PUBLISHED',
        'RUBRIC_VERSION',
        p_rubric_version_id,
        jsonb_build_object('is_published', FALSE),
        jsonb_build_object(
            'is_published', TRUE,
            'version_number', v_version_rec.version_number,
            'milestone_type', v_version_rec.milestone_type,
            'total_max_score', 100.0,
            'effective_from', COALESCE(p_effective_from, CURRENT_DATE)
        ),
        p_justification,
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
        'RUBRIC_VERSION_PUBLISHED',
        'RUBRIC_VERSION',
        p_rubric_version_id,
        v_caller_id,
        jsonb_build_object(
            'rubric_id', v_version_rec.rubric_id,
            'version_number', v_version_rec.version_number,
            'milestone_type', v_version_rec.milestone_type,
            'department_id', v_version_rec.department_id,
            'effective_from', COALESCE(p_effective_from, CURRENT_DATE)
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 11. Create Notification Message for Department Faculty
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
        'GOVERNANCE',
        'INFORMATIONAL',
        'Rubric Version Published: ' || v_version_rec.milestone_type || ' (v' || v_version_rec.version_number || ')',
        'A new 4-column evaluation rubric (v' || v_version_rec.version_number || ') has been published for ' || v_version_rec.milestone_type || ' presentations in the department.',
        '/app/rubrics',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    -- Deliver to Department Faculty & Committee
    FOR v_faculty_user IN
        SELECT DISTINCT ura.user_id
        FROM public.user_role_assignments ura
        WHERE ura.department_id = v_version_rec.department_id
          AND ura.is_active = TRUE
          AND ura.role_id IN ('FACULTY', 'HOD', 'DC', 'DHOD', 'DCEC_MEMBER')
    LOOP
        INSERT INTO public.notification_deliveries (
            message_id,
            recipient_user_id,
            channel,
            delivery_status,
            created_at
        )
        VALUES (
            v_notif_msg_id,
            v_faculty_user.user_id,
            'IN_APP',
            'PENDING',
            clock_timestamp()
        );
    END LOOP;

    -- 12. Return Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'rubric_version_id', p_rubric_version_id,
        'rubric_id', v_version_rec.rubric_id,
        'version_number', v_version_rec.version_number,
        'milestone_type', v_version_rec.milestone_type,
        'is_published', TRUE,
        'effective_from', COALESCE(p_effective_from, CURRENT_DATE)
    );
END;
$$;


-- ============================================================================
-- 3. Query Function: get_active_milestone_rubric
-- Description: Retrieves the active published 4-column rubric version with its
--              criteria sequence and achievement level descriptors for a given
--              department and milestone presentation type.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_active_milestone_rubric(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION public.get_active_milestone_rubric(
    p_department_id UUID,
    p_milestone_type VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID;
    v_version RECORD;
    v_criteria_json JSONB;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch Active Published Rubric Version
    SELECT
        rv.id,
        rv.rubric_id,
        rv.version_number,
        rv.is_published,
        rv.effective_from,
        rv.effective_until,
        rv.created_at,
        r.title,
        r.max_score,
        r.milestone_type,
        r.department_id
    INTO v_version
    FROM public.rubrics r
    JOIN public.rubric_versions rv ON rv.rubric_id = r.id
    WHERE r.department_id = p_department_id
      AND r.milestone_type = p_milestone_type
      AND rv.is_published = TRUE
      AND (rv.effective_until IS NULL OR rv.effective_until >= CURRENT_DATE)
    ORDER BY rv.version_number DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'data', NULL,
            'message', 'No active published rubric found for department ' || p_department_id || ' and milestone ' || p_milestone_type
        );
    END IF;

    -- 3. Fetch Structured Criteria & 4 Achievement Levels
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'sequence_order', c.sequence_order,
            'criterion_title', c.criterion_title,
            'description', c.description,
            'max_marks', c.max_marks,
            'achievement_levels', (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', l.id,
                        'level_index', l.level_index,
                        'label', l.label,
                        'descriptor', l.descriptor,
                        'score_percentage', l.score_percentage,
                        'calculated_score', ROUND((c.max_marks * l.score_percentage)::numeric, 2)
                    ) ORDER BY l.level_index ASC
                )
                FROM public.rubric_achievement_levels l
                WHERE l.criterion_id = c.id
            )
        ) ORDER BY c.sequence_order ASC
    ) INTO v_criteria_json
    FROM public.rubric_criteria c
    WHERE c.rubric_version_id = v_version.id;

    -- 4. Return Structured Result
    RETURN jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'rubric_id', v_version.rubric_id,
            'rubric_version_id', v_version.id,
            'version_number', v_version.version_number,
            'milestone_type', v_version.milestone_type,
            'title', v_version.title,
            'max_score', v_version.max_score,
            'effective_from', v_version.effective_from,
            'criteria', COALESCE(v_criteria_json, '[]'::jsonb)
        )
    );
END;
$$;


-- ============================================================================
-- 4. Mutation Function: schedule_milestone_presentation
-- Description: Department Coordinator (or HOD) schedules a milestone presentation
--              (P1, P2, P3) for an active dissertation in RESEARCH_EXECUTION.
--              Enforces RBAC, tenancy, state guards, active rubric existence,
--              updates thesis state, logs audit/academic events, and notifies stakeholders.
-- ============================================================================
DROP FUNCTION IF EXISTS public.schedule_milestone_presentation(UUID, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.schedule_milestone_presentation(
    p_thesis_id UUID,
    p_milestone_type VARCHAR,
    p_presentation_date TIMESTAMPTZ,
    p_venue_or_url TEXT,
    p_notes TEXT DEFAULT NULL,
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
    v_is_authorized BOOLEAN := FALSE;
    v_target_state VARCHAR(64);
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
    v_dcec_member RECORD;
    v_active_rubric_version_id UUID;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate Milestone Type
    IF p_milestone_type NOT IN ('P1', 'P2', 'P3') THEN
        RAISE EXCEPTION 'Validation failed: Invalid milestone type % (must be P1, P2, or P3).', p_milestone_type USING ERRCODE = '23514';
    END IF;

    IF p_presentation_date IS NULL THEN
        RAISE EXCEPTION 'Validation failed: Presentation date/time is mandatory.' USING ERRCODE = '23502';
    END IF;

    IF trim(COALESCE(p_venue_or_url, '')) = '' THEN
        RAISE EXCEPTION 'Validation failed: Presentation venue or meeting URL is mandatory.' USING ERRCODE = '23502';
    END IF;

    -- 3. Lock and Fetch Thesis Record
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Authorize caller (DC, HOD, or ADMIN for thesis department)
    SELECT (
        public.has_role('ADMIN')
        OR EXISTS (
            SELECT 1
            FROM public.user_role_assignments ura
            WHERE ura.user_id = v_caller_id
              AND ura.department_id = v_thesis.department_id
              AND ura.role_id IN ('DC', 'HOD')
              AND ura.is_active = TRUE
        )
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to schedule milestone presentations for department %.', v_thesis.department_id USING ERRCODE = '42501';
    END IF;

    -- 5. Workflow State Guard
    IF v_thesis.current_state NOT IN ('RESEARCH_EXECUTION', 'ANNEXURE_2_DCEC_APPROVED') THEN
        RAISE EXCEPTION 'InvalidState: Thesis % is in state % (must be RESEARCH_EXECUTION to schedule % presentation).', p_thesis_id, v_thesis.current_state, p_milestone_type USING ERRCODE = '23514';
    END IF;

    -- 6. Verify Active Published Rubric Exists for Cohort
    SELECT rv.id INTO v_active_rubric_version_id
    FROM public.rubrics r
    JOIN public.rubric_versions rv ON rv.rubric_id = r.id
    WHERE r.department_id = v_thesis.department_id
      AND r.milestone_type = p_milestone_type
      AND rv.is_published = TRUE
      AND (rv.effective_until IS NULL OR rv.effective_until >= CURRENT_DATE)
    ORDER BY rv.version_number DESC
    LIMIT 1;

    IF v_active_rubric_version_id IS NULL THEN
        RAISE EXCEPTION 'InvalidState: No active published rubric version exists for % presentations in department %.', p_milestone_type, v_thesis.department_id USING ERRCODE = '23514';
    END IF;

    -- 7. Check if evaluation already recorded
    IF EXISTS (SELECT 1 FROM public.milestone_evaluations WHERE thesis_id = p_thesis_id AND milestone_type = p_milestone_type) THEN
        RAISE EXCEPTION 'InvalidState: Milestone % has already been evaluated for thesis %.', p_milestone_type, p_thesis_id USING ERRCODE = '23514';
    END IF;

    -- 8. Determine Scheduled Target State
    IF p_milestone_type = 'P1' THEN
        v_target_state := 'P1_EVALUATION_SCHEDULED';
    ELSIF p_milestone_type = 'P2' THEN
        v_target_state := 'P2_EVALUATION_SCHEDULED';
    ELSIF p_milestone_type = 'P3' THEN
        v_target_state := 'P3_EVALUATION_SCHEDULED';
    END IF;

    -- 9. Update Thesis State
    UPDATE public.theses
    SET current_state = v_target_state::thesis_state_enum,
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
        'DC',
        'MILESTONE_SCHEDULED',
        'Thesis',
        p_thesis_id,
        jsonb_build_object('current_state', v_thesis.current_state),
        jsonb_build_object(
            'current_state', v_target_state,
            'milestone_type', p_milestone_type,
            'presentation_date', p_presentation_date,
            'venue_or_url', trim(p_venue_or_url),
            'notes', trim(COALESCE(p_notes, '')),
            'rubric_version_id', v_active_rubric_version_id
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
        'MILESTONE_SCHEDULED',
        'Thesis',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'milestone_type', p_milestone_type,
            'presentation_date', p_presentation_date,
            'venue_or_url', trim(p_venue_or_url),
            'scheduled_state', v_target_state
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    -- 12. Create Notification Message
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
        'EVALUATION',
        'HIGH',
        p_milestone_type || ' Presentation Scheduled: ' || v_thesis.tracking_number,
        'Progress presentation ' || p_milestone_type || ' for dissertation ' || v_thesis.tracking_number || ' has been scheduled on ' || to_char(p_presentation_date, 'YYYY-MM-DD HH24:MI') || '.',
        '/app/student',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    -- Deliver to Student
    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- Deliver to Guide
    IF v_thesis.guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- Deliver to Co-Guide
    IF v_thesis.co_guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- Deliver to Department DCEC Members
    FOR v_dcec_member IN
        SELECT DISTINCT ura.user_id
        FROM public.user_role_assignments ura
        WHERE ura.department_id = v_thesis.department_id
          AND ura.role_id IN ('DCEC_MEMBER', 'DCEC_CHAIR')
          AND ura.is_active = TRUE
    LOOP
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_dcec_member.user_id, 'IN_APP', 'PENDING', clock_timestamp());
    END LOOP;

    -- 13. Return Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'thesis_id', p_thesis_id,
        'tracking_number', v_thesis.tracking_number,
        'milestone_type', p_milestone_type,
        'scheduled_state', v_target_state,
        'presentation_date', p_presentation_date,
        'venue_or_url', trim(p_venue_or_url),
        'rubric_version_id', v_active_rubric_version_id
    );
END;
$$;


-- ============================================================================
-- 5. Mutation Function: submit_milestone_evaluation
-- Description: DCEC Evaluator / Committee evaluates a scheduled milestone (P1, P2, P3).
--              Enforces 4-column rubric criteria compliance, computes total marks server-side,
--              writes immutable milestone_evaluations and criterion breakdown rows,
--              enforces P3-only final grade contribution invariant, executes atomic
--              state progression, records audit/domain events, and notifies stakeholders.
-- ============================================================================
DROP FUNCTION IF EXISTS public.submit_milestone_evaluation(UUID, VARCHAR, UUID, JSONB, TEXT, VARCHAR, TEXT);
CREATE OR REPLACE FUNCTION public.submit_milestone_evaluation(
    p_thesis_id UUID,
    p_milestone_type VARCHAR,
    p_rubric_version_id UUID,
    p_criterion_scores JSONB,
    p_general_feedback TEXT DEFAULT NULL,
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
    v_rubric_ver RECORD;
    v_is_authorized BOOLEAN := FALSE;
    v_expected_state VARCHAR(64);
    v_new_thesis_state VARCHAR(64);
    v_new_thesis_stage VARCHAR(64);
    v_expected_criteria_count INT;
    v_submitted_criteria_count INT;
    v_score_item JSONB;
    v_crit_id UUID;
    v_level_id UUID;
    v_marks FLOAT;
    v_remarks TEXT;
    v_crit_rec RECORD;
    v_level_rec RECORD;
    v_computed_total_marks FLOAT := 0.0;
    v_evaluation_id UUID;
    v_correlation_id UUID := gen_random_uuid();
    v_academic_event_id UUID;
    v_notif_msg_id UUID;
    v_is_p3 BOOLEAN := FALSE;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Validate Milestone Type
    IF p_milestone_type NOT IN ('P1', 'P2', 'P3') THEN
        RAISE EXCEPTION 'Validation failed: Invalid milestone type % (must be P1, P2, or P3).', p_milestone_type USING ERRCODE = '23514';
    END IF;

    v_is_p3 := (p_milestone_type = 'P3');

    -- 3. Lock and Fetch Thesis Record
    SELECT * INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Authorize caller (DCEC_MEMBER, DCEC_CHAIR, HOD, or ADMIN for thesis department)
    SELECT (
        public.has_role('ADMIN')
        OR EXISTS (
            SELECT 1
            FROM public.user_role_assignments ura
            WHERE ura.user_id = v_caller_id
              AND ura.department_id = v_thesis.department_id
              AND ura.role_id IN ('DCEC_MEMBER', 'DCEC_CHAIR', 'HOD')
              AND ura.is_active = TRUE
        )
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to evaluate milestones for department %.', v_thesis.department_id USING ERRCODE = '42501';
    END IF;

    -- 5. Workflow State Guard
    IF p_milestone_type = 'P1' THEN
        v_expected_state := 'P1_EVALUATION_SCHEDULED';
    ELSIF p_milestone_type = 'P2' THEN
        v_expected_state := 'P2_EVALUATION_SCHEDULED';
    ELSIF p_milestone_type = 'P3' THEN
        v_expected_state := 'P3_EVALUATION_SCHEDULED';
    END IF;

    IF v_thesis.current_state != v_expected_state THEN
        RAISE EXCEPTION 'InvalidState: Thesis % is in state % (must be % to submit % evaluation).', p_thesis_id, v_thesis.current_state, v_expected_state, p_milestone_type USING ERRCODE = '23514';
    END IF;

    -- 6. Validate Rubric Version
    SELECT rv.*, r.department_id, r.milestone_type AS rubric_milestone_type
    INTO v_rubric_ver
    FROM public.rubric_versions rv
    JOIN public.rubrics r ON r.id = rv.rubric_id
    WHERE rv.id = p_rubric_version_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Rubric version % not found.', p_rubric_version_id USING ERRCODE = 'P0002';
    END IF;

    IF NOT v_rubric_ver.is_published THEN
        RAISE EXCEPTION 'InvalidState: Cannot evaluate milestone using unpublished rubric version %.', p_rubric_version_id USING ERRCODE = '23514';
    END IF;

    IF v_rubric_ver.department_id != v_thesis.department_id THEN
        RAISE EXCEPTION 'Validation failed: Rubric department % does not match thesis department %.', v_rubric_ver.department_id, v_thesis.department_id USING ERRCODE = '23514';
    END IF;

    IF v_rubric_ver.rubric_milestone_type != p_milestone_type THEN
        RAISE EXCEPTION 'Validation failed: Rubric milestone type % does not match target evaluation milestone %.', v_rubric_ver.rubric_milestone_type, p_milestone_type USING ERRCODE = '23514';
    END IF;

    -- 7. Check for duplicate evaluation
    IF EXISTS (SELECT 1 FROM public.milestone_evaluations WHERE thesis_id = p_thesis_id AND milestone_type = p_milestone_type) THEN
        RAISE EXCEPTION 'Conflict: Milestone % evaluation already exists for thesis %.', p_milestone_type, p_thesis_id USING ERRCODE = '23505';
    END IF;

    -- 8. Validate Criteria Scores Payload
    IF p_criterion_scores IS NULL OR jsonb_typeof(p_criterion_scores) != 'array' THEN
        RAISE EXCEPTION 'Validation failed: Criterion scores array is mandatory.' USING ERRCODE = '23502';
    END IF;

    SELECT COUNT(*) INTO v_expected_criteria_count
    FROM public.rubric_criteria
    WHERE rubric_version_id = p_rubric_version_id;

    v_submitted_criteria_count := jsonb_array_length(p_criterion_scores);
    IF v_submitted_criteria_count != v_expected_criteria_count THEN
        RAISE EXCEPTION 'Validation failed: Rubric contains % criteria, but % were scored.', v_expected_criteria_count, v_submitted_criteria_count USING ERRCODE = '23514';
    END IF;

    -- 9. Iterate, Validate Each Criterion Score, and Compute Total Marks Server-Side
    FOR v_score_item IN SELECT * FROM jsonb_array_elements(p_criterion_scores)
    LOOP
        v_crit_id := (v_score_item->>'criterion_id')::UUID;
        v_level_id := (v_score_item->>'selected_level_id')::UUID;
        v_marks := (v_score_item->>'awarded_marks')::FLOAT;

        IF v_crit_id IS NULL OR v_level_id IS NULL OR v_marks IS NULL THEN
            RAISE EXCEPTION 'Validation failed: criterion_id, selected_level_id, and awarded_marks are mandatory for each scored item.' USING ERRCODE = '23502';
        END IF;

        -- Verify criterion belongs to pinned rubric version
        SELECT * INTO v_crit_rec
        FROM public.rubric_criteria
        WHERE id = v_crit_id AND rubric_version_id = p_rubric_version_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Validation failed: Criterion % does not belong to rubric version %.', v_crit_id, p_rubric_version_id USING ERRCODE = '23503';
        END IF;

        -- Verify selected achievement tier belongs to this criterion
        SELECT * INTO v_level_rec
        FROM public.rubric_achievement_levels
        WHERE id = v_level_id AND criterion_id = v_crit_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Validation failed: Achievement level % does not belong to criterion %.', v_level_id, v_crit_id USING ERRCODE = '23503';
        END IF;

        -- Verify score bounds
        IF v_marks < 0.0 OR v_marks > v_crit_rec.max_marks THEN
            RAISE EXCEPTION 'Validation failed: Awarded marks % is outside valid range (0.0 to %) for criterion %.', v_marks, v_crit_rec.max_marks, v_crit_rec.criterion_title USING ERRCODE = '23514';
        END IF;

        -- Accumulate Server-Computed Total
        v_computed_total_marks := v_computed_total_marks + v_marks;
    END LOOP;

    -- Verify final computed total is within 0..100
    IF v_computed_total_marks < 0.0 OR v_computed_total_marks > 100.0 THEN
        RAISE EXCEPTION 'Validation failed: Total awarded marks % is outside valid range 0.0 to 100.0.', v_computed_total_marks USING ERRCODE = '23514';
    END IF;

    -- 10. Insert Append-Only Milestone Evaluation Header
    INSERT INTO public.milestone_evaluations (
        thesis_id,
        milestone_type,
        rubric_version_id,
        total_marks_awarded,
        general_feedback,
        evaluated_at
    )
    VALUES (
        p_thesis_id,
        p_milestone_type,
        p_rubric_version_id,
        v_computed_total_marks,
        trim(COALESCE(p_general_feedback, '')),
        clock_timestamp()
    )
    RETURNING id INTO v_evaluation_id;

    -- 11. Insert Append-Only Criterion Score Breakdown Rows
    FOR v_score_item IN SELECT * FROM jsonb_array_elements(p_criterion_scores)
    LOOP
        INSERT INTO public.evaluation_criterion_scores (
            milestone_evaluation_id,
            criterion_id,
            selected_level_id,
            awarded_marks,
            criterion_remarks
        )
        VALUES (
            v_evaluation_id,
            (v_score_item->>'criterion_id')::UUID,
            (v_score_item->>'selected_level_id')::UUID,
            (v_score_item->>'awarded_marks')::FLOAT,
            trim(COALESCE(v_score_item->>'criterion_remarks', ''))
        );
    END LOOP;

    -- 12. Execute State Machine Progression
    IF p_milestone_type IN ('P1', 'P2') THEN
        -- Formative / Diagnostic Checkpoints: Return to RESEARCH_EXECUTION
        v_new_thesis_state := 'RESEARCH_EXECUTION';
        v_new_thesis_stage := v_thesis.current_stage;
    ELSIF p_milestone_type = 'P3' THEN
        -- Pre-Submission Milestone (Sole Milestone Contributing to Final Grade): Advance to ANNEXURE_5_PREPARATION
        v_new_thesis_state := 'ANNEXURE_5_PREPARATION';
        v_new_thesis_stage := 'FINAL_SUBMISSION_STAGE';
    END IF;

    UPDATE public.theses
    SET current_state = v_new_thesis_state::thesis_state_enum,
        current_stage = v_new_thesis_stage::thesis_stage_enum,
        updated_at = clock_timestamp()
    WHERE id = p_thesis_id;

    -- 13. Record Immutable Audit Event
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
        'DCEC_MEMBER',
        'MILESTONE_EVALUATED',
        'MilestoneEvaluation',
        v_evaluation_id,
        jsonb_build_object('current_state', v_expected_state),
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'milestone_type', p_milestone_type,
            'rubric_version_id', p_rubric_version_id,
            'total_marks_awarded', v_computed_total_marks,
            'max_score', 100.0,
            'is_contributing_to_final_grade', v_is_p3,
            'new_thesis_state', v_new_thesis_state,
            'new_thesis_stage', v_new_thesis_stage
        ),
        NULL,
        p_client_ip,
        p_user_agent,
        v_correlation_id,
        clock_timestamp()
    );

    -- 14. Emit Academic Domain Events
    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'MILESTONE_EVALUATION_SUBMITTED',
        'MilestoneEvaluation',
        v_evaluation_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'milestone_type', p_milestone_type,
            'total_marks_awarded', v_computed_total_marks,
            'is_contributing_to_final_grade', v_is_p3
        ),
        clock_timestamp()
    )
    RETURNING id INTO v_academic_event_id;

    INSERT INTO public.academic_events (
        event_type,
        entity_type,
        entity_id,
        actor_user_id,
        payload,
        emitted_at
    )
    VALUES (
        'MILESTONE_COMPLETED',
        'Thesis',
        p_thesis_id,
        v_caller_id,
        jsonb_build_object(
            'thesis_id', p_thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'milestone_type', p_milestone_type,
            'new_state', v_new_thesis_state
        ),
        clock_timestamp()
    );

    -- 15. Create Notification Message
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
        'EVALUATION',
        'NORMAL',
        p_milestone_type || ' Evaluation Released: ' || v_thesis.tracking_number,
        'Scorecard for milestone ' || p_milestone_type || ' (' || v_computed_total_marks || '/100) has been evaluated and published for dissertation ' || v_thesis.tracking_number || '.',
        '/app/student',
        clock_timestamp()
    )
    RETURNING id INTO v_notif_msg_id;

    -- Deliver to Student
    INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
    VALUES (v_notif_msg_id, v_thesis.student_id, 'IN_APP', 'PENDING', clock_timestamp());

    -- Deliver to Guide
    IF v_thesis.guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- Deliver to Co-Guide
    IF v_thesis.co_guide_id IS NOT NULL THEN
        INSERT INTO public.notification_deliveries (message_id, recipient_user_id, channel, delivery_status, created_at)
        VALUES (v_notif_msg_id, v_thesis.co_guide_id, 'IN_APP', 'PENDING', clock_timestamp());
    END IF;

    -- 16. Return Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'evaluation_id', v_evaluation_id,
        'thesis_id', p_thesis_id,
        'tracking_number', v_thesis.tracking_number,
        'milestone_type', p_milestone_type,
        'total_marks_awarded', v_computed_total_marks,
        'max_score', 100.0,
        'rubric_version_id', p_rubric_version_id,
        'new_thesis_state', v_new_thesis_state,
        'is_contributing_to_final_grade', v_is_p3,
        'evaluated_at', clock_timestamp()
    );
END;
$$;


-- ============================================================================
-- 6. Query Function: get_milestone_evaluation_details
-- Description: Securely retrieves the complete evaluation scorecard for a thesis
--              and milestone type (P1, P2, P3), including pinned rubric version metadata,
--              individual criterion scores, selected 4-column achievement levels, and committee feedback.
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_milestone_evaluation_details(UUID, VARCHAR);
CREATE OR REPLACE FUNCTION public.get_milestone_evaluation_details(
    p_thesis_id UUID,
    p_milestone_type VARCHAR
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
    v_eval_rec RECORD;
    v_scores_json JSONB;
    v_is_authorized BOOLEAN := FALSE;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Fetch thesis record
    SELECT id, tracking_number, student_id, guide_id, co_guide_id, department_id, current_state
    INTO v_thesis
    FROM public.theses
    WHERE id = p_thesis_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NotFound: Thesis % not found.', p_thesis_id USING ERRCODE = 'P0002';
    END IF;

    -- 3. Authorize caller
    IF v_caller_id = v_thesis.student_id THEN
        v_is_authorized := TRUE;
    ELSIF v_thesis.guide_id IS NOT NULL AND v_caller_id = v_thesis.guide_id THEN
        v_is_authorized := TRUE;
    ELSIF v_thesis.co_guide_id IS NOT NULL AND v_caller_id = v_thesis.co_guide_id THEN
        v_is_authorized := TRUE;
    ELSIF public.has_role('ADMIN') THEN
        v_is_authorized := TRUE;
    ELSE
        SELECT EXISTS (
            SELECT 1
            FROM public.user_role_assignments ura
            WHERE ura.user_id = v_caller_id
              AND ura.department_id = v_thesis.department_id
              AND ura.role_id IN ('HOD', 'DHOD', 'DC', 'DCEC_MEMBER', 'DCEC_CHAIR')
              AND ura.is_active = TRUE
        ) INTO v_is_authorized;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to view milestone evaluations for thesis %.', p_thesis_id USING ERRCODE = '42501';
    END IF;

    -- 4. Fetch Evaluation Header
    SELECT
        me.id,
        me.thesis_id,
        me.milestone_type,
        me.rubric_version_id,
        me.total_marks_awarded,
        me.general_feedback,
        me.evaluated_at,
        rv.version_number AS rubric_version_number,
        r.title AS rubric_title
    INTO v_eval_rec
    FROM public.milestone_evaluations me
    JOIN public.rubric_versions rv ON rv.id = me.rubric_version_id
    JOIN public.rubrics r ON r.id = rv.rubric_id
    WHERE me.thesis_id = p_thesis_id
      AND me.milestone_type = p_milestone_type;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'data', NULL,
            'message', 'No evaluation scorecard found for milestone ' || p_milestone_type || ' on thesis ' || p_thesis_id
        );
    END IF;

    -- 5. Fetch Granular Criterion Scores & Achievement Tiers
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ecs.id,
            'criterion_id', ecs.criterion_id,
            'criterion_title', rc.criterion_title,
            'criterion_description', rc.description,
            'max_marks', rc.max_marks,
            'selected_level_id', ecs.selected_level_id,
            'selected_level_index', ral.level_index,
            'selected_level_label', ral.label,
            'selected_level_descriptor', ral.descriptor,
            'selected_level_percentage', ral.score_percentage,
            'awarded_marks', ecs.awarded_marks,
            'criterion_remarks', ecs.criterion_remarks
        ) ORDER BY rc.sequence_order ASC
    ) INTO v_scores_json
    FROM public.evaluation_criterion_scores ecs
    JOIN public.rubric_criteria rc ON rc.id = ecs.criterion_id
    JOIN public.rubric_achievement_levels ral ON ral.id = ecs.selected_level_id
    WHERE ecs.milestone_evaluation_id = v_eval_rec.id;

    -- 6. Return Structured Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'data', jsonb_build_object(
            'evaluation_id', v_eval_rec.id,
            'thesis_id', v_eval_rec.thesis_id,
            'tracking_number', v_thesis.tracking_number,
            'milestone_type', v_eval_rec.milestone_type,
            'total_marks_awarded', v_eval_rec.total_marks_awarded,
            'max_score', 100.0,
            'general_feedback', v_eval_rec.general_feedback,
            'evaluated_at', v_eval_rec.evaluated_at,
            'rubric_version_id', v_eval_rec.rubric_version_id,
            'rubric_version_number', v_eval_rec.rubric_version_number,
            'rubric_title', v_eval_rec.rubric_title,
            'is_contributing_to_final_grade', (v_eval_rec.milestone_type = 'P3'),
            'criterion_scores', COALESCE(v_scores_json, '[]'::jsonb)
        )
    );
END;
$$;


-- ============================================================================
-- 7. Query Function: list_department_milestones
-- Description: Departmental oversight query for DC, HOD, and DCEC Committee.
--              Returns cohort milestone presentation schedules, statuses, and scores.
-- ============================================================================
DROP FUNCTION IF EXISTS public.list_department_milestones(UUID, UUID, VARCHAR, VARCHAR);
CREATE OR REPLACE FUNCTION public.list_department_milestones(
    p_department_id UUID,
    p_academic_session_id UUID DEFAULT NULL,
    p_milestone_type VARCHAR DEFAULT NULL,
    p_status VARCHAR DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_caller_id UUID;
    v_is_authorized BOOLEAN := FALSE;
    v_records JSONB;
BEGIN
    -- 1. Authenticate caller
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller is not authenticated.' USING ERRCODE = '42501';
    END IF;

    -- 2. Authorize caller (DC, HOD, DHOD, DCEC_MEMBER, or ADMIN)
    SELECT (
        public.has_role('ADMIN')
        OR EXISTS (
            SELECT 1
            FROM public.user_role_assignments ura
            WHERE ura.user_id = v_caller_id
              AND ura.department_id = p_department_id
              AND ura.role_id IN ('DC', 'HOD', 'DHOD', 'DCEC_MEMBER', 'DCEC_CHAIR')
              AND ura.is_active = TRUE
        )
    ) INTO v_is_authorized;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Forbidden: Caller is not authorized to list department milestones for department %.', p_department_id USING ERRCODE = '42501';
    END IF;

    -- 3. Query Cohort Milestone Statuses
    SELECT jsonb_agg(
        jsonb_build_object(
            'thesis_id', t.id,
            'tracking_number', t.tracking_number,
            'current_state', t.current_state,
            'current_stage', t.current_stage,
            'student_id', t.student_id,
            'student_name', u_stu.full_name,
            'student_roll', sp.roll_number,
            'guide_id', t.guide_id,
            'guide_name', u_gui.full_name,
            'co_guide_id', t.co_guide_id,
            'co_guide_name', u_cog.full_name,
            'p1_evaluation', (
                SELECT jsonb_build_object(
                    'evaluation_id', me1.id,
                    'total_marks_awarded', me1.total_marks_awarded,
                    'evaluated_at', me1.evaluated_at,
                    'rubric_version_id', me1.rubric_version_id
                )
                FROM public.milestone_evaluations me1
                WHERE me1.thesis_id = t.id AND me1.milestone_type = 'P1'
            ),
            'p2_evaluation', (
                SELECT jsonb_build_object(
                    'evaluation_id', me2.id,
                    'total_marks_awarded', me2.total_marks_awarded,
                    'evaluated_at', me2.evaluated_at,
                    'rubric_version_id', me2.rubric_version_id
                )
                FROM public.milestone_evaluations me2
                WHERE me2.thesis_id = t.id AND me2.milestone_type = 'P2'
            ),
            'p3_evaluation', (
                SELECT jsonb_build_object(
                    'evaluation_id', me3.id,
                    'total_marks_awarded', me3.total_marks_awarded,
                    'evaluated_at', me3.evaluated_at,
                    'rubric_version_id', me3.rubric_version_id
                )
                FROM public.milestone_evaluations me3
                WHERE me3.thesis_id = t.id AND me3.milestone_type = 'P3'
            )
        ) ORDER BY t.tracking_number ASC
    ) INTO v_records
    FROM public.theses t
    JOIN public.users u_stu ON u_stu.id = t.student_id
    JOIN public.student_profiles sp ON sp.user_id = u_stu.id
    LEFT JOIN public.users u_gui ON u_gui.id = t.guide_id
    LEFT JOIN public.users u_cog ON u_cog.id = t.co_guide_id
    WHERE t.department_id = p_department_id
      AND (p_academic_session_id IS NULL OR t.session_id = p_academic_session_id)
      AND (
          p_status IS NULL OR p_status = 'ALL'
          OR (p_status = 'SCHEDULED' AND t.current_state IN ('P1_EVALUATION_SCHEDULED', 'P2_EVALUATION_SCHEDULED', 'P3_EVALUATION_SCHEDULED'))
          OR (p_status = 'RESEARCH_ACTIVE' AND t.current_state = 'RESEARCH_EXECUTION')
      );

    -- 4. Return Response
    RETURN jsonb_build_object(
        'success', TRUE,
        'department_id', p_department_id,
        'count', COALESCE(jsonb_array_length(v_records), 0),
        'data', COALESCE(v_records, '[]'::jsonb)
    );
END;
$$;


-- ============================================================================
-- 8. Test Helper Function: reset_milestones_for_testing
-- Description: Cleanly clears milestone evaluations, scorecards, and rubrics
--              for test suite isolation.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.reset_milestones_for_testing(p_thesis_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    SET LOCAL session_replication_role = replica;
    DELETE FROM public.evaluation_criterion_scores WHERE milestone_evaluation_id IN (
        SELECT id FROM public.milestone_evaluations WHERE thesis_id = p_thesis_id
    );
    DELETE FROM public.milestone_evaluations WHERE thesis_id = p_thesis_id;

    -- Clean department rubrics for deterministic test isolation
    DELETE FROM public.rubric_achievement_levels WHERE criterion_id IN (
        SELECT id FROM public.rubric_criteria WHERE rubric_version_id IN (
            SELECT id FROM public.rubric_versions WHERE rubric_id IN (
                SELECT id FROM public.rubrics WHERE department_id = '10000000-0000-0000-0000-000000000001'
            )
        )
    );
    DELETE FROM public.rubric_criteria WHERE rubric_version_id IN (
        SELECT id FROM public.rubric_versions WHERE rubric_id IN (
            SELECT id FROM public.rubrics WHERE department_id = '10000000-0000-0000-0000-000000000001'
        )
    );
    DELETE FROM public.rubric_versions WHERE rubric_id IN (
        SELECT id FROM public.rubrics WHERE department_id = '10000000-0000-0000-0000-000000000001'
    );
    DELETE FROM public.rubrics WHERE department_id = '10000000-0000-0000-0000-000000000001';
END;
$$;

-- ============================================================================
-- Permissions Hardening: REVOKE PUBLIC, GRANT authenticated
-- ============================================================================
REVOKE ALL ON FUNCTION public.create_rubric_version_draft(UUID, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_rubric_version_draft(UUID, VARCHAR, VARCHAR, JSONB, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.publish_rubric_version(UUID, DATE, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_rubric_version(UUID, DATE, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_active_milestone_rubric(UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_milestone_rubric(UUID, VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.schedule_milestone_presentation(UUID, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.schedule_milestone_presentation(UUID, VARCHAR, TIMESTAMPTZ, TEXT, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.submit_milestone_evaluation(UUID, VARCHAR, UUID, JSONB, TEXT, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_milestone_evaluation(UUID, VARCHAR, UUID, JSONB, TEXT, VARCHAR, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.get_milestone_evaluation_details(UUID, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_milestone_evaluation_details(UUID, VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.list_department_milestones(UUID, UUID, VARCHAR, VARCHAR) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_department_milestones(UUID, UUID, VARCHAR, VARCHAR) TO authenticated;

REVOKE ALL ON FUNCTION public.reset_milestones_for_testing(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reset_milestones_for_testing(UUID) TO authenticated;
