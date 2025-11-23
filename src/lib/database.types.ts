export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'applicant' | 'supervisor' | 'evaluator' | 'admin';
export type IpCategory = 'patent' | 'copyright' | 'trademark' | 'design' | 'utility_model' | 'other';
export type IpStatus =
  | 'submitted'
  | 'waiting_supervisor'
  | 'supervisor_revision'
  | 'supervisor_approved'
  | 'waiting_evaluation'
  | 'evaluator_revision'
  | 'evaluator_approved'
  | 'preparing_legal'
  | 'ready_for_filing'
  | 'rejected';
export type AssignmentStatus = 'pending' | 'accepted' | 'rejected';
export type EvaluationDecision = 'approved' | 'revision' | 'rejected';
export type DocumentType = 'disclosure' | 'attachment' | 'evidence' | 'draft' | 'generated_pdf' | 'other';
export type TemplateType = 'pdf' | 'email' | 'form';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          email: string;
          role: UserRole;
          full_name: string;
          affiliation: string | null;
          category_specialization: string | null;
          is_verified: boolean;
          verification_token: string | null;
          temp_password: boolean;
          last_login_at: string | null;
          profile_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          email: string;
          role?: UserRole;
          full_name: string;
          affiliation?: string | null;
          category_specialization?: string | null;
          is_verified?: boolean;
          verification_token?: string | null;
          temp_password?: boolean;
          last_login_at?: string | null;
          profile_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          email?: string;
          role?: UserRole;
          full_name?: string;
          affiliation?: string | null;
          category_specialization?: string | null;
          is_verified?: boolean;
          verification_token?: string | null;
          temp_password?: boolean;
          last_login_at?: string | null;
          profile_data?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      ip_records: {
        Row: {
          id: string;
          applicant_id: string;
          category: IpCategory;
          title: string;
          abstract: string | null;
          details: Json;
          status: IpStatus;
          reference_number: string;
          supervisor_id: string | null;
          evaluator_id: string | null;
          current_stage: string;
          assigned_at: string | null;
          deadline_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          applicant_id: string;
          category: IpCategory;
          title: string;
          abstract?: string | null;
          details?: Json;
          status?: IpStatus;
          reference_number?: string;
          supervisor_id?: string | null;
          evaluator_id?: string | null;
          current_stage?: string;
          assigned_at?: string | null;
          deadline_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          applicant_id?: string;
          category?: IpCategory;
          title?: string;
          abstract?: string | null;
          details?: Json;
          status?: IpStatus;
          reference_number?: string;
          supervisor_id?: string | null;
          evaluator_id?: string | null;
          current_stage?: string;
          assigned_at?: string | null;
          deadline_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ip_documents: {
        Row: {
          id: string;
          ip_record_id: string;
          uploader_id: string;
          file_name: string;
          file_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          doc_type: DocumentType;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ip_record_id: string;
          uploader_id: string;
          file_name: string;
          file_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          doc_type?: DocumentType;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ip_record_id?: string;
          uploader_id?: string;
          file_name?: string;
          file_path?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          doc_type?: DocumentType;
          created_at?: string;
          updated_at?: string;
        };
      };
      generated_pdfs: {
        Row: {
          id: string;
          ip_record_id: string;
          template_id: string | null;
          file_path: string;
          qr_code_value: string;
          watermark_applied: boolean;
          issued_by: string | null;
          issued_at: string;
          hash: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ip_record_id: string;
          template_id?: string | null;
          file_path: string;
          qr_code_value: string;
          watermark_applied?: boolean;
          issued_by?: string | null;
          issued_at?: string;
          hash?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ip_record_id?: string;
          template_id?: string | null;
          file_path?: string;
          qr_code_value?: string;
          watermark_applied?: boolean;
          issued_by?: string | null;
          issued_at?: string;
          hash?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          ip_record_id: string | null;
          action: string;
          details: Json;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          ip_record_id?: string | null;
          action: string;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          ip_record_id?: string | null;
          action?: string;
          details?: Json;
          ip_address?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string | null;
          payload: Json;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message?: string | null;
          payload?: Json;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string | null;
          payload?: Json;
          is_read?: boolean;
          created_at?: string;
        };
      };
      supervisor_assignments: {
        Row: {
          id: string;
          ip_record_id: string;
          supervisor_id: string;
          assigned_by: string | null;
          status: AssignmentStatus;
          remarks: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ip_record_id: string;
          supervisor_id: string;
          assigned_by?: string | null;
          status?: AssignmentStatus;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ip_record_id?: string;
          supervisor_id?: string;
          assigned_by?: string | null;
          status?: AssignmentStatus;
          remarks?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      evaluator_assignments: {
        Row: {
          id: string;
          ip_record_id: string;
          evaluator_id: string;
          category: IpCategory;
          assigned_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ip_record_id: string;
          evaluator_id: string;
          category: IpCategory;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ip_record_id?: string;
          evaluator_id?: string;
          category?: IpCategory;
          assigned_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      evaluations: {
        Row: {
          id: string;
          ip_record_id: string;
          evaluator_id: string;
          score: Json;
          grade: string | null;
          remarks: string | null;
          decision: EvaluationDecision;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ip_record_id: string;
          evaluator_id: string;
          score?: Json;
          grade?: string | null;
          remarks?: string | null;
          decision: EvaluationDecision;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ip_record_id?: string;
          evaluator_id?: string;
          score?: Json;
          grade?: string | null;
          remarks?: string | null;
          decision?: EvaluationDecision;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_settings: {
        Row: {
          id: string;
          key: string;
          value: Json;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          value?: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          value?: Json;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      templates: {
        Row: {
          id: string;
          name: string;
          type: TemplateType;
          content: string;
          variables: Json;
          created_by: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          type: TemplateType;
          content: string;
          variables?: Json;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: TemplateType;
          content?: string;
          variables?: Json;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}
