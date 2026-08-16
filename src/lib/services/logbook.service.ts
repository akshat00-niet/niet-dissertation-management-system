import type { SupabaseClient } from '@supabase/supabase-js';
import {
  getDigitalLogbookWorkspaceRpc,
  saveDigitalLogbookEntryDraftRpc,
  submitDigitalLogbookEntryRpc,
  verifyDigitalLogbookEntryRpc,
  submitPeriodicProgressReportRpc,
  acknowledgePeriodicProgressReportRpc,
} from '@/lib/dal/logbook.dal';
import { AppError, UnauthorizedError } from '@/lib/dal/errors';
import type { AppSession, UserRoleAssignment } from '@/types/database.types';
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
 * Service function: Retrieves the complete Digital Logbook and Progress workspace aggregate.
 */
export async function getDigitalLogbookWorkspace(
  supabase: SupabaseClient,
  session: AppSession,
  thesisId: string
): Promise<DigitalLogbookWorkspace> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to access Digital Logbook workspace.');
  }

  if (!thesisId) {
    throw new AppError('thesis_id is required to fetch Digital Logbook workspace.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return getDigitalLogbookWorkspaceRpc(supabase, thesisId);
}

/**
 * Service function: Saves a draft logbook entry with pre-validation.
 */
export async function saveDigitalLogbookEntryDraft(
  supabase: SupabaseClient,
  session: AppSession,
  input: SaveDigitalLogbookDraftInput
): Promise<LogbookOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to save logbook draft.');
  }

  const isStudent = session.roles.some((r: UserRoleAssignment) => r.role_id === 'STUDENT');
  if (!isStudent) {
    throw new AppError('Only student candidates may save logbook drafts.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required to save logbook draft.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['ONLINE', 'OFFLINE'].includes(input.meeting_mode)) {
    throw new AppError('Invalid meeting mode (expected ONLINE or OFFLINE).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.meeting_mode === 'ONLINE' && !input.meeting_link?.trim()) {
    throw new AppError('Meeting link/URL is required for ONLINE meetings.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.meeting_mode === 'OFFLINE' && !input.meeting_location?.trim()) {
    throw new AppError('Meeting location is required for OFFLINE meetings.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return saveDigitalLogbookEntryDraftRpc(supabase, {
    ...input,
    meeting_link: input.meeting_link?.trim() || null,
    meeting_location: input.meeting_location?.trim() || null,
    discussion_agenda: input.discussion_agenda?.trim() || '',
    progress_discussed: input.progress_discussed?.trim() || '',
    action_items: input.action_items?.trim() || '',
  });
}

/**
 * Service function: Submits a meeting logbook entry for supervisor verification.
 */
export async function submitDigitalLogbookEntry(
  supabase: SupabaseClient,
  session: AppSession,
  input: SubmitDigitalLogbookEntryInput
): Promise<LogbookOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to submit logbook entry.');
  }

  const isStudent = session.roles.some((r: UserRoleAssignment) => r.role_id === 'STUDENT');
  if (!isStudent) {
    throw new AppError('Only student candidates may submit logbook entries.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required to submit logbook entry.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['ONLINE', 'OFFLINE'].includes(input.meeting_mode)) {
    throw new AppError('Invalid meeting mode (expected ONLINE or OFFLINE).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.meeting_mode === 'ONLINE' && !input.meeting_link?.trim()) {
    throw new AppError('Meeting link/URL is mandatory for ONLINE meetings.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.meeting_mode === 'OFFLINE' && !input.meeting_location?.trim()) {
    throw new AppError('Meeting location is mandatory for OFFLINE meetings.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.discussion_agenda?.trim()) {
    throw new AppError('Discussion agenda is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.progress_discussed?.trim()) {
    throw new AppError('Progress discussed summary is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.action_items?.trim()) {
    throw new AppError('Action items / targets are mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.meeting_date) {
    throw new AppError('Meeting date/time is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.next_target_date) {
    throw new AppError('Next target date is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return submitDigitalLogbookEntryRpc(supabase, {
    ...input,
    meeting_link: input.meeting_link?.trim() || null,
    meeting_location: input.meeting_location?.trim() || null,
    discussion_agenda: input.discussion_agenda.trim(),
    progress_discussed: input.progress_discussed.trim(),
    action_items: input.action_items.trim(),
  });
}

/**
 * Service function: Supervisor verifies or requests revision on logbook entry.
 */
export async function verifyDigitalLogbookEntry(
  supabase: SupabaseClient,
  session: AppSession,
  input: VerifyDigitalLogbookEntryInput
): Promise<LogbookOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to verify logbook entries.');
  }

  const isFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['FACULTY', 'GUIDE', 'CO_GUIDE', 'HOD', 'DHOD', 'DC', 'DCEC_MEMBER'].includes(r.role_id)
  );

  if (!isFaculty) {
    throw new AppError('Only faculty supervisors may verify logbook entries.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.entry_id) {
    throw new AppError('entry_id is required for logbook verification.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['VERIFIED', 'REVISION_REQUESTED'].includes(input.outcome)) {
    throw new AppError('Invalid verification outcome (expected VERIFIED or REVISION_REQUESTED).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (input.outcome === 'REVISION_REQUESTED' && !input.feedback_remarks?.trim()) {
    throw new AppError('Feedback remarks are mandatory when requesting logbook revision.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return verifyDigitalLogbookEntryRpc(supabase, {
    ...input,
    feedback_remarks: input.feedback_remarks?.trim() || null,
  });
}

/**
 * Service function: Submits a periodic weekly/monthly progress report.
 */
export async function submitPeriodicProgressReport(
  supabase: SupabaseClient,
  session: AppSession,
  input: SubmitPeriodicProgressReportInput
): Promise<LogbookOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to submit periodic progress report.');
  }

  const isStudent = session.roles.some((r: UserRoleAssignment) => r.role_id === 'STUDENT');
  if (!isStudent) {
    throw new AppError('Only student candidates may submit periodic progress reports.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.thesis_id) {
    throw new AppError('thesis_id is required to submit progress report.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!['WEEKLY', 'MONTHLY'].includes(input.report_type)) {
    throw new AppError('Invalid report type (expected WEEKLY or MONTHLY).', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.period_start || !input.period_end) {
    throw new AppError('Reporting period start and end dates are mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (new Date(input.period_start) >= new Date(input.period_end)) {
    throw new AppError('Period start date must precede period end date.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.summary_work_done?.trim()) {
    throw new AppError('Summary of work done is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  if (!input.milestones_achieved?.trim()) {
    throw new AppError('Milestones achieved is mandatory.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return submitPeriodicProgressReportRpc(supabase, {
    ...input,
    summary_work_done: input.summary_work_done.trim(),
    milestones_achieved: input.milestones_achieved.trim(),
    issues_faced: input.issues_faced?.trim() || null,
  });
}

/**
 * Service function: Supervisor acknowledges a periodic progress report.
 */
export async function acknowledgePeriodicProgressReport(
  supabase: SupabaseClient,
  session: AppSession,
  input: AcknowledgePeriodicProgressReportInput
): Promise<LogbookOperationResult> {
  if (!session.appUser) {
    throw new UnauthorizedError('Authentication required to acknowledge progress report.');
  }

  const isFaculty = session.roles.some((r: UserRoleAssignment) =>
    ['FACULTY', 'GUIDE', 'CO_GUIDE', 'HOD', 'DHOD', 'DC', 'DCEC_MEMBER'].includes(r.role_id)
  );

  if (!isFaculty) {
    throw new AppError('Only faculty supervisors may acknowledge progress reports.', {
      code: 'FORBIDDEN',
      statusCode: 403,
    });
  }

  if (!input.report_id) {
    throw new AppError('report_id is required to acknowledge progress report.', {
      code: 'VALIDATION_FAILED',
      statusCode: 400,
    });
  }

  return acknowledgePeriodicProgressReportRpc(supabase, {
    ...input,
    remarks: input.remarks?.trim() || null,
  });
}
