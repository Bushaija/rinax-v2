# User Acceptance Testing (UAT) Checklist
## Payment Tracking Feature

### Test Environment Setup
- [ ] Feature deployed to staging environment
- [ ] Test data seeded (HIV, Malaria, TB programs)
- [ ] Test user accounts created with appropriate permissions
- [ ] Browser compatibility verified (Chrome, Firefox, Edge, Safari)

---

## Test Scenarios

### 1. Basic Payment Tracking

#### 1.1 Mark Expense as Paid
- [ ] Navigate to execution form
- [ ] Enter an expense amount (e.g., 10,000)
- [ ] Click the payment status toggle
- [ ] Select "Fully Paid" from the popover
- [ ] Verify the toggle shows "Paid" status
- [ ] Verify Cash at Bank decreases by the expense amount
- [ ] Verify no payable is created for this expense

**Expected Result**: Expense marked as paid, cash decreases, no payable created

---

#### 1.2 Mark Expense as Unpaid
- [ ] Enter an expense amount (e.g., 8,000)
- [ ] Click the payment status toggle
- [ ] Select "Unpaid" from the popover
- [ ] Verify the toggle shows "Unpaid" status
- [ ] Verify Cash at Bank remains unchanged
- [ ] Verify payable is created for the full expense amount

**Expected Result**: Expense marked as unpaid, cash unchanged, payable created

---

#### 1.3 Enter Partial Payment
- [ ] Enter an expense amount (e.g., 15,000)
- [ ] Click the payment status toggle
- [ ] Select "Partially Paid" from the popover
- [ ] Enter partial amount (e.g., 10,000)
- [ ] Click "Apply" or confirm
- [ ] Verify the toggle shows "Partial" status with amount
- [ ] Verify Cash at Bank decreases by partial amount (10,000)
- [ ] Verify payable is created for unpaid portion (5,000)

**Expected Result**: Partial payment recorded, cash decreases by paid amount, payable created for unpaid portion

---

### 2. Real-time Calculations

#### 2.1 Cash at Bank Updates
- [ ] Note the current Cash at Bank value
- [ ] Enter a new expense and mark as paid
- [ ] Verify Cash at Bank updates immediately (no page refresh needed)
- [ ] Change payment status from paid to unpaid
- [ ] Verify Cash at Bank updates immediately

**Expected Result**: Cash at Bank updates in real-time without page refresh

---

#### 2.2 Payables Update
- [ ] Note the current payables values in Section E
- [ ] Enter a new expense and mark as unpaid
- [ ] Verify the corresponding payable category increases immediately
- [ ] Change payment status to paid
- [ ] Verify the payable decreases immediately

**Expected Result**: Payables update in real-time without page refresh

---

#### 2.3 Multiple Expenses
- [ ] Enter 5 different expenses with mixed payment statuses
- [ ] Verify all calculations update correctly
- [ ] Change payment status on one expense
- [ ] Verify only affected calculations update

**Expected Result**: All calculations accurate with multiple expenses

---

### 3. Validation

#### 3.1 Partial Payment Validation
- [ ] Enter an expense amount (e.g., 10,000)
- [ ] Select "Partially Paid"
- [ ] Try to enter partial amount greater than total (e.g., 15,000)
- [ ] Verify error message is displayed
- [ ] Verify cannot save/apply invalid amount

**Expected Result**: Validation prevents partial payment exceeding total

---

#### 3.2 Zero Partial Payment
- [ ] Enter an expense amount (e.g., 10,000)
- [ ] Select "Partially Paid"
- [ ] Try to enter zero as partial amount
- [ ] Verify error message is displayed
- [ ] Verify cannot save/apply zero amount

**Expected Result**: Validation prevents zero partial payment

---

#### 3.3 Negative Cash Warning
- [ ] Note the opening balance
- [ ] Enter expenses totaling more than opening balance
- [ ] Mark expenses as paid
- [ ] Verify warning indicator for negative cash position
- [ ] Verify can still save (warning, not error)

**Expected Result**: Warning displayed for negative cash, but save allowed

---

### 4. Save and Load

#### 4.1 Save Payment Data
- [ ] Enter multiple expenses with different payment statuses
- [ ] Click "Save" button
- [ ] Verify success message displayed
- [ ] Verify no errors in console

**Expected Result**: Form saves successfully with payment data

---

#### 4.2 Reload and Verify
- [ ] After saving, navigate away from the form
- [ ] Navigate back to the same execution form
- [ ] Verify all expense amounts are preserved
- [ ] Verify all payment statuses are preserved
- [ ] Verify Cash at Bank is recalculated correctly
- [ ] Verify Payables are recalculated correctly

**Expected Result**: All data preserved and calculations correct after reload

---

#### 4.3 Edit Saved Data
- [ ] Load a saved execution form
- [ ] Change payment status on one expense
- [ ] Save again
- [ ] Reload and verify changes are preserved

**Expected Result**: Changes to payment status are saved and preserved

---

### 5. Backward Compatibility

#### 5.1 Load Old Execution Record
- [ ] Open an execution record created before payment tracking feature
- [ ] Verify form loads without errors
- [ ] Verify all expense amounts are displayed
- [ ] Verify payment status defaults to "Unpaid"
- [ ] Verify Cash at Bank shows opening balance (no payments)
- [ ] Verify Payables show total of all expenses

**Expected Result**: Old records load correctly with default unpaid status

---

#### 5.2 Edit Old Record
- [ ] Load an old execution record
- [ ] Add payment status to some expenses
- [ ] Save the form
- [ ] Reload and verify changes are preserved
- [ ] Verify calculations are correct

**Expected Result**: Can add payment tracking to old records

---

### 6. Cross-Program Testing

#### 6.1 HIV Program - Hospital
- [ ] Create/open HIV execution form for hospital
- [ ] Test all payment tracking features
- [ ] Verify expense-to-payable mapping is correct
- [ ] Save and reload

**Expected Result**: All features work correctly for HIV hospital

---

#### 6.2 HIV Program - Health Center
- [ ] Create/open HIV execution form for health center
- [ ] Test all payment tracking features
- [ ] Verify expense-to-payable mapping is correct
- [ ] Save and reload

**Expected Result**: All features work correctly for HIV health center

---

#### 6.3 Malaria Program - Hospital
- [ ] Create/open Malaria execution form for hospital
- [ ] Test all payment tracking features
- [ ] Verify expense-to-payable mapping is correct
- [ ] Save and reload

**Expected Result**: All features work correctly for Malaria hospital

---

#### 6.4 Malaria Program - Health Center
- [ ] Create/open Malaria execution form for health center
- [ ] Test all payment tracking features
- [ ] Verify expense-to-payable mapping is correct
- [ ] Save and reload

**Expected Result**: All features work correctly for Malaria health center

---

#### 6.5 TB Program - Hospital
- [ ] Create/open TB execution form for hospital
- [ ] Test all payment tracking features
- [ ] Verify expense-to-payable mapping is correct
- [ ] Save and reload

**Expected Result**: All features work correctly for TB hospital

---

### 7. User Interface

#### 7.1 Visual Indicators
- [ ] Verify paid expenses show green checkmark or similar indicator
- [ ] Verify unpaid expenses show red X or similar indicator
- [ ] Verify partial payments show orange indicator with amount
- [ ] Verify read-only fields (Cash at Bank, Payables) have distinct styling
- [ ] Verify tooltips explain auto-calculated fields

**Expected Result**: Clear visual feedback for all payment statuses

---

#### 7.2 Layout and Positioning
- [ ] Verify payment controls are positioned next to expense inputs
- [ ] Verify controls don't break existing layout
- [ ] Verify collapsible sections still work correctly
- [ ] Verify form is responsive on different screen sizes
- [ ] Verify no horizontal scrolling required

**Expected Result**: UI is clean, organized, and responsive

---

#### 7.3 Popover Behavior
- [ ] Click payment toggle to open popover
- [ ] Verify popover appears in correct position
- [ ] Verify popover doesn't get cut off by container
- [ ] Click outside popover to close
- [ ] Press Escape key to close popover
- [ ] Verify popover closes after selecting option

**Expected Result**: Popover behaves correctly and is easy to use

---

### 8. Accessibility

#### 8.1 Keyboard Navigation
- [ ] Use Tab key to navigate through form
- [ ] Verify can reach all payment controls via keyboard
- [ ] Press Enter on payment toggle to open popover
- [ ] Use arrow keys to navigate popover options
- [ ] Press Escape to close popover
- [ ] Verify focus indicators are visible

**Expected Result**: All features accessible via keyboard

---

#### 8.2 Screen Reader Support
- [ ] Use screen reader (NVDA, JAWS, or VoiceOver)
- [ ] Verify payment status is announced
- [ ] Verify input labels are read correctly
- [ ] Verify error messages are announced
- [ ] Verify read-only fields are identified as such

**Expected Result**: Screen reader users can use all features

---

#### 8.3 Visual Accessibility
- [ ] Verify sufficient color contrast for all text
- [ ] Verify icons have text alternatives
- [ ] Verify error messages are not color-only
- [ ] Test with browser zoom at 200%
- [ ] Test with high contrast mode

**Expected Result**: Visually accessible to all users

---

### 9. Performance

#### 9.1 Large Forms
- [ ] Create execution form with 50+ expense items
- [ ] Enter payment status for all items
- [ ] Verify no lag or performance issues
- [ ] Verify calculations complete quickly
- [ ] Verify save operation completes in reasonable time

**Expected Result**: Good performance even with many expenses

---

#### 9.2 Rapid Changes
- [ ] Quickly change payment status on multiple expenses
- [ ] Verify all calculations update correctly
- [ ] Verify no race conditions or incorrect values
- [ ] Verify UI remains responsive

**Expected Result**: Handles rapid changes without issues

---

### 10. Error Handling

#### 10.1 Network Errors
- [ ] Disconnect network
- [ ] Try to save form
- [ ] Verify appropriate error message
- [ ] Reconnect network
- [ ] Verify can retry save successfully

**Expected Result**: Graceful handling of network errors

---

#### 10.2 Invalid Data
- [ ] Manually edit form data in browser console (if possible)
- [ ] Enter invalid values
- [ ] Verify validation catches issues
- [ ] Verify form doesn't break

**Expected Result**: Robust validation prevents invalid data

---

## Sign-off

### Test Execution
- **Tester Name**: ___________________________
- **Date**: ___________________________
- **Environment**: ___________________________

### Results Summary
- **Total Test Cases**: 50
- **Passed**: ___________
- **Failed**: ___________
- **Blocked**: ___________
- **Not Tested**: ___________

### Issues Found
| Issue # | Description | Severity | Status |
|---------|-------------|----------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### Approval
- [ ] All critical test cases passed
- [ ] All high-priority issues resolved
- [ ] Feature ready for production deployment

**Approved By**: ___________________________  
**Date**: ___________________________  
**Signature**: ___________________________

---

## Notes
Use this section to document any additional observations, suggestions, or concerns:

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
