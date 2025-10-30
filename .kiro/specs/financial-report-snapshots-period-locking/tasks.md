# Implementation Plan

- [x] 1. Database Schema Setup





  - Create migration files for new tables and columns
  - Add `snapshot_checksum`, `snapshot_timestamp`, `source_data_version`, `is_outdated` columns to `financial_reports` table
  - Create `report_versions` table with all required fields and foreign keys
  - Create `period_locks` table with unique constraint on period/project/facility combination
  - Create `period_lock_audit_log` table with foreign keys and indexes
  - Add indexes for performance optimization on frequently queried fields
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 2. Implement Snapshot Service





  - Create `SnapshotService` class in `apps/server/src/lib/services/snapshot-service.ts`
  - Implement `captureSnapshot()` method to query planning and execution data
  - Integrate with existing `statementGenerator.generateStatement()` to build complete snapshot
  - Implement `computeChecksum()` method using SHA-256 hashing
  - Implement `verifyChecksum()` method for integrity validation
  - Implement `detectSourceDataChanges()` method to compare timestamps
  - Add helper methods `getPlanningData()` and `getExecutionData()`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3. Implement Period Lock Service





  - Create `PeriodLockService` class in `apps/server/src/lib/services/period-lock-service.ts`
  - Implement `lockPeriod()` method to create or update period locks
  - Implement `unlockPeriod()` method with admin permission check
  - Implement `isPeriodLocked()` method to check lock status
  - Implement `validateEditOperation()` method with role-based validation
  - Implement `logLockAction()` private method for audit logging
  - Implement `getLocksForFacility()` method for querying locks
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_




- [ ] 4. Implement Version Service

  - Create `VersionService` class in `apps/server/src/lib/services/version-service.ts`
  - Implement `createVersion()` method to store report versions
  - Implement `getVersions()` method to retrieve version history
  - Implement `getVersion()` method to retrieve specific version


  - Implement `compareVersions()` method with line-by-line difference calculation
  - Implement `incrementVersion()` helper method for version numbering
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5. Modify Submit for Approval Handler

  - Update `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`
  - Modify `submitForApproval` handler to call `snapshotService.captureSnapshot()`
  - Add checksum computation and storage in database




  - Add snapshot timestamp recording
  - Call `versionService.createVersion()` to create initial version "1.0"
  - Call `periodLockService.lockPeriod()` after successful submission
  - Update report fields: `reportData`, `snapshotChecksum`, `snapshotTimestamp`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1_

- [ ] 6. Create Period Lock Validation Middleware

  - Create `apps/server/src/api/middleware/validate-period-lock.ts`
  - Implement middleware function that extracts period/project/facility from request
  - Call `periodLockService.validateEditOperation()` to check lock status
  - Return 403 Forbidden if period is locked and user lacks override permission
  - Add audit logging for failed edit attempts
  - _Requirements: 6.2, 6.3, 6.4, 9.3_

- [x] 7. Apply Period Lock Middleware to Edit Endpoints





  - Add period lock middleware to planning data edit endpoints
  - Add period lock middleware to execution data edit endpoints
  - Add period lock middleware to data deletion endpoints
  - Ensure middleware runs before data modification logic
  - _Requirements: 6.2, 6.3, 6.4_

- [x] 8. Implement Period Lock API Endpoints





  - Create `GET /period-locks` endpoint to list all locks for a facility
  - Create `POST /period-locks/:id/unlock` endpoint for admin unlock
  - Create `GET /period-locks/audit/:id` endpoint to view audit log
  - Add request/response schemas in `financial-reports.types.ts`
  - Add route definitions in `financial-reports.routes.ts`
  - Implement handlers in `financial-reports.handlers.ts`
  - _Requirements: 6.5, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5_




- [ ] 9. Implement Version Control API Endpoints

  - Create `GET /financial-reports/:id/versions` endpoint to list versions
  - Create `GET /financial-reports/:id/versions/:versionNumber` endpoint to get specific version
  - Create `POST /financial-reports/:id/versions/compare` endpoint for version comparison
  - Add request/response schemas in `financial-reports.types.ts`



  - Add route definitions in `financial-reports.routes.ts`
  - Implement handlers in `financial-reports.handlers.ts`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 10. Modify Report Display Logic

  - Update `generateStatement` handler to check report status



  - If status is 'draft', use existing live data generation logic
  - If status is submitted/approved, return snapshot data from `reportData` field
  - Add `isSnapshot` flag to response metadata
  - Add `snapshotTimestamp` to response metadata
  - Add `isOutdated` flag to response metadata
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_




- [ ] 11. Implement Outdated Report Detection

  - Create background job function `detectOutdatedReports()` in `apps/server/src/jobs/detect-outdated-reports.ts`
  - Query all submitted/approved reports
  - For each report, call `snapshotService.detectSourceDataChanges()`

  - Update `is_outdated` flag if source data has changed
  - Schedule job to run periodically (e.g., every hour)
  - _Requirements: 5.1, 5.2_

- [ ] 12. Create Snapshot Indicator Component

  - Create `apps/client/components/reports/snapshot-indicator.tsx`
  - Display "Live Data" badge for draft reports
  - Display "Snapshot" badge with timestamp for submitted/approved reports
  - Display "Source data changed" warning badge if report is outdated
  - Add tooltips with additional information
  - _Requirements: 3.5, 5.2_

- [x] 13. Create Period Lock Badge Component



  - Create `apps/client/components/reports/period-lock-badge.tsx`
  - Display lock icon and "Period Locked" badge when period is locked
  - Add tooltip showing who locked the period and when
  - Add explanation text about why period is locked
  - _Requirements: 7.1, 7.2, 7.3, 7.4_





- [ ] 14. Create Version Comparison Component

  - Create `apps/client/components/reports/version-comparison.tsx`
  - Display version selector dropdowns for choosing two versions
  - Show summary card with total differences and significant changes
  - Display table with line-by-line differences
  - Highlight significant changes (>5%) in bold



  - Color-code positive/negative differences
  - Add export functionality for comparison report
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 15. Create Version History Component




  - Create `apps/client/components/reports/version-history.tsx`
  - Display list of all report versions with timestamps
  - Show version number, created by, and changes summary
  - Add "View" button to load specific version
  - Add "Compare" button to compare with current version
  - _Requirements: 5.3, 5.4, 8.1, 8.2_




- [ ] 16. Update Financial Report Viewer Component

  - Modify `apps/client/components/reports/financial-report-viewer.tsx`
  - Add `SnapshotIndicator` component at top of report
  - Add `PeriodLockBadge` component if period is locked
  - Conditionally load snapshot or live data based on report status


  - Add version history section at bottom if multiple versions exist
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4_

- [ ] 17. Create Period Lock Management UI

  - Create `apps/client/components/admin/period-lock-management.tsx`
  - Display table of all locked periods for current facility




  - Show period name, project, lock status, locked by, locked date
  - Add "Unlock" button for admin users
  - Add modal dialog for unlock reason input
  - Display audit log for each period lock
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 18. Add Client-Side Hooks for Snapshots and Locks

  - Create `apps/client/hooks/queries/financial-reports/use-report-versions.ts`
  - Create `apps/client/hooks/queries/financial-reports/use-version-comparison.ts`
  - Create `apps/client/hooks/queries/period-locks/use-period-locks.ts`
  - Create `apps/client/hooks/mutations/period-locks/use-unlock-period.ts`
  - Implement React Query hooks with proper caching and invalidation
  - _Requirements: 5.3, 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

- [ ] 19. Add Client-Side Fetchers

  - Create `apps/client/fetchers/financial-reports/get-report-versions.ts`
  - Create `apps/client/fetchers/financial-reports/compare-versions.ts`
  - Create `apps/client/fetchers/period-locks/get-period-locks.ts`
  - Create `apps/client/fetchers/period-locks/unlock-period.ts`
  - Implement API calls with proper error handling
  - _Requirements: 5.3, 5.4, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2_

- [x] 20. Update TypeScript Types





  - Add `SnapshotData` interface in `apps/client/types/financial-reports.ts`
  - Add `ReportVersion` interface
  - Add `PeriodLock` interface
  - Add `PeriodLockAuditEntry` interface
  - Add `VersionComparison` interface
  - Update `FinancialReport` interface with new snapshot fields
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_
-

- [x] 21. Add Error Handling for Period Locks




  - Update planning edit forms to catch period lock errors
  - Display user-friendly error message when edit is blocked
  - Show period lock information in error dialog
  - Add link to contact administrator for unlock request
  - Update execution edit forms with same error handling
  - _Requirements: 6.2, 6.3, 6.4, 7.1, 7.2, 7.3, 7.4_

- [x] 22. Add Snapshot Integrity Validation





  - Add checksum verification before displaying snapshot data
  - Log critical error if checksum validation fails
  - Display error message to user if snapshot is corrupted
  - Prevent display of corrupted reports
  - Add admin notification for integrity failures
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 23. Write Integration Tests for Snapshot Workflow
  - Test complete workflow: submit → capture snapshot → verify data
  - Test draft report displays live data
  - Test submitted report displays snapshot data
  - Test source data changes set outdated flag
  - Test checksum computation and verification
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 24. Write Integration Tests for Period Locking
  - Test report approval locks period
  - Test edit attempt on locked period is rejected
  - Test admin unlock allows editing
  - Test audit log creation for all actions
  - Test period lock validation middleware
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 25. Write Integration Tests for Version Control
  - Test resubmit creates new version
  - Test version comparison calculates differences correctly
  - Test version history retrieval
  - Test version number incrementing
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 26. Update Documentation
  - Document snapshot capture process in code comments
  - Document period locking mechanism
  - Document version control workflow
  - Add API endpoint documentation for new routes
  - Update user guide with snapshot and lock information
  - _Requirements: All_
