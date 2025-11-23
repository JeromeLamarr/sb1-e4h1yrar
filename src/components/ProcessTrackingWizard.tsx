import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react';

interface ProcessStep {
  stage: string;
  label: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'rejected';
  date?: string;
  actor?: string;
}

interface ProcessTrackingWizardProps {
  ipRecordId: string;
  currentStatus: string;
  currentStage: string;
}

export function ProcessTrackingWizard({
  ipRecordId,
  currentStatus,
  currentStage,
}: ProcessTrackingWizardProps) {
  const [tracking, setTracking] = useState<any[]>([]);
  const [steps, setSteps] = useState<ProcessStep[]>([]);

  useEffect(() => {
    fetchTracking();
  }, [ipRecordId]);

  useEffect(() => {
    updateSteps();
  }, [currentStatus, currentStage, tracking]);

  const fetchTracking = async () => {
    const { data, error } = await supabase
      .from('process_tracking')
      .select('*')
      .eq('ip_record_id', ipRecordId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setTracking(data);
    }
  };

  const updateSteps = () => {
    const allSteps: ProcessStep[] = [
      {
        stage: 'submission',
        label: 'Submitted',
        description: 'Application submitted',
        status: 'completed',
      },
      {
        stage: 'supervisor_review',
        label: 'Supervisor Review',
        description: 'Under supervisor review',
        status: 'pending',
      },
      {
        stage: 'evaluation',
        label: 'Evaluation',
        description: 'Technical evaluation',
        status: 'pending',
      },
      {
        stage: 'completion',
        label: 'Completed',
        description: 'Process completed',
        status: 'pending',
      },
    ];

    const statusMap: Record<string, number> = {
      draft: 0,
      waiting_supervisor: 1,
      supervisor_revision: 1,
      supervisor_approved: 2,
      waiting_evaluation: 2,
      evaluator_revision: 2,
      evaluator_approved: 3,
      ready_for_filing: 3,
      completed: 3,
      rejected: -1,
    };

    const currentStepIndex = statusMap[currentStatus] ?? 0;

    const updatedSteps = allSteps.map((step, index) => {
      let status: 'completed' | 'current' | 'pending' | 'rejected' = 'pending';

      if (currentStatus === 'rejected') {
        if (index <= currentStepIndex || (currentStepIndex === -1 && index <= 1)) {
          status = 'rejected';
        }
      } else if (index < currentStepIndex) {
        status = 'completed';
      } else if (index === currentStepIndex) {
        status = 'current';
      }

      const relatedTracking = tracking.find((t) => {
        if (step.stage === 'submission') return t.action === 'created' || t.stage.includes('Submitted');
        if (step.stage === 'supervisor_review')
          return t.stage.includes('Supervisor') || t.status === 'waiting_supervisor';
        if (step.stage === 'evaluation')
          return t.stage.includes('Evaluator') || t.stage.includes('Evaluation');
        if (step.stage === 'completion')
          return t.status === 'evaluator_approved' || t.status === 'ready_for_filing' || t.stage.includes('Ready for Filing');
        return false;
      });

      return {
        ...step,
        status,
        date: relatedTracking?.created_at
          ? new Date(relatedTracking.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : undefined,
        actor: relatedTracking?.actor_name,
      };
    });

    setSteps(updatedSteps);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-6">Process Tracking</h3>

      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.stage} className="flex gap-4 pb-8 last:pb-0">
            <div className="relative flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  step.status === 'completed'
                    ? 'bg-green-500 border-green-500'
                    : step.status === 'current'
                    ? 'bg-blue-500 border-blue-500 animate-pulse'
                    : step.status === 'rejected'
                    ? 'bg-red-500 border-red-500'
                    : 'bg-white border-gray-300'
                }`}
              >
                {step.status === 'completed' ? (
                  <CheckCircle className="h-6 w-6 text-white" />
                ) : step.status === 'current' ? (
                  <Clock className="h-6 w-6 text-white" />
                ) : step.status === 'rejected' ? (
                  <XCircle className="h-6 w-6 text-white" />
                ) : (
                  <Circle className="h-6 w-6 text-gray-300" />
                )}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`w-0.5 h-full mt-2 transition-colors ${
                    step.status === 'completed' || step.status === 'rejected'
                      ? 'bg-gray-300'
                      : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            <div className="flex-1 pt-1">
              <div className="flex items-center justify-between mb-1">
                <h4
                  className={`font-semibold ${
                    step.status === 'completed' || step.status === 'current'
                      ? 'text-gray-900'
                      : step.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-gray-500'
                  }`}
                >
                  {step.label}
                </h4>
                {step.status === 'current' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    In Progress
                  </span>
                )}
                {step.status === 'completed' && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Completed
                  </span>
                )}
                {step.status === 'rejected' && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Rejected
                  </span>
                )}
              </div>

              <p
                className={`text-sm ${
                  step.status === 'completed' || step.status === 'current'
                    ? 'text-gray-600'
                    : 'text-gray-400'
                }`}
              >
                {step.description}
              </p>

              {step.date && (
                <p className="text-xs text-gray-500 mt-1">
                  {step.date}
                  {step.actor && ` • ${step.actor}`}
                </p>
              )}

              {step.status === 'current' && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-blue-600">{currentStage}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {tracking.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <details className="cursor-pointer">
            <summary className="text-sm font-medium text-gray-700 hover:text-gray-900">
              View detailed history ({tracking.length} events)
            </summary>
            <div className="mt-4 space-y-3">
              {tracking.slice().reverse().map((event, index) => (
                <div key={event.id} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5" />
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium">{event.description || event.action}</p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {new Date(event.created_at).toLocaleString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {event.actor_name && ` • ${event.actor_name}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
