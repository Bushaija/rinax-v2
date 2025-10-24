# PaymentStatusControl Component

## Overview

The `PaymentStatusControl` component provides a user-friendly interface for managing payment status of expense items in the execution form. It allows users to mark expenses as Paid, Unpaid, or Partially Paid with built-in validation.

## Features

### Core Functionality
- ✅ Switch component for quick paid/unpaid toggle
- ✅ Popover interface with three payment options
- ✅ Partial payment input with validation
- ✅ Visual feedback with status icons and colors
- ✅ Inline error messages for validation failures
- ✅ Keyboard navigation support
- ✅ Screen reader accessibility

### Payment Options

1. **Fully Paid** - Sets status to "paid" and amountPaid to full expense amount
2. **Unpaid** - Sets status to "unpaid" and amountPaid to 0
3. **Partially Paid** - Allows custom amount entry with validation

### Validation Rules

- Partial payment amount must be greater than 0
- Partial payment amount cannot exceed total expense
- Invalid amounts show inline error messages
- Validation occurs on input change and submission

### Visual Indicators

| Status | Icon | Color |
|--------|------|-------|
| Paid | ✓ Check | Green |
| Unpaid | ✗ X | Red |
| Partial | − Minus | Orange |

## Usage

```tsx
import { PaymentStatusControl } from "@/features/execution/components"

function ExpenseRow() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid")
  const [amountPaid, setAmountPaid] = useState(0)
  
  const handlePaymentChange = (status: PaymentStatus, paid: number) => {
    setPaymentStatus(status)
    setAmountPaid(paid)
  }
  
  return (
    <PaymentStatusControl
      expenseCode="HIV_EXEC_HOSPITAL_B_B-01_1"
      amount={12000}
      paymentStatus={paymentStatus}
      amountPaid={amountPaid}
      onChange={handlePaymentChange}
    />
  )
}
```

## Props

```typescript
interface PaymentStatusControlProps {
  expenseCode: string        // Unique identifier for the expense
  amount: number            // Total expense amount
  paymentStatus: PaymentStatus  // Current payment status
  amountPaid: number        // Amount that has been paid
  onChange: (status: PaymentStatus, amountPaid: number) => void
  disabled?: boolean        // Optional: disable the control
}

type PaymentStatus = "paid" | "unpaid" | "partial"
```

## Accessibility

### Keyboard Navigation
- **Tab**: Navigate to payment control
- **Enter/Space**: Open payment options popover
- **Escape**: Close popover
- **Enter** (in partial input): Apply partial payment

### Screen Reader Support
- ARIA labels describe payment status
- ARIA descriptions provide context
- Error messages announced via `role="alert"`
- Status changes announced automatically

### Visual Accessibility
- High contrast icons and colors
- Clear visual indicators for each status
- Disabled state styling
- Focus visible indicators

## Implementation Details

### Component Structure
```
PaymentStatusControl
├── PopoverTrigger (Button with Switch)
│   ├── Status Icon (Check/X/Minus)
│   └── Switch (visual indicator)
└── PopoverContent
    ├── Fully Paid Button
    ├── Unpaid Button
    └── Partially Paid Section
        ├── Amount Input
        ├── Error Message (conditional)
        └── Apply Button
```

### State Management
- Internal state for popover open/close
- Internal state for partial amount input
- Internal state for validation errors
- Props control payment status and amount

### Validation Flow
1. User enters partial amount
2. Validation runs on input change (clears errors)
3. Validation runs on apply button click
4. If valid: calls onChange and closes popover
5. If invalid: shows error message inline

## Requirements Satisfied

### Task 3.1 Requirements
- ✅ Create component with Switch for paid/unpaid toggle
- ✅ Add Popover that appears on switch interaction
- ✅ Implement three payment options: Fully Paid, Unpaid, Partially Paid
- ✅ Add Input field for partial payment amount entry
- ✅ Use shadcn/ui components (Switch, Popover, Input, Button)

### Task 3.2 Requirements
- ✅ Validate partial payment amount doesn't exceed total expense
- ✅ Validate partial payment amount is greater than 0
- ✅ Show inline error messages for validation failures
- ✅ Provide visual feedback for current payment status (icons/colors)

### Design Requirements
- ✅ Requirements 1.1, 1.2: Payment status toggle next to expense input
- ✅ Requirements 2.1, 2.2, 2.3: Popover with three payment options
- ✅ Requirements 2.4, 2.5: Validation for partial payments
- ✅ Requirements 6.1, 6.2, 6.3: shadcn/ui components, intuitive interface
- ✅ Requirement 6.4: Clear visual indicators

## Files Created

1. `payment-status-control.tsx` - Main component implementation
2. `payment-status-control.example.tsx` - Usage examples
3. `payment-status-control.md` - This documentation

## Next Steps

To integrate this component into the execution form:

1. **Task 4**: Extend form state to support payment data
2. **Task 5**: Integrate payment controls into Section B
3. **Task 6**: Implement auto-calculation for Section D and E

See `.kiro/specs/execution-payment-tracking/tasks.md` for the complete implementation plan.
