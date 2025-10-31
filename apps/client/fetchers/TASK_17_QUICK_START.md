# Task 17: API Client Methods - Quick Start Guide

## TL;DR

All API client methods for the district-based role hierarchy system are now properly documented and organized. Import from the module indexes and use with React Query hooks.

## Quick Import Reference

### Facilities

```typescript
import {
  getAccessibleFacilities,
  getFacilityHierarchy,
  type AccessibleFacility,
  type FacilityHierarchyData,
} from '@/fetchers/facilities';
```

### Financial Reports

```typescript
import {
  getDafQueue,
  getDgQueue,
  getFinancialReports,
  dafApprove,
  dgApprove,
  type GetDafQueueRequest,
  type GetDafQueueResponse,
} from '@/fetchers/financial-reports';
```

## Quick Usage Examples

### Get Accessible Facilities

```typescript
const facilities = await getAccessibleFacilities();
// Returns facilities based on user's hierarchy
```

### Get DAF Queue

```typescript
const queue = await getDafQueue({ page: 1, limit: 20 });
// Returns reports pending DAF approval
```

### Approve as DAF

```typescript
await dafApprove(reportId, 'Looks good!');
// Approves report and routes to DG
```

## With React Query

```typescript
import { useGetAccessibleFacilities } from '@/hooks/queries/facilities';

const { data: facilities } = useGetAccessibleFacilities();
```

## Key Features

✅ **Hierarchy-Aware**: All methods respect facility hierarchy  
✅ **Type-Safe**: Full TypeScript support  
✅ **Well-Documented**: JSDoc comments with examples  
✅ **Error Handling**: Proper 403/404 handling  
✅ **Tested**: All smoke tests passed  

## Documentation

- **Comprehensive Guide**: `HIERARCHY_API_CLIENT_GUIDE.md`
- **Implementation Summary**: `TASK_17_IMPLEMENTATION_SUMMARY.md`
- **Smoke Test Report**: `TASK_17_SMOKE_TEST_REPORT.md`
- **Verification Checklist**: `TASK_17_VERIFICATION_CHECKLIST.md`

## Common Patterns

### Fetching Queue with Pagination

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['daf-queue', page, limit],
  queryFn: () => getDafQueue({ page, limit }),
});
```

### Handling 403 Errors

```typescript
try {
  await dafApprove(reportId);
} catch (error) {
  if (error.status === 403) {
    toast.error('You do not have permission to approve this report');
  }
}
```

### Filtering by Accessible Facilities

```typescript
const facilities = await getAccessibleFacilities();
const facilityIds = facilities.map(f => f.id);
// Use facilityIds to filter other data
```

## Requirements Met

- ✅ 6.1: DAF queue method
- ✅ 6.2: DG queue method  
- ✅ 2.3: Facility hierarchy methods
- ✅ All methods document hierarchy context

## Status

**✅ COMPLETE AND VERIFIED**

All methods implemented, documented, tested, and integrated.
