import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Award, Download, Loader2, FileCheck, Send, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface CertificateManagerProps {
  recordId: string;
  recordTitle: string;
  recordCategory: string;
  recordStatus: string;
  referenceNumber: string;
  applicantName: string;
  applicantEmail: string;
  coCreators?: string;
  evaluationScore?: string;
}

export function CertificateManager({
  recordId,
  recordTitle,
  recordCategory,
  recordStatus,
  referenceNumber,
  applicantName,
  applicantEmail,
  coCreators,
  evaluationScore,
}: CertificateManagerProps) {
  const { profile } = useAuth();
  const [certificate, setCertificate] = useState<any>(null);
  const [certificateRequest, setCertificateRequest] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchCertificate();
    if (profile?.role === 'applicant') {
      fetchCertificateRequest();
    }
  }, [recordId]);

  const fetchCertificate = async () => {
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('ip_record_id', recordId)
        .maybeSingle();

      if (error) throw error;
      setCertificate(data);
    } catch (error) {
      console.error('Error fetching certificate:', error);
    }
  };

  const fetchCertificateRequest = async () => {
    try {
      const { data, error } = await supabase
        .from('certificate_requests')
        .select('*')
        .eq('ip_record_id', recordId)
        .eq('applicant_id', profile?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCertificateRequest(data);
    } catch (error) {
      console.error('Error fetching certificate request:', error);
    }
  };

  const handleRequestCertificate = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('certificate_requests').insert({
        ip_record_id: recordId,
        applicant_id: profile.id,
        status: 'pending',
        request_message: `Request for certificate for "${recordTitle}"`,
      });

      if (error) throw error;

      const { data: adminData } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin')
        .limit(1)
        .maybeSingle();

      if (adminData?.id) {
        await supabase.from('notifications').insert({
          user_id: adminData.id,
          type: 'certificate_request',
          title: 'New Certificate Request',
          message: `${applicantName} has requested a certificate for "${recordTitle}"`,
          payload: { ip_record_id: recordId },
        });
      }

      alert('✅ Certificate request submitted successfully! An admin will process your request soon.');
      await fetchCertificateRequest();
    } catch (error) {
      console.error('Error requesting certificate:', error);
      alert('Failed to request certificate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-certificate`;
      const headers = {
        Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ipRecordId: recordId,
          applicantName,
          title: recordTitle,
          category: recordCategory,
          referenceNumber,
          coCreators,
          evaluationScore,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Certificate generation error:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();

      if (certificateRequest) {
        await supabase
          .from('certificate_requests')
          .update({ status: 'completed', processed_by: profile?.id })
          .eq('id', certificateRequest.id);
      }

      const { data: recordData } = await supabase
        .from('ip_records')
        .select('applicant_id')
        .eq('id', recordId)
        .single();

      if (recordData?.applicant_id) {
        await supabase.from('notifications').insert({
          user_id: recordData.applicant_id,
          type: 'certificate_ready',
          title: 'Certificate Generated',
          message: `Your certificate for "${recordTitle}" has been generated and is ready for download!`,
          payload: { ip_record_id: recordId },
        });
      }

      alert('✅ Certificate generated successfully!');
      await fetchCertificate();
      await fetchCertificateRequest();
    } catch (error: any) {
      console.error('Error generating certificate:', error);
      alert(`Failed to generate certificate: ${error.message || 'Please try again.'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleSendCertificateEmail = async () => {
    if (!certificate) return;

    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const certificateUrl = certificate.pdf_url || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/certificates/${certificate.file_path}`;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-certificate-email`;
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
          title: recordTitle,
          referenceNumber,
          certificateNumber: certificate.certificate_number,
          certificateUrl,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Email sending error:', errorText);
        throw new Error(errorText);
      }

      const result = await response.json();

      if (result.success) {
        alert('✅ Certificate email sent successfully to the applicant!');
      } else {
        alert('⚠️ Email service is currently unavailable. The applicant can download the certificate from their dashboard.');
      }
    } catch (error: any) {
      console.error('Error sending certificate email:', error);
      alert('⚠️ Could not send email. The applicant can download the certificate from their dashboard.');
    } finally {
      setSending(false);
    }
  };

  if (recordStatus !== 'ready_for_filing' && recordStatus !== 'completed') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-3 text-gray-500">
          <Award className="h-6 w-6" />
          <div>
            <p className="font-medium">Certificate Not Available</p>
            <p className="text-sm mt-1">Certificate will be available after the submission is completed</p>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.role === 'applicant') {
    if (certificate) {
      return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Certificate Available</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Certificate No: {certificate.certificate_number}
                </p>
                <p className="text-sm text-gray-600">
                  Issued: {new Date(certificate.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <a
              href={certificate.pdf_url || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/certificates/${certificate.file_path || ''}`}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              onClick={(e) => {
                if (!certificate.pdf_url && !certificate.file_path) {
                  e.preventDefault();
                  alert('Certificate file is not available yet. Please try again later.');
                }
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </a>
          </div>
        </div>
      );
    }

    if (certificateRequest) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <FileCheck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Certificate Request Pending</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your request is being processed by an administrator
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Requested: {new Date(certificateRequest.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Request Certificate</h3>
              <p className="text-sm text-gray-600 mt-1">
                Your submission is complete! Request your official certificate
              </p>
            </div>
          </div>
          <button
            onClick={handleRequestCertificate}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Requesting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Request Certificate
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  if (profile?.role === 'admin') {
    if (certificate) {
      return (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-3 rounded-lg">
                <Award className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Certificate Generated</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Certificate No: {certificate.certificate_number}
                </p>
                <p className="text-sm text-gray-600">
                  Issued: {new Date(certificate.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <a
                href={certificate.pdf_url || `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/certificates/${certificate.file_path || ''}`}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
                onClick={(e) => {
                  if (!certificate.pdf_url && !certificate.file_path) {
                    e.preventDefault();
                    alert('Certificate file is not available yet. Please try again later.');
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Download
              </a>
              <button
                onClick={handleSendCertificateEmail}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send to Applicant
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Generate Certificate</h3>
              <p className="text-sm text-gray-600 mt-1">
                Generate an official IP registration certificate for this submission
              </p>
              {certificateRequest && (
                <p className="text-xs text-blue-600 mt-2 font-medium">
                  ⚠️ Applicant has requested this certificate
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleGenerateCertificate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Award className="h-4 w-4" />
                Generate Certificate
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
