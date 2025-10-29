# Requirements Document

## Introduction

This document specifies the requirements for ensuring that rejected plans are properly excluded from budget allocation calculations. Currently, the system includes all planning entries regardless of approval status when calculating allocated budgets, which means rejected plans incorrectly contribute to the total allocated budget. This feature will fix the budget calculation logic to only include approved plans.

## Glossary

- **Planning Entry**: A budget plan record stored in the `schema_form_data_entries` table with `entityType = 'planning'`
- **Approval Status**: The current state of a planning entry, which can be: DRAFT, PENDING, APPROVED, or REJECTED
- **Allocated Budget**: The total budget amount from all approved planning entries
- **Budget Calculation Service**: The service layer that computes budget metrics from planning and execution data
- **Aggregation Service**: The service that fetches planning entries for dashboard and reporting purposes

## Requirements

### Requirement 1: Exclude Rejected Plans from Budget Calculations

**User Story:** As a budget administrator, I want rejected plans to be automatically excluded from the total allocated budget, so that the budget calculations accurately reflect only approved allocations.

#### Acceptance Criteria

1. WHEN the system fetches planning entries for budget calculations, THE Aggregation Service SHALL filter entries to include only those with `approvalStatus = 'APPROVED'`

2. WHEN a plan is rejected by an admin, THE Budget Calculation Service SHALL exclude that plan's budget amount from the total allocated budget without requiring manual intervention

3. WHEN dashboard metrics are calculated, THE system SHALL compute allocated budgets using only approved planning entries

4. WHEN budget reports are generated, THE system SHALL display allocated amounts based exclusively on approved plans

### Requirement 2: Maintain Backward Compatibility

**User Story:** As a system maintainer, I want the budget calculation changes to work seamlessly with existing code, so that no other parts of the system break.

#### Acceptance Criteria

1. WHEN the approval status filter is added, THE Budget Calculation Service SHALL continue to accept the same input parameters and return the same output structure

2. WHEN existing API endpoints call budget calculation functions, THE system SHALL return correct results without requiring changes to the calling code

3. WHEN the aggregation service is updated, THE system SHALL maintain compatibility with all dashboard handlers that depend on it

### Requirement 3: Audit Trail for Budget Changes

**User Story:** As an auditor, I want to see when a plan's rejection causes budget deductions, so that I can track budget allocation changes over time.

#### Acceptance Criteria

1. WHEN a plan is rejected, THE Audit Service SHALL log the budget amount that was excluded from allocations

2. WHEN viewing audit logs, THE system SHALL display the plan ID, previous status, new status, and associated budget amount for rejection events

3. WHEN an admin reviews audit history, THE system SHALL provide clear information about budget impacts of approval decisions

### Requirement 4: Consistent Filtering Across All Budget Queries

**User Story:** As a developer, I want all budget-related queries to use consistent approval status filtering, so that budget calculations are accurate throughout the system.

#### Acceptance Criteria

1. WHEN any service fetches planning entries for budget purposes, THE system SHALL apply the `approvalStatus = 'APPROVED'` filter

2. WHEN dashboard aggregations are performed, THE Aggregation Service SHALL use the same approval status filter as other budget calculations

3. WHEN program, district, or facility budget summaries are generated, THE system SHALL include only approved plans in all calculations

4. WHEN budget metrics are computed for different reporting periods, THE system SHALL consistently filter by approval status across all time periods
