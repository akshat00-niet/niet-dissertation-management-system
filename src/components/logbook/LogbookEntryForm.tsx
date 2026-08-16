'use client';

import React, { useState, useEffect } from 'react';
import type {
  DigitalLogbookEntry,
  MeetingMode,
  SaveDigitalLogbookDraftInput,
  SubmitDigitalLogbookEntryInput,
} from '@/types/logbook.types';
import {
  saveDigitalLogbookEntryDraftAction,
  submitDigitalLogbookEntryAction,
} from '@/app/actions/logbook.actions';

interface LogbookEntryFormProps {
  thesisId: string;
  entryToEdit?: DigitalLogbookEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogbookEntryForm({
  thesisId,
  entryToEdit,
  isOpen,
  onClose,
  onSuccess,
}: LogbookEntryFormProps) {
  const [meetingMode, setMeetingMode] = useState<MeetingMode>('OFFLINE');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [discussionAgenda, setDiscussionAgenda] = useState('');
  const [progressDiscussed, setProgressDiscussed] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [nextTargetDate, setNextTargetDate] = useState('');

  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (entryToEdit) {
      setMeetingMode(entryToEdit.meeting_mode);
      setMeetingLink(entryToEdit.meeting_link || '');
      setMeetingLocation(entryToEdit.meeting_location || '');
      setMeetingDate(
        entryToEdit.meeting_date
          ? new Date(entryToEdit.meeting_date).toISOString().slice(0, 16)
          : new Date().toISOString().slice(0, 16)
      );
      setDiscussionAgenda(entryToEdit.discussion_agenda || '');
      setProgressDiscussed(entryToEdit.progress_discussed || '');
      setActionItems(entryToEdit.action_items || '');
      setNextTargetDate(
        entryToEdit.next_target_date
          ? new Date(entryToEdit.next_target_date).toISOString().split('T')[0]
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
    } else {
      setMeetingMode('OFFLINE');
      setMeetingLink('');
      setMeetingLocation('Dept Research Lab / Guide Cabin');
      setMeetingDate(new Date().toISOString().slice(0, 16));
      setDiscussionAgenda('');
      setProgressDiscussed('');
      setActionItems('');
      setNextTargetDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    }
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfirmModal(false);
  }, [entryToEdit, isOpen]);

  if (!isOpen) return null;

  const validateForm = (isFormalSubmit: boolean): boolean => {
    setErrorMessage(null);

    if (meetingMode === 'ONLINE' && !meetingLink.trim()) {
      setErrorMessage('Meeting URL/link is required for Online meetings.');
      return false;
    }
    if (meetingMode === 'OFFLINE' && !meetingLocation.trim()) {
      setErrorMessage('Physical room or meeting location is required for Offline meetings.');
      return false;
    }
    if (!meetingDate) {
      setErrorMessage('Meeting date and time are required.');
      return false;
    }
    if (isFormalSubmit) {
      if (!discussionAgenda.trim()) {
        setErrorMessage('Discussion agenda is mandatory for formal submission.');
        return false;
      }
      if (!progressDiscussed.trim()) {
        setErrorMessage('Summary of progress discussed is mandatory for formal submission.');
        return false;
      }
      if (!actionItems.trim()) {
        setErrorMessage('Action items / targets assigned are mandatory for formal submission.');
        return false;
      }
      if (!nextTargetDate) {
        setErrorMessage('Next target milestone date is mandatory for formal submission.');
        return false;
      }
    }
    return true;
  };

  const handleSaveDraft = async () => {
    if (!validateForm(false)) return;

    setIsSavingDraft(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const input: SaveDigitalLogbookDraftInput = {
        thesis_id: thesisId,
        entry_id: entryToEdit?.id || null,
        meeting_mode: meetingMode,
        meeting_link: meetingMode === 'ONLINE' ? meetingLink.trim() : null,
        meeting_location: meetingMode === 'OFFLINE' ? meetingLocation.trim() : null,
        meeting_date: new Date(meetingDate).toISOString(),
        discussion_agenda: discussionAgenda.trim(),
        progress_discussed: progressDiscussed.trim(),
        action_items: actionItems.trim(),
        next_target_date: nextTargetDate,
      };

      const res = await saveDigitalLogbookEntryDraftAction(input);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save logbook draft.');
      } else {
        setSuccessMessage('Draft saved successfully.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm(true)) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setShowConfirmModal(false);

    try {
      const input: SubmitDigitalLogbookEntryInput = {
        thesis_id: thesisId,
        entry_id: entryToEdit?.id || null,
        meeting_mode: meetingMode,
        meeting_link: meetingMode === 'ONLINE' ? meetingLink.trim() : null,
        meeting_location: meetingMode === 'OFFLINE' ? meetingLocation.trim() : null,
        meeting_date: new Date(meetingDate).toISOString(),
        discussion_agenda: discussionAgenda.trim(),
        progress_discussed: progressDiscussed.trim(),
        action_items: actionItems.trim(),
        next_target_date: nextTargetDate,
      };

      const res = await submitDigitalLogbookEntryAction(input);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit logbook entry.');
      } else {
        setSuccessMessage('Logbook entry submitted for supervisor verification.');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while submitting.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>📖</span>
              {entryToEdit ? 'Edit Meeting Logbook Entry' : 'Log Supervisory Interaction (Annexure 4)'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Record interaction minutes, progress reviewed, and assigned action items with your supervisor.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {errorMessage && (
            <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-xs flex items-center gap-3">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-3">
              <span>✓</span>
              <span>{successMessage}</span>
            </div>
          )}

          {entryToEdit?.status === 'REVISION_REQUIRED' && (
            <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <span>🔄</span> Supervisor Requested Revision
              </div>
              {entryToEdit.verifications && entryToEdit.verifications.length > 0 && (
                <p className="text-slate-300 italic">
                  &ldquo;{entryToEdit.verifications[0].feedback_remarks}&rdquo;
                  <span className="block text-[10px] text-amber-400 mt-1">
                    — {entryToEdit.verifications[0].verifier_name} ({new Date(entryToEdit.verifications[0].verified_at).toLocaleDateString()})
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Meeting Mode & Date Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Meeting Mode <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMeetingMode('OFFLINE')}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    meetingMode === 'OFFLINE'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  🏢 In-Person (Offline)
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingMode('ONLINE')}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                    meetingMode === 'ONLINE'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-semibold'
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  🌐 Virtual (Online)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Meeting Date & Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Mode-Specific Field */}
          {meetingMode === 'ONLINE' ? (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Meeting URL / Platform Link <span className="text-red-400">*</span>
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xyz-abc or Zoom URL"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Meeting Location / Room <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Lab 402, Dept of CSE, or Guide Cabin"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Agenda */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Discussion Agenda <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              placeholder="Outline specific objectives and agenda points discussed..."
              value={discussionAgenda}
              onChange={(e) => setDiscussionAgenda(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Progress Discussed */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Summary of Progress Reviewed <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Summarize research progress, experimental results, or manuscript sections reviewed..."
              value={progressDiscussed}
              onChange={(e) => setProgressDiscussed(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {/* Action Items & Next Target Date */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Action Items / Next Deliverables <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                placeholder="Specific tasks assigned by supervisor for the next milestone..."
                value={actionItems}
                onChange={(e) => setActionItems(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Next Target Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={nextTargetDate}
                onChange={(e) => setNextTargetDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSavingDraft || isSubmitting}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSavingDraft || isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
            </button>

            <button
              type="button"
              onClick={() => {
                if (validateForm(true)) setShowConfirmModal(true);
              }}
              disabled={isSavingDraft || isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Entry'}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>🚀</span> Confirm Formal Submission
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to submit this logbook entry for supervisory verification? Once submitted, your Primary Guide and Co-Guide will be notified to review and verify this meeting.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-colors shadow-lg shadow-blue-600/20"
              >
                {isSubmitting ? 'Submitting...' : 'Yes, Submit Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
