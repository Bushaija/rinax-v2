# Implementation Plan

- [x] 1. Set up database schema and audit infrastructure






  - Create approval audit log table migration
  - Add database indexes for approval status and reviewed_by fields
  - Update database relations to include audit log references
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_


- [x] 2. Implement core approval service layer




  - [x] 2.1 Create ApprovalService with approval/rejection logic


    - Implement approvePlan method with status validation and user permission checks
    - Implement rejectPlan method with required comments validation
    - Add validateExecutionPermission method for execution blocking
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 4.1, 4.2_

  - [x] 2.2 Create AuditService for compliance tracking


    - Implement logApprovalAction method for immutable audit trail
    - Add getAuditTrail method for approval history retrieval
    - Ensure atomic transactions for status updates and audit logging
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 2.3 Implement role-based permission validation


    - Create permission matrix validation for approval actions
    - Add user role checking middleware for approval endpoints
    - Implement cross-role interaction validation
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Create approval API endpoints





  - [x] 3.1 Implement POST /api/planning/approve endpoint


    - Add route definition with request/response schemas
    - Implement handler with ApprovalService integration
    - Add input validation for planningId, action, and comments
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 Enhance existing planning endpoints with approval filtering


    - Update GET /api/planning to support approvalStatus filter
    - Modify planning list query schema to include approval status
    - Add approval status to planning data response models
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [x] 3.3 Implement bulk approval operations


    - Update existing bulk-review endpoint with enhanced validation
    - Add batch processing logic for multiple plan approvals
    - Implement transaction rollback for failed bulk operations
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
-

- [x] 4. Add execution enforcement middleware



  - [x] 4.1 Create approval status validation middleware


    - Implement validateApprovalStatus function for execution endpoints
    - Add middleware to block unapproved plans from execution processes
    - Create clear error responses for blocked execution attempts
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.2 Integrate enforcement with existing execution endpoints


    - Apply approval validation to budgeting endpoints
    - Add validation to disbursement process endpoints
    - Integrate with activity tracking execution flows
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Implement notification system





  - [x] 5.1 Create NotificationService for approval workflow


    - Implement notifyPendingReview for admin notifications
    - Add notifyApprovalDecision for planner feedback
    - Create notification templates for approval workflow events
    - _Requirements: 1.5, 2.5_

  - [x] 5.2 Integrate notifications with approval actions


    - Trigger admin notifications on plan submission
    - Send planner notifications on approval decisions
    - Add notification preferences and delivery methods
    - _Requirements: 1.5, 2.5_

- [x] 6. Update planning creation workflow





  - [x] 6.1 Modify plan creation to set PENDING status


    - Update planning creation handlers to set default approval status
    - Add creator identity tracking for audit purposes
    - Generate unique identifiers and timestamps for submitted plans
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 6.2 Enhance file upload workflow with approval integration


    - Update planning file upload to set PENDING status
    - Add source file tracking for uploaded plans
    - Integrate approval workflow with existing upload validation
    - _Requirements: 1.1, 1.2, 1.3, 1.4_


- [x] 7. Add comprehensive error handling










  - [x] 7.1 Create approval-specific error types and codes


    - Define ApprovalError class with structured error codes
    - Implement validation for plan existence and status transitions
    - Add permission check errors with clear messages
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4_

  - [x] 7.2 Implement execution blocking error responses


    - Create clear error messages for blocked execution attempts
    - Add detailed error context for debugging and user feedback
    - Implement logging for all execution attempts on unapproved plans
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 8. Create comprehensive test suite
  - [ ]* 8.1 Write unit tests for ApprovalService
    - Test approval/rejection logic with various scenarios
    - Validate status transition rules and permission enforcement
    - Test audit logging and error handling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.2 Write API endpoint tests
    - Test approval endpoint with valid and invalid requests
    - Validate role-based access control across all endpoints
    - Test error handling scenarios and response formats
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 8.3 Create integration tests for approval workflow
    - Test end-to-end approval workflow from creation to execution
    - Validate notification flow and audit trail generation
    - Test concurrent approval scenarios and data integrity
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]* 8.4 Write execution enforcement tests
    - Test execution blocking for unapproved plans across all execution endpoints
    - Validate middleware integration and error responses
    - Test performance impact of approval validation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_