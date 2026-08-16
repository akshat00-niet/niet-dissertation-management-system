'use client';

import React, { useState } from 'react';
import { submitAnnexure5PackageAction } from '@/app/actions/annexure5.actions';
import type { Annexure5Submission } from '@/types/annexure5.types';

interface Annexure5SubmissionFormProps {
  thesisId: string;
  existingSubmission?: Annexure5Submission | null;
  onSuccess: () => void;
}

export function Annexure5SubmissionForm({
  thesisId,
  existingSubmission,
  onSuccess,
}: Annexure5SubmissionFormProps) {
  const [manuscriptDocId, setManuscriptDocId] = useState(
    existingSubmission?.manuscript_document_id || ''
  );
  const [synopsisDocId, setSynopsisDocId] = useState(
    existingSubmission?.synopsis_document_id || ''
  );
  const [similarityCertId, setSimilarityCertId] = useState(
    existingSubmission?.similarity_certificate_id || ''
  );
  const [repositoryUrl, setRepositoryUrl] = useState(
    existingSubmission?.repository_url || ''
  );
  const [plagiarismPercent, setPlagiarismPercent] = useState<string>(
    existingSubmission?.plagiarism_percentage !== undefined
      ? existingSubmission.plagiarism_percentage.toString()
      : '0.0'
  );
  const [aiPercent, setAiPercent] = useState<string>(
    existingSubmission?.ai_similarity_percentage !== undefined
      ? existingSubmission.ai_similarity_percentage.toString()
      : '0.0'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Compute validation states
  const numPlagiarism = parseFloat(plagiarismPercent);
  const numAi = parseFloat(aiPercent);

  const isPlagiarismValid = !isNaN(numPlagiarism) && numPlagiarism >= 0.0 && numPlagiarism < 10.0;
  const isAiValid = !isNaN(numAi) && numAi === 0.0;
  const isDocsPresent =
    manuscriptDocId.trim().length > 0 &&
    synopsisDocId.trim().length > 0 &&
    similarityCertId.trim().length > 0;

  const isFormValid = isPlagiarismValid && isAiValid && isDocsPresent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isPlagiarismValid) {
      setErrorMessage('Plagiarism similarity must be >= 0.0% and < 10.0% to satisfy institutional requirements.');
      return;
    }

    if (!isAiValid) {
      setErrorMessage('AI generated content similarity must be strictly 0.0% to satisfy institutional requirements.');
      return;
    }

    if (!isDocsPresent) {
      setErrorMessage('All three document references (Manuscript, Synopsis, Similarity Certificate) are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await submitAnnexure5PackageAction({
        thesis_id: thesisId,
        manuscript_document_id: manuscriptDocId.trim(),
        synopsis_document_id: synopsisDocId.trim(),
        similarity_certificate_id: similarityCertId.trim(),
        repository_url: repositoryUrl.trim() || null,
        plagiarism_percentage: numPlagiarism,
        ai_similarity_percentage: numAi,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to submit Annexure 5 package.');
        return;
      }

      setSuccessMessage('Annexure 5 package submitted successfully. Awaiting supervisory endorsement.');
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        borderRadius: 'var(--radius, 12px)',
        border: '1px solid var(--border, #e2e8f0)',
        padding: '1.5rem',
      }}
    >
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 700 }}>
          Submit Final Dissertation Package (Annexure 5)
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted-foreground)' }}>
          Attach the final manuscript, approved synopsis, Turnitin/DrillBit report, and repository reference.
        </p>
      </div>

      {errorMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius, 8px)',
            backgroundColor: 'var(--destructive-light, rgba(239, 68, 68, 0.1))',
            border: '1px solid var(--destructive, #ef4444)',
            color: 'var(--destructive, #dc2626)',
            fontSize: '0.85rem',
          }}
        >
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius, 8px)',
            backgroundColor: 'var(--success-light, rgba(34, 197, 94, 0.1))',
            border: '1px solid var(--success, #16a34a)',
            color: 'var(--success, #16a34a)',
            fontSize: '0.85rem',
          }}
        >
          {successMessage}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Document 1: Manuscript */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Manuscript Document ID (PDF) <span style={{ color: 'var(--destructive)' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={manuscriptDocId}
            onChange={(e) => setManuscriptDocId(e.target.value)}
            placeholder="UUID of uploaded THESIS_MANUSCRIPT_ANNEXURE_5"
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius, 8px)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-muted, #f8fafc)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Document 2: Synopsis */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Synopsis Document ID (PDF) <span style={{ color: 'var(--destructive)' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={synopsisDocId}
            onChange={(e) => setSynopsisDocId(e.target.value)}
            placeholder="UUID of uploaded SYNOPSIS_DOCUMENT"
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius, 8px)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-muted, #f8fafc)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Document 3: Similarity Certificate */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Similarity Certificate ID (PDF) <span style={{ color: 'var(--destructive)' }}>*</span>
          </label>
          <input
            type="text"
            required
            value={similarityCertId}
            onChange={(e) => setSimilarityCertId(e.target.value)}
            placeholder="UUID of uploaded SIMILARITY_CERTIFICATE"
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius, 8px)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-muted, #f8fafc)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Repository URL */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
            Source Code Repository URL (Optional)
          </label>
          <input
            type="url"
            value={repositoryUrl}
            onChange={(e) => setRepositoryUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            style={{
              width: '100%',
              padding: '0.65rem 0.75rem',
              borderRadius: 'var(--radius, 8px)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-muted, #f8fafc)',
              fontSize: '0.85rem',
            }}
          />
        </div>
      </div>

      {/* Similarity Benchmarks Section */}
      <div
        style={{
          padding: '1rem',
          borderRadius: 'var(--radius, 8px)',
          border: '1px solid var(--border)',
          backgroundColor: 'var(--bg-muted, #f8fafc)',
          marginBottom: '1.5rem',
        }}
      >
        <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700 }}>
          Turnitin / DrillBit Similarity Compliance Benchmarks
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Plagiarism Percentage */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              Plagiarism Similarity Percentage (%) <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={plagiarismPercent}
              onChange={(e) => setPlagiarismPercent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius, 8px)',
                border: `1px solid ${isPlagiarismValid ? 'var(--border)' : 'var(--destructive, #ef4444)'}`,
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            />
            <div
              style={{
                fontSize: '0.75rem',
                marginTop: '0.35rem',
                color: isPlagiarismValid ? 'var(--success, #16a34a)' : 'var(--destructive, #dc2626)',
                fontWeight: 500,
              }}
            >
              {isPlagiarismValid
                ? '✓ Complies with institutional threshold (< 10.0%)'
                : '⚠ Violation: Plagiarism percentage must be >= 0.0% and < 10.0%'}
            </div>
          </div>

          {/* AI Content Percentage */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
              AI Generated Content Similarity (%) <span style={{ color: 'var(--destructive)' }}>*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              value={aiPercent}
              onChange={(e) => setAiPercent(e.target.value)}
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem',
                borderRadius: 'var(--radius, 8px)',
                border: `1px solid ${isAiValid ? 'var(--border)' : 'var(--destructive, #ef4444)'}`,
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            />
            <div
              style={{
                fontSize: '0.75rem',
                marginTop: '0.35rem',
                color: isAiValid ? 'var(--success, #16a34a)' : 'var(--destructive, #dc2626)',
                fontWeight: 500,
              }}
            >
              {isAiValid
                ? '✓ Complies with zero AI content policy (0.0%)'
                : '⚠ Violation: AI similarity must be strictly 0.0%'}
            </div>
          </div>
        </div>
      </div>

      {/* Submission Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button
          type="submit"
          disabled={isSubmitting || !isFormValid}
          style={{
            padding: '0.75rem 1.75rem',
            borderRadius: 'var(--radius, 8px)',
            backgroundColor: isFormValid ? 'var(--primary, #2563eb)' : 'var(--muted)',
            color: isFormValid ? '#ffffff' : 'var(--muted-foreground)',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: isFormValid && !isSubmitting ? 'pointer' : 'not-allowed',
            boxShadow: isFormValid ? '0 2px 4px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {isSubmitting ? 'Submitting Package...' : 'Submit Annexure 5 Package'}
        </button>
      </div>
    </form>
  );
}
