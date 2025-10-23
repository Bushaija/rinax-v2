# Design Document

## Overview

This design document outlines the approach for simplifying user permissions and project access data structures in the authentication system. The current implementation stores these fields as stringified JSON in text columns, requiring manual parsing and validation. The new design will use proper JSONB arrays in the database and native TypeScript arrays in the application layer, providing better type safety, easier validation, and improved developer experience.

### Current State

- **Database**: `permissions` and `projectAccess` stored as `text` columns containing stringified JSON
- **API Layer**: Manual JSON parsing with try-catch blocks in route handlers
- **Type System**: Inconsistent typing - sometimes string, sometimes parsed arrays
- **Validation**: Complex custom refinement functions in Zod schemas

### Target State

- **Database**: `permissions` and `projectAccess` stored as `jsonb` columns
- **API Layer**: Direct array handling with automatic serialization/deserialization
- **Type System**: Consistent typing - `string[]` for permissions, `number[]` for projectAccess
- **Validation**: Simple array validation with Zod

## Architecture

### Data Flow

```
Client Request (JSON)
    ↓
API Route (Zod Validation)
    ↓
Handler (Business Logic)
    ↓
Drizzle ORM (Type-safe queries)
    ↓
PostgreSQL (JSONB storage)
    ↓
Drizzle ORM (Automatic deserialization)
    ↓
Handler (Format response)
    ↓
API Response (JSON)
    ↓
Client (Native arrays)
```

### Layer Responsibilities

1. **Database Layer**: Store arrays as JSONB, support array operations
2. **ORM Layer**: Automatic serialization/deserialization between JSONB and TypeScript arrays
3. **Handler Layer**: Business logic, validation against valid permissions/projects
4. **Route Layer**: Schema validation, type enforcement
5. **Client Layer**: Work with native JavaScript arrays

## Components and Interfaces

### 1. Database Schema Changes

**File**: `apps/server/src/db/schema/users/schema.ts`

**Changes**:
- Replace `text("permissions")` with `jsonb("permissions").$type<string[]>().default([])`
- Replace `text("project_access")` with `jsonb("project_access").$type<number[]>().default([])`
- Remove unused imports (`jsonb`, `unique`, `foreignKey`, `facilities`)

**Rationale**: JSONB provides native PostgreSQL array support with indexing capabilities and automatic JSON handling.

### 2. Database Migration

**File**: `apps/server/src/db/migrations/XXXX_simplify_permissions_project_access.sql`

**Migration Steps**:
1. Add new JSONB columns (`permissions_new`, `project_access_new`)
2. Migrate existing data:
   - Parse text JSON strings
   - Handle null/empty values → empty arrays
   - Handle invalid JSON → empty arrays with logging
3. Drop old text columns
4. Rename new columns to original names
5. Set default values to `'[]'::jsonb`

**Rollback Strategy**: Keep old columns temporarily, allow rollback within migration window

### 3. TypeScript Type Definitions

**File**: `apps/server/src/db/schema/users/types.ts` (new file)

```typescript
export type UserPermission = 
  | 'view_reports'
  | 'edit_budget'
  | 'manage_users'
  | 'admin_access'
  | 'all_quarters';

export type UserPermissions = UserPermission[];
export type ProjectAccess = number[];

export interface UserWithPermissions {
  id: number;
  permissions: UserPermissions;
  projectAccess: ProjectAccess;
  // ... other user fields
}
```

**Rationale**: Centralized type definitions ensure consistency across the application.

### 4. API Route Schema Updates

**File**: `apps/server/src/api/routes/accounts/auth.routes.ts`

**Changes**:

```typescript
// Before (complex string validation)
permissions: z.string().optional().refine((val) => {
  if (!val) return true;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) && parsed.every(p => typeof p === 'string');
  } catch {
    return false;
  }
}, "Permissions must be a valid JSON array of strings")

// After (simple array validation)
permissions: z.array(z.string()).optional().default([])
```

```typescript
// Before (complex string validation)
projectAccess: z.string().optional().refine((val) => {
  if (!val) return true;
  try {
    const parsed = JSON.parse(val);
    return Array.isArray(parsed) && parsed.every(p => typeof p === 'number');
  } catch {
    return false;
  }
}, "Project access must be a valid JSON array of numbers")

// After (simple array validation)
projectAccess: z.array(z.number()).optional().default([])
```

**Rationale**: Simpler validation logic, better error messages, automatic type inference.

### 5. Handler Logic Updates

**File**: `apps/server/src/api/routes/accounts/auth.handlers.ts`

**Changes**:

```typescript
// Before (manual JSON parsing)
if (permissions) {
  try {
    const permissionArray = JSON.parse(permissions);
    const validPermissions = ["view_reports", "edit_budget", ...];
    const invalidPerms = permissionArray.filter(p => !validPermissions.includes(p));
    if (invalidPerms.length > 0) {
      throw new HTTPException(400, {
        message: `Invalid permissions: ${invalidPerms.join(", ")}`,
      })
    }
  } catch (error) {
    throw new HTTPException(400, {
      message: "Invalid permissions format",
    })
  }
}

// After (direct array handling)
if (permissions && permissions.length > 0) {
  const validPermissions = ["view_reports", "edit_budget", ...];
  const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
  if (invalidPerms.length > 0) {
    throw new HTTPException(400, {
      message: `Invalid permissions: ${invalidPerms.join(", ")}`,
    })
  }
}
```

**Validation Service** (new):

**File**: `apps/server/src/api/services/validation.service.ts`

```typescript
export class ValidationService {
  static async validatePermissions(permissions: string[]): Promise<void> {
    const validPermissions = ["view_reports", "edit_budget", "manage_users", "admin_access", "all_quarters"];
    const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPerms.length > 0) {
      throw new HTTPException(400, {
        message: `Invalid permissions: ${invalidPerms.join(", ")}`,
      });
    }
  }

  static async validateProjectAccess(projectIds: number[]): Promise<void> {
    if (projectIds.length === 0) return;
    
    const validProjects = await db.query.projects.findMany({
      where: inArray(schema.projects.id, projectIds)
    });
    
    if (validProjects.length !== projectIds.length) {
      const validIds = validProjects.map(p => p.id);
      const invalidIds = projectIds.filter(id => !validIds.includes(id));
      throw new HTTPException(400, {
        message: `Invalid project IDs: ${invalidIds.join(", ")}`,
      });
    }
  }
}
```

**Rationale**: Centralized validation logic, reusable across handlers, cleaner code.

### 6. Response Formatting

**File**: `apps/server/src/api/routes/accounts/auth.handlers.ts`

**Changes in `formatUserResponse`**:

```typescript
// Before (no guarantee of array type)
permissions: user.permissions,
projectAccess: user.projectAccess,

// After (ensure arrays)
permissions: user.permissions || [],
projectAccess: user.projectAccess || [],
```

**Rationale**: Consistent API responses, no null values for arrays.

### 7. Auth Types Update

**File**: `apps/server/src/api/routes/accounts/auth.types.ts`

**Changes**:

```typescript
// Before
permissions: z.record(z.string(), z.any()).nullable(),
projectAccess: z.array(z.number()).nullable(),

// After
permissions: z.array(z.string()).default([]),
projectAccess: z.array(z.number()).default([]),
```

**Rationale**: Consistent with new schema, no nullable arrays.

## Data Models

### User Schema (Updated)

```typescript
export const users = pgTable("users", {
  id: serial().primaryKey().notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  role: userRole().notNull(),
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  facilityId: integer("facility_id"),

  // Updated fields
  permissions: jsonb("permissions").$type<string[]>().default([]),
  projectAccess: jsonb("project_access").$type<number[]>().default([]),
  
  configAccess: text("config_access"),
  lastLoginAt: timestamp("last_login_at"),
  isActive: boolean("is_active").default(true),
  createdBy: integer("created_by"),
  mustChangePassword: boolean("must_change_password").default(true),
});
```

### Permission Constants

**File**: `apps/server/src/api/constants/permissions.ts` (new file)

```typescript
export const VALID_PERMISSIONS = [
  'view_reports',
  'edit_budget',
  'manage_users',
  'admin_access',
  'all_quarters',
] as const;

export type Permission = typeof VALID_PERMISSIONS[number];

export const PERMISSION_DESCRIPTIONS: Record<Permission, string> = {
  view_reports: 'View financial reports',
  edit_budget: 'Edit budget data',
  manage_users: 'Manage user accounts',
  admin_access: 'Full administrative access',
  all_quarters: 'Access all quarters',
};
```

## Error Handling

### Validation Errors

**Format**:
```json
{
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "permissions",
      "message": "Invalid permissions: invalid_perm"
    }
  ]
}
```

### Migration Errors

**Handling**:
1. Log all migration errors with user IDs
2. Set problematic records to empty arrays
3. Generate migration report
4. Allow manual review of failed conversions

**Example Log**:
```
[MIGRATION WARNING] User ID 123: Invalid permissions JSON "invalid json" - set to []
[MIGRATION WARNING] User ID 456: Invalid projectAccess JSON "null" - set to []
```

### Runtime Errors

**Scenarios**:
1. **Invalid permission string**: Return 400 with specific invalid permissions
2. **Invalid project ID**: Return 400 with specific invalid project IDs
3. **Database constraint violation**: Return 500 with generic error message
4. **Type mismatch**: Caught by TypeScript at compile time

## Testing Strategy

### Unit Tests

**File**: `apps/server/src/api/services/__tests__/validation.service.test.ts`

**Test Cases**:
1. Valid permissions array → passes
2. Invalid permission in array → throws with specific error
3. Empty permissions array → passes
4. Valid project IDs → passes
5. Invalid project ID in array → throws with specific error
6. Empty project access array → passes
7. Duplicate permissions → deduplicates
8. Duplicate project IDs → deduplicates

### Integration Tests

**File**: `apps/server/src/api/routes/accounts/__tests__/auth.integration.test.ts`

**Test Cases**:
1. Sign up with valid permissions array → success
2. Sign up with invalid permission → 400 error
3. Sign up with valid project access → success
4. Sign up with invalid project ID → 400 error
5. Sign up with empty arrays → success with defaults
6. Update user with new permissions → success
7. Get session returns arrays (not null) → success

### Migration Tests

**File**: `apps/server/src/db/migrations/__tests__/permissions-migration.test.ts`

**Test Cases**:
1. Migrate valid JSON string → correct array
2. Migrate null value → empty array
3. Migrate empty string → empty array
4. Migrate invalid JSON → empty array with warning
5. Migrate complex nested structure → flattened array
6. Rollback migration → restores original data

### End-to-End Tests

**Scenarios**:
1. Create user with permissions → verify in database
2. Update user permissions → verify changes
3. Retrieve user → verify array format
4. Filter users by permission → verify query works
5. Check permission on protected route → verify authorization

## Migration Plan

### Phase 1: Preparation (No Downtime)
1. Add new JSONB columns alongside existing text columns
2. Deploy code that writes to both old and new columns
3. Run background job to migrate existing data
4. Verify data consistency

### Phase 2: Cutover (Minimal Downtime)
1. Deploy code that reads from new columns
2. Monitor for errors
3. Drop old columns after verification period (7 days)

### Phase 3: Cleanup
1. Remove dual-write logic
2. Update documentation
3. Remove old validation code

### Migration SQL

```sql
-- Phase 1: Add new columns
ALTER TABLE users 
ADD COLUMN permissions_new JSONB DEFAULT '[]'::jsonb,
ADD COLUMN project_access_new JSONB DEFAULT '[]'::jsonb;

-- Phase 1: Migrate data
UPDATE users
SET 
  permissions_new = CASE 
    WHEN permissions IS NULL OR permissions = '' THEN '[]'::jsonb
    WHEN permissions::text ~ '^[\[\{]' THEN 
      CASE 
        WHEN jsonb_typeof(permissions::jsonb) = 'array' THEN permissions::jsonb
        ELSE '[]'::jsonb
      END
    ELSE '[]'::jsonb
  END,
  project_access_new = CASE 
    WHEN project_access IS NULL OR project_access = '' THEN '[]'::jsonb
    WHEN project_access::text ~ '^[\[\{]' THEN 
      CASE 
        WHEN jsonb_typeof(project_access::jsonb) = 'array' THEN project_access::jsonb
        ELSE '[]'::jsonb
      END
    ELSE '[]'::jsonb
  END;

-- Phase 2: Drop old columns and rename
ALTER TABLE users 
DROP COLUMN permissions,
DROP COLUMN project_access;

ALTER TABLE users 
RENAME COLUMN permissions_new TO permissions;

ALTER TABLE users 
RENAME COLUMN project_access_new TO project_access;

-- Add indexes for performance
CREATE INDEX idx_users_permissions ON users USING GIN (permissions);
CREATE INDEX idx_users_project_access ON users USING GIN (project_access);
```

## Performance Considerations

### Database Indexing
- GIN indexes on JSONB columns for fast array containment queries
- Example query: `WHERE permissions @> '["admin_access"]'`

### Query Optimization
- Use `@>` operator for "contains" queries
- Use `?` operator for "has element" queries
- Avoid full table scans with proper indexing

### Caching Strategy
- Cache valid permissions list (rarely changes)
- Cache project existence checks (TTL: 5 minutes)
- No caching of user permissions (security sensitive)

## Security Considerations

### Permission Validation
- Whitelist approach: only known permissions allowed
- Validate on every write operation
- Log permission changes for audit trail

### Project Access Validation
- Verify project IDs exist before assignment
- Check user has permission to assign project access
- Prevent privilege escalation through project access

### API Security
- Require authentication for all permission operations
- Require admin role for assigning permissions
- Rate limit permission update endpoints

## Rollback Strategy

### Immediate Rollback (< 24 hours)
1. Revert to previous deployment
2. Old columns still exist with original data
3. No data loss

### Late Rollback (> 24 hours)
1. Run reverse migration to restore text columns
2. Convert JSONB back to stringified JSON
3. Verify data integrity
4. Redeploy old code

### Rollback SQL

```sql
-- Restore old columns
ALTER TABLE users 
ADD COLUMN permissions_old TEXT,
ADD COLUMN project_access_old TEXT;

-- Convert JSONB back to text
UPDATE users
SET 
  permissions_old = permissions::text,
  project_access_old = project_access::text;

-- Drop new columns and rename
ALTER TABLE users 
DROP COLUMN permissions,
DROP COLUMN project_access;

ALTER TABLE users 
RENAME COLUMN permissions_old TO permissions;

ALTER TABLE users 
RENAME COLUMN project_access_old TO project_access;
```

## Documentation Updates

### API Documentation
- Update OpenAPI schema with array types
- Add examples showing array format
- Document valid permission values
- Document project access behavior

### Developer Guide
- Add section on working with permissions
- Provide code examples for common operations
- Document validation rules
- Explain migration process

### Database Schema Documentation
- Update ER diagrams
- Document JSONB column usage
- Explain indexing strategy
- Provide query examples

## Monitoring and Observability

### Metrics to Track
- Permission validation failures (by permission type)
- Project access validation failures (by project ID)
- Migration success rate
- Query performance on JSONB columns

### Logging
- Log all permission changes with user ID and timestamp
- Log validation failures with details
- Log migration warnings and errors
- Log slow queries on permissions/project access

### Alerts
- Alert on high validation failure rate (> 5%)
- Alert on migration errors
- Alert on slow queries (> 1s)
- Alert on permission escalation attempts
