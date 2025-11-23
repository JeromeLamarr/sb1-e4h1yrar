# Deployment Guide - UCC IP Management System

## System Overview

The University Intellectual Property Management System is a full-stack application built with:
- Frontend: React + TypeScript + Vite
- Backend: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Hosting: Supabase (auto-deployed)

## Prerequisites

- Supabase account (already configured)
- Node.js 18+ installed
- Basic understanding of web applications

## Database Setup

### ✅ Already Completed

The database has been fully configured with:
- 11 tables with relationships
- Row Level Security (RLS) policies
- User roles: applicant, supervisor, evaluator, admin
- Default system settings
- Email and PDF templates

### Database Tables

1. **users** - User accounts and profiles
2. **ip_records** - IP submissions
3. **ip_documents** - Uploaded files
4. **generated_pdfs** - System certificates
5. **activity_logs** - Audit trail
6. **notifications** - User notifications
7. **supervisor_assignments** - Review assignments
8. **evaluator_assignments** - Evaluation assignments
9. **evaluations** - Evaluation results
10. **system_settings** - Global config
11. **templates** - Email/PDF templates

## Edge Functions

### ✅ Deployed Functions

Two Edge Functions have been deployed:

1. **send-notification-email**
   - URL: `[SUPABASE_URL]/functions/v1/send-notification-email`
   - Purpose: Send email notifications
   - Auth: Required

2. **generate-pdf**
   - URL: `[SUPABASE_URL]/functions/v1/generate-pdf`
   - Purpose: Generate PDF certificates with QR codes
   - Auth: Required

## Creating Your First Admin Account

Since you need an admin to create other users, here's how to create the first admin:

### Method 1: Via Supabase Dashboard

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email and password
4. Note the User ID
5. Go to SQL Editor and run:

```sql
INSERT INTO users (auth_user_id, email, full_name, role, is_verified)
VALUES (
  '[USER_ID_FROM_STEP_4]',
  'admin@university.edu',
  'System Administrator',
  'admin',
  true
);
```

### Method 2: Via Registration + Database Update

1. Register normally through the app
2. Go to Supabase Dashboard → Table Editor → users
3. Find your user and change role from 'applicant' to 'admin'
4. Set is_verified to true

## Storage Setup (Optional)

For document uploads to work, create a storage bucket:

1. Go to Supabase Dashboard → Storage
2. Click "New bucket"
3. Name: `ip-documents`
4. Public: No (private)
5. Set up RLS policies for the bucket

## User Workflow

### For Applicants
1. Register at `/register`
2. Verify email (if enabled)
3. Login at `/login`
4. Create IP submission
5. Upload supporting documents
6. Track submission status
7. View evaluation results

### For Supervisors
1. Admin creates account
2. Login with provided credentials
3. View assigned submissions
4. Review and provide feedback
5. Approve/Reject/Request Revision

### For Evaluators
1. Admin creates account with category assignment
2. Login with provided credentials
3. View submissions in their category
4. Evaluate using 4-criteria scoring
5. Provide detailed feedback
6. Approve/Reject/Request Revision

### For Admins
1. Access user management
2. Create supervisor/evaluator accounts
3. View system analytics
4. Monitor all submissions
5. Export reports
6. Configure system settings

## Environment Variables

Already configured in `.env`:
```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Running the Application

### Development Mode
```bash
npm install
npm run dev
```
Access at: http://localhost:5173

### Production Build
```bash
npm run build
npm run preview
```

## Deployment Options

### Option 1: Supabase Hosting (Recommended)
The application is already hosted by Supabase and auto-deploys.

### Option 2: Vercel
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Option 3: Netlify
1. Drag and drop `dist` folder
2. Or connect Git repository
3. Set environment variables

## Testing the System

### 1. Create Test Users

Create one of each role:
- Applicant (via registration)
- Supervisor (via admin panel)
- Evaluator (via admin panel)
- Admin (manual setup)

### 2. Test Workflow

1. **As Applicant**: Create IP submission
2. **As Supervisor**: Review and approve
3. **As Evaluator**: Evaluate and grade
4. **As Admin**: View analytics and export data

### 3. Test Features

- ✅ User registration
- ✅ Login/logout
- ✅ IP submission creation
- ✅ Document upload (requires storage setup)
- ✅ Supervisor review
- ✅ Evaluator grading
- ✅ Notifications
- ✅ Status tracking
- ✅ Analytics dashboard
- ✅ User management
- ✅ Export to CSV

## Security Checklist

- ✅ RLS enabled on all tables
- ✅ Role-based access control
- ✅ JWT authentication
- ✅ Password hashing (via Supabase)
- ✅ Protected routes
- ✅ Audit logging
- ✅ Input validation

## Monitoring and Maintenance

### Database
- Monitor via Supabase Dashboard → Database
- Check activity logs table for audit trail
- Review RLS policies periodically

### Users
- Monitor registration patterns
- Review user activity
- Handle support requests

### Performance
- Check Supabase usage metrics
- Monitor API response times
- Optimize queries if needed

## Troubleshooting

### Users Can't Login
- Verify email confirmation is disabled in Supabase Auth settings
- Check user exists in both auth.users and public.users tables
- Verify is_verified is set to true

### RLS Policy Errors
- Check user has proper role assigned
- Verify auth_user_id matches between tables
- Review policy definitions in database

### File Upload Issues
- Ensure storage bucket is created
- Check RLS policies on storage bucket
- Verify file size limits

### Notifications Not Working
- Check notifications table for entries
- Verify Edge Function is deployed
- Check browser console for errors

## Future Enhancements

### Planned Features
- Full document management system
- Advanced PDF generation with templates
- Email integration (SMTP)
- SMS notifications
- Mobile application
- Advanced analytics
- Bulk operations
- Custom form builder
- Theme customization UI
- Multi-language support

### Integration Opportunities
- Office 365 integration
- Google Workspace integration
- Legal filing system integration
- Payment processing for fees
- E-signature integration

## Support

For technical issues:
1. Check browser console for errors
2. Review Supabase logs
3. Check activity_logs table
4. Review this deployment guide

## License

Copyright © 2025 University of Cape Coast. All rights reserved.
