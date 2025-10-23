# Requirements Document

## Introduction

This feature enhances the existing `getExecution` facilities handler to support reporting period-specific facility filtering and quarter discovery functionality. Currently, the handler only works with a single quarter at a time and lacks reporting period integration. This enhancement adds reportingPeriod as a query parameter and provides better visibility of execution status across quarters, allowing users to discover which quarters are available for execution and properly scope execution data within reporting periods.

## Requirements

### Requirement 1

**User Story:** As a health program manager, I want to filter execution facilities by reporting period, so that I can manage facility executions within specific annual cycles without interference from other reporting periods.

#### Acceptance Criteria

1. WHEN I request execution facilities with a reportingPeriodId THEN the system SHALL only consider planning and execution data within that specific reporting period
2. WHEN I request execution facilities with a reportingPeriodId THEN the system SHALL exclude facilities that were executed in the same quarter within that reporting period
3. WHEN I provide an invalid reportingPeriodId THEN the system SHALL return a 400 Bad Request error with an appropriate message
4. WHEN I omit the reportingPeriodId parameter THEN the system SHALL return a 400 Bad Request error indicating the parameter is required

### Requirement 2

**User Story:** As a health program coordinator, I want to discover which quarters are available for execution for specific facilities, so that I can plan execution activities across different quarters efficiently.

#### Acceptance Criteria

1. WHEN I request execution facilities without specifying a quarter THEN the system SHALL return facilities with their available quarters for execution
2. WHEN I request execution facilities for a specific quarter THEN the system SHALL return only facilities available for that quarter
3. WHEN a facility has been executed for Q1 but not Q2-Q4 THEN the system SHALL show Q2, Q3, Q4 as available quarters for that facility
4. WHEN a facility has been executed for all quarters THEN the system SHALL not include that facility in the available facilities list

### Requirement 3

**User Story:** As a system administrator, I want the API to validate reporting period parameters for execution requests, so that only valid and active reporting periods can be used for facility execution.

#### Acceptance Criteria

1. WHEN I provide a reportingPeriodId that doesn't exist THEN the system SHALL return a 400 Bad Request error
2. WHEN I provide a reportingPeriodId for a CLOSED reporting period THEN the system SHALL return a 400 Bad Request error with message indicating closed periods cannot be used for execution
3. WHEN I provide a reportingPeriodId for an INACTIVE reporting period THEN the system SHALL return a 400 Bad Request error with message indicating inactive periods cannot be used for execution
4. WHEN I provide a reportingPeriodId for an ACTIVE reporting period THEN the system SHALL process the request normally

### Requirement 4

**User Story:** As a developer integrating with the API, I want the response format to include reporting period and quarter information, so that I can understand the scope and availability of execution data.

#### Acceptance Criteria

1. WHEN I successfully request execution facilities THEN the response SHALL include the reportingPeriodId in the response body
2. WHEN I request facilities without specifying a quarter THEN the response SHALL include available quarters for each facility
3. WHEN I request facilities for a specific quarter THEN the response SHALL include the requested quarter information
4. WHEN I successfully request execution facilities THEN the response SHALL maintain backward compatibility with existing facility information (id, name)

### Requirement 5

**User Story:** As a health program planner, I want the TB program business rule to continue working with reporting periods and quarter discovery, so that TB programs still require hospital facility types regardless of the reporting period or quarter.

#### Acceptance Criteria

1. WHEN I request TB program facilities with health_center facility type THEN the system SHALL return a 400 Bad Request error regardless of the reporting period or quarter
2. WHEN I request TB program facilities with hospital facility type and valid reporting period THEN the system SHALL process the request normally
3. WHEN I request non-TB program facilities with any valid facility type, reporting period, and quarter THEN the system SHALL process the request normally

### Requirement 6

**User Story:** As a health program coordinator, I want to understand cross-quarter execution status, so that I can see which facilities can be executed in different quarters within the same reporting period.

#### Acceptance Criteria

1. WHEN a facility has planning data in a reporting period THEN it SHALL be eligible for execution in any quarter within that reporting period
2. WHEN a facility has been executed for Q1 in a reporting period THEN it SHALL still be available for execution in Q2, Q3, Q4 within the same reporting period
3. WHEN a facility has been executed for multiple quarters THEN it SHALL only be excluded from quarters where it has already been executed
4. WHEN no quarter is specified in the request THEN the system SHALL return all available quarters for each eligible facility