# Completion and Certificate System

## Overview
A comprehensive system for admins to mark submissions as completed and manage IP registration certificates.

## Features Implemented

### 1. Database Schema
- **certificates** table: Stores generated certificates with metadata
- **certificate_requests** table: Tracks applicant certificate requests
- **Storage bucket**: `certificates` for storing PDF files
- **RLS policies**: Secure access control for all certificate operations

### 2. Edge Functions

#### send-completion-notification
- **Purpose**: Sends email notification when admin marks submission as completed
- **Trigger**: Admin clicks "Mark as Completed" button
- **Email Content**: Congratulates applicant, provides next steps, enables certificate requests

#### generate-certificate
- **Purpose**: Generates PDF certificate based on the sample design
- **Features**:
  - Professional certificate layout matching UCC IPO template
  - Includes all submission details (title, category, reference number, etc.)
  - Supports co-creators and evaluation score
  - QR code placeholder for verification
  - Signature blocks for Director, Dean, and President
  - Stores PDF in Supabase storage
  - Creates certificate record in database

### 3. Components

#### CompletionButton
- **Location**: AdminDashboard and SubmissionDetailPage
- **Purpose**: Allows admins to mark evaluator-approved submissions as completed
- **Actions**:
  1. Updates status to `ready_for_filing`
  2. Sends completion notification email
  3. Creates in-app notification
  4. Enables certificate features

**Requirements**:
- Only visible to admins
- Only active when status is `evaluator_approved`
- Shows "Completed" badge if already marked

#### CertificateManager
- **Location**: SubmissionDetailPage
- **Purpose**: Manages certificate generation and requests
- **For Applicants**:
  - Request certificate button (if submission is completed)
  - View pending request status
  - Download certificate when available
- **For Admins**:
  - Generate certificate button
  - See pending certificate requests
  - Download generated certificates

### 4. Workflow

#### Complete Submission Flow:
1. Evaluator approves submission → Status: `evaluator_approved`
2. Admin reviews and clicks "Mark as Completed"
3. System updates status to `ready_for_filing`
4. Completion email sent to applicant
5. Certificate section becomes available

#### Certificate Request Flow (Applicant):
1. Applicant sees completed submission
2. Clicks "Request Certificate"
3. Request recorded in database
4. Admin notification created
5. Admin generates certificate
6. Applicant receives notification
7. Applicant can download certificate

#### Certificate Generation Flow (Admin):
1. Admin opens completed submission
2. Clicks "Generate Certificate"
3. System creates professional PDF
4. PDF uploaded to storage
5. Certificate record created
6. Applicant notified
7. Both can download certificate

## Certificate Template

The generated certificate includes:
- **Header**: Republic of the Philippines, University of Caloocan City, IPO
- **Title**: Certificate of Intellectual Property Registration
- **Recipient**: Applicant name and affiliation
- **IP Details**: Title, type, status, tracking ID
- **Metadata**: Co-creators, evaluation score (if provided)
- **Signatures**: Three signature blocks (Director, Dean, President)
- **Footer**: Registration number, issue date, location
- **QR Code**: Verification placeholder

## Status Transitions

```
evaluator_approved → ready_for_filing (via Complete button)
                  ↓
            Certificate available
                  ↓
      Applicant can request certificate
                  ↓
         Admin generates certificate
                  ↓
         Applicant downloads certificate
```

## Email Notifications

### Completion Email
- **Sent to**: Applicant
- **When**: Admin marks as completed
- **Content**:
  - Congratulations message
  - Submission details
  - Next steps (request certificate, prepare for IPO filing)
  - Link to dashboard

## Security

### RLS Policies
- **Certificates**: Applicants see own, admins see all
- **Certificate Requests**: Applicants create/view own, admins manage all
- **Storage**: Authenticated users can view, only admins can upload/modify

### Permissions
- **Complete Submission**: Admin only
- **Generate Certificate**: Admin only
- **Request Certificate**: Applicant only (own completed submissions)
- **Download Certificate**: Applicant (own) + Admin (all)

## Technical Details

### Certificate Generation
- Uses HTML-to-PDF conversion
- Professional A4 layout with proper margins
- Times New Roman font (official document style)
- Styled signature blocks and headers
- QR code placeholder for future verification system

### Storage
- PDFs stored in `certificates` bucket
- Public URLs for easy downloading
- Organized by reference number and timestamp

## Admin Workflow Summary

1. **View All Records** → Filter by `evaluator_approved`
2. **Open Submission** → Review evaluation
3. **Click "Mark as Completed"** → Confirms and sends email
4. **Certificate Section Appears** → Shows request if applicant requested
5. **Click "Generate Certificate"** → Creates PDF and notifies applicant
6. **Done** → Applicant can download

## Applicant Workflow Summary

1. **Receive Completion Email** → Check dashboard
2. **Open Completed Submission** → See certificate section
3. **Click "Request Certificate"** → Submit request
4. **Wait for Admin** → Monitor status
5. **Receive Notification** → Certificate ready
6. **Download Certificate** → Official PDF document

## Future Enhancements

Potential additions:
- QR code generation and verification portal
- Email delivery of PDF certificate
- Digital signatures integration
- Certificate templates for different IP types
- Batch certificate generation
- Certificate verification API
- IPO Philippines integration
