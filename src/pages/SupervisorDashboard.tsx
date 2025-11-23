import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  FileText,
  Download,
  Users,
  Calendar,
  Tag,
  X,
  History,
  ListChecks
} from 'lucide-react';
import { ProcessTrackingWizard } from '../components/ProcessTrackingWizard';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
};

type IpDocument = Database['public']['Tables']['ip_documents']['Row'];

export function SupervisorDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<IpRecord | null>(null);
  const [documents, setDocuments] = useState<IpDocument[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [action, setAction] = useState<'approve' | 'reject' | 'revision' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignedRecords();
    fetchHistoryRecords();
  }, [profile]);

  const fetchAssignedRecords = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!ip_records_applicant_id_fkey(*)
        `)
        .eq('supervisor_id', profile.id)
        .in('status', ['waiting_supervisor', 'supervisor_revision'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryRecords = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!ip_records_applicant_id_fkey(*)
        `)
        .eq('supervisor_id', profile.id)
        .in('status', ['waiting_evaluation', 'rejected', 'evaluator_approved', 'evaluator_revision', 'evaluator_approved'])
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setHistoryRecords(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  const openDetailModal = async (record: IpRecord) => {
    setSelectedRecord(record);

    const { data: docs } = await supabase
      .from('ip_documents')
      .select('*')
      .eq('ip_record_id', record.id)
      .order('created_at', { ascending: true });

    setDocuments(docs || []);
    setShowDetailModal(true);
  };

  const openReviewModal = (reviewAction: 'approve' | 'reject' | 'revision') => {
    setAction(reviewAction);
    setRemarks('');
    setShowDetailModal(false);
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRecord || !action || !profile) return;

    if (!remarks || remarks.trim() === '') {
      alert('Please provide remarks/comments for your decision');
      return;
    }

    setSubmitting(true);
    try {
      type ValidStatus = 'waiting_evaluation' | 'rejected' | 'supervisor_revision';
      let newStatus: ValidStatus;
      let currentStage: string;

      switch (action) {
        case 'approve':
          newStatus = 'waiting_evaluation';
          currentStage = 'Approved by Supervisor - Waiting for Evaluation';
          break;
        case 'reject':
          newStatus = 'rejected';
          currentStage = 'Rejected by Supervisor';
          break;
        case 'revision':
          newStatus = 'supervisor_revision';
          currentStage = 'Revision Requested by Supervisor';
          break;
        default:
          alert('Invalid action');
          setSubmitting(false);
          return;
      }

      const { data: updateData, error: updateError } = await supabase
        .from('ip_records')
        .update({
          status: newStatus,
          current_stage: currentStage,
        })
        .eq('id', selectedRecord.id)
        .select()
        .single();

      if (updateError) {
        console.error('Update error details:', updateError);
        alert(`Failed to update submission: ${updateError.message}`);
        setSubmitting(false);
        return;
      }

      await supabase.from('supervisor_assignments').update({
        status: action === 'approve' ? 'accepted' : 'rejected',
        remarks: remarks,
      }).eq('ip_record_id', selectedRecord.id).eq('supervisor_id', profile.id);

      if (action === 'approve') {
        const { data: evaluators } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'evaluator')
          .eq('category_specialization', selectedRecord.category)
          .limit(1);

        const categoryEvaluator = evaluators && evaluators.length > 0 ? evaluators[0] : null;

        if (categoryEvaluator) {
          await supabase.from('evaluator_assignments').insert({
            ip_record_id: selectedRecord.id,
            evaluator_id: categoryEvaluator.id,
            category: selectedRecord.category,
            assigned_by: profile.id,
          });

          await supabase.from('ip_records').update({
            evaluator_id: categoryEvaluator.id,
          }).eq('id', selectedRecord.id);

          await supabase.from('notifications').insert({
            user_id: categoryEvaluator.id,
            type: 'assignment',
            title: 'New IP Submission for Evaluation',
            message: `A ${selectedRecord.category} submission "${selectedRecord.title}" has been approved by supervisor and assigned to you`,
            payload: { ip_record_id: selectedRecord.id },
          });
        } else {
          console.warn(`No evaluator found for category: ${selectedRecord.category}`);
          alert(`Warning: No evaluator available for category "${selectedRecord.category}". The submission has been approved but not assigned to an evaluator. Please contact an administrator.`);
        }
      }

      await supabase.from('notifications').insert({
        user_id: selectedRecord.applicant_id,
        type: 'supervisor_decision',
        title: `Supervisor ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Rejected' : 'Requested Revision'}`,
        message: `Your submission "${selectedRecord.title}" has been ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'sent back for revision'} by supervisor ${profile.full_name}`,
        payload: { ip_record_id: selectedRecord.id, remarks },
      });

      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: selectedRecord.id,
        action: `supervisor_${action}`,
        details: { remarks, decision: action },
      });

      await supabase.from('process_tracking').insert({
        ip_record_id: selectedRecord.id,
        stage: currentStage,
        status: newStatus,
        actor_id: profile.id,
        actor_name: profile.full_name,
        actor_role: 'Supervisor',
        action: `supervisor_${action}`,
        description: `Supervisor ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'requested revision for'} the submission`,
        metadata: { remarks },
      });

      if (selectedRecord.applicant?.email) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              applicantEmail: selectedRecord.applicant.email,
              applicantName: selectedRecord.applicant.full_name,
              recordTitle: selectedRecord.title,
              referenceNumber: selectedRecord.reference_number,
              oldStatus: selectedRecord.status,
              newStatus: newStatus,
              currentStage: currentStage,
              remarks: remarks,
              actorName: profile.full_name,
              actorRole: 'Supervisor',
            }),
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }

      setShowReviewModal(false);
      setSelectedRecord(null);
      setAction(null);
      setRemarks('');
      setDocuments([]);
      fetchAssignedRecords();
      fetchHistoryRecords();
    } catch (error: any) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadDocument = async (doc: IpDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('ip-documents')
        .download(doc.file_path);

      if (error) throw error;

      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Failed to download document');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getDocTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      disclosure: 'Disclosure Form',
      drawing: 'Technical Drawing',
      attachment: 'Supporting Document',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Supervisor Review Queue</h1>
        <p className="text-gray-600 mt-1">Review and approve IP submissions assigned to you</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Review</p>
              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {records.filter((r) => r.status === 'waiting_supervisor').length}
              </p>
            </div>
            <ClipboardList className="h-12 w-12 text-yellow-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Revision</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {records.filter((r) => r.status === 'supervisor_revision').length}
              </p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Reviewed Total</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{historyRecords.length}</p>
            </div>
            <History className="h-12 w-12 text-green-600 opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'queue'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListChecks className="h-5 w-5" />
              Review Queue ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="h-5 w-5" />
              Review History ({historyRecords.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'queue' && (
            <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Submissions to Review</h3>
            <p className="text-gray-600">You don't have any IP submissions assigned for review at the moment.</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{record.title}</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {record.applicant?.full_name}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="h-4 w-4" />
                      <span className="capitalize">{record.category}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(record.created_at)}
                    </span>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    record.status === 'waiting_supervisor'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}
                >
                  {record.status === 'waiting_supervisor' ? 'Pending Review' : 'Needs Revision'}
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Abstract</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{record.abstract || 'No abstract provided'}</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => openDetailModal(record)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View Full Details
                </button>
              </div>
            </div>
          ))
        )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {historyRecords.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Review History</h3>
                  <p className="text-gray-600">You haven't reviewed any submissions yet.</p>
                </div>
              ) : (
                historyRecords.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{record.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {record.applicant?.full_name || 'Unknown Applicant'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            <span className="capitalize">{record.category}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Reviewed: {formatDate(record.updated_at)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'waiting_evaluation'
                            ? 'bg-green-100 text-green-800'
                            : record.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : record.status === 'evaluator_approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {record.status === 'waiting_evaluation'
                          ? 'Approved - In Evaluation'
                          : record.status === 'rejected'
                          ? 'Rejected'
                          : record.current_stage}
                      </span>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Abstract</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{record.abstract || 'No abstract provided'}</p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={() => openDetailModal(record)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">IP Submission Details</h3>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedRecord(null);
                  setDocuments([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-blue-900 mb-3">{selectedRecord.title}</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-blue-700">Applicant:</span>
                    <span className="text-blue-900 ml-2">{selectedRecord.applicant?.full_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Email:</span>
                    <span className="text-blue-900 ml-2">{selectedRecord.applicant?.email}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Category:</span>
                    <span className="text-blue-900 ml-2 capitalize">{selectedRecord.category}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Submitted:</span>
                    <span className="text-blue-900 ml-2">{formatDate(selectedRecord.created_at)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Status:</span>
                    <span className="text-blue-900 ml-2 capitalize">{selectedRecord.current_stage}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-blue-700">Reference:</span>
                    <span className="text-blue-900 ml-2 font-mono text-xs">{selectedRecord.reference_number}</span>
                  </div>
                </div>
              </div>

              <ProcessTrackingWizard
                ipRecordId={selectedRecord.id}
                currentStatus={selectedRecord.status}
                currentStage={selectedRecord.current_stage}
              />

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Abstract</h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedRecord.abstract}</p>
              </div>

              {selectedRecord.details && typeof selectedRecord.details === 'object' && (
                <>
                  {'description' in selectedRecord.details && selectedRecord.details.description && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Description</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedRecord.details.description)}
                      </p>
                    </div>
                  )}

                  {'technicalField' in selectedRecord.details && selectedRecord.details.technicalField && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Technical Field</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedRecord.details.technicalField)}
                      </p>
                    </div>
                  )}

                  {'backgroundArt' in selectedRecord.details && selectedRecord.details.backgroundArt && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Background Art</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedRecord.details.backgroundArt)}
                      </p>
                    </div>
                  )}

                  {'problemStatement' in selectedRecord.details && selectedRecord.details.problemStatement && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Problem Statement</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedRecord.details.problemStatement)}
                      </p>
                    </div>
                  )}

                  {'solution' in selectedRecord.details && selectedRecord.details.solution && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Solution</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedRecord.details.solution)}
                      </p>
                    </div>
                  )}

                  {'advantages' in selectedRecord.details && selectedRecord.details.advantages && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Advantages</h4>
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {String(selectedRecord.details.advantages)}
                      </p>
                    </div>
                  )}

                  {'inventors' in selectedRecord.details && Array.isArray(selectedRecord.details.inventors) && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <h4 className="text-lg font-bold text-gray-900 mb-3">Inventors</h4>
                      <div className="space-y-3">
                        {selectedRecord.details.inventors.map((inv: any, idx: number) => (
                          <div key={idx} className="border-l-4 border-blue-500 pl-4 py-2">
                            <p className="font-semibold text-gray-900">{inv.name}</p>
                            {inv.affiliation && (
                              <p className="text-sm text-gray-600">Affiliation: {inv.affiliation}</p>
                            )}
                            {inv.contribution && (
                              <p className="text-sm text-gray-600">Contribution: {inv.contribution}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-bold text-gray-900 mb-4">Documents ({documents.length})</h4>
                {documents.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No documents uploaded</p>
                ) : (
                  <div className="space-y-3">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <FileText className="h-8 w-8 text-blue-600" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.file_name}</p>
                            <p className="text-sm text-gray-600">
                              {getDocTypeLabel(doc.doc_type)} • {formatFileSize(doc.size_bytes)} • {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  onClick={() => openReviewModal('approve')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  <CheckCircle className="h-5 w-5" />
                  Approve
                </button>
                <button
                  onClick={() => openReviewModal('revision')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium transition-colors"
                >
                  <AlertCircle className="h-5 w-5" />
                  Request Revision
                </button>
                <button
                  onClick={() => openReviewModal('reject')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              {action === 'approve' && 'Approve Submission'}
              {action === 'reject' && 'Reject Submission'}
              {action === 'revision' && 'Request Revision'}
            </h3>

            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold text-gray-900">{selectedRecord.title}</h4>
              <p className="text-sm text-gray-600 mt-1">by {selectedRecord.applicant?.full_name}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks / Comments {action !== 'approve' && <span className="text-red-500">*</span>}
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={4}
                required={action !== 'approve'}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  action === 'approve'
                    ? 'Optional: Add comments or feedback'
                    : 'Required: Provide detailed feedback on why revision/rejection is needed'
                }
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setShowDetailModal(true);
                }}
                disabled={submitting}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submitting || (action !== 'approve' && !remarks.trim())}
                className={`px-6 py-2 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : action === 'reject'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {submitting ? 'Submitting...' : `Confirm ${action === 'approve' ? 'Approval' : action === 'reject' ? 'Rejection' : 'Revision Request'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
