# Implementation Plan

- [x] 1. Update database schema and create type definitions





  - Update `apps/server/src/db/schema/users/schema.ts` to use JSONB columns for permissions and projectAccess
  - Create `apps/server/src/db/schema/users/types.ts` with UserPermission, UserPermissions, and ProjectAccess types
  - Remove unused imports (jsonb, unique, foreignKey, facilities) from schema file
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 6.1, 6.2_

- [x] 2. Create permission constants and validation service




  - Create `apps/server/src/api/constants/permissions.ts` with VALID_PERMISSIONS array and Permission type
  - Create `apps/server/src/api/services/validation.service.ts` with validatePermissions and validateProjectAccess methods
  - Implement permission whitelist validation logic
  - Implement project ID existence validation logic
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_





- [x] 3. Update API route schemas






  - Update `apps/server/src/api/routes/accounts/auth.routes.ts` to use z.array() for permissions and projectAccess
  - Remove complex string refinement validation logic
  - Set default values to empty arrays
  - Update all route definitions (signUp, banUser, unbanUser)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Update auth types





  - Update `apps/server/src/api/routes/accounts/auth.types.ts` to use array types instead of nullable
  - Change permissions from z.record() to z.array(z.string())
  - Change projectAccess from nullable to default empty array
  - _Requirements: 6.3, 6.4, 10.1, 10.2, 10.3, 10.4_
- [x] 5. Refactor auth handlers




- [ ] 5. Refactor auth handlers

  - Update `apps/server/src/api/routes/accounts/auth.handlers.ts` to remove JSON.parse() calls
  - Replace manual validation with ValidationService calls
  - Update formatUserResponse to ensure arrays are never null
  - Update signUp handler to work with arrays directly
  - Update banUser and unbanUser handlers if they reference permissions
  - _Requirements: 1.4, 1.5, 2.4, 2.5, 10.5_

- [ ] 6. Create database migration
  - Create migration file `apps/server/src/db/migrations/XXXX_simplify_permissions_project_access.sql`
  - Add new JSONB columns (permissions_new, project_access_new)
  - Write data migration logic to convert text JSON to JSONB arrays
  - Handle null, empty, and invalid JSON cases
  - Drop old columns and rename new columns
  - Add GIN indexes for performance
  - _Requirements: 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7. Generate and apply Drizzle migration
  - Run `pnpm drizzle-kit generate` to create migration files
  - Review generated migration for correctness
  - Run `pnpm drizzle-kit migrate` to apply migration to database
  - Verify migration completed successfully
  - _Requirements: 5.5_

- [ ]* 8. Write unit tests for validation service
  - Create `apps/server/src/api/services/__tests__/validation.service.test.ts`
  - Test valid permissions array passes validation
  - Test invalid permission throws error with specific message
  - Test empty permissions array passes
  - Test valid project IDs pass validation
  - Test invalid project ID throws error with specific message
  - Test empty project access array passes
  - _Requirements: 8.5, 9.5_

- [ ]* 9. Write integration tests for auth routes
  - Create or update `apps/server/src/api/routes/accounts/__tests__/auth.integration.test.ts`
  - Test sign up with valid permissions array succeeds
  - Test sign up with invalid permission returns 400
  - Test sign up with valid project access succeeds
  - Test sign up with invalid project ID returns 400
  - Test sign up with empty arrays uses defaults
  - Test get session returns arrays not null
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3, 10.4_

- [ ]* 10. Write migration tests
  - Create `apps/server/src/db/migrations/__tests__/permissions-migration.test.ts`
  - Test migration of valid JSON string to array
  - Test migration of null value to empty array
  - Test migration of empty string to empty array
  - Test migration of invalid JSON to empty array with warning
  - Test rollback restores original data
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 11. Update API documentation
  - Update OpenAPI schemas to show permissions as array of strings
  - Update OpenAPI schemas to show projectAccess as array of numbers
  - Add example requests with sample permissions arrays
  - Add example requests with sample projectAccess arrays
  - Add example responses showing array format
  - Document valid permission values in schema descriptions
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 12. Verify end-to-end functionality
  - Test creating a user with permissions through API
  - Test updating user permissions through API
  - Test retrieving user and verify array format in response
  - Test that validation errors return clear messages
  - Verify database stores data as JSONB arrays
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_
