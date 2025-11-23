# Fixing Email Errors - Step by Step

## The Errors You're Seeing

### Error 1: Registration Page
```
❌ Failed to send verification code
```

### Error 2: Admin Create User
```
❌ User created successfully, but failed to send email. Please contact the user directly.
```

## Why These Errors Happen

The email system is configured but **needs an API key** to actually send emails. Without it:
- ❌ Verification codes can't be sent during registration
- ❌ Welcome emails with passwords can't be sent to new users

## The Solution (5 Minutes)

### Step 1: Create Free Resend Account (2 min)

1. Go to: **https://resend.com/signup**
2. Enter your email and create password
3. Verify your email address
4. You're in! (Free tier = 3,000 emails/month)

### Step 2: Get Your API Key (1 min)

1. In Resend dashboard, click **"API Keys"** in the left sidebar
2. Click the **"Create API Key"** button
3. Give it a name: `UCC IP Management`
4. Click **"Create"**
5. **COPY THE KEY** - it starts with `re_` like: `re_123abc456def...`
6. Save it somewhere (you won't see it again!)

### Step 3: Add to Supabase (2 min)

1. Open a new tab and go to: **https://supabase.com/dashboard**

2. Click on your project: **mqfftubqlwiemtxpagps**

3. In the left sidebar, click **"Edge Functions"**

4. Look for a button that says **"Manage secrets"** or **"Settings"** or **"Function secrets"**
   - It might be in the top right
   - Or in a settings/configuration area

5. Click **"New secret"** or **"Add secret"** or similar button

6. Fill in:
   ```
   Name:  RESEND_API_KEY
   Value: [paste your key here - the one starting with re_]
   ```

7. Click **"Save"** or **"Add"** or **"Create"**

8. **Wait 1-2 minutes** for the secret to propagate

### Step 4: Test It!

#### Test Registration:
1. Go back to your app
2. Try registering again
3. You should now receive an email with a 6-digit code
4. Check your inbox (and spam folder just in case)
5. Enter the code to complete registration

#### Test Admin Create User:
1. Login as admin
2. Go to User Management
3. Try creating a user again
4. You should see: "User created successfully! Login credentials have been sent to [email]"
5. Check that email inbox for the welcome message

## Troubleshooting

### "I added the secret but still getting errors"

**Solution**: Wait 2-3 minutes and try again. Secrets take a moment to propagate.

### "I can't find where to add secrets in Supabase"

**Try these locations**:
1. Edge Functions → Click on any function → Settings tab
2. Project Settings → Edge Functions → Secrets
3. Edge Functions → Three dots menu → Manage secrets

**Still can't find it?** The Supabase UI changes sometimes. Look for:
- "Secrets"
- "Environment variables"
- "Function secrets"
- "Configuration"

### "Emails are going to spam"

**This is normal!** When you first start sending:
1. Check your spam/junk folder
2. Mark the email as "Not Spam"
3. Future emails will go to inbox

**For production**: Verify your domain in Resend (see `EMAIL_SERVICE_SETUP.md`)

### "I lost my API key"

**No problem!**:
1. Go back to Resend dashboard
2. Delete the old key
3. Create a new one
4. Update it in Supabase secrets

### "It's still not working"

**Check these**:
1. API key is correct (starts with `re_`)
2. Secret name is exactly: `RESEND_API_KEY` (case-sensitive)
3. You waited 2-3 minutes after adding the secret
4. You're using the correct Supabase project

**Still stuck?** Check the Edge Function logs:
1. Supabase Dashboard → Edge Functions
2. Click on `send-verification-code` or `create-user`
3. Look at the "Logs" tab
4. Look for error messages

## What Happens After You Fix It

### Registration Flow:
1. User fills out registration form ✅
2. Clicks "Create Account" ✅
3. **Email sent with 6-digit code** ✅
4. User checks email and copies code ✅
5. User enters code in verification screen ✅
6. Account is created ✅
7. User can now login ✅

### Admin Create User Flow:
1. Admin fills out create user form ✅
2. Clicks "Create User" ✅
3. **Email sent with welcome message and password** ✅
4. Admin sees success message (no password shown) ✅
5. New user receives email with credentials ✅
6. New user can login immediately ✅

## Why We Use Resend

- ✅ **Free**: 3,000 emails/month at no cost
- ✅ **Independent**: Not tied to your Supabase project
- ✅ **Reliable**: Professional email infrastructure
- ✅ **Simple**: Just one API key needed
- ✅ **Deliverable**: High inbox placement rates

## Alternative: Testing Without Email

If you want to test right now without configuring email:

### Get Verification Code from Logs:
1. Try to register
2. Go to Supabase Dashboard → Edge Functions → `send-verification-code`
3. Click "Logs"
4. Find the 6-digit code in the logs
5. Use it to complete registration

### Get Temporary Password from Logs:
1. Try to create a user as admin
2. Go to Edge Functions → `create-user`
3. Check the logs for the generated password
4. Share it with the user manually

**But really, just set up Resend - it takes 5 minutes and works perfectly!**

## Summary

```
Problem: Email errors during registration and user creation
Cause: Missing RESEND_API_KEY environment variable
Solution:
  1. Create Resend account (free)
  2. Get API key
  3. Add to Supabase Edge Function secrets
  4. Wait 2 minutes
  5. Test again
Time: 5 minutes
Cost: FREE
```

## Need More Help?

See these detailed guides:
- `EMAIL_SERVICE_SETUP.md` - Complete setup instructions
- `EMAIL_SYSTEM_SUMMARY.md` - Technical documentation
- `QUICK_EMAIL_SETUP.md` - Visual step-by-step guide

---

**You've got this! The email system is already built and working - it just needs the API key to start sending emails.** 🚀
