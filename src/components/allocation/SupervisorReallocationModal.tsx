'use client';

import React, { useState } from 'react';
import type { AllocationQueueItem, FacultyAllocationOption } from '@/types/allocation.types';
import { reallocateSupervisorsAction } from '@/app/actions/allocation.actions';

interface SupervisorReallocationModalProps {
  item: AllocationQueueItem;
  facultyOptions: FacultyAllocationOption[];
  onClose: () => void;
  onSuccess: () => void;
}

export function SupervisorReallocationModal({
  item,
  facultyOptions,
  onClose,
  onSuccess,
}: SupervisorReallocationModalProps) {
  const [newGuideId, setNewGuideId] = useState<string>(item.guide_id || '');
  const [newCoGuideId, setNewCoGuideId] = useState<string>(item.co_guide_id || '');
  const [justification, setJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedNewGuide = facultyOptions.find((f) => f.faculty_id === newGuideId);
  const selectedNewCoGuide = facultyOptions.find((f) => f.faculty_id === newCoGuideId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newGuideId || !newCoGuideId) {
      setErrorMessage('Please select both a new Primary Guide and Co-Guide.');
      return;
    }

    if (newGuideId === newCoGuideId) {
      setErrorMessage('New Primary Guide and new Co-Guide cannot be the same faculty member.');
      return;
    }

    if (!justification || justification.trim().length < 10) {
      setErrorMessage('Please provide a detailed institutional justification (minimum 10 characters).');
      return;
    }

    if (
      newGuideId !== item.guide_id &&
      selectedNewGuide &&
      selectedNewGuide.active_guide_load >= 3
    ) {
      setErrorMessage(`${selectedNewGuide.full_name} has reached maximum Guide capacity (3/3).`);
      return;
    }

    if (
      newCoGuideId !== item.co_guide_id &&
      selectedNewCoGuide &&
      selectedNewCoGuide.active_coguide_load >= 3
    ) {
      setErrorMessage(`${selectedNewCoGuide.full_name} has reached maximum Co-Guide capacity (3/3).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await reallocateSupervisorsAction({
        thesis_id: item.thesis_id,
        new_guide_id: newGuideId,
        new_co_guide_id: newCoGuideId,
        justification: justification.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to reallocate supervisors.');
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
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl max-w-3xl w-full p-6 md:p-8 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md">
                EXCEPTIONAL REALLOCATION
              </span>
              <span className="text-xs text-slate-400">Institutional Governance Protocol</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              Reassign Supervisors: {item.tracking_number}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Existing Allocation Context */}
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs">Candidate: {item.student_name}</span>
            <span className="text-slate-400 text-xs">Roll: {item.student_roll_number}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80 text-xs">
            <div>
              <span className="text-slate-400 block">Current Guide:</span>
              <span className="text-emerald-400 font-medium">{item.guide_name || 'None'}</span>
            </div>
            <div>
              <span className="text-slate-400 block">Current Co-Guide:</span>
              <span className="text-blue-400 font-medium">{item.co_guide_name || 'None'}</span>
            </div>
          </div>
        </div>

        {/* Reallocation Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-sm text-rose-200">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Primary Guide */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                New Primary Guide <span className="text-rose-400">*</span>
              </label>
              <select
                value={newGuideId}
                onChange={(e) => setNewGuideId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Select New Primary Guide --</option>
                {facultyOptions.map((f) => (
                  <option
                    key={f.faculty_id}
                    value={f.faculty_id}
                    disabled={
                      (f.faculty_id !== item.guide_id && f.active_guide_load >= 3) ||
                      !f.is_available ||
                      f.faculty_id === newCoGuideId
                    }
                  >
                    {f.full_name} ({f.designation}) — Guide: {f.active_guide_load}/3{' '}
                    {f.faculty_id === item.guide_id
                      ? '[CURRENT]'
                      : f.active_guide_load >= 3
                      ? '[FULL]'
                      : !f.is_available
                      ? '[UNAVAILABLE]'
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* New Co-Guide */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                New Co-Guide <span className="text-rose-400">*</span>
              </label>
              <select
                value={newCoGuideId}
                onChange={(e) => setNewCoGuideId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">-- Select New Co-Guide --</option>
                {facultyOptions.map((f) => (
                  <option
                    key={f.faculty_id}
                    value={f.faculty_id}
                    disabled={
                      (f.faculty_id !== item.co_guide_id && f.active_coguide_load >= 3) ||
                      !f.is_available ||
                      f.faculty_id === newGuideId
                    }
                  >
                    {f.full_name} ({f.designation}) — Co-Guide: {f.active_coguide_load}/3{' '}
                    {f.faculty_id === item.co_guide_id
                      ? '[CURRENT]'
                      : f.active_coguide_load >= 3
                      ? '[FULL]'
                      : !f.is_available
                      ? '[UNAVAILABLE]'
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mandatory Justification */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Institutional Reallocation Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              rows={3}
              placeholder="Provide the formal academic reason for supervisor reassignment (e.g. Faculty sabbatical, domain expertise realignment, medical leave)..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-[11px] text-slate-400">
              This justification is permanently stored in the immutable WORM allocation history log and
              dispatched to all affected supervisors.
            </p>
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
              disabled={isSubmitting || !justification.trim() || newGuideId === newCoGuideId}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-amber-950 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">↻</span>
                  <span>Executing Reallocation...</span>
                </>
              ) : (
                <span>Execute Exceptional Reallocation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
