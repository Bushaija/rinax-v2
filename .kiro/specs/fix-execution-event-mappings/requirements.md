# Requirements Document

## Introduction

This specification addresses critical bugs in the execution event mapping system where total rows and liability activities are incorrectly mapped to the GOODS_SERVICES event due to case-sensitivity issues and inadequate filtering logic. The system currently maps 186 activities to GOODS_SERVICES when only expense line items (B subcategories) should be mapped there, while liability activities should map to PAYABLES and total rows should not be mapped at all.

## Glossary

- **Execution Activity**: A line item in the execution module representing revenue, expense, asset, liability, or equity transactions
- **Event Mapping**: The association between an execution activity and a standardized financial statement event code
- **Total Row**: An activity with `isTotalRow: true` that represents a computed sum of other activities
- **GOODS_SERVICES Event**: A financial statement event code for goods and services expenses
- **PAYABLES Event**: A financial statement event code for outstanding liabilities
- **Fallback Mapping**: The automatic mapping of unmapped activities to GOODS_SERVICES as a default
- **Case-Sensitivity Mismatch**: When activity name matching fails due to differences in letter casing

## Requirements

### Requirement 1: Exclude Total Rows from Event Mappings

**User Story:** As a financial reporting system, I want total rows to be excluded from event mappings, so that only actual transaction line items are mapped to financial statement events.

#### Acceptance Criteria

1. WHEN processing activities for event mapping, THE Mapping System SHALL filter out all activities where `isTotalRow` equals true
2. WHEN an activity has `activityType` ending in "_TOTAL", THE Mapping System SHALL exclude it from event mapping
3. WHEN generating fallback mappings, THE Mapping System SHALL verify that no total rows are included in the unmapped activities list
4. WHEN the mapping process completes, THE Mapping System SHALL ensure zero total rows have event mappings in the database

### Requirement 2: Fix Case-Sensitivity in Payable Activity Mappings

**User Story:** As a data seeder, I want activity name matching to be case-insensitive, so that explicit mappings work correctly regardless of letter casing differences.

#### Acceptance Criteria

1. WHEN matching activity names for explicit mappings, THE Mapping System SHALL perform case-insensitive comparison
2. WHEN an explicit mapping defines `activityName: 'payable 1: salaries'`, THE Mapping System SHALL match activities named "Payable 1: Salaries"
3. WHEN building the activity lookup map, THE Mapping System SHALL normalize activity names to lowercase for key generation
4. WHEN searching for matching activities, THE Mapping System SHALL normalize the mapping definition activity name to lowercase

### Requirement 3: Map All Payable Activities to PAYABLES Event

**User Story:** As a financial statement generator, I want all payable activities to map to the PAYABLES event, so that liabilities are correctly categorized in financial statements.

#### Acceptance Criteria

1. WHEN processing execution activities, THE Mapping System SHALL map all activities with names starting with "Payable" to the PAYABLES event
2. WHEN the mapping completes for HIV project, THE Mapping System SHALL have mapped exactly 13 payable activities per facility type to PAYABLES
3. WHEN the mapping completes for Malaria project, THE Mapping System SHALL have mapped exactly 13 payable activities per facility type to PAYABLES
4. WHEN the mapping completes for TB project, THE Mapping System SHALL have mapped exactly 13 payable activities per facility type to PAYABLES
5. WHEN querying activities mapped to GOODS_SERVICES, THE Mapping System SHALL return zero activities with names starting with "Payable"

### Requirement 4: Validate Mapping Correctness

**User Story:** As a system administrator, I want validation checks after mapping completion, so that I can verify all activities are correctly mapped.

#### Acceptance Criteria

1. WHEN the mapping process completes, THE Mapping System SHALL report the count of activities mapped to each event code
2. WHEN validation runs, THE Mapping System SHALL verify that zero total rows have event mappings
3. WHEN validation runs, THE Mapping System SHALL verify that all payable activities map to PAYABLES event
4. WHEN validation runs, THE Mapping System SHALL verify that only B subcategory expense activities map to GOODS_SERVICES
5. IF validation detects incorrect mappings, THEN THE Mapping System SHALL log detailed error messages with activity IDs and names

### Requirement 5: Preserve Existing Correct Mappings

**User Story:** As a system maintainer, I want existing correct mappings to remain unchanged, so that only the buggy mappings are fixed.

#### Acceptance Criteria

1. WHEN re-running the mapping seeder, THE Mapping System SHALL preserve mappings for "Other Incomes" to OTHER_REVENUE
2. WHEN re-running the mapping seeder, THE Mapping System SHALL preserve mappings for "Transfers from SPIU/RBC" to TRANSFERS_PUBLIC_ENTITIES
3. WHEN re-running the mapping seeder, THE Mapping System SHALL preserve mappings for "Transfer to RBC" to GRANTS_TRANSFERS
4. WHEN re-running the mapping seeder, THE Mapping System SHALL preserve mappings for cash and receivable activities to their respective events
5. WHEN re-running the mapping seeder, THE Mapping System SHALL preserve mappings for equity activities to their respective events

### Requirement 6: Update Fallback Logic

**User Story:** As a mapping system, I want improved fallback logic, so that only appropriate activities receive default GOODS_SERVICES mappings.

#### Acceptance Criteria

1. WHEN filtering for fallback mapping, THE Mapping System SHALL exclude activities where `isTotalRow` is true
2. WHEN filtering for fallback mapping, THE Mapping System SHALL exclude activities where `activityType` contains "TOTAL"
3. WHEN filtering for fallback mapping, THE Mapping System SHALL exclude activities where `activityType` is "COMPUTED"
4. WHEN filtering for fallback mapping, THE Mapping System SHALL exclude activities in categories A, D, E, F, or G
5. WHEN applying fallback mapping, THE Mapping System SHALL only map B subcategory expense activities to GOODS_SERVICES
