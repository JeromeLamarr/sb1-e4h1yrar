# Email Service Setup Guide

## Overview
The application now uses **Resend** as an independent email service provider for sending:
- Verification codes during registration
- Temporary passwords for admin-created users
- Account notifications

This email service is **completely independent** from your Supabase project and provides reliable email delivery.

## Why Resend?
- Free tier: 100 emails/day, 3,000 emails/month
- Simple API integration
- High deliverability rates
- No complex SMTP configuration needed
- Production-ready infrastructure

## Setup Instructions

### Step 1: Create a Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" and create a free account
3. Verify your email address

### Step 2: Get Your API Key

1. After logging in, go to **API Keys** section
2. Click "Create API Key"
3. Give it a name (e.g., "UCC IP Management Production")
4. Copy the API key (it starts with `re_`)
5. **Save this key securely** - you won't be able to see it again!

### Step 3: Configure the API Key in Supabase

You need to add the Resend API key as an environment variable in your Supabase project:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mqfftubqlwiemtxpagps`
3. Click on "Edge Functions" in the left sidebar
4. Click on "Manage secrets" or "Settings"
5. Add a new secret:
   - **Name**: `RESEND_API_KEY`
   - **Value**: Your Resend API key (starts with `re_`)
6. Click "Save" or "Add secret"

#### Option B: Using Supabase CLI (if you have it installed)

```bash
supabase secrets set RESEND_API_KEY=re_your_actual_api_key_here
```

### Step 4: Verify Domain (Optional but Recommended for Production)

For production use, you should verify your own domain:

1. In Resend dashboard, go to **Domains**
2. Click "Add Domain"
3. Enter your domain (e.g., `ucc.edu.ph`)
4. Follow the DNS configuration instructions
5. Wait for verification (usually takes a few minutes)

Once verified, update the "from" address in the edge function:
- Change `"UCC IP Office <onboarding@resend.dev>"`
- To `"UCC IP Office <noreply@yourdomain.com>"`

### Step 5: Test the Email Functionality

#### Test User Registration:
1. Go to the registration page
2. Fill out the form with a real email address
3. Click "Create Account"
4. Check your email for the 6-digit verification code
5. Enter the code to complete registration

#### Test Admin User Creation:
1. Login as an admin
2. Go to User Management
3. Click "Create User"
4. Fill out the form with a real email address
5. Submit the form
6. Check the email inbox for the welcome email with temporary password

## Email Templates

### Verification Code Email
- **Subject**: "Verify Your Email - UCC IP Management"
- **Content**: 6-digit code with 10-minute expiration
- **Styling**: Professional HTML email with UCC branding

### Welcome Email (Admin-Created Users)
- **Subject**: "Welcome to UCC IP Management - Your Account Details"
- **Content**:
  - Welcome message
  - Login credentials (email + temporary password)
  - Security warnings
  - Direct login link
- **Styling**: Professional HTML with clear password display

## Troubleshooting

### Emails Not Being Received

1. **Check Spam/Junk Folder**
   - Resend emails might initially land in spam
   - Mark as "Not Spam" to improve future deliverability

2. **Verify API Key is Set**
   - Check Supabase Edge Functions secrets
   - Make sure `RESEND_API_KEY` is properly configured

3. **Check Resend Dashboard**
   - Go to Resend dashboard → Emails
   - Check if emails are being sent
   - Look for any delivery errors

4. **Rate Limits**
   - Free tier: 100 emails/day
   - If exceeded, upgrade your Resend plan

### Common Error Messages

#### "Email service not configured"
- **Cause**: `RESEND_API_KEY` environment variable not set
- **Solution**: Follow Step 3 above to add the API key

#### "Failed to send email"
- **Cause**: Invalid API key or Resend service issue
- **Solution**:
  - Verify your API key is correct
  - Check Resend service status
  - Look at Supabase Edge Function logs for details

#### Emails sent but not delivered
- **Cause**: Domain not verified, recipient email filtering
- **Solution**:
  - Verify your domain in Resend (Step 4)
  - Ask recipients to check spam folder
  - Use a professional email domain

## Cost Information

### Resend Pricing (as of 2024)
- **Free Tier**:
  - 100 emails/day
  - 3,000 emails/month
  - 1 domain
  - 1 API key

- **Pro Tier** ($20/month):
  - 50,000 emails/month
  - Additional emails at $1/1,000
  - 10 domains
  - Unlimited API keys

For a university with moderate usage, the free tier should be sufficient initially.

## Security Best Practices

1. **Keep API Key Secure**
   - Never commit API keys to version control
   - Only store in Supabase Edge Function secrets
   - Rotate keys periodically

2. **Monitor Usage**
   - Check Resend dashboard regularly
   - Set up alerts for unusual activity
   - Monitor delivery rates

3. **Use Domain Verification**
   - Improves deliverability
   - Builds sender reputation
   - Prevents spoofing

## Alternative Email Providers

If you prefer a different service, you can easily modify the edge function to use:

- **SendGrid** - Popular choice, similar pricing
- **Mailgun** - Great for high volume
- **Amazon SES** - AWS integration, pay-as-you-go
- **Postmark** - Transactional email specialist

The edge function structure (`send-notification-email`) is designed to be provider-agnostic and easy to modify.

## Support

If you encounter issues:

1. Check Edge Function logs in Supabase Dashboard
2. Review Resend dashboard for email delivery status
3. Verify all environment variables are set correctly
4. Test with different email addresses (Gmail, Outlook, etc.)

## Current Email Flow Summary

### Registration Flow:
1. User submits registration form
2. `send-verification-code` edge function is called
3. Verification code is generated and stored in database
4. Email with code is sent via Resend
5. User enters code
6. `verify-code` edge function validates and creates account

### Admin User Creation Flow:
1. Admin submits create user form
2. `create-user` edge function is called
3. User account is created with temporary password
4. Welcome email with credentials is sent via Resend
5. User receives email with login details
6. User can login immediately and should change password

All email sending is handled by the independent Resend service, not connected to your Supabase project's email system.
