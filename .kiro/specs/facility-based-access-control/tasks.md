# Implementation Plan

- [x] 1. Enhance user context service with district information





  - Update `getUserContext()` to retrieve user's facility with district_id
  - Add `getAccessibleFacilities()` helper to determine accessible facility IDs based on facility type
  - Add `facilityType` and `accessibleFacilityIds` to UserContext interface
  - Handle edge case where facility has no district_id
  - _Requirements: 6.1, 6.2, 6.3, 6.5_

- [x] 2. Create query filter utilities for district-based access





  - Create new file `apps/server/src/lib/utils/query-filters.ts`
  - Implement `buildFacilityFilter()` to generate WHERE clauses based on user context
  - Implement `validateRecordFacilityAccess()` to check if a record is accessible
  - Handle admin users (no filtering), hospital users (district filtering), and health center users (single facility)
  - _Requirements: 1.1, 1.2, 1.3, 1.7, 9.1_

- [x] 3. Update planning list endpoint with district-based filtering





  - Modify `planning.handlers.ts` list handler to use `getUserContext()` instead of `getUserFacility()`
  - Replace single facilityId filter with `inArray(facilityId, accessibleFacilityIds)` for non-admin users
  - Add validation for user-provided facilityId query parameter against accessible facilities
  - Return 403 error if user requests facility outside their district
  - Maintain admin bypass logic for unrestricted access
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8_

- [x] 4. Update planning getOne endpoint with district-based access control





  - Modify getOne handler to validate record's facilityId against user's accessible facilities
  - Use `canAccessFacility()` helper to check access
  - Return 403 error with clear message if facility not accessible
  - Allow admin users to access any record
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 5. Update planning create endpoint with district-based validation





  - Modify create handler to validate requested facilityId against accessible facilities
  - For hospital accountants: allow any facility in their district
  - For health center users: override facilityId with their own facility
  - For admin users: require explicit facilityId and allow any facility
  - Return 403 error if facilityId is outside user's district
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

- [ ] 6. Update planning update endpoint with district-based validation
  - Modify update handler to validate existing record's facilityId is accessible
  - Prevent changing facilityId to a facility outside user's district
  - Allow hospital accountants to update any record in their district
  - Allow health center users to only update their own facility's records
  - Allow admin users to update any record
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 7. Update planning delete endpoint with district-based validation
  - Modify remove handler to validate record's facilityId is accessible before deletion
  - Allow hospital accountants to delete records from any facility in their district
  - Allow health center users to only delete their own facility's records
  - Allow admin users to delete any record
  - Return 403 error if attempting to delete record from inaccessible facility
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 8. Update planning auxiliary endpoints with district-based access
  - Update `getActivities` endpoint to respect district-based access if needed
  - Update `getFormSchema` endpoint to respect district-based access if needed
  - Update `getDataSummary` endpoint to filter by accessible facilities
  - Ensure all endpoints consistently use district-based access control
  - _Requirements: 1.1, 1.2, 11.1, 11.5_

- [x] 9. Apply district-based access control to execution module





  - Update `execution.handlers.ts` list endpoint with district-based filtering
  - Update execution getOne endpoint with district-based validation
  - Update execution create endpoint with district-based validation
  - Update execution update endpoint with district-based validation
  - Update execution delete endpoint with district-based validation
  - Mirror all patterns from planning module for consistency
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2_

- [ ] 10. Add comprehensive error handling and user feedback
  - Ensure all 403 errors include clear messages about district access
  - Add specific error message "Access denied: facility not in your district"
  - Log access denied events for security monitoring
  - Maintain existing error handling for authentication and validation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 11. Write unit tests for user context and query utilities
  - Test `getUserContext()` for hospital users returns all district facilities
  - Test `getUserContext()` for health center users returns single facility
  - Test `getAccessibleFacilities()` correctly identifies district facilities
  - Test `canAccessFacility()` allows/denies access appropriately
  - Test `buildFacilityFilter()` generates correct SQL for different user types
  - Test `validateRecordFacilityAccess()` correctly validates record access
  - Test admin bypass logic works correctly
  - _Requirements: 6.1, 6.2, 6.3, 9.1_

- [ ]* 12. Write integration tests for planning endpoints
  - Test hospital accountant can list all district facilities' data
  - Test health center user can only list their own data
  - Test hospital accountant can create/update/delete for district facilities
  - Test health center user cannot access other facilities' data
  - Test admin can access all facilities
  - Test proper 403 errors for out-of-district access attempts
  - Test facilityId query parameter validation
  - _Requirements: 1.1, 1.2, 1.4, 2.1, 2.5, 3.1, 3.5, 4.1, 4.5, 5.1, 5.5_

- [ ]* 13. Write integration tests for execution endpoints
  - Test district-based access control for execution list endpoint
  - Test district-based access control for execution create/update/delete
  - Test consistency between planning and execution access patterns
  - Test edge cases (missing district_id, invalid facility_id, etc.)
  - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1_
