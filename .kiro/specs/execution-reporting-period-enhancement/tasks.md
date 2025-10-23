# Implementation Plan

- [x] 1. Update API route schema to include reportingPeriodId parameter and make quarter optional





  - Modify the `getExecution` route in `facilities.routes.ts` to add required `reportingPeriodId` query parameter
  - Make the `quarter` parameter truly optional to support quarter discovery mode
  - Update response schema to handle both single-quarter and discovery mode responses
  - Ensure parameter validation includes positive integer constraint for reportingPeriodId
  - _Requirements: 1.4, 4.1, 4.2, 4.3_

- [x] 2. Implement reporting period validation logic





  - [x] 2.1 Create reporting period validation function


    - Write function to query and validate reporting period exists and has ACTIVE status
    - Return appropriate error messages for non-existent, INACTIVE, or CLOSED periods
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 2.2 Import reporting periods schema in facilities handler


    - Add import for `reportingPeriods` schema from database
    - Ensure proper typing for reporting period queries
    - _Requirements: 3.1_

- [x] 3. Enhance planned facilities database query with reporting period filtering





  - [x] 3.1 Modify the planned facilities query to include reporting period filtering


    - Add join to `reporting_periods` table through existing `projects` relationship
    - Add `reportingPeriodId` filter condition to the WHERE clause for planning data
    - Maintain existing filters for entityType, projectType, facilityType, and districtId
    - _Requirements: 1.1, 1.2, 6.1_
  
  - [x] 3.2 Update query parameter extraction and parsing


    - Extract `reportingPeriodId` from query parameters
    - Parse `reportingPeriodId` to integer with proper error handling
    - Handle optional quarter parameter for discovery mode
    - _Requirements: 1.4, 2.1, 2.2_

- [x] 4. Implement quarter discovery logic for execution data





  - [x] 4.1 Create execution status analysis function


    - Write function to query all execution data for facilities within a reporting period
    - Group execution data by facility and extract executed quarters from metadata
    - Calculate available quarters for each facility (Q1-Q4 minus executed quarters)
    - _Requirements: 2.1, 2.3, 6.2, 6.3_
  
  - [x] 4.2 Implement single-quarter execution filtering


    - Modify existing execution query to include reporting period filtering
    - Add `reportingPeriodId` filter condition for execution data
    - Maintain quarter-specific filtering using metadata JSON query
    - _Requirements: 1.2, 6.2_

- [x] 5. Update handler logic to support both operation modes





  - [x] 5.1 Implement operation mode detection


    - Detect whether quarter parameter is provided to determine operation mode
    - Branch handler logic between single-quarter and quarter-discovery modes
    - _Requirements: 2.1, 2.2, 4.2, 4.3_
  
  - [x] 5.2 Implement quarter discovery response generation

    - Generate response with facilities and their available quarters array
    - Filter out facilities with no available quarters
    - Include reportingPeriodId and currentQuarter in response
    - _Requirements: 2.2, 4.1, 4.2, 6.4_
  
  - [x] 5.3 Update single-quarter response generation

    - Modify existing response to include reportingPeriodId field
    - Ensure backward compatibility with existing facility information
    - _Requirements: 4.1, 4.4_

- [x] 6. Integrate reporting period validation into handler flow





  - Call reporting period validation function after parameter extraction
  - Return early with appropriate error response if validation fails
  - Ensure TB program business rule validation continues to work unchanged
  - _Requirements: 3.1, 3.2, 3.3, 5.1, 5.2, 5.3_

- [x] 7. Handle edge cases and error scenarios





  - [x] 7.1 Implement comprehensive parameter validation


    - Validate quarter format when provided (Q1, Q2, Q3, Q4)
    - Handle invalid reportingPeriodId formats with appropriate error messages
    - Ensure proper error responses for all validation failures
    - _Requirements: 1.3, 1.4, 3.1_
  
  - [x] 7.2 Handle empty result scenarios


    - Return appropriate responses when no facilities are planned in reporting period
    - Handle cases where all facilities have been executed for all quarters
    - Ensure consistent response format for empty results in both modes
    - _Requirements: 2.4, 6.4_

- [ ]* 8. Write unit tests for enhanced execution functionality
  - [ ]* 8.1 Test parameter validation scenarios
    - Test missing reportingPeriodId parameter returns 400 error
    - Test invalid reportingPeriodId formats return appropriate errors
    - Test invalid quarter formats return appropriate errors
    - Test non-existent reportingPeriodId returns 400 error
    - _Requirements: 1.3, 1.4, 3.1_
  
  - [ ]* 8.2 Test reporting period status validation
    - Test ACTIVE reporting period allows request to proceed
    - Test INACTIVE reporting period returns 400 error with appropriate message
    - Test CLOSED reporting period returns 400 error with appropriate message
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 8.3 Test quarter discovery functionality
    - Test quarter discovery mode returns facilities with available quarters
    - Test single quarter mode returns facilities for specific quarter
    - Test facilities with partial quarter execution show correct available quarters
    - Test facilities with full quarter execution are excluded from results
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2, 6.3_
  
  - [ ]* 8.4 Test business logic with reporting periods
    - Test TB program validation works with reporting period parameter
    - Test facilities planned in different reporting periods are properly scoped
    - Test cross-quarter execution status calculation
    - Test response format variations for both operation modes
    - _Requirements: 5.1, 5.2, 5.3, 1.1, 1.2, 4.1, 4.2_