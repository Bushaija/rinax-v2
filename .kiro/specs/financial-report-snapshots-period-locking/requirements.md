# Requirements Document

## Introduction

This document specifies the requirements for implementing immutable financial report snapshots and preventing back-dating of approved periods in the Budget Management System (BMS). When a financial report is submitted for approval, the system must capture a snapshot of all underlying planning and execution data, ensuring that historical reports remain accurate even as source data continues to be edited for future periods. This follows standard accounting practices where certified financial statements are frozen while operational data remains editable.

## Glossary

- **BMS**: Budget Management System - the application managing financial reports, planning, and execution data
- **Financial Report**: A structured document containing financial statements for a specific project, facility, and reporting period
- **Snapshot**: An immutable copy of all planning and execution data captured at the moment of report submission
- **Source Data**: The live, editable planning and execution records in the database
- **Certified Report**: A submitted or approved report that uses snapshot data rather than live data
- **Reporting Period**: A defined time interval (e.g., monthly, quarterly) for which financial data is reported
- **Report Version**: A numbered iteration of a report, incremented when source data changes require recertification
- **Back-Dating**: The prohibited practice of modifying historical period data after approval

## Requirements

### Requirement 1: Snapshot Creation on Submission

**User Story:** As an Accountant, I want the system to capture a complete snapshot of all financial data when I submit a report, so that the submitted report reflects the exact state of data at submission time.

#### Acceptance Criteria

1. WHEN an Accountant submits a financial report, THE BMS SHALL capture all planning activity data for the reporting period
2. WHEN an Accountant submits a financial report, THE BMS SHALL capture all execution activity data for the reporting period
3. WHEN an Accountant submits a financial report, THE BMS SHALL capture all computed totals and aggregations
4. WHEN an Accountant submits a financial report, THE BMS SHALL store the snapshot in the report_data field as a JSON structure
5. WHEN the snapshot is created, THE BMS SHALL record the snapshot timestamp in the metadata

### Requirement 2: Snapshot Data Structure

**User Story:** As a system architect, I want snapshots to contain all necessary data for report reconstruction, so that reports can be displayed without querying source tables.

#### Acceptance Criteria

1. THE BMS SHALL include in each snapshot all planning activities with amounts, categories, and line items
2. THE BMS SHALL include in each snapshot all execution activities with amounts, payment details, and cumulative balances
3. THE BMS SHALL include in each snapshot all budget vs actual calculations and variances
4. THE BMS SHALL include in each snapshot all cash flow statement data including opening and closing balances
5. THE BMS SHALL include in each snapshot metadata identifying the source record IDs for audit purposes

### Requirement 3: Display Logic Based on Report Status

**User Story:** As a user viewing financial reports, I want to see live data for draft reports and snapshot data for submitted reports, so that I understand whether I'm viewing certified or working data.

#### Acceptance Criteria

1. WHEN a user views a draft report, THE BMS SHALL compute and display data from live source tables
2. WHEN a user views a submitted report, THE BMS SHALL display data from the report snapshot
3. WHEN a user views an approved report, THE BMS SHALL display data from the report snapshot
4. WHEN a user views a rejected report that has been resubmitted, THE BMS SHALL display data from the most recent snapshot
5. THE BMS SHALL display a visual indicator showing whether the displayed data is live or snapshot-based

### Requirement 4: Source Data Editability

**User Story:** As an Accountant, I want to continue editing planning and execution data after submitting a report, so that I can prepare data for the next reporting period without waiting for approval.

#### Acceptance Criteria

1. WHILE a report is in submitted status, THE BMS SHALL allow editing of source planning data
2. WHILE a report is in submitted status, THE BMS SHALL allow editing of source execution data
3. WHILE a report is in approved status, THE BMS SHALL allow editing of source planning data for future periods
4. WHILE a report is in approved status, THE BMS SHALL allow editing of source execution data for future periods
5. THE BMS SHALL not restrict source data editing based on report approval status

### Requirement 5: Version Control for Data Changes

**User Story:** As a compliance officer, I want the system to track when source data changes after report submission, so that I can identify reports that may need recertification.

#### Acceptance Criteria

1. WHEN source data is modified after report submission, THE BMS SHALL flag the report as potentially outdated
2. WHEN a report is flagged as outdated, THE BMS SHALL display a warning to users viewing the report
3. WHEN an Accountant resubmits a flagged report, THE BMS SHALL increment the version number
4. WHEN a report version is incremented, THE BMS SHALL create a new snapshot with current source data
5. THE BMS SHALL preserve all previous report versions and their snapshots for audit purposes

### Requirement 6: Period Locking for Approved Reports

**User Story:** As a Director of Administration and Finance, I want to prevent back-dating of data in approved reporting periods, so that certified financial statements remain accurate.

#### Acceptance Criteria

1. WHEN a report is fully approved, THE BMS SHALL identify the reporting period as locked
2. WHEN a user attempts to create or edit planning data in a locked period, THE BMS SHALL reject the operation with an error message
3. WHEN a user attempts to create or edit execution data in a locked period, THE BMS SHALL reject the operation with an error message
4. WHEN a user attempts to delete data in a locked period, THE BMS SHALL reject the operation with an error message
5. WHERE administrative override is required, THE BMS SHALL allow users with special permissions to unlock a period with audit logging

### Requirement 7: Period Lock Status Display

**User Story:** As an Accountant, I want to see which reporting periods are locked, so that I know where I can and cannot enter data.

#### Acceptance Criteria

1. WHEN a user views the reporting periods list, THE BMS SHALL display a lock icon for locked periods
2. WHEN a user attempts to edit data in a locked period, THE BMS SHALL display a clear error message explaining the lock
3. WHEN a user views a planning or execution form, THE BMS SHALL disable input fields for locked periods
4. THE BMS SHALL display the lock status prominently in the period selector interface
5. THE BMS SHALL provide a tooltip or help text explaining why a period is locked

### Requirement 8: Snapshot Comparison

**User Story:** As a compliance officer, I want to compare different versions of a report, so that I can understand what data changed between submissions.

#### Acceptance Criteria

1. WHEN a user views a report with multiple versions, THE BMS SHALL display a version history list
2. WHEN a user selects two versions, THE BMS SHALL display a side-by-side comparison
3. THE BMS SHALL highlight differences in amounts, line items, and totals between versions
4. THE BMS SHALL display the timestamp and submitter for each version
5. THE BMS SHALL allow users to download a comparison report showing all changes

### Requirement 9: Audit Trail for Period Unlocking

**User Story:** As a system administrator, I want to log all period unlock operations, so that we have a complete audit trail of exceptions to the locking policy.

#### Acceptance Criteria

1. WHEN an administrator unlocks a reporting period, THE BMS SHALL create an audit log entry
2. THE BMS SHALL record in the audit log the administrator user ID, timestamp, and reason for unlocking
3. WHEN an unlocked period is edited, THE BMS SHALL create audit log entries for all modifications
4. WHEN a period is re-locked, THE BMS SHALL create an audit log entry
5. THE BMS SHALL preserve audit logs indefinitely for compliance purposes

### Requirement 10: Snapshot Integrity Validation

**User Story:** As a system architect, I want to validate snapshot integrity, so that we can detect any data corruption or tampering.

#### Acceptance Criteria

1. WHEN a snapshot is created, THE BMS SHALL compute a checksum of the snapshot data
2. THE BMS SHALL store the checksum in the report metadata
3. WHEN a snapshot is retrieved, THE BMS SHALL verify the checksum matches the stored value
4. IF the checksum validation fails, THE BMS SHALL log a critical error and notify administrators
5. THE BMS SHALL prevent display of reports with failed checksum validation

### Requirement 11: Snapshot Data Completeness

**User Story:** As an Accountant, I want snapshots to include all data needed for financial statements, so that reports display correctly without missing information.

#### Acceptance Criteria

1. THE BMS SHALL include in snapshots all data required for Income Statement generation
2. THE BMS SHALL include in snapshots all data required for Balance Sheet generation
3. THE BMS SHALL include in snapshots all data required for Cash Flow Statement generation
4. THE BMS SHALL include in snapshots all data required for Budget vs Actual Statement generation
5. WHEN a snapshot is missing required data, THE BMS SHALL prevent report submission and display validation errors

### Requirement 12: Performance Optimization for Snapshots

**User Story:** As a system architect, I want snapshot creation and retrieval to be performant, so that users experience minimal delay during submission and viewing.

#### Acceptance Criteria

1. WHEN creating a snapshot, THE BMS SHALL complete the operation within 5 seconds for typical report sizes
2. WHEN retrieving a snapshot for display, THE BMS SHALL load the data within 2 seconds
3. THE BMS SHALL use database indexing to optimize snapshot queries
4. THE BMS SHALL compress snapshot JSON data to reduce storage size
5. WHERE snapshot creation exceeds time limits, THE BMS SHALL process asynchronously and notify the user upon completion
