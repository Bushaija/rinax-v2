# Implementation Plan

- [x] 1. Set up backend service layer and utilities





  - Create dashboard service directory structure
  - Implement budget calculation utility functions (calculateAllocatedBudget, calculateSpentBudget, calculateUtilization)
  - Create access control helper functions for dashboard queries
  - Add database query helper functions for aggregations
  - _Requirements: 1.1, 4.1, 10.1_
-

- [x] 2. Implement Dashboard Metrics API endpoint




- [x] 2.1 Create route definition and schema


  - Define GET /api/dashboard/metrics route in dashboard.routes.ts
  - Create Zod schema for query parameters (level, provinceId, districtId, programId, quarter)
  - Create Zod schema for response (totalAllocated, totalSpent, remaining, utilizationPercentage, reportingPeriod)
  - Add OpenAPI documentation with examples
  - _Requirements: 10.1, 10.2, 10.3, 10.8_

- [x] 2.2 Implement handler logic


  - Validate user session via getUserContext
  - Get current active reporting period
  - Determine facility scope based on level parameter
  - Apply user access control filtering
  - Fetch and aggregate planning entries
  - Fetch and aggregate execution entries
  - Apply program and quarter filters
  - Calculate metrics (allocated, spent, remaining, utilization)
  - Return JSON response
  - _Requirements: 10.1, 10.2, 10.3, 10.6, 10.7, 10.8_

- [x] 3. Implement Program Distribution API endpoint





- [x] 3.1 Create route definition and schema


  - Define GET /api/dashboard/program-distribution route
  - Create Zod schema for query parameters
  - Create Zod schema for response (programs array with programId, programName, allocatedBudget, percentage)
  - _Requirements: 11.1, 11.2, 11.3, 11.7_

- [x] 3.2 Implement handler logic


  - Validate user and get context
  - Determine facility scope
  - Fetch projects grouped by project_type (program)
  - Join with planning entries
  - Calculate allocated budget per program
  - Calculate percentage of total
  - Sort by allocated budget descending
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 4. Implement Budget by District API endpoint





- [x] 4.1 Create route definition and schema


  - Define GET /api/dashboard/budget-by-district route
  - Create Zod schema for query parameters (provinceId, programId, quarter)
  - Create Zod schema for response (districts array)
  - _Requirements: 12.1, 12.2, 12.3, 12.6_

- [x] 4.2 Implement handler logic


  - Validate user and get context
  - Fetch districts in province
  - For each district, aggregate facility budgets
  - Apply user access control
  - Apply program and quarter filters
  - Calculate metrics per district
  - Sort by allocated budget descending
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_
-

- [x] 5. Implement Budget by Facility API endpoint




- [x] 5.1 Create route definition and schema


  - Define GET /api/dashboard/budget-by-facility route
  - Create Zod schema for query parameters (districtId, programId, quarter)
  - Create Zod schema for response (facilities array)
  - _Requirements: 13.1, 13.2, 13.3, 13.7_

- [x] 5.2 Implement handler logic


  - Validate user and get context
  - Fetch facilities in district
  - Apply user access control
  - Aggregate planning and execution data per facility
  - Apply program and quarter filters
  - Calculate metrics per facility
  - Sort by allocated budget descending
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

-

- [x] 6. Implement Province Approval Summary API endpoint



- [x] 6.1 Create route definition and schema


  - Define GET /api/dashboard/approved-budgets/province route
  - Create Zod schema for query parameters (provinceId, programId, quarter)
  - Create Zod schema for response (districts array with approval counts)
  - _Requirements: 14.1, 14.2, 14.3, 14.7_

- [x] 6.2 Implement handler logic


  - Validate user and get context
  - Fetch districts in province
  - For each district, count planning entries by status
  - Calculate approval rate (approvedCount ÷ totalCount × 100)
  - Sum allocated budgets
  - Apply program and quarter filters
  - Sort by district name
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7_

- [x] 7. Implement District Approval Details API endpoint







- [x] 7.1 Create route definition and schema

  - Define GET /api/dashboard/approved-budgets/district route
  - Create Zod schema for query parameters (districtId, programId, quarter)
  - Create Zod schema for response (facilities array with approval details)

  - _Requirements: 15.1, 15.2, 15.3, 15.8_

- [x] 7.2 Implement handler logic

  - Validate user and get context
  - Fetch facilities in district
  - Apply user access control
  - Fetch planning entries with project details
  - Extract approval metadata (approvedBy, approvedAt from JSONB)
  - Apply program and quarter filters
  - Sort by facility name, then project name
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7, 15.8_

- [ ] 8. Register all dashboard routes





  - Import all route definitions in dashboard.index.ts
  - Register routes with Hono app
  - Ensure proper middleware (auth, error handling) is applied
  - Test all endpoints with Postman/Insomnia
  - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1, 15.1_
-

- [ ] 9. Add database indexes for performance





  - Create migration file for new indexes
  - Add index on projects(facility_id, reporting_period_id) WHERE status = 'ACTIVE'
  - Add index on schemaFormDataEntries(entity_type, facility_id, reporting_period_id)
  - Add index on schemaFormDataEntries(project_id, entity_type)
  - Add index on schemaFormDataEntries(status) WHERE status IN ('APPROVED', 'PENDING', 'REJECTED')
  - Run migration and verify indexes are created
  - _Requirements: Performance optimization_
-

- [x] 10. Migrate legacy facility-overview endpoint




- [x] 10.1 Update existing endpoint to use new service layer


  - Refactor getAccountantFacilityOverview handler to use new metrics service
  - Maintain backward compatibility with existing response format
  - Add deprecation warning to response headers
  - _Requirements: 20.1, 20.2, 20.3, 20.4_

- [x] 10.2 Update client-side code to use new endpoint


  - Update getFacilityOverview fetcher to call /api/dashboard/metrics
  - Update query parameters to new format (level, districtId)
  - Update TypeScript interfaces to match new response
  - Test existing dashboard page still works
  - _Requirements: 20.5_

- [x] 11. Create frontend fetcher functions







  - Create apps/client/fetchers/dashboard/get-metrics.ts
  - Create apps/client/fetchers/dashboard/get-program-distribution.ts
  - Create apps/client/fetchers/dashboard/get-budget-by-district.ts
  - Create apps/client/fetchers/dashboard/get-budget-by-facility.ts
  - Create apps/client/fetchers/dashboard/get-province-approvals.ts
  - Create apps/client/fetchers/dashboard/get-district-approvals.ts
  - Add TypeScript interfaces for request/response types
  - _Requirements: 10.1, 11.1, 12.1, 13.1, 14.1, 15.1_
-

- [x] 12. Create React Query hooks






  - Create apps/client/hooks/queries/dashboard/use-get-metrics.ts
  - Create apps/client/hooks/queries/dashboard/use-get-program-distribution.ts
  - Create apps/client/hooks/queries/dashboard/use-get-budget-by-district.ts
  - Create apps/client/hooks/queries/dashboard/use-get-budget-by-facility.ts
  - Create apps/client/hooks/queries/dashboard/use-get-province-approvals.ts
  - Create apps/client/hooks/queries/dashboard/use-get-district-approvals.ts
  - Configure staleTime (5 minutes) and refetchInterval
  - _Requirements: 19.1, 19.2_

- [x] 13. Create reusable dashboard components







- [x] 13.1 Create DashboardTabs component


  - Implement tab switcher for Province and District tabs
  - Manage active tab state
  - Apply styling with Tailwind CSS
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 13.2 Create DashboardFilters component


  - Implement filter dropdowns for province, district, program, quarter
  - Show/hide filters based on active tab
  - Manage filter state
  - Add clear filters button
  - Apply responsive design
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 13.3 Update BudgetSummaryCards component


  - Reuse existing component or create new version
  - Display 4 metric cards (Allocated, Spent, Remaining, Utilization)
  - Apply color scheme (blue, green, orange, purple)
  - Add responsive grid layout
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 13.4 Create ProgramDistributionChart component


  - Implement pie chart using Recharts or Chart.js
  - Display program names and budget amounts
  - Add hover tooltips with percentage
  - Add legend with toggle capability
  - Apply consistent color palette
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 13.5 Create BudgetBarChart component


  - Implement bar chart for district or facility budgets
  - Display entity names on X-axis, budget on Y-axis
  - Add hover tooltips with detailed metrics
  - Sort bars by budget descending
  - Apply responsive design
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_


- [x] 13.6 Create ProvinceApprovalTable component


  - Implement data table with columns: ID, District Name, Allocated Budget, Approved Count, Rejected Count, Approval Rate
  - Add sortable columns
  - Add pagination (20 rows per page)
  - Add row click handler to navigate to District tab
  - Apply responsive design with horizontal scroll on mobile
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

- [x] 13.7 Create DistrictApprovalTable component


  - Implement data table with columns: ID, Health Facility, Allocated Budget, Approved Status, Approved By, Approved At
  - Add status badge styling (green/yellow/red)
  - Add sortable columns
  - Add pagination
  - Apply responsive design
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9_

- [x] 13.8 Create DashboardSkeleton component


  - Create skeleton loaders for all dashboard components
  - Match component structure to prevent layout shift
  - Add shimmer animation
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 14. Implement Province Tab page




- [ ] 14. Implement Province Tab page


- [x] 14.1 Create Province tab layout


  - Implement filter bar with province, program, quarter filters
  - Display 4 summary metric cards
  - Display pie chart and bar chart side by side
  - Display province approval summary table
  - Apply responsive grid layout
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 5.1, 6.1, 8.1_

- [x] 14.2 Integrate data fetching


  - Use useGetMetrics hook with level='province'
  - Use useGetProgramDistribution hook
  - Use useGetBudgetByDistrict hook
  - Use useGetProvinceApprovals hook
  - Handle loading states with skeletons
  - Handle error states with error messages
  - _Requirements: 10.1, 11.1, 12.1, 14.1, 17.1, 18.1_

- [x] 14.3 Implement filter interactions


  - Update query parameters when filters change
  - Refetch data when filters change
  - Show loading indicators during refetch
  - Preserve filter state in URL query params
  - _Requirements: 2.6, 19.5_

- [x] 15. Implement District Tab page






- [x] 15.1 Create District tab layout


  - Implement filter bar with district, program, quarter filters
  - Display 4 summary metric cards
  - Display pie chart and bar chart side by side
  - Display district approval details table
  - Apply responsive grid layout
  - _Requirements: 1.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 5.1, 7.1, 9.1_

- [x] 15.2 Integrate data fetching


  - Use useGetMetrics hook with level='district'
  - Use useGetProgramDistribution hook
  - Use useGetBudgetByFacility hook
  - Use useGetDistrictApprovals hook
  - Handle loading states with skeletons
  - Handle error states with error messages
  - _Requirements: 10.1, 11.1, 13.1, 15.1, 17.1, 18.1_

- [x] 15.3 Implement filter interactions


  - Update query parameters when filters change
  - Refetch data when filters change
  - Show loading indicators during refetch
  - Preserve filter state in URL query params
  - _Requirements: 3.6, 19.5_
-

- [x] 16. Update main dashboard page






- [x] 16.1 Integrate tab navigation


  - Add DashboardTabs component to page
  - Manage active tab state
  - Conditionally render Province or District tab content
  - Preserve tab state in URL
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 16.2 Implement responsive layout


  - Apply mobile-first responsive design
  - Stack cards vertically on mobile (<768px)
  - Full-width charts on mobile
  - Horizontal scroll for tables on mobile
  - Test on various screen sizes
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5_

- [x] 16.3 Add error handling


  - Display error alerts for network failures
  - Display permission error messages
  - Add retry buttons for failed requests
  - Log errors to console/monitoring
  - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 16.4 Implement auto-refresh


  - Configure React Query to refetch every 5 minutes
  - Display last updated timestamp
  - Add manual refresh button
  - Show subtle loading indicator during background refresh
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [ ] 17. Add accessibility features
  - Add ARIA labels to all interactive elements
  - Ensure keyboard navigation works for all components
  - Add focus indicators
  - Test with screen reader
  - Verify color contrast meets WCAG AA standards
  - _Requirements: Accessibility compliance_

- [ ]* 18. Write backend unit tests
  - [ ]* 18.1 Test budget calculation functions
    - Test calculateAllocatedBudget with various form data structures
    - Test calculateSpentBudget with execution data
    - Test calculateUtilization with edge cases (zero allocated, negative values)
    - _Requirements: Service layer testing_

  - [ ]* 18.2 Test access control functions
    - Test getUserContext with different user roles
    - Test facility access filtering for hospital users
    - Test facility access filtering for health center users
    - Test admin access permissions
    - _Requirements: Access control testing_

  - [ ]* 18.3 Test aggregation functions
    - Test province-level aggregation logic
    - Test district-level aggregation logic
    - Test program-level grouping
    - _Requirements: Aggregation testing_

- [ ]* 19. Write API integration tests
  - [ ]* 19.1 Test metrics endpoint
    - Test with province level and valid provinceId
    - Test with district level and valid districtId
    - Test with program filter
    - Test with quarter filter
    - Test with missing required parameters (400 error)
    - Test with unauthorized user (401 error)
    - Test with forbidden access (403 error)
    - _Requirements: 10.1, 10.2, 10.3, 10.6, 10.7, 10.8_

  - [ ]* 19.2 Test program distribution endpoint
    - Test returns programs sorted by budget
    - Test calculates percentages correctly
    - Test applies filters correctly
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [ ]* 19.3 Test budget by district endpoint
    - Test aggregates district budgets correctly
    - Test applies user access control
    - Test sorts by budget descending
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

  - [ ]* 19.4 Test budget by facility endpoint
    - Test aggregates facility budgets correctly
    - Test applies user access control
    - Test sorts by budget descending
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

  - [ ]* 19.5 Test province approval summary endpoint
    - Test counts approvals correctly
    - Test calculates approval rate
    - Test applies filters
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [ ]* 19.6 Test district approval details endpoint
    - Test retrieves approval metadata from JSONB
    - Test handles pending status (null approvedBy/approvedAt)
    - Test applies filters
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [ ]* 20. Write frontend component tests
  - [ ]* 20.1 Test DashboardTabs component
    - Test tab switching updates active state
    - Test tab state persists in URL
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

  - [ ]* 20.2 Test DashboardFilters component
    - Test filter selection updates state
    - Test clear filters button resets all filters
    - Test filters trigger data refetch
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 20.3 Test BudgetSummaryCards component
    - Test renders correct metric values
    - Test displays utilization percentage correctly
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 20.4 Test chart components
    - Test ProgramDistributionChart renders pie slices
    - Test BudgetBarChart renders bars correctly
    - Test tooltips display on hover
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 20.5 Test table components
    - Test ProvinceApprovalTable renders rows
    - Test DistrictApprovalTable renders rows
    - Test sorting functionality
    - Test pagination
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4_

- [ ] 21. Update API documentation
  - Document all 6 new endpoints in OpenAPI spec
  - Add request/response examples for each endpoint
  - Document query parameters and their constraints
  - Document error responses
  - Document role-based access restrictions
  - _Requirements: 20.6_

- [ ] 22. Performance testing and optimization
  - Test endpoints with large datasets (1000+ facilities)
  - Measure response times and optimize slow queries
  - Verify database indexes are being used (EXPLAIN queries)
  - Test concurrent user access
  - Optimize frontend bundle size (code splitting)
  - _Requirements: Performance optimization_

- [ ] 23. End-to-end testing
  - Test complete user flow: login → select province → view data → switch to district → drill down
  - Test filter combinations work correctly
  - Test responsive design on mobile devices
  - Test error scenarios (network failure, permission denied)
  - Test auto-refresh functionality
  - _Requirements: Complete system testing_

- [ ] 24. Deploy to staging and conduct UAT
  - Deploy backend changes to staging environment
  - Deploy frontend changes to staging environment
  - Conduct user acceptance testing with stakeholders
  - Gather feedback and make adjustments
  - Document any issues found
  - _Requirements: Deployment and validation_
