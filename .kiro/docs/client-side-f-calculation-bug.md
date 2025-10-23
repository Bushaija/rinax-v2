# Client-Side F = D - E Calculation Bug

## Problem Summary

The client-side execution form (`use-execution-form.ts`) has the **same bug** as the server-side had: it calculates F's cumulative balance by **summing all quarters** instead of using **stock logic** (latest quarter).

## Location

**File:** `apps/client/hooks/use-execution-form.ts`  
**Function:** `deriveDiff()` (line ~519)  
**Context:** Used to calculate F = D - E

## The Bug

```typescript
// Client-side derived sections: C = A - B, F = D - E
function deriveDiff(a?: { q1: number; q2: number; q3: number; q4: number }, b?: { q1: number; q2: number; q3: number; q4: number }) {
  const safeA = a || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const safeB = b || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const q1 = safeA.q1 - safeB.q1;
  const q2 = safeA.q2 - safeB.q2;
  const q3 = safeA.q3 - safeB.q3;
  const q4 = safeA.q4 - safeB.q4;
  
  // ❌ BUG: This sums all quarters (flow logic)
  const cumulativeBalance = q1 + q2 + q3 + q4;
  
  return { q1, q2, q3, q4, cumulativeBalance };
}

// Used for both C and F:
const cDerived = deriveDiff(catLocalTotals["A"], catLocalTotals["B"]); // ✅ OK - C is flow
const fDerived = deriveDiff(catLocalTotals["D"], catLocalTotals["E"]); // ❌ WRONG - F should be stock
```

## Why This is Wrong

### **C = A - B (Correct to use flow logic)**
- A (Receipts) is flow → sum all quarters ✅
- B (Expenditures) is flow → sum all quarters ✅
- C (Surplus/Deficit) is flow → sum all quarters ✅

### **F = D - E (Incorrect to use flow logic)**
- D (Financial Assets) is **stock** → latest quarter only ✅
- E (Financial Liabilities) is **stock** → latest quarter only ✅
- F (Net Financial Assets) should be **stock** → latest quarter only ❌

## Example Demonstrating the Bug

```typescript
// Section D (Financial Assets) - Stock
catLocalTotals["D"] = {
  q1: 1000,  // Q1 balance
  q2: 1500,  // Q2 balance (not cumulative)
  q3: 2000,  // Q3 balance
  q4: 2500   // Q4 balance (current)
}

// Section E (Financial Liabilities) - Stock
catLocalTotals["E"] = {
  q1: 500,   // Q1 balance
  q2: 600,   // Q2 balance
  q3: 700,   // Q3 balance
  q4: 800    // Q4 balance (current)
}

// Current calculation (WRONG):
fDerived = deriveDiff(D, E)
fDerived.q1 = 1000 - 500 = 500
fDerived.q2 = 1500 - 600 = 900
fDerived.q3 = 2000 - 700 = 1300
fDerived.q4 = 2500 - 800 = 1700
fDerived.cumulativeBalance = 500 + 900 + 1300 + 1700 = 4400 ❌

// Should be (CORRECT):
fDerived.cumulativeBalance = 1700 (Q4 value only) ✅
// Because F represents net position at Q4, not sum of all quarters
```

## Impact

### **UI Display**
- Section F header shows **incorrect cumulative balance**
- Shows 4400 instead of 1700 in the example above
- Misleads users about actual net financial position

### **F = G Validation**
- Client-side validation may show "balanced" when it's not
- Or show "unbalanced" when it actually is
- Depends on whether G also has the same calculation error

### **Data Submission**
- Server-side validation will catch this (after our fix)
- But user sees confusing error: "F = G failed" even though UI shows them as equal
- Creates poor user experience

## The Fix

We need to create **two separate functions**:

1. **deriveDiffFlow()** - For flow sections (C = A - B)
2. **deriveDiffStock()** - For stock sections (F = D - E)

### **Option 1: Separate Functions**

```typescript
// For flow sections (C = A - B)
function deriveDiffFlow(
  a?: { q1: number; q2: number; q3: number; q4: number }, 
  b?: { q1: number; q2: number; q3: number; q4: number }
) {
  const safeA = a || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const safeB = b || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const q1 = safeA.q1 - safeB.q1;
  const q2 = safeA.q2 - safeB.q2;
  const q3 = safeA.q3 - safeB.q3;
  const q4 = safeA.q4 - safeB.q4;
  const cumulativeBalance = q1 + q2 + q3 + q4; // Sum all quarters
  return { q1, q2, q3, q4, cumulativeBalance };
}

// For stock sections (F = D - E)
function deriveDiffStock(
  a?: { q1: number; q2: number; q3: number; q4: number }, 
  b?: { q1: number; q2: number; q3: number; q4: number }
) {
  const safeA = a || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const safeB = b || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const q1 = safeA.q1 - safeB.q1;
  const q2 = safeA.q2 - safeB.q2;
  const q3 = safeA.q3 - safeB.q3;
  const q4 = safeA.q4 - safeB.q4;
  
  // Use latest quarter value (Q4 in this case)
  // In a real implementation, we'd detect which quarter is latest
  const cumulativeBalance = q4; // Latest quarter only
  
  return { q1, q2, q3, q4, cumulativeBalance };
}

// Usage:
const cDerived = deriveDiffFlow(catLocalTotals["A"], catLocalTotals["B"]);
const fDerived = deriveDiffStock(catLocalTotals["D"], catLocalTotals["E"]);
```

### **Option 2: Single Function with Type Parameter**

```typescript
function deriveDiff(
  a?: { q1: number; q2: number; q3: number; q4: number }, 
  b?: { q1: number; q2: number; q3: number; q4: number },
  type: 'flow' | 'stock' = 'flow'
) {
  const safeA = a || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const safeB = b || { q1: 0, q2: 0, q3: 0, q4: 0 };
  const q1 = safeA.q1 - safeB.q1;
  const q2 = safeA.q2 - safeB.q2;
  const q3 = safeA.q3 - safeB.q3;
  const q4 = safeA.q4 - safeB.q4;
  
  let cumulativeBalance: number;
  
  if (type === 'stock') {
    // For stock sections, use latest quarter with data
    // Check in reverse order (Q4 -> Q3 -> Q2 -> Q1)
    if (q4 !== 0 || (safeA.q4 !== 0 || safeB.q4 !== 0)) {
      cumulativeBalance = q4;
    } else if (q3 !== 0 || (safeA.q3 !== 0 || safeB.q3 !== 0)) {
      cumulativeBalance = q3;
    } else if (q2 !== 0 || (safeA.q2 !== 0 || safeB.q2 !== 0)) {
      cumulativeBalance = q2;
    } else {
      cumulativeBalance = q1;
    }
  } else {
    // For flow sections, sum all quarters
    cumulativeBalance = q1 + q2 + q3 + q4;
  }
  
  return { q1, q2, q3, q4, cumulativeBalance };
}

// Usage:
const cDerived = deriveDiff(catLocalTotals["A"], catLocalTotals["B"], 'flow');
const fDerived = deriveDiff(catLocalTotals["D"], catLocalTotals["E"], 'stock');
```

## Recommended Solution

**Option 2** is better because:
1. Single function to maintain
2. Clear intent with type parameter
3. Easier to extend if needed
4. Consistent with server-side logic

## Additional Considerations

### **catLocalTotals["D"] and catLocalTotals["E"]**

We need to verify that `catLocalTotals` for D and E sections already use stock logic. Let me check the code that builds these totals...

Looking at the code, `catLocalTotals` are built by summing child rows:

```typescript
const catTotals = sumRows(children);
const normalizedCatTotals = {
  q1: catTotals.q1,
  q2: catTotals.q2,
  q3: catTotals.q3,
  q4: catTotals.q4,
  cumulativeBalance: typeof catTotals.cumulativeBalance === "number"
    ? catTotals.cumulativeBalance
    : (catTotals.q1 + catTotals.q2 + catTotals.q3 + catTotals.q4),
};
catLocalTotals[letter] = normalizedCatTotals;
```

The `sumRows()` function sums `cumulativeBalance` from child rows:

```typescript
function sumRows(rows: TableRow[]): { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number } {
  return rows.reduce(
    (acc, r) => {
      // ... logic to sum q1, q2, q3, q4, cumulativeBalance
      acc.cumulativeBalance += Number(r.cumulativeBalance || 0);
      return acc;
    },
    { q1: 0, q2: 0, q3: 0, q4: 0, cumulativeBalance: 0 }
  );
}
```

**Good news:** Individual D and E activities already use stock logic in `buildActivityRow()`:

```typescript
// Stock sections (D, E) use latest quarter with data (including explicit zeros)
if (sectionCode === 'D' || sectionCode === 'E') {
  // ... logic to use latest quarter
  cumulativeBalance = q4; // (or q3, q2, q1 depending on what's reported)
}
```

So `catLocalTotals["D"]` and `catLocalTotals["E"]` should have:
- `q1`, `q2`, `q3`, `q4`: Sum of all D/E activities for that quarter
- `cumulativeBalance`: Sum of all D/E activities' latest quarter values

This means `catLocalTotals["D"]` and `catLocalTotals["E"]` are **already correct** for stock sections!

The bug is **only in the `deriveDiff()` function** which incorrectly sums the quarterly differences.

## Testing

### **Before Fix:**
```typescript
D.q1 = 1000, D.q2 = 1500, D.q3 = 2000, D.q4 = 2500
E.q1 = 500,  E.q2 = 600,  E.q3 = 700,  E.q4 = 800

F.q1 = 500, F.q2 = 900, F.q3 = 1300, F.q4 = 1700
F.cumulativeBalance = 4400 ❌ (sum of all quarters)
```

### **After Fix:**
```typescript
D.q1 = 1000, D.q2 = 1500, D.q3 = 2000, D.q4 = 2500
E.q1 = 500,  E.q2 = 600,  E.q3 = 700,  E.q4 = 800

F.q1 = 500, F.q2 = 900, F.q3 = 1300, F.q4 = 1700
F.cumulativeBalance = 1700 ✅ (Q4 value only - latest quarter)
```

## Files to Modify

- `apps/client/hooks/use-execution-form.ts`
  - Function: `deriveDiff()` (line ~519)
  - Add type parameter or create separate function
  - Update usage for F calculation

## Related Issues

- Server-side had the same bug (already fixed)
- Client and server must use consistent logic
- F = G validation depends on correct F calculation

## Date
Identified: 2025-01-XX

## Author
Kiro AI Assistant
