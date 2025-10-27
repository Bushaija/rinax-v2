# Task 6 Implementation Summary: Add Validation Rules for Facility-Level Statements

## Overview
Implemented comprehensive validation rules for facility-level budget statements to ensure data quality and provide meaningful feedback when facilities have incomplete data.

## Implementation Details

### Subtask 6.1: Implement Facility Data Completeness Validation

**Location:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

**Function Added:** `validateFacilityDataCompleteness()`

This function performs the following validations:

1. **Check Planning Data Availability**
   - Validates if the facility has planning (budget) data for the reporting period
   - Uses `planningData.facilityTotals` to determine data presence

2. **Check Execution Data Availability**
   - Validates if the facility has execution (actual) data for the reporting period
   - Uses `executionData.facilityTotals` to determine data presence

3. **Generate Warnings**
   - **Budget without Actual**: When facility has planning data but no execution data
     - Warning: "{FacilityName} has budget but no actual expenditure recorded for this period"
   - **Actual without Budget**: When facility has execution data but no planning data
     - Warning: "{FacilityName} has expenditure but no budget allocated for this period"

4. **Generate Errors**
   - **No Data**: When facility has neither planning nor execution data
     - Error: "No data available for {FacilityName} in the specified reporting period"
     - This is a critical error that prevents statement generation

**Key Features:**
- Only performs detailed validation for FACILITY aggregation level
- For DISTRICT and PROVINCE levels, relies on data completeness metadata
- Retrieves facility name from database for user-friendly error messages
- Returns structured validation result with warnings, errors, and hasData flag

### Subtask 6.2: Integrate Validation into Statement Generation

**Location:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts` (generateStatement handler)

**Integration Point:** After data collection (Step 6), before carryforward processing

**Implementation:**

1. **Call Validation Function**
   ```typescript
   const facilityValidation = await validateFacilityDataCompleteness(
     aggregationLevel,
     effectiveFacilityIds,
     planningData,
     executionData,
     reportingPeriodId
   );
   ```

2. **Handle Critical Errors**
   - If validation errors exist, return 404 NOT_FOUND response immediately
   - Response includes:
     - Error messages
     - Warning messages
     - Context (aggregationLevel, facilityIds, statementCode, reportingPeriodId)
   - Prevents statement generation for facilities with no data

3. **Include Warnings in Results**
   - Validation warnings are added to `facilityDataWarnings` array
   - These warnings are later included in the statement response
   - Allows statement generation to proceed with warnings

4. **Maintain Backward Compatibility**
   - Legacy facility data check remains in place
   - New validation enhances existing checks without breaking changes

## Requirements Satisfied

### Requirement 6.1: Validate Planning Data
✅ Checks if facility has planning data for reporting period

### Requirement 6.2: Validate Execution Data
✅ Checks if facility has execution data for reporting period

### Requirement 6.3: Warning for Budget without Actual
✅ Adds warning when facility has budget but no actual expenditure

### Requirement 6.4: Warning for Actual without Budget
✅ Adds warning when facility has expenditure but no budget

### Requirement 6.5: Error for No Data
✅ Returns error when facility has neither planning nor execution data

## Error Handling

### Critical Errors (HTTP 404)
- Facility has no data for the specified reporting period
- Statement generation is blocked
- User receives clear error message with facility name

### Warnings (Included in Response)
- Facility has budget but no actual expenditure
- Facility has expenditure but no budget
- Statement generation proceeds with warnings
- User can review warnings in validation results

## Testing Considerations

### Unit Test Scenarios
1. Facility with complete data (planning + execution) → No warnings or errors
2. Facility with only planning data → Warning generated
3. Facility with only execution data → Warning generated
4. Facility with no data → Error generated, statement blocked
5. District/Province aggregation → Validation skipped (uses metadata)

### Integration Test Scenarios
1. Generate facility-level statement with complete data → Success
2. Generate facility-level statement with only budget → Success with warning
3. Generate facility-level statement with only actual → Success with warning
4. Generate facility-level statement with no data → 404 error
5. Generate district statement → No facility-level validation

## Benefits

1. **Data Quality Assurance**
   - Ensures facilities have appropriate data before generating statements
   - Prevents misleading statements from incomplete data

2. **User Experience**
   - Clear, actionable error messages with facility names
   - Warnings inform users of data gaps without blocking functionality
   - Helps users identify data entry issues

3. **System Integrity**
   - Validates data completeness at the API level
   - Prevents downstream errors from missing data
   - Maintains consistency across aggregation levels

4. **Backward Compatibility**
   - New validation enhances existing checks
   - No breaking changes to API
   - Legacy behavior preserved for district/province aggregation

## Future Enhancements

1. **Granular Validation**
   - Validate specific event codes or categories
   - Check for minimum data thresholds

2. **Historical Validation**
   - Compare with previous periods
   - Identify unusual data patterns

3. **Batch Validation**
   - Validate multiple facilities at once
   - Provide summary of data completeness across district/province

4. **Validation Reporting**
   - Generate data completeness reports
   - Track validation trends over time
