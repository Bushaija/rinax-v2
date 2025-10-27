# Implementation Plan

- [x] 1. Set up API client layer for approval endpoints





  - Create planning-approval.ts module in api-client package with typed functions
  - Implement submitForApproval function for bulk submission
  - Implement approvePlanning function for approval/rejection actions
  - Implement reviewPlanning function as alternative approval endpoint
  - Export TypeScript types for request/response schemas
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Create shared approval UI components






- [x] 2.1 Implement ApprovalStatusBadge component

  - Create component with status-based styling (DRAFT, PENDING, APPROVED, REJECTED)
  - Define color variants for each status (gray, yellow, green, red)
  - Add proper accessibility attributes and ARIA labels
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_


- [ ] 2.2 Implement ApprovalCommentsDialog component
  - Create dialog with comments textarea and action buttons
  - Add validation for required comments on rejection
  - Implement loading states and disabled button logic
  - Add proper focus management and keyboard navigation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 3. Integrate approval workflow into planning table







- [ ] 3.1 Update PlanningActivity interface with approval fields
  - Add approvalStatus, reviewedBy, reviewedAt, reviewComments fields
  - Add optional reviewer object with user details
  - Update type exports in planning table columns file


  - _Requirements: 4.1_

- [ ] 3.2 Add approval status column to planning table
  - Create new column definition with ApprovalStatusBadge


  - Enable sorting and filtering by approval status
  - Add filter options for all status values
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 3.3 Enhance actions dropdown with approval actions
  - Add role-based conditional rendering using useUser hook


  - Add "Approve" and "Reject" menu items for admin users on PENDING plans
  - Integrate ApprovalCommentsDialog for approval actions
  - Add proper icons (CheckCircle, XCircle) and styling
  - Handle approval action callbacks with error handling
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3.4 Implement bulk submit toolbar action
  - Create or update planning-table-toolbar-actions component
  - Add "Submit for Approval" button visible to accountant role
  - Filter selected rows to only include DRAFT status plans
  - Implement submitForApproval API call with loading state
  - Add success/error toast notifications
  - Reset row selection and refresh table after successful submission
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Integrate approval workflow into planning details page





- [x] 4.1 Create ApprovalStatusSection component


  - Display current approval status with ApprovalStatusBadge
  - Show reviewer information (name, date, comments) when available
  - Format dates and handle null values gracefully
  - Style with Card component for consistent layout
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_



- [ ] 4.2 Create ApprovalActionsCard component
  - Add role-based visibility check (admin only, PENDING status only)
  - Implement "Approve Plan" and "Reject Plan" action buttons
  - Integrate ApprovalCommentsDialog for both actions
  - Handle approval action execution with approvePlanning API
  - Add loading states and error handling with toast notifications
  - Trigger page refresh after successful action


  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4.3 Integrate approval components into details page
  - Add ApprovalStatusSection to page layout
  - Add ApprovalActionsCard with conditional rendering
  - Ensure proper data fetching includes approval fields
  - Update page refresh logic to invalidate queries after approval actions
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Add comprehensive error handling and user feedback





  - Implement ApiError handling with status-specific messages (403, 404, 400)
  - Add toast notifications for all success and error scenarios
  - Implement loading indicators on all action buttons
  - Add button disable logic during API calls to prevent duplicates
  - Handle network errors and unexpected failures gracefully
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 6. Testing and quality assurance
- [ ]* 6.1 Write component unit tests
  - Test ApprovalStatusBadge with all status variants
  - Test ApprovalCommentsDialog validation and interactions
  - Test role-based rendering logic in table and details page
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [ ]* 6.2 Write integration tests
  - Test end-to-end approval flow from submission to approval
  - Test role-based access control across all components
  - Test error scenarios and recovery
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.3 Perform accessibility audit
  - Verify keyboard navigation works for all actions
  - Test screen reader compatibility
  - Validate ARIA labels and focus management
  - Check color contrast ratios for status badges
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3_
