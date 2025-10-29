# Implementation Plan

- [x] 1. Add approval status filter to planning entry queries





  - Update `fetchPlanningEntries` function in aggregation service to filter by `approvalStatus = 'APPROVED'`
  - Ensure the filter is applied to all planning entry queries used for budget calculations
  - _Requirements: 1.1, 1.3, 4.1, 4.2_






- [ ] 2. Add budget calculation helper to approval service

  - [x] 2.1 Create `calculatePlanBudget` private method in ApprovalService class


    - Implement logic to sum `total_budget` from all activities in formData
    - Handle missing or malformed formData gracefully (return 0)
    - _Requirements: 3.1_





  - [x] 2.2 Update `rejectPlan` method to calculate and log budget amount


    - Call `calculatePlanBudget` before updating plan status
    - Pass budget amount to audit service in metadata
    - _Requirements: 3.1, 3.2_



  - [x] 2.3 Update `approvePlan` method to calculate and log budget amount




    - Call `calculatePlanBudget` before updating plan status
    - Pass budget amount to audit service in metadata for consistency
    - _Requirements: 3.1, 3.2_



- [ ] 3. Enhance audit service to accept budget metadata

  - [ ] 3.1 Update `logApprovalAction` method signature
    - Add optional `metadata` parameter with `budgetAmount` field
    - Update method to store metadata in audit log record




    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.2 Update `logAtomicApprovalAction` method signature
    - Add optional `metadata` parameter for consistency
    - Ensure atomic operations include budget metadata
    - _Requirements: 3.1, 3.2_

- [ ] 4. Update approval handlers to pass budget metadata

  - Modify `approvePlanning` handler to pass budget metadata to audit service
  - Modify `reviewPlanning` handler to pass budget metadata to audit service
  - Ensure all approval/rejection flows include budget information in audit logs
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Verify dashboard calculations exclude rejected plans

  - Test budget summary endpoint returns correct allocated amounts
  - Test program budget distribution excludes rejected plans
  - Test district budget aggregations filter by approval status
  - Test facility budget summaries only include approved plans
  - _Requirements: 1.3, 1.4, 4.3_

- [ ] 6. Add database index for approval status (optional performance optimization)

  - Create migration to add index on `schema_form_data_entries.approval_status`
  - Test query performance improvement with index
  - _Requirements: 4.1_
