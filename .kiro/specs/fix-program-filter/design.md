# Design Document

## Overview

This design addresses the semantic and functional mismatch between the API parameter name `programId` (numeric) and the underlying data model field `projectType` (string enum). The fix involves renaming the parameter across all layers of the application stack and updating the filtering logic to use direct string comparison instead of numeric-to-string conversion.

## Architecture

### Current State

```
Client Request
  ↓ programId: number
API Route (unified-dashboard.routes.ts)
  ↓ programId: number
Handler (unified-dashboard.handlers.ts)
  ↓ programId: number → toString()
Service (unified-dashboard.service.ts)
  ↓ programId: number → toString()
Aggregation (aggregation.service.ts)
  ↓ programIdStr = programId.toString()
Database Query
  ↓ WHERE project.projectType = programIdStr
  ✗ FAILS: "1" !== "HIV"
```

### Target State

```
Client Request
  ↓ projectType: "HIV" | "Malaria" | "TB"
API Route (unified-dashboard.routes.ts)
  ↓ projectType: enum validation
Handler (unified-dashboard.handlers.ts)
  ↓ projectType: string
Service (unified-dashboard.service.ts)
  ↓ projectType: string
Aggregation (aggregation.service.ts)
  ↓ projectType: string (no conversion)
Database Query
  ↓ WHERE project.projectType = projectType
  ✓ SUCCESS: "HIV" === "HIV"
```

## Components and Interfaces

### 1. API Route Schema

**File**: `apps/server/src/api/routes/dashboard/unified-dashboard.routes.ts`

**Changes**:
- Replace `programId: z.string().optional()` with `projectType: z.enum(['HIV', 'Malaria', 'TB']).optional()`
- Update parameter description to clarify it filters by project type
- Update OpenAPI documentation

**Rationale**: Using Zod enum validation ensures only valid project types are accepted, providing immediate feedback to API consumers.

### 2. Handler Parameter Parsing

**File**: `apps/server/src/api/routes/dashboard/unified-dashboard.handlers.ts`

**Changes**:
- Rename `programId: programIdStr` to `projectType: projectTypeStr`
- Remove numeric parsing logic for program filter
- Pass `projectType` as string directly to filters object
- Remove validation for numeric programId

**Rationale**: Eliminates unnecessary type conversion and simplifies validation logic.

### 3. Service Filter Interface

**File**: `apps/server/src/api/services/dashboard/unified-dashboard.service.ts`

**Changes**:
- Update `DashboardFilters` interface: `programId?: number` → `projectType?: string`
- Update all component methods to use `filters.projectType` instead of `filters.programId`
- Remove `toString()` conversions in filter comparisons
- Update method signatures and JSDoc comments

**Rationale**: Type-safe interface prevents accidental misuse and makes the code self-documenting.

### 4. Aggregation Service

**File**: `apps/server/src/api/services/dashboard/aggregation.service.ts`

**Changes**:
- Update `AggregationFilters` interface: `programId?: number` → `projectType?: string`
- Update `aggregateBudgetData()` to use `filters.projectType` directly
- Remove `programIdStr` conversion: `entry.project?.projectType === filters.projectType`
- Update function signatures for `aggregateByDistrict()` and `aggregateByFacility()`
- Update JSDoc parameter documentation

**Rationale**: Direct string comparison is more efficient and semantically correct.

### 5. Client-Side Types

**File**: `apps/client/types/dashboard.ts`

**Changes**:
- Update `DashboardFilters` interface: `programId?: number` → `projectType?: string`
- Add JSDoc comment explaining valid values

**Rationale**: Keeps client and server types in sync.

### 6. Client-Side Hook

**File**: `apps/client/hooks/use-dashboard.ts`

**Changes**:
- Update query parameter building: `filters?.programId` → `filters?.projectType`
- Remove `toString()` conversion
- Update JSDoc examples to show `projectType: 'HIV'`

**Rationale**: Provides correct usage examples for developers.

### 7. Test Component

**File**: `apps/client/components/test-unified-dashboard.tsx`

**Changes**:
- Update filter state to use `projectType` instead of `programId`
- Update UI controls to show project type dropdown with enum values
- Update example requests in documentation

**Rationale**: Demonstrates correct API usage and validates the fix.

## Data Models

### Filter Interfaces

**Before**:
```typescript
interface DashboardFilters {
  scope?: 'country' | 'province' | 'district' | 'facility';
  scopeId?: number;
  programId?: number;  // ❌ Wrong type
  periodId?: number;
  quarter?: number;
}
```

**After**:
```typescript
interface DashboardFilters {
  scope?: 'country' | 'province' | 'district' | 'facility';
  scopeId?: number;
  projectType?: 'HIV' | 'Malaria' | 'TB';  // ✅ Correct type
  periodId?: number;
  quarter?: number;
}
```

### Query Parameter Schema

**Before**:
```typescript
query: z.object({
  components: z.string(),
  scope: scopeSchema.optional(),
  scopeId: z.string().optional(),
  programId: z.string().optional(),  // ❌ Parsed as string, converted to number
  // ...
})
```

**After**:
```typescript
query: z.object({
  components: z.string(),
  scope: scopeSchema.optional(),
  scopeId: z.string().optional(),
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),  // ✅ Validated enum
  // ...
})
```

## Error Handling

### Validation Errors

**Invalid Project Type**:
- **Trigger**: Client sends `projectType=InvalidProgram`
- **Response**: HTTP 400 with message "Invalid enum value. Expected 'HIV' | 'Malaria' | 'TB', received 'InvalidProgram'"
- **Handled by**: Zod schema validation in route definition

### Backward Compatibility

**Deprecated Parameter**:
- The old `programId` parameter will be removed entirely
- No backward compatibility layer is needed since this is a bug fix
- API consumers will receive clear validation errors if they use the old parameter

## Testing Strategy

### Unit Tests

1. **Route Schema Validation**
   - Test valid projectType values ("HIV", "Malaria", "TB")
   - Test invalid projectType values (should fail validation)
   - Test missing projectType (should be optional)

2. **Filter Logic**
   - Test filtering with each project type
   - Test filtering without project type (all programs)
   - Verify no type conversion occurs

3. **Component Handlers**
   - Test each component with projectType filter
   - Verify correct data is returned for each project type
   - Verify all programs returned when filter is absent

### Integration Tests

1. **End-to-End API Tests**
   - Request metrics with `projectType=HIV`
   - Request programDistribution with `projectType=Malaria`
   - Request multiple components with `projectType=TB`
   - Verify response data matches the filter

2. **Client Hook Tests**
   - Test useDashboard with projectType filter
   - Verify correct query parameters are sent
   - Verify response data is correctly typed

### Manual Testing

1. **Test Component**
   - Use dropdown to select each project type
   - Verify filtered data is displayed
   - Verify "All Programs" option works
   - Check browser network tab for correct query parameters

## Migration Notes

### Breaking Changes

This is a **breaking change** for any existing API consumers using the `programId` parameter. However, since the current implementation is broken (filtering doesn't work), this is effectively a bug fix rather than a feature change.

### Migration Steps for API Consumers

1. Replace `programId` with `projectType` in all API calls
2. Change value from number to string enum ("HIV", "Malaria", "TB")
3. Update TypeScript types if using typed clients

**Before**:
```typescript
fetch('/api/dashboard?components=metrics&programId=1')
```

**After**:
```typescript
fetch('/api/dashboard?components=metrics&projectType=HIV')
```

### Rollout Strategy

1. Deploy server-side changes first
2. Update client-side code immediately after
3. Update API documentation
4. Notify API consumers of the breaking change

## Performance Considerations

### Improvements

- **Eliminates unnecessary type conversion**: Removes `toString()` calls in hot paths
- **More efficient string comparison**: Direct string equality is faster than converting numbers
- **Better query optimization**: Database can use indexes on string enum fields more effectively

### No Performance Impact

- Filter application logic remains the same
- Database queries are unchanged (already filtering on projectType field)
- No additional database roundtrips required

## Security Considerations

### Input Validation

- **Enum validation**: Zod schema ensures only valid project types are accepted
- **No injection risk**: String enum values are safe (no user-provided arbitrary strings)
- **Type safety**: TypeScript prevents accidental misuse in code

### No Security Impact

- This change does not affect authentication or authorization
- Access control logic remains unchanged
- No new attack vectors introduced
