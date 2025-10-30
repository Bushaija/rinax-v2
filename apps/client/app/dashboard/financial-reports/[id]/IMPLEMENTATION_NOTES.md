# Financial Report Viewer - Implementation Notes

## Overview

This component has been updated to integrate snapshot indicators, period lock badges, and version history functionality as part of the Financial Report Snapshots and Period Locking feature.

## Requirements Addressed

- **3.1, 3.2, 3.3, 3.4, 3.5**: Display logic based on report status (live vs snapshot data)
- **7.1, 7.2, 7.3, 7.4**: Period lock status display and user feedback

## Key Changes

### 1. Snapshot Indicator Integration

The component now displays a `SnapshotIndicator` component that shows:
- **Live Data** badge for draft reports (status === 'draft')
- **Snapshot** badge with timestamp for submitted/approved reports
- **Source data changed** warning if the report is outdated

```typescript
const useSnapshot = status !== 'draft';

<SnapshotIndicator
  isSnapshot={useSnapshot}
  snapshotTimestamp={report.snapshotTimestamp}
  isOutdated={report.isOutdated}
/>
```

### 2. Period Lock Badge Integration

The component conditionally displays a `PeriodLockBadge` when the reporting period is locked:

```typescript
{report.periodLock && (
  <PeriodLockBadge
    isLocked={report.periodLock.isLocked}
    lockedAt={report.periodLock.lockedAt}
    lockedBy={report.periodLock.lockedBy?.name}
    lockedReason={report.periodLock.lockedReason}
  />
)}
```

### 3. Version History Integration

The component displays version history at the bottom when multiple versions exist:

```typescript
const hasMultipleVersions = (versionsData?.versions?.length || 0) > 1;

{hasMultipleVersions && (
  <VersionHistory
    reportId={reportId}
    onViewVersion={(versionNumber) => {
      // TODO: Implement version viewing functionality
    }}
    onCompareVersion={(versionNumber) => {
      // TODO: Implement version comparison navigation
    }}
  />
)}
```

### 4. Data Loading Strategy

The component uses two data sources:
1. `useGetFinancialReportById(reportId)` - Fetches the main report data
2. `useReportVersions(reportId)` - Fetches version history data

The version history query runs in parallel with the main report query for optimal performance.

## Expected Data Structure

The component expects the following fields to be available in the report object:

```typescript
interface FinancialReport {
  // Existing fields
  id: number;
  reportCode: string;
  title: string;
  status: ReportStatus;
  locked: boolean;
  reportData: any;
  version: string;
  fiscalYear: string;
  createdAt: string;
  updatedAt: string;
  
  // New snapshot-related fields
  snapshotTimestamp?: string | null;
  isOutdated?: boolean;
  
  // Period lock information
  periodLock?: {
    isLocked: boolean;
    lockedAt?: string | null;
    lockedBy?: {
      name: string;
    } | null;
    lockedReason?: string | null;
  };
  
  // Relations
  project?: { name: string };
  facility?: { name: string };
  dafComment?: string;
  dgComment?: string;
}
```

## UI/UX Considerations

1. **Tooltip Provider**: The entire component is wrapped in `TooltipProvider` to enable tooltips for the snapshot indicator and period lock badge.

2. **Visual Hierarchy**: The snapshot indicator and period lock badge are placed prominently at the top of the page, immediately after the header, to ensure users are aware of the data source and lock status.

3. **Conditional Rendering**: Version history only appears when there are multiple versions to avoid cluttering the UI for reports with a single version.

4. **Graceful Degradation**: If the backend hasn't implemented the new fields yet, the component gracefully handles missing data:
   - `report.snapshotTimestamp` defaults to undefined
   - `report.isOutdated` defaults to undefined
   - `report.periodLock` defaults to undefined
   - Version history section is hidden if no versions exist

## Future Enhancements

### TODO Items

1. **Version Viewing**: Implement the `onViewVersion` handler to display a specific version of the report
2. **Version Comparison**: Implement the `onCompareVersion` handler to navigate to a comparison view
3. **Live Data Display**: Currently displays raw JSON. Should be replaced with proper statement rendering based on snapshot vs live data
4. **Period Lock Actions**: Add UI for administrators to unlock periods if needed

### Suggested Implementation for Version Viewing

```typescript
const handleViewVersion = (versionNumber: string) => {
  router.push(`/dashboard/financial-reports/${reportId}/versions/${versionNumber}`);
};

const handleCompareVersion = (versionNumber: string) => {
  router.push(`/dashboard/financial-reports/${reportId}/compare?version=${versionNumber}`);
};
```

## Testing Considerations

When testing this component, verify:

1. **Draft Reports**: Show "Live Data" badge, no period lock badge
2. **Submitted Reports**: Show "Snapshot" badge with timestamp
3. **Outdated Reports**: Show "Source data changed" warning
4. **Locked Periods**: Show period lock badge with appropriate tooltip
5. **Multiple Versions**: Version history section appears
6. **Single Version**: Version history section is hidden
7. **Missing Data**: Component handles undefined/null values gracefully

## Dependencies

- `@/components/reports/snapshot-indicator` - Displays data source status
- `@/components/reports/period-lock-badge` - Displays period lock status
- `@/components/reports/version-history` - Displays version history table
- `@/hooks/queries/financial-reports/use-report-versions` - Fetches version data
- `@/components/ui/tooltip` - Provides tooltip functionality

## Related Files

- Design Document: `.kiro/specs/financial-report-snapshots-period-locking/design.md`
- Requirements: `.kiro/specs/financial-report-snapshots-period-locking/requirements.md`
- Tasks: `.kiro/specs/financial-report-snapshots-period-locking/tasks.md`
