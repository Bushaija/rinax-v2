# Payment Tracking Backend Fix

## Problem Identified
The debug logs revealed that the backend was **NOT returning** `paymentStatus` and `amountPaid` fields when retrieving execution data for editing. The raw backend response only included:
```json
{
  "code": "HIV_EXEC_HOSPITAL_B_B-01_1",
  "label": "Laboratory Technician",
  "q1": 12000,
  "q2": 0,
  "q3": 0,
  "q4": 0,
  "total": 12000,
  "cumulative_balance": 12000
  // ❌ paymentStatus: MISSING
  // ❌ amountPaid: MISSING
}
```

## Root Cause
The backend code in `execution.handlers.ts` had two issues:

### Issue 1: valueByCode Map Not Storing Payment Tracking Fields
The `valueByCode` map was only storing quarterly values:
```typescript
const valueByCode = new Map<string, { q1: number; q2: number; q3: number; q4: number }>();
```

### Issue 2: pushItem Function Not Including Payment Tracking Fields
The `pushItem` helper function was only adding quarterly values to the UI response items, not the payment tracking fields.

## Solution Applied

### Fix 1: Updated valueByCode Map Type and Population
**File:** `apps/server/src/api/routes/execution/execution.handlers.ts`

**Lines:** ~367 and ~1887

**Before:**
```typescript
const valueByCode = new Map<string, { q1: number; q2: number; q3: number; q4: number }>();
for (const a of activitiesArray) {
  const code = a?.code as string;
  if (!code) continue;
  valueByCode.set(code, {
    q1: Number(a.q1 || 0), 
    q2: Number(a.q2 || 0), 
    q3: Number(a.q3 || 0), 
    q4: Number(a.q4 || 0)
  });
}
```

**After:**
```typescript
const valueByCode = new Map<string, { 
  q1: number; 
  q2: number; 
  q3: number; 
  q4: number; 
  paymentStatus?: string; 
  amountPaid?: number 
}>();
for (const a of activitiesArray) {
  const code = a?.code as string;
  if (!code) continue;
  valueByCode.set(code, {
    q1: Number(a.q1 || 0), 
    q2: Number(a.q2 || 0), 
    q3: Number(a.q3 || 0), 
    q4: Number(a.q4 || 0),
    // Include payment tracking fields
    paymentStatus: a.paymentStatus || undefined,
    amountPaid: a.amountPaid !== undefined ? Number(a.amountPaid) : undefined,
  });
}
```

### Fix 2: Updated pushItem Function to Include Payment Tracking Fields
**File:** `apps/server/src/api/routes/execution/execution.handlers.ts`

**Lines:** ~458 and ~1983

**Before:**
```typescript
const pushItem = (rec: any, targetArr: any[]) => {
  const code = rec.code as string;
  const label = codeToName.get(code) || code;
  const v = valueByCode.get(code) || { q1: undefined, q2: undefined, q3: undefined, q4: undefined };

  // ... cumulative balance calculation ...

  const item = {
    code,
    label,
    q1: v.q1,
    q2: v.q2,
    q3: v.q3,
    q4: v.q4,
    total: (v.q1 || 0) + (v.q2 || 0) + (v.q3 || 0) + (v.q4 || 0),
    cumulative_balance: cumulativeBalance
  };
  targetArr.push(item);
  return item.total;
};
```

**After:**
```typescript
const pushItem = (rec: any, targetArr: any[]) => {
  const code = rec.code as string;
  const label = codeToName.get(code) || code;
  const v = valueByCode.get(code) || { 
    q1: undefined, 
    q2: undefined, 
    q3: undefined, 
    q4: undefined, 
    paymentStatus: undefined, 
    amountPaid: undefined 
  };

  // ... cumulative balance calculation ...

  const item: any = {
    code,
    label,
    q1: v.q1,
    q2: v.q2,
    q3: v.q3,
    q4: v.q4,
    total: (v.q1 || 0) + (v.q2 || 0) + (v.q3 || 0) + (v.q4 || 0),
    cumulative_balance: cumulativeBalance
  };
  
  // Include payment tracking fields if they exist (for Section B expenses)
  if (v.paymentStatus !== undefined) {
    item.paymentStatus = v.paymentStatus;
  }
  if (v.amountPaid !== undefined) {
    item.amountPaid = v.amountPaid;
  }
  
  targetArr.push(item);
  return item.total;
};
```

## Data Flow (Now Fixed)

### Create/Update Flow
1. ✅ User sets payment status in UI (paid/unpaid/partial)
2. ✅ `buildSubmissionActivities()` includes `paymentStatus` and `amountPaid` in payload
3. ✅ Backend receives and stores payment tracking fields in database
4. ✅ Backend returns payment tracking fields in UI response

### Edit/View Flow
1. ✅ Backend retrieves execution data from database
2. ✅ Backend extracts `paymentStatus` and `amountPaid` from stored activities
3. ✅ Backend includes payment tracking fields in `valueByCode` map
4. ✅ Backend adds payment tracking fields to UI response items
5. ✅ Frontend receives and displays correct payment status switches

## Expected Backend Response (After Fix)
```json
{
  "code": "HIV_EXEC_HOSPITAL_B_B-01_1",
  "label": "Laboratory Technician",
  "q1": 12000,
  "q2": 0,
  "q3": 0,
  "q4": 0,
  "total": 12000,
  "cumulative_balance": 12000,
  "paymentStatus": "paid",      // ✅ NOW INCLUDED
  "amountPaid": 12000            // ✅ NOW INCLUDED
}
```

## Testing Checklist
- [ ] Create new execution with mixed payment statuses
- [ ] Save execution
- [ ] Verify data is saved to database with payment tracking fields
- [ ] Open execution in edit mode
- [ ] Check browser console for backend response
- [ ] Verify backend response includes `paymentStatus` and `amountPaid`
- [ ] Verify payment status switches show correct state
- [ ] Make changes and save
- [ ] Verify changes persist correctly

## Related Files
- `apps/server/src/api/routes/execution/execution.handlers.ts` - Backend handlers (FIXED)
- `apps/client/features/execution/components/v2/enhanced-execution-form.tsx` - Frontend submission
- `apps/client/app/dashboard/execution/edit/[id]/page.tsx` - Edit page data loading
- `apps/client/features/execution/components/payment-status-control.tsx` - Payment status UI

## Notes
- Payment tracking fields are only included if they have values (not undefined)
- This keeps the response clean for activities that don't have payment tracking data
- Section B expenses will have these fields, other sections won't
