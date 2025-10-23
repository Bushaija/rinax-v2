# Requirements Document: Cash Flow Beginning Cash Carryforward

## Introduction

This feature implements automatic carryforward of the ending cash balance from the previous fiscal year's cash flow statement to the beginning cash balance of the current fiscal year's cash flow statement. This ensures continuity and consistency across reporting periods and reduces manual data entry errors.

## Requirements

### Requirement 1: Automatic Beginning Cash Calculation

**User Story:** As a district accountant, I want the beginning cash balance for the current period to automatically use the ending cash balance from the previous period, so that I don't have to manually enter it and risk errors.

#### Acceptance Criteria

1. WHEN generating a cash flow statement for a reporting period THEN the system SHALL attempt to retrieve the ending cash balance from the previous period's cash flow statement
2. IF a previous period cash flow statement exists AND has a valid ending cash balance THEN the system SHALL use that value as the beginning cash balance for the current period
3. IF no previous period statement exists OR the previous period's ending cash balance is zero THEN the system SHALL fall back to using the event-mapped beginning cash value from execution data
4. WHEN the carryforward is successful THEN the system SHALL include metadata indicating the source of the beginning cash value (carryforward vs. manual entry)

### Requirement 2: Previous Period Identification

**User Story:** As a system, I need to correctly identify the previous reporting period based on the current period's year and period type, so that I can retrieve the correct ending cash balance.

#### Acceptance Criteria

1. WHEN identifying the previous period THEN the system SHALL consider the period type (ANNUAL, QUARTERLY, MONTHLY)
2. IF the current period is ANNUAL for year 2024 THEN the previous period SHALL be ANNUAL for year 2023
3. IF the current period is QUARTERLY Q1 2024 THEN the previous period SHALL be QUARTERLY Q4 2023
4. IF the current period is MONTHLY January 2024 THEN the previous period SHALL be MONTHLY December 2023
5. IF no previous period exists in the database THEN the system SHALL return null and use fallback logic



### Requirement 3: Facility-Specific Carryforward

**User Story:** As a facility manager, I want the beginning cash carryforward to be specific to my facility, so that my facility's cash flow is tracked independently from other facilities.

#### Acceptance Criteria

1. WHEN retrieving the previous period's ending cash THEN the system SHALL filter by the same facility ID as the current statement
2. IF the current statement is for facility 456 THEN the system SHALL only retrieve ending cash from facility 456's previous period statement
3. IF the current statement is for a district (aggregated facilities) THEN the system SHALL aggregate ending cash from all facilities in that district
4. WHEN multiple facilities are involved THEN the system SHALL sum their individual ending cash balances

### Requirement 4: Project-Specific Carryforward

**User Story:** As a project manager, I want cash flow continuity to be maintained separately for each project (HIV, Malaria, TB), so that project funds are tracked independently.

#### Acceptance Criteria

1. WHEN retrieving the previous period's ending cash THEN the system SHALL filter by the same project type as the current statement
2. IF the current statement is for HIV project THEN the system SHALL only retrieve ending cash from HIV project's previous period statement
3. IF the current statement is for Malaria project THEN the system SHALL only retrieve ending cash from Malaria project's previous period statement
4. WHEN no previous period statement exists for the specific project THEN the system SHALL use fallback logic

### Requirement 5: Validation and Reconciliation

**User Story:** As an accountant, I want to see clear indicators when beginning cash is carried forward versus manually entered, so that I can verify the accuracy of the statement.

#### Acceptance Criteria

1. WHEN beginning cash is carried forward from previous period THEN the system SHALL include metadata with source: "CARRYFORWARD"
2. WHEN beginning cash is from manual entry THEN the system SHALL include metadata with source: "MANUAL_ENTRY"
3. WHEN beginning cash is carried forward THEN the system SHALL include the previous period ID and ending cash amount in metadata
4. IF manually entered beginning cash differs from previous period's ending cash THEN the system SHALL generate a warning message
5. WHEN a warning is generated THEN the warning SHALL include both values and the difference amount



### Requirement 6: Override Capability

**User Story:** As an accountant, I want the ability to override the carried forward beginning cash if I need to make corrections, so that I can handle special circumstances like opening balance adjustments.

#### Acceptance Criteria

1. WHEN execution data contains a CASH_OPENING_BALANCE event with a non-zero amount THEN the system SHALL use that value instead of the carryforward
2. IF the manual entry differs from the carryforward value THEN the system SHALL generate a warning but still use the manual entry
3. WHEN an override is detected THEN the system SHALL include both the carryforward value and the override value in metadata
4. IF the override is intentional (e.g., opening balance adjustment) THEN the user SHALL be able to document the reason in the event metadata

### Requirement 7: Performance and Caching

**User Story:** As a system administrator, I want the carryforward logic to be performant and not significantly slow down statement generation, so that users have a good experience.

#### Acceptance Criteria

1. WHEN retrieving previous period's ending cash THEN the system SHALL use an efficient database query with proper indexing
2. IF the previous period statement has already been generated THEN the system SHALL retrieve the cached ending cash value
3. WHEN generating multiple statements in sequence THEN the system SHALL reuse previous period data where possible
4. IF the previous period statement needs to be generated THEN the system SHALL NOT recursively generate it (to avoid infinite loops)

### Requirement 8: Error Handling

**User Story:** As a developer, I want robust error handling for the carryforward logic, so that statement generation doesn't fail if there are issues with previous period data.

#### Acceptance Criteria

1. IF retrieving previous period data fails THEN the system SHALL log the error and fall back to manual entry
2. IF the previous period statement is corrupted or invalid THEN the system SHALL generate a warning and use fallback logic
3. WHEN an error occurs THEN the system SHALL include error details in the statement metadata
4. IF the database query times out THEN the system SHALL fall back to manual entry within 5 seconds

