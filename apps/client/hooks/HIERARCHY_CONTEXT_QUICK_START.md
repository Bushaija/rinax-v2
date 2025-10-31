# Hierarchy Context Hook - Quick Start Guide

## Installation

The hook is already installed and ready to use. No additional setup required.

## Basic Import

```tsx
import { useHierarchyContext } from "@/hooks/use-hierarchy-context";
```

## Quick Examples

### 1. Check User Role

```tsx
function MyComponent() {
  const { userRole, canApprove } = useHierarchyContext();
  
  return (
    <div>
      <p>Role: {userRole}</p>
      <p>Can Approve: {canApprove ? "Yes" : "No"}</p>
    </div>
  );
}
```

### 2. Show Accessible Facilities

```tsx
function FacilitiesList() {
  const { accessibleFacilities, isLoading } = useHierarchyContext();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <ul>
      {accessibleFacilities.map(f => (
        <li key={f.id}>{f.name}</li>
      ))}
    </ul>
  );
}
```

### 3. Conditional Rendering by Role

```tsx
function Dashboard() {
  const { userRole } = useHierarchyContext();
  
  if (userRole === "daf") return <DafQueue />;
  if (userRole === "dg") return <DgQueue />;
  return <AccountantView />;
}
```

### 4. Check Facility Access

```tsx
function ReportCard({ report }) {
  const { canAccessFacility } = useHierarchyContext();
  
  if (!canAccessFacility(report.facilityId)) {
    return <div>Access Denied</div>;
  }
  
  return <div>{report.title}</div>;
}
```

### 5. Hospital-Only Features

```tsx
function HospitalFeature() {
  const { isHospitalUser } = useHierarchyContext();
  
  if (!isHospitalUser) {
    return <div>Hospital users only</div>;
  }
  
  return <div>Hospital dashboard</div>;
}
```

## Available Properties

| Property | Type | Description |
|----------|------|-------------|
| `accessibleFacilities` | `AccessibleFacility[]` | Facilities user can access |
| `isHospitalUser` | `boolean` | True if at hospital facility |
| `canApprove` | `boolean` | True if DAF or DG role |
| `userRole` | `UserRole \| null` | Current user's role |
| `userFacilityId` | `number \| null` | User's facility ID |
| `userFacilityType` | `"hospital" \| "health_center" \| null` | User's facility type |
| `isLoading` | `boolean` | Loading state |
| `isError` | `boolean` | Error state |
| `canAccessFacility` | `(id: number) => boolean` | Check facility access |
| `accessibleFacilityIds` | `number[]` | Array of accessible IDs |

## User Roles

- `accountant` - Can create and submit reports
- `daf` - First-level approver (Directeur Administratif et Financier)
- `dg` - Final approver (Directeur Général)
- `admin` - System administrator
- `superadmin` - Super administrator
- `program_manager` - Program manager

## Facility Types

- `hospital` - Hospital facility (can access child health centers)
- `health_center` - Health center (reports to parent hospital)

## Caching

- Data is cached for 5 minutes (staleTime)
- Cache is kept for 10 minutes (gcTime)
- Automatic refetch on window focus

## Common Patterns

### Filter Reports by Accessible Facilities

```tsx
const { accessibleFacilityIds } = useHierarchyContext();

const { data: reports } = useQuery({
  queryKey: ["reports", accessibleFacilityIds],
  queryFn: () => fetchReports({ facilityIds: accessibleFacilityIds }),
});
```

### Show Different UI for Different Roles

```tsx
const { userRole, canApprove } = useHierarchyContext();

return (
  <div>
    {canApprove && <ApprovalActions />}
    {userRole === "accountant" && <SubmitButton />}
    {userRole === "admin" && <AdminPanel />}
  </div>
);
```

### Display Hierarchy Information

```tsx
const { isHospitalUser, accessibleFacilities } = useHierarchyContext();

const childFacilities = accessibleFacilities.filter(
  f => f.facilityType === "health_center"
);

return (
  <div>
    {isHospitalUser && (
      <div>
        <h3>Child Health Centers: {childFacilities.length}</h3>
        {childFacilities.map(f => <div key={f.id}>{f.name}</div>)}
      </div>
    )}
  </div>
);
```

## See Also

- [Full Documentation](./use-hierarchy-context.md)
- [Example Components](./use-hierarchy-context.example.tsx)
- [API Routes](../../../server/src/api/routes/facilities/facilities.routes.ts)
