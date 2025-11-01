# Implementation Plan

- [x] 1. Update server-side filter interfaces and types





  - Update `DashboardFilters` interface in unified-dashboard.service.ts to replace `programId?: number` with `projectType?: string`
  - Update `AggregationFilters` interface in aggregation.service.ts to replace `programId?: number` with `projectType?: string`
  - Update JSDoc comments to reflect the new parameter name and type
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
-

- [x] 2. Update API route schema and validation




  - Replace `programId` parameter with `projectType` in the route schema (unified-dashboard.routes.ts)
  - Add Zod enum validation for projectType: `z.enum(['HIV', 'Malaria', 'TB']).optional()`
  - Update OpenAPI documentation description for the projectType parameter
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3. Update handler parameter parsing





  - Rename `programId: programIdStr` to `projectType: projectTypeStr` in unified-dashboard.handlers.ts
  - Remove numeric parsing logic for the program filter
  - Update filters object to use `projectType` instead of `programId`
  - Remove validation logic for numeric programId
  - _Requirements: 1.1, 3.2_


- [x] 4. Update aggregation service filtering logic



  - Update `aggregateBudgetData()` function to use `filters.projectType` instead of `filters.programId`
  - Remove `programIdStr` conversion and use direct string comparison: `entry.project?.projectType === filters.projectType`
  - Update `aggregateByDistrict()` function signature to accept `projectType?: string` instead of `programId?: number`
  - Update `aggregateByFacility()` function signature to accept `projectType?: string` instead of `programId?: number`
  - Update all function calls to pass `projectType` instead of `programId`
  - Update JSDoc parameter documentation for all modified functions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Update unified dashboard service component handlers





  - Update `getMetrics()` to pass `projectType` to aggregateBudgetData
  - Update `getProgramDistribution()` to use `filters.projectType` (no changes needed, already uses aggregateByProgram)
  - Update `getBudgetByDistrict()` to pass `projectType` instead of `programId`
  - Update `getBudgetByFacility()` to pass `projectType` instead of `programId`
  - Update `getProvinceApprovals()` to use `filters.projectType` with direct string comparison (remove toString conversion)
  - Update `getDistrictApprovals()` to use `filters.projectType` with direct string comparison (remove toString conversion)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_





- [x] 6. Update client-side TypeScript types




  - Update `DashboardFilters` interface in apps/client/types/dashboard.ts to replace `programId?: number` with `projectType?: string`




  - Add JSDoc comment explaining valid values: "HIV", "Malaria", "TB"
  - _Requirements: 4.1, 4.2, 4.5_




- [ ] 7. Update client-side React hook

  - Update `useDashboard` hook in apps/client/hooks/use-dashboard.ts to use `filters?.projectType` instead of `filters?.programId`
  - Remove `toString()` conversion when building query parameters
  - Update JSDoc examples to show `projectType: 'HIV'` instead of `programId: 1`
  - _Requirements: 4.3, 4.4_

- [ ] 8. Update test component

  - Update filter state in test-unified-dashboard.tsx to use `projectType` instead of `programId`
  - Update UI controls to show project type dropdown with options: "All Programs", "HIV", "Malaria", "TB"
  - Update displayed filter information to show projectType value when active
  - Update example usage documentation in component comments
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
