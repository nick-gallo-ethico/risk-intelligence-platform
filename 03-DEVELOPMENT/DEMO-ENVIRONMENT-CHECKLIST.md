# Demo Environment Verification Checklist

This checklist validates that the Acme Co. demo environment is sufficiently populated and "lived-in" for sales demonstrations and testing.

## Quick Verification

Run the automated verification script:

```bash
cd apps/backend
npm run demo:verify
```

## Manual Verification Checklist

### 1. Login & Role Verification

**Password for all accounts:** `Password123!`

| Account                        | Role               | Test                                |
| ------------------------------ | ------------------ | ----------------------------------- |
| `demo-admin@acme.local`        | SYSTEM_ADMIN       | [ ] Can access all settings         |
| `demo-cco@acme.local`          | COMPLIANCE_OFFICER | [ ] Sees all cases, full dashboard  |
| `demo-triage@acme.local`       | TRIAGE_LEAD        | [ ] Can assign cases, see queue     |
| `demo-investigator@acme.local` | INVESTIGATOR       | [ ] Sees assigned cases only        |
| `demo-policy@acme.local`       | POLICY_AUTHOR      | [ ] Can create/edit policies        |
| `demo-reviewer@acme.local`     | POLICY_REVIEWER    | [ ] Can approve policies            |
| `demo-manager@acme.local`      | MANAGER            | [ ] Sees team approvals needed      |
| `demo-employee@acme.local`     | EMPLOYEE           | [ ] Sees personal tasks/disclosures |

### 2. Ethics Portal (/ethics/acme-corp)

- [ ] Shows branded logo and colors
- [ ] Language switcher available (EN, ES, FR, DE, PT, ZH)
- [ ] "Submit Report" form works
  - [ ] Category selection available
  - [ ] Details textarea works
  - [ ] File attachments work
  - [ ] Submit creates RIU and returns access code
- [ ] "Check Status" works with access code
- [ ] Anonymous communication (send/receive messages)

### 3. Employee Portal (/employee)

- [ ] Dashboard shows stats cards (Pending, Overdue, Due This Week)
- [ ] **My Reports** tab shows submitted RIUs with status
- [ ] **My Disclosures** tab shows campaign assignments
  - [ ] Active disclosure forms can be completed
  - [ ] Auto-save works (drafts saved)
- [ ] **My Attestations** tab shows policy attestations needed
- [ ] **NEW: Pending tasks visible** for demo-employee (~8 items)
  - [ ] COI disclosures due this week
  - [ ] Policy attestations pending
  - [ ] Overdue disclosure with reminder count
- [ ] **Manager tab** (manager role only)
  - [ ] Team compliance overview visible
  - [ ] "Remind All" action works
  - [ ] Proxy report form works
  - [ ] **NEW: Pending approvals** for demo-manager (~8 items)
    - [ ] Proxy reports needing verification
    - [ ] Disclosure reviews requiring sign-off
    - [ ] Attestation exceptions

### 4. Case Management (/cases)

- [ ] Case list shows ~4,500 cases
- [ ] Filter by status works
- [ ] Filter by category works
- [ ] Search works (name, reference number)
- [ ] Case detail page shows:
  - [ ] Timeline of events (NEW: ~15,000 activity entries)
  - [ ] Linked RIUs
  - [ ] Investigation details
  - [ ] AI Summary panel
  - [ ] AI Chat history (NEW: prior conversations visible)
- [ ] Flagship cases visible:
  - [ ] "Chicago Warehouse Incident"
  - [ ] "Q3 Financial Irregularities"

### 5. Investigations

- [ ] Open investigations show realistic timelines
- [ ] Investigation templates available (8 types)
- [ ] Interview scheduling works
- [ ] Remediation plans can be created
- [ ] 60% substantiation rate visible in closed investigations

### 6. Campaigns (/campaigns)

- [ ] Campaign list shows 3 years of COI campaigns (2023-2025)
- [ ] Campaign detail shows:
  - [ ] Targeting criteria
  - [ ] Assignment progress (~85% completion)
  - [ ] Reminder schedule
- [ ] Create new campaign wizard works
- [ ] Segment builder (departments, locations)

### 7. Disclosures

- [ ] Form templates visible (COI, Gift, Outside Employment)
- [ ] Form builder accessible
- [ ] Conflict queue shows pending conflicts (~8)
- [ ] Dismissed conflicts with exclusions (~4)
- [ ] Threshold rules configured

### 8. Policies (/policies)

- [ ] 50 policies visible
- [ ] Various policy types (Code of Conduct, Anti-Harassment, etc.)
- [ ] Published policies have version history
- [ ] Translations available (ES, FR, DE, PT, ZH)
- [ ] Approval workflow functional
- [ ] Attestation campaigns linked
- [ ] **NEW: Draft policies in workflow** (~5 policies in approval process)
  - [ ] "Updated Code of Conduct v2.1" at review stage
  - [ ] "New Remote Work Policy" at legal review
  - [ ] "Anti-Harassment Policy Update" at final approval

### 9. Analytics (/analytics)

- [ ] Dashboard shows 3-year trends
- [ ] Case metrics populated
- [ ] Investigation outcomes visible
- [ ] Campaign completion rates
- [ ] Export to Excel/CSV works

### 10. Operator Console (/operator)

- [ ] Phone lookup works
- [ ] Client profile loads
- [ ] Directives display by stage
- [ ] Intake form creates RIU
- [ ] AI note cleanup works
- [ ] QA queue shows pending items

---

## Data Volume Expectations

| Entity                 | Expected Count | Tolerance |
| ---------------------- | -------------- | --------- |
| Employees              | 20,000         | ±5,000    |
| Locations              | 52             | ±2        |
| Categories             | 32             | ±5        |
| RIUs                   | 5,000          | ±1,000    |
| Cases                  | 4,500          | ±500      |
| Investigations         | 5,000          | ±500      |
| Policies               | 50             | ±5        |
| Translations           | 100+           | -         |
| Campaigns              | 20             | ±5        |
| Conflict Alerts        | 12             | ±3        |
| **Activity Entries**   | **~15,000**    | ±2,000    |
| **Workflow Instances** | **~20**        | ±5        |
| **AI Conversations**   | **~50**        | ±10       |
| **In-Progress Items**  | **~30**        | ±5        |

## Historical Data Distribution

The demo should have data spanning 3+ years:

| Year | Expected Cases |
| ---- | -------------- |
| 2023 | ~1,200         |
| 2024 | ~1,300         |
| 2025 | ~1,400         |
| 2026 | ~600 (YTD)     |

## Pattern Verification

- [ ] **Repeat Subjects:** ~50 employees appearing in 2-5 cases each
- [ ] **Manager Hotspots:** ~15 managers with elevated team case rates
- [ ] **Retaliation Chains:** Follow-up cases from closed investigations
- [ ] **CCO Escalations:** 5% of cases escalated

## Demo Scenarios to Test

### Scenario 1: Anonymous Report Flow

1. Submit anonymous report via Ethics Portal
2. Receive access code
3. Check status with code
4. Send follow-up message
5. See report in Operator Console QA queue

### Scenario 2: COI Disclosure Campaign

1. Login as demo-employee
2. Complete COI disclosure form
3. Login as demo-cco
4. See disclosure in conflict queue
5. Review and dismiss/escalate

### Scenario 3: Investigation Lifecycle

1. Find open case with investigation
2. Review investigation template checklist
3. Add interview notes
4. Create remediation plan
5. Close investigation with findings

### Scenario 4: Policy Attestation

1. Create attestation campaign for published policy
2. Login as demo-employee
3. See attestation in tasks
4. Complete attestation
5. View completion in campaign dashboard

---

## Troubleshooting

### Missing Data

```bash
# Re-run seed
cd apps/backend
npm run db:reset   # Warning: deletes all data
npm run db:seed
```

### Missing Policies

```bash
# Run policy seeder only
cd apps/backend
npm run seed:policies
```

### Verification Fails

1. Check database connection
2. Run `npm run demo:verify` for specific failures
3. Check seed logs for errors

---

_Last updated: 2026-02-05_
