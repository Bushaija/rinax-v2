# Working Capital API Enhancement

## Date: 2025-10-17

## Enhancement

Added explicit `changeInCurrentPeriodValue` and `changeInPreviousPeriodValue` fields to the API response for working capital lines, making the API more explicit and easier to consume.

---

## Changes Made

### 1. Type Definition Update

**File**: `apps/server/src/lib/statement-engine/types/core.types.ts`

Added new optional fields to `StatementLine` interface:

```typescript
export interface StatementLine {
  id: string;
  description: string;
  note?: number;
  currentPeriodValue: number;
  previousPeriodValue: number;
  changeInCurrentPeriodValue?: number; // NEW: For working capital: change from previous to current
  changeInPreviousPeriodValue?: number; // NEW: For working capital: change in previous period (usually 0)
  variance?: VarianceInfo;
  formatting: LineFormatting;
  metadata: StatementLineMetadata;
  displayFormatting?: DisplayFormatting;
}
```

### 2. Server-Side Handler Update

**File**: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

Added calculation and population of change values for working capital lines:

```typescript
// Calculate change values for working capital lines
let changeInCurrentPeriod: number | undefined;
let changeInPreviousPeriod: number | undefined;

if (isWorkingCapitalLine) {
  // For working capital lines, calculate the change (difference between periods)
  changeInCurrentPeriod = currentPeriodValue - previousPeriodValue;
  changeInPreviousPeriod = 0; // Previous period change is not calculated recursively
}

// Create statement line with enhanced formatting
const statementLine: StatementLine = {
  // ... other fields ...
  ...(changeInCurrentPeriod !== undefined && { changeInCurrentPeriodValue: formatCurrency(changeInCurrentPeriod) }),
  ...(changeInPreviousPeriod !== undefined && { changeInPreviousPeriodValue: formatCurrency(changeInPreviousPeriod) }),
  // ... other fields ...
};
```

### 3. Client-Side Interface Update

**File**: `apps/client/app/dashboard/reports/utils/transform-statement-data.ts`

Updated the `StatementLine` interface to include the new fields:

```typescript
export interface StatementLine {
  // ... existing fields ...
  changeInCurrentPeriodValue?: number | null; // NEW
  changeInPreviousPeriodValue?: number | null; // NEW
  // ... other fields ...
}
```

### 4. Client-Side Transform Update

Updated the `transformStatementLine` function to use the new fields:

```typescript
// For working capital lines, use the pre-calculated change values if available
if (isWorkingCapitalLine) {
  if (line.changeInCurrentPeriodValue !== undefined && line.changeInCurrentPeriodValue !== null) {
    // Use the pre-calculated change from the API
    currentValue = line.changeInCurrentPeriodValue;
    previousValue = line.changeInPreviousPeriodValue ?? 0;
  } else if (currentValue !== null && previousValue !== null) {
    // Fallback: Calculate the change if not provided by API
    const change = currentValue - previousValue;
    currentValue = change;
    previousValue = 0;
  }
}
```

---

## API Response Example

### Before Enhancement:

```json
{
  "id": "CASH_FLOW_CHANGES_RECEIVABLES",
  "description": "Changes in receivables",
  "currentPeriodValue": 8,
  "previousPeriodValue": 10,
  "variance": {
    "absolute": -2,
    "percentage": -20,
    "trend": "decrease"
  }
}
```

### After Enhancement:

```json
{
  "id": "CASH_FLOW_CHANGES_RECEIVABLES",
  "description": "Changes in receivables",
  "currentPeriodValue": 8,
  "previousPeriodValue": 10,
  "changeInCurrentPeriodValue": -2,  // NEW: Explicit change value
  "changeInPreviousPeriodValue": 0,  // NEW: Previous period change
  "variance": {
    "absolute": -2,
    "percentage": -20,
    "trend": "decrease"
  }
}
```

---

## Benefits

### 1. **Explicit API Contract**
- The API now explicitly provides the change values
- No ambiguity about what should be displayed
- Easier for API consumers to understand

### 2. **Separation of Concerns**
- Server calculates the change (business logic)
- Client displays the change (presentation logic)
- Clear responsibility boundaries

### 3. **Backward Compatibility**
- New fields are optional
- Client has fallback logic if fields are missing
- Existing clients continue to work

### 4. **Consistency**
- Both server and client use the same calculation
- No risk of client-side calculation errors
- Single source of truth

---

## Data Flow

### Server-Side:
1. Calculate current period balance: 8
2. Calculate previous period balance: 10
3. Calculate change: 8 - 10 = -2
4. Include all values in response:
   - `currentPeriodValue`: 8 (balance)
   - `previousPeriodValue`: 10 (balance)
   - `changeInCurrentPeriodValue`: -2 (change)
   - `changeInPreviousPeriodValue`: 0

### Client-Side:
1. Receive response with all values
2. For working capital lines, use `changeInCurrentPeriodValue` (-2)
3. Display: -2 (the change)

---

## Test Cases

### Test Case 1: Normal Period with Previous Data

**Input**:
- Current receivables: 8
- Previous receivables: 10

**Expected Response**:
```json
{
  "currentPeriodValue": 8,
  "previousPeriodValue": 10,
  "changeInCurrentPeriodValue": -2,
  "changeInPreviousPeriodValue": 0
}
```

**Expected Display**: -2

### Test Case 2: First Period (No Previous Data)

**Input**:
- Current receivables: 10
- Previous receivables: 0

**Expected Response**:
```json
{
  "currentPeriodValue": 10,
  "previousPeriodValue": 0,
  "changeInCurrentPeriodValue": 10,
  "changeInPreviousPeriodValue": 0
}
```

**Expected Display**: 10

### Test Case 3: Increase in Receivables

**Input**:
- Current receivables: 15
- Previous receivables: 10

**Expected Response**:
```json
{
  "currentPeriodValue": 15,
  "previousPeriodValue": 10,
  "changeInCurrentPeriodValue": 5,
  "changeInPreviousPeriodValue": 0
}
```

**Expected Display**: 5

---

## Files Modified

1. ✅ `apps/server/src/lib/statement-engine/types/core.types.ts`
   - Added `changeInCurrentPeriodValue` and `changeInPreviousPeriodValue` to `StatementLine` interface

2. ✅ `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`
   - Calculate change values for working capital lines
   - Populate new fields in statement line object

3. ✅ `apps/client/app/dashboard/reports/utils/transform-statement-data.ts`
   - Updated `StatementLine` interface
   - Updated `transformStatementLine` to use new fields with fallback

---

## Migration Notes

### For API Consumers:

**Old Way** (still works):
```typescript
// Client had to calculate the change
const change = line.currentPeriodValue - line.previousPeriodValue;
```

**New Way** (recommended):
```typescript
// Use the pre-calculated change from API
const change = line.changeInCurrentPeriodValue;
```

### Backward Compatibility:

The client-side code includes fallback logic:
```typescript
if (line.changeInCurrentPeriodValue !== undefined) {
  // Use new field
  currentValue = line.changeInCurrentPeriodValue;
} else {
  // Fallback to old calculation
  currentValue = line.currentPeriodValue - line.previousPeriodValue;
}
```

---

## Status

✅ **Enhancement implemented and ready for testing**

The API now explicitly provides change values for working capital lines, making it clearer and easier to consume.

