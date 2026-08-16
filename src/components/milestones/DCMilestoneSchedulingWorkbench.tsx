'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { DepartmentMilestoneSummary } from '@/types/milestones.types';
import { DCSchedulingModal } from '@/components/milestones/DCSchedulingModal';
import { MilestoneScorecardModal } from '@/components/milestones/MilestoneScorecardModal';

interface DCMilestoneSchedulingWorkbenchProps {
  departmentId: string;
  departmentName: string;
  theses: DepartmentMilestoneSummary[];
}

export function DCMilestoneSchedulingWorkbench({
  departmentId: _departmentId,
  departmentName,
  theses,
}: DCMilestoneSchedulingWorkbenchProps) {
  const router = useRouter();
  const [filterState, setFilterState] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [schedulingTarget, setSchedulingTarget] = useState<{
    thesisId: string;
    trackingNumber: string;
    studentName: string;
    milestoneType: 'P1' | 'P2' | 'P3';
  } | null>(null);

  const [scorecardTarget, setScorecardTarget] = useState<{
    thesisId: string;
    milestoneType: 'P1' | 'P2' | 'P3';
  } | null>(null);

  const filteredTheses = theses.filter((t) => {
    if (filterState === 'SCHEDULED') {
      if (!['P1_EVALUATION_SCHEDULED', 'P2_EVALUATION_SCHEDULED', 'P3_EVALUATION_SCHEDULED'].includes(t.current_state)) {
        return false;
      }
    } else if (filterState === 'RESEARCH_EXECUTION') {
      if (t.current_state !== 'RESEARCH_EXECUTION') {
        return false;
      }
    } else if (filterState === 'COMPLETED') {
      if (t.current_state !== 'ANNEXURE_5_PREPARATION' && !t.p3_evaluation) {
        return false;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRoll = t.student_roll.toLowerCase().includes(q);
      const matchName = t.student_name.toLowerCase().includes(q);
      const matchTrack = t.tracking_number.toLowerCase().includes(q);
      return matchRoll || matchName || matchTrack;
    }

    return true;
  });

  return (
    <div>
      {/* Overview & Filter Bar */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {departmentName} — Candidate Milestone Scheduling
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Manage and coordinate P1, P2, and P3 presentation dates for active dissertations
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Search roll, name, tracking #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                minWidth: '220px',
              }}
            />

            <select
              value={filterState}
              onChange={(e) => setFilterState(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-main)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
              }}
            >
              <option value="ALL">All States ({theses.length})</option>
              <option value="RESEARCH_EXECUTION">Ready for Scheduling (RESEARCH_EXECUTION)</option>
              <option value="SCHEDULED">Currently Scheduled</option>
              <option value="COMPLETED">P3 Cleared</option>
            </select>
          </div>
        </div>
      </div>

      {/* Candidates Milestone Roster Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Candidate</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Tracking #</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>Current State</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>P1 Status</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>P2 Status</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)' }}>P3 Status</th>
                <th style={{ padding: '0.875rem 1rem', fontWeight: 600, color: 'var(--text-main)', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTheses.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No candidates found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredTheses.map((t) => {
                  const isReadyForMilestone = t.current_state === 'RESEARCH_EXECUTION' || t.current_state === 'ANNEXURE_2_DCEC_APPROVED';
                  const canScheduleP1 = isReadyForMilestone && !t.p1_evaluation;
                  const canScheduleP2 = isReadyForMilestone && !!t.p1_evaluation && !t.p2_evaluation;
                  const canScheduleP3 = isReadyForMilestone && !!t.p2_evaluation && !t.p3_evaluation;

                  return (
                    <tr key={t.thesis_id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.student_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Roll: {t.student_roll}</div>
                      </td>

                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', fontWeight: 600, color: 'var(--primary)' }}>
                        {t.tracking_number}
                      </td>

                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                          }}
                        >
                          {t.current_state}
                        </span>
                      </td>

                      {/* P1 Column */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        {t.p1_evaluation ? (
                          <button
                            type="button"
                            onClick={() => setScorecardTarget({ thesisId: t.thesis_id, milestoneType: 'P1' })}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--success)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.8125rem',
                              textDecoration: 'underline',
                            }}
                          >
                            ✓ {t.p1_evaluation.total_marks_awarded} / 100
                          </button>
                        ) : t.current_state === 'P1_EVALUATION_SCHEDULED' ? (
                          <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.75rem' }}>📅 Scheduled</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unscheduled</span>
                        )}
                      </td>

                      {/* P2 Column */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        {t.p2_evaluation ? (
                          <button
                            type="button"
                            onClick={() => setScorecardTarget({ thesisId: t.thesis_id, milestoneType: 'P2' })}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--success)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.8125rem',
                              textDecoration: 'underline',
                            }}
                          >
                            ✓ {t.p2_evaluation.total_marks_awarded} / 100
                          </button>
                        ) : t.current_state === 'P2_EVALUATION_SCHEDULED' ? (
                          <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.75rem' }}>📅 Scheduled</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unscheduled</span>
                        )}
                      </td>

                      {/* P3 Column */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle' }}>
                        {t.p3_evaluation ? (
                          <button
                            type="button"
                            onClick={() => setScorecardTarget({ thesisId: t.thesis_id, milestoneType: 'P3' })}
                            style={{
                              backgroundColor: 'transparent',
                              border: 'none',
                              color: 'var(--success)',
                              fontWeight: 700,
                              cursor: 'pointer',
                              padding: 0,
                              fontSize: '0.8125rem',
                              textDecoration: 'underline',
                            }}
                          >
                            ⭐ {t.p3_evaluation.total_marks_awarded} / 100
                          </button>
                        ) : t.current_state === 'P3_EVALUATION_SCHEDULED' ? (
                          <span style={{ color: 'var(--warning)', fontWeight: 600, fontSize: '0.75rem' }}>📅 Scheduled</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Unscheduled</span>
                        )}
                      </td>

                      {/* Action Button */}
                      <td style={{ padding: '0.875rem 1rem', verticalAlign: 'middle', textAlign: 'right' }}>
                        {canScheduleP1 && (
                          <button
                            type="button"
                            onClick={() => setSchedulingTarget({ thesisId: t.thesis_id, trackingNumber: t.tracking_number, studentName: t.student_name, milestoneType: 'P1' })}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Schedule P1
                          </button>
                        )}
                        {canScheduleP2 && (
                          <button
                            type="button"
                            onClick={() => setSchedulingTarget({ thesisId: t.thesis_id, trackingNumber: t.tracking_number, studentName: t.student_name, milestoneType: 'P2' })}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Schedule P2
                          </button>
                        )}
                        {canScheduleP3 && (
                          <button
                            type="button"
                            onClick={() => setSchedulingTarget({ thesisId: t.thesis_id, trackingNumber: t.tracking_number, studentName: t.student_name, milestoneType: 'P3' })}
                            className="btn btn-primary"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                          >
                            Schedule P3
                          </button>
                        )}
                        {!canScheduleP1 && !canScheduleP2 && !canScheduleP3 && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {t.p3_evaluation ? 'P3 Completed' : 'Awaiting State Ready'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scheduling Modal */}
      {schedulingTarget && (
        <DCSchedulingModal
          thesisId={schedulingTarget.thesisId}
          trackingNumber={schedulingTarget.trackingNumber}
          studentName={schedulingTarget.studentName}
          defaultMilestoneType={schedulingTarget.milestoneType}
          isOpen={true}
          onClose={() => setSchedulingTarget(null)}
          onSuccess={() => {
            setSchedulingTarget(null);
            router.refresh();
          }}
        />
      )}

      {/* Scorecard Modal */}
      {scorecardTarget && (
        <MilestoneScorecardModal
          thesisId={scorecardTarget.thesisId}
          milestoneType={scorecardTarget.milestoneType}
          isOpen={true}
          onClose={() => setScorecardTarget(null)}
        />
      )}
    </div>
  );
}
