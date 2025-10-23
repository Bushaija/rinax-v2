# Design Document

## Overview

This feature enhances the existing `getExecution` facilities API endpoint to support reporting period-specific facility filtering and quarter discovery functionality. The enhancement adds a required `reportingPeriodId` query parameter and makes the `quarter` parameter optional to enable quarter discovery. When quarter is omitted, the system returns facilities with their available quarters for execution. When quarter is specified, it returns facilities available for that specific quarter within the reporting period.

## Architecture

### Current System Analysis

The current `getExecution` handler works by:
1. Validating TB program business rules
2. Auto-detecting current fiscal quarter or using provided quarter
3. Querying for facilities that have been planned (across all reporting periods)
4. Querying for facilities that have been executed for the target quarter (across all reporting periods)
5. Excluding executed facilities from planned facilities
6. Returning available facilities for the specific quarter

### Enhanced System Design

The enhanced system will:
1. Validate TB program business rules (unchanged)
2. Validate the reporting period parameter
3. Handle optional quarter parameter for discovery mode
4. Query for facilities planned within the specific reporting period
5. Query for facilities executed within the specific reporting period and quarter(s)
6. Return facilities with quarter availability information
7. Support both single-quarter and multi-quarter discovery modes

### Database Relationships

The system leverages existing relationships:
- `projects` table has `reportingPeriodId` foreign key to `reporting_periods`
- `form_data_entries` links to `projects` via `projectId`
- `facilities` links to `form_data_entries` via `facilityId`
- `form_data_entries.metadata` contains quarter information as JSON

Query path: `form_data_entries` → `projects` → `reporting_periods` + `facilities`

## Components and Interfaces

### API Route Enhancement

**Current Route Schema:**
```typescript
query: z.object({
    program: z.enum(["Malaria", "HIV", "TB"]),
    facilityType: z.enum(["hospital", "health_center"]),
    districtId: z.coerce.number().int().positive(),
    quarter: z.string().optional(),
})
```

**Enhanced Route Schema:**
```typescript
query: z.object({
    program: z.enum(["Malaria", "HIV", "TB"]),
    facilityType: z.enum(["hospital", "health_center"]),
    districtId: z.coerce.number().int().positive(),
    reportingPeriodId: z.coerce.number().int().positive("Reporting Period ID must be a positive integer"),
    quarter: z.string().optional(), // Now truly optional for discovery mode
})
```

### Response Schema Variations

**Single Quarter Mode Response:**
```typescript
z.object({
    program: z.string(),
    facilityType: z.string(),
    districtId: z.number().int(),
    reportingPeriodId: z.number().int(),
    quarter: z.string(),
    currentQuarter: z.string(),
    availableFacilities: z.array(z.object({
        id: z.number().int(),
        name: z.string(),
    })),
    count: z.number().int(),
})
```

**Quarter Discovery Mode Response:**
```typescript
z.object({
    program: z.string(),
    facilityType: z.string(),
    districtId: z.number().int(),
    reportingPeriodId: z.number().int(),
    currentQuarter: z.string(),
    availableFacilities: z.array(z.object({
        id: z.number().int(),
        name: z.string(),
        availableQuarters: z.array(z.string()), // ["Q1", "Q2", "Q3", "Q4"]
    })),
    count: z.number().int(),
})
```

### Handler Logic Flow

#### 1. Parameter Extraction & Validation
- Extract `reportingPeriodId` and optional `quarter` from query parameters
- Validate TB program business rules (existing logic)
- Parse `districtId` and `reportingPeriodId` to integers
- Determine operation mode: single-quarter vs quarter-discovery

#### 2. Reporting Period Validation
- Query `reporting_periods` table to verify the period exists
- Validate that the period status is 'ACTIVE'
- Return appropriate error messages for invalid/inactive periods

#### 3. Enhanced Planned Facilities Query
- Join `form_data_entries` → `projects` → `facilities` → `reporting_periods`
- Filter by: entityType="planning", projectType, facilityType, districtId
- **New:** Filter by `reportingPeriodId` in the projects table
- Collect facility IDs that are planned for the specific reporting period

#### 4. Execution Status Analysis

**Single Quarter Mode:**
- Query executed facilities for the specific quarter within the reporting period
- Use metadata JSON query: `metadata->>'quarter' = ${targetQuarter}`
- Exclude facilities executed for that quarter

**Quarter Discovery Mode:**
- Query all executed facilities across all quarters within the reporting period
- Group execution data by facility and quarter
- Calculate available quarters for each facility (Q1-Q4 minus executed quarters)

#### 5. Response Generation

**Single Quarter Mode:**
- Return facilities available for the specific quarter
- Include quarter and currentQuarter in response

**Quarter Discovery Mode:**
- Return facilities with their available quarters array
- Include currentQuarter for reference
- Filter out facilities with no available quarters

## Data Models

### Enhanced Query Parameters

```typescript
interface GetExecutionQueryParams {
    program: "Malaria" | "HIV" | "TB";
    facilityType: "hospital" | "health_center";
    districtId: string; // Will be parsed to number
    reportingPeriodId: string; // Will be parsed to number
    quarter?: string; // Optional for discovery mode
}
```

### Facility Execution Status

```typescript
interface FacilityExecutionStatus {
    facilityId: number;
    executedQuarters: string[]; // ["Q1", "Q3"] - quarters already executed
    availableQuarters: string[]; // ["Q2", "Q4"] - quarters available for execution
}
```

### Enhanced Response Models

```typescript
// Single Quarter Mode
interface GetExecutionSingleQuarterResponse {
    program: string;
    facilityType: string;
    districtId: number;
    reportingPeriodId: number;
    quarter: string;
    currentQuarter: string;
    availableFacilities: Array<{
        id: number;
        name: string;
    }>;
    count: number;
}

// Quarter Discovery Mode
interface GetExecutionDiscoveryResponse {
    program: string;
    facilityType: string;
    districtId: number;
    reportingPeriodId: number;
    currentQuarter: string;
    availableFacilities: Array<{
        id: number;
        name: string;
        availableQuarters: string[];
    }>;
    count: number;
}
```

## Error Handling

### Validation Errors

1. **Missing reportingPeriodId**: Return 400 with message "Reporting Period ID is required"
2. **Invalid reportingPeriodId format**: Return 400 with message "Reporting Period ID must be a positive integer"
3. **Non-existent reportingPeriodId**: Return 400 with message "Reporting period not found"
4. **Inactive reporting period**: Return 400 with message "Cannot execute for inactive reporting periods"
5. **Closed reporting period**: Return 400 with message "Cannot execute for closed reporting periods"
6. **Invalid quarter format**: Return 400 with message "Quarter must be in format Q1, Q2, Q3, or Q4"

### Existing Error Handling

- TB program validation remains unchanged
- District and facility type validation remains unchanged
- Database connection errors handled by existing middleware

### Error Response Format

All validation errors follow the existing pattern:
```typescript
{
    message: string;
}
```

## Testing Strategy

### Unit Tests

1. **Parameter Validation Tests**
   - Test missing reportingPeriodId parameter
   - Test invalid reportingPeriodId formats
   - Test invalid quarter formats
   - Test non-existent reportingPeriodId values

2. **Reporting Period Status Tests**
   - Test with ACTIVE reporting period (should succeed)
   - Test with INACTIVE reporting period (should fail)
   - Test with CLOSED reporting period (should fail)

3. **Quarter Discovery Logic Tests**
   - Test quarter discovery mode (no quarter parameter)
   - Test single quarter mode (with quarter parameter)
   - Test facilities with partial quarter execution
   - Test facilities with full quarter execution

4. **Business Logic Tests**
   - Test TB program validation works with reporting periods
   - Test facility filtering works correctly with reporting period scope
   - Test cross-quarter availability calculation
   - Test response format variations

### Integration Tests

1. **End-to-End API Tests**
   - Test complete request/response cycle for both modes
   - Test error responses for various invalid scenarios
   - Test with real execution data across quarters

2. **Database Integration Tests**
   - Test with facilities executed across multiple quarters
   - Test performance with large datasets
   - Test complex filtering scenarios

### Test Data Requirements

- Multiple reporting periods with different statuses
- Facilities with planning data across different reporting periods
- Facilities with execution data across different quarters
- Projects linked to different reporting periods
- Form data entries with quarter metadata

## Implementation Notes

### Database Query Optimization

The enhanced queries add:
- One additional join to the `reporting_periods` table
- JSON metadata queries for quarter filtering
- Potential GROUP BY operations for quarter discovery

Consider adding indexes on:
- `projects.reportingPeriodId`
- `form_data_entries.metadata` (GIN index for JSON queries)

### Backward Compatibility

This is a **breaking change** as it adds a required `reportingPeriodId` parameter. The response format also changes when quarter discovery mode is used.

### Quarter Discovery Performance

For quarter discovery mode, the system needs to:
1. Query all execution data for a facility across quarters
2. Calculate available quarters for each facility
3. Filter out facilities with no available quarters

This may require optimization for large datasets.

### Migration Considerations

- No database schema changes required
- API consumers must be updated to provide the new required parameter
- Frontend applications may need updates to handle the new response format
- Documentation must be updated to reflect both operation modes