# Design Document: Financial Report Snapshots and Period Locking

## Overview

This design implements immutable financial report snapshots and period locking to prevent back-dating of approved financial data. When a report is submitted, the system captures a complete snapshot of all underlying planning and execution data, ensuring historical reports remain accurate even as source data continues to be edited for future periods. This follows standard accounting practices where certified financial statements are frozen while operational data remains editable.

The solution extends the existing financial reports module with snapshot capture logic, version control, period locking mechanisms, and snapshot-based display logic.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Report     │  │   Snapshot   │  │    Period    │      │
│  │   Viewer     │  │  Indicator   │  │  Lock Badge  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Financial Reports Routes & Handlers                 │   │
│  │  - Submit with snapshot capture                      │   │
│  │  - Version comparison                                │   │
│  │  - Period lock validation                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Snapshot Service                                    │   │
│  │  - Capture planning/execution data                   │   │
│  │  - Compute checksums                                 │   │
│  │  - Version management                                │   │
│  │                                                      │   │
│  │  Period Lock Service                                 │   │
│  │  - Lock/unlock periods                               │   │
│  │  - Validate edit operations                          │   │
│  │  - Audit logging                                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Layer (PostgreSQL)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  financial_reports (extended with snapshot data)     │   │
│  │  report_versions (new table)                         │   │
│  │  period_locks (new table)                            │   │
│  │  period_lock_audit_log (new table)                   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow: Snapshot Creation

```
User submits report
       │
       ▼
Validate report status (draft/rejected)
       │
       ▼
Query all source data:
  - schema_form_data_entries (planning)
  - schema_form_data_entries (execution)
  - dynamic_activities (structure)
       │
       ▼
Generate statement using existing logic
       │
       ▼
Capture complete snapshot:
  - Statement lines
  - Computed totals
  - Source record IDs
  - Metadata
       │
       ▼
Compute checksum of snapshot
       │
       ▼
Store in report_data field
       │
       ▼
Update report status → pending_daf_approval
       │
       ▼
Create report version record
```

### Data Flow: Display Logic

```
User views report
       │
       ▼
Check report status
       │
       ├─── draft? ──────► Query live data
       │                   Generate statement
       │                   Display with "Live Data" badge
       │
       └─── submitted/approved? ──► Load snapshot from report_data
                                     Display with "Snapshot" badge
                                     Show snapshot timestamp
```

## Components and Interfaces

### 1. Database Schema Extensions

#### Extended financial_reports Table

```typescript
// New/modified columns
{
  reportData: jsonb, // Now contains complete snapshot
  snapshotChecksum: varchar(64), // SHA-256 hash of snapshot
  snapshotTimestamp: timestamp, // When snapshot was captured
  sourceDataVersion: varchar(20), // Version identifier for source data
  isOutdated: boolean, // Flag if source data changed after snapshot
}
```

#### New report_versions Table

```typescript
export const reportVersions = pgTable("report_versions", {
  id: serial().primaryKey(),
  reportId: integer("report_id").notNull(), // FK to financial_reports
  versionNumber: varchar("version_number", { length: 20 }).notNull(), // "1.0", "1.1", etc.
  snapshotData: jsonb("snapshot_data").notNull(), // Complete snapshot
  snapshotChecksum: varchar("snapshot_checksum", { length: 64 }).notNull(),
  snapshotTimestamp: timestamp("snapshot_timestamp").notNull(),
  createdBy: integer("created_by"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`),
  changesSummary: text("changes_summary"), // Description of what changed
}, (table) => [
  foreignKey({
    columns: [table.reportId],
    foreignColumns: [financialReports.id],
  }).onDelete("cascade"),
  unique("report_version_unique").on(table.reportId, table.versionNumber),
]);
```

#### New period_locks Table

```typescript
export const periodLocks = pgTable("period_locks", {
  id: serial().primaryKey(),
  reportingPeriodId: integer("reporting_period_id").notNull(),
  projectId: integer("project_id").notNull(),
  facilityId: integer("facility_id").notNull(),
  isLocked: boolean("is_locked").default(true),
  lockedBy: integer("locked_by"), // User who triggered the lock
  lockedAt: timestamp("locked_at").default(sql`CURRENT_TIMESTAMP`),
  lockedReason: text("locked_reason"), // "Report fully approved"
  unlockedBy: integer("unlocked_by"),
  unlockedAt: timestamp("unlocked_at"),
  unlockedReason: text("unlocked_reason"),
}, (table) => [
  foreignKey({
    columns: [table.reportingPeriodId],
    foreignColumns: [reportingPeriods.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [projects.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.facilityId],
    foreignColumns: [facilities.id],
  }).onDelete("cascade"),
  unique("period_lock_unique").on(
    table.reportingPeriodId,
    table.projectId,
    table.facilityId
  ),
]);
```

#### New period_lock_audit_log Table

```typescript
export const periodLockAuditLog = pgTable("period_lock_audit_log", {
  id: serial().primaryKey(),
  periodLockId: integer("period_lock_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(), // "LOCKED", "UNLOCKED", "EDIT_ATTEMPTED"
  performedBy: integer("performed_by").notNull(),
  performedAt: timestamp("performed_at").default(sql`CURRENT_TIMESTAMP`),
  reason: text("reason"),
  metadata: jsonb("metadata"), // Additional context
}, (table) => [
  foreignKey({
    columns: [table.periodLockId],
    foreignColumns: [periodLocks.id],
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.performedBy],
    foreignColumns: [users.id],
  }),
]);
```

### 2. Snapshot Data Structure

```typescript
interface SnapshotData {
  version: string; // "1.0"
  capturedAt: string; // ISO timestamp
  statementCode: string; // "REV_EXP", "ASSETS_LIAB", etc.
  
  // Complete statement data
  statement: {
    lines: StatementLine[];
    totals: Record<string, number>;
    metadata: StatementMetadata;
  };
  
  // Source data references for audit
  sourceData: {
    planningEntries: Array<{
      id: number;
      formData: any;
      updatedAt: string;
    }>;
    executionEntries: Array<{
      id: number;
      formData: any;
      updatedAt: string;
    }>;
  };
  
  // Aggregation details
  aggregations: {
    totalPlanning: number;
    totalExecution: number;
    variance: number;
    facilityBreakdown?: FacilityBreakdownItem[];
  };
  
  // Checksum for integrity
  checksum: string;
}
```

### 3. API Endpoints

#### Modified POST /financial-reports/:id/submit

**Enhanced to capture snapshot:**

```typescript
// Existing functionality + snapshot capture
async function submitForApproval(reportId: number, userId: number) {
  // 1. Validate report status
  const report = await getReport(reportId);
  if (!canSubmit(report.status)) {
    throw new ValidationError("Invalid status for submission");
  }
  
  // 2. Capture snapshot
  const snapshot = await snapshotService.captureSnapshot(report);
  
  // 3. Compute checksum
  const checksum = snapshotService.computeChecksum(snapshot);
  
  // 4. Update report
  await db.update(financialReports)
    .set({
      reportData: snapshot,
      snapshotChecksum: checksum,
      snapshotTimestamp: new Date(),
      status: 'pending_daf_approval',
      locked: true,
      submittedBy: userId,
      submittedAt: new Date(),
    })
    .where(eq(financialReports.id, reportId));
  
  // 5. Create version record
  await createReportVersion(reportId, "1.0", snapshot, checksum);
  
  // 6. Lock the period
  await periodLockService.lockPeriod(
    report.reportingPeriodId,
    report.projectId,
    report.facilityId,
    userId,
    "Report submitted for approval"
  );
  
  // 7. Continue with existing workflow (notifications, etc.)
}
```

#### New GET /financial-reports/:id/versions

```typescript
interface GetVersionsResponse {
  reportId: number;
  currentVersion: string;
  versions: Array<{
    versionNumber: string;
    snapshotTimestamp: string;
    createdBy: string;
    changesSummary: string;
  }>;
}
```

#### New GET /financial-reports/:id/versions/:versionNumber

```typescript
interface GetVersionResponse {
  version: string;
  snapshotData: SnapshotData;
  snapshotTimestamp: string;
  createdBy: string;
}
```

#### New POST /financial-reports/:id/versions/compare

```typescript
interface CompareVersionsRequest {
  version1: string;
  version2: string;
}

interface CompareVersionsResponse {
  version1: string;
  version2: string;
  differences: Array<{
    lineCode: string;
    lineName: string;
    field: string; // "currentValue", "previousValue", etc.
    version1Value: number;
    version2Value: number;
    difference: number;
    percentageChange: number;
  }>;
  summary: {
    totalDifferences: number;
    significantChanges: number; // Changes > 5%
  };
}
```

#### New GET /period-locks

```typescript
interface GetPeriodLocksResponse {
  locks: Array<{
    reportingPeriodId: number;
    periodName: string;
    projectId: number;
    projectName: string;
    facilityId: number;
    facilityName: string;
    isLocked: boolean;
    lockedAt: string;
    lockedBy: string;
  }>;
}
```

#### New POST /period-locks/:id/unlock

```typescript
interface UnlockPeriodRequest {
  reason: string; // Required
}

interface UnlockPeriodResponse {
  success: boolean;
  message: string;
  periodLock: {
    id: number;
    isLocked: false;
    unlockedBy: string;
    unlockedAt: string;
  };
}
```

### 4. Service Layer

#### SnapshotService

```typescript
class SnapshotService {
  /**
   * Capture complete snapshot of report data
   */
  async captureSnapshot(report: FinancialReport): Promise<SnapshotData> {
    // 1. Get statement code from metadata
    const statementCode = report.metadata?.statementCode;
    
    // 2. Query source data
    const planningData = await this.getPlanningData(
      report.projectId,
      report.facilityId,
      report.reportingPeriodId
    );
    
    const executionData = await this.getExecutionData(
      report.projectId,
      report.facilityId,
      report.reportingPeriodId
    );
    
    // 3. Generate statement using existing logic
    const statement = await statementGenerator.generateStatement(
      statementCode,
      {
        projectType: report.project.projectType,
        facilityId: report.facilityId,
        reportingPeriodId: report.reportingPeriodId,
        includeComparatives: report.metadata?.includeComparatives,
      }
    );
    
    // 4. Build snapshot structure
    const snapshot: SnapshotData = {
      version: report.version,
      capturedAt: new Date().toISOString(),
      statementCode,
      statement: {
        lines: statement.lines,
        totals: statement.totals,
        metadata: statement.metadata,
      },
      sourceData: {
        planningEntries: planningData.map(entry => ({
          id: entry.id,
          formData: entry.formData,
          updatedAt: entry.updatedAt.toISOString(),
        })),
        executionEntries: executionData.map(entry => ({
          id: entry.id,
          formData: entry.formData,
          updatedAt: entry.updatedAt.toISOString(),
        })),
      },
      aggregations: {
        totalPlanning: statement.metadata.totalPlanning || 0,
        totalExecution: statement.metadata.totalExecution || 0,
        variance: statement.metadata.variance || 0,
        facilityBreakdown: statement.metadata.facilityBreakdown,
      },
      checksum: "", // Will be computed separately
    };
    
    return snapshot;
  }
  
  /**
   * Compute SHA-256 checksum of snapshot data
   */
  computeChecksum(snapshot: SnapshotData): string {
    const crypto = require('crypto');
    const snapshotString = JSON.stringify(snapshot);
    return crypto.createHash('sha256').update(snapshotString).digest('hex');
  }
  
  /**
   * Verify snapshot integrity
   */
  async verifyChecksum(reportId: number): Promise<boolean> {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });
    
    if (!report || !report.reportData || !report.snapshotChecksum) {
      return false;
    }
    
    const computedChecksum = this.computeChecksum(report.reportData);
    return computedChecksum === report.snapshotChecksum;
  }
  
  /**
   * Check if source data has changed since snapshot
   */
  async detectSourceDataChanges(reportId: number): Promise<boolean> {
    const report = await db.query.financialReports.findFirst({
      where: eq(financialReports.id, reportId),
    });
    
    if (!report || !report.reportData) {
      return false;
    }
    
    const snapshot = report.reportData as SnapshotData;
    
    // Check if any source entries have been updated after snapshot
    const planningIds = snapshot.sourceData.planningEntries.map(e => e.id);
    const executionIds = snapshot.sourceData.executionEntries.map(e => e.id);
    
    const updatedPlanning = await db.query.schemaFormDataEntries.findMany({
      where: and(
        inArray(schemaFormDataEntries.id, planningIds),
        gt(schemaFormDataEntries.updatedAt, new Date(snapshot.capturedAt))
      ),
    });
    
    const updatedExecution = await db.query.schemaFormDataEntries.findMany({
      where: and(
        inArray(schemaFormDataEntries.id, executionIds),
        gt(schemaFormDataEntries.updatedAt, new Date(snapshot.capturedAt))
      ),
    });
    
    return updatedPlanning.length > 0 || updatedExecution.length > 0;
  }
  
  /**
   * Get planning data for snapshot
   */
  private async getPlanningData(
    projectId: number,
    facilityId: number,
    reportingPeriodId: number
  ) {
    return await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.entityType, 'planning')
      ),
    });
  }
  
  /**
   * Get execution data for snapshot
   */
  private async getExecutionData(
    projectId: number,
    facilityId: number,
    reportingPeriodId: number
  ) {
    return await db.query.schemaFormDataEntries.findMany({
      where: and(
        eq(schemaFormDataEntries.projectId, projectId),
        eq(schemaFormDataEntries.facilityId, facilityId),
        eq(schemaFormDataEntries.reportingPeriodId, reportingPeriodId),
        eq(schemaFormDataEntries.entityType, 'execution')
      ),
    });
  }
}
```

#### PeriodLockService

```typescript
class PeriodLockService {
  /**
   * Lock a reporting period
   */
  async lockPeriod(
    reportingPeriodId: number,
    projectId: number,
    facilityId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    // Check if lock already exists
    const existingLock = await db.query.periodLocks.findFirst({
      where: and(
        eq(periodLocks.reportingPeriodId, reportingPeriodId),
        eq(periodLocks.projectId, projectId),
        eq(periodLocks.facilityId, facilityId)
      ),
    });
    
    if (existingLock) {
      // Update existing lock
      await db.update(periodLocks)
        .set({
          isLocked: true,
          lockedBy: userId,
          lockedAt: new Date(),
          lockedReason: reason,
        })
        .where(eq(periodLocks.id, existingLock.id));
    } else {
      // Create new lock
      const [newLock] = await db.insert(periodLocks).values({
        reportingPeriodId,
        projectId,
        facilityId,
        isLocked: true,
        lockedBy: userId,
        lockedReason: reason,
      }).returning();
      
      // Log the action
      await this.logLockAction(newLock.id, "LOCKED", userId, reason);
    }
  }
  
  /**
   * Unlock a reporting period (admin only)
   */
  async unlockPeriod(
    lockId: number,
    userId: number,
    reason: string
  ): Promise<void> {
    await db.update(periodLocks)
      .set({
        isLocked: false,
        unlockedBy: userId,
        unlockedAt: new Date(),
        unlockedReason: reason,
      })
      .where(eq(periodLocks.id, lockId));
    
    // Log the action
    await this.logLockAction(lockId, "UNLOCKED", userId, reason);
  }
  
  /**
   * Check if a period is locked
   */
  async isPeriodLocked(
    reportingPeriodId: number,
    projectId: number,
    facilityId: number
  ): Promise<boolean> {
    const lock = await db.query.periodLocks.findFirst({
      where: and(
        eq(periodLocks.reportingPeriodId, reportingPeriodId),
        eq(periodLocks.projectId, projectId),
        eq(periodLocks.facilityId, facilityId),
        eq(periodLocks.isLocked, true)
      ),
    });
    
    return !!lock;
  }
  
  /**
   * Validate if edit operation is allowed
   */
  async validateEditOperation(
    reportingPeriodId: number,
    projectId: number,
    facilityId: number,
    userId: number
  ): Promise<{ allowed: boolean; reason?: string }> {
    const isLocked = await this.isPeriodLocked(
      reportingPeriodId,
      projectId,
      facilityId
    );
    
    if (!isLocked) {
      return { allowed: true };
    }
    
    // Check if user has admin override permission
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    
    const hasOverride = user?.roles?.includes('admin') || 
                       user?.roles?.includes('system_admin');
    
    if (hasOverride) {
      return { allowed: true };
    }
    
    // Log the attempted edit
    const lock = await db.query.periodLocks.findFirst({
      where: and(
        eq(periodLocks.reportingPeriodId, reportingPeriodId),
        eq(periodLocks.projectId, projectId),
        eq(periodLocks.facilityId, facilityId)
      ),
    });
    
    if (lock) {
      await this.logLockAction(
        lock.id,
        "EDIT_ATTEMPTED",
        userId,
        "User attempted to edit locked period"
      );
    }
    
    return {
      allowed: false,
      reason: "This reporting period is locked due to an approved financial report. Contact an administrator to unlock.",
    };
  }
  
  /**
   * Log lock-related actions
   */
  private async logLockAction(
    periodLockId: number,
    action: string,
    userId: number,
    reason: string
  ): Promise<void> {
    await db.insert(periodLockAuditLog).values({
      periodLockId,
      action,
      performedBy: userId,
      reason,
    });
  }
  
  /**
   * Get all locks for a facility
   */
  async getLocksForFacility(facilityId: number): Promise<any[]> {
    return await db.query.periodLocks.findMany({
      where: eq(periodLocks.facilityId, facilityId),
      with: {
        reportingPeriod: true,
        project: true,
        facility: true,
      },
    });
  }
}
```

#### VersionService

```typescript
class VersionService {
  /**
   * Create a new report version
   */
  async createVersion(
    reportId: number,
    versionNumber: string,
    snapshotData: SnapshotData,
    checksum: string,
    userId: number,
    changesSummary?: string
  ): Promise<void> {
    await db.insert(reportVersions).values({
      reportId,
      versionNumber,
      snapshotData,
      snapshotChecksum: checksum,
      snapshotTimestamp: new Date(),
      createdBy: userId,
      changesSummary,
    });
  }
  
  /**
   * Get all versions for a report
   */
  async getVersions(reportId: number): Promise<any[]> {
    return await db.query.reportVersions.findMany({
      where: eq(reportVersions.reportId, reportId),
      orderBy: [desc(reportVersions.createdAt)],
      with: {
        creator: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
  
  /**
   * Get a specific version
   */
  async getVersion(reportId: number, versionNumber: string): Promise<any> {
    return await db.query.reportVersions.findFirst({
      where: and(
        eq(reportVersions.reportId, reportId),
        eq(reportVersions.versionNumber, versionNumber)
      ),
    });
  }
  
  /**
   * Compare two versions
   */
  async compareVersions(
    reportId: number,
    version1: string,
    version2: string
  ): Promise<any> {
    const v1 = await this.getVersion(reportId, version1);
    const v2 = await this.getVersion(reportId, version2);
    
    if (!v1 || !v2) {
      throw new Error("Version not found");
    }
    
    const snapshot1 = v1.snapshotData as SnapshotData;
    const snapshot2 = v2.snapshotData as SnapshotData;
    
    // Compare statement lines
    const differences = [];
    const linesMap1 = new Map(
      snapshot1.statement.lines.map(line => [line.code, line])
    );
    const linesMap2 = new Map(
      snapshot2.statement.lines.map(line => [line.code, line])
    );
    
    // Check all lines from both versions
    const allCodes = new Set([...linesMap1.keys(), ...linesMap2.keys()]);
    
    for (const code of allCodes) {
      const line1 = linesMap1.get(code);
      const line2 = linesMap2.get(code);
      
      if (!line1 || !line2) continue;
      
      // Compare current values
      if (line1.currentValue !== line2.currentValue) {
        differences.push({
          lineCode: code,
          lineName: line1.name,
          field: "currentValue",
          version1Value: line1.currentValue,
          version2Value: line2.currentValue,
          difference: line2.currentValue - line1.currentValue,
          percentageChange: line1.currentValue !== 0
            ? ((line2.currentValue - line1.currentValue) / line1.currentValue) * 100
            : 0,
        });
      }
      
      // Compare previous values if available
      if (line1.previousValue !== undefined && 
          line2.previousValue !== undefined &&
          line1.previousValue !== line2.previousValue) {
        differences.push({
          lineCode: code,
          lineName: line1.name,
          field: "previousValue",
          version1Value: line1.previousValue,
          version2Value: line2.previousValue,
          difference: line2.previousValue - line1.previousValue,
          percentageChange: line1.previousValue !== 0
            ? ((line2.previousValue - line1.previousValue) / line1.previousValue) * 100
            : 0,
        });
      }
    }
    
    return {
      version1,
      version2,
      differences,
      summary: {
        totalDifferences: differences.length,
        significantChanges: differences.filter(d => 
          Math.abs(d.percentageChange) > 5
        ).length,
      },
    };
  }
  
  /**
   * Increment version number
   */
  incrementVersion(currentVersion: string): string {
    const parts = currentVersion.split('.');
    const major = parseInt(parts[0]);
    const minor = parseInt(parts[1] || '0');
    
    return `${major}.${minor + 1}`;
  }
}
```

### 5. Client Components

#### SnapshotIndicator Component

```typescript
interface SnapshotIndicatorProps {
  isSnapshot: boolean;
  snapshotTimestamp?: string;
  isOutdated?: boolean;
}

export function SnapshotIndicator({
  isSnapshot,
  snapshotTimestamp,
  isOutdated,
}: SnapshotIndicatorProps) {
  if (!isSnapshot) {
    return (
      <Badge variant="outline" className="bg-blue-50">
        <Activity className="h-3 w-3 mr-1" />
        Live Data
      </Badge>
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary">
        <Camera className="h-3 w-3 mr-1" />
        Snapshot
      </Badge>
      {snapshotTimestamp && (
        <span className="text-xs text-muted-foreground">
          Captured: {formatDate(snapshotTimestamp)}
        </span>
      )}
      {isOutdated && (
        <Badge variant="warning">
          <AlertCircle className="h-3 w-3 mr-1" />
          Source data changed
        </Badge>
      )}
    </div>
  );
}
```

#### PeriodLockBadge Component

```typescript
interface PeriodLockBadgeProps {
  isLocked: boolean;
  lockedAt?: string;
  lockedBy?: string;
}

export function PeriodLockBadge({
  isLocked,
  lockedAt,
  lockedBy,
}: PeriodLockBadgeProps) {
  if (!isLocked) {
    return null;
  }
  
  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant="destructive">
          <Lock className="h-3 w-3 mr-1" />
          Period Locked
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-sm">
          <p>This period is locked due to an approved report.</p>
          {lockedBy && <p className="text-muted-foreground">Locked by: {lockedBy}</p>}
          {lockedAt && <p className="text-muted-foreground">Locked: {formatDate(lockedAt)}</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
```

#### VersionComparison Component

```typescript
interface VersionComparisonProps {
  reportId: number;
  version1: string;
  version2: string;
}

export function VersionComparison({
  reportId,
  version1,
  version2,
}: VersionComparisonProps) {
  const { data, isLoading } = useVersionComparison(reportId, version1, version2);
  
  if (isLoading) {
    return <Skeleton className="h-96" />;
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Version Comparison</h3>
        <div className="flex gap-2">
          <Badge>{version1}</Badge>
          <ArrowRight className="h-4 w-4" />
          <Badge>{version2}</Badge>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Differences</p>
              <p className="text-2xl font-bold">{data.summary.totalDifferences}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Significant Changes (&gt;5%)</p>
              <p className="text-2xl font-bold">{data.summary.significantChanges}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Line</TableHead>
            <TableHead>Field</TableHead>
            <TableHead className="text-right">{version1}</TableHead>
            <TableHead className="text-right">{version2}</TableHead>
            <TableHead className="text-right">Difference</TableHead>
            <TableHead className="text-right">% Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.differences.map((diff, index) => (
            <TableRow key={index}>
              <TableCell>{diff.lineName}</TableCell>
              <TableCell>{diff.field}</TableCell>
              <TableCell className="text-right">
                {formatCurrency(diff.version1Value)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(diff.version2Value)}
              </TableCell>
              <TableCell className="text-right">
                <span className={diff.difference > 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(diff.difference)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <span className={Math.abs(diff.percentageChange) > 5 ? "font-bold" : ""}>
                  {diff.percentageChange.toFixed(2)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

#### Modified FinancialReportViewer Component

```typescript
export function FinancialReportViewer({ reportId }: { reportId: number }) {
  const { data: report, isLoading } = useFinancialReport(reportId);
  
  // Determine if we should use snapshot or live data
  const useSnapshot = report?.status !== 'draft';
  
  // Load appropriate data
  const { data: statementData } = useStatementData({
    reportId,
    useSnapshot,
  });
  
  return (
    <div className="space-y-4">
      {/* Snapshot indicator */}
      <SnapshotIndicator
        isSnapshot={useSnapshot}
        snapshotTimestamp={report?.snapshotTimestamp}
        isOutdated={report?.isOutdated}
      />
      
      {/* Period lock indicator */}
      {report?.periodLock && (
        <PeriodLockBadge
          isLocked={report.periodLock.isLocked}
          lockedAt={report.periodLock.lockedAt}
          lockedBy={report.periodLock.lockedBy}
        />
      )}
      
      {/* Statement display */}
      <StatementTable data={statementData} />
      
      {/* Version history */}
      {report?.versions && report.versions.length > 1 && (
        <VersionHistory reportId={reportId} versions={report.versions} />
      )}
    </div>
  );
}
```

## Data Models

### TypeScript Interfaces

```typescript
interface SnapshotData {
  version: string;
  capturedAt: string;
  statementCode: string;
  statement: {
    lines: StatementLine[];
    totals: Record<string, number>;
    metadata: StatementMetadata;
  };
  sourceData: {
    planningEntries: SourceDataEntry[];
    executionEntries: SourceDataEntry[];
  };
  aggregations: {
    totalPlanning: number;
    totalExecution: number;
    variance: number;
    facilityBreakdown?: FacilityBreakdownItem[];
  };
  checksum: string;
}

interface SourceDataEntry {
  id: number;
  formData: any;
  updatedAt: string;
}

interface ReportVersion {
  id: number;
  reportId: number;
  versionNumber: string;
  snapshotData: SnapshotData;
  snapshotChecksum: string;
  snapshotTimestamp: string;
  createdBy: number;
  createdAt: string;
  changesSummary: string | null;
}

interface PeriodLock {
  id: number;
  reportingPeriodId: number;
  projectId: number;
  facilityId: number;
  isLocked: boolean;
  lockedBy: number;
  lockedAt: string;
  lockedReason: string;
  unlockedBy: number | null;
  unlockedAt: string | null;
  unlockedReason: string | null;
}

interface PeriodLockAuditEntry {
  id: number;
  periodLockId: number;
  action: "LOCKED" | "UNLOCKED" | "EDIT_ATTEMPTED";
  performedBy: number;
  performedAt: string;
  reason: string;
  metadata: any;
}
```

## Error Handling

### Validation Errors

```typescript
// Period lock validation
if (await periodLockService.isPeriodLocked(reportingPeriodId, projectId, facilityId)) {
  throw new ValidationError(
    "Cannot edit data in locked period. This period is locked due to an approved financial report."
  );
}

// Checksum validation
if (!await snapshotService.verifyChecksum(reportId)) {
  throw new IntegrityError(
    "Snapshot integrity check failed. Report data may be corrupted."
  );
}

// Version validation
if (versionNumber && !isValidVersionFormat(versionNumber)) {
  throw new ValidationError(
    "Invalid version format. Expected format: X.Y (e.g., 1.0, 1.1)"
  );
}
```

### Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  details?: string;
  statusCode: number;
}
```

## Testing Strategy

### Unit Tests

1. **SnapshotService Tests**
   - Snapshot capture with complete data
   - Checksum computation and verification
   - Source data change detection
   - Snapshot integrity validation

2. **PeriodLockService Tests**
   - Lock creation and updates
   - Lock validation logic
   - Admin override permissions
   - Audit log creation

3. **VersionService Tests**
   - Version creation
   - Version comparison logic
   - Version number incrementing
   - Difference calculation

### Integration Tests

1. **Snapshot Workflow Tests**
   - Submit report → Capture snapshot → Verify data
   - View draft report → Live data displayed
   - View submitted report → Snapshot data displayed
   - Source data changes → Outdated flag set

2. **Period Lock Tests**
   - Report approved → Period locked
   - Edit attempt on locked period → Rejected
   - Admin unlock → Edit allowed
   - Audit log created for all actions

3. **Version Control Tests**
   - Resubmit report → New version created
   - Compare versions → Differences calculated
   - Multiple versions → History maintained

### Client Component Tests

1. **UI State Tests**
   - Snapshot indicator displays correctly
   - Period lock badge shows for locked periods
   - Version comparison renders differences
   - Live data badge shows for drafts

2. **Action Tests**
   - Submit creates snapshot
   - Unlock period requires admin role
   - Version comparison loads data

## Implementation Notes

### Database Migration

```sql
-- Add snapshot fields to financial_reports
ALTER TABLE financial_reports
ADD COLUMN snapshot_checksum VARCHAR(64),
ADD COLUMN snapshot_timestamp TIMESTAMP,
ADD COLUMN source_data_version VARCHAR(20),
ADD COLUMN is_outdated BOOLEAN DEFAULT FALSE;

-- Create report_versions table
CREATE TABLE report_versions (
  id SERIAL PRIMARY KEY,
  report_id INTEGER NOT NULL REFERENCES financial_reports(id) ON DELETE CASCADE,
  version_number VARCHAR(20) NOT NULL,
  snapshot_data JSONB NOT NULL,
  snapshot_checksum VARCHAR(64) NOT NULL,
  snapshot_timestamp TIMESTAMP NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  changes_summary TEXT,
  UNIQUE(report_id, version_number)
);

CREATE INDEX idx_report_versions_report_id ON report_versions(report_id);

-- Create period_locks table
CREATE TABLE period_locks (
  id SERIAL PRIMARY KEY,
  reporting_period_id INTEGER NOT NULL REFERENCES reporting_periods(id) ON DELETE CASCADE,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  is_locked BOOLEAN DEFAULT TRUE,
  locked_by INTEGER REFERENCES users(id),
  locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  locked_reason TEXT,
  unlocked_by INTEGER REFERENCES users(id),
  unlocked_at TIMESTAMP,
  unlocked_reason TEXT,
  UNIQUE(reporting_period_id, project_id, facility_id)
);

CREATE INDEX idx_period_locks_period ON period_locks(reporting_period_id);
CREATE INDEX idx_period_locks_facility ON period_locks(facility_id);

-- Create period_lock_audit_log table
CREATE TABLE period_lock_audit_log (
  id SERIAL PRIMARY KEY,
  period_lock_id INTEGER NOT NULL REFERENCES period_locks(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,
  performed_by INTEGER NOT NULL REFERENCES users(id),
  performed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reason TEXT,
  metadata JSONB
);

CREATE INDEX idx_lock_audit_period_lock ON period_lock_audit_log(period_lock_id);
CREATE INDEX idx_lock_audit_timestamp ON period_lock_audit_log(performed_at);
```

### Middleware for Period Lock Validation

```typescript
// Add to planning and execution edit endpoints
export const validatePeriodLock = async (c: Context, next: Next) => {
  const { reportingPeriodId, projectId, facilityId } = c.req.param();
  const userId = c.get('userId');
  
  const validation = await periodLockService.validateEditOperation(
    reportingPeriodId,
    projectId,
    facilityId,
    userId
  );
  
  if (!validation.allowed) {
    return c.json({
      error: "Period Locked",
      message: validation.reason,
    }, HttpStatusCodes.FORBIDDEN);
  }
  
  await next();
};
```

### Background Job for Outdated Detection

```typescript
// Run periodically to check for outdated reports
async function detectOutdatedReports() {
  const submittedReports = await db.query.financialReports.findMany({
    where: or(
      eq(financialReports.status, 'pending_daf_approval'),
      eq(financialReports.status, 'approved_by_daf')
    ),
  });
  
  for (const report of submittedReports) {
    const hasChanges = await snapshotService.detectSourceDataChanges(report.id);
    
    if (hasChanges && !report.isOutdated) {
      await db.update(financialReports)
        .set({ isOutdated: true })
        .where(eq(financialReports.id, report.id));
    }
  }
}
```

## Security Considerations

1. **Snapshot Integrity**: Use SHA-256 checksums to detect tampering
2. **Period Lock Enforcement**: Validate at API layer before any data modification
3. **Admin Override Audit**: Log all unlock operations with user and reason
4. **Version History**: Preserve all versions for audit trail
5. **Access Control**: Verify user has access to facility/project before operations

## Performance Considerations

1. **Snapshot Size**: Compress large snapshots using JSONB compression
2. **Checksum Computation**: Compute asynchronously for large reports
3. **Period Lock Checks**: Cache lock status to reduce database queries
4. **Version Comparison**: Limit comparison to significant fields only
5. **Indexing**: Add indexes on frequently queried fields (period_id, facility_id)

## Migration Strategy

1. **Phase 1**: Add database tables and columns
2. **Phase 2**: Implement snapshot capture on submission
3. **Phase 3**: Implement display logic (snapshot vs live)
4. **Phase 4**: Implement period locking
5. **Phase 5**: Implement version control and comparison
6. **Phase 6**: Add client UI components
7. **Phase 7**: Backfill existing reports with snapshots (optional)
