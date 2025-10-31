# useHierarchyContext Hook

## Overview

The `useHierarchyContext` hook provides facility hierarchy context for the current user, including accessible facilities, role information, and approval permissions.

## Features

- Fetches accessible facilities based on user's role and hierarchy
- Determines if user is at a hospital (can access child facilities)
- Checks if user has approval permissions (DAF/DG roles)
- Provides utility functions for facility access validation
- Implements React Query caching for optimal performance

## Usage

```tsx
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

function MyComponent() {
  const {
    accessibleFacilities,
    isHospitalUser,
    canApprove,
    userRole,
    canAccessFacility,
    isLoading,
  } = useHierarchyContext();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Your Role: {userRole}</h2>
      <p>Hospital User: {isHospitalUser ? "Yes" : "No"}</p>
      <p>Can Approve: {canApprove ? "Yes" : "No"}</p>
      
      <h3>Accessible Facilities ({accessibleFacilities.length})</h3>
      <ul>
        {accessibleFacilities.map(facility => (
          <li key={facility.id}>
            {facility.name} ({facility.facilityType})
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Return Value

### Properties

- **accessibleFacilities**: `AccessibleFacility[]` - List of facilities the user can access
- **isHospitalUser**: `boolean` - True if user is at a hospital facility
- **canApprove**: `boolean` - True if user has DAF or DG role
- **userRole**: `UserRole | null` - Current user's role
- **userFacilityId**: `number | null` - Current user's facility ID
- **userFacilityType**: `"hospital" | "health_center" | null` - Current user's facility type
- **isLoading**: `boolean` - True while data is loading
- **isError**: `boolean` - True if there was an error loading data
- **canAccessFacility**: `(facilityId: number) => boolean` - Function to check facility access
- **accessibleFacilityIds**: `number[]` - Array of accessible facility IDs

## Examples

### Conditional Rendering Based on Role

```tsx
function ApprovalDashboard() {
  const { canApprove, userRole } = useHierarchyContext();

  if (!canApprove) {
    return <div>You don't have approval permissions</div>;
  }

  return (
    <div>
      {userRole === "daf" && <DafApprovalQueue />}
      {userRole === "dg" && <DgApprovalQueue />}
    </div>
  );
}
```

### Filtering Data by Accessible Facilities

```tsx
function ReportsList() {
  const { accessibleFacilityIds, canAccessFacility } = useHierarchyContext();

  const { data: reports } = useQuery({
    queryKey: ["reports", accessibleFacilityIds],
    queryFn: () => fetchReports({ facilityIds: accessibleFacilityIds }),
  });

  return (
    <div>
      {reports?.map(report => (
        <ReportCard 
          key={report.id} 
          report={report}
          canAccess={canAccessFacility(report.facilityId)}
        />
      ))}
    </div>
  );
}
```

### Hospital-Specific Features

```tsx
function FacilityManagement() {
  const { isHospitalUser, accessibleFacilities } = useHierarchyContext();

  if (!isHospitalUser) {
    return <div>This feature is only available for hospital users</div>;
  }

  const childFacilities = accessibleFacilities.filter(
    f => f.facilityType === "health_center"
  );

  return (
    <div>
      <h2>Child Health Centers</h2>
      <ul>
        {childFacilities.map(facility => (
          <li key={facility.id}>{facility.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Caching

The hook uses React Query with the following cache configuration:
- **staleTime**: 5 minutes - Data is considered fresh for 5 minutes
- **gcTime**: 10 minutes - Cached data is kept for 10 minutes

This ensures optimal performance while keeping data reasonably up-to-date.

## Requirements Satisfied

This hook satisfies the following requirements from the design document:

- **2.1-2.4**: Facility hierarchy access control
- **5.1-5.5**: Role-based permission matrix

## Related Files

- `apps/client/fetchers/facilities/get-accessible-facilities.ts` - API fetcher
- `apps/client/hooks/queries/facilities/use-get-accessible-facilities.ts` - Query hook
- `apps/client/types/user.ts` - User type definitions
- `apps/server/src/api/routes/facilities/facilities.routes.ts` - Server endpoint
