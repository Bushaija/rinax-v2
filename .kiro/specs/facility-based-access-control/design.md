# Design Document: District-Based Access Control

## Overview

This design implements a hierarchical access control system based on district organization. The system recognizes that each district has one hospital and multiple health centers, with district hospital accountants needing oversight of all facilities in their district while health center users only access their own facility's data.

The implementation extends the existing facility-based access control to support district-level access patterns while maintaining backward compatibility with single-facility access for health center users.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Request Layer                        │
│  (Planning/Execution Endpoints)                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Authentication Middleware                       │
│  - Validates session                                         │
│  - Loads user context with district info                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           District Access Control Layer                      │
│  - Determines accessible facilities based on:                │
│    • User's facility type (hospital vs health_center)       │
│    • User's district_id                                      │
│    • User's role (admin, accountant, etc.)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Query Filter Application                        │
│  - Applies district-based WHERE clauses                      │
│  - Validates facility access for single-record operations   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer                              │
│  (Drizzle ORM)                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Model

```
┌──────────────┐         ┌──────────────┐
│   districts  │         │    users     │
├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │
│ name         │         │ name         │
│ ...          │         │ facilityId   │◄────┐
└──────────────┘         │ role         │     │
                         │ permissions  │     │
                         └──────────────┘     │
                                              │
                         ┌──────────────┐     │
                         │  facilities  │     │
                         ├──────────────┤     │
                         │ id (PK)      │─────┘
                         │ name         │
                         │ facility_type│ (hospital | health_center)
                         │ district_id  │─────┐
                         └──────────────┘     │
                                              │
                         ┌────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  schema_form_data_entries      │
        ├────────────────────────────────┤
        │ id (PK)                        │
        │ facilityId (FK)                │
        │ projectId                      │
        │ reportingPeriodId              │
        │ entityType                     │
        │ formData                       │
        │ ...                            │
        └────────────────────────────────┘
```

## Components and Interfaces

### 1. User Context Service

**Location:** `apps/server/src/lib/utils/get-user-facility.ts`

**Purpose:** Retrieve and enrich user context with district information and accessible facilities.

**Interface:**

```typescript
interface UserContext {
  userId: number;
  facilityId: number;
  districtId: number;
  facilityType: 'hospital' | 'health_center';
  accessibleFacilityIds: number[];
  role: string;
  permissions: Record<string, any>;
}

// Main function to get user context with district info
async function getUserContext(c: Context): Promise<UserContext>

// Helper to check if user has admin access
function hasAdminAccess(role: string, permissions: any): boolean

// Helper to check if user can access a specific facility
function canAccessFacility(
  facilityId: number,
  userContext: UserContext
): boolean

// Helper to determine accessible facilities based on user type
async function getAccessibleFacilities(
  facilityId: number,
  facilityType: string,
  districtId: number
): Promise<number[]>
```

**Implementation Logic:**

1. **For District Hospital Users:**
   - Query all facilities where `district_id = user's district_id`
   - Return array of all facility IDs in the district
   
2. **For Health Center Users:**
   - Return only their own `facilityId` in the array
   
3. **For Admin Users:**
   - Return empty array (signals "all facilities" access)

### 2. Access Control Middleware

**Location:** `apps/server/src/api/middleware/access-control.ts` (new file)

**Purpose:** Provide reusable middleware for district-based access control.

**Interface:**

```typescript
// Middleware to enforce district-based access on list operations
function enforceDistrictAccess(
  handler: AppRouteHandler
): AppRouteHandler

// Middleware to validate single-record access
function validateRecordAccess(
  handler: AppRouteHandler,
  entityType: 'planning' | 'execution'
): AppRouteHandler
```

### 3. Query Builder Utilities

**Location:** `apps/server/src/lib/utils/query-filters.ts` (new file)

**Purpose:** Build Drizzle ORM query conditions based on user context.

**Interface:**

```typescript
// Build WHERE clause for list queries
function buildFacilityFilter(
  userContext: UserContext,
  requestedFacilityId?: number
): SQL | undefined

// Validate if a record's facility is accessible
async function validateRecordFacilityAccess(
  recordId: number,
  tableName: string,
  userContext: UserContext
): Promise<boolean>
```

## Data Flow

### List Operation Flow

```
1. Request arrives at planning.list handler
   ↓
2. getUserContext() retrieves user + district info
   ↓
3. Determine accessible facilities:
   - Hospital accountant → all facilities in district
   - Health center user → only their facility
   - Admin → all facilities
   ↓
4. Build base query with entityType filter
   ↓
5. Apply facility filter:
   - If admin: no facility filter (unless explicitly requested)
   - If non-admin: WHERE facilityId IN (accessibleFacilityIds)
   ↓
6. Apply additional filters (projectType, reportingPeriod, etc.)
   ↓
7. Execute query and return results
```

### Create Operation Flow

```
1. Request arrives with facilityId in body
   ↓
2. getUserContext() retrieves user + district info
   ↓
3. Validate facilityId:
   - If admin: allow any facilityId
   - If hospital accountant: check if facilityId in district
   - If health center user: override with user's facilityId
   ↓
4. If validation fails → return 403 Forbidden
   ↓
5. Proceed with creation using validated facilityId
```

### Single Record Access Flow (Get/Update/Delete)

```
1. Request arrives with record ID
   ↓
2. getUserContext() retrieves user + district info
   ↓
3. Fetch record from database
   ↓
4. Check if record.facilityId is in user's accessibleFacilityIds
   ↓
5. If not accessible → return 403 Forbidden
   ↓
6. If accessible → proceed with operation
```

## Error Handling

### Error Response Structure

```typescript
interface ErrorResponse {
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```

### Error Scenarios

| Scenario | Status Code | Message | Details |
|----------|-------------|---------|---------|
| No authentication | 401 | "Authentication required" | - |
| User not in facility | 403 | "User must be associated with a facility" | - |
| Facility not in district | 403 | "User facility not associated with a district" | - |
| Access denied - wrong district | 403 | "Access denied: facility not in your district" | `{ requestedFacilityId, userDistrictId }` |
| Access denied - record | 403 | "Access denied to this facility's data" | `{ recordId, recordFacilityId }` |
| Invalid facility ID | 400 | "Invalid facility ID" | `{ facilityId }` |

## Testing Strategy

### Unit Tests

**File:** `apps/server/src/lib/utils/__tests__/get-user-facility.test.ts`

Test cases:
- `getUserContext()` returns correct district info for hospital user
- `getUserContext()` returns single facility for health center user
- `getAccessibleFacilities()` returns all district facilities for hospital
- `getAccessibleFacilities()` returns single facility for health center
- `canAccessFacility()` allows hospital user to access district facilities
- `canAccessFacility()` denies hospital user access to other districts
- `canAccessFacility()` allows admin to access any facility
- `hasAdminAccess()` correctly identifies admin roles

**File:** `apps/server/src/lib/utils/__tests__/query-filters.test.ts`

Test cases:
- `buildFacilityFilter()` creates correct SQL for hospital user
- `buildFacilityFilter()` creates correct SQL for health center user
- `buildFacilityFilter()` returns undefined for admin user
- `validateRecordFacilityAccess()` allows access to district records
- `validateRecordFacilityAccess()` denies access to other district records

### Integration Tests

**File:** `apps/server/src/api/routes/planning/__tests__/planning.handlers.test.ts`

Test cases:
- Hospital accountant can list all district facilities' planning data
- Health center user can only list their own planning data
- Hospital accountant can create planning for any district facility
- Health center user can only create planning for their facility
- Hospital accountant can update planning from district facilities
- Health center user cannot update planning from other facilities
- Hospital accountant can delete planning from district facilities
- Admin can access all facilities' data
- Proper 403 errors when accessing out-of-district facilities

### Manual Testing Scenarios

1. **District Hospital Accountant Workflow:**
   - Login as accountant at Butaro Hospital (district 11)
   - List planning data → should see Butaro + all 18 health centers
   - Create planning for Kivuye Health Center → should succeed
   - Try to access Byumba District Hospital data → should fail with 403

2. **Health Center User Workflow:**
   - Login as user at Kivuye Health Center
   - List planning data → should only see Kivuye data
   - Try to create planning for Butaro Hospital → should be overridden to Kivuye
   - Try to access Rusasa Health Center data → should fail with 403

3. **Admin Workflow:**
   - Login as admin
   - List planning data → should see all facilities
   - Create planning for any facility → should succeed
   - Filter by specific facility → should work correctly

## Implementation Notes

### Database Queries

**Efficient District Facility Lookup:**

```typescript
// Cache district facilities in user context to avoid repeated queries
const districtFacilities = await db
  .select({ id: facilities.id })
  .from(facilities)
  .where(eq(facilities.districtId, userContext.districtId));
```

**List Query with District Filter:**

```typescript
// For non-admin users
const whereConditions = [
  eq(schemaFormDataEntries.entityType, 'planning'),
  inArray(schemaFormDataEntries.facilityId, userContext.accessibleFacilityIds)
];

// For admin users (no facility filter)
const whereConditions = [
  eq(schemaFormDataEntries.entityType, 'planning')
];
```

### Performance Considerations

1. **Caching:** User context (including accessible facilities) should be cached per request
2. **Query Optimization:** Use `inArray()` for district facility filtering instead of multiple OR conditions
3. **Index Requirements:** Ensure `facilities.district_id` and `schema_form_data_entries.facility_id` are indexed

### Security Considerations

1. **Always validate on server:** Never trust client-provided facilityId without validation
2. **Fail closed:** If district info is missing, deny access rather than allowing
3. **Audit logging:** Log all access denied events for security monitoring
4. **Role hierarchy:** Admin > Hospital Accountant > Health Center User

## Migration Path

### Phase 1: Add District Context (Non-Breaking)
- Enhance `getUserContext()` to include district info
- Add helper functions for access control
- No changes to existing endpoints yet

### Phase 2: Update Planning Endpoints
- Modify `planning.handlers.ts` to use district-based filtering
- Add validation for create/update/delete operations
- Deploy and test with hospital accountants

### Phase 3: Update Execution Endpoints
- Apply same pattern to `execution.handlers.ts`
- Ensure consistency across both modules

### Phase 4: Cleanup
- Remove old single-facility logic
- Update documentation
- Add monitoring for access patterns

## Backward Compatibility

- Health center users experience no change in behavior (still see only their facility)
- Existing API consumers continue to work without modification
- Query parameters remain the same
- Response format unchanged
- Only hospital users gain additional access to district facilities
