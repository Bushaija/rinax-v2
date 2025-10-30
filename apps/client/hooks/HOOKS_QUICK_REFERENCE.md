# Client-Side Hooks Quick Reference

## Version Control Hooks

### useReportVersions
Fetch all versions of a financial report.

```typescript
import { useReportVersions } from "@/hooks/queries/financial-reports";

const { data, isLoading, error } = useReportVersions(reportId);
// data: { reportId, currentVersion, versions: ReportVersion[] }
```

### useVersionComparison
Compare two versions of a financial report.

```typescript
import { useVersionComparison } from "@/hooks/queries/financial-reports";

const { data, isLoading } = useVersionComparison(reportId, "1.0", "1.1");
// data: { version1, version2, differences: [], summary: {} }
```

## Period Lock Hooks

### usePeriodLocks
Fetch all period locks for a facility.

```typescript
import { usePeriodLocks } from "@/hooks/queries/period-locks";

const { data, isLoading } = usePeriodLocks(facilityId);
// data: { locks: PeriodLock[] }
```

### usePeriodLockAudit
Fetch audit log for a specific period lock.

```typescript
import { usePeriodLockAudit } from "@/hooks/queries/period-locks";

const { data, isLoading } = usePeriodLockAudit(lockId);
// data: { auditLogs: PeriodLockAuditEntry[] }
```

### useUnlockPeriod
Unlock a reporting period (admin only).

```typescript
import { useUnlockPeriod } from "@/hooks/mutations/period-locks";

const { mutate, isPending } = useUnlockPeriod({
  onSuccess: (data) => console.log("Unlocked!", data),
  onError: (error) => console.error("Failed:", error),
});

// Usage
mutate({
  lockId: 123,
  data: { reason: "Administrative override" },
});
```

## Cache Invalidation

When you need to manually invalidate caches:

```typescript
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

// Invalidate all period locks
queryClient.invalidateQueries({ queryKey: ["period-locks"] });

// Invalidate specific facility's locks
queryClient.invalidateQueries({ queryKey: ["period-locks", facilityId] });

// Invalidate report versions
queryClient.invalidateQueries({ queryKey: ["financial-reports", "versions", reportId] });

// Invalidate version comparison
queryClient.invalidateQueries({ 
  queryKey: ["financial-reports", "versions", "compare", reportId, v1, v2] 
});
```

## Stale Time Configuration

- **Report Versions**: 5 minutes
- **Version Comparison**: 10 minutes
- **Period Locks**: 2 minutes
- **Period Lock Audit**: Default (0)

## Common Patterns

### Loading State
```typescript
const { data, isLoading, error } = useReportVersions(reportId);

if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
return <VersionList versions={data.versions} />;
```

### Conditional Fetching
```typescript
// Only fetch when reportId is available
const { data } = useReportVersions(reportId); // enabled: !!reportId

// Only fetch when all params are available
const { data } = useVersionComparison(reportId, v1, v2); // enabled: !!reportId && !!v1 && !!v2
```

### Mutation with Callbacks
```typescript
const { mutate, isPending, isSuccess } = useUnlockPeriod({
  onSuccess: (data) => {
    // Auto-invalidates: period-locks, period-lock-audit, financial-reports
    navigate("/period-locks");
  },
  onError: (error) => {
    // Auto-shows toast error
    console.error(error);
  },
});
```

## Type Imports

```typescript
// Version Control Types
import type {
  ReportVersion,
  VersionComparison,
  CompareVersionsRequest,
  GetReportVersionsResponse,
} from "@/types/version-control";

// Period Lock Types
import type {
  PeriodLock,
  PeriodLockAuditEntry,
  GetPeriodLocksResponse,
  UnlockPeriodRequest,
  UnlockPeriodResponse,
} from "@/types/period-locks";
```
