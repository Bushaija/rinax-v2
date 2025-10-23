# Implementation Plan

- [x] 1. Update Assets & Liabilities statement template





  - Modify SURPLUS_DEFICITS_PERIOD line in statement-templates.ts
  - Remove eventMappings array and set to empty
  - Add unified calculationFormula with revenue minus expenditure events
  - Verify event code names match exactly with Revenue & Expenditure template
  - _Requirements: 1.2, 2.1, 2.2_

- [x] 2. Update Net Assets Changes statement template





  - Modify NET_SURPLUS_PREV_CURRENT line to use calculation formula
  - Modify NET_SURPLUS_CURRENT_NEXT line to use calculation formula
  - Remove eventMappings arrays for both lines
  - Apply same unified formula as Assets & Liabilities statement
  - _Requirements: 1.3, 2.1, 2.2_

- [x] 3. Remove hardcoded surplus/deficit calculations from handlers





  - Remove SURPLUS_DEFICITS_PERIOD from totalLineCodes array in financial-reports.handlers.ts
  - Remove NET_SURPLUS_PREV_CURRENT and NET_SURPLUS_CURRENT_NEXT from totalLineCodes array
  - Delete hardcoded case statements returning -80 values in calculateSpecialTotal function
  - Clean up any remaining hardcoded surplus/deficit references
  - _Requirements: 2.3, 4.1_

- [x] 4. Verify formula syntax and event code accuracy






  - Cross-reference all event codes in formula with Revenue & Expenditure statement
  - Ensure proper parentheses grouping for revenue and expenditure sums
  - Validate formula syntax matches formula engine expectations
  - Test formula evaluation with sample event data
  - _Requirements: 3.1, 4.3_

- [ ] 5. Test statement generation with updated calculations
  - Generate Revenue & Expenditure statement and capture surplus/deficit value
  - Generate Assets & Liabilities statement and verify matching surplus/deficit
  - Generate Net Assets Changes statement and verify consistent values
  - Compare all surplus/deficit values to ensure they match exactly
  - _Requirements: 1.1, 1.4, 3.2_

- [ ]* 6. Create validation tests for calculation consistency
  - Write unit tests for surplus/deficit formula evaluation
  - Create integration tests comparing values across multiple statements
  - Add tests for missing event data scenarios (should default to zero)
  - Test formula engine error handling with invalid event references
  - _Requirements: 4.4, 3.4_

- [ ]* 7. Add monitoring and logging for calculation validation
  - Add logging to track surplus/deficit calculations across statements
  - Implement validation checks to alert on inconsistent values
  - Create monitoring dashboard for financial calculation accuracy
  - Add performance monitoring for complex formula evaluations
  - _Requirements: 4.3, 3.4_

- [ ] 8. Update documentation and create migration guide
  - Document the unified surplus/deficit calculation approach
  - Create troubleshooting guide for calculation discrepancies
  - Update API documentation to reflect consistent calculation behavior
  - Document the removal of hardcoded values and event mapping dependencies
  - _Requirements: 4.2, 4.3_