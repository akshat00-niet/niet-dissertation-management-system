'use client';

import React, { useState } from 'react';
import type { AllocationQueueItem, FacultyAllocationOption } from '@/types/allocation.types';
import { allocateSupervisorsAction } from '@/app/actions/allocation.actions';

interface SupervisorAllocationModalProps {
  item: AllocationQueueItem;
  facultyOptions: FacultyAllocationOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function SupervisorAllocationModal({
  item,
  facultyOptions,
  onClose,
  onSuccess,
}: SupervisorAllocationModalProps) {
  const [guideId, setGuideId] = useState<string>('');
  const [coGuideId, setCoGuideId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedGuide = facultyOptions.find((f) => f.faculty_id === guideId);
  const selectedCoGuide = facultyOptions.find((f) => f.faculty_id === coGuideId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!guideId || !coGuideId) {
      setErrorMessage('Please select both a Primary Guide and a Co-Guide.');
      return;
    }

    if (guideId === coGuideId) {
      setErrorMessage('Primary Guide and Co-Guide cannot be the same faculty member.');
      return;
    }

    if (selectedGuide && selectedGuide.active_guide_load >= 3) {
      setErrorMessage(`${selectedGuide.full_name} has reached maximum Guide capacity (3/3).`);
      return;
    }

    if (selectedCoGuide && selectedCoGuide.active_coguide_load >= 3) {
      setErrorMessage(`${selectedCoGuide.full_name} has reached maximum Co-Guide capacity (3/3).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await allocateSupervisorsAction({
        thesis_id: item.thesis_id,
        guide_id: guideId,
        co_guide_id: coGuideId,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to allocate supervisors.');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              D.HOD Supervisor Allocation
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">
              Assign Supervisors: {item.tracking_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Candidate & Proposal Summary */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 space-y-2 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
            <div>
              <span className="text-slate-400 text-xs">Candidate: </span>
              <span className="text-white font-medium">{item.student_name}</span>
              <span className="text-slate-400 text-xs ml-2">({item.student_roll_number})</span>
            </div>
            <span className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
              DCEC Screening Approved
            </span>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Proposed Title: </span>
            <span className="text-slate-200 font-medium">{item.proposed_title}</span>
          </div>
          <div>
            <span className="text-slate-400 text-xs">Broad Domain: </span>
            <span className="text-slate-300">{item.broad_domain || 'General Computer Science'}</span>
          </div>
        </div>

        {/* Candidate's 4 Ranked Preferences Display */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Candidate&apos;s Ranked Faculty Preferences (Annexure 1)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {item.student_preferences && item.student_preferences.length > 0 ? (
              item.student_preferences.map((pref) => (
                <div
                  key={pref.faculty_id}
                  className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-[10px]">
                        #{pref.preference_rank}
                      </span>
                      <span className="font-semibold text-white">{pref.faculty_name}</span>
                    </div>
                    <div className="text-slate-400 text-[11px]">{pref.designation}</div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="flex items-center space-x-1.5 justify-end">
                      <span className="text-slate-400 text-[10px]">Guide:</span>
                      <span
                        className={`font-semibold ${
                          pref.active_guide_load >= 3 ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {pref.active_guide_load}/3
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5 justify-end">
                      <span className="text-slate-400 text-[10px]">Co-Guide:</span>
                      <span
                        className={`font-semibold ${
                          pref.active_coguide_load >= 3 ? 'text-rose-400' : 'text-blue-400'
                        }`}
                      >
                        {pref.active_coguide_load}/3
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-xs text-slate-500 italic py-2">
                No ranked preferences found on docket.
              </div>
            )}
          </div>
        </div>

        {/* Allocation Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Primary Guide Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Primary Guide <span className="text-rose-400">*</span>
              </label>
              <select
                value={guideId}
                onChange={(e) => setGuideId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Primary Guide --</option>
                {facultyOptions.map((f) => (
                  <option
                    key={f.faculty_id}
                    value={f.faculty_id}
                    disabled={f.active_guide_load >= 3 || !f.is_available || f.faculty_id === coGuideId}
                  >
                    {f.full_name} ({f.designation}) — Guide: {f.active_guide_load}/3{' '}
                    {f.active_guide_load >= 3 ? '[FULL]' : !f.is_available ? '[UNAVAILABLE]' : ''}
                  </option>
                ))}
              </select>
              {selectedGuide && (
                <div className="text-xs text-slate-400 flex items-center justify-between px-1">
                  <span>Current Guide Load: {selectedGuide.active_guide_load}/3</span>
                  <span className={selectedGuide.active_guide_load >= 3 ? 'text-rose-400' : 'text-emerald-400'}>
                    {selectedGuide.active_guide_load < 3 ? '✓ Available' : '⚠ Capacity Reached'}
                  </span>
                </div>
              )}
            </div>

            {/* Co-Guide Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Co-Guide <span className="text-rose-400">*</span>
              </label>
              <select
                value={coGuideId}
                onChange={(e) => setCoGuideId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Select Co-Guide --</option>
                {facultyOptions.map((f) => (
                  <option
                    key={f.faculty_id}
                    value={f.faculty_id}
                    disabled={f.active_coguide_load >= 3 || !f.is_available || f.faculty_id === guideId}
                  >
                    {f.full_name} ({f.designation}) — Co-Guide: {f.active_coguide_load}/3{' '}
                    {f.active_coguide_load >= 3 ? '[FULL]' : !f.is_available ? '[UNAVAILABLE]' : ''}
                  </option>
                ))}
              </select>
              {selectedCoGuide && (
                <div className="text-xs text-slate-400 flex items-center justify-between px-1">
                  <span>Current Co-Guide Load: {selectedCoGuide.active_coguide_load}/3</span>
                  <span className={selectedCoGuide.active_coguide_load >= 3 ? 'text-rose-400' : 'text-blue-400'}>
                    {selectedCoGuide.active_coguide_load < 3 ? '✓ Available' : '⚠ Capacity Reached'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !guideId || !coGuideId || guideId === coGuideId}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-950 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">↻</span>
                  <span>Confirming Allocation...</span>
                </>
              ) : (
                <span>Confirm Supervisor Allocation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
