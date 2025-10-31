# Implementation Plan

- [x] 1. Create Facility Hierarchy Service





  - Create FacilityHierarchyService class in apps/server/src/services/
  - Implement getAccessibleFacilityIds method with role-based logic (hospital users get own + children, health center users get own only, admins get all)
  - Implement getParentHospital method to find parent facility for health centers
  - Implement getChildFacilities method to retrieve all child facilities for a hospital
  - Implement canAccessFacility validation method
  - Implement getDafUsersForFacility method to find DAF approvers in hierarchy
  - Implement getDgUsersForFacility method to find DG approvers in hierarchy
  - Add caching layer for facility hierarchy relationships with 1-hour TTL
  - _Requirements: 2.1-2.4, 3.1-3.5, 5.2, 5.3_

- [x] 2. Add database index for performance





  - Create migration to add composite index on users table: (role, facility_id, is_active) for DAF/DG lookups
  - Create index on financial_reports: (facility_id, status) for queue queries
  - Verify existing indexes on facilities table (parent_facility_id, district_id)
  - _Requirements: 2.1, 3.1, 6.1, 6.2_
-

- [x] 3. Implement facility hierarchy middleware




  - Create facilityHierarchyMiddleware in apps/server/src/middleware/
  - Call FacilityHierarchyService.getAccessibleFacilityIds for authenticated user
  - Inject accessibleFacilityIds, userFacility, and userRole into request context
  - Add middleware to app middleware chain after authentication
  - _Requirements: 2.1-2.4, 4.1-4.3_

- [x] 4. Create validation utilities





  - Create validateRoleFacilityConsistency function to ensure DAF/DG roles only at hospitals
  - Create validateSameDistrict function to prevent cross-district operations
  - Create validateHierarchyAccess function to check facility access permissions
  - Add authorization error types with facility context details
  - _Requirements: 1.4, 2.5, 4.4, 4.5_

- [x] 5. Enhance user creation and update endpoints





  - Update POST /accounts/sign-up handler to validate DAF/DG role assignments
  - Add validation that DAF/DG roles require facilityId
  - Add validation that DAF/DG roles can only be assigned to hospital-type facilities
  - Update auth.routes.ts role enum to include 'daf' and 'dg'
  - Update authResponseSchema to include 'daf' and 'dg' in role enum
  - _Requirements: 1.1-1.5, 7.1-7.3_

- [x] 6. Create approval queue endpoints





  - Create GET /financial-reports/daf-queue endpoint that filters by pending_daf_approval status and accessible facilities
  - Create GET /financial-reports/dg-queue endpoint that filters by approved_by_daf status and accessible facilities
  - Include facility name, type, and submitter details in queue responses
  - Order queue items by submission date (oldest first)
  - Add pagination support for large queues
  - _Requirements: 6.1-6.4, 3.1, 3.2_
-

- [x] 7. Enhance existing financial reports endpoints




  - Update GET /financial-reports to filter by accessibleFacilityIds from context
  - Update GET /financial-reports/:id to validate facility access before returning
  - Add facility hierarchy information to report responses
  - Update query filters to respect hierarchy boundaries
  - _Requirements: 2.1-2.4, 4.1-4.3_

- [x] 8. Create facility hierarchy endpoints





  - Create GET /facilities/accessible endpoint to return user's accessible facilities
  - Create GET /facilities/:id/hierarchy endpoint to show parent and child facilities
  - Add authorization check that user can access requested facility
  - Include facility type and district information in responses
  - _Requirements: 2.3, 7.4_

- [x] 9. Enhance workflow service with hierarchy routing





  - Update submitForApproval to route to parent hospital DAF users
  - Update dafApprove to validate approver is at correct hospital and route to DG users
  - Update dgApprove to validate approver hierarchy access
  - Add canApproveReport method to validate hierarchy-based approval permissions
  - Update rejection flows to route back to original facility accountant
  - _Requirements: 3.1-3.5, 6.5, 5.2, 5.3_

- [x] 10. Update notification service for hierarchy





  - Enhance notifyDafUsers to use getDafUsersForFacility from hierarchy service
  - Enhance notifyDgUsers to use getDgUsersForFacility from hierarchy service
  - Add facility name and district context to notification messages
  - Ensure notifications only go to users within district hierarchy
  - Add fallback to admin users if no DAF/DG users found
  - _Requirements: 9.1-9.5, 3.4, 3.8_

- [ ] 11. Add audit logging for authorization
  - Create authorization_audit_logs table with userId, action, targetFacilityId, allowed, reason, timestamp
  - Implement logAuthorizationAttempt function
  - Add logging to all hierarchy access validation points
  - Log both successful and failed authorization attempts
  - _Requirements: 8.1-8.5, 4.5_

- [x] 12. Client: Create hierarchy context hook





  - Create useHierarchyContext hook in apps/client/hooks/
  - Fetch accessible facilities for current user
  - Expose isHospitalUser, canApprove, userRole, accessibleFacilities
  - Add React Query caching for facility data
  - _Requirements: 2.1-2.4, 5.1-5.5_
-

- [x] 13. Client: Create DAF approval queue interface




  - Create DafApprovalQueue page component in apps/client/pages/
  - Fetch reports from /financial-reports/daf-queue endpoint
  - Display facility name, type, and submitter for each report
  - Show report details with facility hierarchy context
  - Implement approve/reject actions with hierarchy validation
  - Add navigation link in dashboard for DAF users
  - _Requirements: 6.1-6.4, 5.2, 3.1-3.3_
-

- [x] 14. Client: Create DG approval queue interface




  - Create DgApprovalQueue page component in apps/client/pages/
  - Fetch reports from /financial-reports/dg-queue endpoint
  - Display facility name, type, DAF approval details
  - Show complete workflow timeline including DAF actions
  - Implement final approve/reject actions
  - Add navigation link in dashboard for DG users
  - _Requirements: 6.1-6.4, 5.3, 3.4-3.8_
-

- [x] 15. Client: Update user management UI




  - Update user creation form to show facility hierarchy when assigning DAF/DG roles
  - Add validation that DAF/DG roles require hospital facility selection
  - Display facility name and type in user lists for DAF/DG users
  - Show facility hierarchy tree in facility selector
  - _Requirements: 7.1-7.5_

- [x] 16. Client: Add facility hierarchy displays





  - Create FacilityHierarchyTree component to visualize parent-child relationships
  - Add facility context to report detail views
  - Show district boundaries in facility lists
  - Display accessible facilities for current user
  - _Requirements: 2.3, 7.4, 8.2_

- [x] 17. Client: Update API client methods





  - Add getDafQueue method to financial reports API client
  - Add getDgQueue method to financial reports API client
  - Add getAccessibleFacilities method to facilities API client
  - Add getFacilityHierarchy method to facilities API client
  - Update existing methods to handle hierarchy context
  - _Requirements: 6.1, 6.2, 2.3_

- [ ]* 18. Add integration tests for hierarchy system
  - Test hospital DAF can access own facility and child health centers
  - Test health center accountant can only access own facility
  - Test cross-district access is blocked
  - Test approval routing from health center to parent hospital DAF/DG
  - Test approval routing within same hospital
  - Test rejection flows route back to correct facility
  - Test admin users retain full access
  - Test DAF/DG role validation at hospital facilities only
  - _Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.8, 4.1-4.5_

- [ ]* 19. Add authorization audit logging tests
  - Test authorization attempts are logged
  - Test both successful and failed access logged
  - Test facility context included in logs
  - Test audit log immutability
  - _Requirements: 8.1-8.5_
