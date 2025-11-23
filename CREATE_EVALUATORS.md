# Evaluator Accounts - Complete List

## How to Create All Evaluator Accounts

### Option 1: Use Admin Panel (Recommended)

1. Login as admin at: https://bolt.new/~/sb1-e4h1yrar
2. Navigate to "User Management"
3. Click "Create User" for each evaluator below
4. Copy the credentials from the list below

### Option 2: Use the Edge Function

You need to be logged in as admin first, then run this in the browser console:

```javascript
const supabaseUrl = 'https://mqfftubqlwiemtxpagps.supabase.co';
const token = localStorage.getItem('supabase.auth.token'); // Get your admin token

const evaluators = [
  { email: "patent-evaluator@ucc-ipo.com", fullName: "Patent Evaluator", category: "patent", password: "PatentEval2024!" },
  { email: "trademark-evaluator@ucc-ipo.com", fullName: "Trademark Evaluator", category: "trademark", password: "TrademarkEval2024!" },
  { email: "design-evaluator@ucc-ipo.com", fullName: "Industrial Design Evaluator", category: "design", password: "DesignEval2024!" },
  { email: "utility-evaluator@ucc-ipo.com", fullName: "Utility Model Evaluator", category: "utility_model", password: "UtilityEval2024!" },
  { email: "other-evaluator@ucc-ipo.com", fullName: "General Evaluator", category: "other", password: "OtherEval2024!" }
];

for (const evaluator of evaluators) {
  const response = await fetch(`${supabaseUrl}/functions/v1/create-user`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: evaluator.email,
      fullName: evaluator.fullName,
      password: evaluator.password,
      role: 'evaluator',
      categorySpecialization: evaluator.category
    }),
  });

  const result = await response.json();
  console.log(`${evaluator.email}:`, result);
}
```

---

## Complete Evaluator Account List

### 1. Patent Evaluator
- **Email**: `patent-evaluator@ucc-ipo.com`
- **Password**: `PatentEval2024!`
- **Full Name**: Patent Evaluator
- **Role**: Evaluator
- **Specialization**: Patent
- **Status**: ⏳ To be created

### 2. Copyright Evaluator
- **Email**: `copyright-evaluator@ucc-ipo.com` (Previously: CR-EVAL@ucc-ipo.com)
- **Password**: `CopyrightEval2024!`
- **Full Name**: Copyright Evaluator (Currently: ryan mateo)
- **Role**: Evaluator
- **Specialization**: Copyright
- **Status**: ✅ **ACTIVE** (using CR-EVAL@ucc-ipo.com with specialization set to 'copyright')

### 3. Trademark Evaluator
- **Email**: `trademark-evaluator@ucc-ipo.com`
- **Password**: `TrademarkEval2024!`
- **Full Name**: Trademark Evaluator
- **Role**: Evaluator
- **Specialization**: Trademark
- **Status**: ⏳ To be created

### 4. Industrial Design Evaluator
- **Email**: `design-evaluator@ucc-ipo.com`
- **Password**: `DesignEval2024!`
- **Full Name**: Industrial Design Evaluator
- **Role**: Evaluator
- **Specialization**: Industrial Design (design)
- **Status**: ⏳ To be created

### 5. Utility Model Evaluator
- **Email**: `utility-evaluator@ucc-ipo.com`
- **Password**: `UtilityEval2024!`
- **Full Name**: Utility Model Evaluator
- **Role**: Evaluator
- **Specialization**: Utility Model (utility_model)
- **Status**: ⏳ To be created

### 6. Other/General Evaluator
- **Email**: `other-evaluator@ucc-ipo.com`
- **Password**: `OtherEval2024!`
- **Full Name**: General Evaluator
- **Role**: Evaluator
- **Specialization**: Other
- **Status**: ⏳ To be created

---

## Category Mapping Reference

| IP Category | Database Value | Evaluator Email | Evaluator Name |
|-------------|---------------|-----------------|----------------|
| Patent | `patent` | patent-evaluator@ucc-ipo.com | Patent Evaluator |
| Copyright | `copyright` | CR-EVAL@ucc-ipo.com | ryan mateo |
| Trademark | `trademark` | trademark-evaluator@ucc-ipo.com | Trademark Evaluator |
| Industrial Design | `design` | design-evaluator@ucc-ipo.com | Industrial Design Evaluator |
| Utility Model | `utility_model` | utility-evaluator@ucc-ipo.com | Utility Model Evaluator |
| Other | `other` | other-evaluator@ucc-ipo.com | General Evaluator |

---

## Manual Creation Steps

If you prefer to create accounts manually through the admin interface:

1. **Login as Admin**
   - Go to the application
   - Login with admin credentials
   - Navigate to "User Management"

2. **For Each Evaluator:**
   - Click "Create User" button
   - Fill in the form:
     - Email: (from list above)
     - Full Name: (from list above)
     - Password: (from list above)
     - Role: Select "Evaluator"
     - Category Specialization: Select appropriate category
   - Click "Create User"
   - Note down the credentials

3. **Verify Creation:**
   - Check that each evaluator appears in the user list
   - Verify the category_specialization is set correctly
   - Test login with each account

---

## Quick Copy-Paste List

```
Patent Evaluator
Email: patent-evaluator@ucc-ipo.com
Password: PatentEval2024!
Category: patent

Copyright Evaluator
Email: CR-EVAL@ucc-ipo.com (ALREADY ACTIVE)
Password: CopyrightEval2024!
Category: copyright
Note: Using existing account (ryan mateo)

Trademark Evaluator
Email: trademark-evaluator@ucc-ipo.com
Password: TrademarkEval2024!
Category: trademark

Industrial Design Evaluator
Email: design-evaluator@ucc-ipo.com
Password: DesignEval2024!
Category: design

Utility Model Evaluator
Email: utility-evaluator@ucc-ipo.com
Password: UtilityEval2024!
Category: utility_model

Other/General Evaluator
Email: other-evaluator@ucc-ipo.com
Password: OtherEval2024!
Category: other
```

---

## Current System Status

### Currently Active:
- ✅ **1 Copyright Evaluator** (CR-EVAL@ucc-ipo.com - ryan mateo)
- ✅ **1 Supervisor** (BSIS@ucc-ipo.com - Cath Llena)

### To Be Created:
- ⏳ Patent Evaluator
- ⏳ Trademark Evaluator
- ⏳ Industrial Design Evaluator
- ⏳ Utility Model Evaluator
- ⏳ Other/General Evaluator

---

## Security Notes

- All passwords follow the pattern: `<Category>Eval2024!`
- Users should change passwords on first login
- All accounts are created with `is_verified: true`
- Accounts have `role: 'evaluator'`
- Each has a specific `category_specialization` for auto-assignment

---

## Testing After Creation

1. Login with each evaluator account
2. Verify they can access the Evaluator Dashboard
3. Create a test submission in their category
4. Verify the evaluator receives the assignment notification
5. Verify they can evaluate the submission

---

## Troubleshooting

**If evaluator doesn't receive assignments:**
- Check `category_specialization` field matches exactly
- Values should be: `patent`, `copyright`, `trademark`, `design`, `utility_model`, `other`
- Check in database: `SELECT email, category_specialization FROM users WHERE role = 'evaluator';`

**If login fails:**
- Verify account exists in both `auth.users` and `public.users` tables
- Check `is_verified` is set to `true`
- Verify password is correct

**To reset password:**
- Use admin panel User Management
- Or use Supabase auth admin API
