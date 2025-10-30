# Task 10: Modify Report Display Logic - Implementation Summary

## Overview
This document summarizes the implementation of Task 10, which modifies the `generateStatement` handler to support snapshot-based display logic for submitted and approved financial reports.

## Requirements Addressed
- **Requirement 3.1**: Display live data for draft reports
- **Requirement 3.2**: Display snapshot data for submitted reports
- **Requirement 3.3**: Display snapshot data for approved reports
- **Requirement 3.4**: Add `isSnapshot` flag to response metadata
- **Requirement 3.5**: Add `snapshotTimestamp` and `isOutdated` flags to response metadata

## Implementation Details

### 1. Request Schema Enhancement
**File**: `apps/server/src/api/routes/financial-reports/financial-reports.types.ts`

Added optional `reportId` parameter to `generateStatementRequestSchema`:
```typescript
reportId: z.number().int().positive()
  .optional()
  .describe('Financial report ID - if provided and report is submitted/approved, returns snapshot data')
```

### 2. Response Schema Enhancement
**File**: `apps/server/src/api/routes/financial-reports/financial-reports.types.ts`

Added `snapshotMetadataSchema` and included it in `generateStatementResponseSchema`:
```typescript
export const snapshotMetadataSchema = z.object({
  isSnapshot: z.boolean(),
  snapshotTimestamp: z.string().nullable(),
  isOutdated: z.boolean(),
  reportId: z.number().nullable(),
  reportStatus: z.string().optional(),
  version: z.string().optional(),
});
```

### 3. Type Definition Enhancement
**File**: `apps/server/src/lib/statement-engine/types/core.types.ts`

Added `SnapshotMetadata` interface and included it in `FinancialStatementResponse`:
```typescript
export interface SnapshotMetadata {
  isSnapshot: boolean;
  snapshotTimestamp: string | null;
  isOutdated: boolean;
  reportId: number | null;
  reportStatus?: string;
  version?: string;
}

export interface FinancialStatementResponse {
  // ... existing fields
  snapshotMetadata?: SnapshotMetadata;
}
```

### 4. Handler Logic Modification
**File**: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

#### Early Return for Snapshot Data
When `reportId` is provided and the report is submitted/approved:
1. Fetch the report from the database
2. Validate user access to the report's facility
3. Check if report status is submitted or approved
4. If yes, return snapshot data from `reportData` field with snapshot metadata
5. If no (draft/rejected), continue with live data generation

```typescript
if (reportId) {
  const report = await db.query.financialReports.findFirst({
    where: eq(financialReports.id, reportId),
    // ... with relations
  });

  // Access control validation
  const hasAccess = canAccessFacility(report.facilityId, userContext);

  // Check if submitted or approved
  const isSubmittedOrApproved = ['submitted', 'pending_daf_approval', 
    'approved_by_daf', 'pending_dg_approval', 'fully_approved', 'approved']
    .includes(report.status);

  if (isSubmittedOrApproved && report.reportData) {
    // Return snapshot data with metadata
    return c.json({
      statement: snapshotData.statement || snapshotData,
      validation: { /* ... */ },
      performance: { /* ... */ },
      snapshotMetadata: {
        isSnapshot: true,
        snapshotTimestamp: report.snapshotTimestamp?.toISOString() || null,
        isOutdated: report.isOutdated || false,
        reportId: report.id,
        reportStatus: report.status,
        version: report.version,
      }
    }, HttpStatusCodes.OK);
  }
  
  // Fall through to live data generation for draft/rejected
}
```

#### Live Data Response Enhancement
Added snapshot metadata to both Budget vs Actual and standard statement responses:
```typescript
snapshotMetadata: {
  isSnapshot: false,
  snapshotTimestamp: null,
  isOutdated: false,
  reportId: reportId || null,
}
```

## Behavior Summary

### Scenario 1: No reportId provided
- **Behavior**: Generate statement from live data (existing behavior)
- **Response**: Includes `snapshotMetadata` with `isSnapshot: false`

### Scenario 2: reportId provided, report is draft
- **Behavior**: Generate statement from live data
- **Response**: Includes `snapshotMetadata` with `isSnapshot: false` and the `reportId`

### Scenario 3: reportId provided, report is submitted/approved
- **Behavior**: Return snapshot data from `reportData` field
- **Response**: Includes `snapshotMetadata` with:
  - `isSnapshot: true`
  - `snapshotTimestamp`: When snapshot was captured
  - `isOutdated`: Whether source data has changed
  - `reportId`: The report ID
  - `reportStatus`: Current report status
  - `version`: Report version

### Scenario 4: reportId provided, report is rejected
- **Behavior**: Generate statement from live data (allows accountant to see current data for corrections)
- **Response**: Includes `snapshotMetadata` with `isSnapshot: false` and the `reportId`

## Access Control
The implementation maintains existing access control:
- Users can only view reports for facilities in their district
- Access validation occurs before returning snapshot data
- Returns 403 Forbidden if user lacks access

## Error Handling
- Returns 404 Not Found if reportId is provided but report doesn't exist
- Returns 403 Forbidden if user doesn't have access to the report's facility
- Gracefully handles missing snapshot data by falling back to live generation

## Testing Recommendations

### Unit Tests
1. Test snapshot data return for submitted reports
2. Test snapshot data return for approved reports
3. Test live data generation for draft reports
4. Test live data generation for rejected reports
5. Test access control validation
6. Test missing report handling

### Integration Tests
1. Test complete workflow: draft → submit → view snapshot
2. Test that snapshot data matches what was captured at submission
3. Test that `isOutdated` flag is set correctly when source data changes
4. Test version tracking across multiple submissions

### Manual Testing
1. Create a draft report and verify live data is displayed
2. Submit the report and verify snapshot data is displayed
3. Modify source data and verify `isOutdated` flag appears
4. Reject the report and verify live data is displayed again
5. Verify snapshot timestamp is accurate

## Future Enhancements
1. Add caching for frequently accessed snapshots
2. Implement snapshot compression for large reports
3. Add snapshot integrity validation (checksum verification)
4. Support partial snapshot updates for minor corrections
5. Add snapshot comparison UI to show differences between versions

## Related Tasks
- **Task 2**: Implement Snapshot Service (captures snapshot data)
- **Task 5**: Modify Submit for Approval Handler (creates snapshots)
- **Task 11**: Implement Outdated Report Detection (sets `isOutdated` flag)
- **Task 12**: Create Snapshot Indicator Component (displays snapshot metadata in UI)

## Conclusion
Task 10 successfully implements the display logic that differentiates between live data and snapshot data based on report status. The implementation is backward compatible, maintains access control, and provides clear metadata to the client about the data source.
