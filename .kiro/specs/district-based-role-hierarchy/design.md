# Design Document: District-Based Role Hierarchy and Approval System

## Overview

This design implements a district-based role hierarchy system that integrates DAF (Directeur Administratif et Financier) and DG (Directeur Général) roles with facility-based access control. The system leverages existing facility parent-child relationships to enforce approval workflows within district boundaries. Hospital-level DAF and DG users can approve reports from their own facility and all child health centers, while maintaining strict data isolation to prevent cross-district access.

The solution extends the existing user role system, adds facility hierarchy middleware, and enhances the approval workflow to route approvals based on facility relationships.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Accountant  │  │     DAF      │  │      DG      │      │
│  │     UI       │  │   Queue UI   │  │   Queue UI   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Facility Hierarchy Middleware                       │   │
│  │  - Compute accessible facility IDs                   │   │
│  │  - Inject into request context                       │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Enhanced Approval Routes                            │   │
│  │  - Hierarchy-aware routing                           │   │
│  │  - Role-based authorization                          │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Facility Hierarchy Service                          │   │
│  │  - Get accessible facilities                         │   │
│  │  - Validate facility access                          │   │
│  │  - Get parent hospital                               │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Enhanced Workflow Service                           │   │
│  │  - Hierarchy-aware approval routing                  │   │
│  │  - District-scoped notifications                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (PostgreSQL)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  users (role: daf, dg)                               │   │
│  │  facilities (parent_facility_id, district_id)        │   │
│  │  financial_reports (enhanced with hierarchy)         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```


### Facility Hierarchy Model

```
District 11 (Butaro):
├── Butaro Hospital (id: 1, parent_facility_id: null)
│   ├── DAF User (facilityId: 1) → Can access: [1, 2, 3, 4, ...]
│   └── DG User (facilityId: 1) → Can access: [1, 2, 3, 4, ...]
├── Kivuye Health Center (id: 2, parent_facility_id: 1)
│   └── Accountant (facilityId: 2) → Can access: [2]
├── Rusasa Health Center (id: 3, parent_facility_id: 1)
│   └── Accountant (facilityId: 3) → Can access: [3]
└── ... (other health centers)

District 13 (Byumba):
├── Byumba District Hospital (id: 20, parent_facility_id: null)
│   ├── DAF User (facilityId: 20) → Can access: [20, 21, 22, ...]
│   └── DG User (facilityId: 20) → Can access: [20, 21, 22, ...]
└── ... (health centers)
```

### Approval Flow Within District

```
Health Center Accountant (Kivuye, id: 2)
  │
  │ Creates report for facility_id: 2
  │ Submits for approval
  ▼
Hospital DAF (Butaro, id: 1)
  │ Receives in queue (parent_facility_id: 1)
  │ Reviews and approves
  ▼
Hospital DG (Butaro, id: 1)
  │ Receives in queue (parent_facility_id: 1)
  │ Final approval
  ▼
Report fully_approved with PDF
```

## Components and Interfaces

### 1. Enhanced User Role System

#### Current State
```typescript
// Already exists in schema.enum.ts
userRole = ["accountant", "admin", "superadmin", "program_manager", "daf", "dg"]

// Already exists in users table
{
  role: userRole,
  facilityId: integer | null
}
```

#### No Database Changes Required
The DAF and DG roles already exist in the enum, and users already have facilityId. No migration needed.

### 2. Facility Hierarchy Service

```typescript
interface FacilityHierarchyService {
  /**
   * Get all facility IDs accessible to a user based on their role and facility
   * - Hospital users (DAF/DG): own facility + all child health centers
   * - Health center users: only own facility
   * - Admin: all facilities
   */
  getAccessibleFacilityIds(userId: number): Promise<number[]>
  
  /**
   * Get the parent hospital for a given facility
   * Returns null if facility is already a hospital
   */
  getParentHospital(facilityId: number): Promise<Facility | null>
  
  /**
   * Get all child facilities for a hospital
   */
  getChildFacilities(hospitalId: number): Promise<Facility[]>
  
  /**
   * Validate if user can access a specific facility
   */
  canAccessFacility(userId: number, facilityId: number): Promise<boolean>
  
  /**
   * Get DAF users for a facility's approval chain
   * - If health center: get DAF users from parent hospital
   * - If hospital: get DAF users from same hospital
   */
  getDafUsersForFacility(facilityId: number): Promise<User[]>
  
  /**
   * Get DG users for a facility's approval chain
   * - If health center: get DG users from parent hospital
   * - If hospital: get DG users from same hospital
   */
  getDgUsersForFacility(facilityId: number): Promise<User[]>
}
```


### 3. Facility Hierarchy Middleware

```typescript
/**
 * Middleware that computes accessible facility IDs and injects into context
 * Runs after authentication middleware
 */
async function facilityHierarchyMiddleware(c: Context, next: Next) {
  const user = c.get('user'); // From auth middleware
  
  if (!user) {
    return next();
  }
  
  const accessibleFacilityIds = await facilityHierarchyService
    .getAccessibleFacilityIds(user.id);
  
  c.set('accessibleFacilityIds', accessibleFacilityIds);
  c.set('userFacility', user.facilityId);
  c.set('userRole', user.role);
  
  return next();
}
```

### 4. Enhanced API Endpoints

#### User Management Endpoints

**POST /accounts/sign-up** (Enhanced)
- Validate DAF/DG roles are assigned to hospital facilities only
- Existing endpoint, add validation logic

**GET /accounts/users** (Enhanced)
- Filter users by accessible facilities
- Include facility name and type in response

#### Approval Queue Endpoints

**GET /financial-reports/daf-queue**
- **Role**: DAF
- **Query**: `status=pending_daf_approval AND facility_id IN (accessible_facility_ids)`
- **Response**: Reports with facility details

**GET /financial-reports/dg-queue**
- **Role**: DG
- **Query**: `status=approved_by_daf AND facility_id IN (accessible_facility_ids)`
- **Response**: Reports with facility details and DAF approval info

**GET /financial-reports**
- **Enhanced**: Filter by accessible_facility_ids automatically
- **Query params**: status, facilityId (must be in accessible list)

#### Facility Endpoints

**GET /facilities/accessible**
- **Response**: List of facilities user can access
- **Includes**: Facility hierarchy information

**GET /facilities/:id/hierarchy**
- **Response**: Parent and child facilities
- **Authorization**: User must have access to facility

### 5. Enhanced Workflow Service

```typescript
interface EnhancedWorkflowService extends FinancialReportWorkflowService {
  /**
   * Submit for approval - routes to parent hospital DAF users
   */
  submitForApproval(reportId: number, userId: number): Promise<FinancialReport> {
    // 1. Get report facility
    // 2. Get parent hospital (or same if hospital)
    // 3. Get DAF users at that hospital
    // 4. Update status to pending_daf_approval
    // 5. Notify DAF users
  }
  
  /**
   * DAF approve - routes to same hospital DG users
   */
  dafApprove(reportId: number, userId: number, comment?: string): Promise<FinancialReport> {
    // 1. Validate user is DAF at correct hospital
    // 2. Validate report facility is in user's hierarchy
    // 3. Update status to approved_by_daf
    // 4. Get DG users at same hospital
    // 5. Notify DG users
  }
  
  /**
   * Validate user can approve report based on hierarchy
   */
  canApproveReport(userId: number, reportId: number): Promise<boolean> {
    // Check if report's facility is in user's accessible facilities
  }
}
```


## Data Models

### TypeScript Interfaces

```typescript
// Enhanced User type (no DB changes needed)
interface User {
  id: number;
  name: string;
  email: string;
  role: 'accountant' | 'daf' | 'dg' | 'admin' | 'superadmin' | 'program_manager';
  facilityId: number | null;
  permissions: string[];
  projectAccess: number[];
  isActive: boolean;
  // ... other existing fields
}

// Enhanced Facility type (already has parent_facility_id)
interface Facility {
  id: number;
  name: string;
  facilityType: 'hospital' | 'health_center';
  districtId: number;
  parentFacilityId: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// Facility with hierarchy info
interface FacilityWithHierarchy extends Facility {
  parentFacility?: Facility | null;
  childFacilities?: Facility[];
  accessibleByUser?: boolean;
}

// User with facility details
interface UserWithFacility extends User {
  facility?: FacilityWithHierarchy;
}

// Approval queue item
interface ApprovalQueueItem {
  report: FinancialReport;
  facility: Facility;
  submittedBy: User;
  dafApprover?: User;
  dafApprovedAt?: Date;
  dafComment?: string;
}

// Hierarchy context (injected by middleware)
interface HierarchyContext {
  accessibleFacilityIds: number[];
  userFacility: number | null;
  userRole: string;
}
```

### Database Queries

#### Get Accessible Facilities for User

```sql
-- For hospital DAF/DG users
SELECT f.id
FROM facilities f
WHERE f.id = :userFacilityId  -- Own facility
   OR f.parent_facility_id = :userFacilityId  -- Child facilities
   AND f.district_id = (
     SELECT district_id FROM facilities WHERE id = :userFacilityId
   );

-- For health center accountants
SELECT id FROM facilities WHERE id = :userFacilityId;

-- For admins
SELECT id FROM facilities;
```

#### Get DAF Users for Facility

```sql
-- Get parent hospital first
WITH parent_hospital AS (
  SELECT COALESCE(parent_facility_id, id) as hospital_id
  FROM facilities
  WHERE id = :facilityId
)
SELECT u.*
FROM users u
JOIN parent_hospital ph ON u.facility_id = ph.hospital_id
WHERE u.role = 'daf'
  AND u.is_active = true;
```

#### Get Reports for DAF Queue

```sql
SELECT 
  fr.*,
  f.name as facility_name,
  f.facility_type,
  u.name as submitted_by_name
FROM financial_reports fr
JOIN facilities f ON fr.facility_id = f.id
JOIN users u ON fr.submitted_by = u.id
WHERE fr.status = 'pending_daf_approval'
  AND fr.facility_id IN (:accessibleFacilityIds)
ORDER BY fr.submitted_at ASC;
```


## Error Handling

### Validation Errors

```typescript
// Role-facility validation
if ((role === 'daf' || role === 'dg') && !facilityId) {
  throw new ValidationError('DAF and DG roles require a facility assignment');
}

if ((role === 'daf' || role === 'dg') && facility.facilityType !== 'hospital') {
  throw new ValidationError('DAF and DG roles can only be assigned to hospital facilities');
}

// Hierarchy access validation
if (!accessibleFacilityIds.includes(targetFacilityId)) {
  throw new AuthorizationError(
    'Access denied: Facility is outside your district hierarchy',
    { facilityId: targetFacilityId }
  );
}

// Approval authorization
if (!await canApproveReport(userId, reportId)) {
  throw new AuthorizationError(
    'Cannot approve report: Facility is outside your approval scope'
  );
}

// Cross-district validation
if (reportFacility.districtId !== userFacility.districtId) {
  throw new AuthorizationError(
    'Cannot approve report from different district'
  );
}
```

### Error Response Format

```typescript
interface HierarchyErrorResponse extends ErrorResponse {
  error: string;
  message: string;
  details?: {
    userFacilityId?: number;
    targetFacilityId?: number;
    userDistrictId?: number;
    targetDistrictId?: number;
  };
  statusCode: 403 | 400;
}
```

## Testing Strategy

### Unit Tests

1. **Facility Hierarchy Service Tests**
   - getAccessibleFacilityIds for hospital users
   - getAccessibleFacilityIds for health center users
   - getAccessibleFacilityIds for admin users
   - getParentHospital for health centers
   - getParentHospital for hospitals (returns null)
   - getDafUsersForFacility
   - getDgUsersForFacility
   - canAccessFacility validation

2. **Middleware Tests**
   - Facility hierarchy middleware injects correct context
   - Accessible facility IDs computed correctly
   - Works with different user roles

3. **Validation Tests**
   - DAF/DG role requires hospital facility
   - Cross-district access blocked
   - Hierarchy-based authorization

### Integration Tests

1. **Complete Approval Flow Tests**
   - Health center accountant submits → Hospital DAF approves → Hospital DG approves
   - Hospital accountant submits → Same hospital DAF/DG approve
   - Rejection flows route back correctly

2. **Access Control Tests**
   - Hospital DAF can access child health center reports
   - Health center accountant cannot access other facilities
   - Cross-district access is blocked
   - Admin can access all facilities

3. **User Management Tests**
   - Create DAF user at hospital succeeds
   - Create DAF user at health center fails
   - Update user role validates facility type

### Client Component Tests

1. **Queue Filtering Tests**
   - DAF queue shows only accessible facilities
   - DG queue shows only accessible facilities
   - Facility names displayed correctly

2. **Hierarchy Display Tests**
   - Facility hierarchy shown in UI
   - Parent-child relationships clear
   - District boundaries visible


## Implementation Notes

### No Database Migration Required

The existing schema already supports this feature:
- `user_role` enum includes 'daf' and 'dg'
- `users` table has `facilityId` column
- `facilities` table has `parent_facility_id` and `district_id`

### Facility Hierarchy Caching

For performance, cache facility hierarchy relationships:

```typescript
// Cache structure
interface FacilityHierarchyCache {
  [facilityId: number]: {
    parentId: number | null;
    childIds: number[];
    districtId: number;
    type: 'hospital' | 'health_center';
    lastUpdated: Date;
  }
}

// Invalidate cache on facility updates
// TTL: 1 hour or on facility modification
```

### Middleware Integration

Add facility hierarchy middleware to the middleware chain:

```typescript
// In app setup
app.use('*', authMiddleware);
app.use('*', facilityHierarchyMiddleware);  // Add after auth
app.use('*', ... other middleware);
```

### Query Optimization

1. **Index on parent_facility_id**: Already exists (`idx_facilities_parent`)
2. **Index on district_id + facility_type**: Already exists (`idx_facilities_district_type`)
3. **Composite index on users**: Add `(role, facility_id, is_active)` for DAF/DG lookups

```sql
CREATE INDEX idx_users_role_facility_active 
ON users(role, facility_id, is_active)
WHERE role IN ('daf', 'dg');
```

### Role-Based UI Components

```typescript
// Shared hook for hierarchy context
function useHierarchyContext() {
  const { user } = useAuth();
  const { data: accessibleFacilities } = useQuery({
    queryKey: ['accessible-facilities', user?.id],
    queryFn: () => api.facilities.getAccessible()
  });
  
  return {
    accessibleFacilities,
    isHospitalUser: user?.facility?.facilityType === 'hospital',
    canApprove: ['daf', 'dg'].includes(user?.role),
    userRole: user?.role
  };
}

// Conditional rendering
function ApprovalQueues() {
  const { userRole } = useHierarchyContext();
  
  return (
    <>
      {userRole === 'daf' && <DafApprovalQueue />}
      {userRole === 'dg' && <DgApprovalQueue />}
      {userRole === 'accountant' && <MyReports />}
    </>
  );
}
```

### Notification Enhancement

Extend existing notification service to include facility context:

```typescript
interface NotificationPayload {
  userId: number;
  type: 'report_submitted' | 'report_approved' | 'report_rejected';
  reportId: number;
  reportTitle: string;
  facilityName: string;  // Add facility context
  districtName?: string;
  message: string;
}

// Filter recipients by hierarchy
async function notifyDafUsers(reportId: number) {
  const report = await getReport(reportId);
  const dafUsers = await facilityHierarchyService
    .getDafUsersForFacility(report.facilityId);
  
  for (const user of dafUsers) {
    await sendNotification({
      userId: user.id,
      type: 'report_submitted',
      reportId: report.id,
      reportTitle: report.title,
      facilityName: report.facility.name,
      message: `New report from ${report.facility.name} requires your approval`
    });
  }
}
```


## Security Considerations

### 1. Facility Hierarchy Validation

**Defense in Depth**: Validate hierarchy access at multiple layers
- Middleware level: Compute accessible facilities
- Service level: Validate before operations
- Database level: Use WHERE clauses with facility filters

```typescript
// Always validate in service methods
async function getReport(reportId: number, userId: number) {
  const accessibleIds = await getAccessibleFacilityIds(userId);
  
  const report = await db.query.financialReports.findFirst({
    where: and(
      eq(financialReports.id, reportId),
      inArray(financialReports.facilityId, accessibleIds)  // Critical filter
    )
  });
  
  if (!report) {
    throw new NotFoundError('Report not found or access denied');
  }
  
  return report;
}
```

### 2. Cross-District Protection

**Strict District Boundaries**: Never allow cross-district operations

```typescript
// Validate district match
async function validateSameDistrict(facilityId1: number, facilityId2: number) {
  const [f1, f2] = await Promise.all([
    getFacility(facilityId1),
    getFacility(facilityId2)
  ]);
  
  if (f1.districtId !== f2.districtId) {
    throw new AuthorizationError('Cross-district operation not allowed');
  }
}
```

### 3. Role-Facility Consistency

**Enforce Role Constraints**: DAF/DG only at hospitals

```typescript
// Validation on user creation/update
async function validateRoleFacilityConsistency(role: string, facilityId: number) {
  if (role === 'daf' || role === 'dg') {
    const facility = await getFacility(facilityId);
    
    if (facility.facilityType !== 'hospital') {
      throw new ValidationError(
        `${role.toUpperCase()} role can only be assigned to hospital facilities`
      );
    }
  }
}
```

### 4. Audit Logging

**Log All Authorization Decisions**: Track access attempts

```typescript
interface AuthorizationAuditLog {
  timestamp: Date;
  userId: number;
  action: string;
  targetFacilityId: number;
  userFacilityId: number;
  allowed: boolean;
  reason?: string;
}

// Log on every authorization check
async function logAuthorizationAttempt(log: AuthorizationAuditLog) {
  await db.insert(authorizationAuditLogs).values(log);
}
```

### 5. SQL Injection Prevention

**Parameterized Queries**: Always use Drizzle ORM, never raw SQL with user input

```typescript
// GOOD: Using Drizzle
const reports = await db.query.financialReports.findMany({
  where: inArray(financialReports.facilityId, accessibleIds)
});

// BAD: Never do this
const reports = await db.execute(
  sql`SELECT * FROM financial_reports WHERE facility_id IN (${accessibleIds})`
);
```

## Performance Considerations

### 1. Facility Hierarchy Caching

Cache facility relationships to avoid repeated queries:

```typescript
// Redis cache structure
const cacheKey = `facility:hierarchy:${facilityId}`;
const ttl = 3600; // 1 hour

// Cache accessible facility IDs per user
const userCacheKey = `user:accessible:${userId}`;
```

### 2. Batch User Lookups

When notifying multiple users, batch the queries:

```typescript
// Instead of N queries
for (const userId of userIds) {
  const user = await getUser(userId);
  await notify(user);
}

// Do 1 query
const users = await db.query.users.findMany({
  where: inArray(users.id, userIds)
});
for (const user of users) {
  await notify(user);
}
```

### 3. Index Strategy

Ensure optimal indexes for hierarchy queries:

```sql
-- Already exists
CREATE INDEX idx_facilities_parent ON facilities(parent_facility_id);
CREATE INDEX idx_facilities_district_type ON facilities(district_id, facility_type);

-- Add for user lookups
CREATE INDEX idx_users_role_facility_active 
ON users(role, facility_id, is_active)
WHERE role IN ('daf', 'dg');

-- Add for report queries
CREATE INDEX idx_financial_reports_facility_status 
ON financial_reports(facility_id, status);
```

### 4. Query Result Pagination

For large approval queues, implement pagination:

```typescript
interface PaginatedQueueRequest {
  page: number;
  pageSize: number;
  status: string;
}

async function getDafQueue(userId: number, params: PaginatedQueueRequest) {
  const accessibleIds = await getAccessibleFacilityIds(userId);
  const offset = (params.page - 1) * params.pageSize;
  
  const [reports, total] = await Promise.all([
    db.query.financialReports.findMany({
      where: and(
        eq(financialReports.status, params.status),
        inArray(financialReports.facilityId, accessibleIds)
      ),
      limit: params.pageSize,
      offset: offset,
      orderBy: asc(financialReports.submittedAt)
    }),
    db.select({ count: count() })
      .from(financialReports)
      .where(and(
        eq(financialReports.status, params.status),
        inArray(financialReports.facilityId, accessibleIds)
      ))
  ]);
  
  return {
    data: reports,
    total: total[0].count,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total[0].count / params.pageSize)
  };
}
```

## Migration Strategy

### Phase 1: Backend Infrastructure (Week 1)
1. Implement FacilityHierarchyService
2. Add facility hierarchy middleware
3. Create validation utilities
4. Add indexes for performance

### Phase 2: API Enhancement (Week 1-2)
1. Enhance user creation/update endpoints
2. Add approval queue endpoints
3. Update existing endpoints with hierarchy filters
4. Add facility hierarchy endpoints

### Phase 3: Workflow Integration (Week 2)
1. Enhance workflow service with hierarchy routing
2. Update notification service
3. Add audit logging
4. Integration testing

### Phase 4: Client Implementation (Week 3)
1. Create DAF/DG queue components
2. Update user management UI
3. Add facility hierarchy displays
4. Update existing components with hierarchy context

### Phase 5: Testing & Rollout (Week 4)
1. Comprehensive testing
2. Create DAF/DG test users
3. Gradual rollout by district
4. Monitor and adjust

## Backward Compatibility

### Existing Functionality Preserved

1. **Accountant Role**: Continues to work as before
2. **Admin Role**: Retains full access
3. **Existing Reports**: No data migration needed
4. **Current Workflows**: Fallback to admin approval if no DAF/DG assigned

### Graceful Degradation

```typescript
// If no DAF users found, notify admins
async function notifyApprovers(reportId: number) {
  const report = await getReport(reportId);
  const dafUsers = await getDafUsersForFacility(report.facilityId);
  
  if (dafUsers.length === 0) {
    // Fallback to admin users
    const adminUsers = await getAdminUsers();
    await notifyUsers(adminUsers, report);
  } else {
    await notifyUsers(dafUsers, report);
  }
}
```

### Feature Flags

Use feature flags for gradual rollout:

```typescript
const FEATURE_FLAGS = {
  DISTRICT_HIERARCHY_ENABLED: process.env.ENABLE_DISTRICT_HIERARCHY === 'true'
};

// Conditional logic
if (FEATURE_FLAGS.DISTRICT_HIERARCHY_ENABLED) {
  // Use new hierarchy-based routing
} else {
  // Use legacy approval routing
}
```
