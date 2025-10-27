# Requirements Document

## Introduction

The Planning Approval Workflow Client Integration feature enables users to interact with the approval workflow through the client application. This feature provides UI components and interactions for planners to submit plans for approval and for admins to review, approve, or reject plans. The implementation focuses on role-based UI rendering, user-friendly interactions, and clear feedback mechanisms.

## Glossary

- **Client Application**: The React-based frontend application that users interact with
- **Planning Table**: The data table component displaying the list of planning entries
- **Planning Details Page**: The detailed view page showing complete information for a single planning entry
- **Planner Role**: User role (accountant) authorized to create and submit plans for approval
- **Admin Role**: User role (admin/superadmin) authorized to review and approve/reject plans
- **Approval Actions**: UI controls that trigger approval workflow operations (submit, approve, reject)
- **API Client**: The service layer that communicates with backend approval endpoints
- **Approval Status Badge**: Visual indicator showing the current approval status of a plan

## Requirements

### Requirement 1

**User Story:** As a Planner, I want to submit one or more plans for approval from the planning table, so that I can efficiently request review of multiple plans at once.

#### Acceptance Criteria

1. WHEN a Planner selects one or more plans with DRAFT status, THE Client Application SHALL display a "Submit for Approval" action button
2. WHEN a Planner clicks the "Submit for Approval" button, THE Client Application SHALL send a request to POST /api/planning/submit-for-approval with selected plan IDs
3. WHEN the submission succeeds, THE Client Application SHALL display a success message indicating the number of plans submitted
4. WHEN the submission fails, THE Client Application SHALL display an error message with failure details
5. THE Client Application SHALL refresh the planning table to reflect updated approval statuses after successful submission

### Requirement 2

**User Story:** As an Admin, I want to approve or reject individual plans from the planning table actions menu, so that I can quickly review plans without navigating to detail pages.

#### Acceptance Criteria

1. WHEN an Admin views the planning table, THE Client Application SHALL display "Approve" and "Reject" options in the actions dropdown for plans with PENDING status
2. WHEN an Admin clicks "Approve", THE Client Application SHALL display a confirmation dialog with optional comments field
3. WHEN an Admin clicks "Reject", THE Client Application SHALL display a dialog requiring comments for the rejection
4. WHEN an Admin confirms the action, THE Client Application SHALL send a request to POST /api/planning/approve with the plan ID, action, and comments
5. THE Client Application SHALL update the table row to reflect the new approval status after successful action

### Requirement 3

**User Story:** As an Admin, I want to review and approve or reject plans from the planning details page, so that I can make informed decisions after viewing complete plan information.

#### Acceptance Criteria

1. WHEN an Admin views a plan details page with PENDING status, THE Client Application SHALL display prominent "Approve" and "Reject" action buttons
2. THE Client Application SHALL display the current approval status, reviewer information, and review comments if available
3. WHEN an Admin clicks an approval action button, THE Client Application SHALL display a dialog for confirmation and comments
4. WHEN the approval action succeeds, THE Client Application SHALL update the page to show the new approval status and reviewer details
5. THE Client Application SHALL disable approval action buttons for plans that are already approved or rejected

### Requirement 4

**User Story:** As a User, I want to see clear visual indicators of approval status throughout the application, so that I can quickly identify which plans require action or have been processed.

#### Acceptance Criteria

1. THE Client Application SHALL display approval status badges in the planning table with distinct colors for each status (DRAFT, PENDING, APPROVED, REJECTED)
2. THE Client Application SHALL show approval status prominently on the planning details page
3. WHEN a plan is PENDING, THE Client Application SHALL use a warning color (yellow/amber) for the status badge
4. WHEN a plan is APPROVED, THE Client Application SHALL use a success color (green) for the status badge
5. WHEN a plan is REJECTED, THE Client Application SHALL use a destructive color (red) for the status badge

### Requirement 5

**User Story:** As a User, I want approval actions to be role-based, so that I only see actions I am authorized to perform.

#### Acceptance Criteria

1. THE Client Application SHALL hide "Submit for Approval" actions from users without Planner role
2. THE Client Application SHALL hide "Approve" and "Reject" actions from users without Admin role
3. THE Client Application SHALL validate user permissions before displaying approval action buttons
4. THE Client Application SHALL handle permission errors gracefully with appropriate error messages
5. THE Client Application SHALL use the current user's role information to determine visible actions

### Requirement 6

**User Story:** As a Developer, I want a reusable API client service for approval endpoints, so that approval functionality can be consistently integrated across different components.

#### Acceptance Criteria

1. THE Client Application SHALL provide a typed API client function for POST /api/planning/submit-for-approval
2. THE Client Application SHALL provide a typed API client function for POST /api/planning/approve
3. THE Client Application SHALL provide a typed API client function for POST /api/planning/review
4. THE Client Application SHALL handle request/response serialization and error handling in the API client
5. THE Client Application SHALL export TypeScript types for all approval-related request and response schemas

### Requirement 7

**User Story:** As a User, I want clear feedback during approval operations, so that I understand the system is processing my request and know the outcome.

#### Acceptance Criteria

1. WHEN a User initiates an approval action, THE Client Application SHALL display a loading indicator
2. WHEN an approval action succeeds, THE Client Application SHALL display a success toast notification with a descriptive message
3. WHEN an approval action fails, THE Client Application SHALL display an error toast notification with the error message
4. THE Client Application SHALL disable action buttons during processing to prevent duplicate submissions
5. THE Client Application SHALL re-enable action buttons after the operation completes or fails
