# NET_ASSETS_CHANGES Statement Implementation

## Overview
This document describes the implementation of special processing logic for the NET_ASSETS_CHANGES statement, which has a unique three-column structure (Accumulated Surplus, Adjustments, Total) instead of the standard current/previous period comparison.

## Changes Made

### 1. Enhanced Main Handler Logic
**File:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

Added special processing logic after the working capital logic (around line 784):

```typescript
// Special processing for NET_ASSETS_CHANGES statement
let accumulatedSurplus: number | null = null;
let adjustments: number | null = null;
let total: number | null = null;

if (statementCode === 'NET_ASSETS_CHANGES') {
  const netAssetsResult = await processNetAssetsChangesStatement(
    templateLine,
    aggregatedData,
    periodComparison,
    eventIdToCodeMap,
    customMappings,
    formulaEngine,
    statementLines
  );
  
  currentPeriodValue = netAssetsResult.currentPeriodValue;
  previousPeriodValue = netAssetsResult.previousPeriodValue;
  accumulatedSurplus = netAssetsResult.accumulatedSurplus;
  adjustments = netAssetsResult.adjustments;
  total = netAssetsResult.total;
  isWorkingCapitalComputed = true; // Skip normal processing
}
```

### 2. Statement Line Creation Enhancement
Updated the statement line creation to include NET_ASSETS_CHANGES specific fields (around line 1003):

```typescript
// Add NET_ASSETS_CHANGES specific fields
...(statementCode === 'NET_ASSETS_CHANGES' && {
  accumulatedSurplus: accumulatedSurplus !== null ? formatCurrency(accumulatedSurplus) : null,
  adjustments: adjustments !== null ? formatCurrency(adjustments) : null,
  total: total !== null ? formatCurrency(total) : null
}),
```

### 3. Core Processing Function
**Function:** `processNetAssetsChangesStatement`

This function handles the three-column logic based on the `columnType` metadata:

#### Column Types:
- **ACCUMULATED**: Shows carryforward balances from previous periods
- **ADJUSTMENT**: Shows changes in balances during the current period
- **TOTAL**: Calculates sum of accumulated surplus + adjustments

#### Logic Flow:
1. **ACCUMULATED columns**: Display previous period ending balances
2. **ADJUSTMENT columns**: Calculate period changes from event data
   - Assets (cash, receivables, investments): Positive adjustments
   - Liabilities (payables, borrowing): Negative adjustments
   - Net surplus: Calculated from revenue minus expenses
3. **TOTAL columns**: Sum of accumulated + adjustments

### 4. Helper Functions
**Function:** `getLineValue`

Retrieves values from previously calculated statement lines, with priority:
1. `total` value (if available)
2. `adjustments` value (if available)
3. `currentPeriodValue` (fallback)

## Event Code Mapping

The implementation properly handles event code mapping from execution activities:

| Statement Line | Event Codes | Execution Activities |
|----------------|-------------|---------------------|
| CASH_EQUIVALENT_PREV_CURRENT | CASH_EQUIVALENTS_END | Cash at bank, Petty cash |
| CASH_EQUIVALENT_CURRENT_NEXT | CASH_EQUIVALENTS_BEGIN | Cash at bank, Petty cash |
| RECEIVABLES_PREV_CURRENT | RECEIVABLES_EXCHANGE, RECEIVABLES_NON_EXCHANGE | Receivables (VAT refund), Other Receivables |
| PAYABLES_PREV_CURRENT | PAYABLES | Salaries on borrowed funds, Payable - Maintenance & Repairs, etc. |

## Testing

### Test Request
```json
{
  "statementCode": "NET_ASSETS_CHANGES",
  "reportingPeriodId": 2,
  "projectType": "TB",
  "facilityId": 20,
  "includeComparatives": true,
  "customMappings": {
    "propertyName*": null
  }
}
```

### Expected Response Structure
```json
{
  "statement": {
    "statementCode": "NET_ASSETS_CHANGES",
    "lines": [
      {
        "id": "NET_ASSETS_CASH_EQUIVALENT_PREV_CURRENT",
        "description": "Cash and cash equivalent",
        "currentPeriodValue": "0",
        "previousPeriodValue": "0",
        "accumulatedSurplus": null,
        "adjustments": "100000",
        "total": "100000",
        "metadata": {
          "lineCode": "CASH_EQUIVALENT_PREV_CURRENT",
          "columnType": "ADJUSTMENT"
        }
      }
    ]
  }
}
```

## Key Features

1. **Three-Column Structure**: Properly handles accumulated surplus, adjustments, and total columns
2. **Event Code Mapping**: Correctly maps execution activities to financial events
3. **Period Logic**: Handles both previous and current period data appropriately
4. **Asset/Liability Logic**: Assets increase net assets (positive), liabilities decrease (negative)
5. **Formula Support**: Supports calculated lines like net surplus/deficit
6. **Data Flow**: Properly aggregates data from execution activities through event mappings

## Troubleshooting

### Common Issues:
1. **All zeros**: Check if execution data exists for the specified facility and period
2. **Missing adjustments**: Verify event code mappings in `configurable-event-mappings.ts`
3. **Incorrect totals**: Check the calculation logic in `calculateBalanceJuneCurrent` and `calculateBalancePeriodEnd`

### Debug Steps:
1. Check if `aggregatedData.eventTotals` contains the expected event codes
2. Verify `eventIdToCodeMap` has correct mappings
3. Ensure execution activities are properly mapped to events
4. Check if the facility has data for the specified reporting period

## Files Modified

1. `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`
   - Added special processing logic
   - Enhanced statement line creation
   - Added `processNetAssetsChangesStatement` function
   - Added `getLineValue` helper function

## Next Steps

1. Test the implementation with real data
2. Verify all event codes are properly mapped
3. Test with different facilities and reporting periods
4. Add validation for data consistency
5. Consider adding carryforward logic for multi-year statements
