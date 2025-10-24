# Implementation Plan

- [x] 1. Create expense-to-payable mapping utility









  - Write function to generate expense-to-payable mapping from seeded activities data
  - Create helper to look up payable code for a given expense code
  - Add TypeScript types for mapping structure
  - _Requirements: 4.1, 4.2_

- [-] 2. Implement expense calculations hook


- [x] 2.1 Create useExpenseCalculations hook


  - Implement hook that accepts formData, openingBalance, and activities
  - Calculate total expenses, total paid, and total unpaid from Section B
  - Compute Cash at Bank as opening balance minus total paid
  - Compute payables by category using expense-to-payable mapping
  - Use useMemo for performance optimization
  - _Requirements: 3.1, 3.2, 3.5, 4.2, 4.3_

- [x] 2.2 Add calculation tests


  - Test cash at bank calculation with various payment scenarios
  - Test payables calculation and category mapping
  - Test edge cases (no expenses, all paid, all unpaid, mixed payments)
  - _Requirements: 3.1, 4.2, 4.3_

- [x] 3. Create payment status control component





- [x] 3.1 Build PaymentStatusControl component


  - Create component with Switch for paid/unpaid toggle
  - Add Popover that appears on switch interaction
  - Implement three payment options: Fully Paid, Unpaid, Partially Paid
  - Add Input field for partial payment amount entry
  - Use shadcn/ui components (Switch, Popover, Input, Button)
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 6.1, 6.2, 6.3_

- [x] 3.2 Add payment validation logic


  - Validate partial payment amount doesn't exceed total expense
  - Validate partial payment amount is greater than 0
  - Show inline error messages for validation failures
  - Provide visual feedback for current payment status (icons/colors)
  - _Requirements: 2.4, 2.5, 6.4_

- [x] 4. Extend form state to support payment data





  - Modify form data structure to include paymentStatus and amountPaid fields
  - Add updateExpensePayment function to form state management
  - Ensure backward compatibility with existing data (default to unpaid)
  - Update TypeScript types for extended form data
  - _Requirements: 1.3, 1.4, 1.5, 5.4, 5.5_

- [x] 5. Integrate payment controls into Section B





  - Locate Section B expense row rendering code
  - Add PaymentStatusControl component next to each expense amount input
  - Wire up onChange handler to update form state
  - Maintain existing layout and collapsible structure
  - Test with all expense subcategories (B-01 through B-05)
  - _Requirements: 1.1, 1.2, 6.2, 6.5_

- [x] 6. Implement auto-calculation for Section D and E








- [x] 6.1 Integrate calculations hook into form

  - Add useExpenseCalculations hook to execution form component
  - Pass formData, opening balance, and activities to the hook
  - Extract cashAtBank and payables from hook return value
  - _Requirements: 3.1, 3.2, 4.3_

- [x] 6.2 Auto-update Section D (Cash at Bank)



  - Update Cash at Bank field (D-1) with computed value
  - Make Cash at Bank input field read-only (disabled)
  - Add visual indicator that field is auto-calculated
  - Add tooltip explaining the calculation
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [x] 6.3 Auto-update Section E (Payables)




  - Update all payable category fields with computed values
  - Make all payable input fields read-only (disabled)
  - Add visual indicators for auto-calculated fields
  - Add tooltips explaining payable calculations
  - _Requirements: 4.2, 4.3, 4.4, 4.5_

- [x] 7. Update save and load logic





  - Ensure payment status and amount paid are included in save payload
  - Verify computed Cash at Bank and payables are saved for reporting
  - Test save operation uses existing endpoint without schema changes
  - Implement load logic to restore payment status from saved data
  - Add default values for records without payment data (backward compatibility)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8. Add accessibility features





  - Implement keyboard navigation for payment controls (Tab, Enter, Escape, Arrows)
  - Add ARIA labels and descriptions for screen readers
  - Add visual indicators for payment status (icons with colors)
  - Ensure disabled fields have appropriate styling and tooltips
  - Test with keyboard-only navigation
  - _Requirements: 6.1, 6.3, 6.4_

- [x] 9. Final integration and testing





  - Test complete flow: enter expenses → set payment status → verify calculations
  - Test save and reload preserves payment data and recalculates correctly
  - Test with existing execution records (backward compatibility)
  - Verify no backend changes required
  - Test across different programs (HIV, Malaria, TB) and facility types
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5_
