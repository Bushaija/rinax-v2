# Requirements: Fix Cash Ending to Use Event Mapping Only

## Introduction

The "Cash and cash equivalents at end of period" (CASH_ENDING) line in the Cash Flow statement currently uses a complex 3-tier fallback system that produces incorrect results. The system should be simplified to rely solely on event mapping, similar to how the Assets & Liabilities statement works.

## Current Problem

**Expected Behavior**:
- Cash at bank: 4
- Petty cash: 4
- Total CASH_ENDING: 8

**Actual Behavior**:
- CASH_ENDING shows: -24 (incorrect)

**Root Cause**:
The current implementation uses three calculation paths:
1. Event mapping (often fails)
2. Special total calculation (CASH_BEGINNING + NET_INCREASE_CASH)
3. HOTFIX via CarryforwardService (queries Section D directly)

This complexity leads to incorrect values and maintenance burden.

## Requirements

### Requirement 1: Simplify to Event Mapping Only

**User Story**: As a system maintainer, I want CASH_ENDING to use only event mapping, so that the calculation is transparent and consistent with other statements.

#### Acceptance Criteria

1.1 WHEN generating a Cash Flow statement THEN CASH_ENDING SHALL be calculated by summing the CASH_EQUIVALENTS_END event from aggregated data

1.2 WHEN the CASH_EQUIVALENTS_END event is properly mapped to "Cash at bank" and "Petty cash" activities THEN the sum SHALL equal the total of both activities

1.3 WHEN execution data has Cash at bank = 4 and Petty cash = 4 THEN CASH_ENDING SHALL equal 8

1.4 WHEN event mapping returns 0 THEN the system SHALL display 0 (not fall back to other calculation methods)

---

### Requirement 2: Remove Complex Fallback Logic

**User Story**: As a developer, I want to remove the 3-tier fallback system, so that the code is simpler and easier to maintain.

#### Acceptance Criteria

2.1 WHEN calculating CASH_ENDING THEN the system SHALL NOT use the special total calculation (CASH_BEGINNING + NET_INCREASE_CASH)

2.2 WHEN calculating CASH_ENDING THEN the system SHALL NOT use the HOTFIX via CarryforwardService

2.3 WHEN calculating CASH_ENDING THEN the system SHALL NOT query Section D activities directly

2.4 WHEN CASH_ENDING is in the shouldComputeTotal() list THEN it SHALL be removed from that list

---

### Requirement 3: Update Template Configuration

**User Story**: As a system administrator, I want the template to clearly indicate that CASH_ENDING uses event mapping, so that the configuration is transparent.

#### Acceptance Criteria

3.1 WHEN viewing the Cash Flow template THEN CASH_ENDING SHALL have eventCodes: ['CASH_EQUIVALENTS_END']

3.2 WHEN viewing the Cash Flow template THEN CASH_ENDING SHALL NOT have a calculationFormula

3.3 WHEN viewing the Cash Flow template THEN CASH_ENDING SHALL NOT have metadata indicating it's computed

3.4 WHEN viewing the Cash Flow template THEN CASH_ENDING SHALL be treated as a regular data line (not a total line)

---

### Requirement 4: Verify Event Mapping Configuration

**User Story**: As a data analyst, I want to verify that CASH_EQUIVALENTS_END is properly mapped to cash activities, so that the calculation is accurate.

#### Acceptance Criteria

4.1 WHEN checking configurable_event_mappings THEN "Cash at bank" activity SHALL be mapped to CASH_EQUIVALENTS_END event

4.2 WHEN checking configurable_event_mappings THEN "Petty cash" activity SHALL be mapped to CASH_EQUIVALENTS_END event

4.3 WHEN checking configurable_event_mappings THEN both mappings SHALL be active (is_active = true)

4.4 WHEN checking configurable_event_mappings THEN both mappings SHALL use mappingType = 'DIRECT'

---

### Requirement 5: Use Reconciliation Formula for Validation

**User Story**: As an accountant, I want the system to validate that CASH_ENDING equals CASH_BEGINNING + NET_INCREASE_CASH, so that I can detect data inconsistencies.

#### Acceptance Criteria

5.1 WHEN generating a Cash Flow statement THEN the system SHALL calculate the expected ending cash as CASH_BEGINNING + NET_INCREASE_CASH

5.2 WHEN the calculated CASH_ENDING differs from the expected value THEN the system SHALL include a warning in the validation results

5.3 WHEN the discrepancy is greater than 0.01 THEN the warning SHALL include the difference amount

5.4 WHEN the discrepancy is within 0.01 THEN no warning SHALL be generated

5.5 WHEN displaying the warning THEN it SHALL say "Cash reconciliation discrepancy: Ending cash (X) does not equal Beginning cash (Y) + Net increase (Z). Difference: W"

---

### Requirement 6: Remove HOTFIX Code

**User Story**: As a developer, I want to remove the HOTFIX code, so that the codebase is cleaner and easier to understand.

#### Acceptance Criteria

6.1 WHEN reviewing financial-reports.handlers.ts THEN the HOTFIX code block for CASH_ENDING SHALL be removed

6.2 WHEN reviewing financial-reports.handlers.ts THEN there SHALL be no special case for `templateLine.lineCode === 'CASH_ENDING'`

6.3 WHEN reviewing financial-reports.handlers.ts THEN there SHALL be no calls to CarryforwardService for CASH_ENDING

6.4 WHEN reviewing the code THEN the comment "The event mapping is not working correctly for cash" SHALL be removed

---

### Requirement 7: Update shouldComputeTotal Function

**User Story**: As a developer, I want CASH_ENDING removed from the special totals list, so that it's treated as a regular data line.

#### Acceptance Criteria

7.1 WHEN reviewing shouldComputeTotal() function THEN 'CASH_ENDING' SHALL NOT be in the totalLineCodes array

7.2 WHEN reviewing calculateSpecialTotal() function THEN there SHALL be no case for 'CASH_ENDING'

7.3 WHEN reviewing calculateCashEnding() function THEN it SHALL be removed entirely

---

### Requirement 8: Maintain Backward Compatibility

**User Story**: As a system user, I want existing Cash Flow statements to continue working, so that historical data remains accessible.

#### Acceptance Criteria

8.1 WHEN viewing previously generated Cash Flow statements THEN they SHALL display correctly

8.2 WHEN regenerating a Cash Flow statement for a past period THEN it SHALL use the new event mapping approach

8.3 WHEN comparing old and new statements THEN the values MAY differ (due to bug fix)

8.4 WHEN the values differ THEN the new values SHALL be correct based on execution data

---

## Success Criteria

The implementation is successful when:

1. ✅ CASH_ENDING = 8 when Cash at bank = 4 and Petty cash = 4
2. ✅ No HOTFIX code exists for CASH_ENDING
3. ✅ No special total calculation for CASH_ENDING
4. ✅ Event mapping is the only calculation method
5. ✅ Reconciliation validation warns of discrepancies
6. ✅ Code is simpler and easier to maintain
7. ✅ Template configuration is clear and accurate

## Out of Scope

- Fixing CASH_BEGINNING (still uses carryforward, which is correct)
- Fixing working capital calculations (separate issue)
- Changing how other statements work
- Modifying the CarryforwardService (still needed for CASH_BEGINNING)

## Dependencies

- Event mapping configuration in `configurable_event_mappings` table
- Template configuration in `statement_templates` table
- Data aggregation engine must correctly sum CASH_EQUIVALENTS_END events

## Risks

1. **Risk**: Event mapping may not be configured correctly
   - **Mitigation**: Verify mappings exist before removing HOTFIX

2. **Risk**: Historical statements may show different values
   - **Mitigation**: Document that this is a bug fix, new values are correct

3. **Risk**: Users may rely on the reconciliation formula
   - **Mitigation**: Keep reconciliation as validation, not calculation

## Notes

- The reconciliation formula (CASH_BEGINNING + NET_INCREASE_CASH) is theoretically correct but should be used for validation, not calculation
- The event mapping approach is more reliable because it uses actual reported data
- This change aligns CASH_ENDING with how other balance sheet items work (Assets & Liabilities statement)
