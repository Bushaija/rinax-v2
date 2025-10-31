# Hierarchy-Aware API Client Methods

## Overview

This document describes the API client methods that have been enhanced to support the district-based role hierarchy system. All methods automatically handle facility hierarchy access control through server-side middleware.

**Requirements**: 2.3, 6.1, 6.2

## Facility Hierarchy Methods

### getAccessibleFacilities()

Fetches all facilities accessible to the current user based on their role and facility assignment.

**Access Rules**:
- Hospital users (DAF/DG): Own facility + all child health centers
- Health center users: Only own facility
- Admin users: All facilities

**Usage**:
```typescript
import { getAccessibleFacilities } from '@/fetchers/facilities';

const facilities = await getAccessibleFacilities();
// Returns: AccessibleFacility[]
```

**Response Type**:
```typescript
type AccessibleFacility = {
  id: number;
  name: string;
  facilityType: "hospital" | "health_center";
  districtId: number;
  districtName: string;
  parentFacilityId: number | null;
}
```

### getFacilityHierarchy(facilityId)

Fetches the complete hierarchy information for a specific facility, including parent and child facilities.

**Usage**:
```typescript
import { getFacilityHierarchy } from '@/fetchers/facilities';

const hierarchy = await getFacilityHierarchy(facilityId);
// Returns: FacilityHierarchyData
```

**Response Type**:
```typescript
type FacilityHierarchyData = {
  facility: {
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
    districtName: string;
    parentFacilityId: number | null;
  };
  parentFacility: {
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
  } | null;
  childFacilities: Array<{
    id: number;
    name: string;
    facilityType: "hospital" | "health_center";
    districtId: number;
  }>;
}
```

## Financial Reports Queue Methods

### getDafQueue(query?)

Fetches reports pending DAF approval from facilities within the user's hierarchy.

**Requirements**: 6.1-6.4, 3.1, 3.2

**Usage**:
```typescript
import { getDafQueue } from '@/fetchers/financial-reports';

const queue = await getDafQueue({ page: 1, limit: 20 });
// Returns: GetDafQueueResponse
```

**Parameters**:
```typescript
type GetDafQueueRequest = {
  page?: number;
  limit?: number;
}
```

**Response**:
```typescript
type GetDafQueueResponse = {
  reports: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

### getDgQueue(query?)

Fetches reports approved by DAF and pending DG approval from facilities within the user's hierarchy.

**Requirements**: 6.1-6.4, 5.3, 3.4-3.8

**Usage**:
```typescript
import { getDgQueue } from '@/fetchers/financial-reports';

const queue = await getDgQueue({ page: 1, limit: 20 });
// Returns: GetDgQueueResponse
```

**Parameters and Response**: Same structure as `getDafQueue`

## Enhanced Financial Reports Methods

All financial reports methods now include hierarchy-aware access control:

### getFinancialReports(query)

**Hierarchy Behavior**:
- Automatically filters reports based on user's accessible facilities
- Hospital users see reports from their facility and child health centers
- Health center users see only their own facility's reports
- Admin users see all reports

**Requirements**: 2.1-2.4, 4.1-4.3

### getFinancialReportById(id)

**Hierarchy Behavior**:
- Validates user has access to the report's facility
- Returns 403 Forbidden if facility is outside user's hierarchy

**Requirements**: 2.1-2.4, 4.1-4.3

### updateFinancialReport(reportId, data)

**Hierarchy Behavior**:
- Validates user has permission to update the report
- Checks both facility access and role-based permissions
- Returns 403 Forbidden if user lacks permission

**Requirements**: 2.1-2.4, 4.1-4.5

### deleteFinancialReport(id)

**Hierarchy Behavior**:
- Validates user has permission to delete the report
- Typically restricted to accountants for their own facility's reports
- Returns 403 Forbidden if user lacks permission

**Requirements**: 2.1-2.4, 4.1-4.5

## Approval Workflow Methods

### submitForApproval(reportId)

**Hierarchy Behavior**:
- Routes health center reports to parent hospital DAF users
- Routes hospital reports to same hospital DAF users
- Respects district boundaries

**Requirements**: 3.1-3.5, 6.5, 5.2, 5.3

### dafApprove(reportId, comment?)

**Hierarchy Behavior**:
- Validates approver is DAF at correct hospital
- Validates report facility is in approver's hierarchy
- Routes to DG users at same hospital
- Returns 403 Forbidden if validation fails

**Requirements**: 3.1-3.5, 6.5, 5.2, 5.3

### dgApprove(reportId, comment?)

**Hierarchy Behavior**:
- Validates approver is DG at correct hospital
- Validates report facility is in approver's hierarchy
- Validates report was already approved by DAF
- Marks report as fully approved
- Returns 403 Forbidden if validation fails

**Requirements**: 3.1-3.5, 6.5, 5.3

### dafReject(reportId, comment)

**Hierarchy Behavior**:
- Validates rejector is DAF at correct hospital
- Routes rejected report back to original accountant
- Requires rejection comment

**Requirements**: 3.1-3.5, 6.5

### dgReject(reportId, comment)

**Hierarchy Behavior**:
- Validates rejector is DG at correct hospital
- Routes rejected report back to original accountant
- Requires rejection comment

**Requirements**: 3.1-3.5, 6.5

## Error Handling

All hierarchy-aware methods can throw the following errors:

### 401 Unauthorized
User is not authenticated. Redirect to login.

### 403 Forbidden
User doesn't have access to the requested resource. Common reasons:
- Facility is outside user's hierarchy
- User role doesn't have required permissions
- Cross-district access attempt

**Error Response**:
```typescript
{
  error: string;
  message: string;
  details?: {
    userFacilityId?: number;
    targetFacilityId?: number;
    userDistrictId?: number;
    targetDistrictId?: number;
  };
}
```

### 404 Not Found
Resource doesn't exist or user doesn't have access to it.

## Usage with React Query

All methods are designed to work seamlessly with React Query hooks:

```typescript
import { useQuery } from '@tanstack/react-query';
import { getAccessibleFacilities, getDafQueue } from '@/fetchers';

// Fetch accessible facilities
const { data: facilities } = useQuery({
  queryKey: ['facilities', 'accessible'],
  queryFn: getAccessibleFacilities,
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Fetch DAF queue
const { data: dafQueue } = useQuery({
  queryKey: ['financial-reports', 'daf-queue', page, limit],
  queryFn: () => getDafQueue({ page, limit }),
  refetchOnWindowFocus: true,
  staleTime: 30000, // 30 seconds
});
```

## Best Practices

1. **Always handle 403 errors**: Display user-friendly messages when access is denied
2. **Use accessible facilities**: Filter UI options based on `getAccessibleFacilities()`
3. **Cache hierarchy data**: Facility hierarchy changes infrequently, cache for 5+ minutes
4. **Refresh queues frequently**: Approval queues should refresh on window focus
5. **Show facility context**: Always display facility name and type in reports and queues
6. **Validate before actions**: Check user role and facility access before showing action buttons

## Related Hooks

Pre-built React Query hooks are available for all methods:

- `useGetAccessibleFacilities()` - apps/client/hooks/queries/facilities/
- `useGetFacilityHierarchy(facilityId)` - apps/client/hooks/queries/facilities/
- `useGetDafQueue(query)` - apps/client/hooks/queries/financial-reports/
- `useGetDgQueue(query)` - apps/client/hooks/queries/financial-reports/
- `useHierarchyContext()` - apps/client/hooks/ (combines multiple hierarchy queries)

## Testing

When testing hierarchy-aware methods:

1. Test with different user roles (accountant, DAF, DG, admin)
2. Test with different facility types (hospital, health center)
3. Test cross-district access (should be blocked)
4. Test parent-child relationships
5. Test error handling for 403 responses

## Migration Notes

Existing code using financial reports methods will continue to work without changes. The hierarchy filtering is applied automatically on the server side. However, you should:

1. Update UI to show facility context (name, type, district)
2. Add error handling for 403 Forbidden responses
3. Use `getAccessibleFacilities()` to filter facility selectors
4. Update approval workflows to use new queue methods
