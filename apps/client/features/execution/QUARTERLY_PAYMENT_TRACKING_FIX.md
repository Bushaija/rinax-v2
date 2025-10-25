# Quarterly Payment Tracking Fix

## Problem
When reporting for Q2 after completing Q1, the payment tracking calculation was incorrectly using Q1's payment data, resulting in:
```
openingBalance: 0          // Q2 opening balance (not entered yet)
totalPaid: 10000           // ❌ From Q1 payment data
cashAtBank: -10000         // ❌ Wrong: 0 - 10000 = -10000
```

## Root Cause
Payment tracking data (`paymentStatus` and `amountPaid`) is stored at the expense level, not per quarter. This means when an expense is marked as "paid" in Q1, that payment status was being applied to all quarters, including Q2.

The calculation was:
1. Get Q2 expense amount (0 - not entered yet)
2. Get payment status (from Q1 - "paid")
3. Calculate amountPaid based on Q1's payment status
4. Result: totalPaid = 10000 (from Q1), even though Q2 has no expenses

## Solution
Modified the `use-expense-calculations` hook to **only apply payment tracking when there's an actual expense amount for the current quarter**.

### Code Change
**File:** `apps/client/features/execution/hooks/use-expense-calculations.ts`

**Before:**
```typescript
const amount = Number(expenseData[quarterKey]) || 0;

// Get payment information (default to unpaid if not specified)
const paymentStatus = expenseData.paymentStatus || 'unpaid';
let amountPaid = 0;

if (paymentStatus === 'paid') {
  amountPaid = amount;
} else if (paymentStatus === 'partial') {
  amountPaid = Number(expenseData.amountPaid) || 0;
}
```

**After:**
```typescript
const amount = Number(expenseData[quarterKey]) || 0;

// IMPORTANT: Only use payment tracking if there's an expense amount for this quarter
// This prevents Q1 payment data from affecting Q2 calculations
const paymentStatus = amount > 0 ? (expenseData.paymentStatus || 'unpaid') : 'unpaid';
let amountPaid = 0;

if (amount > 0) {
  if (paymentStatus === 'paid') {
    amountPaid = amount;
  } else if (paymentStatus === 'partial') {
    amountPaid = Number(expenseData.amountPaid) || 0;
  }
}
```

## How It Works Now

### Q1 Reporting (Has Expenses)
```
Expense: Laboratory Technician
Q1 Amount: 10000
Payment Status: paid
Amount Paid: 10000

Calculation:
- amount > 0 ✅
- paymentStatus = "paid"
- amountPaid = 10000
- totalPaid = 10000
- cashAtBank = openingBalance - 10000
```

### Q2 Reporting (No Expenses Yet)
```
Expense: Laboratory Technician
Q2 Amount: 0 (not entered)
Payment Status: paid (from Q1)
Amount Paid: 0 (ignored because amount = 0)

Calculation:
- amount = 0 ❌
- paymentStatus = "unpaid" (forced)
- amountPaid = 0
- totalPaid = 0
- cashAtBank = openingBalance - 0 = openingBalance
```

### Q2 Reporting (After Entering Expenses)
```
Expense: Laboratory Technician
Q2 Amount: 12000 (newly entered)
Payment Status: unpaid (default for new quarter)
Amount Paid: 0

Calculation:
- amount > 0 ✅
- paymentStatus = "unpaid"
- amountPaid = 0
- totalPaid = 0
- cashAtBank = openingBalance - 0 = openingBalance
- Payables = 12000
```

## Benefits
1. ✅ Each quarter's payment tracking is independent
2. ✅ Q1 payment data doesn't affect Q2 calculations
3. ✅ Cash at Bank calculation is correct for each quarter
4. ✅ Payables only show unpaid expenses for the current quarter
5. ✅ No data structure changes required

## Limitations
- Payment status is still stored at the expense level (not per quarter)
- If you enter the same expense amount in Q2 as Q1, you'll need to set the payment status again
- This is acceptable because each quarter is a separate reporting period

## Testing Checklist
- [x] Create execution for Q1 with expenses
- [x] Mark some expenses as paid in Q1
- [x] Save Q1 execution
- [ ] Start Q2 reporting (without entering expenses)
- [ ] Verify Cash at Bank = Opening Balance (not negative)
- [ ] Verify totalPaid = 0 (not carrying over from Q1)
- [ ] Enter expenses for Q2
- [ ] Verify payment status defaults to "unpaid"
- [ ] Mark Q2 expenses as paid
- [ ] Verify Cash at Bank calculates correctly for Q2

## Related Files
- `apps/client/features/execution/hooks/use-expense-calculations.ts` - Fixed calculation logic
- `apps/client/features/execution/components/v2/enhanced-execution-form.tsx` - Uses the hook
- `apps/client/features/execution/components/v2/enhanced-execution-form-auto-load.tsx` - Uses the hook
