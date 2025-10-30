# Requirements Document

## Introduction

This document specifies the requirements for adding a status information sidebar to financial statement pages (Balance Sheet and Revenue & Expenditure). The sidebar will display key workflow information including report status, creation date, approval details, and action buttons for accountants to submit reports for approval.

## Glossary

- **Financial Statement Page**: The client-side pages displaying Balance Sheet or Revenue & Expenditure reports
- **Status Sidebar**: A visual component displaying report metadata and workflow status
- **Report Status**: The current state of the financial report in the approval workflow (draft, pending_daf_approval, approved_by_daf, etc.)
- **Accountant**: User role responsible for creating and submitting financial reports
- **DAF**: Director of Administration and Finance - first-level approver

## Requirements

### Requirement 1: Status Sidebar Display

**User Story:** As an Accountant viewing a financial statement, I want to see a status sidebar beside the statement, so that I can quickly understand the report's current state and approval progress.

#### Acceptance Criteria

1. WHEN an Accountant views a financial statement page, THE BMS SHALL display a status sidebar adjacent to the statement
2. THE BMS SHALL display the current report status with appropriate visual styling in the sidebar
3. THE BMS SHALL display the report creation date in the sidebar
4. WHEN a report has been approved by DAF, THE BMS SHALL display the DAF approver name and approval date in the sidebar
5. THE BMS SHALL position the sidebar to remain visible while viewing the statement

### Requirement 2: Status Badge Visualization

**User Story:** As an Accountant, I want to see a color-coded status badge, so that I can quickly identify the report's approval state at a glance.

#### Acceptance Criteria

1. THE BMS SHALL display a status badge with the current report status text
2. WHEN the report status is 'draft', THE BMS SHALL display the badge with gray styling
3. WHEN the report status is 'pending_daf_approval', THE BMS SHALL display the badge with yellow/amber styling
4. WHEN the report status is 'approved_by_daf', THE BMS SHALL display the badge with blue styling
5. WHEN the report status is 'fully_approved', THE BMS SHALL display the badge with green styling
6. WHEN the report status is 'rejected_by_daf' or 'rejected_by_dg', THE BMS SHALL display the badge with red styling

### Requirement 3: Submit for Approval Action

**User Story:** As an Accountant, I want to submit draft reports for approval directly from the statement page, so that I can initiate the approval workflow without navigating away.

#### Acceptance Criteria

1. WHEN the report status is 'draft', THE BMS SHALL display a "Submit for Approval" button in the sidebar
2. WHEN the report status is 'rejected_by_daf' or 'rejected_by_dg', THE BMS SHALL display a "Resubmit for Approval" button in the sidebar
3. WHEN the Accountant clicks the submit button, THE BMS SHALL call the submit API endpoint
4. WHEN the submission is successful, THE BMS SHALL update the displayed status to 'pending_daf_approval'
5. WHEN the submission fails, THE BMS SHALL display an error message to the user
6. WHILE the submission is in progress, THE BMS SHALL disable the submit button and show a loading indicator

### Requirement 4: Approval Information Display

**User Story:** As an Accountant, I want to see who approved my report and when, so that I can track the approval progress.

#### Acceptance Criteria

1. WHEN a report has been approved by DAF, THE BMS SHALL display "Approved by: [DAF Name]" in the sidebar
2. WHEN a report has been approved by DAF, THE BMS SHALL display the approval date in a readable format
3. WHEN a report has not been approved yet, THE BMS SHALL display "Not yet approved" or hide the approval section
4. WHEN a report has been rejected, THE BMS SHALL display "Rejected by: [Approver Name]" in the sidebar
5. THE BMS SHALL format dates in a consistent, user-friendly format (e.g., "Jan 15, 2025")

### Requirement 5: Report Metadata Display

**User Story:** As an Accountant, I want to see when the report was created, so that I can track report age and submission timelines.

#### Acceptance Criteria

1. THE BMS SHALL display "Created: [Date]" in the sidebar
2. THE BMS SHALL format the creation date consistently with other dates in the sidebar
3. WHEN the report was created by a specific user, THE BMS SHALL display "Created by: [User Name]"
4. THE BMS SHALL display the creation information prominently in the sidebar
5. THE BMS SHALL ensure creation date is always visible regardless of report status

### Requirement 6: Responsive Layout Integration

**User Story:** As an Accountant, I want the status sidebar to integrate seamlessly with the statement layout, so that both the statement and status information are easily viewable.

#### Acceptance Criteria

1. THE BMS SHALL position the status sidebar beside the financial statement without overlapping
2. THE BMS SHALL ensure the sidebar has appropriate spacing and padding for readability
3. THE BMS SHALL style the sidebar to visually distinguish it from the statement content
4. THE BMS SHALL ensure the sidebar is visible on standard desktop screen sizes
5. THE BMS SHALL maintain consistent sidebar styling across Balance Sheet and Revenue & Expenditure pages

### Requirement 7: Real-time Status Updates

**User Story:** As an Accountant, I want the sidebar to reflect the current report status after I submit it, so that I can confirm my action was successful.

#### Acceptance Criteria

1. WHEN the Accountant submits a report, THE BMS SHALL update the status badge immediately upon success
2. WHEN the status changes, THE BMS SHALL hide the submit button
3. WHEN the status changes, THE BMS SHALL update any status-dependent information in the sidebar
4. THE BMS SHALL display a success message when the report is submitted successfully
5. THE BMS SHALL refresh the sidebar data to reflect the latest report state

### Requirement 8: Multi-Project Support

**User Story:** As an Accountant, I want the status sidebar to show information for the currently selected project tab, so that I can see status for each project independently.

#### Acceptance Criteria

1. WHEN the Accountant switches between project tabs (HIV, Malaria, TB), THE BMS SHALL update the sidebar to show the selected project's report status
2. THE BMS SHALL fetch report metadata for each project independently
3. THE BMS SHALL display appropriate loading states while fetching report data for a new project
4. WHEN a project's report does not exist, THE BMS SHALL display an appropriate message in the sidebar
5. THE BMS SHALL maintain sidebar visibility when switching between project tabs
