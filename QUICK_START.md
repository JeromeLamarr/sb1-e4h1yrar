# Quick Start Guide - UCC IP Management System

Get up and running in 5 minutes!

---

## ⚠️ IMPORTANT: Fix Email Errors First!

If you're seeing these errors:
- ❌ "Failed to send verification code" (Registration)
- ❌ "User created successfully, but failed to send email" (Admin)

**You need to configure the email service first! See `EMAIL_SERVICE_SETUP.md` or follow these quick steps:**

### Quick Email Fix (2 minutes):
1. Visit https://resend.com/signup and create free account
2. Get your API key from the dashboard (starts with `re_`)
3. Go to https://supabase.com/dashboard → your project → Edge Functions → Manage secrets
4. Add secret: Name=`RESEND_API_KEY`, Value=[your key]
5. Save and test registration/user creation again

**Once email is configured, continue below:**

---

## 🚀 Step 1: Access the Application

The application is already deployed and running at your Supabase URL.

**URL**: Your Supabase project URL

---

## 👤 Step 2: Create Your First Admin Account

### Option A: Use the Helper Function (Recommended)

1. Register normally through the app:
   - Go to `/register`
   - Enter your university email
   - Create a password
   - Complete registration

2. Go to Supabase Dashboard → SQL Editor

3. Run this command (replace with your email):
   ```sql
   SELECT make_user_admin('your-email@university.edu');
   ```

4. Verify it worked:
   ```sql
   SELECT * FROM get_user_by_email('your-email@university.edu');
   ```
   You should see `role: 'admin'`

5. Log out and log back in to see admin features

### Option B: Manual Method

1. Register through the app
2. Go to Supabase Dashboard → Table Editor → users
3. Find your user record
4. Edit the record:
   - Change `role` from `applicant` to `admin`
   - Set `is_verified` to `true`
5. Log out and log back in

---

## 👥 Step 3: Create Test Users (Optional)

Once you're logged in as admin:

1. Go to **Dashboard** → **Users** (sidebar)
2. Click **Create User**
3. Create one supervisor:
   - Email: supervisor@test.edu
   - Name: Dr. Test Supervisor
   - Role: Supervisor
   - Department: Computer Science
4. Create one evaluator:
   - Email: evaluator@test.edu
   - Name: Prof. Test Evaluator
   - Role: Evaluator
   - Department: Engineering

The system will generate temporary passwords and display them.

---

## 📝 Step 4: Test the Complete Workflow

### As Applicant

1. **Register** a new account (or use a different browser/incognito)
   - Email: applicant@test.edu
   - Name: John Doe

2. **Create IP Submission**
   - Click "New Submission"
   - Fill in:
     - Title: "AI-Powered Study Assistant"
     - Category: Patent
     - Abstract: Brief description
     - Description: Detailed information
   - Select the supervisor you created
   - Submit

3. **View Dashboard**
   - See your submission with status "Waiting Supervisor"
   - Click on the title to view details

### As Supervisor

1. **Login** with supervisor credentials
   - The submission appears in review queue

2. **Review Submission**
   - Click "Approve"
   - Add remarks: "Great innovation, approved for evaluation"
   - Confirm

### As Evaluator

1. **Login** with evaluator credentials
   - The submission now appears in evaluation queue

2. **Evaluate Submission**
   - Click "Start Evaluation"
   - Set scores:
     - Innovation: 9/10
     - Feasibility: 8/10
     - Market Potential: 8/10
     - Technical Merit: 9/10
   - See automatic grade calculation (A)
   - Add remarks: "Excellent work, recommended for filing"
   - Select "Approve"
   - Submit

### As Admin

1. **View Dashboard**
   - See updated statistics
   - Check recent activity

2. **View All Records**
   - Go to "All Records"
   - See the submission
   - Export to CSV

3. **Check Analytics**
   - View submission trends
   - Check category distribution

---

## 📦 Step 5: Enable File Uploads (Optional)

The storage bucket has been created automatically. To verify:

1. Go to Supabase Dashboard → Storage
2. Look for bucket: `ip-documents`
3. It should already exist with RLS policies

Now applicants can upload documents to their submissions!

---

## ✅ Verification Checklist

After completing the quick start, verify:

- [ ] Admin account created and working
- [ ] Can access admin dashboard
- [ ] Created at least one supervisor
- [ ] Created at least one evaluator
- [ ] Test applicant can register
- [ ] Test applicant can submit IP
- [ ] Supervisor can review submissions
- [ ] Evaluator can grade submissions
- [ ] Admin can view all records
- [ ] Notifications are working
- [ ] Export to CSV works

---

## 🎯 What's Next?

### For Production Use

1. **User Management**
   - Create real supervisor accounts
   - Create evaluator accounts for each IP category
   - Assign categories to evaluators

2. **System Configuration**
   - Update system settings (optional)
   - Customize email templates (optional)
   - Set up SMTP for production emails (optional)

3. **Training**
   - Train supervisors on review process
   - Train evaluators on grading criteria
   - Train applicants on submission process

### Common Tasks

#### View All Users
```sql
SELECT role, COUNT(*), array_agg(email)
FROM users
GROUP BY role;
```

#### View Submission Statistics
```sql
SELECT * FROM get_submission_stats();
```

#### View User Statistics
```sql
SELECT * FROM get_user_stats();
```

#### Find Submissions Needing Attention
```sql
SELECT title, status, created_at
FROM ip_records
WHERE status IN ('waiting_supervisor', 'waiting_evaluation')
ORDER BY created_at ASC;
```

---

## 🆘 Troubleshooting

### Can't Login
- Ensure email is verified (check users table: `is_verified = true`)
- Verify credentials are correct
- Check browser console for errors

### Admin Features Not Showing
- Log out completely
- Clear browser cache
- Log back in
- Verify role is 'admin' in database

### No Supervisors/Evaluators in Dropdown
- Go to User Management
- Create supervisor and evaluator accounts
- They'll appear in dropdowns immediately

### File Upload Not Working
- Check if storage bucket exists (should be auto-created)
- Verify RLS policies on storage bucket
- Check browser console for errors

### Notifications Not Appearing
- Check notifications table in database
- Verify NotificationCenter is rendering
- Check browser console for errors

---

## 📚 Additional Resources

- **README.md** - Complete feature documentation
- **DEPLOYMENT_GUIDE.md** - Detailed deployment instructions
- **PROJECT_SUMMARY.md** - Full project overview
- **FEATURES.md** - Complete feature list

---

## 💡 Tips for Success

1. **Start Small**
   - Test with 2-3 users first
   - Complete one full workflow
   - Then expand to more users

2. **Monitor Activity**
   - Check activity logs regularly
   - Review submission patterns
   - Monitor user feedback

3. **Backup Regularly**
   - Supabase handles automatic backups
   - Export important data periodically
   - Keep documentation updated

4. **Stay Organized**
   - Create clear user naming conventions
   - Document any custom configurations
   - Track system changes

---

## 🎉 You're Ready!

The system is now fully operational. Start by:
1. Creating your admin account
2. Adding supervisors and evaluators
3. Testing a complete workflow
4. Training your users
5. Going live!

**Questions?** Check the other documentation files or contact support.

---

*Happy IP Management!* 🚀
