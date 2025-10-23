# Implementation Plan: Cash Flow Beginning Cash Carryforward

## Overview

This implementation plan breaks down the carryforward feature into discrete, manageable tasks. Each task builds incrementally on previous work and includes specific requirements references.

## Tasks

- [x] 1. Create CarryforwardService foundation





  - Create new service file with core interfaces and types
  - Implement database connection and basic structure
  - Add logging utilities for debugging
  - _Requirements: 1.1, 1.2, 8.1, 8.3_

- [x] 1.1 Define TypeScript interfaces and types


  - Create `CarryforwardOptions` interface
  - Create `CarryforwardResult` interface
  - Create `CarryforwardMetadata` interface
  - Create `AggregatedCarryforwardMetadata` interface
  - _Requirements: 1.4_

- [x] 1.2 Implement CarryforwardService class skeleton

  - Create class with constructor accepting database instance
  - Add method stubs for main functionality
  - Set up error handling structure
  - _Requirements: 8.1, 8.2_

- [x] 2. Implement previous period identification logic





  - [x] 2.1 Create getPreviousPeriod method


    - Query current period from database
    - Calculate previous period based on date comparison
    - Handle edge cases (first period, missing periods)
    - _Requirements: 2.1, 2.2, 2.5_
  


  - [x] 2.2 Add period type handling





    - Implement logic for ANNUAL periods (year - 1)
    - Implement logic for QUARTERLY periods
    - Implement logic for MONTHLY periods


    - _Requirements: 2.2, 2.3, 2.4_
  
  - [x] 2.3 Add database query with proper filtering




    - Query reporting_periods table
    - Filter by year and period type
    - Order by date to get most recent previous period
    - _Requirements: 2.1, 2.5_

- [x] 3. Implement statement retrieval logic





  - [x] 3.1 Create getPreviousPeriodStatement method


    - Build query conditions for financial_reports table
    - Filter by reporting period, statement code, and status
    - Add facility and project filtering
    - _Requirements: 1.1, 3.1, 4.1_
  
  - [x] 3.2 Add facility-specific filtering


    - Handle single facility queries
    - Handle district-level aggregation (multiple facilities)
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 3.3 Add project-specific filtering


    - Query projects table to get project ID from project type
    - Filter statements by project ID
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [x] 3.4 Implement ending cash extraction


    - Extract from reportData.totals.ENDING_CASH
    - Fallback to reportData.lines with lineCode ENDING_CASH
    - Fallback to computedTotals.ENDING_CASH
    - Return 0 if not found
    - _Requirements: 1.1, 1.2_



- [x] 4. Implement manual entry retrieval and override logic




  - [x] 4.1 Create getManualBeginningCash method


    - Query schemaFormDataEntries for CASH_OPENING_BALANCE events
    - Filter by reporting period, facility, and project
    - Aggregate amounts if multiple entries exist
    - _Requirements: 6.1, 6.2_
  
  - [x] 4.2 Implement override detection


    - Compare manual entry with carryforward amount
    - Apply tolerance check (0.01)
    - Determine which value to use
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [x] 4.3 Add override metadata tracking


    - Store both carryforward and override values
    - Track discrepancy amount
    - Document override reason if available
    - _Requirements: 6.3, 6.4_

- [x] 5. Implement multi-facility aggregation






  - [x] 5.1 Create getAggregatedBeginningCash method

    - Loop through all facility IDs
    - Retrieve statement for each facility
    - Sum ending cash values
    - _Requirements: 3.3, 3.4_
  
  - [x] 5.2 Add facility breakdown tracking


    - Store individual facility ending cash amounts
    - Track facility names for reporting
    - Identify facilities with missing data
    - _Requirements: 3.4_
  
  - [x] 5.3 Handle missing facility data


    - Continue aggregation if some facilities missing
    - Generate warnings for missing facilities
    - Include missing facility IDs in metadata
    - _Requirements: 8.1, 8.2_

- [x] 6. Implement validation and warning generation





  - [x] 6.1 Create CarryforwardValidator class


    - Implement validateCarryforward method
    - Add warning generation logic
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [x] 6.2 Add discrepancy detection


    - Compare carryforward vs manual entry
    - Calculate difference amount
    - Generate warning if difference exceeds tolerance
    - _Requirements: 5.4, 5.5_
  
  - [x] 6.3 Add edge case warnings


    - Warn if no previous period found
    - Warn if previous ending cash is zero
    - Warn if beginning cash is unusually large
    - _Requirements: 5.1, 5.3_

- [x] 7. Integrate with statement generation handler





  - [x] 7.1 Modify generateStatement handler


    - Import and instantiate CarryforwardService
    - Call getBeginningCash before data aggregation
    - Handle carryforward result
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [x] 7.2 Inject carryforward data into aggregation


    - Add beginning cash to eventTotals map
    - Use CASH_OPENING_BALANCE event code
    - Preserve existing manual entry if present
    - _Requirements: 1.2, 1.3, 6.1_
  
  - [x] 7.3 Add carryforward metadata to response


    - Extend statement metadata with carryforward info
    - Include source, previous period ID, amounts
    - Add facility breakdown for aggregated statements
    - _Requirements: 1.4, 5.1, 5.2_
  
  - [x] 7.4 Merge carryforward warnings with validation


    - Append carryforward warnings to validation.warnings
    - Ensure warnings are properly formatted
    - Include in final response
    - _Requirements: 5.5_



- [x] 8. Implement error handling and fallback logic





  - [x] 8.1 Add try-catch blocks to all async methods


    - Wrap database queries in error handlers
    - Log errors with appropriate severity
    - Return fallback results on error
    - _Requirements: 8.1, 8.2, 8.3_
  
  - [x] 8.2 Implement fallbackToManualEntry method


    - Retrieve manual entry as fallback
    - Generate appropriate warning message
    - Return CarryforwardResult with FALLBACK source
    - _Requirements: 1.3, 8.1, 8.2_
  
  - [x] 8.3 Add timeout handling


    - Set 5-second timeout for database queries
    - Fall back to manual entry on timeout
    - Log timeout warnings
    - _Requirements: 7.4, 8.4_
  
  - [x] 8.4 Add data validation


    - Validate statement data structure
    - Handle corrupted or invalid data
    - Generate warnings for invalid data
    - _Requirements: 8.2, 8.3_

- [ ] 9. Add performance optimizations
  - [ ] 9.1 Optimize database queries
    - Add proper indexes to financial_reports table
    - Use efficient query patterns
    - Limit result sets appropriately
    - _Requirements: 7.1, 7.2_
  
  - [ ] 9.2 Implement query result caching (optional)
    - Create in-memory cache for recent queries
    - Set appropriate cache expiration
    - Invalidate cache on statement updates
    - _Requirements: 7.2, 7.3_
  
  - [ ] 9.3 Add query performance monitoring
    - Log query execution times
    - Track slow queries
    - Alert if queries exceed thresholds
    - _Requirements: 7.1, 7.4_

- [ ]* 10. Write unit tests for CarryforwardService
  - [ ]* 10.1 Test previous period identification
    - Test ANNUAL period calculation
    - Test QUARTERLY period calculation
    - Test MONTHLY period calculation
    - Test edge cases (first period, missing periods)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [ ]* 10.2 Test statement retrieval
    - Test single facility retrieval
    - Test multi-facility aggregation
    - Test project filtering
    - Test status filtering (approved only)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_
  
  - [ ]* 10.3 Test ending cash extraction
    - Test extraction from reportData.totals
    - Test extraction from reportData.lines
    - Test extraction from computedTotals
    - Test fallback to zero
    - _Requirements: 1.1, 1.2_
  
  - [ ]* 10.4 Test manual entry override
    - Test override detection
    - Test tolerance checking
    - Test metadata tracking
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 10.5 Test error handling
    - Test database query failures
    - Test timeout scenarios
    - Test invalid data handling
    - Test fallback logic
    - _Requirements: 8.1, 8.2, 8.3, 8.4_



- [ ]* 11. Write integration tests
  - [ ]* 11.1 Test end-to-end statement generation
    - Generate statement for period N with ending cash
    - Generate statement for period N+1
    - Verify beginning cash of N+1 matches ending cash of N
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ]* 11.2 Test cross-project independence
    - Generate HIV statement for period N
    - Generate Malaria statement for period N
    - Verify carryforward is project-specific
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [ ]* 11.3 Test district aggregation
    - Generate statements for multiple facilities
    - Generate district-level statement
    - Verify aggregated beginning cash is correct
    - _Requirements: 3.3, 3.4_
  
  - [ ]* 11.4 Test validation and warnings
    - Test discrepancy warning generation
    - Test missing period warnings
    - Test override warnings
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 12. Update API documentation
  - Document new carryforward metadata in response schema
  - Add examples showing carryforward scenarios
  - Document warning messages and their meanings
  - Update OpenAPI/Swagger specifications
  - _Requirements: 1.4, 5.1, 5.2_

- [ ] 13. Add logging and monitoring
  - Add structured logging for carryforward operations
  - Log successful carryforwards with metadata
  - Log fallback scenarios with reasons
  - Add metrics for carryforward success rate
  - _Requirements: 8.3_

- [ ] 14. Update client-side handling (if needed)
  - Update TypeScript types for carryforward metadata
  - Display carryforward source in UI
  - Show warnings to users
  - Add tooltips explaining carryforward
  - _Requirements: 5.1, 5.2, 5.5_

## Implementation Order

The tasks should be implemented in the following order:

1. **Phase 1: Core Service** (Tasks 1-2)
   - Set up service structure and previous period identification
   - Establishes foundation for all other work

2. **Phase 2: Data Retrieval** (Tasks 3-4)
   - Implement statement retrieval and manual entry logic
   - Core functionality for getting beginning cash

3. **Phase 3: Advanced Features** (Tasks 5-6)
   - Multi-facility aggregation and validation
   - Handles complex scenarios

4. **Phase 4: Integration** (Tasks 7-8)
   - Integrate with existing statement generation
   - Add error handling and fallback

5. **Phase 5: Optimization & Testing** (Tasks 9-11)
   - Performance improvements and comprehensive testing
   - Ensures quality and reliability

6. **Phase 6: Documentation & Monitoring** (Tasks 12-14)
   - Documentation, logging, and client updates
   - Completes the feature

## Notes

- Tasks marked with `*` are optional testing tasks that can be skipped for MVP
- Each task should be completed and tested before moving to the next
- Integration tests should be run after Phase 4 to validate the complete flow
- Performance testing should be done with realistic data volumes

