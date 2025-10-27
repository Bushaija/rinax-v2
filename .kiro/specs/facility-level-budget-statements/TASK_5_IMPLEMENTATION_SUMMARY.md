# Task 5 Implementation Summary: Update Statement Generation Handler

## Overview
Successfully updated the statement generation handler to support flexible aggregation levels (FACILITY, DISTRICT, PROVINCE) with proper parameter parsing, aggregation level determination, metadata generation, and facility breakdown functionality.

## Implementation Details

### Subtask 5.1: Parse New Request Parameters ✅
**Location:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts` (lines 329-338)

**Changes:**
- Extracted `facilityId` from request body as `requestedFacilityId` (optional parameter)
- Added `aggregationLevel` parameter with default value 'DISTRICT'
- Added `includeFacilityBreakdown` parameter with default value `false`
- All parameters properly typed and validated through existing Zod schemas

**Code:**
```typescript
const {
  statementCode,
  reportingPeriodId,
  projectType,
  facilityId: requestedFacilityId, // NEW: Extract facilityId from request (optional)
  aggregationLevel = 'DISTRICT', // NEW: Default to district (Subtask 5.1)
  includeFacilityBreakdown = false, // NEW: Default to false (Subtask 5.1)
  includeComparatives = true,
  customMappings = {}
} = requestBody;
```

### Subtask 5.2: Integrate Aggregation Level Determination ✅
**Location:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts` (lines 340-377)

**Changes:**
- Integrated `determineEffectiveFacilityIds()` function call with proper error handling
- Handled validation errors (missing facilityId for FACILITY level)
- Handled access control failures (unauthorized facility access)
- Used `effectiveFacilityIds` in data filters for proper data collection
- Created `primaryFacilityId` for backward compatibility with existing code

**Error Handling:**
```typescript
try {
  effectiveFacilityIds = await determineEffectiveFacilityIds(
    aggregationLevel,
    requestedFacilityId,
    userContext
  );
} catch (error: any) {
  // Handle validation errors
  if (error.message === 'facilityId is required when aggregationLevel is FACILITY') {
    return c.json({ message: error.message, ... }, 400);
  }
  
  // Handle access control failures
  if (error.message === 'Access denied to facility') {
    return c.json({ message: 'Access denied to facility', ... }, 403);
  }
  
  throw error; // Re-throw unexpected errors
}
```

**Data Filters Update:**
```typescript
const dataFilters: DataFilters = {
  projectId: project.id,
  facilityId: primaryFacilityId, // Backward compatibility
  facilityIds: effectiveFacilityIds, // NEW: Use determined facility IDs
  reportingPeriodId,
  projectType,
  entityTypes: statementCode === 'BUDGET_VS_ACTUAL'
    ? [EventType.PLANNING, EventType.EXECUTION]
    : [EventType.EXECUTION]
};
```

### Subtask 5.3: Add Aggregation Metadata to Response ✅
**Location:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

**Changes:**
- Called `buildAggregationMetadata()` after data aggregation for both Budget vs Actual and standard statements
- Included `aggregationMetadata` in response object
- Metadata includes:
  - Aggregation level (FACILITY, DISTRICT, or PROVINCE)
  - Level-specific metadata (facility/district/province details)
  - Facilities included in aggregation
  - Data completeness statistics

**Budget vs Actual (lines 1050-1056):**
```typescript
const aggregationMetadata = await buildAggregationMetadata(
  aggregationLevel,
  effectiveFacilityIds,
  planningData,
  executionData
);
```

**Standard Statements (lines 1130-1136):**
```typescript
const aggregationMetadata = await buildAggregationMetadata(
  aggregationLevel,
  effectiveFacilityIds,
  planningData,
  executionData
);
```

### Subtask 5.4: Add Facility Breakdown to Response ✅
**Location:** `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

**Changes:**
- Called `generateFacilityBreakdown()` when `includeFacilityBreakdown` is true
- Skipped breakdown for FACILITY aggregation level (redundant)
- Included breakdown for DISTRICT and PROVINCE levels
- Breakdown includes per-facility budget, actual, variance, and favorability

**Budget vs Actual (lines 1058-1068):**
```typescript
let facilityBreakdown: any[] | undefined;
if (includeFacilityBreakdown && aggregationLevel !== 'FACILITY') {
  facilityBreakdown = await generateFacilityBreakdown(
    effectiveFacilityIds,
    planningData,
    executionData
  );
}
```

**Standard Statements (lines 1138-1148):**
```typescript
let facilityBreakdown: any[] | undefined;
if (includeFacilityBreakdown && aggregationLevel !== 'FACILITY') {
  facilityBreakdown = await generateFacilityBreakdown(
    effectiveFacilityIds,
    planningData,
    executionData
  );
}
```

### Subtask 5.5: Maintain Backward Compatibility ✅
**Location:** Throughout `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

**Changes:**
- Default `aggregationLevel` to 'DISTRICT' (existing behavior)
- Default `includeFacilityBreakdown` to `false` (no breakdown by default)
- Made new fields optional in response
- Created `primaryFacilityId` for backward compatibility with existing code that expects a single facility ID
- Existing response structure remains intact with new fields added as optional

**Backward Compatibility Measures:**
```typescript
// Default values maintain existing behavior
aggregationLevel = 'DISTRICT', // Existing default behavior
includeFacilityBreakdown = false, // No breakdown by default

// Primary facility ID for backward compatibility
const primaryFacilityId = effectiveFacilityIds.length > 0 
  ? effectiveFacilityIds[0] 
  : userContext.facilityId;

// Optional fields in response
aggregationMetadata: aggregationMetadataSchema.optional(),
facilityBreakdown: z.array(facilityBreakdownItemSchema).optional(),
```

## Files Modified

### 1. `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`
- Updated `generateStatement` handler to parse new parameters
- Integrated aggregation level determination logic
- Added aggregation metadata generation
- Added facility breakdown generation
- Maintained backward compatibility throughout

## Requirements Addressed

### Subtask 5.1 Requirements:
- ✅ 1.1: Accept aggregationLevel parameter
- ✅ 1.2: Default aggregationLevel to 'DISTRICT'
- ✅ 7.1: Maintain backward compatibility with default values
- ✅ 7.4: Make new fields optional

### Subtask 5.2 Requirements:
- ✅ 1.3: Generate facility-level statements when aggregationLevel is 'FACILITY'
- ✅ 1.4: Generate district-level statements when aggregationLevel is 'DISTRICT'
- ✅ 1.5: Generate province-level statements when aggregationLevel is 'PROVINCE'
- ✅ 2.1: Collect planning data for specified facility
- ✅ 2.2: Collect execution data for specified facility
- ✅ 3.1: Validate facilityId is in user's accessibleFacilityIds
- ✅ 3.2: Return 403 error for unauthorized facility access
- ✅ 3.3: Allow district accountants to access facilities in their district
- ✅ 3.4: Allow health center managers to access their own facility
- ✅ 3.5: Deny health center managers access to other facilities

### Subtask 5.3 Requirements:
- ✅ 4.1: Include aggregationMetadata object in response
- ✅ 4.2: Include facility metadata for FACILITY level
- ✅ 4.3: Include district metadata for DISTRICT level
- ✅ 4.4: Include province metadata for PROVINCE level
- ✅ 4.5: Include totalFacilities count and data completeness

### Subtask 5.4 Requirements:
- ✅ 5.1: Include facilityBreakdown when includeFacilityBreakdown is true
- ✅ 5.2: Calculate budget, actual, and variance for each facility
- ✅ 5.3: Omit breakdown for FACILITY level (redundant)
- ✅ 5.4: Include facilityId, facilityName, budget, actual, variance, variancePercentage
- ✅ 5.5: Sort facilities by variance percentage (descending)

### Subtask 5.5 Requirements:
- ✅ 7.1: Default behavior matches current implementation
- ✅ 7.2: Existing response structure intact
- ✅ 7.3: New fields are optional
- ✅ 7.4: Default aggregationLevel to 'DISTRICT'
- ✅ 7.5: No changes required for existing API clients

## Testing Recommendations

### Unit Tests
1. Test parameter parsing with various combinations
2. Test aggregation level determination with different user contexts
3. Test error handling for invalid parameters
4. Test backward compatibility with old request format

### Integration Tests
1. Test FACILITY level statement generation
2. Test DISTRICT level statement generation (default)
3. Test PROVINCE level statement generation
4. Test facility breakdown generation
5. Test access control for different user roles
6. Test backward compatibility with existing clients

### Manual Testing
1. Generate statement without new parameters (should use defaults)
2. Generate facility-level statement with valid facilityId
3. Generate facility-level statement without facilityId (should error)
4. Generate district statement with facility breakdown
5. Test access control by requesting unauthorized facility

## Notes

### Key Design Decisions
1. **Backward Compatibility**: All new parameters are optional with sensible defaults
2. **Error Handling**: Clear error messages for validation and access control failures
3. **Code Reuse**: Leveraged existing helper functions (determineEffectiveFacilityIds, buildAggregationMetadata, generateFacilityBreakdown)
4. **Consistency**: Applied changes to both Budget vs Actual and standard statement paths

### Potential Improvements
1. Add caching for facility metadata to improve performance
2. Add pagination for facility breakdown when dealing with large districts
3. Add more detailed logging for aggregation operations
4. Consider adding aggregation level to performance metrics

## Completion Status
✅ All subtasks completed successfully
✅ All requirements addressed
✅ Backward compatibility maintained
✅ Error handling implemented
✅ Code follows existing patterns and conventions
