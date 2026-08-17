import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentAppSession } from '@/lib/auth/session';
import {
  getAnnexure6DocketAction,
  getDefensePanelDetailsAction,
} from '@/app/actions/annexure6.actions';
import { Annexure6EvaluationForm } from '@/components/annexure6/Annexure6EvaluationForm';
import { Annexure6ConfidentialViewer } from '@/components/annexure6/Annexure6ConfidentialViewer';
import { DefensePanelCard } from '@/components/annexure6/DefensePanelCard';
import type { Annexure6Docket, DefensePanelDetails } from '@/types/annexure6.types';

export const dynamic = 'force-dynamic';

interface GuideAnnexure6DetailPageProps {
  params: Promise<{ thesisId: string }>;
}

export default async function GuideAnnexure6DetailPage({ params }: GuideAnnexure6DetailPageProps) {
  const { thesisId } = await params;
  const session = await getCurrentAppSession();

  if (!session || !session.appUser) {
    redirect('/login');
  }

  let docket: Annexure6Docket | null = null;
  let panelDetails: DefensePanelDetails | null = null;
  let errorMessage: string | null = null;

  try {
    const docketRes = await getAnnexure6DocketAction({ thesis_id: thesisId });
    if (docketRes.success && docketRes.data) {
      docket = ((docketRes.data as any).data || docketRes.data) as Annexure6Docket;
    } else {
      errorMessage = docketRes.error || 'Failed to load Annexure 6 evaluation docket.';
    }

    const panelRes = await getDefensePanelDetailsAction({ thesis_id: thesisId });
    if (panelRes.success && panelRes.data) {
      panelDetails = ((panelRes.data as any).data || panelRes.data) as DefensePanelDetails;
    }
  } catch (err: any) {
    errorMessage = err.message || 'An unexpected error occurred while loading docket.';
  }

  if (errorMessage || !docket) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <Link
          href="/app/guide/annexure-6"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Annexure 6 Queue
        </Link>

        <div className="p-8 rounded-2xl bg-rose-950/30 border border-rose-500/30 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/20 text-rose-400">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-white">Access Denied or Record Not Found</h3>
          <p className="text-sm text-slate-300 max-w-md mx-auto">
            {errorMessage || 'You do not have permission to view this confidential supervisor evaluation.'}
          </p>
        </div>
      </div>
    );
  }

  const isPrimaryGuide = docket.guide?.id === session.appUser.id;
  const isPendingEvaluation = docket.current_state === 'ANNEXURE_6_PENDING';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/guide/annexure-6"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Annexure 6 Queue
        </Link>
      </div>

      {/* Evaluation Form if Pending and user is Guide */}
      {isPendingEvaluation && isPrimaryGuide ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Confidential Supervisory Assessment
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
              Evaluate Candidate Dissertation
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Provide your definitive score, dimensional achievement ratings, and defense recommendation for Thesis {docket.tracking_number}.
            </p>
          </div>

          <Annexure6EvaluationForm
            thesisId={docket.thesis_id}
            trackingNumber={docket.tracking_number}
            studentName={docket.student.name}
            rollNumber={docket.student.roll_number}
            thesisTitle={docket.thesis_id}
          />
        </div>
      ) : (
        /* Docket Viewer if already evaluated */
        <div className="space-y-8">
          <Annexure6ConfidentialViewer docket={docket} />

          {/* Defense Panel Card if constituted */}
          {panelDetails && panelDetails.is_constituted && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                Constituted Defense Panel & Viva Schedule
              </h3>
              <DefensePanelCard
                panelDetails={panelDetails}
                trackingNumber={docket.tracking_number}
                studentName={docket.student.name}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
