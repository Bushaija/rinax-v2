# F = G Validation: Open Discussion & Analysis

## Overview

The F = G equation is the **fundamental accounting identity** enforced in the execution module:

**F (Net Financial Assets) = G (Closing Balance)**

This ensures the financial statement balances correctly, similar to how Assets = Liabilities + Equity in traditional accounting.

---

## Current Implementation

### 1. Where Validation Happens

The validation is enforced in **two places** during create/update operations:

**Location:** `apps/server/src/api/routes/execution/execution.handlers.ts`

```typescript
// In both create() and update() handlers:
const netFinancialAssets = balances?.netFinancialAssets?.cumulativeBalance || 0;
const closingBalance = balances?.closingBalance?.cumulativeBalance || 0;
const balanceDifference = Math.abs(netFinancialAssets - closingBalance);
const tolerance = 0.01; // Allow small rounding differences

if (balanceDifference > tolerance) {
  return c.json(
    {
      message: "Financial statement is not balanced",
      error: "Net Financial Assets (F) must equal Closing Balance (G)",
      details: { netFinancialAssets, closingBalance, difference: balanceDifference, tolerance },
      errors: [{ field: "balance", message: "...", code: "BALANCE_MISMATCH" }]
    },
    HttpStatusCodes.BAD_REQUEST
  );
}
```

### 2. How F is Calculated

**Function:** `toBalances()` in `execution.helpers.ts`

```typescript
// F = D - E (per quarter and cumulative)
const netFinancialAssets = {
  q1: D.q1 - E.q1,
  q2: D.q2 - E.q2,
  q3: D.q3 - E.q3,
  q4: D.q4 - E.q4,
  cumulativeBalance: D.total - E.total  // Stock logic: latest quarter difference
};
```

**Key Point:** `D.total` and `E.total` come from rollups that use **stock logic** (latest quarter value), not flow logic (sum of quarters).

### 3. How G is Calculated

```typescript
// G = Section G activities + Surplus/Deficit
const closingBalance = {
  q1: (G.q1 || 0) + surplus.q1,
  q2: (G.q2 || 0) + surplus.q2,
  q3: (G.q3 || 0) + surplus.q3,
  q4: (G.q4 || 0) + surplus.q4,
  cumulativeBalance: (G.total || 0) + surplus.cumulativeBalance
};
```

**Components of G:**
- **G activities:** Accumulated Surplus/Deficit, Prior Year Adjustments
- **Surplus:** A - B (Receipts - Expenditures)

---

## Discussion Points & Potential Issues

### 🤔 Issue 1: Inconsistent Logic in `computeRollups()`

**Current Code:**
```typescript
export function computeRollups(keyed: Record<string, any>) {
  const bySection: Record<string, any> = {};
  const bySubSection: Record<string, any> = {};
  
  for (const k in keyed) {
    const a = keyed[k];
    const q1 = Number(a.q1 || 0), q2 = Number(a.q2 || 0), 
          q3 = Number(a.q3 || 0), q4 = Number(a.q4 || 0);
    const total = q1 + q2 + q3 + q4;  // ⚠️ ALWAYS SUMS QUARTERS
    
    if (a.section) {
      bySection[a.section].total += total;  // ⚠️ Problem here
    }
  }
}
```

**The Problem:**

This function **always sums quarters** regardless of section type! It doesn't respect stock vs flow logic.

**Example:**
```javascript
// Section D activity (stock item)
activity = { q1: 50000, q2: 65000, q3: 48000, q4: 72000, cumulative_balance: 72000 }

// In computeRollups:
total = 50000 + 65000 + 48000 + 72000 = 235000  // ❌ WRONG!
// Should use cumulative_balance = 72000 instead

// This gets added to D.total:
D.total += 235000  // ❌ Massively inflated!
```

**Why It Works Currently:**

The `recalculateExecutionData()` function in `execution.recalculations.ts` correctly sets `cumulative_balance` on each activity using stock/flow logic, and then `recalculateRollups()` sums those `cumulative_balance` values:

```typescript
// In recalculateRollups (the correct one):
const cumulativeBalance = activity.cumulative_balance ?? (q1 + q2 + q3 + q4);
bySection[section].total += cumulativeBalance;  // ✅ Uses correct cumulative_balance
```

**But:** The old `computeRollups()` function is still used in `enrichFormData()` which might be called in some paths!

---

### 🤔 Issue 2: G Section Mixed Logic

**The Challenge:**

Section G contains **both flow and stock items**:

**Flow items (sum quarters):**
- Surplus/Deficit of the Period (computed as A - B)

**Stock items (latest quarter):**
- Accumulated Surplus/Deficit (running balance)
- Prior Year Adjustments (balance sheet adjustment)

**Current Handling:**

The code uses `isSectionGFlowItem()` to detect which logic to use based on keywords in the activity name. This is **heuristic-based** and could be fragile.

```typescript
function isSectionGFlowItem(code: string, name?: string): boolean {
  const flowKeywords = ['accumulated', 'surplus', 'deficit', 'period', ...];
  const stockKeywords = ['opening', 'asset', 'liability', 'position', ...];
  
  // Detection logic based on keywords
  // ...
}
```

**Question:** Is this reliable enough? What if activity names change or don't match keywords?

---

### 🤔 Issue 3: Tolerance Value

```typescript
const tolerance = 0.01; // Allow small rounding differences
```

**Questions:**
1. Is 0.01 (1 cent) the right tolerance?
2. Should tolerance be configurable?
3. Should it scale with the magnitude of values? (e.g., 0.01% instead of absolute 0.01)

**Example Scenario:**
```javascript
// Large values with rounding
F.cumulative = 1,234,567.894
G.cumulative = 1,234,567.896
difference = 0.002  // ✅ Passes (< 0.01)

// But what about:
F.cumulative = 1,234,567.89
G.cumulative = 1,234,567.90
difference = 0.01  // ⚠️ Exactly at tolerance - passes or fails?
```

---

### 🤔 Issue 4: G Calculation Dependency on Surplus

```typescript
const closingBalance = {
  cumulativeBalance: (G.total || 0) + surplus.cumulativeBalance
};
```

**The Formula:** G = G_activities + (A - B)

**Questions:**
1. Is this always correct? What if facilities have different accounting structures?
2. Should "Surplus/Deficit of the Period" be a separate G activity instead of computed?
3. What happens if users enter it as both a G activity AND it's computed?

**Potential Double-Counting:**
```javascript
// If user enters:
G_3: "Surplus/Deficit of the Period" = 50000

// And we compute:
surplus = A - B = 50000

// Then:
G.total = 50000 + 50000 = 100000  // ❌ Double counted!
```

---

### 🤔 Issue 5: When is Validation Skipped?

Looking at the code, validation is **only enforced on create/update**. 

**Not validated:**
- When data is retrieved (GET endpoints)
- When data is imported/migrated
- When data is bulk-loaded

**Question:** Should we have a separate validation endpoint to check existing data?

---

## Recommendations for Discussion

### 1. Fix `computeRollups()` Function

**Option A:** Deprecate it entirely, always use `recalculateRollups()` from recalculations.ts

**Option B:** Fix it to respect `cumulative_balance`:
```typescript
export function computeRollups(keyed: Record<string, any>) {
  for (const k in keyed) {
    const a = keyed[k];
    // Use cumulative_balance if available, otherwise sum quarters
    const total = a.cumulative_balance ?? 
                  (Number(a.q1 || 0) + Number(a.q2 || 0) + 
                   Number(a.q3 || 0) + Number(a.q4 || 0));
    
    if (a.section) {
      bySection[a.section].total += total;
    }
  }
}
```

### 2. Strengthen G Section Logic

**Option A:** Make G activities explicitly typed in database:
```typescript
// In database schema
{
  categoryCode: 'G',
  activityType: 'FLOW' | 'STOCK',  // Explicit classification
  ...
}
```

**Option B:** Use activity codes instead of names for detection:
```typescript
// G-01: Accumulated Surplus (STOCK)
// G-02: Prior Year Adjustment (STOCK)
// G-03: Surplus of Period (FLOW - but should be computed)
```

### 3. Make Tolerance Configurable

```typescript
// In system configuration
const BALANCE_VALIDATION_CONFIG = {
  tolerance: 0.01,
  toleranceType: 'absolute' | 'percentage',
  strictMode: false  // If true, tolerance = 0
};
```

### 4. Add Validation Warnings

Instead of hard-failing, provide warnings for near-misses:

```typescript
if (balanceDifference > tolerance) {
  return BAD_REQUEST;  // Hard fail
} else if (balanceDifference > tolerance * 0.5) {
  // Warning: Close to tolerance
  warnings.push({
    type: 'BALANCE_WARNING',
    message: `Balance difference (${balanceDifference}) is close to tolerance (${tolerance})`
  });
}
```

### 5. Add Validation Endpoint

```typescript
// GET /execution/{id}/validate
export const validateExecution: AppRouteHandler<ValidateRoute> = async (c) => {
  const { id } = c.req.param();
  const execution = await getExecution(id);
  
  const balances = toBalances(execution.formData.rollups);
  const validation = {
    isBalanced: balances.isBalanced,
    netFinancialAssets: balances.netFinancialAssets.cumulativeBalance,
    closingBalance: balances.closingBalance.cumulativeBalance,
    difference: Math.abs(
      balances.netFinancialAssets.cumulativeBalance - 
      balances.closingBalance.cumulativeBalance
    ),
    tolerance: 0.01,
    details: {
      receipts: balances.receipts,
      expenditures: balances.expenditures,
      surplus: balances.surplus,
      financialAssets: balances.financialAssets,
      financialLiabilities: balances.financialLiabilities
    }
  };
  
  return c.json(validation);
};
```

---

## Testing Scenarios

### Scenario 1: Perfect Balance
```javascript
D.total = 72000 (Q4 value)
E.total = 12000 (Q4 value)
F = 72000 - 12000 = 60000

G_activities = 10000 (Accumulated)
Surplus = 50000 (A - B)
G = 10000 + 50000 = 60000

F = G ✅
```

### Scenario 2: Rounding Error
```javascript
F = 60000.004
G = 60000.001
Difference = 0.003 < 0.01 ✅ Passes
```

### Scenario 3: Data Entry Error
```javascript
F = 60000
G = 65000
Difference = 5000 > 0.01 ❌ Fails
```

### Scenario 4: Mixed Quarter Reporting
```javascript
// User only entered Q1 and Q2
D: { q1: 50000, q2: 65000, q3: undefined, q4: undefined }
E: { q1: 8000, q2: 10000, q3: undefined, q4: undefined }

// Stock logic: use latest reported quarter (Q2)
D.total = 65000
E.total = 10000
F = 55000

// Does G calculation handle this correctly?
```

---

## Questions for Team Discussion

1. **Should we deprecate `computeRollups()` in favor of `recalculateRollups()`?**

2. **Is the keyword-based detection for Section G reliable enough, or should we use explicit typing?**

3. **Should tolerance be configurable? Should it be percentage-based for large values?**

4. **Should we add a validation endpoint to check existing data?**

5. **How should we handle the "Surplus/Deficit of Period" in Section G - computed or entered?**

6. **Should we add validation warnings for near-misses?**

7. **What happens if users partially fill quarters - is the stock logic handling this correctly?**

8. **Should we log validation failures for analytics/debugging?**

---

## Conclusion

The F = G validation is **critical** for data integrity, but there are several areas where the implementation could be strengthened:

1. **Consistency:** Ensure all rollup calculations respect stock/flow logic
2. **Reliability:** Move from heuristic-based to explicit classification
3. **Flexibility:** Make tolerance configurable
4. **Visibility:** Add validation endpoints and warnings
5. **Testing:** Comprehensive test coverage for edge cases

The current implementation works for the happy path, but edge cases and data quality issues could slip through.
