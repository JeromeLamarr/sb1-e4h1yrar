# University Intellectual Property Management System

A comprehensive web-based platform for managing intellectual property submissions, reviews, evaluations, and approvals at the University of Cape Coast.

## Features

### For Applicants
- Register and create IP submissions
- Multi-step submission form with document uploads
- Select supervisors for review
- Track submission status in real-time
- Receive notifications on status changes
- View evaluation results and grades
- Request and download system-generated certificates

### For Supervisors
- Review assigned IP submissions
- Approve, reject, or request revisions
- Add detailed remarks and feedback
- Track review queue
- Receive notifications for new assignments

### For Evaluators
- Evaluate IP submissions by category
- Grade submissions on multiple criteria:
  - Innovation (0-10)
  - Feasibility (0-10)
  - Market Potential (0-10)
  - Technical Merit (0-10)
- Provide detailed feedback
- Approve, request revision, or reject submissions

### For Administrators
- Complete system oversight
- User management (create, edit, delete users)
- View comprehensive analytics dashboard
- Monitor all IP submissions
- Track system activity logs
- Manage roles and permissions

## Technology Stack

- **Frontend**: React 18 + TypeScript
- **Routing**: React Router v7
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth)
- **Edge Functions**: Deno
- **Build Tool**: Vite

## Database Schema

The system uses 11 main tables:
- `users` - User accounts and profiles
- `ip_records` - IP submissions
- `ip_documents` - Uploaded documents
- `generated_pdfs` - System-generated certificates
- `activity_logs` - Audit trail
- `notifications` - User notifications
- `supervisor_assignments` - Supervisor workflow
- `evaluator_assignments` - Evaluator assignments
- `evaluations` - Evaluation results
- `system_settings` - Global configuration
- `templates` - Email and PDF templates

## IP Workflow

1. **Applicant submits IP** → Status: Submitted
2. **Supervisor reviews** → Approve/Reject/Request Revision
3. **If approved** → Assigned to Evaluator
4. **Evaluator evaluates** → Grades and provides feedback
5. **If approved** → Ready for Legal Filing
6. **Admin generates** → Official certificates with QR codes

## User Roles

### Applicant
- Submit intellectual property
- Track submission progress
- Receive notifications
- Download certificates

### Supervisor
- Review assigned submissions
- Provide feedback
- Approve or reject

### Evaluator
- Evaluate submissions in their category
- Assign grades
- Provide detailed assessment

### Admin
- Full system access
- User management
- System configuration
- Generate reports

## IP Categories

- Patents
- Copyright
- Trademarks
- Industrial Design
- Utility Models
- Other

## Security Features

- Row Level Security (RLS) on all tables
- Role-based access control (RBAC)
- JWT authentication
- Email verification
- Audit logging
- Secure password hashing

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Environment variables are pre-configured in `.env`

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## Edge Functions

### send-notification-email
Handles email notifications for various workflow events:
- Welcome emails
- Submission confirmations
- Review notifications
- Evaluation results

### generate-pdf
Generates PDF certificates with:
- QR codes for verification
- UCC logo watermark
- Official signatures
- Timestamp and audit trail

## Default System Settings

The system comes pre-configured with:
- Theme colors (customizable by admin)
- Email templates
- PDF certificate templates
- Workflow automation settings

## Status Tracking

Submissions progress through these statuses:
- `submitted` - Initial submission
- `waiting_supervisor` - Awaiting supervisor review
- `supervisor_revision` - Needs revision per supervisor
- `supervisor_approved` - Approved by supervisor
- `waiting_evaluation` - Awaiting evaluator
- `evaluator_revision` - Needs revision per evaluator
- `evaluator_approved` - Approved by evaluator
- `preparing_legal` - Being prepared for filing
- `ready_for_filing` - Ready for legal filing
- `rejected` - Rejected

## Notification System

Real-time notifications for:
- New assignments
- Status changes
- Review decisions
- Evaluation results
- System updates

## Future Enhancements

- Document upload and management
- Advanced analytics and reporting
- Email integration (SMTP)
- PDF generation with libraries
- Theme customization UI
- Multi-language support
- Mobile app
- API documentation
- Bulk operations
- Export functionality

## Support

For issues or questions, contact the UCC IP Office.

## License

Copyright © 2025 University of Cape Coast. All rights reserved.
