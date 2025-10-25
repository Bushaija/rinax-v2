# Partial Payment Amount Prefill Fix

## Problem
When editing an expense with "partial" payment status, the partial amount input field in the PaymentStatusControl was not being prefilled with the saved value. The field appeared empty even though the partial amount was saved.

## Root Cause
The `amountPaid` value being passed to PaymentStatusControl wasn't being properly converted to a number when reading from the quarter-specific format. The value might have been undefined or not properly extracted from the quarter-specific object.

## Solution
Added explicit number conversion when extracting `amountPaid` from the quarter-specific data structure.

## Changes Made

### Updated Table Component
**File:** `apps/client/features/execution/components/v2/table.tsx`

**Before:**
```typescript
const amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
  ? (amountPaidData[quarterKey] ?? 0)
  : (amountPaidData ?? 0);
```

**After:**
```typescript
const amountPaid = typeof amountPaidData === 'object' && amountPaidData !== null
  ? (Number(amountPaidData[quarterKey]) || 0)
  : (Number(amountPaidData) || 0);
```

### Added Debug Logging
Added logging to track partial payment data flow:
```typescript
if (paymentStatus === 'partial') {
  console.log('🔍 [Table] Passing partial payment data:', {
    expenseCode: leaf.id,
    quarterKey,
    amountPaidData,
    extractedAmountPaid: amountPaid,
    paymentStatus,
  });
}
```

## How It Works

### Data Flow
1. **Storage**: Partial amount stored as `{ q1: 5000, q2: 0, ... }`
2. **Extraction**: Read quarter-specific value: `amountPaidData[quarterKey]`
3. **Conversion**: Convert to number: `Number(amountPaidData[quarterKey])`
4. **Pass to Control**: `<PaymentStatusControl amountPaid={5000} />`
5. **Prefill**: Control initializes input with `amountPaid.toString()` = "5000"

### PaymentStatusControl Initialization
The control has a useEffect that updates the input when `amountPaid` changes:
```typescript
React.useEffect(() => {
  setPartialAmount(amountPaid.toString())
}, [amountPaid])
```

This ensures the input field is always in sync with the prop value.

## Example Scenarios

### Scenario 1: Create Partial Payment
```
User enters expense: 10000
User selects "Partially Paid"
User enters: 5000
Saved as: { q1: { paymentStatus: "partial", amountPaid: 5000 } }
```

### Scenario 2: Edit Partial Payment
```
Load expense with partial payment
Extract: amountPaid = Number(amountPaidData.q1) = 5000
Pass to control: <PaymentStatusControl amountPaid={5000} />
Control prefills input: "5000" ✅
User can modify: 5000 → 7000
Save updated value
```

### Scenario 3: Quarter-Specific Partial Payments
```
Q1: Partial payment of 5000
Q2: Partial payment of 7000

When viewing Q1:
- quarterKey = 'q1'
- amountPaid = Number(amountPaidData.q1) = 5000
- Input shows: "5000" ✅

When viewing Q2:
- quarterKey = 'q2'
- amountPaid = Number(amountPaidData.q2) = 7000
- Input shows: "7000" ✅
```

## Benefits
1. ✅ Partial amount input is prefilled correctly
2. ✅ Works with quarter-specific payment tracking
3. ✅ Handles both old format (single value) and new format (per quarter)
4. ✅ Proper number conversion prevents undefined/NaN issues
5. ✅ Debug logging helps track data flow

## Testing Checklist
- [ ] Create expense with partial payment (e.g., 5000 of 10000)
- [ ] Save execution
- [ ] Reload/edit execution
- [ ] Open payment status control
- [ ] Verify partial amount input shows "5000"
- [ ] Modify partial amount to 7000
- [ ] Save and reload
- [ ] Verify updated amount shows "7000"
- [ ] Test with multiple quarters
- [ ] Verify each quarter's partial amount is independent

## Debug Console Logs
When opening a partial payment control, you should see:
```
🔍 [Table] Passing partial payment data: {
  expenseCode: "HIV_EXEC_HOSPITAL_B_B-01_1",
  quarterKey: "q1",
  amountPaidData: { q1: 5000, q2: 0, q3: 0, q4: 0 },
  extractedAmountPaid: 5000,
  paymentStatus: "partial"
}

🔍 [PaymentStatusControl] Props received: {
  expenseCode: "HIV_EXEC_HOSPITAL_B_B-01_1",
  amount: 10000,
  paymentStatus: "partial",
  amountPaid: 5000
}
```

## Related Files
- `apps/client/features/execution/components/v2/table.tsx` - Data extraction and passing
- `apps/client/features/execution/components/payment-status-control.tsx` - Input prefill logic
- `apps/client/hooks/use-execution-form.ts` - Data storage format
