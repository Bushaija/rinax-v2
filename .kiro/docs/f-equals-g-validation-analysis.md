# F = G Balance Validation Analysis

## Overview

The execution module enforces a critical accounting equation: **Net Financial Assets (F) must equal Closing Balance (G)**. This validation ensures financial statements are balanced before allowing data to be saved.

## Validation Flow

### **Both Create and Update Handlers Follow the Same Pattern:**

```
1. Recalculate form data
2. Validate rollups exist
3. Calculate balances from rollups
4. Extract F and G cumulative balances
5. Check if |F - G| ≤ 0.01
6. Reject if unbalanced, proceed if balanced
```

---

## Step-by-Step Breakdown

### **Step 1: Data Recalculation**

**Create Handler:**
```typescript
const recalculated = recalculateExecutionData(body.formData, context);

const normalizedFormData = {
  ...body.formData,
  version: '1.0',
  context,
  activities: recalculated.activities,  // With cumulative_balance
  rollups: recalculated.rollups         // bySection, bySubSection
};
```

**Update Handler:**
```typescript
const mergedFormData = {
  ...existingFormData,
  ...updateFormData,
};

const recalculated = recalculateExecutionData(mergedFormData, context);

const finalFormData = {
  ...mergedFormData,
  version: '1.0',
  context,
  activities: recalculated.activities,
  rollups: recalculated.rollups
};
```

### **Step 2: Rollups Validation**

```typescript
if (!normalizedFormData.rollups || !normalizedFormData.rollups.bySubSection) {
  return c.json({
    message: "Invalid form data structure",
    error: "Form data must contain valid rollups for balance calculation",
    errors: [{
      field: "formData",
      message: "Form data is missing required rollups structure",
      code: "INVALID_FORM_DATA"
    }]
  }, HttpStatusCodes.BAD_REQUEST);
}
```

**Purpose:** Ensures the data structure is valid before attempting balance calculation.

### **Step 3: Balance Calculation**

```typescript
balances = toBalances(normalizedFormData.rollups);
```

This calls the `toBalances()` helper which calculates:
- **A (Receipts)**: Flow - sum all quarters
- **B (Expenditures)**: Flow - sum all quarters
- **C (Surplus/Deficit)**: Computed - A - B
- **D (Financial Assets)**: Stock - latest quarter aggregate
- **E (Financial Liabilities)**: Stock - latest quarter aggregate
- **F (Net Financial Assets)**: Stock - D.total - E.total
- **G (Closing Balance)**: Mixed - G.total + surplus

### **Step 4: Extract F and G Values**

```typescript
const netFinancialAssets = balances?.netFinancialAssets?.cumulativeBalance || 0;
const closingBalance = balances?.closingBalance?.cumulativeBalance || 0;
const balanceDifference = Math.abs(netFinancialAssets - closingBalance);
const tolerance = 0.01; // Allow small rounding differences
```

**Key Points:**
- Uses `cumulativeBalance` field from both F and G
- Defaults to 0 if undefined (safety fallback)
- Calculates absolute difference
- Tolerance of 0.01 allows for floating-point rounding errors

### **Step 5: Validation Check**

```typescript
if (balanceDifference > tolerance) {
  return c.json({
    message: "Financial statement is not balanced",
    error: "Net Financial Assets (F) must equal Closing Balance (G)",
    details: {
      netFinancialAssets,
      closingBalance,
      difference: balanceDifference,
      tolerance
    },
    errors: [{
      field: "balance",
      message: `Net Financial Assets (${netFinancialAssets}) must equal Closing Balance (${closingBalance}). Difference: ${balanceDifference}`,
      code: "BALANCE_MISMATCH"
    }]
  }, HttpStatusCodes.BAD_REQUEST);
}
```

**Rejection Criteria:**
- `|F - G| > 0.01`
- Returns 400 BAD_REQUEST
- Provides detailed error message with actual values

---

## How F is Calculated

### **Formula:**
```typescript
F.cumulativeBalance = D.total - E.total
```

### **Where:**
- **D.total** = Sum of all D activities' latest quarter values (stock)
- **E.total** = Sum of all E activities' latest quarter values (stock)

### **Example:**
```
Section D (Financial Assets):
- Cash at Bank: Q1=1000, Q2=1500, Q3=2000, Q4=2500 → cumulative=2500
- Accounts Receivable: Q1=500, Q2=600, Q3=700, Q4=800 → cumulative=800
- D.total = 2500 + 800 = 3300

Section E (Financial Liabilities):
- Accounts Payable: Q1=500, Q2=600, Q3=700, Q4=800 → cumulative=800
- Short-term Loans: Q1=200, Q2=300, Q3=400, Q4=500 → cumulative=500
- E.total = 800 + 500 = 1300

F.cumulativeBalance = 3300 - 1300 = 2000
```

---

## How G is Calculated

### **Formula:**
```typescript
G.cumulativeBalance = G.total + surplus.cumulativeBalance
```

### **Where:**
- **G.total** = Sum of Section G activities (Opening Balance, Accumulated Surplus, etc.)
- **surplus.cumulativeBalance** = A.total - B.total (Receipts - Expenditures)

### **Components:**
Section G typically contains:
1. **Opening Balance** (from previous period)
2. **Accumulated Surplus/Deficit** (from prior periods)
3. **Surplus/Deficit of the Period** (computed as A - B)

### **Example:**
```
Section G Activities:
- Opening Balance: Q1=1500, Q2=0, Q3=0, Q4=0 → cumulative=1500 (stock)
- Accumulated Surplus: Q1=0, Q2=0, Q3=0, Q4=0 → cumulative=0

G.total = 1500

Surplus (A - B):
- A.total = 5000 (total receipts)
- B.total = 4500 (total expenditures)
- surplus.cumulativeBalance = 5000 - 4500 = 500

G.cumulativeBalance = 1500 + 500 = 2000
```

---

## The Accounting Equation

### **Fundamental Principle:**
```
Net Financial Assets (F) = Closing Balance (G)
```

### **Expanded Form:**
```
(Financial Assets - Financial Liabilities) = Opening Balance + Net Income
(D - E) = G_opening + (A - B)
```

### **Why This Must Balance:**

1. **F represents the net position** at the reporting date (balance sheet)
2. **G represents how we got there** (opening + flows during period)
3. If F ≠ G, there's either:
   - Data entry error
   - Calculation error
   - Missing transactions

---

## Validation Scenarios

### **Scenario 1: Balanced Statement ✅**
```
F.cumulativeBalance = 2000
G.cumulativeBalance = 2000
Difference = |2000 - 2000| = 0
Result: PASS (0 ≤ 0.01)
```

### **Scenario 2: Small Rounding Difference ✅**
```
F.cumulativeBalance = 2000.005
G.cumulativeBalance = 2000.000
Difference = |2000.005 - 2000.000| = 0.005
Result: PASS (0.005 ≤ 0.01)
```

### **Scenario 3: Unbalanced Statement ❌**
```
F.cumulativeBalance = 2000
G.cumulativeBalance = 1800
Difference = |2000 - 1800| = 200
Result: FAIL (200 > 0.01)
Error: "Net Financial Assets (2000) must equal Closing Balance (1800). Difference: 200"
```

### **Scenario 4: Missing Data ❌**
```
F.cumulativeBalance = 2000
G.cumulativeBalance = 0 (no G activities entered)
Difference = |2000 - 0| = 2000
Result: FAIL (2000 > 0.01)
```

---

## Error Response Format

```json
{
  "message": "Financial statement is not balanced",
  "error": "Net Financial Assets (F) must equal Closing Balance (G)",
  "details": {
    "netFinancialAssets": 2000,
    "closingBalance": 1800,
    "difference": 200,
    "tolerance": 0.01
  },
  "errors": [{
    "field": "balance",
    "message": "Net Financial Assets (2000) must equal Closing Balance (1800). Difference: 200",
    "code": "BALANCE_MISMATCH"
  }]
}
```

---

## Validation State Storage

After successful validation, the balance state is stored:

```typescript
const insertData = {
  // ... other fields
  computedValues: balances, // Stores F, G, and all other balances
  validationState: {
    isValid: validationResult.isValid,
    isBalanced: accountingValidation.isValid,
    lastValidated: new Date().toISOString()
  }
};
```

This allows:
- Historical tracking of validation status
- Audit trail of when balances were last checked
- Quick retrieval of computed balances without recalculation

---

## Key Differences: Create vs Update

| Aspect | Create | Update |
|--------|--------|--------|
| **Input Data** | Fresh form data | Merged existing + new data |
| **Recalculation** | On raw input | On merged data |
| **Validation** | Same F = G check | Same F = G check |
| **Error Handling** | Reject creation | Reject update |
| **State Storage** | New record | Update existing record |

---

## Tolerance Rationale

### **Why 0.01?**

1. **Floating-point arithmetic**: JavaScript uses IEEE 754 double precision
   - Example: `0.1 + 0.2 = 0.30000000000000004`
   
2. **Currency rounding**: Most currencies use 2 decimal places
   - 0.01 tolerance allows for cent-level rounding differences
   
3. **Practical balance**: Strict enough to catch real errors, lenient enough for rounding

### **What Gets Caught:**

✅ **Catches:**
- Missing transactions (difference in hundreds/thousands)
- Data entry errors (wrong amounts)
- Calculation bugs (incorrect formulas)

✅ **Allows:**
- Floating-point rounding (0.005 difference)
- Currency rounding (0.01 difference)

---

## Common Validation Failures

### **1. Missing Opening Balance**
```
Problem: G activities don't include opening balance
F = 2000 (current net assets)
G = 500 (only current period surplus, no opening)
Fix: Add opening balance to Section G
```

### **2. Incorrect Stock Calculation**
```
Problem: D or E summing all quarters instead of latest
F = 7000 (wrong - summed all quarters)
G = 2000 (correct)
Fix: Ensure D and E use stock logic (latest quarter)
```

### **3. Missing Surplus/Deficit**
```
Problem: G doesn't include computed surplus
F = 2000
G = 1500 (only opening, missing +500 surplus)
Fix: Ensure G includes A - B surplus
```

---

## Testing Recommendations

### **Unit Tests:**
1. Test F = G with exact match
2. Test F = G with 0.005 difference (should pass)
3. Test F = G with 0.02 difference (should fail)
4. Test with missing D/E data
5. Test with missing G data

### **Integration Tests:**
1. Submit balanced execution form (should succeed)
2. Submit unbalanced form (should reject with 400)
3. Update balanced form to unbalanced (should reject)
4. Update unbalanced form to balanced (should succeed)

### **Edge Cases:**
1. All zeros (should pass: 0 = 0)
2. Negative balances (should work if balanced)
3. Very large numbers (test floating-point precision)
4. Multi-quarter data (ensure stock logic works)

---

## Related Files

- `apps/server/src/api/routes/execution/execution.handlers.ts` - Create/Update handlers
- `apps/server/src/api/routes/execution/execution.helpers.ts` - toBalances() function
- `apps/server/src/api/routes/execution/execution.recalculations.ts` - Recalculation logic

---

## Date
Documented: 2025-01-XX

## Author
Kiro AI Assistant
