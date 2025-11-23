import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Calendar,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Edit,
  Save,
  X,
} from 'lucide-react';
import { ProcessTrackingWizard } from '../components/ProcessTrackingWizard';
import { CompletionButton } from '../components/CompletionButton';
import { CertificateManager } from '../components/CertificateManager';
import type { Database } from '../lib/database.types';

type IpRecord = Database['public']['Tables']['ip_records']['Row'] & {
  applicant?: Database['public']['Tables']['users']['Row'];
  supervisor?: Database['public']['Tables']['users']['Row'];
  evaluator?: Database['public']['Tables']['users']['Row'];
};

type Document = Database['public']['Tables']['ip_documents']['Row'];
type Evaluation = Database['public']['Tables']['evaluations']['Row'] & {
  evaluator?: Database['public']['Tables']['users']['Row'];
};

export function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [record, setRecord] = useState<IpRecord | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    abstract: '',
    description: '',
  });

  useEffect(() => {
    if (id) {
      fetchSubmissionDetails();
    }
  }, [id]);

  const fetchSubmissionDetails = async () => {
    try {
      const { data: recordData, error: recordError } = await supabase
        .from('ip_records')
        .select(`
          *,
          applicant:users!applicant_id(*),
          supervisor:users!supervisor_id(*),
          evaluator:users!evaluator_id(*)
        `)
        .eq('id', id)
        .single();

      if (recordError) throw recordError;
      setRecord(recordData);
      setEditData({
        title: recordData.title,
        abstract: recordData.abstract || '',
        description: (recordData.details as any)?.description || '',
      });

      const { data: docsData, error: docsError } = await supabase
        .from('ip_documents')
        .select('*')
        .eq('ip_record_id', id)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docsData || []);

      const { data: evalsData, error: evalsError } = await supabase
        .from('evaluations')
        .select(`
          *,
          evaluator:users!evaluator_id(*)
        `)
        .eq('ip_record_id', id)
        .order('created_at', { ascending: false });

      if (evalsError) throw evalsError;
      setEvaluations(evalsData || []);
    } catch (error) {
      console.error('Error fetching submission details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !profile || !id) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ip-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('ip_documents').insert({
        ip_record_id: id,
        uploader_id: profile.id,
        file_name: file.name,
        file_path: filePath,
        mime_type: file.type,
        size_bytes: file.size,
        doc_type: 'attachment',
      });

      if (dbError) throw dbError;

      fetchSubmissionDetails();
    } catch (error: any) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!record || !profile) return;

    setSaving(true);
    try {
      const newStatus = record.status.includes('supervisor') ? 'waiting_supervisor' : 'waiting_evaluation';
      const newStage = record.status.includes('supervisor')
        ? 'Resubmitted - Waiting for Supervisor'
        : 'Resubmitted - Waiting for Evaluation';

      const { error: updateError } = await supabase
        .from('ip_records')
        .update({
          title: editData.title,
          abstract: editData.abstract,
          details: { description: editData.description },
          status: newStatus,
          current_stage: newStage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', record.id);

      if (updateError) throw updateError;

      const notifyUserId = record.status.includes('supervisor')
        ? record.supervisor_id
        : record.evaluator_id;

      if (notifyUserId) {
        await supabase.from('notifications').insert({
          user_id: notifyUserId,
          type: 'resubmission',
          title: 'Submission Updated',
          message: `${profile.full_name} has updated their submission "${editData.title}"`,
          payload: { ip_record_id: record.id },
        });
      }

      await supabase.from('activity_logs').insert({
        user_id: profile.id,
        ip_record_id: record.id,
        action: 'submission_updated',
        details: { changes: 'Applicant revised submission' },
      });

      try {
        const { data: applicantData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', record.applicant_id)
          .single();

        if (applicantData) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-status-notification`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              applicantEmail: applicantData.email,
              applicantName: applicantData.full_name,
              recordTitle: editData.title,
              referenceNumber: record.reference_number || 'N/A',
              oldStatus: record.status,
              newStatus: newStatus,
              currentStage: newStage,
              remarks: 'Your submission has been resubmitted for review.',
              actorName: profile.full_name,
              actorRole: profile.role,
            }),
          });
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError);
      }

      setEditMode(false);
      fetchSubmissionDetails();
      alert('Submission updated successfully!');
    } catch (error: any) {
      console.error('Error saving edits:', error);
      alert('Failed to save changes: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const canEdit = () => {
    if (!profile || !record) return false;
    if (profile.role !== 'applicant' || profile.id !== record.applicant_id) return false;
    return record.status === 'supervisor_revision' || record.status === 'evaluator_revision';
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      submitted: 'bg-blue-100 text-blue-800',
      waiting_supervisor: 'bg-yellow-100 text-yellow-800',
      supervisor_revision: 'bg-orange-100 text-orange-800',
      supervisor_approved: 'bg-green-100 text-green-800',
      waiting_evaluation: 'bg-purple-100 text-purple-800',
      evaluator_revision: 'bg-orange-100 text-orange-800',
      evaluator_approved: 'bg-green-100 text-green-800',
      preparing_legal: 'bg-indigo-100 text-indigo-800',
      ready_for_filing: 'bg-emerald-100 text-emerald-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('approved') || status === 'ready_for_filing') {
      return <CheckCircle className="h-5 w-5" />;
    }
    if (status.includes('revision') || status === 'rejected') {
      return <AlertCircle className="h-5 w-5" />;
    }
    return <Clock className="h-5 w-5" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Not Found</h2>
        <p className="text-gray-600 mb-4">The submission you're looking for doesn't exist or you don't have access.</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </button>
        {canEdit() && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Edit className="h-4 w-4" />
            Edit Submission
          </button>
        )}
        {editMode && (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setEditMode(false);
                setEditData({
                  title: record.title,
                  abstract: record.abstract || '',
                  description: (record.details as any)?.description || '',
                });
              }}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSaveEdits}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            {editMode ? (
              <input
                type="text"
                value={editData.title}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full text-3xl font-bold text-gray-900 mb-2 px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter title"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{record.title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
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
          <div className={`px-4 py-2 rounded-lg font-semibold flex items-center gap-2 ${getStatusColor(record.status)}`}>
            {getStatusIcon(record.status)}
            <span className="capitalize">{record.current_stage}</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Supervisor</div>
            <div className="font-semibold text-gray-900">
              {record.supervisor?.full_name || 'Not assigned'}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Evaluator</div>
            <div className="font-semibold text-gray-900">
              {record.evaluator?.full_name || 'Not assigned'}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Category</div>
            <div className="font-semibold text-gray-900 capitalize">{record.category}</div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Abstract</h3>
            {editMode ? (
              <textarea
                value={editData.abstract}
                onChange={(e) => setEditData({ ...editData, abstract: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter abstract"
              />
            ) : (
              <p className="text-gray-700 leading-relaxed">{record.abstract || 'No abstract provided'}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
            {editMode ? (
              <textarea
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter detailed description"
              />
            ) : (
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {(record.details && typeof record.details === 'object' && 'description' in record.details)
                  ? String(record.details.description)
                  : 'No description provided'}
              </p>
            )}
          </div>
        </div>
      </div>

      <ProcessTrackingWizard
        ipRecordId={record.id}
        currentStatus={record.status}
        currentStage={record.current_stage}
      />

      {profile?.role === 'admin' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Admin Actions</h2>
          <CompletionButton
            recordId={record.id}
            currentStatus={record.status}
            applicantEmail={record.applicant?.email || ''}
            applicantName={record.applicant?.full_name || ''}
            title={record.title}
            referenceNumber={record.reference_number || ''}
            category={record.category}
            onComplete={() => fetchRecord()}
          />
        </div>
      )}

      <CertificateManager
        recordId={record.id}
        recordTitle={record.title}
        recordCategory={record.category}
        recordStatus={record.status}
        referenceNumber={record.reference_number || ''}
        applicantName={record.applicant?.full_name || ''}
        applicantEmail={record.applicant?.email || ''}
        coCreators={(record.details as any)?.coCreators}
        evaluationScore={(record.details as any)?.evaluationScore}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Documents</h2>
          {profile?.role === 'applicant' && record.applicant_id === profile.id && (
            <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
              <Upload className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload Document'}
              <input
                type="file"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="font-medium text-gray-900">{doc.file_name}</div>
                    <div className="text-sm text-gray-500">
                      {doc.size_bytes && formatFileSize(doc.size_bytes)} • {formatDate(doc.created_at)}
                    </div>
                  </div>
                </div>
                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">
                  <Download className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {evaluations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Evaluations</h2>
          <div className="space-y-6">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold text-gray-900">
                      {evaluation.evaluator?.full_name}
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(evaluation.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{evaluation.grade}</div>
                    {evaluation.score && typeof evaluation.score === 'object' && 'overall' in evaluation.score && (
                      <div className="text-sm text-gray-500">
                        {Number(evaluation.score.overall).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {evaluation.score && typeof evaluation.score === 'object' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
                    {'innovation' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Innovation</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.innovation}/10
                        </div>
                      </div>
                    )}
                    {'feasibility' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Feasibility</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.feasibility}/10
                        </div>
                      </div>
                    )}
                    {'marketPotential' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Market</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.marketPotential}/10
                        </div>
                      </div>
                    )}
                    {'technicalMerit' in evaluation.score && (
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="text-sm text-gray-600">Technical</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluation.score.technicalMerit}/10
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  <div className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Remarks
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap">{evaluation.remarks}</p>
                </div>

                <div className="mt-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      evaluation.decision === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : evaluation.decision === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {evaluation.decision.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
