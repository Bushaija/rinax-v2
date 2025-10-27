# Requirements Document

## Introduction

This document specifies the requirements for implementing a 3-tier approval workflow for financial reports in the Budget Management System (BMS). The workflow involves three roles: Accountant → Director of Administration and Finance (DAF) → Director General (DG). The system must enforce role-based permissions, track approval history, lock reports during review, and generate final PDF snapshots upon full approval.

## Glossary

- **BMS**: Budget Management System - the application managing financial reports and approvals
- **Accountant**: User role responsible for creating and submitting financial reports
- **DAF**: Director of Administration and Finance - first-level approver
- **DG**: Director General - final approver
- **Financial Report**: A structured document containing financial data for a specific project, facility, and reporting period
- **Workflow Log**: Audit trail recording each action taken on a financial report
- **Locked Report**: A report that cannot be edited due to its current approval state

## Requirements

### Requirement 1: Report Submission

**User Story:** As an Accountant, I want to submit draft financial reports for DAF approval, so that the approval workflow can begin.

#### Acceptance Criteria

1. WHEN the Accountant submits a draft report, THE BMS SHALL update the report status to 'pending_daf_approval'
2. WHEN the Accountant submits a report, THE BMS SHALL record the submission timestamp and submitter ID
3. WHEN the Accountant submits a report, THE BMS SHALL create a workflow log entry with action 'submitted'
4. WHEN the Accountant submits a report, THE BMS SHALL send a notification to users with DAF role
5. WHILE a report has status 'pending_daf_approval', THE BMS SHALL prevent the Accountant from editing the report

### Requirement 2: DAF Approval Actions

**User Story:** As a DAF, I want to approve or reject reports pending my review, so that I can control which reports proceed to DG review.

#### Acceptance Criteria

1. WHEN a DAF approves a pending report, THE BMS SHALL update the report status to 'approved_by_daf'
2. WHEN a DAF approves a report, THE BMS SHALL record the DAF user ID, approval timestamp, and optional comment
3. WHEN a DAF approves a report, THE BMS SHALL create a workflow log entry with action 'daf_approved'
4. WHEN a DAF approves a report, THE BMS SHALL send a notification to users with DG role
5. WHEN a DAF rejects a report, THE BMS SHALL update the report status to 'rejected_by_daf'
6. WHEN a DAF rejects a report, THE BMS SHALL require a rejection comment
7. WHEN a DAF rejects a report, THE BMS SHALL unlock the report for Accountant editing
8. WHEN a DAF rejects a report, THE BMS SHALL send a notification to the report creator

### Requirement 3: DG Final Approval Actions

**User Story:** As a DG, I want to provide final approval or rejection for DAF-approved reports, so that I can authorize financial statements for official use.

#### Acceptance Criteria

1. WHEN a DG approves a DAF-approved report, THE BMS SHALL update the report status to 'fully_approved'
2. WHEN a DG approves a report, THE BMS SHALL record the DG user ID, approval timestamp, and optional comment
3. WHEN a DG approves a report, THE BMS SHALL lock the report permanently
4. WHEN a DG approves a report, THE BMS SHALL generate a PDF snapshot of the report
5. WHEN a DG approves a report, THE BMS SHALL store the PDF URL in the final_pdf_url field
6. WHEN a DG rejects a report, THE BMS SHALL update the report status to 'rejected_by_dg'
7. WHEN a DG rejects a report, THE BMS SHALL require a rejection comment
8. WHEN a DG rejects a report, THE BMS SHALL unlock the report for Accountant editing

### Requirement 4: Role-Based Access Control

**User Story:** As a system administrator, I want the system to enforce role-based permissions on approval actions, so that users can only perform actions appropriate to their role.

#### Acceptance Criteria

1. WHEN an Accountant attempts to submit a report, THE BMS SHALL verify the report status is 'draft' or starts with 'rejected_'
2. WHEN a DAF attempts an approval action, THE BMS SHALL verify the report status is 'pending_daf_approval'
3. WHEN a DG attempts an approval action, THE BMS SHALL verify the report status is 'approved_by_daf'
4. WHEN a user attempts an action without proper role, THE BMS SHALL return an authorization error
5. WHILE a report is locked, THE BMS SHALL prevent all editing operations except by authorized approvers

### Requirement 5: Workflow Audit Trail

**User Story:** As a compliance officer, I want to view the complete approval history for each financial report, so that I can audit the approval process.

#### Acceptance Criteria

1. WHEN any approval action occurs, THE BMS SHALL create a workflow log entry
2. THE BMS SHALL store in each workflow log: report_id, action type, actor_id, comment, and timestamp
3. WHEN a user views a report, THE BMS SHALL display the approval timeline from workflow logs
4. THE BMS SHALL preserve workflow logs even if the report is deleted
5. THE BMS SHALL order workflow logs chronologically by timestamp

### Requirement 6: Report Locking Mechanism

**User Story:** As a DAF, I want reports under my review to be locked from editing, so that the content remains consistent during the approval process.

#### Acceptance Criteria

1. WHEN a report status changes to 'pending_daf_approval', THE BMS SHALL set the locked field to true
2. WHEN a report status changes to 'approved_by_daf', THE BMS SHALL maintain the locked field as true
3. WHEN a report is rejected by DAF or DG, THE BMS SHALL set the locked field to false
4. WHEN a report status is 'fully_approved', THE BMS SHALL set the locked field to true permanently
5. WHILE a report is locked, THE BMS SHALL reject any edit requests with an appropriate error message

### Requirement 7: Client Interface for Accountants

**User Story:** As an Accountant, I want a clear interface showing which reports I can edit and submit, so that I can manage my workflow efficiently.

#### Acceptance Criteria

1. WHEN an Accountant views the reports list, THE BMS SHALL display editable reports (draft or rejected states)
2. WHEN an Accountant views a draft report, THE BMS SHALL display a "Submit for Approval" button
3. WHEN an Accountant views a locked report, THE BMS SHALL disable all edit controls
4. WHEN an Accountant views a rejected report, THE BMS SHALL display the rejection comment prominently
5. THE BMS SHALL display the current approval status for each report

### Requirement 8: Client Interface for DAF

**User Story:** As a DAF, I want a dedicated queue of reports pending my approval, so that I can efficiently review and act on submissions.

#### Acceptance Criteria

1. WHEN a DAF accesses the approval interface, THE BMS SHALL display all reports with status 'pending_daf_approval'
2. WHEN a DAF views a pending report, THE BMS SHALL display "Approve" and "Reject" action buttons
3. WHEN a DAF clicks "Reject", THE BMS SHALL require a mandatory comment before submission
4. WHEN a DAF completes an action, THE BMS SHALL remove the report from the pending queue
5. THE BMS SHALL display the approval timeline for each report in the queue

### Requirement 9: Client Interface for DG

**User Story:** As a DG, I want a dedicated queue of DAF-approved reports awaiting my final approval, so that I can provide executive authorization.

#### Acceptance Criteria

1. WHEN a DG accesses the approval interface, THE BMS SHALL display all reports with status 'approved_by_daf'
2. WHEN a DG views a pending report, THE BMS SHALL display "Final Approve" and "Reject" action buttons
3. WHEN a DG clicks "Reject", THE BMS SHALL require a mandatory comment before submission
4. WHEN a DG views a report, THE BMS SHALL display the DAF approval details and comment
5. THE BMS SHALL display the complete approval timeline including DAF actions

### Requirement 10: PDF Generation

**User Story:** As a DG, I want the system to automatically generate a PDF snapshot when I fully approve a report, so that we have an immutable record of the approved document.

#### Acceptance Criteria

1. WHEN a DG fully approves a report, THE BMS SHALL generate a PDF containing the report data
2. WHEN the PDF is generated, THE BMS SHALL store the file in a secure location
3. WHEN the PDF is stored, THE BMS SHALL update the final_pdf_url field with the file location
4. THE BMS SHALL include approval metadata in the PDF (approver names, dates, comments)
5. WHEN a user views a fully approved report, THE BMS SHALL provide a download link for the PDF
