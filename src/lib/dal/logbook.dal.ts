import type { SupabaseClient } from '@supabase/supabase-js';
import { mapPostgrestError, DatabaseError } from '@/lib/dal/errors';
import type {
  DigitalLogbookWorkspace,
  SaveDigitalLogbookDraftInput,
  SubmitDigitalLogbookEntryInput,
  VerifyDigitalLogbookEntryInput,
  SubmitPeriodicProgressReportInput,
  AcknowledgePeriodicProgressReportInput,
  LogbookOperationResult,
} from '@/types/logbook.types';

/**
 * DAL function: Fetches the complete Digital Logbook and Periodic Progress workspace aggregate.
 */
export async function getDigitalLogbookWorkspaceRpc(
  supabase: SupabaseClient,
  thesisId: string
): Promise<DigitalLogbookWorkspace> {
  const { data, error } = await supabase.rpc('get_digital_logbook_workspace', {
    p_thesis_id: thesisId,
  });

  if (error) {
    throw mapPostgrestError(error, '[logbook.dal.getDigitalLogbookWorkspaceRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to fetch Digital Logbook workspace: Invalid server response.');
  }

  return data as DigitalLogbookWorkspace;
}

/**
 * DAL function: Saves or updates a draft logbook entry.
 */
export async function saveDigitalLogbookEntryDraftRpc(
  supabase: SupabaseClient,
  input: SaveDigitalLogbookDraftInput
): Promise<LogbookOperationResult> {
  const { data, error } = await supabase.rpc('save_digital_logbook_entry_draft', {
    p_thesis_id: input.thesis_id,
    p_entry_id: input.entry_id || null,
    p_meeting_mode: input.meeting_mode,
    p_meeting_link: input.meeting_link || null,
    p_meeting_location: input.meeting_location || null,
    p_meeting_date: input.meeting_date,
    p_discussion_agenda: input.discussion_agenda,
    p_progress_discussed: input.progress_discussed,
    p_action_items: input.action_items,
    p_next_target_date: input.next_target_date,
  });

  if (error) {
    throw mapPostgrestError(error, '[logbook.dal.saveDigitalLogbookEntryDraftRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to save logbook draft: Invalid server response.');
  }

  return data as LogbookOperationResult;
}

/**
 * DAL function: Formally submits a meeting logbook entry for supervisory verification.
 */
export async function submitDigitalLogbookEntryRpc(
  supabase: SupabaseClient,
  input: SubmitDigitalLogbookEntryInput
): Promise<LogbookOperationResult> {
  const { data, error } = await supabase.rpc('submit_digital_logbook_entry', {
    p_thesis_id: input.thesis_id,
    p_entry_id: input.entry_id || null,
    p_meeting_mode: input.meeting_mode,
    p_meeting_link: input.meeting_link || null,
    p_meeting_location: input.meeting_location || null,
    p_meeting_date: input.meeting_date,
    p_discussion_agenda: input.discussion_agenda,
    p_progress_discussed: input.progress_discussed,
    p_action_items: input.action_items,
    p_next_target_date: input.next_target_date,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[logbook.dal.submitDigitalLogbookEntryRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to submit logbook entry: Invalid server response.');
  }

  return data as LogbookOperationResult;
}

/**
 * DAL function: Supervisor signs off or requests revision on a logbook entry.
 */
export async function verifyDigitalLogbookEntryRpc(
  supabase: SupabaseClient,
  input: VerifyDigitalLogbookEntryInput
): Promise<LogbookOperationResult> {
  const { data, error } = await supabase.rpc('verify_digital_logbook_entry', {
    p_entry_id: input.entry_id,
    p_outcome: input.outcome,
    p_feedback_remarks: input.feedback_remarks || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[logbook.dal.verifyDigitalLogbookEntryRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to verify logbook entry: Invalid server response.');
  }

  return data as LogbookOperationResult;
}

/**
 * DAL function: Submits a weekly or monthly periodic progress report.
 */
export async function submitPeriodicProgressReportRpc(
  supabase: SupabaseClient,
  input: SubmitPeriodicProgressReportInput
): Promise<LogbookOperationResult> {
  const { data, error } = await supabase.rpc('submit_periodic_progress_report', {
    p_thesis_id: input.thesis_id,
    p_report_type: input.report_type,
    p_period_start: input.period_start,
    p_period_end: input.period_end,
    p_summary_work_done: input.summary_work_done,
    p_milestones_achieved: input.milestones_achieved,
    p_issues_faced: input.issues_faced || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[logbook.dal.submitPeriodicProgressReportRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to submit periodic progress report: Invalid server response.');
  }

  return data as LogbookOperationResult;
}

/**
 * DAL function: Supervisor acknowledges a periodic progress report.
 */
export async function acknowledgePeriodicProgressReportRpc(
  supabase: SupabaseClient,
  input: AcknowledgePeriodicProgressReportInput
): Promise<LogbookOperationResult> {
  const { data, error } = await supabase.rpc('acknowledge_periodic_progress_report', {
    p_report_id: input.report_id,
    p_remarks: input.remarks || null,
    p_client_ip: input.client_ip || '127.0.0.1',
    p_user_agent: input.user_agent || 'Antigravity-Client',
  });

  if (error) {
    throw mapPostgrestError(error, '[logbook.dal.acknowledgePeriodicProgressReportRpc]');
  }

  if (!data || typeof data !== 'object') {
    throw new DatabaseError('Failed to acknowledge periodic progress report: Invalid server response.');
  }

  return data as LogbookOperationResult;
}
