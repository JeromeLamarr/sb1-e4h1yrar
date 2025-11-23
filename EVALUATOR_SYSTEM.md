# Evaluator System - Category-Based Auto-Assignment

## Overview
The system automatically assigns evaluators to IP submissions based on their category. Each IP category has a dedicated evaluator account.

## Evaluator Accounts

| Category | Email | Full Name | Specialization |
|----------|-------|-----------|----------------|
| Patent | patent-evaluator@ucc-ipo.com | Patent Evaluator | patent |
| Copyright | copyright-evaluator@ucc-ipo.com | Copyright Evaluator | copyright |
| Trademark | trademark-evaluator@ucc-ipo.com | Trademark Evaluator | trademark |
| Industrial Design | design-evaluator@ucc-ipo.com | Industrial Design Evaluator | design |
| Utility Model | utility-evaluator@ucc-ipo.com | Utility Model Evaluator | utility_model |
| Other | other-evaluator@ucc-ipo.com | General Evaluator | other |

## Default Passwords
All evaluator accounts are created with default passwords following the pattern: `<Category>Eval2024!`

Examples:
- Patent: `PatentEval2024!`
- Copyright: `CopyrightEval2024!`
- Trademark: `TrademarkEval2024!`
- etc.

## How It Works

### Submission Flow:
1. **Applicant** submits an IP with a specific category
2. System automatically finds evaluator with matching `category_specialization`
3. **Supervisor** (if assigned) reviews and approves the submission
4. Once supervisor approves, **Evaluator** (already assigned) receives notification
5. **Evaluator** evaluates the submission based on their expertise
6. Final approval moves to admin for legal preparation

### Database Structure:
- `users.category_specialization` - Stores which IP category an evaluator specializes in
- System matches `ip_records.category` with `users.category_specialization` where `role = 'evaluator'`

## Creating Additional Evaluators

To create new category-specific evaluators:

1. Use the Admin "User Management" page
2. Or call the `create-user` edge function:
```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/create-user`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'new-evaluator@ucc-ipo.com',
      fullName: 'New Evaluator Name',
      password: 'SecurePassword123!',
      role: 'evaluator',
      categorySpecialization: 'patent'  // or copyright, trademark, design, utility_model, other
    }),
  }
);
```

## Initialize All Evaluators

Run the initialization function to create/update all category evaluators:
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/initialize-evaluators" \
  -H "Content-Type: application/json"
```

This will:
- Create missing evaluator accounts
- Update existing evaluators with correct specializations
- Return status for each evaluator account

## Benefits

1. **Specialized Review**: Each submission is reviewed by an expert in that IP category
2. **Automatic Assignment**: No manual assignment needed - system handles it automatically
3. **Consistent Workflow**: Same process for all submission types
4. **Scalable**: Easy to add new categories or evaluators
5. **Clear Accountability**: Each category has a dedicated reviewer

## Supervisor vs Evaluator

- **Supervisor**: Reviews initial submission, provides feedback, approves/rejects
- **Evaluator**: Performs detailed technical evaluation after supervisor approval
- **Admin**: Handles final legal preparation and filing

Both can be assigned automatically or manually by the applicant during submission.
