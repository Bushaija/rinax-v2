# Bug Fix: Section F (Net Financial Assets) Classification

## Issue Description

Section F (Net Financial Assets) was incorrectly classified as a **flow section** when it should be a **stock section**.

### The Problem

**F = D - E** (Net Financial Assets = Financial Assets - Financial Liabilities)

Since both D and E are stock sections (balance sheet items), F should inherit stock behavior. However, the code was treating F as a flow section, which would cause incorrect cumulative balance calculations if F activities had quarterly data entered.

### Impact

- **Current Impact**: Minimal, because F is computed in `toBalances()` function rather than having raw data entered
- **Potential Impact**: If F activities were created with quarterly values, they would be incorrectly summed across quarters instead of using the latest quarter value

### Example of the Bug

```typescript
// Section F activity with quarterly values
F_activity = {
  q1: 42000,  // D.q1 - E.q1
  q2: 55000,  // D.q2 - E.q2
  q3: 39000,  // D.q3 - E.q3
  q4: 60000   // D.q4 - E.q4
}

// WRONG (Flow logic - what was happening):
F.cumulative_balance = 42000 + 55000 + 39000 + 60000 = 196000 ❌

// CORRECT (Stock logic - what should happen):
F.cumulative_balance = 60000 (Q4 value only) ✅
```

## Root Cause

The section classification arrays incorrectly included F in the flow sections:

**Before:**
```typescript
const flowSections = ['A', 'B', 'C', 'F'];  // ❌ F should not be here
const stockSections = ['D', 'E'];
```

**After:**
```typescript
const flowSections = ['A', 'B', 'C'];       // ✅ Removed F
const stockSections = ['D', 'E', 'F'];      // ✅ Added F
```

## Files Changed

### Server-Side (Backend)

1. **apps/server/src/api/routes/execution/execution.helpers.ts**
   - Updated `calculateCumulativeBalance()` function
   - Changed section classification: moved F from flow to stock
   - Updated documentation comments

2. **apps/server/src/api/routes/execution/execution.recalculations.ts**
   - Updated `recalculateCumulativeBalances()` function
   - Changed section classification: moved F from flow to stock
   - Updated documentation comments

### Client-Side (Frontend)

3. **apps/client/features/execution/schemas/execution-form-schema.ts**
   - Updated `calculateCumulativeBalance()` function
   - Changed section classification: moved F from flow to stock
   - **Fixed hardcoded Net Financial Assets calculation** to use `getLatestQuarterValue()` instead of summing quarters
   - Updated documentation comments

## Verification

### Test Coverage

Created comprehensive test suite: `apps/server/src/api/routes/execution/__tests__/cumulative-balance.test.ts`

Tests verify:
- Flow sections (A, B, C) sum all quarters
- Stock sections (D, E, F) use latest quarter only
- F inherits stock behavior from D and E
- Section G uses intelligent detection
- Recalculation integration works correctly

### Manual Verification

The fix can be verified by:
1. Creating execution data with D and E activities
2. Verifying F cumulative balance equals D.latest - E.latest (not sum)
3. Checking that F = G accounting equation still balances

## Accounting Logic Summary

| Section | Type | Cumulative Logic | Reason |
|---------|------|------------------|--------|
| A | Flow | Sum quarters | Revenue accumulates over time |
| B | Flow | Sum quarters | Expenses accumulate over time |
| C | Flow | Sum quarters | Surplus = A - B (both flow) |
| D | Stock | Latest quarter | Assets at point in time |
| E | Stock | Latest quarter | Liabilities at point in time |
| **F** | **Stock** | **Latest quarter** | **Net position = D - E (both stock)** |
| G | Mixed | Depends on item | Some flow (surplus), some stock (balance) |

## Why This Matters

The F = G accounting equation validation depends on both F and G using consistent logic:

```typescript
// F calculation (now correct with stock logic)
F.cumulative = D.latest - E.latest = 72000 - 12000 = 60000

// G calculation (closing balance)
G.cumulative = Opening + Surplus + Adjustments = 60000

// Validation
if (Math.abs(F.cumulative - G.cumulative) < 0.01) {
  // ✅ Balanced!
}
```

If F used flow logic (summing quarters), it would be massively inflated and would never equal G.

## Related Code

The `toBalances()` function already correctly computes F using stock logic:

```typescript
const netFinancialAssets = {
  q1: D.q1 - E.q1,
  q2: D.q2 - E.q2,
  q3: D.q3 - E.q3,
  q4: D.q4 - E.q4,
  cumulativeBalance: D.total - E.total  // ✅ Uses D and E totals (stock logic)
};
```

This fix ensures that if F activities are ever created with raw quarterly data, they will be calculated consistently with the computed F values.

## Date

Fixed: October 16, 2025
