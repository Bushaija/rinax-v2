# Implementation Plan

- [x] 1. Enhance API request and response schemas





  - Update generateStatementRequestSchema to include aggregationLevel, enhanced facilityId, and includeFacilityBreakdown parameters
  - Create aggregationMetadataSchema for response metadata
  - Create facilityBreakdownItemSchema for per-facility details
  - Update generateStatementResponseSchema to include new optional fields
  - _Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.4_
-

- [x] 2. Implement aggregation level determination logic




  - [x] 2.1 Create determineEffectiveFacilityIds utility function


    - Implement FACILITY level logic with facilityId validation
    - Implement DISTRICT level logic (existing behavior)
    - Implement PROVINCE level logic with province facility lookup
    - Add access control validation for requested facilityId
    - Throw appropriate errors for invalid requests
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 2.1, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 2.2 Create getProvinceFacilityIds helper function


    - Query facilities table for all facilities in user's province
    - Filter by user's accessible facility IDs
    - Return array of facility IDs
    - _Requirements: 1.5_

- [x] 3. Implement aggregation metadata builder





  - [x] 3.1 Create buildAggregationMetadata function


    - Calculate data completeness statistics (facilities with planning, execution, both)
    - Build facility-level metadata (facilityId, facilityName, facilityType)
    - Build district-level metadata (districtId, districtName)
    - Build province-level metadata (provinceId, provinceName)
    - Include facilitiesIncluded array and totalFacilities count
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 3.2 Add data completeness analysis

    - Analyze planning data to identify facilities with budget data
    - Analyze execution data to identify facilities with actual data
    - Calculate intersection for facilities with both
    - _Requirements: 4.5, 6.1, 6.2_

- [x] 4. Implement facility breakdown generator





  - [x] 4.1 Create generateFacilityBreakdown function


    - Query facility details for all effective facility IDs
    - Calculate budget amount per facility from planning data
    - Calculate actual amount per facility from execution data
    - Calculate variance and variance percentage per facility
    - Determine favorability for each facility
    - Sort facilities by variance percentage (descending)
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [x] 4.2 Add conditional breakdown logic


    - Only generate breakdown when includeFacilityBreakdown is true
    - Skip breakdown for FACILITY aggregation level (redundant)
    - Include breakdown for DISTRICT and PROVINCE levels
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 5. Update statement generation handler





  - [x] 5.1 Parse new request parameters

    - Extract aggregationLevel with default value 'DISTRICT'
    - Extract facilityId (optional)
    - Extract includeFacilityBreakdown with default false
    - _Requirements: 1.1, 1.2, 7.1, 7.4_


  - [ ] 5.2 Integrate aggregation level determination
    - Call determineEffectiveFacilityIds with parsed parameters
    - Handle validation errors and access control failures
    - Use effectiveFacilityIds in data filters
    - _Requirements: 1.3, 1.4, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5_


  - [ ] 5.3 Add aggregation metadata to response
    - Call buildAggregationMetadata after data aggregation
    - Include aggregationMetadata in response object
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


  - [ ] 5.4 Add facility breakdown to response
    - Call generateFacilityBreakdown when requested
    - Include facilityBreakdown in response object

    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ] 5.5 Maintain backward compatibility
    - Ensure default behavior matches current implementation
    - Keep existing response structure intact
    - Make new fields optional
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
-

- [x] 6. Add validation rules for facility-level statements




  - [x] 6.1 Implement facility data completeness validation


    - Check if facility has planning data for reporting period
    - Check if facility has execution data for reporting period
    - Add warning if facility has budget but no actual expenditure
    - Add warning if facility has expenditure but no budget
    - Add error if facility has neither planning nor execution data
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 6.2 Integrate validation into statement generation


    - Call validation after data collection
    - Include warnings in validation results
    - Return error response for critical validation failures
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Optimize query performance for single-facility queries




  - [x] 7.1 Update data collection queries


    - Use single facility ID filter when effectiveFacilityIds has one element
    - Use IN clause for multiple facility IDs
    - Ensure facility_id index is utilized
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 7.2 Add performance logging


    - Log query execution time by aggregation level
    - Log facility breakdown generation time
    - Include performance metrics in response
    - _Requirements: 8.4, 8.5_

- [ ]* 8. Write unit tests for new functionality
  - [ ]* 8.1 Test determineEffectiveFacilityIds function
    - Test FACILITY level with valid facilityId
    - Test FACILITY level without facilityId (should throw error)
    - Test FACILITY level with unauthorized facilityId (should throw error)
    - Test DISTRICT level (default behavior)
    - Test PROVINCE level
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 8.2 Test buildAggregationMetadata function
    - Test facility-level metadata generation
    - Test district-level metadata generation
    - Test province-level metadata generation
    - Test data completeness calculation with various scenarios
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 8.3 Test generateFacilityBreakdown function
    - Test breakdown with multiple facilities
    - Test sorting by variance percentage
    - Test favorability calculation
    - Test with facilities having missing data
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ]* 8.4 Test validation rules
    - Test facility with complete data (no warnings)
    - Test facility with only planning data (warning)
    - Test facility with only execution data (warning)
    - Test facility with no data (error)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 9. Write integration tests
  - [ ]* 9.1 Test single facility statement generation
    - Generate statement for facility with complete data
    - Generate statement for facility with only planning data
    - Generate statement for facility with only execution data
    - Verify variance calculations are correct
    - Verify aggregation metadata is included
    - _Requirements: 2.1, 2.2, 2.4, 2.5, 4.1, 4.2, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 9.2 Test district aggregation (backward compatibility)
    - Generate statement without aggregationLevel parameter
    - Verify default behavior matches current implementation
    - Verify all facilities in district are included
    - Verify response structure is unchanged
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [ ]* 9.3 Test access control
    - Test district accountant accessing facility in their district (should succeed)
    - Test district accountant accessing facility outside their district (should fail)
    - Test health center manager accessing their own facility (should succeed)
    - Test health center manager accessing different facility (should fail)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]* 9.4 Test facility breakdown
    - Request district statement with includeFacilityBreakdown=true
    - Verify per-facility calculations are correct
    - Verify sorting order is correct
    - Verify breakdown is omitted for FACILITY level
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 9.5 Test province aggregation
    - Generate statement with aggregationLevel=PROVINCE
    - Verify all facilities in province are included
    - Verify province metadata is included
    - _Requirements: 1.5, 4.4_

- [ ]* 10. Performance testing and optimization
  - [ ]* 10.1 Measure single facility query performance
    - Measure query time for single facility statement
    - Compare to district-wide query time
    - Verify single facility is at least 50% faster
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 10.2 Test facility breakdown performance
    - Measure overhead of generating facility breakdown
    - Test with varying numbers of facilities (5, 10, 20, 50)
    - Identify performance bottlenecks
    - _Requirements: 8.5_

  - [ ]* 10.3 Optimize query execution
    - Verify index usage with EXPLAIN ANALYZE
    - Optimize facility metadata queries
    - Consider caching frequently accessed data
    - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 11. Update API documentation
  - Document new aggregationLevel parameter
  - Document enhanced facilityId parameter usage
  - Document includeFacilityBreakdown parameter
  - Document aggregationMetadata response field
  - Document facilityBreakdown response field
  - Provide examples for each aggregation level
  - Document error responses and validation warnings
  - _Requirements: All requirements_
