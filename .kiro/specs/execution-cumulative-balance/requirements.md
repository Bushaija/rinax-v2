# Requirements Document

## Introduction

The Execution Cumulative Balance feature enhances the execution data model by adding cumulative balance calculations to activity items. This feature implements different calculation strategies based on the financial nature of each section: flow-based sections (A, B, C, F) use cumulative sums across all quarters, while stock-based sections (D, E) use the latest non-zero quarter value to represent the current balance. This distinction ensures accurate financial reporting that aligns with accounting principles where income/expense items accumulate over time, while asset/liability items represent point-in-time balances.

## Requirements

### Requirement 1

**User Story:** As a financial accountant, I want flow-based sections (Receipts, Expenditures, Surplus/Deficit, Net Financial Assets) to calculate cumulative balances as the sum of all quarters, so that I can track total financial flows over the reporting period.

#### Acceptance Criteria

1. WHEN saving execution data for Section A (Receipts) activities THEN the system SHALL calculate cumulative_balance as the sum of q1 + q2 + q3 + q4
2. WHEN saving execution data for Section B (Expenditures) activities THEN the system SHALL calculate cumulative_balance as the sum of q1 + q2 + q3 + q4
3. WHEN saving execution data for Section C (Surplus/Deficit) THEN the system SHALL calculate cumulative_balance as the sum of q1 + q2 + q3 + q4
4. WHEN saving execution data for Section F (Net Financial Assets) THEN the system SHALL calculate cumulative_balance as the sum of q1 + q2 + q3 + q4
5. WHEN any quarter value is missing or zero THEN the system SHALL treat it as zero in the cumulative sum calculation

### Requirement 2

**User Story:** As a financial accountant, I want stock-based sections (Financial Assets, Financial Liabilities) to use the latest quarter value as the cumulative balance, so that I can accurately represent current asset and liability positions.

#### Acceptance Criteria

1. WHEN saving execution data for Section D (Financial Assets) activities THEN the system SHALL set cumulative_balance to the value of the latest quarter with data (q4 > q3 > q2 > q1)
2. WHEN saving execution data for Section E (Financial Liabilities) activities THEN the system SHALL set cumulative_balance to the value of the latest quarter with data (q4 > q3 > q2 > q1)
3. WHEN determining the latest quarter THEN the system SHALL check quarters in reverse order (q4, q3, q2, q1) and use the first defined value (including explicit zero)
4. WHEN a quarter has an explicit zero value THEN the system SHALL treat it as meaningful data representing "no balance remaining"
5. WHEN a quarter is undefined or null THEN the system SHALL treat it as "no data entered" and check the previous quarter
6. WHEN the latest quarter with data is explicitly zero THEN the system SHALL set cumulative_balance to 0 (not undefined)
7. WHEN all quarters are undefined or null THEN the system SHALL set cumulative_balance to undefined
8. WHEN displaying cumulative_balance of 0 THEN the UI SHALL show "0" (not a dash)
9. WHEN displaying cumulative_balance of undefined THEN the UI SHALL show "-" (dash)

### Requirement 3

**User Story:** As a system developer, I want the cumulative_balance attribute to be automatically calculated and stored in the formData.activities array during create and update operations, so that the data is consistently available for reporting and validation.

#### Acceptance Criteria

1. WHEN creating a new execution entry THEN the system SHALL calculate and add cumulative_balance to each activity item before saving
2. WHEN updating an existing execution entry THEN the system SHALL recalculate cumulative_balance for all activity items before saving
3. WHEN storing activities THEN the system SHALL preserve the cumulative_balance attribute in the formData.activities array
4. WHEN activities are stored as an object (keyed by code) THEN the system SHALL calculate cumulative_balance for each activity value
5. WHEN activities are stored as an array THEN the system SHALL calculate cumulative_balance for each array element

### Requirement 4

**User Story:** As a financial analyst, I want Section G (Closing Balance) activities to follow the same calculation rules as their financial nature, so that opening balances and accumulated funds are properly represented.

#### Acceptance Criteria

1. WHEN saving Section G activities that represent accumulated balances THEN the system SHALL use cumulative sum calculation (q1 + q2 + q3 + q4)
2. WHEN Section G includes the computed "Surplus/Deficit of the Period" item THEN the system SHALL calculate its cumulative_balance using the cumulative sum approach
3. WHEN Section G activities represent point-in-time balances THEN the system SHALL use the latest quarter approach
4. WHEN the activity code or name indicates it's a flow item THEN the system SHALL apply cumulative sum logic
5. WHEN the activity code or name indicates it's a stock item THEN the system SHALL apply latest quarter logic

### Requirement 5

**User Story:** As a data consumer, I want the cumulative_balance attribute to be included in all API responses that return execution data, so that I can use these values for reporting and analysis without recalculating.

#### Acceptance Criteria

1. WHEN the getOne endpoint returns execution data THEN the response SHALL include cumulative_balance for each activity in the UI structure
2. WHEN the list endpoint returns execution entries THEN each entry SHALL include cumulative_balance in the formData.activities
3. WHEN the checkExisting endpoint returns execution data THEN the response SHALL include cumulative_balance for each activity
4. WHEN the compiled endpoint aggregates execution data THEN the system SHALL use cumulative_balance values for aggregation
5. WHEN exporting execution data THEN the export SHALL include cumulative_balance values in the output

### Requirement 6

**User Story:** As a financial controller, I want the system to validate that cumulative_balance calculations are correct during save operations, so that I can trust the accuracy of stored financial data.

#### Acceptance Criteria

1. WHEN calculating cumulative_balance for flow sections THEN the system SHALL verify the sum equals q1 + q2 + q3 + q4
2. WHEN calculating cumulative_balance for stock sections THEN the system SHALL verify it matches the latest non-zero quarter
3. WHEN validation detects incorrect cumulative_balance values THEN the system SHALL log a warning but continue processing
4. WHEN debugging is enabled THEN the system SHALL include cumulative_balance calculation details in logs
5. WHEN cumulative_balance is manually provided in the request THEN the system SHALL override it with the calculated value

### Requirement 7

**User Story:** As a system administrator, I want the cumulative_balance calculation logic to be centralized and reusable, so that it can be consistently applied across all execution data operations.

#### Acceptance Criteria

1. WHEN implementing cumulative_balance logic THEN the system SHALL create a helper function in execution.helpers.ts
2. WHEN the helper function is called THEN it SHALL accept an activity object and return the activity with cumulative_balance added
3. WHEN the helper function processes activities THEN it SHALL determine the section from the activity code
4. WHEN the helper function encounters unknown sections THEN it SHALL default to cumulative sum calculation
5. WHEN the helper function is updated THEN all create, update, and read operations SHALL automatically use the new logic

### Requirement 8

**User Story:** As a financial manager, I want existing execution data to be compatible with the new cumulative_balance attribute, so that historical data remains accessible and can be migrated if needed.

#### Acceptance Criteria

1. WHEN reading execution data without cumulative_balance THEN the system SHALL calculate it on-the-fly for API responses
2. WHEN displaying legacy data THEN the system SHALL compute cumulative_balance dynamically without modifying stored data
3. WHEN updating legacy execution entries THEN the system SHALL add cumulative_balance to all activities during the update
4. WHEN a data migration is performed THEN the system SHALL provide a script to add cumulative_balance to all existing entries
5. WHEN cumulative_balance is missing from an activity THEN the system SHALL not fail but calculate it as needed

### Requirement 9

**User Story:** As a financial accountant, I want the UI to display cumulative balance values appropriately based on section type, so that I can distinguish between "no activity" in flow sections and "no balance" in stock sections.

#### Acceptance Criteria

1. WHEN displaying cumulative_balance for stock sections (D, E) with value 0 THEN the UI SHALL show "0" to indicate zero balance
2. WHEN displaying cumulative_balance for stock sections (D, E) with undefined value THEN the UI SHALL show "—" (em dash) to indicate no data
3. WHEN displaying cumulative_balance for flow sections (A, B, C, F, G) with value 0 THEN the UI SHALL show "—" (em dash) to indicate no activity
4. WHEN displaying cumulative_balance for flow sections (A, B, C, F, G) with undefined value THEN the UI SHALL show "—" (em dash) to indicate no data
5. WHEN displaying cumulative_balance for flow sections (A, B, C, F, G) with non-zero value THEN the UI SHALL show the formatted number
6. WHEN displaying cumulative_balance for stock sections (D, E) with non-zero value THEN the UI SHALL show the formatted number
