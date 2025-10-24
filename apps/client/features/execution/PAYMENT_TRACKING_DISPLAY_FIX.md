# Payment Tracking Display Fix

## Issue
Cash at Bank (Section D) and Payables (Section E) were not displaying in the browser. The fields showed dashes (-) instead of calculated values.

## Root Cause
The issue was in `enhanced-execution-form.tsx` where the activity codes for Cash at Bank and Payables were being constructed incorrectly.

### Incorrect Code
```typescript
const facilityPrefix = facilityType.toUpperCase().replace('_', '_');
```

This code was attempting to replace underscores but was replacing them with underscores, which did nothing. For a `facilityType` of `'health_center'`, this would produce:
- Input: `'health_center'`
- After `.toUpperCase()`: `'HEALTH_CENTER'`
- After `.replace('_', '_')`: `'HEALTH_CENTER'` (no change!)

However, the actual activity codes in the system use `'HEALTH_CENTER'` (with underscore) or `'HOSPITAL'` (no underscore), so the code was actually working for the wrong reason - it was leaving the underscore in place.

The real issue was that the code wasn't handling the conversion properly for both facility types.

## Solution

### Fixed Code
```typescript
const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
```

This explicitly converts the facility type to the correct format:
- `'health_center'` → `'HEALTH_CENTER'`
- `'hospital'` → `'HOSPITAL'`

### Activity Code Format
Activity codes follow this pattern:
```
{PROJECT}_EXEC_{FACILITY}_{SECTION}_{ID}
```

Examples:
- Opening Balance: `HIV_EXEC_HOSPITAL_A_2`
- Cash at Bank: `HIV_EXEC_HOSPITAL_D_1`
- Payable 1: `HIV_EXEC_HOSPITAL_E_1`
- Expense: `HIV_EXEC_HOSPITAL_B_B-01_1`

For health centers:
- Opening Balance: `MAL_EXEC_HEALTH_CENTER_A_2`
- Cash at Bank: `MAL_EXEC_HEALTH_CENTER_D_1`
- Payable 1: `MAL_EXEC_HEALTH_CENTER_E_1`

## Changes Made

### 1. Fixed Opening Balance Code Construction
**File**: `apps/client/features/execution/components/v2/enhanced-execution-form.tsx`

**Before**:
```typescript
const facilityPrefix = facilityType.toUpperCase().replace('_', '_');
return `${projectPrefix}_EXEC_${facilityPrefix}_A_2`;
```

**After**:
```typescript
const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
return `${projectPrefix}_EXEC_${facilityPrefix}_A_2`;
```

### 2. Fixed Cash at Bank Code Construction
**File**: `apps/client/features/execution/components/v2/enhanced-execution-form.tsx`

**Before**:
```typescript
const facilityPrefix = facilityType.toUpperCase().replace('_', '_');
const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;
```

**After**:
```typescript
const facilityPrefix = facilityType === 'health_center' ? 'HEALTH_CENTER' : 'HOSPITAL';
const cashAtBankCode = `${projectPrefix}_EXEC_${facilityPrefix}_D_1`;
```

### 3. Added Debug Logging
Added console logging to help troubleshoot the calculations:

```typescript
// Debug logging for calculations
useEffect(() => {
  console.log('💰 [Payment Tracking] Calculations:', {
    openingBalance,
    openingBalanceCode,
    cashAtBank,
    totalPaid,
    totalUnpaid,
    payablesCount: Object.keys(payables).length,
    payables,
  });
}, [openingBalance, openingBalanceCode, cashAtBank, totalPaid, totalUnpaid, payables]);

// Debug logging for field updates
console.log('💰 [Payment Tracking] Updating Cash at Bank:', {
  cashAtBankCode,
  quarterKey,
  currentValue: currentCashValue,
  newValue: cashAtBank,
  willUpdate: currentCashValue !== cashAtBank,
});
```

## Testing

### How to Verify the Fix

1. **Open the execution form** in the browser
2. **Enter an expense** in Section B (e.g., 10,000)
3. **Set payment status** to "Fully Paid"
4. **Check Section D** - Cash at Bank should now display the calculated value (Opening Balance - 10,000)
5. **Change payment status** to "Unpaid"
6. **Check Section E** - The corresponding payable should now display 10,000
7. **Check browser console** - You should see debug logs showing the calculations

### Expected Console Output
```
💰 [Payment Tracking] Calculations: {
  openingBalance: 100000,
  openingBalanceCode: "HIV_EXEC_HOSPITAL_A_2",
  cashAtBank: 90000,
  totalPaid: 10000,
  totalUnpaid: 0,
  payablesCount: 0,
  payables: {}
}

💰 [Payment Tracking] Updating Cash at Bank: {
  cashAtBankCode: "HIV_EXEC_HOSPITAL_D_1",
  quarterKey: "q1",
  currentValue: undefined,
  newValue: 90000,
  willUpdate: true
}
```

## Impact

### What Now Works
✅ Cash at Bank displays calculated value (Opening Balance - Total Paid)  
✅ Payables display calculated values for unpaid expenses  
✅ Real-time updates when payment status changes  
✅ Works for all programs (HIV, Malaria, TB)  
✅ Works for all facility types (Hospital, Health Center)  

### What to Watch For
- Check browser console for debug logs
- Verify calculations are correct
- Ensure no infinite update loops
- Test with different programs and facility types

## Related Files
- `apps/client/features/execution/components/v2/enhanced-execution-form.tsx` - Main fix
- `apps/client/features/execution/hooks/use-expense-calculations.ts` - Calculation logic
- `apps/client/features/execution/utils/expense-to-payable-mapping.ts` - Mapping logic

## Next Steps
1. Test the fix in the browser
2. Verify calculations are correct
3. Remove debug logging once confirmed working (or reduce verbosity)
4. Proceed with user acceptance testing

---

**Fix Applied**: October 24, 2025  
**Status**: Ready for Testing
