# Cash Flow Carryforward Bug Fix

## Issue Summary

When testing the cash flow statement generation with execution data from 2024-25, the system was showing incorrect values:

**Expected:**
- 2024-25 Ending Cash: **-4** (sum of Cash at bank + Petty cash cumulative balances)
- 2025-26 Beginning Cash: **-4** (carried forward from previous year)

**Actual (Before Fix):**
- 2024-25 Ending Cash: **8** (using sum of quarters instead of cumulative_balance) ❌
- 2025-26 Beginning Cash: **0** (not carried forward due to negative value check) ❌

## Accounting Team Clarification

**IMPORTANT:** According to the accounting team:

**Cash and cash equivalents** ≠ Section G (Closing Balance)

**Cash and cash equivalents** = Sum of cumulative_balance of:
- Cash at bank (Section D - Financial Assets)
- Petty cash (Section D - Financial Assets)

For **stock items** like cash:
- `cumulative_balance` = latest quarter value (Q4)
- NOT the sum of all quarters

Example:
```
Cash at bank:
- Q1: 12
- Q2: 8
- Q3: 4
- Q4: 2
- cumulative_balance: 2 ✓ (latest quarter, not 12+8+4+2=26)
```

## Root Causes

### 1. Carryforward Not Working for Negative Values

**File:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

**Problem:** The carryforward injection logic only worked when `beginningCash > 0`:

```typescript
if (carryforwardResult && carryforwardResult.success && carryforwardResult.beginningCash > 0) {
  // Inject carryforward...
}
```

This meant negative balances (like -4) were never carried forward.

**Fix:** Changed condition to `beginningCash !== 0` to handle both positive and negative values.

### 2. Incorrect Cash Calculation Method

**File:** `apps/server/src/lib/statement-engine/services/carryforward-service.ts`

**Problem:** The `calculateEndingCashFromExecution` method was trying to calculate cash using Section G (Closing Balance) formula, which is incorrect. Cash should be calculated from Section D activities (Cash at bank + Petty cash) using their `cumulative_balance` values.

**Fix:** Rewrote the method to:
- Look up "Cash at bank" and "Petty cash" activities directly
- Use their `cumulative_balance` values (which represent the latest quarter for stock items)
- Sum them to get total cash

```typescript
const cashAtBank = activities['Cash at bank']?.cumulative_balance || 0;
const pettyCash = activities['Petty cash']?.cumulative_balance || 0;
const totalCash = cashAtBank + pettyCash;
```

## Test Data Verification

### 2024-25 Execution Data:
```
D. Financial Assets:
- Cash at bank: cumulative_balance = -2
- Petty cash: cumulative_balance = -2

Cash and cash equivalents = -2 + (-2) = -4 ✓
```

### 2025-26 Cash Flow Statement:
```
Cash and cash equivalents at beginning of period = -4 ✓ (carried forward from 2024-25)
Net increase/decrease in cash = (calculated from 2025-26 activities)
Cash and cash equivalents at end of period = (from 2025-26 execution data) ✓
```

## Changes Made

1. **apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts**
   - Line 560: Changed `beginningCash > 0` to `beginningCash !== 0`
   - Line 568: Changed `existingAmount > 0` to `existingAmount !== 0`

2. **apps/server/src/lib/statement-engine/services/carryforward-service.ts**
   - Lines 710-760: Rewrote `calculateEndingCashFromExecution` method to:
     - Access activities directly from execution data
     - Find "Cash at bank" and "Petty cash" activities
     - Use their `cumulative_balance` values
     - Sum them to get total cash

## Testing

After applying these fixes:

1. Generate cash flow statement for 2024-25
   - Verify ending cash = sum of Cash at bank + Petty cash cumulative balances

2. Generate cash flow statement for 2025-26
   - Verify beginning cash = 2024-25 ending cash (carried forward)
   - Verify ending cash = sum of 2025-26 Cash at bank + Petty cash cumulative balances

3. Check server logs for carryforward debug messages:
   ```
   [CarryforwardService] Calculated ending cash: Cash at bank (-2) + Petty cash (-2) = -4
   ```

## Important Notes

- **Cash and cash equivalents** are Section D (Financial Assets), NOT Section G (Closing Balance)
- **Section G (Closing Balance)** = Accumulated Surplus/Deficit + Prior Year Adjustment + Surplus/Deficit of Period
- **Cash** = Cash at bank + Petty cash (using cumulative_balance for stock items)
- For stock items, `cumulative_balance` = latest quarter value, not sum of all quarters
- The event mapping `CASH_EQUIVALENTS_END` correctly maps to "Cash at bank" and "Petty cash"
- The carryforward service now correctly uses cumulative_balance values from activities
