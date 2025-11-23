# IP Submission Workflow Summary

## Current System Status

### Active Users:
- **Supervisors**: 1 (Cath Llena - BSIS@ucc-ipo.com)
- **Evaluators**: 1 (ryan mateo - CR-EVAL@ucc-ipo.com) specialized in Copyright
- **Admins**: Available through admin accounts
- **Applicants**: Can register via the registration page

## Submission Workflow

### Step 1: Submission Creation (Applicant)
The applicant fills out a comprehensive 6-step form:

1. **Basic Information**
   - Title, Category, Abstract, Keywords

2. **Technical Details**
   - Description, Technical Field, Background/Prior Art
   - Problem Statement, Solution, Advantages
   - Implementation Details

3. **Inventors & Contributors**
   - Multiple inventors with affiliations and contributions
   - Dates (conceived, reduced to practice)
   - Funding sources, collaborators, related publications

4. **Commercial Potential**
   - Commercial potential description
   - Target market, competitive advantage
   - Estimated value, prior art references

5. **Required Documents**
   - Disclosure forms
   - Technical drawings/diagrams
   - Supporting documentation
   - At least 1 document required

6. **Review & Submit**
   - **Supervisor Selection** (Optional): Dropdown shows ALL existing supervisors
   - If no supervisor selected, admin will assign one later
   - Summary of submission

### Step 2: Automatic Evaluator Assignment (System)
When submitted:
- System automatically finds evaluator with matching `category_specialization`
- Example: Copyright submission → assigns evaluator with `category_specialization = 'copyright'`
- Creates `evaluator_assignments` record with status 'pending'
- Sends notification to assigned evaluator

### Step 3: Supervisor Review (If Assigned)
If supervisor was selected:
- Supervisor receives notification
- Reviews submission details and documents
- Can request revisions or approve
- Status changes to 'waiting_supervisor' → 'supervisor_approved'

### Step 4: Evaluator Review (Automatic)
Once supervisor approves (or if no supervisor):
- Pre-assigned evaluator receives notification
- Evaluator performs detailed technical evaluation
- Can request revisions or approve
- Status changes to 'waiting_evaluation' → 'evaluator_approved'

### Step 5: Admin Processing
- Admin reviews approved submissions
- Prepares legal documents
- Finalizes for filing
- Status: 'preparing_legal' → 'ready_for_filing'

## Category-Evaluator Mapping

| IP Category | Evaluator Email | Current Status |
|-------------|----------------|----------------|
| Copyright | CR-EVAL@ucc-ipo.com | ✅ Active (ryan mateo) |
| Patent | patent-evaluator@ucc-ipo.com | ⏳ To be created |
| Trademark | trademark-evaluator@ucc-ipo.com | ⏳ To be created |
| Industrial Design | design-evaluator@ucc-ipo.com | ⏳ To be created |
| Utility Model | utility-evaluator@ucc-ipo.com | ⏳ To be created |
| Other | other-evaluator@ucc-ipo.com | ⏳ To be created |

## Creating Additional Evaluators

### Option 1: Using Edge Function (Automated)
```bash
curl -X POST "${SUPABASE_URL}/functions/v1/initialize-evaluators" \
  -H "Content-Type: application/json"
```

This creates all category-specific evaluators with default credentials.

### Option 2: Via Admin Panel (Manual)
1. Login as admin
2. Go to "User Management"
3. Click "Create User"
4. Fill in:
   - Email: `<category>-evaluator@ucc-ipo.com`
   - Full Name: `<Category> Evaluator`
   - Role: Evaluator
   - Category Specialization: Select appropriate category
5. System generates credentials

### Option 3: Via Edge Function API (Programmatic)
```javascript
const response = await fetch(
  `${SUPABASE_URL}/functions/v1/create-user`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'patent-evaluator@ucc-ipo.com',
      fullName: 'Patent Evaluator',
      password: 'PatentEval2024!',
      role: 'evaluator',
      categorySpecialization: 'patent'
    }),
  }
);
```

## Benefits of This System

1. **Automatic Assignment**: No manual evaluator selection needed
2. **Specialized Expertise**: Each category reviewed by specialist
3. **Scalable**: Easy to add new categories or evaluators
4. **Clear Workflow**: Submission → Supervisor → Evaluator → Admin
5. **Comprehensive Data**: All necessary IP information collected upfront
6. **Document Management**: Integrated file upload and storage
7. **Notifications**: All stakeholders notified automatically
8. **Audit Trail**: Complete activity logging

## Next Steps

To complete the system:
1. Create remaining category-specific evaluator accounts
2. Add more supervisors if needed
3. Test full workflow with different IP categories
4. Configure email notifications (optional)
5. Review and adjust RLS policies as needed

## Testing the Workflow

1. **As Applicant**: Register and create a copyright submission
2. **Select Supervisor**: Choose "Cath Llena" from dropdown (or leave blank)
3. **System Assigns**: Copyright evaluator (ryan mateo) automatically assigned
4. **Supervisor Reviews**: Cath Llena logs in and reviews
5. **Evaluator Reviews**: ryan mateo logs in and evaluates
6. **Admin Finalizes**: Admin processes for legal filing

The system is fully functional for copyright submissions and can be extended to other categories by creating additional evaluator accounts.
