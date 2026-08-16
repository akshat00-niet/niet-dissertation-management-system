'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ActiveMilestoneRubric } from '@/types/rubrics.types';
import { RubricBuilder } from '@/components/rubrics/RubricBuilder';
import { RubricViewer } from '@/components/rubrics/RubricViewer';

interface DepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface AdminRubricsWorkbenchProps {
  departments: DepartmentOption[];
  activeRubrics: ActiveMilestoneRubric[];
  canPublish: boolean;
}

export function AdminRubricsWorkbench({
  departments,
  activeRubrics,
  canPublish,
}: AdminRubricsWorkbenchProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'VIEW' | 'BUILD'>('VIEW');
  const [selectedMilestoneFilter, setSelectedMilestoneFilter] = useState<string>('ALL');

  const filteredRubrics = activeRubrics.filter((r) => {
    if (selectedMilestoneFilter === 'ALL') return true;
    return r.milestone_type === selectedMilestoneFilter;
  });

  return (
    <div>
      {/* Navigation & Header */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Institutional 4-Column Rubrics Console
            </h1>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Manage dynamic evaluation rubrics, dimensional criteria, and 4-tier achievement descriptors
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setActiveTab('VIEW')}
              className={activeTab === 'VIEW' ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              📋 Active Published Rubrics ({activeRubrics.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('BUILD')}
              className={activeTab === 'BUILD' ? 'btn btn-primary' : 'btn btn-secondary'}
            >
              ✏️ Create Rubric Draft
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'BUILD' ? (
        <RubricBuilder
          departments={departments}
          onSuccess={() => {
            setActiveTab('VIEW');
            router.refresh();
          }}
        />
      ) : (
        <div>
          {/* Milestone Filter Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {['ALL', 'P1', 'P2', 'P3', 'FINAL_VIVA'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedMilestoneFilter(m)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: '1px solid var(--border)',
                    backgroundColor: selectedMilestoneFilter === m ? 'var(--primary)' : 'var(--bg-card)',
                    color: selectedMilestoneFilter === m ? '#ffffff' : 'var(--text-main)',
                    cursor: 'pointer',
                  }}
                >
                  {m}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Showing {filteredRubrics.length} active rubric templates
            </span>
          </div>

          {filteredRubrics.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                No active published rubrics found for the selected milestone filter.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('BUILD')}
                className="btn btn-primary"
                style={{ marginTop: '1rem' }}
              >
                Create New Rubric Version
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {filteredRubrics.map((rubric) => (
                <RubricViewer
                  key={rubric.rubric_version_id || rubric.rubric_id}
                  rubric={rubric}
                  isPublished={true}
                  canPublish={canPublish}
                  onPublishSuccess={() => router.refresh()}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
