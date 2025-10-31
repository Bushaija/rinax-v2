# Task 12 Implementation Summary: Client Hierarchy Context Hook

## Overview

Successfully implemented the `useHierarchyContext` hook for the client application, providing facility hierarchy context and role-based access control information.

## Files Created

### 1. Core Implementation

#### `apps/client/hooks/use-hierarchy-context.ts`
- Main hook implementation
- Fetches accessible facilities for current user
- Exposes hierarchy context including:
  - `accessibleFacilities` - List of facilities user can access
  - `isHospitalUser` - Whether user is at a hospital facility
  - `canApprove` - Whether user has DAF/DG approval permissions
  - `userRole` - Current user's role
  - `userFacilityId` - User's facility ID
  - `userFacilityType` - User's facility type
  - `canAccessFacility()` - Function to check facility access
  - `accessibleFacilityIds` - Array of accessible facility IDs
- Implements React Query caching (5 min staleTime, 10 min gcTime)
- Handles loading and error states

### 2. API Integration

#### `apps/client/fetchers/facilities/get-accessible-facilities.ts`
- Fetcher function for `/facilities/accessible` endpoint
- Returns list of accessible facilities with hierarchy information
- Includes proper error handling via `handleHonoResponse`

#### `apps/client/hooks/queries/facilities/use-get-accessible-facilities.ts`
- React Query hook for accessible facilities
- Configured with appropriate cache settings
- Query key: `["facilities", "accessible"]`

### 3. Type Updates

#### `apps/client/types/user.ts`
- Updated `UserRole` type to include new roles:
  - `daf` - Directeur Administratif et Financier
  - `dg` - Directeur Général
  - `superadmin` - Super administrator

### 4. Exports

#### `apps/client/hooks/index.ts`
- Exported `useHierarchyContext` hook
- Exported `HierarchyContext` type
- Re-exported query hooks

#### `apps/client/hooks/queries/index.ts`
- Added export for `useGetAccessibleFacilities`

### 5. Documentation

#### `apps/client/hooks/use-hierarchy-context.md`
- Comprehensive documentation
- Usage examples
- API reference
- Caching details
- Requirements mapping

#### `apps/client/hooks/HIERARCHY_CONTEXT_QUICK_START.md`
- Quick reference guide
- Common patterns
- Property reference table
- Role and facility type descriptions

#### `apps/client/hooks/use-hierarchy-context.example.tsx`
- 5 example components demonstrating usage:
  1. `HierarchyInfoCard` - Display user hierarchy info
  2. `AccessibleFacilitiesList` - List accessible facilities
  3. `RoleBasedContent` - Conditional rendering by role
  4. `FacilityAccessChecker` - Check facility access
  5. `HospitalOnlyFeature` - Hospital-specific features

## Features Implemented

### ✅ Accessible Facilities Fetching
- Fetches facilities based on user's role and hierarchy
- Hospital users get own facility + child health centers
- Health center users get only their facility
- Admin users get all facilities

### ✅ Role Detection
- Identifies user's role from session
- Determines if user has approval permissions (DAF/DG)
- Provides role-based conditional rendering support

### ✅ Facility Type Detection
- Determines if user is at hospital or health center
- Enables hospital-specific features
- Supports hierarchy-based access patterns

### ✅ Access Validation
- `canAccessFacility()` function for checking access
- `accessibleFacilityIds` array for filtering queries
- Supports both functional and array-based access checks

### ✅ React Query Integration
- Proper caching configuration
- Automatic refetch on window focus
- Stale time: 5 minutes
- Garbage collection time: 10 minutes

### ✅ Loading and Error States
- `isLoading` flag for loading state
- `isError` flag for error handling
- Graceful degradation when data unavailable

## Usage Examples

### Basic Usage
```tsx
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";

function MyComponent() {
  const { 
    accessibleFacilities, 
    isHospitalUser, 
    canApprove,
    userRole 
  } = useHierarchyContext();
  
  return (
    <div>
      <p>Role: {userRole}</p>
      <p>Facilities: {accessibleFacilities.length}</p>
    </div>
  );
}
```

### Conditional Rendering
```tsx
function Dashboard() {
  const { canApprove, userRole } = useHierarchyContext();
  
  if (canApprove) {
    return userRole === "daf" ? <DafQueue /> : <DgQueue />;
  }
  
  return <AccountantView />;
}
```

### Facility Access Check
```tsx
function ReportCard({ report }) {
  const { canAccessFacility } = useHierarchyContext();
  
  if (!canAccessFacility(report.facilityId)) {
    return <AccessDenied />;
  }
  
  return <ReportDetails report={report} />;
}
```

## Requirements Satisfied

### Requirement 2.1-2.4: Facility Hierarchy Access Control
✅ Hospital DAF/DG users can access own facility + child facilities
✅ Health center users can only access own facility
✅ Admin users can access all facilities
✅ District boundaries enforced

### Requirement 5.1-5.5: Role-Based Permission Matrix
✅ Accountant role identified
✅ DAF role identified with approval permissions
✅ DG role identified with approval permissions
✅ Admin role identified
✅ Permission checks available via `canApprove`

## Technical Details

### Caching Strategy
- **Query Key**: `["facilities", "accessible"]`
- **Stale Time**: 5 minutes (300,000ms)
- **GC Time**: 10 minutes (600,000ms)
- **Refetch**: On window focus, on reconnect

### Type Safety
- Full TypeScript support
- Exported `HierarchyContext` interface
- Typed `AccessibleFacility` interface
- Typed `UserRole` enum

### Performance
- Memoized computed values using `useMemo`
- Efficient facility lookup with array methods
- Cached API responses via React Query
- Minimal re-renders

## Integration Points

### Server Endpoints
- `GET /api/facilities/accessible` - Fetches accessible facilities

### Client Components
- Can be used in any client component
- Works with existing auth system
- Compatible with React Query setup

### Auth Integration
- Uses `authClient.useSession()` for user data
- Extracts role and facility info from session
- Handles unauthenticated state gracefully

## Testing Considerations

The hook can be tested by:
1. Mocking `authClient.useSession()`
2. Mocking `useGetAccessibleFacilities()`
3. Testing computed values (isHospitalUser, canApprove)
4. Testing utility functions (canAccessFacility)

Example test setup:
```tsx
vi.mock("@/lib/auth", () => ({
  authClient: {
    useSession: () => ({
      data: { user: { role: "daf", facilityId: 1 } },
      isPending: false,
    }),
  },
}));

vi.mock("@/hooks/queries/facilities/use-get-accessible-facilities", () => ({
  useGetAccessibleFacilities: () => ({
    data: [{ id: 1, name: "Hospital", facilityType: "hospital" }],
    isLoading: false,
    isError: false,
  }),
}));
```

## Next Steps

This hook is now ready to be used in:
- Task 13: DAF approval queue interface
- Task 14: DG approval queue interface
- Task 15: User management UI
- Task 16: Facility hierarchy displays

## Verification

✅ All TypeScript files compile without errors
✅ No diagnostic issues found
✅ Proper exports in index files
✅ Documentation complete
✅ Example components provided
✅ Type definitions updated

## Files Modified

1. `apps/client/types/user.ts` - Added new roles to UserRole type

## Files Created

1. `apps/client/hooks/use-hierarchy-context.ts`
2. `apps/client/fetchers/facilities/get-accessible-facilities.ts`
3. `apps/client/hooks/queries/facilities/use-get-accessible-facilities.ts`
4. `apps/client/hooks/index.ts`
5. `apps/client/hooks/use-hierarchy-context.md`
6. `apps/client/hooks/use-hierarchy-context.example.tsx`
7. `apps/client/hooks/HIERARCHY_CONTEXT_QUICK_START.md`
8. `apps/client/hooks/TASK_12_IMPLEMENTATION_SUMMARY.md`

## Conclusion

Task 12 has been successfully completed. The `useHierarchyContext` hook provides a clean, type-safe, and performant way to access facility hierarchy information and role-based permissions in client components. The implementation includes comprehensive documentation and examples to facilitate adoption by other developers.
