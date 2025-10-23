# Implementation Plan

- [x] 1. Set up Budget vs Actual response types and interfaces











  - Create BudgetVsActualLine interface with six columns (description, note, revisedBudget, actual, variance, performancePercentage)
  - Create BudgetVsActualStatement interface extending base statement structure
  - Update generateStatementResponseSchema with union types for backward compatibility
  - Add BudgetVsActualMapping interface for custom event mappings
  - _Requirements: 1.1, 5.1, 5.4_


- [x] 2. Create CustomEventMapper utility class




  - [x] 2.1 Implement event mapping resolution logic


    - Write getEventMapping method to retrieve custom mappings from template metadata
    - Create applyMapping method to sum amounts from budget and actual event arrays
    - Add fallback logic for lines without custom mappings
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 2.2 Add mapping validation and error handling


    - Validate that mapped event codes exist in database
    - Handle missing or invalid event mappings gracefully
    - Log warnings for mapping issues without failing statement generation
    - _Requirements: 3.4, 6.2_

- [x] 3. Implement BudgetVsActualProcessor class


  - [x] 3.1 Create core statement processing logic


    - Write generateStatement method that processes Budget vs Actual templates
    - Implement processLineWithCustomMapping for complex event mappings
    - Add standard line processing for lines without custom mappings
    - _Requirements: 1.1, 2.1, 3.1_

  - [x] 3.2 Add calculation and formatting methods

    - Implement calculatePerformancePercentage with safe division (handle zero budget)
    - Create formatBudgetVsActualLine method for four+ column structure
    - Add variance calculation as (Budget - Actual)
    - _Requirements: 1.3, 1.4, 4.4_

  - [x] 3.3 Implement computed line calculations

    - Add logic for Total Receipts summation across receipt line items
    - Add logic for Total Expenditures summation across expenditure line items
    - Implement Net lending/borrowing calculation (Receipts - Expenditures - Non-financial assets)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Update Budget vs Actual template configuration


  - [x] 4.1 Create accurate template structure


    - Update budgetVsActualTemplate with correct line items and display order
    - Add proper note numbers matching UI requirements (1, 2, 9, 4, 33, 12, 23, 17, 15, 14, 16, 20, 34, 35, 36)
    - Set correct formatting rules (bold for headers and totals, proper indentation levels)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Add custom event mappings to template metadata

    - Configure "Transfers from public entities" to use GOODS_SERVICES_PLANNING for budget and TRANSFERS_PUBLIC_ENTITIES for actual
    - Configure "Goods and services" to use GOODS_SERVICES_PLANNING for budget and GOODS_SERVICES for actual
    - Add budgetVsActualMapping metadata to relevant template lines
    - _Requirements: 3.1, 3.2_

- [x] 5. Integrate with existing statement generation handler


  - [x] 5.1 Add conditional routing logic


    - Modify generateStatement handler to detect BUDGET_VS_ACTUAL statement code
    - Route Budget vs Actual requests to new BudgetVsActualProcessor
    - Ensure other statement types continue using existing logic unchanged
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Update response building logic

    - Create buildBudgetVsActualResponse method for four+ column format
    - Maintain existing buildStandardResponse for other statement types
    - Handle response type unions properly for API compatibility
    - _Requirements: 1.1, 5.4_

- [x] 6. Add validation and error handling






  - [x] 6.1 Implement Budget vs Actual specific validation


    - Validate that required PLANNING and EXECUTION events exist in database
    - Check for missing event data and include warnings in validation results
    - Validate template configuration during statement generation
    - _Requirements: 6.1, 6.2_

  - [x] 6.2 Add comprehensive error handling


    - Handle division by zero in performance percentage calculations
    - Gracefully handle missing planning or execution data
    - Provide detailed error context without breaking statement generation
    - _Requirements: 6.3, 6.4_

- [x] 7. Update financial reports types and schemas





  - [x] 7.1 Extend Zod schemas for Budget vs Actual


    - Add budgetVsActualLineSchema with six column structure
    - Update generateStatementResponseSchema to support union types
    - Maintain backward compatibility with existing API contracts
    - _Requirements: 1.1, 5.4_

  - [x] 7.2 Add TypeScript type definitions


    - Export BudgetVsActualLine and BudgetVsActualStatement types
    - Create type guards for distinguishing statement response types
    - Update existing type imports where needed
    - _Requirements: 5.4_

- [ ]* 8. Write comprehensive tests for Budget vs Actual functionality
  - [ ]* 8.1 Create unit tests for core components
    - Test CustomEventMapper with various mapping scenarios
    - Test BudgetVsActualProcessor line processing logic
    - Test performance percentage calculations including edge cases
    - _Requirements: 1.3, 1.4, 3.1, 3.2_

  - [ ]* 8.2 Add integration tests for statement generation
    - Test complete Budget vs Actual statement generation end-to-end
    - Test with missing planning data, missing execution data, and complete data
    - Verify that other statement types remain unaffected
    - _Requirements: 5.1, 5.2, 6.2_

- [ ] 9. Verify event data and template seeding







  - [x] 9.1 Ensure required events exist in database


    - Verify GOODS_SERVICES_PLANNING event exists and is properly seeded
    - Check that all Budget vs Actual template event codes have corresponding database entries
    - Add any missing events to events seeder if needed
    - _Requirements: 6.1_

  - [x] 9.2 Update statement template seeding




    - Ensure budgetVsActualTemplate is properly seeded with new structure
    - Verify template metadata includes custom event mappings
    - Test template loading and validation during seeding process
    - _Requirements: 2.1, 2.2, 3.1, 3.2_