# Requirements Document

## Introduction

There is a critical state management bug in the planning module where draft data is being shared across different reporting periods. When a user creates planning data for `reportingPeriodId=2`, the same draft data appears when they navigate to `reportingPeriodId=1` for the same facility and program. This occurs because the localStorage storage key does not include the `reportingPeriodId`, causing data collision between different reporting periods.

The issue manifests in the following URLs showing the same draft data:
- `http://localhost:3000/dashboard/planning/new?projectType=HIV&facilityId=23&facilityType=health_center&facilityName=rutare&program=1&reportingPeriodId=2`
- `http://localhost:3000/dashboard/planning/new?projectType=HIV&facilityId=23&facilityType=health_center&facilityName=rutare&program=1&reportingPeriodId=1`

This fix will ensure that draft and auto-save data is properly isolated per reporting period.

## Requirements

### Requirement 1: Include Reporting Period in Storage Key

**User Story:** As a user creating planning data, I want my draft data to be specific to each reporting period, so that data from one period doesn't appear when I'm working on a different period.

#### Acceptance Criteria

1. WHEN the storage key is constructed THEN it SHALL include the `reportingPeriodId` parameter
2. WHEN draft data is saved THEN the storage key SHALL be in the format `${projectType}_${facilityType}_${projectId}_${facilityId}_${reportingPeriodId}`
3. WHEN auto-save data is saved THEN the storage key SHALL include the `reportingPeriodId` to ensure isolation
4. WHEN a user switches between different reporting periods THEN each period SHALL have its own separate draft storage

### Requirement 2: Maintain Backward Compatibility

**User Story:** As a user with existing draft data, I want my drafts to still be accessible after the fix is deployed, so that I don't lose any work in progress.

#### Acceptance Criteria

1. WHEN the component loads THEN it SHALL attempt to load drafts using the new key format first
2. IF no draft exists with the new key format THEN the system SHALL attempt to load using the old key format (without `reportingPeriodId`)
3. WHEN a draft is loaded using the old key format THEN it SHALL be migrated to the new key format
4. WHEN migration occurs THEN the old draft SHALL be removed from localStorage to prevent confusion

### Requirement 3: Update All Storage Operations

**User Story:** As a developer, I want all storage operations to consistently use the reporting period in the key, so that there are no edge cases where data leaks between periods.

#### Acceptance Criteria

1. WHEN `saveDraft` is called THEN it SHALL use the storage key with `reportingPeriodId`
2. WHEN `loadDraft` is called THEN it SHALL use the storage key with `reportingPeriodId`
3. WHEN `autoSave` is called THEN it SHALL use the storage key with `reportingPeriodId`
4. WHEN `loadAutoSave` is called THEN it SHALL use the storage key with `reportingPeriodId`
5. WHEN `removeDraft` is called THEN it SHALL use the storage key with `reportingPeriodId`
6. WHEN the component unmounts or navigates away THEN cleanup SHALL use the correct storage key

### Requirement 4: Validate Reporting Period ID

**User Story:** As a developer, I want to ensure that the reporting period ID is always available when constructing storage keys, so that the system doesn't fail silently.

#### Acceptance Criteria

1. WHEN constructing a storage key THEN the `reportingPeriodId` SHALL be validated to ensure it's a valid number
2. IF `reportingPeriodId` is null or undefined THEN the system SHALL use a default value (e.g., 1) and log a warning
3. WHEN the page component passes `reportingPeriodId` to the form THEN it SHALL ensure the value is properly parsed from the URL parameter
4. WHEN the form component receives `reportingPeriodId` THEN it SHALL validate it before using it in storage operations

### Requirement 5: Test Data Isolation

**User Story:** As a QA tester, I want to verify that draft data is properly isolated between reporting periods, so that I can confirm the bug is fixed.

#### Acceptance Criteria

1. WHEN a user creates draft data for `reportingPeriodId=1` THEN navigating to `reportingPeriodId=2` SHALL show empty/default data
2. WHEN a user creates draft data for `reportingPeriodId=2` THEN navigating back to `reportingPeriodId=1` SHALL show the data specific to period 1
3. WHEN a user saves draft data for multiple reporting periods THEN each period SHALL maintain its own independent draft
4. WHEN localStorage is inspected THEN there SHALL be separate entries for each reporting period with distinct keys
