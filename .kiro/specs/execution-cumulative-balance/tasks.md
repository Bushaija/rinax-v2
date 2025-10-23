# Implementation Plan

- [x] 1. Implement core cumulative balance calculation functions
  - Create `getLatestQuarterValue()` helper function that checks quarters in reverse order (Q4->Q3->Q2->Q1) and returns first DEFINED value (including explicit zero)
  - Distinguish between explicit zero (meaningful data) and undefined/null (no data entered)
  - Create `calculateCumulativeBalance()` function that determines calculation strategy based on section type (flow vs stock)
  - Create `addCumulativeBalances()` function that iterates through activities and adds cumulative_balance to each
  - Handle undefined values properly: return undefined for stock sections when no data, return 0 for flow sections
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Integrate cumulative balance calculation into enrichFormData




  - Modify `enrichFormData()` function to call `addCumulativeBalances()` after creating keyed activities
  - Ensure activities object passed to `computeRollups()` includes cumulative_balance
  - Verify the enriched activities are returned in the formData structure
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Update getOne handler to include cumulative_balance in UI response





  - Modify the `pushItem` helper function to calculate and include cumulative_balance for each activity
  - Import and use `calculateCumulativeBalance()` function from helpers
  - Ensure cumulative_balance is added to A_items, B_groups items, D_items, E_items, and G_items
  - _Requirements: 5.1, 8.1, 8.2_

- [x] 4. Update checkExisting handler to include cumulative_balance





  - Modify the `pushItem` helper function in checkExisting to calculate cumulative_balance
  - Ensure the UI response structure includes cumulative_balance for all activity items
  - Verify backward compatibility with existing data
  - _Requirements: 5.3, 8.1, 8.2_
-

- [x] 5. Add Section G intelligent handling




  - Implement logic to detect flow vs stock items in Section G based on activity codes or names
  - Default Section G items to cumulative sum calculation
  - Handle the computed "Surplus/Deficit of the Period" item with cumulative sum
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 6. Write unit tests for cumulative balance calculations
  - Test `getLatestQuarterValue()` with all quarter combinations (Q4>0, Q3>0 with Q4=0, etc.)
  - Test `calculateCumulativeBalance()` for flow sections (A, B, C, F) with various quarter values
  - Test `calculateCumulativeBalance()` for stock sections (D, E) with various quarter values
  - Test `addCumulativeBalances()` with different activity structures (array and object)
  - Test edge cases: all zeros, negative values, missing values
  - _Requirements: 1.5, 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 7. Write integration tests for create and update operations
  - Test create execution entry includes cumulative_balance in stored formData
  - Test update execution entry recalculates cumulative_balance correctly
  - Test that balance validation works with cumulative_balance present
  - Test backward compatibility with legacy data (missing cumulative_balance)
  - _Requirements: 3.1, 3.2, 8.3, 8.4, 8.5_

- [ ]* 8. Add validation and error handling
  - Add input validation to ensure quarter values are numeric (default to 0 if not)
  - Add logging for cases where section cannot be determined from activity code
  - Add warning logs when cumulative_balance calculation encounters unexpected data
  - Handle activities with missing or invalid codes gracefully
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 9. Update TypeScript type definitions
  - Add cumulative_balance property to activity type definitions in execution.types.ts
  - Ensure type safety for new helper functions
  - Update API response types to include cumulative_balance
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Implement UI display logic for cumulative balance



  - Create `formatCumulativeBalance()` helper function in frontend that formats values based on section type
  - For stock sections (D, E): display "0" for explicit zero, "—" for undefined
  - For flow sections (A, B, C, F, G): display "—" for both zero and undefined
  - Update table.tsx component to use the new formatting function
  - Ensure section code is extracted correctly from activity codes for display logic
  - _Requirements: 2.8, 2.9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 7. Write unit tests for cumulative balance calculations
  - Test `getLatestQuarterValue()` with explicit zero as latest quarter (should return 0, not skip to previous)
  - Test `getLatestQuarterValue()` with all quarters undefined (should return undefined)
  - Test `getLatestQuarterValue()` with all quarters explicit zero (should return 0)
  - Test `calculateCumulativeBalance()` for flow sections (A, B, C, F) with various quarter values
  - Test `calculateCumulativeBalance()` for stock sections (D, E) with explicit zero vs undefined
  - Test `addCumulativeBalances()` with different activity structures (array and object)
  - Test edge cases: all zeros, negative values, missing values
  - _Requirements: 1.5, 2.4, 2.5, 2.6, 2.7, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 8. Write integration tests for create and update operations
  - Test create execution entry includes cumulative_balance in stored formData
  - Test update execution entry recalculates cumulative_balance correctly
  - Test that balance validation works with cumulative_balance present
  - Test backward compatibility with legacy data (missing cumulative_balance)
  - _Requirements: 3.1, 3.2, 8.3, 8.4, 8.5_

- [ ]* 9. Add validation and error handling
  - Add input validation to ensure quarter values are numeric or undefined (not invalid types)
  - Add logging for cases where section cannot be determined from activity code
  - Add warning logs when cumulative_balance calculation encounters unexpected data
  - Handle activities with missing or invalid codes gracefully
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 10. Update TypeScript type definitions
  - Add cumulative_balance property to activity type definitions in execution.types.ts
  - Update type to allow number | undefined for cumulative_balance
  - Ensure type safety for new helper functions
  - Update API response types to include cumulative_balance
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 11. Add documentation and code comments
  - Document the two calculation strategies (flow vs stock) in code comments
  - Document the distinction between explicit zero and undefined values
  - Add JSDoc comments to all new helper functions
  - Document the section classification logic (which sections use which strategy)
  - Add inline comments explaining the latest quarter selection logic
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
