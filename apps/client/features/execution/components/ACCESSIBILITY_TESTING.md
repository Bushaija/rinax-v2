# Accessibility Testing Guide for Payment Status Control

This document provides a comprehensive guide for testing the accessibility features of the Payment Status Control component.

## Keyboard Navigation Testing

### Basic Navigation Flow

1. **Tab to Payment Status Control**
   - Press `Tab` to navigate to the payment status button
   - The button should receive visible focus (ring outline)
   - Screen reader should announce: "Payment status for [expense code]: [status]. Press Enter or Space to change payment status."

2. **Open Payment Options**
   - Press `Enter` or `Space` to open the payment options popover
   - Focus should automatically move to the first button ("Fully Paid")
   - Screen reader should announce the dialog title and description

3. **Navigate Between Options**
   - Press `Arrow Down` to move to the next option
   - Press `Arrow Up` to move to the previous option
   - Focus should cycle through:
     - Fully Paid button
     - Unpaid button
     - Partial payment input field
     - Apply Partial Payment button

4. **Select an Option**
   - Press `Enter` on "Fully Paid" or "Unpaid" buttons to select
   - The popover should close
   - Focus should return to the payment status button
   - The button should show the updated status with appropriate icon and color

5. **Partial Payment Entry**
   - Navigate to the partial payment input field using arrow keys
   - Type a number value
   - Press `Enter` to apply (or navigate to Apply button and press `Enter`)
   - If validation fails, error message should be announced by screen reader
   - If successful, popover closes and focus returns to trigger button

6. **Close Without Selection**
   - Press `Escape` to close the popover without making changes
   - Focus should return to the payment status button

### Visual Indicators Testing

#### Payment Status Colors and Icons

1. **Paid Status**
   - Background: Light green (`bg-green-50`)
   - Text color: Green (`text-green-600`)
   - Icon: Green checkmark
   - Tooltip: "This expense is fully paid ([amount])"

2. **Unpaid Status**
   - Background: Light red (`bg-red-50`)
   - Text color: Red (`text-red-600`)
   - Icon: Red X
   - Tooltip: "This expense is not paid yet ([amount] outstanding)"

3. **Partial Status**
   - Background: Light orange (`bg-orange-50`)
   - Text color: Orange (`text-orange-600`)
   - Icon: Orange minus/dash
   - Tooltip: "This expense is partially paid ([paid] paid, [outstanding] outstanding)"

#### Disabled Fields Styling

1. **Auto-calculated Fields (Cash at Bank, Payables)**
   - Background: Light blue (`bg-blue-50`)
   - Cursor: Not allowed (`cursor-not-allowed`)
   - Icon: Blue calculator icon next to the field
   - Tooltip: Explains the calculation formula
   - ARIA label: Describes the field and indicates it's auto-calculated

2. **Locked Fields (Previous Quarters)**
   - Text color: Gray (`text-gray-600`)
   - Icon: Gray lock icon
   - ARIA label: Indicates the quarter is locked and cannot be edited

### Screen Reader Testing

#### NVDA/JAWS (Windows)

1. **Navigate to Payment Control**
   - Should announce: "Button, Payment status for [code]: [status]. Press Enter or Space to change payment status."
   - Should announce current status from description

2. **Open Popover**
   - Should announce: "Dialog, Payment status options"
   - Should announce: "Payment Status" (heading)
   - Should announce: "Select how this expense has been paid. Use arrow keys to navigate options."

3. **Navigate Options**
   - "Fully Paid" button: "Button, Mark as fully paid. Total amount: [amount]"
   - "Unpaid" button: "Button, Mark as unpaid. Total amount: [amount]"
   - Partial input: "Edit, Enter partial payment amount. Total expense is [amount]"

4. **Validation Errors**
   - Should announce error message immediately when validation fails
   - Error should be associated with the input field via `aria-describedby`

5. **Auto-calculated Fields**
   - Should announce: "[Field name] for [quarter]: [value]. Auto-calculated field."
   - Should announce calculation description from `aria-describedby`

6. **Locked Fields**
   - Should announce: "[Field name] for [quarter]: [value]. This quarter is locked and cannot be edited."

#### VoiceOver (macOS)

Similar announcements as NVDA/JAWS, but with VoiceOver-specific phrasing:
- "Button" becomes "Button"
- "Edit" becomes "Edit text"
- Navigation hints may differ slightly

### Focus Management Testing

1. **Focus Trap in Popover**
   - When popover is open, focus should stay within the popover
   - Tab should cycle through focusable elements
   - Shift+Tab should cycle backwards

2. **Focus Return**
   - After selecting an option, focus returns to trigger button
   - After pressing Escape, focus returns to trigger button
   - Focus should be visible (ring outline)

3. **Initial Focus**
   - When popover opens, focus should automatically move to first button
   - No need for user to tab to first option

### Tooltip Testing

1. **Hover Tooltips**
   - Hover over payment status button to see status tooltip
   - Hover over auto-calculated fields to see calculation explanation
   - Tooltips should appear after brief delay (default: 0ms)

2. **Keyboard Tooltips**
   - Focus on payment status button should show tooltip
   - Tooltip should not interfere with keyboard navigation

### Color Contrast Testing

Use browser DevTools or tools like:
- Chrome DevTools Lighthouse
- axe DevTools
- WAVE browser extension

Verify:
- All text meets WCAG AA standards (4.5:1 for normal text)
- Icon colors are distinguishable
- Disabled field backgrounds have sufficient contrast

### High Contrast Mode Testing

Test in Windows High Contrast Mode:
1. Enable High Contrast Mode (Alt + Left Shift + Print Screen)
2. Verify all icons are visible
3. Verify focus indicators are visible
4. Verify disabled states are distinguishable

## Manual Testing Checklist

- [ ] Tab navigation works through all payment controls
- [ ] Enter/Space opens payment options popover
- [ ] Arrow keys navigate between options in popover
- [ ] Escape closes popover and returns focus
- [ ] Enter on option selects and closes popover
- [ ] Partial payment input accepts keyboard entry
- [ ] Enter in partial input applies payment
- [ ] Validation errors are announced
- [ ] Focus returns to trigger after selection
- [ ] Visual indicators show correct colors for each status
- [ ] Tooltips appear on hover and focus
- [ ] Auto-calculated fields show calculator icon
- [ ] Auto-calculated fields have appropriate tooltips
- [ ] Locked fields show lock icon
- [ ] Locked fields indicate they cannot be edited
- [ ] Screen reader announces all elements correctly
- [ ] Screen reader announces status changes
- [ ] Screen reader announces validation errors
- [ ] High contrast mode displays correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] All interactive elements have visible focus indicators

## Common Issues and Solutions

### Issue: Focus not visible
**Solution**: Ensure `focus-visible:ring-2` classes are applied to all interactive elements

### Issue: Screen reader not announcing changes
**Solution**: Use `aria-live="polite"` for dynamic content and `role="alert"` for errors

### Issue: Keyboard navigation skips elements
**Solution**: Ensure all interactive elements have `tabIndex={0}` or are naturally focusable

### Issue: Tooltip blocks interaction
**Solution**: Ensure tooltip has appropriate `sideOffset` and doesn't cover interactive elements

### Issue: Colors not distinguishable
**Solution**: Use both color AND icons/text to convey status (don't rely on color alone)

## Automated Testing Recommendations

While manual testing is required for this task, consider adding automated tests:

```typescript
// Example test structure (not implemented)
describe('PaymentStatusControl Accessibility', () => {
  it('should have proper ARIA labels', () => {
    // Test ARIA attributes
  })
  
  it('should handle keyboard navigation', () => {
    // Test Tab, Enter, Escape, Arrow keys
  })
  
  it('should announce status changes to screen readers', () => {
    // Test aria-live regions
  })
  
  it('should return focus after closing popover', () => {
    // Test focus management
  })
})
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
