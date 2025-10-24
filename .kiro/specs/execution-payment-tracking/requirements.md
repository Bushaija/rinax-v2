# Requirements Document

## Introduction

This feature introduces payment status tracking for expenditure items in the execution form. Accountants can mark each expense as Paid, Unpaid, or Partially Paid, and the system automatically calculates Cash at Bank and Payables in real-time on the client-side. This eliminates manual calculation errors and provides instant financial visibility without requiring backend changes.

## Glossary

- **Execution_Form**: The form where accountants record quarterly financial execution data
- **Section_B**: Expenditures section containing all expense line items
- **Section_D**: Financial Assets section containing Cash at Bank and other assets
- **Section_E**: Financial Liabilities section containing payable categories
- **Payment_Status**: The state of an expense payment (Paid, Unpaid, or Partial)
- **Opening_Balance**: Initial transfer amount from SPIU/RBC (Section A-2)
- **Cash_at_Bank**: Computed as Opening Balance minus total paid amounts
- **Payables**: Computed as unpaid portions of expenses, mapped to specific categories
- **Client_State**: React form state managing expense data and payment status

## Requirements

### Requirement 1

**User Story:** As an accountant, I want to mark each expense as paid or unpaid when entering amounts, so that the system automatically calculates my cash and payables balances.

#### Acceptance Criteria

1. WHEN an accountant enters an expense amount in Section_B, THE Execution_Form SHALL display a payment status toggle next to the amount input
2. THE Execution_Form SHALL provide a Switch component for toggling between Paid and Unpaid states
3. WHEN the payment status is changed, THE Execution_Form SHALL update the expense payment status in Client_State
4. THE Execution_Form SHALL store payment status as "paid", "unpaid", or "partial" for each expense
5. THE Execution_Form SHALL store the amount paid for each expense (0 for unpaid, full amount for paid, or partial amount)

### Requirement 2

**User Story:** As an accountant, I want to record partial payments for expenses, so that I can accurately track when an expense is only partially settled.

#### Acceptance Criteria

1. WHEN an accountant clicks the payment status toggle, THE Execution_Form SHALL display a Popover component with payment options
2. THE Execution_Form SHALL provide three options in the Popover: "Fully Paid", "Unpaid", and "Partially Paid"
3. WHERE the accountant selects "Partially Paid", THE Execution_Form SHALL display an Input field for entering the paid amount
4. THE Execution_Form SHALL validate that partial payment amounts do not exceed the total expense amount
5. WHEN a partial payment is entered, THE Execution_Form SHALL split the expense between Cash_at_Bank (paid portion) and Payables (unpaid portion)

### Requirement 3

**User Story:** As an accountant, I want to see Cash at Bank update automatically as I mark expenses as paid, so that I know my current cash position without manual calculation.

#### Acceptance Criteria

1. THE Execution_Form SHALL compute Cash_at_Bank as Opening_Balance minus total paid amounts
2. THE Execution_Form SHALL update Cash_at_Bank in real-time when any expense payment status changes
3. THE Execution_Form SHALL display the computed Cash_at_Bank value in Section_D as a read-only field
4. THE Execution_Form SHALL disable manual editing of the Cash_at_Bank input field
5. THE Execution_Form SHALL perform all Cash_at_Bank calculations in Client_State without server requests

### Requirement 4

**User Story:** As an accountant, I want payables to be automatically calculated and categorized based on unpaid expenses, so that I don't have to manually distribute unpaid amounts across payable categories.

#### Acceptance Criteria

1. THE Execution_Form SHALL map each expense item to its corresponding payable category using seeded configuration data
2. WHEN an expense is marked as unpaid or partially paid, THE Execution_Form SHALL add the unpaid amount to the corresponding payable category
3. THE Execution_Form SHALL compute all payable category totals in real-time within Client_State
4. THE Execution_Form SHALL display computed payable values in Section_E as read-only fields
5. THE Execution_Form SHALL disable manual editing of all payable input fields

### Requirement 5

**User Story:** As an accountant, I want my expense and payment data to be saved to the server, so that my work is preserved and available for reporting.

#### Acceptance Criteria

1. THE Execution_Form SHALL save expense amounts, payment status, and amount paid for each expense item
2. THE Execution_Form SHALL save computed Cash_at_Bank and payable totals to maintain backend compatibility
3. WHEN the form is saved, THE Execution_Form SHALL send data using the existing save endpoint without schema changes
4. THE Execution_Form SHALL preserve the existing data structure for backward compatibility with reports
5. WHEN loading saved data, THE Execution_Form SHALL restore payment status and recompute totals from saved payment data

### Requirement 6

**User Story:** As an accountant, I want the payment tracking interface to be intuitive and unobtrusive, so that I can quickly enter expense data without extra clicks.

#### Acceptance Criteria

1. THE Execution_Form SHALL use shadcn/ui components (Switch, Popover, Input) for consistent visual design
2. THE Execution_Form SHALL position payment controls adjacent to expense amount inputs for easy access
3. THE Execution_Form SHALL show the Popover only when the user interacts with the payment toggle
4. THE Execution_Form SHALL provide clear visual indicators for payment status (paid/unpaid/partial)
5. THE Execution_Form SHALL maintain the existing Section B layout and collapsible structure
