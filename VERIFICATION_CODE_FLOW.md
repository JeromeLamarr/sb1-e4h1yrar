# Email Verification Code Flow

## Overview
The registration system now uses a two-step verification process where users receive a 6-digit code via email that they must enter to complete their registration.

## How It Works

### Step 1: Initial Registration Form
1. User fills out the registration form with:
   - Full Name
   - Email Address
   - Affiliation/Department (optional)
   - Password
   - Confirm Password

2. When user clicks "Create Account":
   - Form data is validated
   - A verification code (6 random digits) is generated
   - Code is stored in the `verification_codes` table with a 10-minute expiration
   - Email with the code is sent to the user's email address
   - User is taken to the verification screen

### Step 2: Email Verification
1. User receives an email with:
   - A 6-digit verification code
   - Clear instructions
   - 10-minute expiration notice

2. User enters the 6-digit code in the verification screen

3. When code is submitted:
   - System validates the code against the database
   - Checks if the code has expired
   - If valid:
     - Creates the user account in Supabase Auth
     - Creates the user profile in the users table
     - Marks the verification code as used
     - Shows success message
     - Redirects to login page

4. User can:
   - Resend the code if not received
   - Go back to change email address
   - See code expiration countdown

## Technical Implementation

### Database Table: `verification_codes`
```sql
- id (uuid)
- email (text)
- code (text) - 6-digit code
- full_name (text)
- affiliation (text, nullable)
- password_hash (text)
- expires_at (timestamptz) - 10 minutes from creation
- verified (boolean) - marks if code was used
- created_at (timestamptz)
```

### Edge Functions

#### 1. `send-verification-code`
- **Purpose**: Generate and send verification code
- **Authentication**: Public (no JWT required)
- **Input**: email, fullName, password, affiliation
- **Process**:
  - Checks if user already exists
  - Generates 6-digit random code
  - Deletes any existing codes for the email
  - Stores code in database
  - Sends formatted email with code
- **Output**: Success/error response

#### 2. `verify-code`
- **Purpose**: Verify code and complete registration
- **Authentication**: Public (no JWT required)
- **Input**: email, code
- **Process**:
  - Looks up verification code in database
  - Validates code hasn't expired
  - Creates auth user with service role key
  - Creates user profile
  - Marks code as verified
- **Output**: Success/error response

#### 3. `create-user` (Admin Only)
- **Purpose**: Admins can create users directly
- **Authentication**: Requires JWT, admin role
- **Input**: email, fullName, role, affiliation
- **Process**:
  - Verifies requester is admin
  - Creates auth user
  - Creates user profile with is_verified=true
  - Generates temporary password
  - Sends notification
- **Output**: Success with temp password

## Security Features

1. **Code Expiration**: Codes expire after 10 minutes
2. **One-Time Use**: Codes are marked as verified after use
3. **Email Validation**: Checks if user already exists
4. **Secure Storage**: Password is stored with the code (not hashed in the temp table, but immediately used to create auth user)
5. **Auto-Cleanup**: Old codes can be deleted based on expires_at

## User Experience

### For Regular Users (Applicants)
1. Fill registration form
2. Receive email with 6-digit code
3. Enter code to complete registration
4. Login with credentials

### For Admin-Created Users
1. Admin creates user via User Management
2. User is automatically verified
3. Admin receives temporary password
4. User can login immediately with temp password
5. User should change password on first login

## Email Template
The verification email includes:
- University branding
- Clear heading: "Email Verification"
- Personalized greeting
- Large, prominent 6-digit code
- Expiration notice (10 minutes)
- University footer with tagline

## Error Handling

### Common Errors:
- **"User with this email already exists"**: Email is already registered
- **"Invalid or expired verification code"**: Code doesn't match or has expired
- **"Failed to send verification code"**: Email service issue
- **"Only admins can create users"**: Non-admin trying to use create-user function

### Recovery Options:
- Resend verification code (generates new code)
- Change email address (go back to registration form)
- Contact support if persistent issues

## Benefits Over Traditional Email Confirmation

1. **Faster**: No need to click links, just enter code
2. **More Secure**: Time-limited codes
3. **Better UX**: Users stay in the app
4. **Mobile-Friendly**: Easy to copy code from email app
5. **Clear Expiration**: Users know exactly how long code is valid
