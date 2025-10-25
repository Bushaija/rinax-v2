# Quarter-Specific Payment Status Fix

## Problem
When reporting for Q2 after completing Q1, the payment status switches were showing Q1's payment status instead of being independent for Q2. This was because payment status was stored at the expense level, not per quarter.

## Solution
Changed the data structure to store payment status **per quarter** instead of per expense. Now each quarter has its own independent payment tracking.

## Changes Made

### 1. Updated Data Structure
**File:** `apps/client/hooks/use-execution-form.ts`

**Before:**
```typescript
interface ActivityQuarterValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  paymentStatus?: PaymentStatus;  // ❌ Single value for all quarters
  amountPaid?: number;             // ❌ Single value for all quarters
}
```

**After:**
```typescript
interface ActivityQuarterValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  paymentStatus?: PaymentStatus | Record<string, PaymentStatus>;  // ✅ Per quarter
  amountPaid?: number | Record<string, number>;                    // ✅ Per quarter
}
```

### 2. Updated updateExpensePayment Function
**File:** `apps/client/hooks/use-execution-form.ts`

Now stores payment status per quarter:
```typescript
const updateExpensePayment = useCallback(
  (activityCode: string, status: PaymentStatus, amountPaid: number) => {
    const quarterKey = quarter.toLowerCase() as 'q1' | 'q2' | 'q3' | 'q4';
    
    // Create quarter-specific payment status object
    const paymentStatusObj = typeof existingPaymentStatus === 'object'
      ? { ...existingPaymentStatus, [quarterKey]: status }
      : { [quarterKey]: status };
    
    const amountPaidObj = typeof existingAmountPaid === 'object'
      ? { ...existingAmountPaid, [quarterKey]: amountPaid }
      : { [quarterKey]: amountPaid };
    
    // Store with quarter-specific data
    ...
  },
  [form, onDataChange, quarter]
);
```

### 3. Updated Table Component to Read Quarter-Specific Data
**File:** `apps/client/features/execution/components/v2/table.tsx`

Now reads payment status for the specific quarter being displayed:
```typescript
{isSectionB && (() => {
  // Get quarter-specific payment status
  const quarterKey = key as 'q1' | 'q2' | 'q3' | 'q4';
  const paymentStatusData = ctx.formData[leaf.id]?.paymentStatus;
  const amountPaidData = ctx.formData[leaf.id]?.amountPaid;
  
  // Support both old format (string) and new format (object with quarters)
  const paymentStatus = typeof paymentStatusData === 'object'
    ? (paymentStatusData[quarterKey] ?? "unpaid")
    : (paymentStatusData ?? "unpaid");
  
  const amountPaid = typeof amountPaidData === 'object'
    ? (amountPaidData[quarterKey] ?? 0)
    : (amountPaidData ?? 0);
  
  return (
    <PaymentStatusControl
      paymentStatus={paymentStatus}
      amountPaid={amountPaid}
      ...
    />
  );
})()}
```

### 4. Updated Expense Calculations Hook
**File:** `apps/client/features/execution/hooks/use-expense-calculations.ts`

Now reads quarter-specific payment status:
```typescript
// Get quarter-specific payment status (support both old and new format)
const paymentStatusData = expenseData.paymentStatus;
const amountPaidData = expenseData.amountPaid;

const paymentStatus = amount > 0
  ? (typeof paymentStatusData === 'object'
      ? (paymentStatusData[quarterKey] || 'unpaid')
      : (paymentStatusData || 'unpaid'))
  : 'unpaid';

let amountPaid = 0;
if (amount > 0 && paymentStatus === 'partial') {
  amountPaid = typeof amountPaidData === 'object'
    ? (Number(amountPaidData[quarterKey]) || 0)
    : (Number(amountPaidData) || 0);
}
```

## Data Format

### Old Format (Backward Compatible)
```json
{
  "HIV_EXEC_HOSPITAL_B_B-01_1": {
    "q1": 10000,
    "q2": 0,
    "q3": 0,
    "q4": 0,
    "paymentStatus": "paid",      // Single value
    "amountPaid": 10000            // Single value
  }
}
```

### New Format (Quarter-Specific)
```json
{
  "HIV_EXEC_HOSPITAL_B_B-01_1": {
    "q1": 10000,
    "q2": 12000,
    "q3": 0,
    "q4": 0,
    "paymentStatus": {
      "q1": "paid",                // Q1 specific
      "q2": "unpaid"               // Q2 specific
    },
    "amountPaid": {
      "q1": 10000,                 // Q1 specific
      "q2": 0                      // Q2 specific
    }
  }
}
```

## How It Works Now

### Q1 Reporting
```
User enters expense: 10000
User marks as paid
Payment status stored: { q1: "paid" }
Amount paid stored: { q1: 10000 }
```

### Q2 Reporting
```
User enters expense: 12000
Payment status defaults to: "unpaid" (independent of Q1)
Payment status stored: { q1: "paid", q2: "unpaid" }
Amount paid stored: { q1: 10000, q2: 0 }
```

### Q2 Editing (After Q1 Complete)
```
Q1 switch shows: "paid" (from q1 key)
Q2 switch shows: "unpaid" (from q2 key or default)
Each quarter is independent!
```

## Benefits
1. ✅ Each quarter has independent payment tracking
2. ✅ Q1 payment status doesn't affect Q2
3. ✅ Backward compatible with old format
4. ✅ Supports editing any quarter without affecting others
5. ✅ Accurate calculations per quarter

## Backward Compatibility
The code supports both old and new formats:
- **Old format**: Single `paymentStatus` string → Treated as applying to all quarters
- **New format**: `paymentStatus` object with quarter keys → Quarter-specific

This ensures existing data continues to work while new data uses the improved format.

## Testing Checklist
- [ ] Create execution for Q1 with expenses
- [ ] Mark expenses as paid in Q1
- [ ] Save Q1 execution
- [ ] Start Q2 reporting
- [ ] Verify Q2 payment switches default to "unpaid"
- [ ] Mark Q2 expenses as paid
- [ ] Save Q2 execution
- [ ] Edit Q1 - verify switches show Q1 status
- [ ] Edit Q2 - verify switches show Q2 status
- [ ] Verify calculations are correct for each quarter

## Related Files
- `apps/client/hooks/use-execution-form.ts` - Data structure and update function
- `apps/client/features/execution/components/v2/table.tsx` - UI rendering
- `apps/client/features/execution/hooks/use-expense-calculations.ts` - Calculations
- `apps/client/features/execution/components/v2/enhanced-execution-form.tsx` - Submission
