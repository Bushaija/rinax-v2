# Migration Notes: Legacy Facility Overview Endpoint

## Overview

This document describes the migration of the legacy `/api/dashboard/accountant/facility-overview` endpoint to use the new dashboard metrics service layer.

## Changes Made

### Backend (Task 10.1)

#### Updated Handler (`apps/server/src/api/routes/dashboard/dashboard.handlers.ts`)

The `getAccountantFacilityOverview` handler has been refactored to:

1. **Use New Service Layer Functions**:
   - `getCurrentReportingPeriod()` - Get active reporting period
   - `fetchPlanningEntries()` - Fetch planning data with filters
   - `fetchExecutionEntries()` - Fetch execution data with filters
   - `calculateAllocatedBudget()` - Calculate allocated budget from planning entries
   - `calculateSpentBudget()` - Calculate spent budget from execution entries
   - `calculateUtilization()` - Calculate utilization percentage

2. **Add Deprecation Headers**:
   - `X-Deprecated: true`
   - `X-Deprecation-Message: This endpoint is deprecated. Please use /api/dashboard/metrics instead.`
   - `X-Deprecation-Date: 2025-01-26`

3. **Maintain Backward Compatibility**:
   - Response format remains unchanged
   - All existing query parameters still work
   - Existing clients continue to function without changes

### Frontend (Task 10.2)

#### Updated Fetcher (`apps/client/fetchers/dashboard/get-facility-overview.ts`)

The `getFacilityOverview` fetcher has been enhanced to:

1. **Support Legacy Parameters**:
   - `facilityId` parameter still works (calls legacy endpoint)
   - Existing code continues to work without changes

2. **Support New Parameters**:
   - `level` - 'province' or 'district'
   - `districtId` - District ID (required when level='district')
   - `provinceId` - Province ID (required when level='province')
   - `programId` - Optional program filter
   - `quarter` - Optional quarter filter (1-4)

3. **Smart Routing**:
   - When `facilityId` is provided without `level`, calls legacy endpoint
   - When `level` is provided, calls new `/api/dashboard/metrics` endpoint
   - Transforms new metrics response to match legacy format

#### New Fetcher (`apps/client/fetchers/dashboard/get-metrics.ts`)

Created a new dedicated fetcher for the metrics endpoint:

- Clean interface for new code
- Requires `level` parameter
- Validates required parameters based on level
- Returns metrics response directly (no transformation)

#### New Hook (`apps/client/hooks/queries/dashboard/use-get-metrics.ts`)

Created a React Query hook for the new metrics endpoint:

- 5-minute stale time
- Proper query key with all parameters
- Easy to use in new components

## Usage Examples

### Legacy Usage (Still Works)

```typescript
// Existing code continues to work
const { data } = useGetFacilityOverview({ facilityId: 123 });
```

### New Usage - District Level

```typescript
// Using the updated fetcher with new parameters
const { data } = useGetFacilityOverview({ 
  level: 'district',
  districtId: 5,
  programId: 2,
  quarter: 1
});
```

### New Usage - Dedicated Metrics Hook

```typescript
// Using the new dedicated hook (recommended for new code)
const { data } = useGetMetrics({ 
  level: 'district',
  districtId: 5,
  programId: 2,
  quarter: 1
});
```

## Migration Path

### Phase 1: Current (Completed)
- ✅ Legacy endpoint refactored to use new service layer
- ✅ Deprecation headers added
- ✅ Client-side code updated to support both old and new parameters
- ✅ New dedicated fetcher and hook created

### Phase 2: Gradual Migration (Recommended)
- Update new features to use `useGetMetrics` hook
- Update existing components gradually as they're modified
- Monitor deprecation header usage in logs

### Phase 3: Cleanup (Future - After 3 Months)
- Remove legacy endpoint
- Remove `facilityId` parameter support from fetcher
- Update all remaining usages to new metrics endpoint

## Benefits

1. **Backward Compatibility**: Existing code continues to work without changes
2. **Improved Performance**: New service layer uses optimized queries and proper indexing
3. **Better Architecture**: Separation of concerns with dedicated service functions
4. **Flexibility**: New endpoint supports province and district level aggregation
5. **Maintainability**: Centralized budget calculation logic

## Testing

### Backend Testing
- Legacy endpoint still returns correct data
- Deprecation headers are present in responses
- New service functions calculate budgets correctly

### Frontend Testing
- Existing dashboard page still works with `facilityId` parameter
- New parameters work correctly when provided
- Response transformation works for new metrics endpoint

## Notes

- The legacy endpoint will be maintained for 3 months to allow gradual migration
- All new features should use the new metrics endpoint
- The project breakdown is not available in the new metrics endpoint (by design)
- The facility information in the new endpoint is generic (district/province view)
