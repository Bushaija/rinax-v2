-- ============================================================================
-- Snapshot Integrity Testing SQL Script
-- Task 22: Add Snapshot Integrity Validation
-- ============================================================================

-- ============================================================================
-- STEP 1: Check Current Reports
-- ============================================================================
-- View all submitted reports with snapshots
SELECT 
  id,
  report_code,
  title,
  status,
  snapshot_checksum,
  snapshot_timestamp,
  is_outdated,
  LENGTH(snapshot_checksum) as checksum_length,
  CASE 
    WHEN snapshot_checksum IS NULL THEN 'No Snapshot'
    WHEN LENGTH(snapshot_checksum) = 64 THEN 'Valid Checksum'
    ELSE 'Invalid Checksum'
  END as checksum_status
FROM financial_reports
WHERE status IN ('pending_daf_approval', 'approved_by_daf', 'pending_dg_approval', 'fully_approved')
ORDER BY id DESC
LIMIT 10;

-- ============================================================================
-- STEP 2: Select a Report to Test
-- ============================================================================
-- Replace <REPORT_ID> with an actual report ID from above
-- Example: \set report_id 1

-- View specific report details
SELECT 
  id,
  report_code,
  title,
  status,
  snapshot_checksum,
  snapshot_timestamp,
  is_outdated,
  jsonb_pretty(report_data::jsonb) as snapshot_preview
FROM financial_reports
WHERE id = <REPORT_ID>;

-- ============================================================================
-- STEP 3: Simulate Corruption (FOR TESTING ONLY)
-- ============================================================================
-- WARNING: This will corrupt the snapshot data!
-- Only use on test data, not production!

-- Backup the original data first
CREATE TEMP TABLE IF NOT EXISTS report_backup AS
SELECT * FROM financial_reports WHERE id = <REPORT_ID>;

-- Corrupt the snapshot by adding a test field
UPDATE financial_reports
SET report_data = jsonb_set(
  report_data::jsonb,
  '{test_corruption}',
  '"This data was added to test corruption detection"'::jsonb
)
WHERE id = <REPORT_ID>;

-- Verify corruption was applied
SELECT 
  id,
  snapshot_checksum,
  report_data::jsonb->'test_corruption' as corruption_marker
FROM financial_reports
WHERE id = <REPORT_ID>;

-- ============================================================================
-- STEP 4: Test Corruption Detection
-- ============================================================================
-- Now try to view the report in the application
-- The server should:
-- 1. Detect checksum mismatch
-- 2. Log critical error
-- 3. Return error response
-- 4. Prevent display of corrupted data

-- Check server logs for:
-- [CRITICAL] Snapshot integrity validation failed for report <REPORT_ID>
-- [ADMIN NOTIFICATION] Snapshot corruption detected

-- ============================================================================
-- STEP 5: Verify Error Response
-- ============================================================================
-- The API should return:
-- {
--   "error": "SNAPSHOT_CORRUPTED",
--   "message": "Snapshot integrity check failed. Report data may be corrupted.",
--   "reportId": <REPORT_ID>,
--   "reportStatus": "pending_daf_approval"
-- }

-- ============================================================================
-- STEP 6: Restore Original Data
-- ============================================================================
-- Remove the corruption
UPDATE financial_reports
SET report_data = report_data::jsonb - 'test_corruption'
WHERE id = <REPORT_ID>;

-- Verify restoration
SELECT 
  id,
  snapshot_checksum,
  report_data::jsonb->'test_corruption' as corruption_marker
FROM financial_reports
WHERE id = <REPORT_ID>;

-- Should show NULL for corruption_marker

-- ============================================================================
-- STEP 7: Verify Fixed Report Works
-- ============================================================================
-- Now try to view the report again
-- It should work correctly since we removed the corruption

-- ============================================================================
-- STEP 8: Alternative Corruption Test (Modify Existing Data)
-- ============================================================================
-- Instead of adding a field, modify existing data

-- Corrupt by changing a value in the snapshot
UPDATE financial_reports
SET report_data = jsonb_set(
  report_data::jsonb,
  '{version}',
  '"999.999"'::jsonb
)
WHERE id = <REPORT_ID>;

-- Test detection again, then restore:
UPDATE financial_reports
SET report_data = (SELECT report_data FROM report_backup)
WHERE id = <REPORT_ID>;

-- ============================================================================
-- STEP 9: Clean Up
-- ============================================================================
-- Drop temporary backup table
DROP TABLE IF EXISTS report_backup;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if report has valid snapshot structure
SELECT 
  id,
  report_code,
  CASE 
    WHEN report_data IS NULL THEN 'No Snapshot'
    WHEN report_data::jsonb ? 'version' THEN 'Has Version'
    ELSE 'Invalid Structure'
  END as snapshot_structure,
  CASE 
    WHEN report_data::jsonb ? 'checksum' THEN 'Has Checksum Field'
    ELSE 'No Checksum Field'
  END as checksum_field,
  CASE 
    WHEN snapshot_checksum IS NOT NULL THEN 'Has Stored Checksum'
    ELSE 'No Stored Checksum'
  END as stored_checksum
FROM financial_reports
WHERE id = <REPORT_ID>;

-- Check report versions (if any)
SELECT 
  id,
  report_id,
  version_number,
  snapshot_checksum,
  snapshot_timestamp,
  created_at,
  changes_summary
FROM report_versions
WHERE report_id = <REPORT_ID>
ORDER BY created_at DESC;

-- Check period locks (if any)
SELECT 
  pl.id,
  pl.reporting_period_id,
  pl.project_id,
  pl.facility_id,
  pl.is_locked,
  pl.locked_by,
  pl.locked_at,
  pl.locked_reason
FROM period_locks pl
JOIN financial_reports fr ON 
  fr.reporting_period_id = pl.reporting_period_id AND
  fr.project_id = pl.project_id AND
  fr.facility_id = pl.facility_id
WHERE fr.id = <REPORT_ID>;

-- ============================================================================
-- USEFUL QUERIES FOR DEBUGGING
-- ============================================================================

-- Find all corrupted reports (if any were marked)
SELECT 
  id,
  report_code,
  status,
  snapshot_checksum,
  is_outdated
FROM financial_reports
WHERE 
  status IN ('pending_daf_approval', 'approved_by_daf', 'pending_dg_approval', 'fully_approved')
  AND snapshot_checksum IS NOT NULL
ORDER BY id DESC;

-- Check snapshot data size
SELECT 
  id,
  report_code,
  pg_size_pretty(pg_column_size(report_data)) as snapshot_size,
  jsonb_typeof(report_data::jsonb) as data_type
FROM financial_reports
WHERE snapshot_checksum IS NOT NULL
ORDER BY pg_column_size(report_data) DESC
LIMIT 10;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Always backup data before testing corruption
-- 2. Only test on development/test databases
-- 3. Check server logs after each corruption test
-- 4. Verify admin notifications are logged
-- 5. Test both generateStatement and getOne endpoints
-- 6. Restore data after testing

-- ============================================================================
-- EXPECTED BEHAVIOR
-- ============================================================================
-- When snapshot is valid:
--   - Report displays normally
--   - No errors in logs
--   - Checksum validation passes silently
--
-- When snapshot is corrupted:
--   - Critical error logged
--   - Admin notification logged
--   - Error response returned to client
--   - Report content NOT displayed
--   - User sees corruption error dialog (if integrated)
