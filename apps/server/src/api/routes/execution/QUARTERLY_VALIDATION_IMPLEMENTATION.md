# Quarterly F = G Validation Implementation

## Change Summary

**Changed from:** Cumulative balance validation only  
**Changed to:** Quarterly balance validation for all quarters with data

## Rationale

### Why Quarterly Validation?

1. **Matches Data Entry Workflow**
   - Users enter execution data **quarterly** (Q1, Q2, Q3, Q4)
   - Validation should happen **when data is entered**
   - Immediate feedback prevents cascading errors

2. **Accounting Standard**
   - Balance sheet must balance at **each reporting date**
   - F = G is the fundamental accounting identity: **Net Assets = Equity**
   - This must hold true at the end of each quarter, not just year-end

3. **Early Error Detection**
   - Catches mistakes **immediately** when quarter is entered
   - User knows exactly which quarter has the problem
   - Easier to fix while data is fresh in mind

4. **Real-World Testing**
   - User data showed Q1 and Q2 balanced quarterly ✅
   - But cumulative didn't balance ❌
   - This proved quarterly is the natural balance point

## Implementation Details

### Validation Logic

```typescript
// Validate each quarter that has data
const quarters = ['q1', 'q2', 'q3', 'q4'];
const imbalancedQuarters = [];

for (const quarter of quarters) {
  const F = balances.netFinancialAssets[quarter];
  const G = balances.closingBalance[quarter];
  
  // Only validate quarters with data
  if (F !== undefined && F !== null && G !== undefined && G !== null) {
    const difference = Math.abs(F - G);
    
    if (difference > tolerance) {
      imbalancedQuarters.push({
        quarter: quarter.toUpperCase(),
        F, G, difference
      });
    }
  }
}

// Reject if any quarter is imbalanced
if (imbalancedQuarters.length > 0) {
  return BAD_REQUEST with detailed error per quarter;
}
```

### Key Features

1. **Selective Validation**
   - Only validates quarters that have data
   - Allows partial entry (Q1 only, Q1+Q2, etc.)
   - Doesn't require all 4 quarters

2. **Detailed Error Messages**
   - Shows which quarter(s) failed
   - Shows F and G values for each failed quarter
   - Shows the difference amount
   - Helps user pinpoint the exact problem

3. **Tolerance for Rounding**
   - Allows 0.01 difference (1 cent)
   - Prevents false failures from floating-point arithmetic
   - Standard accounting practice

### Example Error Response

```json
{
  "message": "Financial statement is not balanced",
  "error": "Net Financial Assets (F) must equal Closing Balance (G) for each quarter",
  "details": {
    "imbalancedQuarters": [
      {
        "quarter": "Q2",
        "F": -5,
        "G": -10,
        "difference": 5
      }
    ],
    "tolerance": 0.01
  },
  "errors": [
    {
      "field": "balance_q2",
      "message": "Q2: F (-5) ≠ G (-10). Difference: 5",
      "code": "QUARTERLY_BALANCE_MISMATCH"
    }
  ]
}
```

## Files Changed

### 1. `apps/server/src/api/routes/execution/execution.handlers.ts`

**CREATE Handler (Line ~710-755):**
- Replaced cumulative validation with quarterly validation
- Added loop through all quarters
- Added detailed error reporting per quarter

**UPDATE Handler (Line ~950-1010):**
- Same changes as CREATE handler
- Ensures consistency across both operations

## Testing Scenarios

### Scenario 1: All Quarters Balance ✅

```javascript
Q1: F = -5, G = -5  → Balanced ✅
Q2: F = -5, G = -5  → Balanced ✅
Q3: F = -5, G = -5  → Balanced ✅
Q4: F = -5, G = -5  → Balanced ✅

Result: Submission accepted
```

### Scenario 2: One Quarter Imbalanced ❌

```javascript
Q1: F = -5, G = -5  → Balanced ✅
Q2: F = -5, G = -10 → Imbalanced ❌ (diff: 5)

Result: Submission rejected with error:
"Q2: F (-5) ≠ G (-10). Difference: 5"
```

### Scenario 3: Partial Entry (Q1 Only) ✅

```javascript
Q1: F = -5, G = -5  → Balanced ✅
Q2: undefined       → Not validated (no data)
Q3: undefined       → Not validated (no data)
Q4: undefined       → Not validated (no data)

Result: Submission accepted
```

### Scenario 4: Multiple Quarters Imbalanced ❌

```javascript
Q1: F = -5, G = -5  → Balanced ✅
Q2: F = -5, G = -10 → Imbalanced ❌
Q3: F = -5, G = -8  → Imbalanced ❌
Q4: F = -5, G = -5  → Balanced ✅

Result: Submission rejected with errors for Q2 and Q3
```

### Scenario 5: Rounding Tolerance ✅

```javascript
Q1: F = -5.004, G = -5.001 → Difference: 0.003 < 0.01 ✅

Result: Submission accepted (within tolerance)
```

## Impact on Users

### Positive Impacts ✅

1. **Immediate Feedback**
   - Users know right away if their quarter balances
   - No waiting until year-end to discover errors

2. **Clear Guidance**
   - Error messages show exactly which quarter is wrong
   - Shows the actual F and G values
   - Shows how much they're off by

3. **Prevents Cascading Errors**
   - Fix Q1 before entering Q2
   - Each quarter builds on a solid foundation

4. **Matches Workflow**
   - Validates as they work (quarterly)
   - Natural checkpoint at each quarter-end

### Potential Challenges ⚠️

1. **Stricter Validation**
   - Users must balance each quarter
   - Can't defer balancing to year-end
   - May require more careful data entry

2. **Learning Curve**
   - Users need to understand quarterly balancing
   - May need training on G section entries
   - Documentation and examples needed

## Migration Considerations

### Existing Data

**Question:** What about existing execution data that may not balance quarterly?

**Options:**

1. **Grandfather Existing Data**
   - Only apply validation to new/updated entries
   - Don't retroactively validate old data
   - Add a data quality report for review

2. **Validation Endpoint**
   - Create `GET /execution/{id}/validate` endpoint
   - Allow checking existing data without blocking
   - Generate reports of imbalanced entries

3. **Bulk Validation Script**
   - Run validation on all existing data
   - Generate report of issues
   - Allow facilities to fix gradually

### Recommended Approach

```typescript
// Add validation endpoint for existing data
export const validateExecution: AppRouteHandler<ValidateRoute> = async (c) => {
  const { id } = c.req.param();
  const execution = await getExecution(id);
  
  const balances = toBalances(execution.formData.rollups);
  const quarters = ['q1', 'q2', 'q3', 'q4'];
  const validation = {
    isBalanced: true,
    quarters: {}
  };
  
  for (const quarter of quarters) {
    const F = balances.netFinancialAssets[quarter];
    const G = balances.closingBalance[quarter];
    
    if (F !== undefined && G !== undefined) {
      const balanced = Math.abs(F - G) < 0.01;
      validation.quarters[quarter] = {
        F, G,
        balanced,
        difference: F - G
      };
      if (!balanced) validation.isBalanced = false;
    }
  }
  
  return c.json(validation);
};
```

## Documentation Updates Needed

1. **User Guide**
   - Explain quarterly balancing requirement
   - Show examples of balanced vs imbalanced
   - Provide troubleshooting tips

2. **API Documentation**
   - Update error response examples
   - Document new error codes
   - Show validation logic

3. **Training Materials**
   - Create video tutorial
   - Provide sample data
   - Common mistakes and fixes

## Future Enhancements

### 1. Validation Warnings (Soft Validation)

Allow saving as draft with warnings:

```typescript
if (isDraft) {
  // Save with warnings, don't block
  warnings.push(...imbalancedQuarters);
} else {
  // Submission requires balance
  if (imbalancedQuarters.length > 0) {
    return BAD_REQUEST;
  }
}
```

### 2. Balance Helper UI

Show real-time balance status:

```
Quarter 1: F = -5, G = -5 ✅ Balanced
Quarter 2: F = -5, G = -10 ❌ Imbalanced (diff: 5)
```

### 3. Auto-Adjustment Suggestions

```
To balance Q2:
- Adjust "Accumulated Surplus/Deficit" by +5
- Or adjust "Prior Year Adjustment" by +5
- Or adjust Section D/E activities
```

## Conclusion

Quarterly validation is the **correct approach** because:

1. ✅ Matches data entry workflow
2. ✅ Enforces accounting standards
3. ✅ Provides immediate feedback
4. ✅ Prevents cascading errors
5. ✅ Easier to debug and fix

The implementation is **complete and ready** for testing with real user data.

## Date

Implemented: October 16, 2025
