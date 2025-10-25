# Edit Mode Payables Auto-Calculation Fix

## Problem
In edit mode, when changing payment status for expenses, the payables (Section E) were not updating automatically. They remained static even when marking expenses as paid or unpaid.

## Root Cause
Earlier, we disabled auto-calculation in edit mode to prevent overwriting saved data from the backend. The logic was:

```typescript
if (effectiveMode === 'edit' || effectiveMode === 'view') {
  console.log('⚠️ Skipping auto-update - in edit/view mode, using backend values');
  return;
}
```

This prevented ANY auto-calculation in edit mode, including when the user actively changes payment status.

## Solution
Now that we have quarter-specific payment tracking, we can safely re-enable auto-calculation in edit mode. We only skip it in **view mode** (read-only):

```typescript
if (effectiveMode === 'view') {
  console.log('⚠️ Skipping auto-update - in view mode (read-only)');
  return;
}
```

## Changes Made

### 1. Enhanced Execution Form
**File:** `apps/client/features/execution/components/v2/enhanced-execution-form.tsx`

**Before:**
```typescript
useEffect(() => {
  // Skip auto-update in edit/view mode
  if (effectiveMode === 'edit' || effectiveMode === 'view') {
    return;
  }
  // ... auto-calculation logic
}, [cashAtBank, payables, ...]);
```

**After:**
```typescript
useEffect(() => {
  // Skip auto-update in view mode only (read-only)
  if (effectiveMode === 'view') {
    return;
  }
  // ... auto-calculation logic
}, [cashAtBank, payables, ...]);
```

### 2. Enhanced Execution Form Auto Load
**File:** `apps/client/features/execution/components/v2/enhanced-execution-form-auto-load.tsx`

Same change - only skip in view mode, not edit mode.

### 3. Updated ExpenseFormData Interface
**File:** `apps/client/features/execution/hooks/use-expense-calculations.ts`

Updated to support quarter-specific payment status:
```typescript
export interface ExpenseFormData {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  comment?: string;
  // Payment status can be either a single value (old format) or quarter-specific (new format)
  paymentStatus?: PaymentStatus | Record<string, PaymentStatus>;
  amountPaid?: number | Record<string, number>;
}
```

## How It Works Now

### Create Mode
1. User enters expenses
2. User sets payment status
3. Auto-calculation updates Cash at Bank and Payables
4. ✅ Works as before

### Edit Mode
1. User opens existing execution
2. Data loads from backend with saved payment status
3. User changes payment status for an expense
4. ✅ Auto-calculation updates Cash at Bank and Payables immediately
5. User saves changes

### View Mode (Read-Only)
1. User opens execution in view mode
2. Data loads from backend
3. ❌ Auto-calculation is skipped (read-only, no changes allowed)
4. Values remain as saved

## Why This Works Now

Previously, we couldn't enable auto-calculation in edit mode because:
- Payment status was stored per expense (not per quarter)
- Loading Q1 data would trigger calculations that affected Q2
- Auto-calculation would overwrite saved values incorrectly

Now with quarter-specific payment tracking:
- Each quarter has independent payment status
- Auto-calculation only affects the current quarter
- Saved values for other quarters are preserved
- Safe to enable in edit mode!

## Benefits
1. ✅ Payables update immediately when changing payment status in edit mode
2. ✅ Cash at Bank updates immediately
3. ✅ No need to save and reload to see updated calculations
4. ✅ Better user experience - instant feedback
5. ✅ View mode remains read-only (no calculations)

## Testing Checklist
- [ ] Create execution with expenses
- [ ] Mark some as paid, save
- [ ] Open in edit mode
- [ ] Change payment status from paid to unpaid
- [ ] Verify payables update immediately
- [ ] Verify Cash at Bank updates immediately
- [ ] Change payment status from unpaid to paid
- [ ] Verify payables update immediately
- [ ] Save and reload - verify changes persisted
- [ ] Open in view mode - verify no auto-calculation

## Related Files
- `apps/client/features/execution/components/v2/enhanced-execution-form.tsx`
- `apps/client/features/execution/components/v2/enhanced-execution-form-auto-load.tsx`
- `apps/client/features/execution/hooks/use-expense-calculations.ts`
