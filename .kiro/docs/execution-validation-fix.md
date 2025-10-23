# Fix: Execution Data Validation Error

## Problem Summary

When creating or updating execution data, the validation service was failing with errors like:
```
"Validation failed"
"Q1 Amount is required"
"Q2 Amount is required"
"Q3 Amount is required"
"Q4 Amount is required"
```

Even when F = G balance was correct and all data was properly filled.

## Root Cause

### **Data Structure Mismatch**

The validation service expects **flat field structure**:
```typescript
{
  q1_amount: 1000,
  q2_amount: 1500,
  q3_amount: 2000,
  q4_amount: 2500
}
```

But execution data uses **nested activities structure**:
```typescript
{
  activities: {
    "HIV_EXEC_HOSPITAL_A_1": {
      code: "HIV_EXEC_HOSPITAL_A_1",
      name: "Government Grants",
      q1: 1000,
      q2: 1500,
      q3: 2000,
      q4: 2500,
      cumulative_balance: 7000
    },
    "HIV_EXEC_HOSPITAL_A_2": {
      // ... more activities
    }
  },
  rollups: {
    bySection: { /* ... */ },
    bySubSection: { /* ... */ }
  }
}
```

### **Validation Service Behavior**

The validation service:
1. Loads the form schema (schemaId: 11)
2. Expects fields like `q1_amount`, `q2_amount`, etc.
3. Tries to validate these flat fields
4. Finds validation rules stored as **objects** instead of **arrays**
5. Logs warnings: "Expected array but received object"
6. Falls back to treating missing fields as "required"
7. Returns validation errors for all quarter fields

## Server Logs Analysis

```
VALIDATION_WARNING: {
  "message": "Malformed validation rule detected for field: q1_amount",
  "details": {
    "fieldKey": "q1_amount",
    "fieldLabel": "Q1 Amount",
    "ruleType": "malformed",
    "error": "Expected array but received object",
    "originalRule": {}
  }
}
```

This indicates:
- The schema has fields `q1_amount`, `q2_amount`, etc.
- These fields have validation rules stored as objects `{}`
- The validation service expects rules as arrays `[]`
- When rules are malformed, it defaults to "required" validation

## Solution

### **Skip Form-Level Validation for Execution Data**

We removed the call to `validationService.validateFormData()` in both create and update handlers because:

1. **Execution data doesn't match the schema structure**
   - Schema expects flat fields
   - Execution uses nested activities

2. **We have specialized validation**
   - F = G balance check (accounting equation)
   - Rollups validation
   - Cumulative balance calculation
   - Stock vs flow logic

3. **Form-level validation is not applicable**
   - Quarter fields are nested in activities
   - Each activity has its own q1, q2, q3, q4
   - Validation would need to iterate through activities

### **Code Changes**

**Before (Create Handler):**
```typescript
// Try validation service if available
try {
  if (validationService && typeof validationService.validateFormData === 'function') {
    validationResult = await validationService.validateFormData(
      body.schemaId,
      normalizedFormData
    );

    if (!validationResult.isValid) {
      return c.json({
        message: "Validation failed",
        errors: validationResult.errors
      }, HttpStatusCodes.BAD_REQUEST);
    }
  }
} catch (validationError: any) {
  console.warn('Validation service error:', validationError);
  // Continue without validation if service fails
}
```

**After (Create Handler):**
```typescript
// SKIP form-level validation for execution data
// Execution data has a nested activities structure, not flat fields
// We use specialized validation (F = G balance check) instead
// The validation service expects flat fields like q1_amount, q2_amount
// but execution data has activities[code].q1, activities[code].q2, etc.

// Note: If we need field-level validation in the future, we should:
// 1. Create a specialized execution validation schema
// 2. Or flatten the activities structure before validation
// 3. Or extend the validation service to handle nested structures
```

Same change applied to the update handler.

## Validation Flow After Fix

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Recalculate Form Data                                    │
│    ├─ Activities get cumulative_balance                     │
│    └─ Rollups aggregate by section                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Validate Rollups Exist                                   │
│    └─ Check: rollups.bySubSection exists                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Calculate Balances                                       │
│    balances = toBalances(rollups)                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. F = G Balance Validation (CRITICAL)                      │
│    difference = |F - G|                                     │
│    tolerance = 0.01                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    ┌───────┴───────┐
                    │               │
            difference ≤ 0.01   difference > 0.01
                    │               │
                    ↓               ↓
              ✅ PASS          ❌ FAIL
           Save to DB      Return 400 Error
```

**Note:** Form-level validation is skipped entirely.

## What Validations Still Run?

### ✅ **Active Validations:**

1. **Rollups Structure Validation**
   ```typescript
   if (!normalizedFormData.rollups || !normalizedFormData.rollups.bySubSection) {
     return 400 BAD_REQUEST
   }
   ```

2. **F = G Balance Validation** (Critical)
   ```typescript
   const difference = Math.abs(netFinancialAssets - closingBalance);
   if (difference > 0.01) {
     return 400 BAD_REQUEST
   }
   ```

3. **Data Recalculation Validation**
   ```typescript
   const recalcValidation = validateRecalculation(recalculated);
   if (!recalcValidation.isValid) {
     console.warn('Recalculation validation warnings:', recalcValidation.errors);
   }
   ```

### ❌ **Skipped Validations:**

1. **Form-level field validation** (q1_amount, q2_amount, etc.)
2. **Schema-based validation rules**
3. **Field type validation** (number, string, etc.)
4. **Required field validation** (except F = G)

## Future Improvements

If we need field-level validation for execution data, we have three options:

### **Option 1: Create Specialized Execution Validation Schema**
```typescript
const executionValidationSchema = {
  activities: {
    type: 'object',
    properties: {
      '*': { // Wildcard for any activity code
        q1: { type: 'number', required: false },
        q2: { type: 'number', required: false },
        q3: { type: 'number', required: false },
        q4: { type: 'number', required: false },
        cumulative_balance: { type: 'number', required: true }
      }
    }
  },
  rollups: {
    type: 'object',
    required: true
  }
};
```

### **Option 2: Flatten Activities Before Validation**
```typescript
// Transform nested structure to flat structure
const flattenedData = {};
for (const [code, activity] of Object.entries(activities)) {
  flattenedData[`${code}_q1`] = activity.q1;
  flattenedData[`${code}_q2`] = activity.q2;
  flattenedData[`${code}_q3`] = activity.q3;
  flattenedData[`${code}_q4`] = activity.q4;
}

// Then validate
await validationService.validateFormData(schemaId, flattenedData);
```

### **Option 3: Extend Validation Service**
```typescript
// Add support for nested validation
await validationService.validateNestedFormData(schemaId, normalizedFormData, {
  nestedPaths: ['activities.*']
});
```

## Testing

### **Before Fix:**
```
POST /api/execution
{
  "schemaId": 11,
  "projectId": 1,
  "facilityId": 1,
  "formData": { /* valid execution data */ }
}

Response: 400 BAD_REQUEST
{
  "message": "Validation failed",
  "errors": [
    { "field": "q1_amount", "message": "Q1 Amount is required" },
    { "field": "q2_amount", "message": "Q2 Amount is required" },
    { "field": "q3_amount", "message": "Q3 Amount is required" },
    { "field": "q4_amount", "message": "Q4 Amount is required" }
  ]
}
```

### **After Fix:**
```
POST /api/execution
{
  "schemaId": 11,
  "projectId": 1,
  "facilityId": 1,
  "formData": { /* valid execution data with F = G balanced */ }
}

Response: 201 CREATED
{
  "id": 123,
  "formData": { /* ... */ },
  "computedValues": { /* F, G, balances */ },
  "validationState": {
    "isValid": true,
    "isBalanced": true,
    "lastValidated": "2025-01-XX..."
  }
}
```

## Files Modified

- `apps/server/src/api/routes/execution/execution.handlers.ts`
  - Function: `create` (line ~660)
  - Function: `update` (line ~920)
  - Change: Removed `validationService.validateFormData()` calls
  - Added: Explanatory comments about why validation is skipped

## Related Issues

- Validation service expects array of rules, receives object
- Schema structure mismatch (flat vs nested)
- Form-level validation not applicable to execution data structure

## Date
Fixed: 2025-01-XX

## Author
Kiro AI Assistant
