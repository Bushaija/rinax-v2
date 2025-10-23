# Requirements Document

## Introduction

The Financial Statement Generation feature enables the creation of standardized financial statements (for donors, management, and government) from both planning (budgeted) and execution (actual) data sources. This feature provides a scalable, template-driven approach to generate various financial statements including Revenue & Expenditure, Balance Sheet, Cash Flow, Net Assets Changes, and Budget vs Actual reports. The system must be flexible enough to support new custom financial statements without requiring core logic changes.

## Requirements

### Requirement 1

**User Story:** As a financial manager, I want to generate standardized financial statements using predefined templates, so that I can produce consistent reports for donors, management, and government stakeholders.

#### Acceptance Criteria

1. WHEN I request a financial statement THEN the system SHALL use the appropriate template based on the statementCode parameter
2. WHEN generating a statement THEN the system SHALL support the following standard statement types: REV_EXP, BAL_SHEET, CASH_FLOW, NET_ASSETS, BUDGET_VS_ACTUAL
3. WHEN processing templates THEN the system SHALL read TemplateLine structure dynamically to build statement rows
4. WHEN a template doesn't exist THEN the system SHALL return an appropriate error message
5. WHEN templates are updated in the database THEN the system SHALL automatically use the updated template without code changes

### Requirement 2

**User Story:** As a program coordinator, I want financial statements to aggregate data from both planning (budgeted) and execution (actual) modules, so that I can compare planned vs actual performance.

#### Acceptance Criteria

1. WHEN generating non-budget statements THEN the system SHALL use execution data only as the primary source
2. WHEN generating BUDGET_VS_ACTUAL statements THEN the system SHALL use both planning and execution data sources
3. WHEN mapping data THEN the system SHALL use EventMappingData to convert activities to standardized event codes
4. WHEN event mappings are missing THEN the system SHALL treat missing values as zero and log warnings
5. WHEN data sources conflict THEN the system SHALL prioritize execution data over planning data for actual values

### Requirement 3

**User Story:** As a financial analyst, I want statements to support formula-based calculations and aggregations, so that computed totals, subtotals, and variance calculations are automatically calculated.

#### Acceptance Criteria

1. WHEN processing formulas THEN the system SHALL support SUM operations across multiple event codes
2. WHEN processing formulas THEN the system SHALL support DIFF operations for variance calculations
3. WHEN processing formulas THEN the system SHALL support computed balances like Assets = Liabilities + Equity
4. WHEN formulas reference other line items THEN the system SHALL resolve dependencies in correct calculation order
5. WHEN formula evaluation fails THEN the system SHALL log the error and return zero for that line item

### Requirement 4

**User Story:** As a district manager, I want financial statements to support multi-period comparisons, so that I can analyze trends and performance over time.

#### Acceptance Criteria

1. WHEN generating statements THEN the system SHALL always include both current and previous period values
2. WHEN previous period data is unavailable THEN the system SHALL show zero values for previous period
3. WHEN calculating variance THEN the system SHALL compute percentage and absolute differences between periods
4. WHEN displaying periods THEN the system SHALL clearly label current vs previous fiscal years or quarters
5. WHEN period boundaries change THEN the system SHALL handle partial period comparisons appropriately

### Requirement 5

**User Story:** As a facility manager, I want to generate statements for specific facilities or aggregate across multiple facilities, so that I can analyze performance at different organizational levels.

#### Acceptance Criteria

1. WHEN facilityId is provided THEN the system SHALL generate statements for that specific facility only
2. WHEN facilityId is omitted THEN the system SHALL aggregate data across all facilities for the specified project
3. WHEN aggregating facilities THEN the system SHALL sum all numeric values across facilities
4. WHEN facilities have different activity structures THEN the system SHALL handle missing activities as zero values
5. WHEN no facilities match the criteria THEN the system SHALL return an empty statement with appropriate messaging

### Requirement 6

**User Story:** As a frontend developer, I want the API to return structured JSON that matches UI rendering requirements, so that I can efficiently display financial statements in tabular format.

#### Acceptance Criteria

1. WHEN returning statement data THEN the system SHALL provide rows with description, note, currentPeriodValue, previousPeriodValue
2. WHEN structuring rows THEN the system SHALL include formatting metadata (bold, subtotal, total, indentation level)
3. WHEN providing metadata THEN the system SHALL include template information, calculation formulas, and validation results
4. WHEN including notes THEN the system SHALL provide footnote references that link to detailed explanations
5. WHEN formatting numbers THEN the system SHALL return numeric values that can be formatted by the frontend

### Requirement 7

**User Story:** As a system administrator, I want the financial statement generation to be performant and handle errors gracefully, so that the system remains reliable under various conditions.

#### Acceptance Criteria

1. WHEN processing large datasets THEN the system SHALL complete statement generation within 60 seconds
2. WHEN database queries fail THEN the system SHALL return appropriate HTTP status codes with error details
3. WHEN template data is corrupted THEN the system SHALL validate templates and return meaningful error messages
4. WHEN event mapping fails THEN the system SHALL continue processing and log mapping failures
5. WHEN memory usage is high THEN the system SHALL implement efficient data processing to prevent memory issues

### Requirement 8

**User Story:** As a financial controller, I want statements to include validation and balance checks, so that I can ensure data integrity and accounting equation compliance.

#### Acceptance Criteria

1. WHEN generating balance sheets THEN the system SHALL validate that Assets = Liabilities + Equity
2. WHEN generating cash flow statements THEN the system SHALL validate that cash flows balance
3. WHEN validation fails THEN the system SHALL include validation results in the response with specific error details
4. WHEN computed totals don't match THEN the system SHALL flag discrepancies and provide reconciliation information
5. WHEN business rules are violated THEN the system SHALL include warnings in the response without blocking generation