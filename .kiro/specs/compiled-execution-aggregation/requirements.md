# Requirements Document

## Introduction

The Compiled Execution Aggregation feature enables district-level financial reporting by aggregating execution data across multiple health facilities. This feature provides a consolidated view of financial performance across all facilities within a district, program, or reporting period, making it easier for district managers and stakeholders to analyze overall financial execution and identify trends across facilities.

## Requirements

### Requirement 1

**User Story:** As a district manager, I want to view aggregated execution data across all health facilities in my district, so that I can analyze overall financial performance and compare facility performance.

#### Acceptance Criteria

1. WHEN I request a compiled execution report THEN the system SHALL aggregate execution data from all facilities that match the specified filters
2. WHEN aggregating data THEN the system SHALL sum quarterly values (Q1-Q4) for each activity across all facilities
3. WHEN displaying results THEN the system SHALL show each facility as a separate column with totals in the rightmost column
4. WHEN no facilities have execution data THEN the system SHALL return an empty report with appropriate messaging
5. WHEN facilities have missing activities THEN the system SHALL treat missing values as zero for aggregation

### Requirement 2

**User Story:** As a financial analyst, I want to filter compiled execution reports by project type, facility type, and reporting period, so that I can analyze specific program performance across facilities.

#### Acceptance Criteria

1. WHEN I specify a project type filter THEN the system SHALL only include facilities executing that project type
2. WHEN I specify a facility type filter THEN the system SHALL only include facilities of that type (hospital/health_center)
3. WHEN I specify a reporting period THEN the system SHALL only include execution data from that period
4. WHEN I specify multiple filters THEN the system SHALL apply all filters using AND logic
5. WHEN no filters are specified THEN the system SHALL include all available execution data

### Requirement 3

**User Story:** As a program coordinator, I want the compiled report to maintain the hierarchical structure of execution categories (A-G) with subcategories and individual activities, so that I can analyze performance at different levels of detail.

#### Acceptance Criteria

1. WHEN generating the report THEN the system SHALL organize data into sections A through G (Receipts, Expenditures, Surplus/Deficit, Financial Assets, Financial Liabilities, Net Financial Assets, Closing Balance)
2. WHEN displaying section B (Expenditures) THEN the system SHALL group activities by subcategories (B-01 through B-05)
3. WHEN showing activities THEN the system SHALL maintain the display order defined in the activity catalog
4. WHEN calculating section totals THEN the system SHALL sum all activities within that section
5. WHEN calculating subcategory totals THEN the system SHALL sum all activities within that subcategory

### Requirement 4

**User Story:** As a district financial officer, I want computed values (Surplus/Deficit, Net Financial Assets) to be automatically calculated in the compiled report, so that I can verify financial balance across all facilities.

#### Acceptance Criteria

1. WHEN calculating Surplus/Deficit (C) THEN the system SHALL compute C = A - B for each facility and the total
2. WHEN calculating Net Financial Assets (F) THEN the system SHALL compute F = D - E for each facility and the total
3. WHEN displaying computed values THEN the system SHALL clearly indicate which values are calculated vs. entered
4. WHEN facilities have unbalanced data THEN the system SHALL still include them in aggregation but flag balance issues
5. WHEN all facilities are balanced THEN the system SHALL indicate overall balance status

### Requirement 5

**User Story:** As a system administrator, I want the compiled execution endpoint to handle large datasets efficiently and provide appropriate error handling, so that the system remains performant and reliable.

#### Acceptance Criteria

1. WHEN processing large numbers of facilities THEN the system SHALL complete requests within 30 seconds
2. WHEN database queries fail THEN the system SHALL return appropriate error messages with HTTP status codes
3. WHEN no execution data exists for the filters THEN the system SHALL return a 200 status with empty data and explanatory message
4. WHEN invalid filter parameters are provided THEN the system SHALL return a 400 status with validation errors
5. WHEN the system encounters unexpected errors THEN the system SHALL log errors and return a 500 status with generic error message

### Requirement 6

**User Story:** As a frontend developer, I want the compiled execution API response to be structured for easy UI rendering, so that I can efficiently display the data in tables and charts.

#### Acceptance Criteria

1. WHEN returning aggregated data THEN the system SHALL provide a structured response with facilities as columns and activities as rows
2. WHEN structuring the response THEN the system SHALL include metadata about facilities, reporting periods, and aggregation parameters
3. WHEN providing activity data THEN the system SHALL include activity codes, names, display order, and computed status
4. WHEN returning facility data THEN the system SHALL include facility names, types, and identifiers
5. WHEN including totals THEN the system SHALL provide both individual facility totals and grand totals across all facilities