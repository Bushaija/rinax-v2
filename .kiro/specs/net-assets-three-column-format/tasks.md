# Implementation Plan

- [x] 1. Update template type definitions and template data





  - Add ColumnType enum to template types
  - Update TemplateLine interface to include columnType in metadata
  - Update changeInNetAssetsTemplate with columnType metadata for each line
  - Remove fiscal year labels from line item descriptions
  - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 2. Extend StatementLine interface for three-column support





  - Add accumulatedSurplus, adjustments, and total fields to StatementLine interface
  - Keep legacy currentPeriodValue and previousPeriodValue for backward compatibility
  - Add columnType to metadata
  - _Requirements: 4.5, 7.1_
-

- [x] 3. Enhance NetAssetsProcessor for three-column logic



- [x] 3.1 Add getColumnType method to determine column from template line


  - Implement logic to read columnType from metadata
  - Add fallback logic to infer column type from lineCode
  - _Requirements: 2.3, 4.2, 4.3_

- [x] 3.2 Update processStatement to populate three-column fields


  - Assign values to accumulatedSurplus, adjustments, or total based on columnType
  - Maintain separate sums for accumulated and adjustment columns
  - _Requirements: 2.1, 2.2, 4.1, 4.2, 4.3_

- [x] 3.3 Implement calculateTotalLines method


  - Calculate running sums for accumulated and adjustment columns
  - Populate total field for TOTAL-type lines using formula: total = accumulated + adjustments
  - Handle carryforward of accumulated balance between sections
  - _Requirements: 2.5, 4.4_

- [x] 3.4 Update validation logic for three-column format


  - Validate that totals equal accumulated + adjustments
  - Add business rule validation for three-column balance
  - _Requirements: 2.5_

- [x] 4. Create data transformation functions





- [x] 4.1 Define NetAssetsRow interface


  - Add accumulated, adjustments, and total fields
  - Remove current and previous fields
  - _Requirements: 6.1, 6.5_


- [x] 4.2 Implement transformNetAssetsLine function

  - Map accumulatedSurplus → accumulated
  - Map adjustments → adjustments
  - Map total → total
  - Handle null values appropriately
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.3 Implement transformNetAssetsData function


  - Apply transformNetAssetsLine to array of lines
  - _Requirements: 6.1_

- [x] 5. Update frontend component for three-column display






- [x] 5.1 Update NetAssetRow type definition

  - Replace current and previous with accumulated, adjustments, and total
  - _Requirements: 1.1, 5.1_

- [x] 5.2 Update table header to show three columns

  - Display "Accumulated surplus/loss (Frw)", "Adjustments (Frw)", "Total (Frw)"
  - _Requirements: 1.1, 5.1_

- [x] 5.3 Update renderRow function

  - Render three value columns instead of two
  - Apply formatValue to handle null values (display "-")
  - Apply formatValue to handle zero values (display "0")
  - _Requirements: 1.5, 5.3, 5.4_


- [x] 5.4 Update component props




  - Remove currentPeriodLabel and previousPeriodLabel props
  - _Requirements: 5.1_
-

- [x] 6. Update page component to use new transformation




  - Import transformNetAssetsData instead of transformStatementData
  - Pass transformed data to ChangesInNetAssetsStatement component
  - _Requirements: 1.1, 6.1_

- [ ] 7. Test the implementation
- [ ] 7.1 Test template loading with columnType metadata
  - Verify template engine loads columnType correctly
  - Test fallback logic for missing columnType
  - _Requirements: 3.2, 3.3_

- [ ] 7.2 Test NetAssetsProcessor three-column logic
  - Test column categorization for different line types
  - Test total calculation across sections
  - Test carryforward of accumulated balances
  - Verify validation rules work correctly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4_

- [ ] 7.3 Test data transformation
  - Test transformNetAssetsLine with various inputs
  - Test handling of null values
  - Test handling of zero values
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 7.4 Test frontend rendering
  - Verify three columns display correctly
  - Verify currency formatting
  - Verify null values display as "-"
  - Verify zero values display as "0"
  - Verify bold/italic formatting for totals
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 7.5 Test end-to-end statement generation
  - Generate NET_ASSETS_CHANGES statement via API
  - Verify three-column structure in response
  - Verify correct rendering in browser
  - Test with real financial data
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 7.6 Test backward compatibility
  - Verify other statement types still work (REV_EXP, CASH_FLOW, etc.)
  - Test with templates without columnType metadata
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 8. Add calculation formulas for balance lines
- [x] 8.1 Add opening balance calculation formula
  - Update BALANCES_JUNE_PREV line to include calculationFormula: 'TOTAL_NET_ASSETS'
  - Ensure opening balance pulls from previous period's total net assets
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 8.2 Add closing balance calculation formula
  - Update BALANCE_JUNE_CURRENT line to include calculationFormula with SUM of all adjustment lines
  - Include: BALANCES_JUNE_PREV, CASH_EQUIVALENT_PREV_CURRENT, RECEIVABLES_PREV_CURRENT, INVESTMENTS_PREV_CURRENT, PAYABLES_PREV_CURRENT, BORROWING_PREV_CURRENT, NET_SURPLUS_PREV_CURRENT
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8.3 Add carryforward balance calculation formula
  - Update BALANCE_JULY_CURRENT line to include calculationFormula: 'BALANCE_JUNE_CURRENT'
  - Ensure new fiscal year opening balance equals previous fiscal year closing balance
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [x] 8.4 Add final closing balance calculation formula
  - Update BALANCE_PERIOD_END line to include calculationFormula with SUM of current year opening balance and all current year adjustments
  - Include: BALANCE_JULY_CURRENT, CASH_EQUIVALENT_CURRENT_NEXT, RECEIVABLES_CURRENT_NEXT, INVESTMENTS_CURRENT_NEXT, PAYABLES_CURRENT_NEXT, BORROWING_CURRENT_NEXT, NET_SURPLUS_CURRENT_NEXT
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 9. Update database with new template
  - Run database seed command to update statement templates
  - Verify templates are updated in database
  - Test statement generation with updated templates
  - _Requirements: 3.1, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3_
