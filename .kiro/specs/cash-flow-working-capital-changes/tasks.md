# Implementation Plan

- [x] 1. Create WorkingCapitalCalculator service





  - Create service file with TypeScript interfaces and class structure
  - Implement constructor with database dependency injection
  - _Requirements: 5.1, 5.2_

- [x] 1.1 Implement balance sheet data query method


  - Create `queryBalanceSheetData()` method to query `schema_form_data_entries`
  - Join with `configurable_event_mappings` and `events` tables
  - Filter by project, reporting period, facility, entity type (EXECUTION), and event codes
  - Aggregate amounts by event code using SUM
  - Handle single facility and multi-facility scenarios
  - _Requirements: 5.1, 5.2, 5.3, 5.6_

- [x] 1.2 Implement previous period identification


  - Create `getPreviousPeriod()` method to find previous reporting period
  - Query `reporting_periods` table for period with (year - 1) and same period type
  - Return null if previous period not found
  - _Requirements: 5.4, 5.5_

- [x] 1.3 Implement cash flow sign application logic


  - Create `applyCashFlowSigns()` method
  - For RECEIVABLES: return negative of change (increase = subtract)
  - For PAYABLES: return positive of change (increase = add)
  - _Requirements: 1.3, 2.3_

- [x] 1.4 Implement main calculateChanges method


  - Query current period balance sheet data for receivables and payables
  - Query previous period balance sheet data (or use zero if not found)
  - Calculate changes: current - previous
  - Apply cash flow signs using `applyCashFlowSigns()`
  - Build `WorkingCapitalCalculationResult` with all metadata
  - Generate warnings for missing data or unusual variances
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 1.6, 2.6_

- [x] 1.5 Add facility breakdown support


  - Query balance sheet data with facility-level detail
  - Calculate per-facility changes
  - Include facility breakdown in result metadata
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 1.6 Write unit tests for WorkingCapitalCalculator
  - Test `queryBalanceSheetData()` with single and multiple facilities
  - Test `getPreviousPeriod()` with existing and missing periods
  - Test `applyCashFlowSigns()` for all scenarios (increase/decrease × receivables/payables)
  - Test `calculateChanges()` with normal data, missing previous period, and zero balances
  - Test facility aggregation logic
  - _Requirements: All from Requirement 1-5_

- [x] 2. Enhance FormulaEngine for working capital calculations





  - Add `balanceSheet` property to `FormulaContext` interface
  - Update context type definitions
  - _Requirements: 6.4_

- [x] 2.1 Implement WORKING_CAPITAL_CHANGE formula function


  - Add pattern matching for `WORKING_CAPITAL_CHANGE(accountType)` in `evaluateFormula()`
  - Extract account type (RECEIVABLES or PAYABLES) from formula
  - Retrieve event codes from template line metadata
  - Calculate current period balance from `context.balanceSheet.current`
  - Calculate previous period balance from `context.balanceSheet.previous`
  - Calculate change and apply cash flow sign
  - Return signed cash flow adjustment
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 2.2 Add error handling for missing balance sheet context


  - Throw descriptive error if `balanceSheet` context is missing
  - Log warning if event codes are not found in balance sheet data
  - _Requirements: 7.1, 7.3_

- [ ]* 2.3 Write unit tests for formula engine enhancements
  - Test `WORKING_CAPITAL_CHANGE(RECEIVABLES)` with normal data
  - Test `WORKING_CAPITAL_CHANGE(PAYABLES)` with normal data
  - Test with missing balance sheet context (should throw error)
  - Test with zero balances
  - Test with increase and decrease scenarios
  - _Requirements: 6.1, 6.2, 6.4_

- [x] 3. Update CASH_FLOW statement template





  - Modify `CHANGES_RECEIVABLES` line to use calculation formula
  - Set `calculationFormula: 'WORKING_CAPITAL_CHANGE(RECEIVABLES)'`
  - Ensure event codes include ADVANCE_PAYMENTS, RECEIVABLES_EXCHANGE, RECEIVABLES_NON_EXCHANGE
  - _Requirements: 6.1, 6.3_

- [x] 3.1 Update CHANGES_PAYABLES template line


  - Modify `CHANGES_PAYABLES` line to use calculation formula
  - Set `calculationFormula: 'WORKING_CAPITAL_CHANGE(PAYABLES)'`
  - Ensure event codes include PAYABLES
  - _Requirements: 6.1, 6.3_

- [x] 3.2 Mark lines as computed in template

  - Set `isComputed: true` for both working capital lines
  - Update template metadata to reflect formula-based calculation
  - _Requirements: 6.2_

- [x] 4. Integrate WorkingCapitalCalculator with generateStatement handler








  - Import `WorkingCapitalCalculator` service
  - Add working capital calculation step after carryforward logic (Step 6.6)
  - Instantiate calculator and call `calculateChanges()` for CASH_FLOW statements
  - Store result in `workingCapitalResult` variable
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 4.1 Prepare balance sheet context for formula engine


  - Query balance sheet data for current and previous periods
  - Build `balanceSheet` context object with current and previous maps
  - Pass balance sheet context to formula engine when evaluating working capital lines
  - _Requirements: 6.4_



- [x] 4.2 Inject working capital adjustments into statement lines


  - In Step 11 (build statement lines), check if line is CHANGES_RECEIVABLES or CHANGES_PAYABLES
  - If working capital result exists, use the cash flow adjustment values
  - Ensure values are used for both current and previous period calculations
  - _Requirements: 1.7, 2.7, 8.1, 8.2_

- [x] 4.3 Add working capital metadata to statement response


  - After building statement metadata, add `workingCapital` section
  - Include receivables and payables balances, changes, and adjustments
  - Include warnings from working capital calculation
  - Include facility breakdown if multi-facility aggregation was used
  - _Requirements: 7.5, 4.4_

- [x] 4.4 Update validation results with working capital warnings


  - Merge working capital warnings into statement validation warnings
  - Add working capital validation rules to validation results
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 4.5 Write integration tests for handler integration
  - Test cash flow statement generation with working capital changes
  - Test with normal data (increases and decreases)
  - Test with missing previous period data
  - Test with multi-facility aggregation
  - Verify operating cash flow calculation includes adjustments
  - Verify metadata includes working capital details
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4_

- [x] 5. Update calculateOperatingCashFlow helper function





  - Verify that `CHANGES_RECEIVABLES` and `CHANGES_PAYABLES` are included in adjustments
  - Ensure the formula correctly adds these signed adjustments
  - Test that operating cash flow total is correct
  - _Requirements: 3.1, 3.2_

- [ ] 6. Add validation rules for working capital




  - Create validation rule for negative receivables balance (error)
  - Create validation rule for extreme variance >100% (warning)
  - Create validation rule for missing previous period (warning)
  - Create validation rule for inconsistent balance sheet data (error)
  - Integrate validation rules into statement validation engine
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 7. Update statement display formatting





  - Ensure working capital lines display with correct indentation (level 3)
  - Apply negative value formatting (parentheses or minus sign)
  - Handle zero values according to `showZeroValues` option
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 7.1 Update PDF export formatting


  - Verify working capital lines appear in PDF with correct styling
  - Test negative value display in PDF
  - Verify indentation and row styling
  - _Requirements: 8.4_

- [x] 7.2 Update CSV/Excel export formatting


  - Ensure working capital adjustments export with signed values
  - Include working capital metadata in export if applicable
  - _Requirements: 8.5_

- [ ]* 8. Create end-to-end test scenarios
  - Scenario 1: Receivables increase, Payables increase (both positive cash impact from payables)
  - Scenario 2: Receivables decrease, Payables decrease (positive from receivables, negative from payables)
  - Scenario 3: Mixed changes (one increase, one decrease)
  - Scenario 4: First period with no previous data (should use zero baseline)
  - Scenario 5: Multi-facility aggregation with partial data
  - _Requirements: All requirements_

- [ ] 9. Add database indexes for performance
  - Create index on `schema_form_data_entries` for (project_id, reporting_period_id, entity_type, facility_id)
  - Verify query performance with EXPLAIN ANALYZE
  - Test with large datasets (100+ facilities)
  - _Requirements: 5.1, 5.2_

- [ ] 10. Update documentation
  - Add working capital calculation documentation to statement engine docs
  - Document the WORKING_CAPITAL_CHANGE formula function
  - Add examples of working capital adjustments
  - Document validation rules and error messages
  - Update API documentation with new metadata fields
  - _Requirements: All requirements_

- [ ] 11. Final validation and testing
  - Run full test suite (unit + integration + e2e)
  - Test with production-like data volumes
  - Verify backward compatibility (old statements still work)
  - Test all statement export formats (PDF, CSV, Excel)
  - Verify multi-facility aggregation performance
  - _Requirements: All requirements_
