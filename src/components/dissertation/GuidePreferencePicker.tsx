'use client';

import React from 'react';
import type { DepartmentFacultyOption, GuidePreferenceInput } from '@/types/annexure1.types';

interface GuidePreferencePickerProps {
  facultyList: DepartmentFacultyOption[];
  preferences: GuidePreferenceInput[];
  onChange: (updatedPreferences: GuidePreferenceInput[]) => void;
  disabled?: boolean;
}

const RANK_LABELS = [
  '1st Preference (Primary Desired Supervisor)',
  '2nd Preference (Secondary Desired Supervisor)',
  '3rd Preference (Alternate Supervisor Option)',
  '4th Preference (Alternate Supervisor Option)',
];

export function GuidePreferencePicker({
  facultyList,
  preferences,
  onChange,
  disabled = false,
}: GuidePreferencePickerProps) {
  // Ensure we always have 4 elements
  const normalizedPrefs: GuidePreferenceInput[] = [1, 2, 3, 4].map((rank) => {
    const found = preferences.find((p) => p.preference_rank === rank);
    return found || { faculty_id: '', preference_rank: rank, domain_justification: '' };
  });

  const handleFacultySelect = (rank: number, facultyId: string) => {
    const updated = normalizedPrefs.map((p) =>
      p.preference_rank === rank ? { ...p, faculty_id: facultyId } : p
    );
    onChange(updated);
  };

  const handleJustificationChange = (rank: number, text: string) => {
    const updated = normalizedPrefs.map((p) =>
      p.preference_rank === rank ? { ...p, domain_justification: text } : p
    );
    onChange(updated);
  };

  // Set of selected faculty IDs to highlight or prevent duplicates
  const selectedFacultyIds = new Set(
    normalizedPrefs.map((p) => p.faculty_id).filter(Boolean)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Four (4) Ranked Faculty Supervisor Preferences <span style={{ color: 'var(--color-primary)' }}>*</span>
          </h4>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
            Select four distinct faculty members from your department in order of your research preference.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {normalizedPrefs.map((pref, idx) => {
          const rank = pref.preference_rank;
          const otherSelectedIds = new Set(
            normalizedPrefs
              .filter((p) => p.preference_rank !== rank)
              .map((p) => p.faculty_id)
              .filter(Boolean)
          );

          const selectedFaculty = facultyList.find((f) => f.user_id === pref.faculty_id);

          return (
            <div
              key={rank}
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                padding: '1rem',
                background: '#FFFFFF',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                  Preference Rank #{rank}
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: rank === 1 ? 'rgba(215, 25, 32, 0.1)' : 'var(--color-bg-subtle)',
                    color: rank === 1 ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  }}
                >
                  {RANK_LABELS[idx].split(' ')[0]}
                </span>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label
                  htmlFor={`pref-select-${rank}`}
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}
                >
                  Supervisor Designation
                </label>
                <select
                  id={`pref-select-${rank}`}
                  className="input"
                  style={{ width: '100%', fontSize: '0.8125rem', padding: '0.4rem 0.6rem' }}
                  value={pref.faculty_id}
                  onChange={(e) => handleFacultySelect(rank, e.target.value)}
                  disabled={disabled}
                  required
                >
                  <option value="">-- Choose Faculty Supervisor --</option>
                  {facultyList.map((faculty) => {
                    const isChosenElsewhere = otherSelectedIds.has(faculty.user_id);
                    return (
                      <option
                        key={faculty.user_id}
                        value={faculty.user_id}
                        disabled={isChosenElsewhere}
                      >
                        {faculty.full_name} ({faculty.designation}) {isChosenElsewhere ? '— [Already Selected]' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedFaculty && (
                <div
                  style={{
                    background: 'var(--color-bg-subtle)',
                    padding: '0.5rem 0.625rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    marginBottom: '0.75rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  <div><strong>Department:</strong> {selectedFaculty.department_code}</div>
                  <div><strong>Current Guide Load:</strong> {selectedFaculty.active_guide_load} / 3</div>
                </div>
              )}

              <div>
                <label
                  htmlFor={`pref-just-${rank}`}
                  style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.25rem' }}
                >
                  Domain Alignment Justification (Optional)
                </label>
                <input
                  id={`pref-just-${rank}`}
                  type="text"
                  className="input"
                  placeholder="e.g. Prior work in ML / NLP"
                  style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                  value={pref.domain_justification || ''}
                  onChange={(e) => handleJustificationChange(rank, e.target.value)}
                  disabled={disabled}
                  maxLength={200}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
