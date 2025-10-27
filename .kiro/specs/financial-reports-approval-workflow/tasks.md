# Implementation Plan

- [x] 1. Database schema updates





  - Add new columns to financial_reports table: daf_id, daf_approved_at, daf_comment, dg_id, dg_approved_at, dg_comment, final_pdf_url, locked
  - Update report_status enum to include: pending_daf_approval, rejected_by_daf, approved_by_daf, rejected_by_dg, fully_approved
  - Create financial_report_workflow_logs table with columns: id, report_id, action, actor_id, comment, timestamp
  - Add indexes on workflow_logs for report_id and timestamp
  - _Requirements: 1.1, 1.2, 2.1, 2.5, 3.1, 5.1, 5.2, 6.1-6.4_

- [x] 2. Update TypeScript schema and types





  - Extend financial reports Drizzle schema with new columns
  - Update report_status enum in schema.enum.ts
  - Create workflow logs Drizzle schema
  - Update financial-reports.types.ts with new fields and status values
  - Add WorkflowLog type definitions
  - Add approval action request/response schemas
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 6.1_





- [ ] 3. Implement workflow service layer

  - Create FinancialReportWorkflowService class
  - Implement state transition validation methods (canSubmit, canDafApprove, canDafReject, canDgApprove, canDgReject)
  - Implement workflow action methods (submitForApproval, dafApprove, dafReject, dgApprove, dgReject)



  - Implement workflow logging methods (logAction, getWorkflowLogs)
  - Implement report locking methods (lockReport, unlockReport, isLocked)


  - Add role-based permission checks
  - _Requirements: 1.1-1.5, 2.1-2.8, 3.1-3.8, 4.1-4.5, 5.1-5.5, 6.1-6.5_

- [ ] 4. Create approval workflow API endpoints




  - Implement POST /financial-reports/:id/submit endpoint with handler
  - Implement POST /financial-reports/:id/daf-approve endpoint with handler
  - Implement POST /financial-reports/:id/daf-reject endpoint with handler
  - Implement POST /financial-reports/:id/dg-approve endpoint with handler
  - Implement POST /financial-reports/:id/dg-reject endpoint with handler
  - Implement GET /financial-reports/:id/workflow-logs endpoint with handler
  - Add route definitions to financial-reports.routes.ts




  - Register routes in financial-reports.index.ts
  - _Requirements: 1.1-1.5, 2.1-2.8, 3.1-3.8, 4.1-4.5, 5.1-5.5_

- [x] 5. Implement PDF generation service




  - Create PdfGenerationService class
  - Implement generateFinancialReportPdf method using pdfkit





  - Implement savePdf method for file storage
  - Implement includeApprovalMetadata method to add approval details to PDF
  - Integrate PDF generation into dgApprove workflow action
  - Store PDF URL in finalPdfUrl field
  - _Requirements: 3.4, 3.5, 10.1-10.5_




- [ ] 6. Implement notification service integration


  - Create notification methods for DAF users (notifyDafUsers)
  - Create notification methods for DG users (notifyDgUsers)
  - Create notification method for report creator (notifyReportCreator)



  - Integrate notifications into workflow actions (submit, approve, reject)
  - _Requirements: 1.4, 2.4, 2.8, 3.8_




- [ ] 7. Update financial reports list endpoint

  - Add locked field to response schema



  - Add new approval fields (dafId, dafApprovedAt, dgId, dgApprovedAt, finalPdfUrl) to response
  - Support filtering by new status values
  - Include workflow log count in list response

  - _Requirements: 5.3, 7.1, 7.5_

- [ ] 8. Client: Create shared approval components

  - Create ApprovalStatusBadge component with color coding for all statuses
  - Create WorkflowTimeline component to display workflow logs chronologically
  - Create ApprovalCommentDialog component for approve/reject actions with required comment validation




  - Create ReportLockIndicator component to show locked state
  - _Requirements: 5.3, 7.4, 8.4, 8.5, 9.4, 9.5_

- [ ] 9. Client: Implement Accountant interface

  - Update financial reports table to show status badges and lock indicators
  - Add "Submit for Approval" button for draft/rejected reports



  - Disable edit controls when report is locked
  - Create RejectionAlert component to display rejection comments prominently
  - Implement submit action handler with error handling
  - Filter reports list to show editable reports (draft, rejected_by_daf, rejected_by_dg)

  - _Requirements: 7.1-7.5_


- [ ] 10. Client: Implement DAF approval queue interface

  - Create DafApprovalQueue page component
  - Filter reports to show only pending_daf_approval status
  - Create DafReviewCard component for individual report review
  - Implement ApprovalActionsCard with Approve/Reject buttons
  - Add mandatory comment validation for reject action
  - Display WorkflowTimeline for each report
  - Implement dafApprove and dafReject action handlers
  - Add navigation link to DAF queue in dashboard


  - _Requirements: 2.1-2.8, 8.1-8.5_

- [ ] 11. Client: Implement DG approval queue interface

  - Create DgApprovalQueue page component
  - Filter reports to show only approved_by_daf status
  - Create DgReviewCard component for individual report review
  - Implement FinalApprovalActionsCard with Final Approve/Reject buttons
  - Display DAF approval details (approver, date, comment)

  - Add mandatory comment validation for reject action
  - Display complete WorkflowTimeline including DAF actions

  - Implement dgApprove and dgReject action handlers
  - Add PDF download link after full approval
  - Add navigation link to DG queue in dashboard
  - _Requirements: 3.1-3.8, 9.1-9.5, 10.5_

- [ ] 12. Client: Add API client methods

  - Add submitForApproval method to financial reports API client
  - Add dafApprove method to financial reports API client
  - Add dafReject method to financial reports API client
  - Add dgApprove method to financial reports API client
  - Add dgReject method to financial reports API client
  - Add getWorkflowLogs method to financial reports API client
  - Add proper TypeScript types for all methods
  - _Requirements: 1.1, 2.1-2.8, 3.1-3.8, 5.1_

- [ ] 13. Update existing edit functionality

  - Add lock check before allowing edit operations
  - Display lock status in edit form
  - Show appropriate error message when attempting to edit locked report
  - Disable save button for locked reports
  - _Requirements: 6.5, 7.3_

- [ ]* 14. Add integration tests for workflow
  - Test complete approval flow: draft → submit → DAF approve → DG approve → fully_approved
  - Test DAF rejection flow: draft → submit → DAF reject → unlocked
  - Test DG rejection flow: draft → submit → DAF approve → DG reject → unlocked
  - Test role-based access control for each endpoint
  - Test report locking during approval process
  - Test workflow log creation for each action
  - _Requirements: 1.1-1.5, 2.1-2.8, 3.1-3.8, 4.1-4.5, 5.1-5.5, 6.1-6.5_
