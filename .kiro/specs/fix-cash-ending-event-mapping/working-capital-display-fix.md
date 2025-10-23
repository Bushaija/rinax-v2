# Working Capital Display Fix

## Date: 2025-10-17

## Problem

The Cash Flow statement was displaying **raw balances** for "Changes in receivables" and "Changes in payables" instead of the **change/difference** between periods.

### What Was Displayed (Incorrect):

| Events                  | 2025-26 | 2024-25 |
| ----------------------- | ------- | ------- |
| **Accounts Receivable** | 8       | 10      |
| **Accounts Payable**    | 20      | 25      |

### What Should Be Displayed (Correct):

| Events                  | 2025-26 | 2024-25 |
| ----------------------- | ------- | ------- |
| **Accounts Receivable** | -2      | 0       |
| **Accounts Payable**    | -5      | 0       |

Where:
- Receivables change: 8 - 10 = **-2** (decrease, positive for cash flow)
- Payables change: 20 - 25 = **-5** (decrease, negative for cash flow)

---

## Root Cause

The system was showing the **balance** from each period instead of the **change** between periods.

### Server-Side (Correct)
The server was calculating and storing the balances correctly:
```json
"workingCapital": {
  "receivables": {
    "currentBalance": 8,
    "previousBalance": 10,
    "change": -2,
    "cashFlowAdjustment": 2
  }
}
```

### Client-Side (Incorrect)
The client was displaying `currentBalance` (8) and `previousBalance` (10) directly, instead of calculating the change (-2).

---

## Solution Implemented

### Client-Side Fix

**File**: `apps/client/app/dashboard/reports/utils/transform-statement-data.ts`

**Method**: `transformStatementLine()`

Added logic to detect working capital lines and calculate the change:

```typescript
// Check if this is a working capital line (Changes in receivables/payables)
const isWorkingCapitalLine = line.metadata?.lineCode === 'CHANGES_RECEIVABLES' || 
                              line.metadata?.lineCode === 'CHANGES_PAYABLES';

let currentValue = line.currentPeriodValue ?? null;
let previousValue = line.previousPeriodValue ?? null;

// For working capital lines, show the CHANGE (difference) instead of the balance
if (isWorkingCapitalLine && currentValue !== null && previousValue !== null) {
  const change = currentValue - previousValue;
  currentValue = change;
  previousValue = 0; // Previous period change is not calculated recursively
}
```

### Server-Side Changes (Already Done)

**File**: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

1. **Removed unmapped event codes**:
   ```typescript
   // Before: ['ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE']
   // After: ['ADVANCE_PAYMENTS']  // Only this one is actually mapped
   ```

2. **Changed to inject balances** (so client can calculate change):
   ```typescript
   // Before: workingCapitalResult.receivablesChange.cashFlowAdjustment
   // After: workingCapitalResult.receivablesChange.currentPeriodBalance
   ```

---

## How It Works Now

### Data Flow:

1. **Server calculates balances**:
   - Current receivables: 8
   - Previous receivables: 10
   - Stores both in the response

2. **Client calculates change**:
   - Detects working capital line
   - Calculates: 8 - 10 = -2
   - Displays: -2 (the change)

3. **Display**:
   ```
   Changes in receivables: -2
   ```

### Accounting Interpretation:

**Receivables decreased by 2**:
- This means you collected 2 in cash
- Positive impact on cash flow
- But displayed as -2 (the change in the balance)

**Payables decreased by 5**:
- This means you paid off 5 in debts
- Negative impact on cash flow (cash went out)
- Displayed as -5 (the change in the balance)

---

## Cash Flow Statement (Indirect Method) Logic

### Changes in Receivables:
- **Increase** in receivables → Subtract from cash flow (cash didn't come in)
- **Decrease** in receivables → Add to cash flow (cash collected)

### Changes in Payables:
- **Increase** in payables → Add to cash flow (delayed payment, preserved cash)
- **Decrease** in payables → Subtract from cash flow (paid debts, cash went out)

### Summary Table:

| Adjustment Type         | Increase in Amount | Decrease in Amount |
| ----------------------- | ------------------ | ------------------ |
| **Accounts Receivable** | Subtract (−)       | Add (+)            |
| **Accounts Payable**    | Add (+)            | Subtract (−)       |

---

## Expected Results After Fix

### Test Case: Your Data

**Given**:
- Receivables 2024-25: 10
- Receivables 2025-26: 8
- Payables 2024-25: 25
- Payables 2025-26: 20

**Expected Display**:

| Line                    | 2025-26 | 2024-25 |
| ----------------------- | ------- | ------- |
| Changes in receivables  | -2      | 0       |
| Changes in payables     | -5      | 0       |

**Interpretation**:
- Receivables decreased by 2 (collected cash)
- Payables decreased by 5 (paid debts)

---

## Files Modified

1. ✅ `apps/client/app/dashboard/reports/utils/transform-statement-data.ts`
   - Added working capital line detection
   - Calculate change instead of showing balance

2. ✅ `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`
   - Removed unmapped receivables event codes
   - Changed to inject balances (for client to calculate change)

---

## Testing

To verify the fix:

1. **Generate Cash Flow statement** for 2025-26
2. **Check "Changes in receivables"** line:
   - Should show: **-2** (not 8)
3. **Check "Changes in payables"** line:
   - Should show: **-5** (not 20)

---

## Notes

### Why Show the Change?

The line is called "**Changes** in receivables/payables", so it should show the **change** (difference), not the balance.

This aligns with standard Cash Flow Statement (Indirect Method) presentation where working capital changes are shown as adjustments to net income.

### Alternative Approach (Not Chosen)

We could have renamed the lines to:
- "Receivables balance" instead of "Changes in receivables"
- "Payables balance" instead of "Changes in payables"

But this would deviate from standard accounting terminology.

---

## Status

✅ **Fix implemented and ready for testing**

The client-side now correctly calculates and displays the **change** in working capital accounts instead of the raw balances.

