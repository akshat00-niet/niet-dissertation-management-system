'use client';

import React, { useState } from 'react';
import { constituteDefensePanelAction } from '@/app/actions/annexure6.actions';
import type { FacultyAllocationOption } from '@/types/allocation.types';

interface DefensePanelConstitutionModalProps {
  thesisId: string;
  trackingNumber: string;
  studentName: string;
  guideId?: string | null;
  coGuideId?: string | null;
  guideName?: string | null;
  coGuideName?: string | null;
  facultyOptions: FacultyAllocationOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function DefensePanelConstitutionModal({
  thesisId,
  trackingNumber,
  studentName,
  guideId,
  coGuideId,
  guideName,
  coGuideName,
  facultyOptions,
  onClose,
  onSuccess,
}: DefensePanelConstitutionModalProps) {
  const [member1Id, setMember1Id] = useState<string>('');
  const [member2Id, setMember2Id] = useState<string>('');
  const [chairId, setChairId] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('10:00');
  const [venueOrLink, setVenueOrLink] = useState<string>('Auditorium 1, Academic Block A');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter out Primary Guide and Co-Guide to prevent Conflict of Interest
  const eligibleFaculty = facultyOptions.filter(
    (f) => f.faculty_id !== guideId && f.faculty_id !== coGuideId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!member1Id || !member2Id) {
      setErrorMessage('Please select both Member 1 and Member 2.');
      return;
    }

    if (member1Id === member2Id) {
      setErrorMessage('Panel members must be two distinct faculty members.');
      return;
    }

    if (!chairId || (chairId !== member1Id && chairId !== member2Id)) {
      setErrorMessage('Designated panel chair must be one of the two appointed panel members.');
      return;
    }

    if (!scheduledDate || !scheduledTime) {
      setErrorMessage('Please specify the defense date and time.');
      return;
    }

    const scheduledIso = new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString();
    if (new Date(scheduledIso).getTime() <= Date.now()) {
      setErrorMessage('Oral defense must be scheduled for a future date and time.');
      return;
    }

    if (!venueOrLink.trim()) {
      setErrorMessage('Venue / Meeting Link is mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await constituteDefensePanelAction({
        thesis_id: thesisId,
        member_1_faculty_id: member1Id,
        member_2_faculty_id: member2Id,
        chair_faculty_id: chairId,
        scheduled_at: scheduledIso,
        venue_or_link: venueOrLink.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to constitute defense panel.');
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">
              Department Academic Authority
            </span>
            <h3 className="text-xl font-bold text-white mt-1">Constitute Oral Defense Panel</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Thesis: <span className="font-mono text-purple-300">{trackingNumber}</span> | Candidate: <span className="text-white font-medium">{studentName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Conflict of Interest Notice */}
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-xs text-amber-200/90 flex items-start gap-2.5">
          <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong>Institutional Conflict-of-Interest Guard:</strong> Primary Guide ({guideName || 'Guide'}) and Co-Guide ({coGuideName || 'Co-Guide'}) are strictly excluded from defense panel membership for this candidate.
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Member 1 & Member 2 Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="member_1" className="text-xs font-bold text-slate-300 block">
                Panel Member 1 (Examiner) <span className="text-rose-400">*</span>
              </label>
              <select
                id="member_1"
                required
                value={member1Id}
                onChange={(e) => {
                  setMember1Id(e.target.value);
                  if (chairId && chairId !== e.target.value && chairId !== member2Id) {
                    setChairId(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">Select Faculty Examiner...</option>
                {eligibleFaculty.map((f) => (
                  <option key={f.faculty_id} value={f.faculty_id} disabled={f.faculty_id === member2Id}>
                    {f.full_name} ({f.designation})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="member_2" className="text-xs font-bold text-slate-300 block">
                Panel Member 2 (Examiner) <span className="text-rose-400">*</span>
              </label>
              <select
                id="member_2"
                required
                value={member2Id}
                onChange={(e) => {
                  setMember2Id(e.target.value);
                  if (chairId && chairId !== member1Id && chairId !== e.target.value) {
                    setChairId(e.target.value);
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">Select Faculty Examiner...</option>
                {eligibleFaculty.map((f) => (
                  <option key={f.faculty_id} value={f.faculty_id} disabled={f.faculty_id === member1Id}>
                    {f.full_name} ({f.designation})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Chair Designation */}
          <div className="space-y-1.5">
            <label htmlFor="panel_chair" className="text-xs font-bold text-slate-300 block">
              Designated Panel Chair <span className="text-rose-400">*</span>
            </label>
            <select
              id="panel_chair"
              required
              disabled={!member1Id && !member2Id}
              value={chairId}
              onChange={(e) => setChairId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:bg-slate-800 disabled:text-slate-500"
            >
              <option value="">Select Chair (must be Member 1 or Member 2)...</option>
              {member1Id && (
                <option value={member1Id}>
                  {eligibleFaculty.find((f) => f.faculty_id === member1Id)?.full_name} (Member 1)
                </option>
              )}
              {member2Id && (
                <option value={member2Id}>
                  {eligibleFaculty.find((f) => f.faculty_id === member2Id)?.full_name} (Member 2)
                </option>
              )}
            </select>
            <span className="text-[11px] text-slate-400 block">
              Institutional rule: Exactly one appointed member must be designated as Chair.
            </span>
          </div>

          {/* Schedule Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div className="space-y-1.5">
              <label htmlFor="scheduled_date" className="text-xs font-bold text-slate-300 block">
                Oral Defense Date <span className="text-rose-400">*</span>
              </label>
              <input
                id="scheduled_date"
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="scheduled_time" className="text-xs font-bold text-slate-300 block">
                Scheduled Time <span className="text-rose-400">*</span>
              </label>
              <input
                id="scheduled_time"
                type="time"
                required
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>
          </div>

          {/* Venue or Virtual Meeting Link */}
          <div className="space-y-1.5">
            <label htmlFor="venue_or_link" className="text-xs font-bold text-slate-300 block">
              Venue / Virtual Meeting Link <span className="text-rose-400">*</span>
            </label>
            <input
              id="venue_or_link"
              type="text"
              required
              maxLength={500}
              value={venueOrLink}
              onChange={(e) => setVenueOrLink(e.target.value)}
              placeholder="e.g. Auditorium 2 / https://meet.google.com/abc-xyz-123"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white text-xs font-bold shadow-lg shadow-purple-900/30 transition flex items-center gap-2"
            >
              {isSubmitting ? 'Constituting Panel...' : 'Constitute Panel & Schedule Defense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
