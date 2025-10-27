# Implementation Plan

- [x] 1. Update type definitions and schemas for multi-scope support





  - Add scope enum type ('district' | 'provincial' | 'country') to query schema
  - Add provinceId parameter to compiledExecutionQuerySchema
  - Extend response metadata schema to include scope and scopeDetails
  - Add performanceWarning field to response metadata
  - _Requirements: 1.4, 2.2, 5.1, 5.2, 5.3_
- [x] 2. Implement scope filter builder functions




- [ ] 2. Implement scope filter builder functions

  - [x] 2.1 Create buildDistrictScopeFilter function


    - Extract existing district filtering logic from handler
    - Handle accountant district assignment validation
    - Handle admin districtId parameter override
    - Return SQL filter condition or null
    - _Requirements: 1.1, 1.2, 1.3, 1.5_

  - [x] 2.2 Create buildProvincialScopeFilter function


    - Query districts table to get all districts in province
    - Build filter for facilities in those districts (direct hospitals)
    - Build filter for child facilities of hospitals in province (indirect HCs)
    - Combine filters using OR logic
    - Handle missing provinceId error
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 2.3 Create buildCountryScopeFilter function


    - Return simple isActive filter for all facilities
    - No geographic restrictions
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.4 Create main buildScopeFilter function


    - Implement strategy pattern with switch statement
    - Delegate to scope-specific filter builders
    - Handle unsupported scope types with error
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 3. Implement access control validation





  - [x] 3.1 Create validateScopeAccess function


    - Check if user role is accountant and scope is not district
    - Return forbidden status for accountants requesting provincial/country
    - Validate accountant cannot access other districts
    - Allow all scopes for admin users
    - Validate provinceId is provided for provincial scope
    - Return structured validation result with allowed flag and message
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 1.3_


  - [x] 3.2 Create hasAdminAccess helper function (if not exists)

    - Check user role and permissions for admin access
    - Return boolean indicating admin privileges
    - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [x] 4. Implement scope metadata builder





  - [x] 4.1 Create buildScopeMetadata function


    - Extract unique district IDs from query results
    - Implement district scope metadata (district IDs and names)
    - Implement provincial scope metadata (province ID, name, district count)
    - Implement country scope metadata (province count, district count)
    - Query database for geographic entity names
    - Return structured ScopeDetails object
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Update compiled execution handler





  - [x] 5.1 Add scope parameter parsing and default value


    - Parse scope from query parameters with default 'district'
    - Extract provinceId from query parameters
    - _Requirements: 1.4, 2.2_

  - [x] 5.2 Integrate access control validation


    - Call validateScopeAccess before executing queries
    - Return 403 Forbidden response if access denied
    - Include appropriate error message in response
    - _Requirements: 4.1, 4.2, 4.3, 1.3_

  - [x] 5.3 Replace facility filtering logic with scope filter


    - Remove or refactor existing buildFacilityFilter call
    - Call buildScopeFilter with scope, userContext, and query params
    - Add scope filter to whereConditions array
    - Handle filter builder errors with 400 Bad Request response
    - _Requirements: 1.1, 1.2, 2.1, 2.3, 2.4, 3.1, 3.3_


  - [x] 5.4 Add scope metadata to response

    - Call buildScopeMetadata after aggregation
    - Add scope field to response meta
    - Add scopeDetails field to response meta
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_


  - [x] 5.5 Add performance warning logic

    - Check if country scope and facility count > 100
    - Add performanceWarning to response meta if threshold exceeded
    - Log performance warning if query exceeds 30 seconds
    - _Requirements: 3.4, 3.5, 6.5_

- [x] 6. Add database indexes for performance




  - [x] 6.1 Create migration for new indexes


    - Add index on districts.provinceId
    - Add index on facilities.parentFacilityId
    - Add index on facilities.facilityType
    - Add composite index on facilities(districtId, facilityType)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 7. Write unit tests for scope filtering
  - [ ]* 7.1 Test buildDistrictScopeFilter
    - Test with accountant context (returns district filter)
    - Test with admin context and districtId param (returns specified district)
    - Test with admin context and no districtId (returns null)
    - _Requirements: 1.1, 1.2, 1.5_

  - [ ]* 7.2 Test buildProvincialScopeFilter
    - Test with valid provinceId (returns OR filter for direct and indirect facilities)
    - Test with missing provinceId (throws error)
    - Test filter includes both hospitals and child HCs
    - _Requirements: 2.1, 2.2, 2.4_

  - [ ]* 7.3 Test buildCountryScopeFilter
    - Test returns isActive filter only
    - Test no geographic restrictions applied
    - _Requirements: 3.1, 3.3_

  - [ ]* 7.4 Test validateScopeAccess
    - Test accountant denied for provincial scope
    - Test accountant denied for country scope
    - Test accountant denied for other district
    - Test admin allowed for all scopes
    - Test provincial scope requires provinceId
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 8. Write integration tests for multi-scope queries
  - [ ]* 8.1 Test district scope end-to-end
    - Create test data with multiple districts
    - Query with district scope as accountant
    - Verify only assigned district facilities returned
    - Verify scope metadata includes district names
    - _Requirements: 1.1, 1.2, 5.2, 5.3_

  - [ ]* 8.2 Test provincial scope end-to-end
    - Create test data with province, districts, and facilities
    - Query with provincial scope as admin
    - Verify all facilities in province returned (hospitals + child HCs)
    - Verify scope metadata includes province name and district count
    - _Requirements: 2.1, 2.3, 2.4, 5.2, 5.3_

  - [ ]* 8.3 Test country scope end-to-end
    - Create test data with multiple provinces
    - Query with country scope as admin
    - Verify all facilities returned
    - Verify scope metadata includes province and district counts
    - _Requirements: 3.1, 3.3, 5.2, 5.3_

  - [ ]* 8.4 Test scope combined with other filters
    - Test provincial scope + projectType filter
    - Test country scope + facilityType filter
    - Test district scope + reportingPeriod filter
    - Verify filters applied with AND logic
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 8.5 Test access control enforcement
    - Test accountant receives 403 for provincial scope
    - Test accountant receives 403 for country scope
    - Test accountant receives 403 for other district
    - Test admin can access all scopes
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 9. Performance testing and optimization
  - [ ]* 9.1 Test district scope performance
    - Create dataset with 50+ facilities in district
    - Measure query execution time
    - Verify completes within 30 seconds
    - _Requirements: 6.5_

  - [ ]* 9.2 Test provincial scope performance
    - Create dataset with 100+ facilities across multiple districts
    - Measure query execution time
    - Verify completes within 30 seconds
    - Verify indexes are used (EXPLAIN query)
    - _Requirements: 6.1, 6.2, 6.5_

  - [ ]* 9.3 Test country scope performance
    - Create dataset with 200+ facilities across provinces
    - Measure query execution time
    - Verify completes within 60 seconds
    - Verify performance warning appears for >100 facilities
    - _Requirements: 3.4, 3.5, 6.3_

- [ ] 10. Update API documentation
  - Document new scope parameter with examples
  - Document provinceId parameter requirement for provincial scope
  - Document role-based access restrictions
  - Document new response metadata fields (scope, scopeDetails, performanceWarning)
  - Add example requests for each scope type
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
