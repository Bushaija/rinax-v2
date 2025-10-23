# Requirements Document

## Introduction

This feature redesigns the Budget vs Actual statement generation to match the exact UI requirements, including proper column structure (Description, Note, Revised Budget, Actual, Variance, Performance %), correct event mappings, and accurate calculations. The current implementation uses a two-column approach that doesn't align with the required four+ column Budget vs Actual format.

## Requirements

### Requirement 1

**User Story:** As a financial analyst, I want to generate Budget vs Actual statements with the correct column structure, so that I can view budget performance in the standard format with Description, Note, Revised Budget (A), Actual (B), Variance (A - B), and Performance % columns.

#### Acceptance Criteria

1. WHEN generating a Budget vs Actual statement THEN the system SHALL display six columns: Description, Note, Revised Budget (A), Actual (B), Variance (A - B), and Performance %
2. WHEN displaying the statement THEN the system SHALL format currency values with proper decimal places and show "-" for zero values
3. WHEN calculating Performance % THEN the system SHALL compute (Actual / Budget) * 100 where Budget ≠ 0
4. WHEN Budget is zero THEN the system SHALL display "-" for Performance %

### Requirement 2

**User Story:** As a financial analyst, I want the Budget vs Actual statement to show the correct line items and structure, so that it matches the standard government financial reporting format with proper categorization of receipts and expenditures.

#### Acceptance Criteria

1. WHEN generating the statement THEN the system SHALL display "1. RECEIPTS" as a bold header section
2. WHEN displaying receipts THEN the system SHALL include: Tax revenue (note 1), Grants and transfers (note 2), Other revenue (note 9), Transfers from public entities (note 4), and Total Receipts (note 33)
3. WHEN generating the statement THEN the system SHALL display "2. EXPENDITURES" as a bold header section  
4. WHEN displaying expenditures THEN the system SHALL include: Compensation of employees (note 12), Goods and services (note 23), Finance cost (note 17), Subsidies (note 15), Grants and other transfers (note 14), Social assistance (note 16), Other expenses (note 20), and Total Expenditures (note 34)
5. WHEN displaying additional items THEN the system SHALL include: Total non-financial assets (note 35), Net lending / borrowing (computed), and Total net incurrence of liabilities (note 36)

### Requirement 3

**User Story:** As a financial analyst, I want the Budget vs Actual statement to use correct event mappings for complex scenarios, so that budget and actual columns show data from the appropriate sources even when they map to different event codes.

#### Acceptance Criteria

1. WHEN displaying "Transfers from public entities" line THEN the system SHALL use GOODS_SERVICES_PLANNING for both original and revised budget columns AND TRANSFERS_PUBLIC_ENTITIES for the actual column
2. WHEN displaying "Goods and services" line THEN the system SHALL use GOODS_SERVICES_PLANNING for both original and revised budget columns AND GOODS_SERVICES for the actual column
3. WHEN displaying other lines without custom mappings THEN the system SHALL use standard event mapping logic with PLANNING events for budget and EXECUTION events for actual
4. WHEN event mappings are missing or invalid THEN the system SHALL log warnings and display zero values rather than failing

### Requirement 4

**User Story:** As a financial analyst, I want computed lines to calculate correctly in Budget vs Actual statements, so that totals, subtotals, and derived values like Net lending/borrowing are accurate.

#### Acceptance Criteria

1. WHEN calculating "Total Receipts" THEN the system SHALL sum all receipt line items for both budget and actual columns
2. WHEN calculating "Total Expenditures" THEN the system SHALL sum all expenditure line items for both budget and actual columns
3. WHEN calculating "Net lending / borrowing" THEN the system SHALL compute (Total Receipts - Total Expenditures - Total non-financial assets) for both budget and actual columns
4. WHEN displaying computed lines THEN the system SHALL format them with bold text to distinguish from data lines

### Requirement 5

**User Story:** As a system administrator, I want the Budget vs Actual redesign to not impact other financial statements, so that existing Revenue & Expenditure, Assets & Liabilities, Cash Flow, and Net Assets Changes statements continue working unchanged.

#### Acceptance Criteria

1. WHEN generating REV_EXP, ASSETS_LIAB, CASH_FLOW, or NET_ASSETS_CHANGES statements THEN the system SHALL use the existing two-column logic without modification
2. WHEN generating BUDGET_VS_ACTUAL statements THEN the system SHALL use the new four+ column logic with specialized event mappings
3. WHEN the Budget vs Actual handler encounters errors THEN the system SHALL fail gracefully without affecting other statement types
4. WHEN database schema changes are needed THEN the system SHALL maintain backward compatibility with existing statement templates

### Requirement 6

**User Story:** As a financial analyst, I want Budget vs Actual statements to include proper validation and error handling, so that I can trust the accuracy of the generated reports and understand any data quality issues.

#### Acceptance Criteria

1. WHEN generating the statement THEN the system SHALL validate that required planning and execution events exist in the database
2. WHEN event data is missing for a line item THEN the system SHALL display zero values and include warnings in the validation results
3. WHEN variance calculations result in division by zero THEN the system SHALL handle gracefully and display appropriate indicators
4. WHEN the statement is generated THEN the system SHALL include validation results showing any warnings, errors, or data quality issues