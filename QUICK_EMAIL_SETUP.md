# Quick Email Setup - 5 Minutes

## What You Need
A free Resend account to send emails independently from Supabase.

## Setup Steps (5 minutes)

### 1. Create Resend Account (2 min)
1. Go to: **https://resend.com/signup**
2. Sign up with your email
3. Verify your email address

### 2. Get API Key (1 min)
1. Login to Resend dashboard
2. Click **"API Keys"** in sidebar
3. Click **"Create API Key"**
4. Name it: "UCC IP Management"
5. **Copy the key** (starts with `re_`)
6. Save it somewhere safe

### 3. Add to Supabase (2 min)
1. Go to: **https://supabase.com/dashboard**
2. Open your project: **mqfftubqlwiemtxpagps**
3. Click **"Edge Functions"** in left sidebar
4. Click **"Manage secrets"** or **"Settings"**
5. Click **"New secret"** or **"Add"**
6. Enter:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Paste your Resend API key
7. Click **"Save"** or **"Add secret"**

## Test It! (2 minutes)

### Test Registration Email:
1. Go to your app's registration page
2. Sign up with your real email
3. Check email for 6-digit code
4. Enter code to complete registration

### Test Admin Email:
1. Login as admin
2. Go to User Management
3. Create a new user with your email
4. Check email for welcome message with password
5. Verify NO password shown in browser

## That's It!

Your email system is now fully functional and independent from Supabase!

## Having Issues?

### Emails not arriving?
- Check spam/junk folder first
- Verify API key is correct in Supabase
- Check Resend dashboard → Emails for delivery status

### "Email service not configured" error?
- Make sure you added `RESEND_API_KEY` to Supabase secrets
- Double-check the spelling is exactly: `RESEND_API_KEY`
- Wait 1-2 minutes after adding the secret

## Free Tier Limits
- 100 emails per day
- 3,000 emails per month
- Perfect for testing and moderate use

Need more? See `EMAIL_SERVICE_SETUP.md` for upgrade options.

## What Emails Are Sent?

1. **Registration**: 6-digit verification code (required to complete signup)
2. **Admin Create User**: Welcome email with temporary password
3. Both use professional UCC-branded templates

## Need Help?
See detailed guides:
- `EMAIL_SERVICE_SETUP.md` - Complete setup guide
- `EMAIL_SYSTEM_SUMMARY.md` - Full implementation details
- `VERIFICATION_CODE_FLOW.md` - Technical flow documentation
