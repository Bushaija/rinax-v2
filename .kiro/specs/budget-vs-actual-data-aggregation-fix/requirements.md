# Requirements Document

## Introduction

This feature fixes a critical JSON data structure mismatch in the Budget vs Actual statement processor that prevents planning data from appearing in the budget column. Both planning and execution data are stored as JSON, but they have different structures: planning data uses numeric activity IDs as keys (e.g., "236", "237") while execution data uses string activity codes as keys (e.g., "MAL_EXEC_HEALTH_CENTER_A_1"). The current JSON processing logic is designed only for execution data structure, causing planning data aggregation to fail. This fix ensures both JSON data structures can be processed correctly.

## Requirements

### Requirement 1

**User Story:** As a financial analyst, I want budget vs actual statements to display planning data in the budget column correctly, so that I can compare budgeted amounts against actual expenditures.

#### Acceptance Criteria

1. WHEN generating a budget vs actual statement THEN the system SHALL process planning JSON data with numeric activity ID keys (e.g., "236", "237")
2. WHEN planning data exists with total_budget values ($4,625 total for facility 20) THEN the system SHALL aggregate these amounts by event code
3. WHEN planning activities are mapped to `GOODS_SERVICES_PLANNING` event THEN the system SHALL sum the total_budget values for those activities
4. WHEN both planning and execution JSON data exist THEN the system SHALL process both structures and display amounts correctly

### Requirement 2

**User Story:** As a system developer, I want the data aggregation engine to handle both planning and execution JSON data structures seamlessly, so that both data types can be processed without structural changes.

#### Acceptance Criteria

1. WHEN processing planning JSON data THEN the system SHALL handle numeric activity ID keys (e.g., "236") and extract total_budget values
2. WHEN processing execution JSON data THEN the system SHALL continue handling string activity code keys (e.g., "MAL_EXEC_HEALTH_CENTER_A_1") 
3. WHEN planning JSON activities are found THEN the system SHALL map numeric IDs directly to event codes through configurable_event_mappings
4. WHEN aggregation is complete THEN the system SHALL return both planning and execution data keyed by event codes

### Requirement 3

**User Story:** As a database administrator, I want the system to properly query planning data from schema_form_data_entries and link it through configurable_event_mappings to events, so that planning data aggregation is reliable and consistent.

#### Acceptance Criteria

1. WHEN querying planning data THEN the system SHALL join schema_form_data_entries with configurable_event_mappings using entity_id = activity_id
2. WHEN multiple planning activities map to the same event THEN the system SHALL sum all amounts for that event code
3. WHEN planning data queries fail THEN the system SHALL log detailed error information including SQL queries and parameters
4. WHEN event mappings are updated THEN the system SHALL automatically use the updated mappings without requiring code changes

### Requirement 4

**User Story:** As a financial analyst, I want the budget vs actual processor to provide clear error reporting when data aggregation issues occur, so that I can identify and resolve data quality problems.

#### Acceptance Criteria

1. WHEN execution data cannot be aggregated due to missing activity mappings THEN the system SHALL log specific activity codes that failed to resolve
2. WHEN data aggregation completes with warnings THEN the system SHALL include warning counts in the response metadata
3. WHEN aggregation fails completely THEN the system SHALL return a clear error message indicating whether the issue is with planning data, execution data, or both
4. WHEN debugging is enabled THEN the system SHALL provide detailed logs showing the resolution process for each activity code

### Requirement 5

**User Story:** As a system administrator, I want the planning data aggregation fix to be backward compatible with existing functionality, so that other financial statements continue to work without modification.

#### Acceptance Criteria

1. WHEN processing non-budget-vs-actual statements THEN the system SHALL continue using existing aggregation logic unchanged
2. WHEN processing execution-only data THEN the system SHALL continue using existing execution data aggregation
3. WHEN processing planning data THEN the system SHALL use improved planning data collection and aggregation
4. WHEN the system encounters unexpected data structures THEN the system SHALL gracefully fall back to existing behavior and log appropriate warnings

### Requirement 6

**User Story:** As a performance analyst, I want the planning data aggregation process to be efficient and not significantly impact statement generation performance, so that users experience acceptable response times.

#### Acceptance Criteria

1. WHEN collecting planning data THEN the system SHALL use optimized database queries with proper indexing
2. WHEN processing large planning datasets THEN the system SHALL complete aggregation within 5 seconds for up to 1000 planning activities
3. WHEN planning data queries are slow THEN the system SHALL log performance metrics for optimization
4. WHEN memory usage becomes excessive THEN the system SHALL implement appropriate data processing limits