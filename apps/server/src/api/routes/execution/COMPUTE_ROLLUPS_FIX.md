# Fix: computeRollups() Stock/Flow Logic

## Issue Description

The `computeRollups()` function was **always summing quarters** regardless of section type (stock vs flow), which could lead to incorrect rollup totals for stock sections (D, E, F).

### The Problem

**Before Fix:**
```typescript
export function computeRollups(keyed: Record<string, any>) {
  for (const k in keyed) {
    const a = keyed[k];
    const q1 = Number(a.q1 || 0), q2 = Number(a.q2 || 0), 
          q3 = Number(a.q3 || 0), q4 = Number(a.q4 || 0);
    const total = q1 + q2 + q3 + q4;  // ❌ ALWAYS SUMS
    
    bySection[a.section].total += total;  // ❌ Wrong for stock sections
  }
}
```

**Example of the Bug:**
```javascript
// Section D activity (stock item - should use latest quarter)
activity = {
  code: 'HIV_EXEC_HOSPITAL_D_1',
  q1: 50000,
  q2: 65000,
  q3: 48000,
  q4: 72000,
  cumulative_balance: 72000  // ✅ Correctly calculated (Q4 value)
}

// But computeRollups ignored cumulative_balance:
total = 50000 + 65000 + 48000 + 72000 = 235000  // ❌ WRONG!
D.total += 235000  // ❌ Massively inflated!

// Should have been:
total = 72000  // ✅ Use cumulative_balance
D.total += 72000  // ✅ Correct
```

### Why It Didn't Break Everything

The bug was **masked** because:

1. **Primary code path uses `recalculateRollups()`** (from `execution.recalculations.ts`)
   - This function correctly uses `cumulative_balance`
   - Used in create/update handlers via `recalculateExecutionData()`

2. **`computeRollups()` is only used in `enrichFormData()`**
   - `enrichFormData()` is imported but **not actually called** in handlers
   - So the buggy code path was dormant

3. **Activities have `cumulative_balance` set before rollup**
   - `addCumulativeBalances()` correctly calculates it
   - But `computeRollups()` was ignoring it

### Potential Impact

If `enrichFormData()` were ever used (or if someone called `computeRollups()` directly):
- Stock sections (D, E, F) would have **massively inflated totals**
- F = G validation would **fail incorrectly**
- Financial reports would show **wrong balances**

## The Fix

**After Fix:**
```typescript
export function computeRollups(keyed: Record<string, any>) {
  for (const k in keyed) {
    const a = keyed[k];
    const q1 = Number(a.q1 || 0), q2 = Number(a.q2 || 0), 
          q3 = Number(a.q3 || 0), q4 = Number(a.q4 || 0);
    
    // ✅ Use cumulative_balance if available (respects stock/flow logic)
    const total = a.cumulative_balance !== undefined && a.cumulative_balance !== null
      ? Number(a.cumulative_balance)
      : q1 + q2 + q3 + q4; // Fallback to sum if not set
    
    bySection[a.section].total += total;  // ✅ Correct for all sections
  }
}
```

### How It Works Now

```javascript
// Stock section (D) - cumulative_balance = latest quarter
activity_D = {
  q1: 50000, q2: 65000, q3: 48000, q4: 72000,
  cumulative_balance: 72000  // Set by addCumulativeBalances()
}
total = 72000  // ✅ Uses cumulative_balance
D.total += 72000  // ✅ Correct!

// Flow section (A) - cumulative_balance = sum of quarters
activity_A = {
  q1: 100000, q2: 150000, q3: 120000, q4: 180000,
  cumulative_balance: 550000  // Set by addCumulativeBalances()
}
total = 550000  // ✅ Uses cumulative_balance
A.total += 550000  // ✅ Correct!

// Fallback - no cumulative_balance set
activity_unknown = {
  q1: 100, q2: 200, q3: 300, q4: 400
  // No cumulative_balance
}
total = 1000  // ✅ Falls back to sum
```

## Files Changed

1. **apps/server/src/api/routes/execution/execution.helpers.ts**
   - Fixed `computeRollups()` to use `cumulative_balance` when available
   - Added comprehensive documentation
   - Added fallback logic for backward compatibility

2. **apps/server/src/api/routes/execution/__tests__/cumulative-balance.test.ts**
   - Added test suite for `computeRollups()` fix
   - Tests stock sections (D, E, F)
   - Tests flow sections (A, B, C)
   - Tests fallback behavior

## Verification

### Test Coverage

New tests verify:
- ✅ Stock sections use `cumulative_balance` (not sum)
- ✅ Flow sections use `cumulative_balance` (which is sum)
- ✅ Fallback to summing quarters if `cumulative_balance` not set
- ✅ Multiple activities aggregate correctly

### Example Test Results

```typescript
// Stock section test
D_activity_1: { q1: 50000, q2: 65000, q3: 48000, q4: 72000, cumulative_balance: 72000 }
D_activity_2: { q1: 10000, q2: 12000, q3: 15000, q4: 18000, cumulative_balance: 18000 }

D.total = 90000  // ✅ 72000 + 18000 (uses cumulative_balance)
NOT 235000       // ❌ Would be wrong if summing all quarters

// Flow section test
A_activity: { q1: 100000, q2: 150000, q3: 120000, q4: 180000, cumulative_balance: 550000 }

A.total = 550000  // ✅ Uses cumulative_balance (which is sum for flow)
```

## Comparison: Two Rollup Functions

### `computeRollups()` (Fixed)
- **Location:** `execution.helpers.ts`
- **Used by:** `enrichFormData()` (currently unused)
- **Logic:** Uses `cumulative_balance` if available, falls back to sum
- **Status:** ✅ Fixed

### `recalculateRollups()` (Already Correct)
- **Location:** `execution.recalculations.ts`
- **Used by:** `recalculateExecutionData()` (primary code path)
- **Logic:** Always uses `cumulative_balance` from activities
- **Status:** ✅ Already correct

## Recommendations

### Option 1: Keep Both Functions (Current Approach)
- ✅ Backward compatible
- ✅ Both functions now correct
- ❌ Code duplication
- ❌ Two ways to do the same thing

### Option 2: Deprecate `computeRollups()`
- ✅ Single source of truth
- ✅ Less code to maintain
- ❌ Breaking change if anyone uses `enrichFormData()`
- ❌ Need to update any external code

### Option 3: Make `enrichFormData()` use `recalculateExecutionData()`
- ✅ Reuse existing correct logic
- ✅ Consistent behavior
- ❌ Different function signature
- ❌ May need adapter code

## Decision

**Current approach:** Keep both functions, both now correct.

**Rationale:**
1. Minimal risk - both functions work correctly
2. Backward compatible - no breaking changes
3. `enrichFormData()` may be used by external code we don't see
4. Can deprecate later if needed

## Related Issues

This fix is related to:
- **Section F classification fix** - F moved from flow to stock
- **F = G validation** - Depends on correct rollup totals
- **Stock vs Flow logic** - Consistent handling across codebase

## Date

Fixed: October 16, 2025
