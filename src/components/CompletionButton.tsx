import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle, Loader2 } from 'lucide-react';

interface CompletionButtonProps {
  recordId: string;
  currentStatus: string;
  applicantEmail: string;
  applicantName: string;
  title: string;
  referenceNumber: string;
  category: string;
  onComplete: () => void;
}

export function CompletionButton({
  recordId,
  currentStatus,
  applicantEmail,
  applicantName,
  title,
  referenceNumber,
  category,
  onComplete,
}: CompletionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (
      !confirm(
        `Are you sure you want to mark this submission as completed and ready for IPO Philippines filing?\n\nThis will:\n1. Update the status to "Ready for Filing"\n2. Send a completion notification email to the applicant\n3. Enable certificate generation for this record`
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      const { data: recordData, error: fetchError } = await supabase
        .from('ip_records')
        .select('applicant_id')
        .eq('id', recordId)
        .single();

      if (fetchError) {
        console.error('Error fetching record:', fetchError);
        throw new Error('Failed to fetch record details');
      }

      const { error: updateError } = await supabase
        .from('ip_records')
        .update({
          status: 'ready_for_filing',
          current_stage: 'Completed - Ready for IPO Philippines Filing',
        })
        .eq('id', recordId);

      if (updateError) {
        console.error('Error updating record:', updateError);
        throw new Error('Failed to update record status');
      }

      const { data: { session } } = await supabase.auth.getSession();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-completion-notification`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          applicantEmail,
          applicantName,
          title,
          referenceNumber,
          category,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to send completion notification:', errorText);
      }

      if (recordData?.applicant_id) {
        const { error: notificationError } = await supabase.from('notifications').insert({
          user_id: recordData.applicant_id,
          type: 'completion',
          title: 'IP Registration Completed',
          message: `Your submission "${title}" has been completed and is now ready for IPO Philippines filing. You can now request your official certificate!`,
          payload: { ip_record_id: recordId },
        });

        if (notificationError) {
          console.error('Failed to create notification:', notificationError);
        }
      }

      alert('✅ Submission marked as completed! The applicant has been notified via email.');
      onComplete();
    } catch (error: any) {
      console.error('Error completing submission:', error);
      alert(`Failed to complete submission: ${error.message || 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === 'ready_for_filing') {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
        <CheckCircle className="h-5 w-5" />
        <span className="font-medium">Completed - Ready for Filing</span>
      </div>
    );
  }

  if (currentStatus !== 'evaluator_approved') {
    return (
      <button
        disabled
        className="px-6 py-3 bg-gray-100 text-gray-400 rounded-lg font-medium cursor-not-allowed"
      >
        Not Ready for Completion
      </button>
    );
  }

  return (
    <button
      onClick={handleComplete}
      disabled={loading}
      className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Completing...
        </>
      ) : (
        <>
          <CheckCircle className="h-5 w-5" />
          Mark as Completed
        </>
      )}
    </button>
  );
}
