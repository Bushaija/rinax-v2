# Carryforward Service Fix

## Date: 2025-10-17

## Problem Identified

The CarryforwardService was returning 0 for CASH_BEGINNING because it was looking for `subSection` values that don't exist in the execution data.

### Root Cause

**CarryforwardService was looking for:**
```typescript
if (data.subSection === '1') {  // Cash at bank
  cashAtBank = data.cumulative_balance || 0;
}

if (data.subSection === '2') {  // Petty cash
  pettyCash = data.cumulative_balance || 0;
}
```

**But execution data has:**
```json
"TB_EXEC_HOSPITAL_D_1": {
    "section": "D",
    "subSection": null,  // ❌ NULL instead of "1"
    "cumulative_balance": 5
},
"TB_EXEC_HOSPITAL_D_2": {
    "section": "D",
    "subSection": null,  // ❌ NULL instead of "2"
    "cumulative_balance": 5
}
```

### Impact

- CASH_BEGINNING was always 0
- Carryforward from previous period was not working
- Cash reconciliation validation was failing with large discrepancies

---

## Solution Implemented

Changed the CarryforwardService to match activities by **activity code pattern** instead of `subSection` value.

### Code Change

**File**: `apps/server/src/lib/statement-engine/services/carryforward-service.ts`

**Method**: `calculateEndingCashFromExecution()`

**Before:**
```typescript
// Check if this is a Section D activity
if (data.section === 'D') {
  // Subsection 1 = Cash at bank
  if (data.subSection === '1') {
    cashAtBank = data.cumulative_balance || 0;
  }
  
  // Subsection 2 = Petty cash
  if (data.subSection === '2') {
    pettyCash = data.cumulative_balance || 0;
  }
}
```

**After:**
```typescript
// Check if this is a Section D activity
if (data.section === 'D') {
  // Match by activity code pattern: _D_1 = Cash at bank, _D_2 = Petty cash
  if (activityCode.endsWith('_D_1')) {
    cashAtBank = data.cumulative_balance || 0;
    this.logger.debug(`Found Cash at bank (${activityCode}): cumulative_balance = ${cashAtBank}`);
  } else if (activityCode.endsWith('_D_2')) {
    pettyCash = data.cumulative_balance || 0;
    this.logger.debug(`Found Petty cash (${activityCode}): cumulative_balance = ${pettyCash}`);
  }
}
```

### Why This Works

Activity codes follow a consistent pattern:
- `{PROJECT}_EXEC_{FACILITY_TYPE}_D_1` = Cash at bank
- `{PROJECT}_EXEC_{FACILITY_TYPE}_D_2` = Petty cash

Examples:
- `TB_EXEC_HOSPITAL_D_1` = TB project, Hospital, Cash at bank
- `TB_EXEC_HOSPITAL_D_2` = TB project, Hospital, Petty cash
- `HIV_EXEC_HEALTH_CENTER_D_1` = HIV project, Health Center, Cash at bank
- `HIV_EXEC_HEALTH_CENTER_D_2` = HIV project, Health Center, Petty cash

By matching on the activity code suffix (`_D_1` and `_D_2`), we can reliably identify cash activities regardless of the `subSection` value.

---

## Expected Results After Fix

### Test Case: 2024-25 → 2025-26 Carryforward

**Given:**
- 2024-25 execution data:
  - Cash at bank (`TB_EXEC_HOSPITAL_D_1`): cumulative_balance = 5
  - Petty cash (`TB_EXEC_HOSPITAL_D_2`): cumulative_balance = 5
  - **Total CASH_ENDING = 10**

- 2025-26 execution data:
  - Cash at bank: cumulative_balance = 4
  - Petty cash: cumulative_balance = 4
  - **Total CASH_ENDING = 8**

**Expected Cash Flow Statement for 2025-26:**

```
Cash and cash equivalents at beginning of period: 10  ✅ (carried forward from 2024-25)
Net increase/decrease in cash: -2
Cash and cash equivalents at end of period: 8  ✅ (from current period event mapping)
```

**Reconciliation Validation:**
```
CASH_ENDING = CASH_BEGINNING + NET_INCREASE_CASH
8 = 10 + (-2) ✅
```

No warning should be generated because the reconciliation matches.

---

## Verification Steps

1. **Restart the server** to load the updated CarryforwardService

2. **Generate 2025-26 Cash Flow statement:**
   ```bash
   POST /api/financial-reports/generate-statement
   {
     "statementCode": "CASH_FLOW",
     "reportingPeriodId": 2,
     "projectType": "TB",
     "facilityId": 20,
     "includeComparatives": true
   }
   ```

3. **Check the response:**
   - `CASH_BEGINNING.currentPeriodValue` should be **10** (not 0)
   - `CASH_ENDING.currentPeriodValue` should be **8**
   - `CASH_ENDING.previousPeriodValue` should be **10**
   - Carryforward metadata should show:
     ```json
     "carryforward": {
       "source": "CARRYFORWARD_AGGREGATED",
       "previousPeriodEndingCash": 10,  // ✅ Not 0!
       "facilityBreakdown": [
         {"facilityId": 20, "endingCash": 10}  // ✅ Not 0!
       ]
     }
     ```

4. **Check validation warnings:**
   - Should NOT have: "Cash reconciliation discrepancy: Ending cash (8.00) does not equal Beginning cash (0.00)..."
   - Should have: No cash reconciliation warning (or a much smaller discrepancy if NET_INCREASE_CASH is slightly off)

---

## Additional Notes

### Why subSection is null

The execution data structure doesn't populate `subSection` for all activities. This is likely because:
1. The activity code already encodes the section and subsection information
2. Not all sections use subsections
3. The subsection field is optional in the data model

### Alternative Approaches Considered

1. **Update execution data to include subSection values**
   - Pros: More explicit data structure
   - Cons: Requires data migration, changes to data entry forms, affects all existing data

2. **Use event mappings instead of direct execution data query**
   - Pros: More consistent with how CASH_ENDING works
   - Cons: Requires event mapping for CASH_EQUIVALENTS_BEGIN, more complex

3. **Match by activity code pattern (CHOSEN)**
   - Pros: Works with existing data structure, no migration needed, reliable
   - Cons: Relies on naming convention

### Future Improvements

Consider standardizing how the CarryforwardService identifies cash activities:
- Use the same event mapping system that CASH_ENDING uses
- Query for `CASH_EQUIVALENTS_END` event from previous period
- This would make CASH_BEGINNING and CASH_ENDING symmetric

---

## Related Files

- `apps/server/src/lib/statement-engine/services/carryforward-service.ts` - Fixed
- `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts` - Uses CarryforwardService
- `.kiro/specs/fix-cash-ending-event-mapping/cash-ending-status.md` - Overall status
- `.kiro/specs/fix-cash-ending-event-mapping/requirements.md` - Original requirements

---

## Status

✅ **Fix implemented and ready for testing**

The CarryforwardService now correctly identifies cash activities by their activity code pattern, which matches the actual structure of the execution data.

