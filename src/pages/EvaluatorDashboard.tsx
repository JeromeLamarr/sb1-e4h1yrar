import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Star,
  CheckCircle,
  XCircle,
  AlertCircle,
  ClipboardCheck,
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
  supervisor?: Database['public']['Tables']['users']['Row'];
};

type IpDocument = Database['public']['Tables']['ip_documents']['Row'];

export function EvaluatorDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');
  const [records, setRecords] = useState<IpRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<IpRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<IpRecord | null>(null);
  const [documents, setDocuments] = useState<IpDocument[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [evaluationForm, setEvaluationForm] = useState({
    innovation: 0,
    feasibility: 0,
    marketPotential: 0,
    technicalMerit: 0,
    grade: '',
    remarks: '',
    decision: 'approved' as 'approved' | 'revision' | 'rejected',
  });

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
          applicant:users!ip_records_applicant_id_fkey(*),
          supervisor:users!ip_records_supervisor_id_fkey(*)
        `)
        .eq('evaluator_id', profile.id)
        .in('status', ['waiting_evaluation', 'evaluator_revision'])
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
          applicant:users!ip_records_applicant_id_fkey(*),
          supervisor:users!ip_records_supervisor_id_fkey(*)
        `)
        .eq('evaluator_id', profile.id)
        .in('status', ['evaluator_approved', 'rejected'])
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

  const openEvaluationModal = () => {
    setEvaluationForm({
      innovation: 0,
      feasibility: 0,
      marketPotential: 0,
      technicalMerit: 0,
      grade: '',
      remarks: '',
      decision: 'approved',
    });
    setShowDetailModal(false);
    setShowEvalModal(true);
  };

  const calculateOverallScore = () => {
    const { innovation, feasibility, marketPotential, technicalMerit } = evaluationForm;
    return ((innovation + feasibility + marketPotential + technicalMerit) / 40) * 100;
  };

  const getGradeFromScore = (score: number): string => {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    return 'F';
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedRecord || !profile) return;

    if (!evaluationForm.decision) {
      alert('Please select a decision (Approve, Reject, or Request Revision)');
      return;
    }

    if (!evaluationForm.remarks || evaluationForm.remarks.trim() === '') {
      alert('Please provide remarks/comments for your evaluation');
      return;
    }

    const overallScore = calculateOverallScore();
    const finalGrade = evaluationForm.grade || getGradeFromScore(overallScore);

    setSubmitting(true);
    try {
      const { error: evalError } = await supabase.from('evaluations').insert({
        ip_record_id: selectedRecord.id,
        evaluator_id: profile.id,
        score: {
          innovation: evaluationForm.innovation,
          feasibility: evaluationForm.feasibility,
          marketPotential: evaluationForm.marketPotential,
          technicalMerit: evaluationForm.technicalMerit,
          overall: overallScore,
        },
        grade: finalGrade,
        remarks: evaluationForm.remarks,
        decision: evaluationForm.decision,
      });

      if (evalError) throw evalError;

      type ValidStatus = 'evaluator_approved' | 'rejected' | 'evaluator_revision';
      let newStatus: ValidStatus;
      let currentStage: string;

      switch (evaluationForm.decision) {
        case 'approved':
          newStatus = 'evaluator_approved';
          currentStage = 'Approved by Evaluator - Ready for Legal Filing';
          break;
        case 'rejected':
          newStatus = 'rejected';
          currentStage = 'Rejected by Evaluator';
          break;
        case 'revision':
          newStatus = 'evaluator_revision';
          currentStage = 'Revision Requested by Evaluator';
          break;
        default:
          alert('Invalid decision');
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

      await supabase.from('notifications').insert({
        user_id: selectedRecord.applicant_id,
        type: 'evaluation_complete',
        title: `Evaluation ${evaluationForm.decision === 'approved' ? 'Approved' : evaluationForm.decision === 'rejected' ? 'Rejected' : 'Revision Requested'}`,
        message: `Your submission "${selectedRecord.title}" has been evaluated. Grade: ${finalGrade}`,
        payload: {
          ip_record_id: selectedRecord.id,
          grade: finalGrade,
          score: overallScore,
        },
      });

      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: selectedRecord.id,
        action: `evaluator_${evaluationForm.decision}`,
        details: { grade: finalGrade, score: overallScore },
      });

      await supabase.from('process_tracking').insert({
        ip_record_id: selectedRecord.id,
        stage: currentStage,
        status: newStatus,
        actor_id: profile.id,
        actor_name: profile.full_name,
        actor_role: 'Evaluator',
        action: `evaluator_${evaluationForm.decision}`,
        description: `Evaluator ${evaluationForm.decision === 'approved' ? 'approved' : evaluationForm.decision === 'rejected' ? 'rejected' : 'requested revision for'} the submission with grade ${finalGrade}`,
        metadata: { grade: finalGrade, score: overallScore, remarks: evaluationForm.remarks },
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
              remarks: evaluationForm.remarks,
              actorName: profile.full_name,
              actorRole: 'Evaluator',
            }),
          });
        } catch (emailError) {
          console.error('Error sending email notification:', emailError);
        }
      }

      setShowEvalModal(false);
      setSelectedRecord(null);
      setDocuments([]);
      fetchAssignedRecords();
      fetchHistoryRecords();
    } catch (error: any) {
      console.error('Error submitting evaluation:', error);
      alert('Failed to submit evaluation: ' + error.message);
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

  const overallScore = calculateOverallScore();
  const suggestedGrade = getGradeFromScore(overallScore);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Evaluator Dashboard</h1>
        <p className="text-gray-600 mt-1">Evaluate IP submissions assigned to your category</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Evaluation</p>
              <p className="text-3xl font-bold text-purple-600 mt-1">
                {records.filter((r) => r.status === 'waiting_evaluation').length}
              </p>
            </div>
            <Star className="h-12 w-12 text-purple-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Needs Revision</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {records.filter((r) => r.status === 'evaluator_revision').length}
              </p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600 opacity-20" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Evaluated Total</p>
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
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListChecks className="h-5 w-5" />
              Evaluation Queue ({records.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-purple-600 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <History className="h-5 w-5" />
              Evaluation History ({historyRecords.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'queue' && (
            <div className="space-y-4">
        {records.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Star className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Submissions to Evaluate</h3>
            <p className="text-gray-600">You don't have any IP submissions assigned for evaluation at the moment.</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{record.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                  Pending Evaluation
                </span>
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Abstract</h4>
                <p className="text-sm text-gray-600 line-clamp-2">{record.abstract || 'No abstract provided'}</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => openDetailModal(record)}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  View & Evaluate
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
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No Evaluation History</h3>
                  <p className="text-gray-600">You haven't evaluated any submissions yet.</p>
                </div>
              ) : (
                historyRecords.map((record) => (
                  <div key={record.id} className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{record.title}</h3>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
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
                            Evaluated: {formatDate(record.updated_at)}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          record.status === 'evaluator_approved'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.status === 'evaluator_approved' ? 'Approved' : 'Rejected'}
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
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold text-purple-900 mb-3">{selectedRecord.title}</h2>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-semibold text-purple-700">Applicant:</span>
                    <span className="text-purple-900 ml-2">{selectedRecord.applicant?.full_name}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-700">Email:</span>
                    <span className="text-purple-900 ml-2">{selectedRecord.applicant?.email}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-700">Category:</span>
                    <span className="text-purple-900 ml-2 capitalize">{selectedRecord.category}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-700">Submitted:</span>
                    <span className="text-purple-900 ml-2">{formatDate(selectedRecord.created_at)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-700">Status:</span>
                    <span className="text-purple-900 ml-2 capitalize">{selectedRecord.current_stage}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-700">Reference:</span>
                    <span className="text-purple-900 ml-2 font-mono text-xs">{selectedRecord.reference_number}</span>
                  </div>
                  {selectedRecord.supervisor && (
                    <div>
                      <span className="font-semibold text-purple-700">Supervisor:</span>
                      <span className="text-purple-900 ml-2">{selectedRecord.supervisor.full_name}</span>
                    </div>
                  )}
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
                          <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
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
                          <FileText className="h-8 w-8 text-purple-600" />
                          <div>
                            <p className="font-medium text-gray-900">{doc.file_name}</p>
                            <p className="text-sm text-gray-600">
                              {getDocTypeLabel(doc.doc_type)} • {formatFileSize(doc.size_bytes)} • {formatDate(doc.created_at)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
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
                  onClick={openEvaluationModal}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors"
                >
                  <Star className="h-5 w-5" />
                  Start Evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEvalModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-2xl font-bold text-gray-900">Evaluate Submission</h3>
              <button
                onClick={() => {
                  setShowEvalModal(false);
                  setShowDetailModal(true);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h4 className="font-semibold text-purple-900 text-lg">{selectedRecord.title}</h4>
                <p className="text-sm text-purple-700 mt-1">by {selectedRecord.applicant?.full_name}</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Innovation Score (0-10)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={evaluationForm.innovation}
                    onChange={(e) =>
                      setEvaluationForm({ ...evaluationForm, innovation: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Low</span>
                    <span className="font-bold text-lg text-purple-600">{evaluationForm.innovation}</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Feasibility Score (0-10)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={evaluationForm.feasibility}
                    onChange={(e) =>
                      setEvaluationForm({ ...evaluationForm, feasibility: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Low</span>
                    <span className="font-bold text-lg text-purple-600">{evaluationForm.feasibility}</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Market Potential Score (0-10)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={evaluationForm.marketPotential}
                    onChange={(e) =>
                      setEvaluationForm({ ...evaluationForm, marketPotential: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Low</span>
                    <span className="font-bold text-lg text-purple-600">{evaluationForm.marketPotential}</span>
                    <span>High</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Technical Merit Score (0-10)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={evaluationForm.technicalMerit}
                    onChange={(e) =>
                      setEvaluationForm({ ...evaluationForm, technicalMerit: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>Low</span>
                    <span className="font-bold text-lg text-purple-600">{evaluationForm.technicalMerit}</span>
                    <span>High</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Overall Score:</span>
                  <span className="text-2xl font-bold text-purple-600">{overallScore.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-700">Suggested Grade:</span>
                  <span className="text-2xl font-bold text-purple-600">{suggestedGrade}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Final Grade (Optional - defaults to suggested)
                </label>
                <input
                  type="text"
                  value={evaluationForm.grade}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, grade: e.target.value })}
                  placeholder={suggestedGrade}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Decision <span className="text-red-500">*</span>
                </label>
                <select
                  value={evaluationForm.decision}
                  onChange={(e) =>
                    setEvaluationForm({
                      ...evaluationForm,
                      decision: e.target.value as 'approved' | 'revision' | 'rejected',
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="approved">Approve</option>
                  <option value="revision">Request Revision</option>
                  <option value="rejected">Reject</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Remarks / Feedback {evaluationForm.decision !== 'approved' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={evaluationForm.remarks}
                  onChange={(e) => setEvaluationForm({ ...evaluationForm, remarks: e.target.value })}
                  rows={5}
                  required={evaluationForm.decision !== 'approved'}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={
                    evaluationForm.decision === 'approved'
                      ? 'Optional: Add comments or feedback'
                      : 'Required: Provide detailed feedback on why revision/rejection is needed'
                  }
                />
              </div>

              <div className="flex gap-3 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEvalModal(false);
                    setShowDetailModal(true);
                  }}
                  disabled={submitting}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Back to Details
                </button>
                <button
                  onClick={handleSubmitEvaluation}
                  disabled={submitting || (evaluationForm.decision !== 'approved' && !evaluationForm.remarks.trim())}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting...' : 'Submit Evaluation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
