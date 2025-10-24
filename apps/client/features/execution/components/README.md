# Execution Components

## Payment Status Control

The `PaymentStatusControl` component enables accountants to track payment status for each expense item in the execution form.

### Quick Start

```tsx
import { PaymentStatusControl } from "@/features/execution/components"

<PaymentStatusControl
  expenseCode="HIV_EXEC_HOSPITAL_B_B-01_1"
  amount={12000}
  paymentStatus="unpaid"
  amountPaid={0}
  onChange={(status, paid) => {
    // Update form state
  }}
/>
```

### Component States

#### 1. Unpaid (Default)
```
[X icon] [Switch: OFF]
```
- Red X icon indicates unpaid status
- Switch is in OFF position
- amountPaid = 0

#### 2. Fully Paid
```
[✓ icon] [Switch: ON]
```
- Green check icon indicates paid status
- Switch is in ON position
- amountPaid = amount

#### 3. Partially Paid
```
[− icon] [Switch: OFF]
```
- Orange minus icon indicates partial payment
- Switch is in OFF position
- amountPaid = custom value (0 < value < amount)

### Popover Interface

When clicked, the component shows a popover with:

```
┌─────────────────────────────────┐
│ Payment Status                  │
│ Select how this expense has     │
│ been paid                       │
│                                 │
│ [✓] Fully Paid                  │
│ [X] Unpaid                      │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [−] Partially Paid          │ │
│ │                             │ │
│ │ [Input: Enter paid amount]  │ │
│ │ Total expense: 12000        │ │
│ │                             │ │
│ │ [Apply Partial Payment]     │ │
│ └─────────────────────────────┘ │
└─────────────────────────────────┘
```

### Validation

The component validates partial payments:

- ✅ Amount > 0
- ✅ Amount ≤ Total expense
- ❌ Shows inline error if validation fails

### Integration Example

```tsx
// In Section B expense row
<div className="flex items-center gap-2">
  <span className="flex-1">Laboratory Technician</span>
  
  <Input
    type="number"
    value={formData.amount}
    onChange={handleAmountChange}
    className="w-32"
  />
  
  <PaymentStatusControl
    expenseCode={item.code}
    amount={formData.amount}
    paymentStatus={formData.paymentStatus}
    amountPaid={formData.amountPaid}
    onChange={handlePaymentChange}
  />
</div>
```

### Files

- `payment-status-control.tsx` - Component implementation
- `payment-status-control.example.tsx` - Usage examples
- `payment-status-control.md` - Detailed documentation

### Related Tasks

This component implements:
- ✅ Task 3.1: Build PaymentStatusControl component
- ✅ Task 3.2: Add payment validation logic

Next tasks:
- Task 4: Extend form state to support payment data
- Task 5: Integrate payment controls into Section B
