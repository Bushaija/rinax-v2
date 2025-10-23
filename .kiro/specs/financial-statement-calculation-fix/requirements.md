# Requirements Document

## Introduction

This feature addresses critical calculation inconsistencies in financial statement generation where surplus/deficit values are hardcoded or use incorrect event mappings instead of proper accounting calculations. Currently, the Assets & Liabilities statement shows a hardcoded value of -80 for surplus/deficit, while other statements may use different calculation methods, leading to inconsistent financial reporting that violates basic accounting principles.

## Requirements

### Requirement 1

**User Story:** As a financial analyst, I want all financial statements to show consistent surplus/deficit calculations, so that the financial reports are accurate and comply with accounting standards.

#### Acceptance Criteria

1. WHEN generating Revenue & Expenditure statement THEN the system SHALL calculate surplus/deficit as Total Revenue minus Total Expenditure
2. WHEN generating Assets & Liabilities statement THEN the system SHALL show the same surplus/deficit value as the Revenue & Expenditure statement
3. WHEN generating Net Assets Changes statement THEN the system SHALL use the same surplus/deficit calculation for all period references
4. WHEN comparing surplus/deficit across statements THEN all values SHALL be identical and based on the same calculation formula

### Requirement 2

**User Story:** As a system administrator, I want surplus/deficit calculations to be based on actual financial data rather than hardcoded values, so that the reports reflect real financial performance.

#### Acceptance Criteria

1. WHEN calculating surplus/deficit THEN the system SHALL use actual revenue event data (TAX_REVENUE, GRANTS, TRANSFERS_CENTRAL, etc.)
2. WHEN calculating surplus/deficit THEN the system SHALL use actual expenditure event data (COMPENSATION_EMPLOYEES, GOODS_SERVICES, etc.)
3. WHEN surplus/deficit is displayed THEN the system SHALL NOT use hardcoded values like -80
4. WHEN event data is missing THEN the system SHALL show zero or null rather than arbitrary hardcoded values

### Requirement 3

**User Story:** As an accountant, I want the financial statements to follow proper accounting principles, so that the reports can be used for official financial reporting and auditing.

#### Acceptance Criteria

1. WHEN calculating surplus/deficit THEN the system SHALL follow the accounting equation: Surplus = Revenue - Expenses
2. WHEN displaying financial position THEN the system SHALL ensure Assets = Liabilities + Net Assets (including surplus/deficit)
3. WHEN generating multiple periods THEN the system SHALL maintain calculation consistency across all time periods
4. WHEN auditing financial data THEN the system SHALL provide traceable calculations from source events to final surplus/deficit values

### Requirement 4

**User Story:** As a developer maintaining the system, I want surplus/deficit calculations to be centralized and maintainable, so that changes to the calculation logic are consistent across all statements.

#### Acceptance Criteria

1. WHEN updating surplus/deficit calculation logic THEN the system SHALL apply changes to all relevant financial statements
2. WHEN adding new revenue or expenditure categories THEN the system SHALL automatically include them in surplus/deficit calculations
3. WHEN debugging calculation issues THEN the system SHALL provide clear formula traceability and event mapping documentation
4. WHEN testing financial calculations THEN the system SHALL validate that all statements use the same surplus/deficit formula