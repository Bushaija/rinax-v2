# Requirements Document

## Introduction

The Statement of Changes in Net Assets currently displays data in a two-column format (Current Period and Previous Period). This needs to be restructured to a three-column format that shows:
1. Accumulated surplus/loss (Frw)
2. Adjustments (Frw)
3. Total (Frw)

This format better represents the nature of net asset changes by separating the accumulated balance from period adjustments and showing the resulting total.

## Requirements

### Requirement 1: Three-Column Display Format

**User Story:** As a financial accountant, I want to see the Statement of Changes in Net Assets in a three-column format (Accumulated surplus/loss, Adjustments, Total), so that I can clearly distinguish between opening balances, period adjustments, and closing balances.

#### Acceptance Criteria

1. WHEN viewing the Statement of Changes in Net Assets THEN the system SHALL display three columns: "Accumulated surplus/loss (Frw)", "Adjustments (Frw)", and "Total (Frw)"
2. WHEN a line item represents an opening balance THEN the system SHALL display the value in the "Accumulated surplus/loss" column
3. WHEN a line item represents a period adjustment THEN the system SHALL display the value in the "Adjustments" column
4. WHEN a line item represents a closing balance or total THEN the system SHALL display the calculated sum in the "Total" column
5. WHEN a value is zero or not applicable THEN the system SHALL display "0" or "-" as appropriate

### Requirement 2: Data Categorization Logic

**User Story:** As a system, I need to correctly categorize each line item into the appropriate column (accumulated surplus/loss, adjustments, or total), so that the statement displays accurate financial information.

#### Acceptance Criteria

1. WHEN processing opening balance lines (e.g., "Balances as at 30th June 2023") THEN the system SHALL categorize values as "Accumulated surplus/loss"
2. WHEN processing adjustment lines under "Prior year adjustments" THEN the system SHALL categorize values as "Adjustments"
3. WHEN processing closing balance lines (e.g., "Balance as at 30th June 2024") THEN the system SHALL calculate and display the sum in the "Total" column
4. WHEN processing the "Balance as at 01st July" line THEN the system SHALL display the carried forward balance in the "Accumulated surplus/loss" column
5. WHEN calculating totals THEN the system SHALL use the formula: Total = Accumulated surplus/loss + Adjustments

### Requirement 3: Template Structure Update

**User Story:** As a system administrator, I need the statement template to support three-column data structure, so that the system can generate statements in the new format.

#### Acceptance Criteria

1. WHEN the template is loaded THEN the system SHALL support metadata indicating which column each line item belongs to
2. WHEN a line item has a column indicator THEN the system SHALL respect that indicator during data aggregation
3. WHEN no column indicator is present THEN the system SHALL use default categorization logic based on line codes
4. WHEN processing calculated lines (e.g., Net surplus/Deficit) THEN the system SHALL support column-specific calculations

### Requirement 4: Backend Processor Enhancement

**User Story:** As a backend system, I need to process event data and map it to the correct columns, so that the API returns properly structured data for the three-column format.

#### Acceptance Criteria

1. WHEN aggregating event data THEN the system SHALL maintain separate totals for accumulated balances and adjustments
2. WHEN a line item is marked as an opening balance THEN the system SHALL place the value in the accumulated surplus/loss field
3. WHEN a line item is marked as an adjustment THEN the system SHALL place the value in the adjustments field
4. WHEN a line item is marked as a total THEN the system SHALL calculate the sum of accumulated and adjustments
5. WHEN returning API response THEN the system SHALL include three value fields: accumulatedSurplus, adjustments, and total

### Requirement 5: Frontend Component Update

**User Story:** As a user viewing the statement, I want the table to display three columns with proper formatting, so that I can easily read and understand the financial data.

#### Acceptance Criteria

1. WHEN rendering the statement THEN the system SHALL display a table with columns: "DESCRIPTION", "Accumulated surplus/loss (Frw)", "Adjustments (Frw)", "Total (Frw)"
2. WHEN a row is marked as a total line THEN the system SHALL apply bold formatting
3. WHEN a row is marked as a subtotal line THEN the system SHALL apply appropriate formatting
4. WHEN a value is null or not applicable THEN the system SHALL display "-" instead of blank
5. WHEN displaying currency values THEN the system SHALL format numbers with thousand separators

### Requirement 6: Data Transformation Logic

**User Story:** As a system, I need to transform API response data into the component format, so that the frontend can render the three-column layout correctly.

#### Acceptance Criteria

1. WHEN transforming statement data THEN the system SHALL map API fields to component fields: accumulatedSurplus → accumulated, adjustments → adjustments, total → total
2. WHEN a line has only accumulated surplus data THEN the system SHALL set adjustments to null and calculate total
3. WHEN a line has only adjustment data THEN the system SHALL set accumulated to null and calculate total
4. WHEN a line is a total line THEN the system SHALL ensure the total field contains the sum
5. WHEN transforming data THEN the system SHALL preserve formatting metadata (isTotal, isSubtotal)

### Requirement 7: Backward Compatibility

**User Story:** As a system administrator, I want to ensure that existing statements and data are not broken by the new format, so that historical reports remain accessible.

#### Acceptance Criteria

1. WHEN the new format is implemented THEN the system SHALL not break existing statement generation for other statement types
2. WHEN processing historical data THEN the system SHALL handle missing column indicators gracefully
3. WHEN the API returns data in the old format THEN the system SHALL provide a fallback transformation
4. WHEN displaying statements THEN the system SHALL only apply the three-column format to NET_ASSETS_CHANGES statement type

### Requirement 8: Remove Fiscal Year Labels from Line Items

**User Story:** As a user viewing the statement, I want line item descriptions to be clean without fiscal year labels like "(2025-2026)", so that the statement is easier to read.

#### Acceptance Criteria

1. WHEN displaying line items THEN the system SHALL not include fiscal year labels in parentheses (e.g., "(2025-2026)")
2. WHEN the template contains fiscal year placeholders THEN the system SHALL remove them from line item descriptions
3. WHEN rendering "Cash and cash equivalent" THEN the system SHALL display it without year suffixes
4. WHEN rendering "Receivables and other financial assets" THEN the system SHALL display it without year suffixes
5. WHEN rendering all adjustment line items THEN the system SHALL display clean descriptions without year labels

### Requirement 9: Opening Balance Calculation from Previous Period Total Net Assets

**User Story:** As a financial accountant, I want the opening balance "Balances as at 30th June {{PREV_YEAR}}" to equal the total net assets from the previous fiscal year's Statement of Financial Position, so that the statements are consistent and accurate across reporting periods.

#### Acceptance Criteria

1. WHEN calculating the opening balance line "Balances as at 30th June {{PREV_YEAR}}" THEN the system SHALL retrieve the total net assets value from the previous fiscal year
2. WHEN the previous fiscal year data is available THEN the system SHALL use the calculationFormula to reference TOTAL_NET_ASSETS from the previous period
3. WHEN displaying the opening balance THEN the system SHALL show the value in the "Accumulated surplus/loss" column
4. WHEN the previous period total net assets is not available THEN the system SHALL display zero or null as appropriate
5. WHEN validating the statement THEN the system SHALL ensure the opening balance matches the previous period's closing net assets balance

### Requirement 10: Closing Balance Calculation for Previous Fiscal Year

**User Story:** As a financial accountant, I want the closing balance "Balance as at 30th June {{CURRENT_YEAR}}" to be calculated as the sum of the opening balance plus all prior year adjustments, so that the statement accurately reflects the cumulative changes in net assets.

#### Acceptance Criteria

1. WHEN calculating "Balance as at 30th June {{CURRENT_YEAR}}" THEN the system SHALL sum the opening balance (BALANCES_JUNE_PREV) plus all adjustment line items
2. WHEN the adjustment line items include Cash and cash equivalent, Receivables, Investments, Payables, Borrowing, and Net surplus/Deficit THEN the system SHALL include all these values in the calculation
3. WHEN displaying the closing balance THEN the system SHALL show the calculated total in the "Total" column
4. WHEN the calculationFormula is defined THEN the system SHALL use: SUM(BALANCES_JUNE_PREV, CASH_EQUIVALENT_PREV_CURRENT, RECEIVABLES_PREV_CURRENT, INVESTMENTS_PREV_CURRENT, PAYABLES_PREV_CURRENT, BORROWING_PREV_CURRENT, NET_SURPLUS_PREV_CURRENT)
5. WHEN validating the statement THEN the system SHALL ensure the closing balance equals opening balance plus all adjustments

### Requirement 11: Carryforward Balance to New Fiscal Year

**User Story:** As a financial accountant, I want the opening balance of the new fiscal year "Balance as at 01st July {{CURRENT_YEAR}}" to equal the closing balance from the previous fiscal year "Balance as at 30th June {{CURRENT_YEAR}}", so that there is continuity between fiscal periods.

#### Acceptance Criteria

1. WHEN calculating "Balance as at 01st July {{CURRENT_YEAR}}" THEN the system SHALL use the value from "Balance as at 30th June {{CURRENT_YEAR}}"
2. WHEN the calculationFormula is defined THEN the system SHALL reference BALANCE_JUNE_CURRENT
3. WHEN displaying the carryforward balance THEN the system SHALL show the value in the "Accumulated surplus/loss" column
4. WHEN validating the statement THEN the system SHALL ensure the July opening balance equals the June closing balance
5. WHEN the June closing balance is not available THEN the system SHALL display zero or null as appropriate

### Requirement 12: Final Closing Balance Calculation for Current Fiscal Year

**User Story:** As a financial accountant, I want the final closing balance "Balance as at {{PERIOD_END_DATE}}" to be calculated as the sum of the current year opening balance plus all current year adjustments, so that the statement accurately reflects the final net assets position.

#### Acceptance Criteria

1. WHEN calculating "Balance as at {{PERIOD_END_DATE}}" THEN the system SHALL sum the opening balance (BALANCE_JULY_CURRENT) plus all current year adjustment line items
2. WHEN the adjustment line items include Cash and cash equivalent, Receivables, Investments, Payables, Borrowing, and Net surplus/Deficit for the current year THEN the system SHALL include all these values in the calculation
3. WHEN displaying the final closing balance THEN the system SHALL show the calculated total in the "Total" column
4. WHEN the calculationFormula is defined THEN the system SHALL use: SUM(BALANCE_JULY_CURRENT, CASH_EQUIVALENT_CURRENT_NEXT, RECEIVABLES_CURRENT_NEXT, INVESTMENTS_CURRENT_NEXT, PAYABLES_CURRENT_NEXT, BORROWING_CURRENT_NEXT, NET_SURPLUS_CURRENT_NEXT)
5. WHEN validating the statement THEN the system SHALL ensure the final closing balance equals the current year opening balance plus all current year adjustments
