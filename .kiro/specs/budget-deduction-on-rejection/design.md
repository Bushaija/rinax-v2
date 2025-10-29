# Design Document

## Overview

This design addresses the issue where rejected planning entries are incorrectly included in budget allocation calculations. The solution involves adding approval status filtering to the data fetching layer, ensuring that only APPROVED plans contribute to allocated budget totals. This is a targeted fix that modifies the query logic without requiring database schema changes or major architectural updates.

## Architecture

### Current Flow
```
Dashboard/API Request
  ↓
fetchPlanningEntries(filters) - NO approval status filter ❌
  ↓
calculateAllocatedBudget(entries) - Sums all entries
  ↓
Returns budget including REJECTED plans ❌
```

### Proposed Flow
```
Dashboard/API Request
  ↓
fetchPlanningEntries(filters) - Filters by approvalStatus = 'APPROVED' ✅
  ↓
calculateAllocatedBudget(entries) - Sums only approved entries
  ↓
Returns accurate budget excluding REJECTED plans ✅
```

## Components and Interfaces

### 1. Aggregation Service (`apps/server/src/api/services/dashboard/aggregation.service.ts`)

**Current Implementation:**
```typescript
export async function fetchPlanningEntries(filters: AggregationFilters) {
  const conditions = [
    eq(schemaFormDataEntries.entityType, 'planning'),
    eq(schemaFormDataEntries.reportingPeriodId, filters.reportingPeriodId),
    inArray(schemaFormDataEntries.facilityId, filters.facilityIds),
  ];
  // Missing: approval status filter
}
```

**Proposed Change:**
```typescript
export async function fetchPlanningEntries(filters: AggregationFilters) {
  const conditions = [
    eq(schemaFormDataEntries.entityType, 'planning'),
    eq(schemaFormDataEntries.reportingPeriodId, filters.reportingPeriodId),
    inArray(schemaFormDataEntries.facilityId, filters.facilityIds),
    eq(schemaFormDataEntries.approvalStatus, 'APPROVED'), // ✅ NEW
  ];
  // Rest of the function remains the same
}
```

**Rationale:**
- This is the single point where planning entries are fetched for budget calculations
- Adding the filter here ensures all downstream calculations are correct
- No changes needed to function signature or return type
- Maintains backward compatibility

### 2. Budget Calculation Service (`apps/server/src/api/services/dashboard/budget-calculations.service.ts`)

**No Changes Required**

The budget calculation service already correctly sums the budget amounts from the entries it receives. Since we're filtering at the data fetching layer, this service will automatically work correctly without any modifications.

**Why this works:**
- The service is pure - it only processes the data it receives
- By filtering upstream, we ensure it only receives approved entries
- This maintains separation of concerns

### 3. Approval Service (`apps/server/src/lib/services/approval.service.ts`)

**Enhancement for Audit Trail:**

Add budget amount logging when rejecting plans:

```typescript
async rejectPlan(planningId: number, adminId: number, comments: string): Promise<ApprovalResult> {
  // ... existing validation code ...
  
  // Calculate budget amount before rejection
  const budgetAmount = this.calculatePlanBudget(plan.formData);
  
  // ... existing update code ...
  
  // Log to audit with budget information
  await auditService.logApprovalAction(
    planningId,
    'PENDING',
    'REJECTED',
    adminId,
    comments,
    { budgetAmount } // ✅ NEW: Include budget in audit metadata
  );
  
  // ... rest of function ...
}
```

**New Helper Method:**
```typescript
private calculatePlanBudget(formData: any): number {
  if (!formData?.activities) return 0;
  
  const activities = Object.values(formData.activities);
  return activities.reduce((sum: number, activity: any) => {
    return sum + (activity?.total_budget || 0);
  }, 0);
}
```

### 4. Audit Service (`apps/server/src/lib/services/audit.service.ts`)

**Enhancement:**

Update the audit logging to accept and store budget metadata:

```typescript
async logApprovalAction(
  planningId: number,
  previousStatus: string,
  newStatus: string,
  actionBy: number,
  comments?: string,
  metadata?: { budgetAmount?: number } // ✅ NEW parameter
): Promise<void> {
  // ... existing code ...
  
  await db.insert(approvalAuditLog).values({
    planningId,
    previousStatus,
    newStatus,
    actionBy,
    comments,
    metadata: metadata ? JSON.stringify(metadata) : null, // ✅ Store budget info
    actionTimestamp: new Date(),
  });
}
```

## Data Models

### Existing Schema (No Changes)

The `schema_form_data_entries` table already has the `approvalStatus` column:

```typescript
{
  id: number;
  approvalStatus: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  formData: {
    activities: {
      [activityId: string]: {
        total_budget: number;
        // ... other fields
      }
    }
  };
  // ... other fields
}
```

### Audit Log Enhancement

The `approval_audit_log` table already supports a `metadata` JSONB column, so we can store budget information without schema changes:

```typescript
{
  metadata: {
    budgetAmount?: number; // Amount that was allocated/deallocated
  }
}
```

## Error Handling

### Scenario 1: Plan Already Rejected
- **Current behavior:** Approval service throws `InvalidStatusTransition` error
- **No change needed:** This is correct behavior

### Scenario 2: Missing Budget Data
- **Handling:** If `formData.activities` is missing or malformed, calculate budget as 0
- **Logging:** Log a warning but don't fail the rejection
- **Rationale:** Rejection should succeed even if budget calculation fails

### Scenario 3: Audit Logging Failure
- **Current behavior:** Rejection succeeds even if audit logging fails
- **No change needed:** This is correct - audit failures shouldn't block business operations

## Testing Strategy

### Unit Tests

1. **Test: fetchPlanningEntries filters by approval status**
   - Given: Planning entries with mixed approval statuses (DRAFT, PENDING, APPROVED, REJECTED)
   - When: fetchPlanningEntries is called
   - Then: Only APPROVED entries are returned

2. **Test: Budget calculation excludes rejected plans**
   - Given: 3 plans - 1 APPROVED ($1000), 1 REJECTED ($500), 1 PENDING ($300)
   - When: calculateAllocatedBudget is called
   - Then: Returns $1000 (only the approved plan)

3. **Test: Rejection logs budget amount**
   - Given: A PENDING plan with $2000 budget
   - When: Plan is rejected
   - Then: Audit log contains budgetAmount: 2000 in metadata

### Integration Tests

1. **Test: Dashboard shows correct allocated budget after rejection**
   - Given: 2 approved plans ($1000 each), 1 rejected plan ($500)
   - When: Dashboard budget summary is fetched
   - Then: totalAllocated = $2000 (excludes rejected plan)

2. **Test: Rejection immediately affects budget calculations**
   - Given: An approved plan with $1500 budget
   - When: Plan is rejected
   - Then: Next budget calculation shows $1500 less in allocated budget

3. **Test: Multiple rejections compound correctly**
   - Given: 5 approved plans ($1000 each)
   - When: 2 plans are rejected
   - Then: Allocated budget = $3000 (3 remaining approved plans)

### Manual Testing Checklist

- [ ] Create a plan and approve it - verify it appears in budget totals
- [ ] Reject the plan - verify budget total decreases immediately
- [ ] Check dashboard metrics reflect the change
- [ ] Verify audit log shows budget amount for rejection
- [ ] Test with multiple facilities and reporting periods
- [ ] Confirm program-level budget summaries are correct
- [ ] Verify district-level aggregations work correctly

## Implementation Notes

### Order of Changes

1. **First:** Update `fetchPlanningEntries` to add approval status filter
2. **Second:** Add budget calculation helper to approval service
3. **Third:** Update audit service to accept metadata parameter
4. **Fourth:** Enhance rejection flow to log budget amounts
5. **Fifth:** Test all dashboard endpoints to verify correct calculations

### Backward Compatibility

- All existing API endpoints continue to work without changes
- Function signatures remain the same (metadata parameter is optional)
- Return types are unchanged
- No database migrations required

### Performance Considerations

- Adding `approvalStatus` filter improves query performance (fewer rows returned)
- Consider adding database index on `approvalStatus` if not already present
- Budget calculation helper is O(n) where n = number of activities (acceptable)

### Rollback Plan

If issues arise:
1. Remove the `eq(schemaFormDataEntries.approvalStatus, 'APPROVED')` condition
2. System reverts to previous behavior (including all plans)
3. No data loss or corruption possible

## Design Decisions

### Decision 1: Filter at Data Layer vs Calculation Layer

**Chosen:** Filter at data fetching layer (`fetchPlanningEntries`)

**Alternatives Considered:**
- Filter in `calculateAllocatedBudget` function
- Filter in each dashboard handler

**Rationale:**
- Single point of change reduces risk of inconsistency
- Improves performance by reducing data transferred
- Maintains separation of concerns (fetching vs calculating)

### Decision 2: Include Budget in Audit Logs

**Chosen:** Add budget amount to audit metadata

**Alternatives Considered:**
- Don't track budget amounts in audit
- Create separate budget audit table

**Rationale:**
- Provides valuable audit trail for budget changes
- Uses existing metadata field (no schema change)
- Minimal code changes required

### Decision 3: Handle Missing Budget Data Gracefully

**Chosen:** Calculate as 0 and log warning, don't fail rejection

**Alternatives Considered:**
- Fail rejection if budget can't be calculated
- Skip audit logging if budget is missing

**Rationale:**
- Rejection is more important than perfect audit data
- Prevents blocking legitimate admin actions
- Maintains system reliability
