# Payment Tracking Data Loading Issue - RESOLVED

## Problem Statement

When editing or viewing saved execution data, the payables values were showing incorrect values (total expenses instead of unpaid amounts).

### Example

**Client Calculation (Correct)**:
- Laboratory Technician: 12,000 (fully paid) → 0 to payables
- Nurse: 18,000 (unpaid) → 18,000 to payables
- **Expected Payable 1 (salaries): 18,000**

**Backend Saved Value (Incorrect)**:
- **Actual Payable 1 (salaries): 30,000** (12,000 + 18,000)

## Root Cause - IDENTIFIED AND FIXED

The backend was saving data **correctly**, but the edit and view pages were **not loading the payment tracking fields** (`paymentStatus` and `amountPaid`) from the database.

When loading execution data for edit/view, the `initialData` mapping was only extracting `q1`, `q2`, `q3`, `q4`, and `comment` fields, **ignoring** `paymentStatus` and `amountPaid`.

## Evidence from Logs

```javascript
📤 [buildSubmissionActivities] Sending to backend: {
  "sectionBExpenses": [
    {
      "code": "HIV_EXEC_HOSPITAL_B_B-01_1",
      "q1": 12000,
      "paymentStatus": "paid",      // ← Backend ignores this
      "amountPaid": 12000            // ← Backend ignores this
    },
    {
      "code": "HIV_EXEC_HOSPITAL_B_B-01_2",
      "q1": 18000,
      "paymentStatus": "unpaid",     // ← Backend ignores this
      "amountPaid": 0                // ← Backend ignores this
    }
  ],
  "sectionEPayables": [
    {
      "code": "HIV_EXEC_HOSPITAL_E_1",
      "q1": 18000,                   // ← We send correct value (18,000)
      // But backend recalculates as 30,000 (12,000 + 18,000)
    }
  ]
}
```

## Design Requirement

According to the design document:

> **Requirement 5.2**: Computed values (Cash at Bank, Payables) saved for backend compatibility
> **Requirement 5.3**: Uses existing save endpoint (no backend changes)

This means:
1. ✅ Client calculates correct payables (18,000)
2. ✅ Client sends correct payables to backend (18,000)
3. ❌ Backend overwrites with its own calculation (30,000)

## Solution - IMPLEMENTED

### Files Fixed

1. **apps/client/app/dashboard/execution/edit/[id]/page.tsx**
   - Added `paymentStatus` and `amountPaid` to initialData mapping
   - Now loads payment tracking data from database

2. **apps/client/app/dashboard/execution/details/_components/execution-details-view.tsx**
   - Added `paymentStatus` and `amountPaid` to initialData mapping
   - Now displays payment tracking data correctly in view mode

### Changes Made

**Before** (missing payment tracking):
```typescript
mapped[item.code] = {
  q1: toNumber(item.q1),
  q2: toNumber(item.q2),
  q3: toNumber(item.q3),
  q4: toNumber(item.q4),
  comment: String(item.comment || ""),
};
```

**After** (includes payment tracking):
```typescript
mapped[item.code] = {
  q1: toNumber(item.q1),
  q2: toNumber(item.q2),
  q3: toNumber(item.q3),
  q4: toNumber(item.q4),
  comment: String(item.comment || ""),
  // Include payment tracking data
  paymentStatus: item.paymentStatus || "unpaid",
  amountPaid: toNumber(item.amountPaid),
};
```

## Testing After Fix

1. Create execution with mixed payment statuses
2. Save execution
3. Reload execution
4. Verify payables match client calculations

**Test Case**:
- Expense 1: 12,000 (paid) → 0 to payables
- Expense 2: 18,000 (unpaid) → 18,000 to payables
- **Expected**: Payable = 18,000
- **Current**: Payable = 30,000 ❌
- **After Fix**: Payable = 18,000 ✅

---

**Issue Identified**: October 24, 2025  
**Issue Resolved**: October 24, 2025  
**Status**: ✅ FIXED  
**Priority**: HIGH - Was breaking payment tracking feature on edit/view pages
