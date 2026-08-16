'use client';

import React, { useState } from 'react';
import type { MilestoneType, CreateRubricCriterionInput } from '@/types/rubrics.types';
import { createRubricVersionDraftAction } from '@/app/actions/rubrics.actions';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface RubricBuilderProps {
  departments: DepartmentOption[];
  onSuccess?: () => void;
}

const DEFAULT_LEVELS = [
  { level_index: 1, label: 'Unsatisfactory', descriptor: 'Fails to meet basic expectations.', score_percentage: 0.25 },
  { level_index: 2, label: 'Developing', descriptor: 'Meets minimum requirements with visible gaps.', score_percentage: 0.5 },
  { level_index: 3, label: 'Proficient', descriptor: 'Demonstrates solid execution and domain competence.', score_percentage: 0.75 },
  { level_index: 4, label: 'Exemplary', descriptor: 'Exceeds standard expectations with publication-grade rigor.', score_percentage: 1.0 },
];

export function RubricBuilder({ departments, onSuccess }: RubricBuilderProps) {
  const [departmentId, setDepartmentId] = useState<string>(departments[0]?.id || '');
  const [milestoneType, setMilestoneType] = useState<MilestoneType>('P1');
  const [title, setTitle] = useState<string>('Standard 4-Column Assessment Rubric');
  const [criteria, setCriteria] = useState<CreateRubricCriterionInput[]>([
    {
      criterion_title: 'Literature Review & Formulation',
      description: 'Depth of state-of-the-art analysis and clarity of problem statement.',
      max_marks: 25,
      achievement_levels: [...DEFAULT_LEVELS],
    },
    {
      criterion_title: 'Methodology & Design Rigor',
      description: 'Appropriateness of theoretical framework and architectural validation.',
      max_marks: 25,
      achievement_levels: [...DEFAULT_LEVELS],
    },
    {
      criterion_title: 'Implementation & Prototype Progress',
      description: 'Completeness of implementation, experimentation, and toolchain.',
      max_marks: 25,
      achievement_levels: [...DEFAULT_LEVELS],
    },
    {
      criterion_title: 'Presentation & Defense Readiness',
      description: 'Clarity of oral defense, Q&A mastery, and slide organization.',
      max_marks: 25,
      achievement_levels: [...DEFAULT_LEVELS],
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Live sum calculation
  const totalMaxMarks = criteria.reduce((sum, c) => sum + (Number(c.max_marks) || 0), 0);
  const isTotalValid = Math.abs(totalMaxMarks - 100.0) < 0.001;

  const handleAddCriterion = () => {
    setCriteria((prev) => [
      ...prev,
      {
        criterion_title: `New Criterion #${prev.length + 1}`,
        description: '',
        max_marks: 0,
        achievement_levels: [...DEFAULT_LEVELS],
      },
    ]);
  };

  const handleRemoveCriterion = (index: number) => {
    if (criteria.length <= 1) {
      setError('Rubric must have at least one criterion.');
      return;
    }
    setCriteria((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleCriterionChange = (index: number, field: keyof CreateRubricCriterionInput, value: any) => {
    setCriteria((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleLevelChange = (
    critIndex: number,
    levelIndex: number,
    field: string,
    value: any
  ) => {
    setCriteria((prev) => {
      const copy = [...prev];
      const levelsCopy = [...copy[critIndex].achievement_levels];
      levelsCopy[levelIndex] = { ...levelsCopy[levelIndex], [field]: value };
      copy[critIndex] = { ...copy[critIndex], achievement_levels: levelsCopy };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!departmentId) {
      setError('Please select a target department.');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a rubric title.');
      return;
    }

    if (!isTotalValid) {
      setError(`Total criteria marks sum to ${totalMaxMarks}. Exactly 100.0 is required.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createRubricVersionDraftAction({
        department_id: departmentId,
        milestone_type: milestoneType,
        title: title.trim(),
        criteria: criteria.map((c) => ({
          criterion_title: c.criterion_title.trim(),
          description: c.description?.trim() || null,
          max_marks: Number(c.max_marks),
          achievement_levels: c.achievement_levels.map((l) => ({
            level_index: Number(l.level_index),
            label: l.label.trim(),
            descriptor: l.descriptor.trim(),
            score_percentage: Number(l.score_percentage),
          })),
        })),
      });

      if (res.success) {
        setSuccessMsg(`Rubric draft created successfully! (Version ${res.data?.version_number || 1})`);
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || res.data?.message || 'Failed to create rubric version draft.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Configuration Header Card */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
          4-Column Dynamic Rubric Configuration
        </h3>

        {error && (
          <div
            style={{
              backgroundColor: 'var(--danger-light)',
              border: '1px solid var(--danger)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: 'var(--danger)',
              fontSize: '0.8125rem',
            }}
          >
            {error}
          </div>
        )}

        {successMsg && (
          <div
            style={{
              backgroundColor: 'var(--success-light)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              color: 'var(--success)',
              fontSize: '0.8125rem',
            }}
          >
            {successMsg}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
              Academic Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
              }}
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
              Milestone Presentation Type *
            </label>
            <select
              value={milestoneType}
              onChange={(e) => setMilestoneType(e.target.value as MilestoneType)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
              }}
            >
              <option value="P1">Milestone 1 (P1)</option>
              <option value="P2">Milestone 2 (P2)</option>
              <option value="P3">Milestone 3 (P3 — Pre-Submission)</option>
              <option value="FINAL_VIVA">Final Viva Defense</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.375rem' }}>
              Rubric Master Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
              }}
            />
          </div>
        </div>
      </div>

      {/* Criteria Roster */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Dimensional Criteria & Dynamic 4-Tiers
            </h3>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Configure each criterion weight and its 4 achievement level descriptors
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span
              style={{
                padding: '0.375rem 0.75rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                backgroundColor: isTotalValid ? 'var(--success-light)' : 'var(--danger-light)',
                color: isTotalValid ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${isTotalValid ? 'var(--success)' : 'var(--danger)'}`,
              }}
            >
              Total Weight: {totalMaxMarks.toFixed(1)} / 100.0 {isTotalValid ? '✓' : '⚠️'}
            </span>

            <button
              type="button"
              onClick={handleAddCriterion}
              disabled={isSubmitting}
              className="btn btn-secondary"
            >
              + Add Criterion
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {criteria.map((crit, cIdx) => (
            <div
              key={cIdx}
              className="card"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '0.75rem' }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Criterion Title #{cIdx + 1} *
                    </label>
                    <input
                      type="text"
                      value={crit.criterion_title}
                      onChange={(e) => handleCriterionChange(cIdx, 'criterion_title', e.target.value)}
                      disabled={isSubmitting}
                      required
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      Max Marks (Weight) *
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      step={0.5}
                      value={crit.max_marks}
                      onChange={(e) => handleCriterionChange(cIdx, 'max_marks', parseFloat(e.target.value) || 0)}
                      disabled={isSubmitting}
                      required
                      style={{
                        width: '100%',
                        padding: '0.4rem 0.6rem',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-main)',
                        fontSize: '0.875rem',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveCriterion(cIdx)}
                  disabled={isSubmitting || criteria.length <= 1}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--danger)',
                    cursor: criteria.length <= 1 ? 'not-allowed' : 'pointer',
                    fontSize: '0.8125rem',
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  ✕ Remove
                </button>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  Criterion Description (Optional)
                </label>
                <input
                  type="text"
                  value={crit.description || ''}
                  onChange={(e) => handleCriterionChange(cIdx, 'description', e.target.value)}
                  placeholder="Guidance on what aspects are evaluated under this criterion..."
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '0.4rem 0.6rem',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '0.8125rem',
                  }}
                />
              </div>

              {/* 4 Achievement Level Column Editors */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
                  4 Achievement Tiers (Level 1 to Level 4)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {crit.achievement_levels.map((level, lIdx) => (
                    <div
                      key={lIdx}
                      style={{
                        backgroundColor: 'var(--bg-main)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius)',
                        padding: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                          Level {level.level_index}
                        </span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          {(level.score_percentage * 100).toFixed(0)}%
                        </span>
                      </div>

                      <input
                        type="text"
                        value={level.label}
                        onChange={(e) => handleLevelChange(cIdx, lIdx, 'label', e.target.value)}
                        placeholder="Tier Label"
                        disabled={isSubmitting}
                        required
                        style={{
                          width: '100%',
                          padding: '0.25rem 0.4rem',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-card)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          marginBottom: '0.25rem',
                        }}
                      />

                      <textarea
                        value={level.descriptor}
                        onChange={(e) => handleLevelChange(cIdx, lIdx, 'descriptor', e.target.value)}
                        placeholder="Performance descriptor..."
                        rows={2}
                        disabled={isSubmitting}
                        required
                        style={{
                          width: '100%',
                          padding: '0.25rem 0.4rem',
                          borderRadius: 'var(--radius)',
                          border: '1px solid var(--border)',
                          backgroundColor: 'var(--bg-card)',
                          fontSize: '0.6875rem',
                          resize: 'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submit Action Card */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-main)',
        }}
      >
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          Draft versions are created in unpublished state. HOD or Admin can publish once verified.
        </div>

        <button
          type="submit"
          disabled={!isTotalValid || isSubmitting}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Creating Rubric Draft...' : 'Create Rubric Version Draft'}
        </button>
      </div>
    </form>
  );
}
