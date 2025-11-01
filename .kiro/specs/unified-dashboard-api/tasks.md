# Implementation Plan

- [x] 1. Create unified dashboard service layer




  - Create `DashboardService` class with parallel component execution
  - Implement error isolation with try/catch per component
  - Add component routing logic to dispatch to appropriate handlers
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2_

- [x] 1.1 Implement DashboardService class structure


  - Create `apps/server/src/api/services/dashboard/unified-dashboard.service.ts`
  - Define `DashboardFilters` and `ComponentResult` interfaces
  - Implement `getDashboardData` method with Promise.all for parallel execution
  - Add `fetchComponent` method with switch statement for component routing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 5.1, 6.1_

- [x] 1.2 Implement component handler methods


  - Add `getMetrics` method reusing `aggregateBudgetData` service
  - Add `getProgramDistribution` method reusing `aggregateByProgram` service
  - Add `getBudgetByDistrict` method reusing `aggregateByDistrict` service
  - Add `getBudgetByFacility` method reusing `aggregateByFacility` service
  - Add `getProvinceApprovals` method with approval status aggregation
  - Add `getDistrictApprovals` method with facility-level approval details
  - Add `getTasks` method reusing existing tasks logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 1.3 Add reporting period resolution


  - Implement `getReportingPeriod` method to fetch specific or active period
  - Add caching for reporting period within request scope
  - Handle missing reporting period gracefully
  - _Requirements: 3.1, 3.2, 6.5_

- [ ]* 1.4 Write unit tests for DashboardService
  - Test parallel execution of multiple components
  - Test error isolation (one component fails, others succeed)
  - Test unknown component handling
  - Test empty component list handling
  - Test filter application to all components
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_
-

- [x] 2. Implement role-based scope service




  - Create `RoleScopeService` with role-to-scope mapping logic
  - Implement admin bypass for superadmin/admin roles
  - Add facility ID resolution based on user role and organizational assignment
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 2.1 Create role-scope service file


  - Create `apps/server/src/api/services/dashboard/role-scope.service.ts`
  - Implement `applyRoleBasedScope` function
  - Add role-specific scope logic for hospital_accountant, district_accountant, provincial_accountant
  - Implement `isAdminUser` helper function
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2.2 Add facility ID resolution for provincial accountants

  - Query user's facility to get district and province information
  - Fetch all facilities in the province for provincial accountants
  - Set scope to 'province' and scopeId to provinceId
  - _Requirements: 4.2_

- [ ]* 2.3 Write unit tests for role-scope service
  - Test admin users bypass restrictions
  - Test hospital accountant scope (facility + children)
  - Test district accountant scope (district facilities)
  - Test provincial accountant scope (province facilities)
  - Test default scope (accessible facilities only)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [x] 3. Create unified dashboard API route



  - Define OpenAPI route specification with query parameters
  - Create route handler with parameter validation
  - Integrate DashboardService and RoleScopeService
  - Add user context retrieval and authentication
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 4.5_

- [x] 3.1 Define OpenAPI route specification


  - Create `apps/server/src/api/routes/dashboard/unified-dashboard.routes.ts`
  - Define `componentSchema` enum with all component types
  - Define `scopeSchema` enum with scope levels
  - Create `getUnifiedDashboard` route with query parameters and response schemas
  - _Requirements: 1.1, 2.1, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.2 Implement route handler


  - Create `apps/server/src/api/routes/dashboard/unified-dashboard.handlers.ts`
  - Implement `getUnifiedDashboard` handler function
  - Add user context retrieval with `getUserContext`
  - Parse and validate query parameters (components, scope, scopeId, programId, periodId, quarter)
  - Validate scope requires scopeId
  - Validate quarter range (1-4)
  - Call DashboardService with parsed filters and components
  - Return JSON response with component results
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3, 3.4, 3.5, 4.5_

- [x] 3.3 Register unified dashboard route


  - Update `apps/server/src/api/routes/dashboard/dashboard.index.ts`
  - Import unified dashboard route and handler
  - Register route with Hono app
  - _Requirements: 1.1_

- [ ]* 3.4 Write integration tests for unified endpoint
  - Test single component request
  - Test multiple component request
  - Test filter synchronization across components
  - Test role-based access control enforcement
  - Test error isolation (partial failures)
  - Test invalid parameters (400 errors)
  - Test unauthorized access (401 errors)
  - Test forbidden access (403 errors)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Add deprecation headers to legacy endpoints





  - Update all existing dashboard handlers to add deprecation headers
  - Add logging for legacy endpoint usage tracking
  - Document migration path in deprecation message
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4.1 Add deprecation headers to legacy handlers


  - Update `getAccountantFacilityOverview` handler (already has headers)
  - Update `getAccountantTasks` handler
  - Update `getDashboardMetrics` handler
  - Update `getProgramDistribution` handler
  - Update `getBudgetByDistrict` handler
  - Update `getBudgetByFacility` handler
  - Update `getProvinceApprovalSummary` handler
  - Update `getDistrictApprovalDetails` handler
  - Add headers: `X-Deprecated: true`, `X-Deprecation-Message`, `X-Deprecation-Date`
  - _Requirements: 7.1, 7.2_

- [x] 4.2 Add legacy endpoint usage logging


  - Add console.log statements to each legacy handler
  - Log userId, endpoint path, and timestamp
  - _Requirements: 7.4_
-

- [x] 5. Create unified dashboard frontend hook




  - Implement `useDashboard` hook with React Query
  - Add filter state management
  - Implement query parameter building
  - Add TypeScript types for all components
  - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2, 9.3_

- [x] 5.1 Create useDashboard hook file


  - Create `apps/client/hooks/use-dashboard.ts`
  - Define `DashboardFilters` and `UseDashboardOptions` interfaces
  - Implement `useDashboard` hook using `useQuery` from React Query
  - Build query parameters from filters
  - Add query key with components and filters for caching
  - Set staleTime to 5 minutes
  - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.2_

- [x] 5.2 Add TypeScript types for component responses


  - Create `apps/client/types/dashboard.ts`
  - Define types for each component response (metrics, programDistribution, etc.)
  - Define `UnifiedDashboardResponse` type
  - Define `ComponentResult` type with error handling
  - _Requirements: 8.1, 8.2_

- [ ]* 5.3 Create example dashboard component
  - Create `apps/client/components/dashboard/UnifiedDashboard.tsx`
  - Use `useDashboard` hook with multiple components
  - Implement filter bar for scope, program, quarter selection
  - Render component cards with error handling
  - Show single loading spinner for all components
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3_

- [ ] 6. Update API documentation
  - Add unified dashboard endpoint to OpenAPI documentation
  - Document all query parameters and response formats
  - Add example requests and responses
  - Document migration guide from legacy endpoints
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 6.1 Update OpenAPI documentation
  - Ensure unified dashboard route is included in OpenAPI spec
  - Add detailed descriptions for all parameters
  - Add example responses for success and error cases
  - _Requirements: 7.1, 7.2_

- [ ] 6.2 Create migration guide document
  - Create `docs/dashboard-api-migration.md`
  - Document mapping from legacy endpoints to unified endpoint
  - Provide code examples for before/after migration
  - List deprecation timeline and deadlines
  - _Requirements: 7.1, 7.2, 7.3_

- [ ]* 7. Performance testing and optimization
  - Test response times with various component combinations
  - Verify parallel execution performance gains
  - Test with large facility sets (100+ facilities)
  - Optimize slow queries if needed
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 7.1 Create performance test suite
  - Create `apps/server/tests/performance/dashboard.perf.test.ts`
  - Test response time for 1 component (target < 500ms)
  - Test response time for 7 components (target < 3s)
  - Test with 100 facilities
  - Measure database query count per request
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 7.2 Optimize slow queries
  - Add database indexes if needed (facilityId, reportingPeriodId, entityType)
  - Implement query result caching for static data
  - Optimize JSONB parsing for budget calculations
  - _Requirements: 6.3, 6.4_

- [ ] 8. Deploy and monitor unified endpoint
  - Deploy unified endpoint to staging environment
  - Monitor performance metrics and error rates
  - Validate role-based access control in production-like environment
  - Collect initial usage data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_

- [ ] 8.1 Deploy to staging
  - Deploy unified dashboard endpoint to staging environment
  - Verify all components work correctly
  - Test with real user accounts and data
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8.2 Set up monitoring and alerts
  - Add logging for request count, response time, error rate
  - Set up alerts for response time > 5s, error rate > 5%
  - Monitor legacy vs unified endpoint usage
  - _Requirements: 6.1, 6.2_

- [ ]* 8.3 Conduct user acceptance testing
  - Test with sample users from each role (admin, provincial, district, hospital accountants)
  - Verify data accuracy compared to legacy endpoints
  - Collect user feedback on performance and usability
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.1, 7.2, 7.3_
