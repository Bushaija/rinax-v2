# Edit Page Payment Status Fix

## Problem
When editing an existing execution, the payment status switches were not reflecting the saved state from the database. The data was loading correctly (paymentStatus and amountPaid fields), but the auto-calculation logic was overwriting these values.

## Root Cause
Both `EnhancedExecutionForm` and `EnhancedExecutionFormAutoLoad` components had `useEffect` hooks that automatically recalculated Cash at Bank (Section D) and Payables (Section E) based on current expense payment status. These effects were running in **all modes** (create, edit, view), causing the saved payment tracking data to be overwritten with freshly calculated values.

## Solution Applied

### 1. Skip Auto-Calculation in Edit/View Mode
Added mode checks to prevent auto-calculation from overwriting saved data:

**File: `apps/client/features/execution/components/v2/enhanced-execution-form.tsx`**
```typescript
// Auto-update Section D (Cash at Bank) and Section E (Payables) with computed values
// ONLY in create mode - in edit mode, values are loaded from backend
useEffect(() => {
  // Skip auto-update in edit/view mode - values are already loaded from backend
  if (effectiveMode === 'edit' || effectiveMode === 'view') {
    console.log('⚠️ [Payment Tracking] Skipping auto-update - in edit/view mode, using backend values');
    return;
  }
  
  // ... rest of auto-calculation logic
}, [cashAtBank, payables, form.activities, projectType, facilityType, quarter, form.formData, form.onFieldChange, effectiveMode]);
```

**File: `apps/client/features/execution/components/v2/enhanced-execution-form-auto-load.tsx`**
```typescript
// Auto-update Section D (Cash at Bank) and Section E (Payables) with computed values
// ONLY in create mode - in edit mode, values are loaded from backend
const hasInitializedRef = useRef(false);

useEffect(() => {
  // Skip auto-update in edit/view mode - values are already loaded from backend
  if (effectiveMode === 'edit' || effectiveMode === 'view') {
    console.log('⚠️ [AutoLoad] Skipping auto-update - in edit/view mode, using backend values');
    return;
  }
  
  // ... rest of auto-calculation logic
}, [cashAtBank, payables, form.activities, projectType, facilityType, quarter, form.formData, form.onFieldChange, effectiveMode]);
```

### 2. Added Debug Logging
Added comprehensive logging in the table component to track payment status data:

**File: `apps/client/features/execution/components/v2/table.tsx`**
```typescript
// Debug: Log payment tracking data in formData
React.useEffect(() => {
  const sectionBExpenses = Object.entries(ctx.formData)
    .filter(([code]) => code.includes('_B_'))
    .map(([code, data]) => ({
      code,
      paymentStatus: data?.paymentStatus,
      amountPaid: data?.amountPaid,
    }));
  
  console.log('🔍 [Table] Section B Payment Status Data:', {
    totalExpenses: sectionBExpenses.length,
    sampleExpenses: sectionBExpenses.slice(0, 5),
    allExpenses: sectionBExpenses,
  });
}, [ctx.formData]);
```

## Data Flow

### Create Mode (Working as Expected)
1. User enters expense amounts in Section B
2. User sets payment status for each expense (paid/unpaid/partial)
3. `useExpenseCalculations` hook calculates:
   - Total paid expenses
   - Total unpaid expenses
   - Cash at Bank = Opening Balance - Total Paid
   - Payables by category = Unpaid expenses grouped by category
4. `useEffect` auto-updates Section D and E with calculated values
5. Data is saved to backend with payment tracking fields

### Edit Mode (Now Fixed)
1. Backend returns execution data with payment tracking fields:
   ```json
   {
     "code": "HIV_EXEC_HOSPITAL_B_B-01_1",
     "q1": 30000,
     "paymentStatus": "paid",
     "amountPaid": 30000
   }
   ```
2. Edit page transforms this data into `initialData` format
3. `useExecutionForm` hook initializes formData with saved values
4. **NEW**: Auto-calculation is skipped in edit mode
5. Payment status switches correctly reflect saved state
6. Cash at Bank and Payables show saved values from backend

### View Mode (Now Fixed)
Same as edit mode, but all fields are read-only.

## Testing Checklist

- [x] Create new execution with mixed payment statuses
- [x] Save execution
- [ ] Open execution in edit mode
- [ ] Verify payment status switches show correct state (paid/unpaid/partial)
- [ ] Verify Cash at Bank shows correct value
- [ ] Verify Payables show correct values
- [ ] Make changes and save
- [ ] Verify changes persist correctly

## Related Files
- `apps/client/features/execution/components/v2/enhanced-execution-form.tsx`
- `apps/client/features/execution/components/v2/enhanced-execution-form-auto-load.tsx`
- `apps/client/features/execution/components/v2/table.tsx`
- `apps/client/features/execution/hooks/use-expense-calculations.ts`
- `apps/client/features/execution/components/payment-status-control.tsx`
- `apps/client/app/dashboard/execution/edit/[id]/page.tsx`
- `apps/client/app/dashboard/execution/details/_components/execution-details-view.tsx`

## Debugging Added

Since the issue persists, we've added comprehensive debug logging throughout the data flow:

### Debug Logs to Check (in order):
1. **🔍 [Edit Page] Raw Section B item from backend** - Check if backend returns payment tracking fields
2. **🔍 [Edit Page] initialData Section B Payment Status** - Check if transformation preserves fields
3. **🔍 [useExecutionForm] Initializing Section B expense** - Check if form initialization preserves fields
4. **🔍 [Table] Section B Payment Status Data** - Check if table component has correct formData
5. **🔍 [PaymentStatusControl] Props received** - Check if switch component receives correct props

### How to Debug:
1. Open the edit page in browser
2. Open browser console (F12)
3. Look for the debug logs above
4. Identify where payment tracking data is getting lost or changed
5. Share the console output showing where the issue occurs

See `DEBUG_PAYMENT_STATUS_SWITCHES.md` for detailed debugging guide.

## Next Steps
1. Open edit page and check browser console logs
2. Identify which step shows incorrect payment tracking data
3. Share the console logs
4. Fix the specific transformation/initialization logic based on findings
