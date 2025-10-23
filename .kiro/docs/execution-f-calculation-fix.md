# Fix: Net Financial Assets (F) Calculation for Stock Sections

## Problem Summary

The `toBalances()` function in `execution.helpers.ts` was incorrectly calculating the cumulative balance for Section F (Net Financial Assets) by summing all quarters, even though sections D and E use stock-based logic (latest quarter only).

## Root Cause

```typescript
// ❌ BEFORE (Incorrect):
const netFinancialAssets = {
  q1: D.q1 - E.q1, 
  q2: D.q2 - E.q2, 
  q3: D.q3 - E.q3, 
  q4: D.q4 - E.q4,
  cumulativeBalance: (D.q1+D.q2+D.q3+D.q4) - (E.q1+E.q2+E.q3+E.q4), // Wrong!
};
```

This caused F to be calculated as a **flow** (sum of all quarters) when it should be a **stock** (latest quarter position).

## Impact

### Example Scenario
```
Section D (Financial Assets):
- Cash at Bank: Q1=1000, Q2=1500, Q3=2000, Q4=2500
- D.total = 2500 (latest quarter) ✅

Section E (Financial Liabilities):
- Accounts Payable: Q1=500, Q2=600, Q3=700, Q4=800
- E.total = 800 (latest quarter) ✅

Section F (Net Financial Assets):
- OLD: (1000+1500+2000+2500) - (500+600+700+800) = 4400 ❌
- NEW: 2500 - 800 = 1700 ✅
```

### Validation Failure
The F = G balance validation would fail:
```typescript
F.cumulativeBalance = 4400 (wrong)
G.cumulativeBalance = 1700 (correct)
Difference = 2700 >> 0.01 tolerance
Result: "Financial statement is not balanced" ❌
```

## Solution

Changed the calculation to use `D.total` and `E.total` from rollups, which already contain the correct stock-based values:

```typescript
// ✅ AFTER (Correct):
const netFinancialAssets = {
  q1: D.q1 - E.q1, 
  q2: D.q2 - E.q2, 
  q3: D.q3 - E.q3, 
  q4: D.q4 - E.q4,
  cumulativeBalance: D.total - E.total, // Use rollup totals (latest quarter)
};
```

## Why This Works

The `recalculateRollups()` function correctly aggregates stock sections:

```typescript
// For each activity in section D:
bySection['D'].total += activity.cumulative_balance; 
// Where cumulative_balance = latest quarter value for stock sections

// Result: D.total = sum of all D activities' latest quarter values ✅
```

## Verification

### Before Fix
```
D.total = 2500 (correct)
E.total = 800 (correct)
F.cumulativeBalance = 4400 (WRONG - summed all quarters)
G.cumulativeBalance = 1700
Balance check: FAIL (difference = 2700)
```

### After Fix
```
D.total = 2500 (correct)
E.total = 800 (correct)
F.cumulativeBalance = 1700 (CORRECT - D.total - E.total)
G.cumulativeBalance = 1700
Balance check: PASS (difference = 0)
```

## Files Modified

- `apps/server/src/api/routes/execution/execution.helpers.ts`
  - Function: `toBalances()`
  - Line: ~230
  - Change: `cumulativeBalance: D.total - E.total`

## Testing Recommendations

1. **Unit Test**: Create test with multi-quarter D/E data
2. **Integration Test**: Submit execution form with stock section data
3. **Validation Test**: Verify F = G balance check passes
4. **Regression Test**: Ensure flow sections (A, B, C) still work correctly

## Related Concepts

### Flow vs Stock Sections
- **Flow (A, B, C, F, G)**: Accumulate over time → Sum all quarters
- **Stock (D, E)**: Point-in-time balance → Latest quarter only

### Accounting Equation
```
Net Financial Assets (F) = Financial Assets (D) - Financial Liabilities (E)
Closing Balance (G) = Opening Balance + Flows during period
F must equal G for balanced financial statement
```

## Date
Fixed: 2025-01-XX

## Author
Kiro AI Assistant
