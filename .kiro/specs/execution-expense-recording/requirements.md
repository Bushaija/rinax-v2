# Requirements Document

## Introduction

The execution expense recording feature introduces refined accounting logic and an interactive expense recording interface for the Budget Management System (BMS). This feature enables real-time financial balance updates (Cash at Bank, Payables) entirely on the client-side, providing instant feedback to accountants as they record expenditures without requiring backend websockets or complex real-time infrastructure.

## Glossary

- **BMS**: Budget Management System - the main application for managing budgets and expenses
- **Cash_at_Bank**: The current available cash balance in the bank account
- **Payables**: Outstanding amounts owed but not yet paid
- **Expense_Entry**: A record of an expenditure with amount and payment status
- **Payment_Status**: The state of an expense (Paid, Unpaid, or Partially Paid)
- **Client_State**: React application state that manages real-time calculations
- **Sync_Operation**: The process of sending local data to the backend for persistence

## Requirements

### Requirement 1

**User Story:** As an accountant, I want to record expenses with immediate payment status decisions, so that I can see real-time balance updates without waiting for server responses.

#### Acceptance Criteria

1. WHEN an accountant records an expenditure, THE BMS SHALL prompt for payment status selection
2. THE BMS SHALL provide three payment options: Paid, Unpaid, and Partially Paid
3. IF the expense is marked as Paid, THEN THE BMS SHALL reduce the Cash_at_Bank by the full expense amount
4. IF the expense is marked as Unpaid, THEN THE BMS SHALL increase the corresponding Payables by the full expense amount
5. WHERE the expense is marked as Partially Paid, THE BMS SHALL split the amount between Cash_at_Bank reduction and Payables increase

### Requirement 2

**User Story:** As an accountant, I want an intuitive interface for entering payment details, so that I can efficiently record expense information with minimal clicks.

#### Acceptance Criteria

1. THE BMS SHALL display a Switch component for toggling between Paid and Unpaid states
2. WHEN the payment status is set to Paid, THE BMS SHALL show a Popover component for payment details
3. THE BMS SHALL provide an Input component within the Popover for specifying partial payment amounts
4. THE BMS SHALL validate that partial payment amounts do not exceed the total expense amount
5. THE BMS SHALL use shadcn/ui components for consistent visual design

### Requirement 3

**User Story:** As an accountant, I want to see balance calculations update instantly as I enter expenses, so that I can verify my entries are correct before saving.

#### Acceptance Criteria

1. THE BMS SHALL compute Cash_at_Bank balance changes in real-time within Client_State
2. THE BMS SHALL compute Payables balance changes in real-time within Client_State
3. THE BMS SHALL compute Total_Expenses in real-time within Client_State
4. THE BMS SHALL update all balance displays immediately when expense entries change
5. THE BMS SHALL maintain calculation accuracy without server round-trips

### Requirement 4

**User Story:** As an accountant, I want my expense data to be saved reliably to the server, so that my work is preserved and available to other users.

#### Acceptance Criteria

1. THE BMS SHALL perform Sync_Operations only on explicit save actions or autosave triggers
2. WHEN a Sync_Operation occurs, THE BMS SHALL send summarized expense data to the backend
3. THE BMS SHALL send current Cash_at_Bank and Payables totals during sync
4. IF a Sync_Operation fails, THEN THE BMS SHALL retain local data and notify the user
5. THE BMS SHALL treat the backend as the authoritative source of truth after successful sync

### Requirement 5

**User Story:** As an accountant, I want the system to handle network delays gracefully, so that I can continue working even with slow internet connections.

#### Acceptance Criteria

1. THE BMS SHALL perform all balance calculations locally without network dependencies
2. THE BMS SHALL queue Sync_Operations when network connectivity is unavailable
3. THE BMS SHALL provide visual feedback during sync operations
4. THE BMS SHALL allow continued expense entry during background sync operations
5. THE BMS SHALL resolve sync conflicts by prioritizing server data when conflicts occur