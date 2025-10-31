# Requirements Document: District-Based Role Hierarchy and Approval System

## Introduction

This feature implements a district-based role hierarchy system that integrates DAF (Directeur Administratif et Financier) and DG (Directeur Général) roles with facility-based access control. The system enforces approval workflows within district boundaries, where hospital-level DAF and DG users can approve reports from their own facility and all child health centers within the same district. The solution maintains strict data isolation to prevent cross-district data leakage while enabling efficient hierarchical approval processes.

## Glossary

- **System**: The Budget Management System (RINA)
- **DAF**: Directeur Administratif et Financier (Financial and Administrative Director) - First-level approver
- **DG**: Directeur Général (General Director) - Final approver
- **Hospital**: A facility with facility_type = 'hospital' that serves as a district hub
- **Health Center**: A facility with facility_type = 'health_center' that reports to a parent hospital
- **District**: A geographic administrative unit identified by district_id
- **Parent Facility**: A hospital facility that has child health centers (identified by parent_facility_id)
- **Child Facility**: A health center that belongs to a parent hospital
- **Approval Chain**: The sequence of approvals (Accountant → DAF → DG) within a district hierarchy
- **Data Isolation**: Security rule preventing users from accessing data outside their facility scope

## Requirements

### Requirement 1: Role System Enhancement

**User Story:** As a system administrator, I want to assign DAF and DG roles to users at specific facilities, so that approval responsibilities are clearly defined within the organizational hierarchy.

#### Acceptance Criteria

1. WHEN THE System creates or updates a user account, THE System SHALL support assigning role values of 'daf' or 'dg' in addition to existing roles
2. WHEN THE System assigns a DAF or DG role to a user, THE System SHALL require a facilityId to be specified
3. WHERE a user has a DAF or DG role, THE System SHALL store the association between the user, role, and facilityId in the database
4. THE System SHALL validate that DAF and DG roles are only assigned to users at hospital-type facilities
5. THE System SHALL allow a single user to hold multiple roles at the same facility

### Requirement 2: Facility Hierarchy Access Control

**User Story:** As a hospital DAF user, I want to access reports from my hospital and all health centers in my district, so that I can approve consolidated district-level reports.

#### Acceptance Criteria

1. WHEN a user with role 'daf' or 'dg' at a hospital facility requests report data, THE System SHALL return reports from the user's facility and all child facilities where parent_facility_id matches the user's facilityId
2. WHEN a user with role 'accountant' at a health center facility requests report data, THE System SHALL return only reports from the user's own facility
3. WHEN a user with role 'daf' or 'dg' at a hospital facility requests facility lists, THE System SHALL return the user's facility and all health centers with matching parent_facility_id
4. THE System SHALL enforce that all returned facilities share the same district_id as the user's facility
5. IF a user attempts to access data from a facility outside their hierarchy, THEN THE System SHALL return an authorization error with status code 403

### Requirement 3: District-Based Approval Workflow

**User Story:** As a health center accountant, I want my reports to be approved by the hospital DAF and DG in my district, so that the approval chain follows the organizational hierarchy.

#### Acceptance Criteria

1. WHEN an accountant at a health center submits a report for approval, THE System SHALL route the report to DAF users at the parent hospital facility
2. WHEN a DAF user at a hospital approves a report from a child health center, THE System SHALL route the report to DG users at the same hospital facility
3. WHEN a DAF user at a hospital approves a report from their own hospital, THE System SHALL route the report to DG users at the same hospital facility
4. THE System SHALL prevent DAF or DG users from approving reports from facilities outside their district hierarchy
5. WHEN THE System routes reports for approval, THE System SHALL filter eligible approvers by both role and facility hierarchy

### Requirement 4: Data Isolation and Security

**User Story:** As a security administrator, I want to ensure users can only access data within their district hierarchy, so that cross-district data leakage is prevented.

#### Acceptance Criteria

1. WHEN THE System executes any data query for financial reports, THE System SHALL filter results based on the user's facility hierarchy scope
2. WHEN THE System executes any data query for planning data, THE System SHALL filter results based on the user's facility hierarchy scope
3. THE System SHALL validate that all create, update, and delete operations target facilities within the user's hierarchy scope
4. IF a user attempts to modify data for a facility outside their hierarchy, THEN THE System SHALL reject the operation with status code 403
5. THE System SHALL log all authorization failures for security audit purposes

### Requirement 5: Role-Based Permission Matrix

**User Story:** As a system designer, I want clear permission boundaries for each role, so that users have appropriate access levels for their responsibilities.

#### Acceptance Criteria

1. WHEN a user has role 'accountant', THE System SHALL grant permissions to view generated reports, edit planning and execution data, submit reports for approval, and withdraw draft reports
2. WHEN a user has role 'daf', THE System SHALL grant permissions to approve reports, reject reports with comments, view all reports within hierarchy scope, and add approval notes
3. WHEN a user has role 'dg', THE System SHALL grant permissions to finalize approvals, reject reports with comments, and view all reports within hierarchy scope
4. WHEN a user has role 'admin', THE System SHALL grant permissions to manage users, unlock periods, and bypass workflow restrictions
5. THE System SHALL enforce that accountant permissions are limited to the user's own facility, while DAF and DG permissions extend to the full hierarchy scope

### Requirement 6: Approval Workflow State Management

**User Story:** As a DAF user, I want to see only reports that are pending my approval from my district, so that I can efficiently process my approval queue.

#### Acceptance Criteria

1. WHEN a DAF user requests their approval queue, THE System SHALL return reports with status 'pending_daf_approval' from facilities within the user's hierarchy scope
2. WHEN a DG user requests their approval queue, THE System SHALL return reports with status 'approved_by_daf' from facilities within the user's hierarchy scope
3. WHEN THE System displays approval queues, THE System SHALL include facility name and type for each report
4. THE System SHALL order approval queue items by submission date with oldest submissions first
5. WHEN a report is rejected by DAF or DG, THE System SHALL route the report back to the original accountant at the source facility

### Requirement 7: User Management Integration

**User Story:** As an administrator, I want to create DAF and DG users with proper facility assignments, so that the approval hierarchy is correctly configured.

#### Acceptance Criteria

1. WHEN THE System creates a user with role 'daf' or 'dg', THE System SHALL require facilityId to be provided
2. WHEN THE System creates a user with role 'daf' or 'dg', THE System SHALL validate that the specified facilityId corresponds to a hospital-type facility
3. WHEN THE System updates a user's role to 'daf' or 'dg', THE System SHALL validate facility type constraints
4. THE System SHALL allow administrators to view the facility hierarchy when assigning roles
5. WHEN THE System displays user lists, THE System SHALL show the facility name and type for users with DAF or DG roles

### Requirement 8: Audit Trail and Transparency

**User Story:** As a compliance officer, I want to track all approval actions with facility context, so that I can audit the approval chain for each report.

#### Acceptance Criteria

1. WHEN THE System records a workflow action, THE System SHALL include the actor's facilityId and facility name
2. WHEN THE System displays workflow logs, THE System SHALL show the facility hierarchy relationship between report creator and approvers
3. THE System SHALL record the timestamp, actor, action type, facility, and comments for each workflow event
4. WHEN a report is approved by DG, THE System SHALL include the complete approval chain in the generated PDF
5. THE System SHALL maintain immutable workflow logs that cannot be modified after creation

### Requirement 9: Notification Routing

**User Story:** As a DAF user, I want to receive notifications only for reports from facilities in my district, so that I am alerted to relevant approval tasks.

#### Acceptance Criteria

1. WHEN a report is submitted for DAF approval, THE System SHALL send notifications to all DAF users at the parent hospital facility
2. WHEN a report is approved by DAF, THE System SHALL send notifications to all DG users at the same hospital facility
3. WHEN a report is rejected, THE System SHALL send a notification to the accountant who created the report at the source facility
4. THE System SHALL include facility name and district information in notification messages
5. THE System SHALL not send notifications to users outside the relevant district hierarchy

### Requirement 10: Backward Compatibility

**User Story:** As a system maintainer, I want existing accountant and admin roles to continue functioning, so that the system remains operational during the transition.

#### Acceptance Criteria

1. THE System SHALL maintain support for existing 'accountant', 'admin', and 'project_manager' roles
2. WHEN THE System processes requests from users with existing roles, THE System SHALL apply the same permission logic as before the enhancement
3. THE System SHALL allow gradual migration of approval workflows from old to new role structure
4. IF a facility has no assigned DAF or DG users, THEN THE System SHALL fall back to admin-based approval processes
5. THE System SHALL not require data migration for existing user accounts unless roles are being updated
