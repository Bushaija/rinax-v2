# Design Document

## Overview

This design implements district-based filtering and district information exposure for the execution listing API. The solution extends the existing execution listing endpoint to include district data in responses for admin users and adds district filtering capabilities while maintaining security boundaries for non-admin users.

## Architecture

The implementation follows the existing execution API architecture pattern:

1. **Route Layer** (`execution.routes.ts`): Extends the existing list route schema to include optional district filtering
2. **Handler Layer** (`execution.handlers.ts`): Modifies the list handler to process district filters and include district data
3. **Types Layer** (`execution.types.ts`): Updates response schemas to include district information
4. **Access Control**: Leverages existing user context and admin access utilities

## Components and Interfaces

### 1. Route Schema Updates

**File**: `apps/server/src/api/routes/execution/execution.routes.ts`

The existing `list` route response schema will be updated to include district information:

```typescript
// Current response schema (lines 20-47)
responses: {
  [HttpStatusCodes.OK]: jsonContent(
    z.object({
      data: z.array(selectExecutionDataSchema),
      pagination: z.object({
        page: z.string(),
        limit: z.string(),
        total: z.number(),
        totalPages: z.number(),
      }),
      filters: z.object({
        facilityType: z.string().optional(),
        projectType: z.string().optional(),
        reportingPeriod: z.string().optional(),
        quarter: z.string().optional(),
        // NEW: Add district filter
        district: z.string().optional(),
      }).optional(),
    }),
    "List of execution data entries with applied filters"
  ),
}
```

### 2. Type Schema Updates

**File**: `apps/server/src/api/routes/execution/execution.types.ts`

Update the query schema to include district filtering:

```typescript
// Extend executionListQuerySchema (around line 85)
export const executionListQuerySchema = z.object({
  // ... existing fields ...
  
  // NEW: Add district filtering for admin users
  districtId: z.string().optional(),
  
  // ... rest of existing fields ...
});
```

Update the select schema to include district information:

```typescript
// Extend selectExecutionDataSchema to include district info when needed
// This will be handled dynamically in the handler rather than schema change
// to maintain backward compatibility
```

### 3. Handler Logic Updates

**File**: `apps/server/src/api/routes/execution/execution.handlers.ts`

The `list` handler (starting around line 150) will be modified with the following logic:

#### 3.1 Admin Detection and District Filtering

```typescript
// After user context retrieval (around line 155)
const userContext = await getUserContext(c);
const isAdmin = hasAdminAccess(userContext.role, userContext.permissions);

// Parse query with new district parameter
const query = executionListQuerySchema.parse(c.req.query());
const { districtId, ...otherFilters } = query;
```

#### 3.2 District-Based Query Filtering

```typescript
// Modify facility filter logic (around line 175)
if (isAdmin && districtId) {
  // Admin with district filter: filter by specific district
  const districtFilter = await buildDistrictBasedFacilityFilter(parseInt(districtId));
  if (districtFilter) {
    whereConditions.push(districtFilter);
  }
} else {
  // Existing logic for non-admin users or admin without district filter
  const requestedFacilityId = filters.facilityId ? parseInt(filters.facilityId) : undefined;
  const facilityFilter = buildFacilityFilter(userContext, requestedFacilityId);
  if (facilityFilter) {
    whereConditions.push(facilityFilter);
  }
}
```

#### 3.3 Response Enhancement

```typescript
// Modify the query to include district information (around line 190)
const baseQuery = db
  .select({
    entry: schemaFormDataEntries,
    facility: facilities,
    project: projects,
    reportingPeriod: reportingPeriods,
    // NEW: Include district information for admin users
    ...(isAdmin && {
      district: districts,
    }),
  })
  .from(schemaFormDataEntries)
  .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
  .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
  .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
  // NEW: Join district table for admin users
  ...(isAdmin && [
    .leftJoin(districts, eq(facilities.districtId, districts.id))
  ])
  .where(and(...whereConditions));
```

#### 3.4 Response Data Transformation

```typescript
// Modify response construction (around line 250)
const enhancedData = isAdmin 
  ? data.map(entry => ({
      ...entry,
      // Add district information for admin users
      district: entry.district ? {
        id: entry.district.id,
        name: entry.district.name,
      } : null,
    }))
  : data; // Non-admin users get original data structure

return c.json({
  data: enhancedData,
  pagination: {
    page,
    limit,
    total,
    totalPages,
  },
  filters: {
    facilityType: facilityType || undefined,
    projectType: projectType || undefined,
    reportingPeriod: reportingPeriod || year || undefined,
    quarter: quarter || undefined,
    // NEW: Include district filter in response for admin users
    ...(isAdmin && districtId && { district: districtId }),
  },
});
```

## Data Models

### District Information Structure

For admin users, each execution entry will include:

```typescript
interface ExecutionEntryWithDistrict {
  // ... existing execution entry fields ...
  district?: {
    id: number;
    name: string;
  } | null;
}
```

### Filter Response Structure

The filters object in the response will include:

```typescript
interface ExecutionListFilters {
  facilityType?: string;
  projectType?: string;
  reportingPeriod?: string;
  quarter?: string;
  district?: string; // NEW: Only present for admin users when filter applied
}
```

## Error Handling

### 1. Invalid District ID

When an admin provides an invalid `districtId`:

```typescript
// Validation in handler
if (isAdmin && districtId) {
  const districtExists = await validateDistrictExists(parseInt(districtId));
  if (!districtExists) {
    return c.json(
      { message: "Invalid district ID provided" },
      HttpStatusCodes.BAD_REQUEST
    );
  }
}
```

### 2. Non-Admin District Filter Attempt

Non-admin users attempting to use district filtering will have the parameter ignored silently to maintain existing behavior.

### 3. Database Join Failures

Existing error handling patterns will be maintained for database operations.

## Testing Strategy

### 1. Unit Tests

- Test admin user detection logic
- Test district filter parameter parsing
- Test response data transformation for admin vs non-admin users
- Test invalid district ID handling

### 2. Integration Tests

- Test complete execution listing flow with district filtering for admin users
- Test that non-admin users cannot access district information
- Test backward compatibility with existing API consumers
- Test database query performance with additional district joins

### 3. Security Tests

- Verify non-admin users cannot access district information
- Verify district filtering is properly restricted to admin users
- Test that existing access control boundaries are maintained

## Performance Considerations

### 1. Database Query Optimization

- The additional district join will only be performed for admin users
- Existing query patterns and indexes should handle the additional join efficiently
- Consider adding composite indexes on `facilities(districtId, id)` if performance issues arise

### 2. Response Size Impact

- District information adds minimal data to each response entry
- Impact is limited to admin users only
- Existing pagination limits response size impact

## Security Considerations

### 1. Access Control

- District information exposure is strictly limited to admin users
- Non-admin users maintain existing facility-based access restrictions
- District filtering is only available to admin users

### 2. Data Exposure

- District information is only included in responses for admin users
- No sensitive district data is exposed beyond ID and name
- Existing user context validation patterns are maintained

## Backward Compatibility

- Non-admin users will see no changes in response structure
- Existing API consumers will continue to work without modification
- New district fields are optional and only present for admin users
- Filter parameter is optional and ignored for non-admin users