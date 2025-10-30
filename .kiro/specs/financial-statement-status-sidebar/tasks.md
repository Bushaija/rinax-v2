# Implementation Plan

- [x] 1. Create ApprovalStatusBadge component





  - Create component file at apps/client/components/reports/approval-status-badge.tsx
  - Implement status-to-color mapping (draft: gray, pending: yellow, approved: blue, fully_approved: green, rejected: red)
  - Implement status-to-label mapping with user-friendly text
  - Add TypeScript types for ReportStatus
  - Style badge with pill shape, appropriate padding, and color variants
  - _Requirements: 2.1-2.6_

- [x] 2. Create useFinancialReportMetadata custom hook





  - Create hook file at apps/client/hooks/queries/financial-reports/use-financial-report-metadata.ts
  - Implement React Query hook using getFinancialReportById fetcher
  - Extract metadata fields: id, status, createdAt, createdBy, dafId, dafApprovedAt, locked
  - Add enabled option to conditionally fetch based on reportId
  - Return metadata, isLoading, isError, error, and refetch function
  - Configure appropriate cache time and stale time
  - _Requirements: 1.1-1.5, 4.1-4.5, 5.1-5.5_

- [x] 3. Create useSubmitForApproval custom hook





  - Create hook file at apps/client/hooks/mutations/financial-reports/use-submit-for-approval.ts
  - Implement React Query mutation using submitForApproval fetcher
  - Add onSuccess and onError callback options
  - Return submit function, isSubmitting, isSuccess, isError, and error
  - Configure mutation to invalidate financial report queries on success
  - _Requirements: 3.1-3.6_

- [x] 4. Create FinancialReportStatusCard component





  - Create component file at apps/client/components/reports/financial-report-status-card.tsx
  - Implement component props interface (reportId, projectType, statementType, onStatusChange)
  - Use useFinancialReportMetadata hook to fetch report data
  - Use useSubmitForApproval hook for submit functionality
  - Render ApprovalStatusBadge with current status
  - Display creation date using date formatting utility
  - Display creator name if available
  - Display DAF approval information when status is approved_by_daf or fully_approved
  - Implement submit button with conditional rendering based on status (draft, rejected_by_daf, rejected_by_dg)
  - Add loading skeleton for loading state
  - Add error alert for error state
  - Add empty state for no report
  - Style card with border, shadow, padding, and sticky positioning
  - _Requirements: 1.1-1.5, 3.1-3.6, 4.1-4.5, 5.1-5.5, 6.1-6.5, 7.1-7.5_

- [x] 5. Update Revenue & Expenditure page to include status sidebar





  - Modify apps/client/app/dashboard/reports/revenue-expenditure/page.tsx
  - Add state to track reportId for each project tab
  - Update generateStatement success handler to extract and store reportId from response
  - Wrap TabContent return with flex layout (statement + sidebar)
  - Add FinancialReportStatusCard component with reportId, projectType, and statementType props
  - Ensure sidebar has appropriate width (320px) and spacing
  - Test status sidebar displays correctly for each project tab
  - _Requirements: 1.1-1.5, 6.1-6.5, 8.1-8.5_

- [x] 6. Update Balance Sheet page to include status sidebar





  - Modify apps/client/app/dashboard/reports/balance-sheet/page.tsx
  - Add state to track reportId for each project tab
  - Update generateStatement success handler to extract and store reportId from response
  - Wrap TabContent return with flex layout (statement + sidebar)
  - Add FinancialReportStatusCard component with reportId, projectType, and statementType props
  - Ensure sidebar has appropriate width (320px) and spacing
  - Test status sidebar displays correctly for each project tab
  - _Requirements: 1.1-1.5, 6.1-6.5, 8.1-8.5_

- [x] 7. Add date formatting utility





  - Create or update utility file for date formatting
  - Implement formatDate function using date-fns library
  - Use consistent format across all date displays (e.g., "MMM dd, yyyy")
  - Export utility for reuse in other components
  - _Requirements: 4.5, 5.2_

- [x] 8. Handle submit success with toast notifications













  - Import useToast hook in FinancialReportStatusCard
  - Add success toast when report is submitted successfully
  - Add error toast when submission fails
  - Trigger metadata refetch after successful submission
  - Update displayed status optimistically if possible
  - _Requirements: 3.4, 3.5, 7.1-7.5_

- [x] 9. Add loading and error states to status card





  - Implement skeleton loader for loading state using Skeleton component
  - Implement error alert using Alert component for error state
  - Implement empty state message when reportId is null
  - Add loading spinner to submit button during submission
  - Disable submit button while submission is in progress
  - _Requirements: 3.6, 7.1-7.5_

- [ ]* 10. Add component tests for ApprovalStatusBadge
  - Test badge renders with correct color for each status
  - Test badge displays correct label for each status
  - Test custom className is applied
  - _Requirements: 2.1-2.6_

- [ ]* 11. Add component tests for FinancialReportStatusCard
  - Test card renders correctly with different statuses
  - Test submit button shows/hides based on status
  - Test metadata displays correctly
  - Test loading state renders skeleton
  - Test error state renders alert
  - Test no report state renders empty message
  - Test submit action calls API and updates status
  - _Requirements: 1.1-1.5, 3.1-3.6, 7.1-7.5_

- [ ]* 12. Add integration tests for status sidebar
  - Test status sidebar fetches and displays report metadata
  - Test status sidebar updates when project tab changes
  - Test submit action updates status and shows success message
  - Test submit error handling shows error message
  - Test button is disabled during submission
  - _Requirements: 7.1-7.5, 8.1-8.5_
