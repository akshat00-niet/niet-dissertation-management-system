-- Clean Local Development Database Reset & Reseed Script
-- Target: Local Development Database ONLY
-- Resets all public application tables and executes seed_all.sql

BEGIN;

-- Disable triggers temporarily during clean reset
SET session_replication_role = 'replica';

TRUNCATE TABLE
    configuration_change_logs,
    academic_policy_configurations,
    system_configurations,
    audit_events,
    notification_deliveries,
    notification_messages,
    academic_events,
    document_versions,
    documents,
    final_result_compilations,
    re_viva_cycles,
    panel_member_evaluations,
    panel_member_assignments,
    defense_panels,
    viva_defenses,
    annexure_6_evaluations,
    annexure_5_submissions,
    evaluation_criterion_scores,
    milestone_evaluations,
    rubric_achievement_levels,
    rubric_criteria,
    rubric_versions,
    rubrics,
    logbook_verifications,
    digital_logbook_entries,
    annexure_2_submissions,
    guide_allocations,
    dcec_delegations,
    dcec_decisions,
    dcec_dockets,
    annexure_1_submissions,
    theses,
    faculty_expertise,
    faculty_profiles,
    student_profiles,
    research_domains,
    user_role_assignments,
    users,
    sections,
    batches,
    programs,
    academic_sessions,
    departments
CASCADE;

SET session_replication_role = 'origin';

COMMIT;

\i database/seeds/seed_all.sql
