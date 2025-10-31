# Testing Guide: Snapshot Integrity Validation (Task 22)

## Quick Start

### 1. Prerequisites ✅

Before testing, ensure the database migration is applied:

```bash
cd apps/server
pnpm db:migrate
```

Verify columns exist:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'financial_reports' 
AND column_name IN ('snapshot_checksum', 'snapshot_timestamp', 'is_outdated');
```

### 2. Create Test Report 📝

1. Go to dashboard
2. Click "Create Report for Approval"
3. Fill in:
   - Statement Code: REV_EXP
   - Reporting Period: Any period
   - Project Type: HIV
4. Click "Create Report"
5. Note the report ID

### 3. Add Test Data 📊

Add some planning or execution data to the report so there's something to snapshot.

### 4. Submit Report ✅

1. Open the report
2. Click "Submit for Approval"
3. This will:
   - Capture snapshot
   - Compute checksum
   - Lock the period
   - Create version 1.0

### 5. Verify Snapshot Created 🔍

```sql
SELECT 
  id,
  status,
  snapshot_checksum,
  snapshot_timestamp,
  LENGTH(snapshot_checksum) as checksum_length
FROM financial_reports
WHERE id = <your_report_id>;
```

Expected:
- status: `pending_daf_approval`
- snapshot_checksum: 64-character hex string
- snapshot_timestamp: Recent timestamp
- checksum_length: 64

### 6. Test Valid Snapshot ✅

Try to view the report:
- Go to `/dashboard/financial-reports/<report_id>`
- Report should display normally
- No errors in console
- Check server logs: No errors

### 7. Test Corruption Detection 🔴

Corrupt the snapshot:
```sql
UPDATE financial_reports
SET report_data = jsonb_set(
  report_data::jsonb,
  '{corrupted}',
  '"true"'::jsonb
)
WHERE id = <your_report_id>;
```

Try to view the report again:
- Should see error (500 or corruption message)
- Check server logs for:
  ```
  [CRITICAL] Snapshot integrity validation failed for report <id>
  [ADMIN NOTIFICATION] Snapshot corruption detected
  ```

### 8. Restore Report ✅

Remove corruption:
```sql
UPDATE financial_reports
SET report_data = report_data::jsonb - 'corrupted'
WHERE id = <your_report_id>;
```

View report again - should work normally.

## Test Scenarios

### ✅ Scenario 1: Normal Flow
- Create report → Add data → Submit → View
- **Expected:** Everything works, snapshot is valid

### 🔴 Scenario 2: Corrupted Snapshot
- Submit report → Corrupt data → Try to view
- **Expected:** Error logged, report blocked

### ✅ Scenario 3: Draft Report
- Create report → Don't submit → View
- **Expected:** Works normally (no snapshot validation)

### ✅ Scenario 4: Restored Report
- Corrupt → Restore → View
- **Expected:** Works after restoration

## What to Check

### Server Logs ✅
Look for:
- `[CRITICAL] Snapshot integrity validation failed`
- `[ADMIN NOTIFICATION] Snapshot corruption detected`
- `Checksum mismatch for report`

### API Responses ✅

**Valid Snapshot:**
```json
{
  "statement": { ... },
  "snapshotMetadata": {
    "isSnapshot": true,
    "snapshotTimestamp": "2024-...",
    "isOutdated": false
  }
}
```

**Corrupted Snapshot:**
```json
{
  "error": "SNAPSHOT_CORRUPTED",
  "message": "Snapshot integrity check failed...",
  "reportId": 123,
  "reportStatus": "pending_daf_approval"
}
```

### Database ✅
```sql
-- Check snapshot exists
SELECT snapshot_checksum, snapshot_timestamp 
FROM financial_reports 
WHERE id = <id>;

-- Check version created
SELECT * FROM report_versions 
WHERE report_id = <id>;

-- Check period locked
SELECT * FROM period_locks 
WHERE reporting_period_id = (
  SELECT reporting_period_id 
  FROM financial_reports 
  WHERE id = <id>
);
```

## Quick Test Commands

### Check Report
```sql
SELECT id, status, snapshot_checksum, is_outdated
FROM financial_reports
WHERE id = <id>;
```

### Corrupt Report
```sql
UPDATE financial_reports
SET report_data = jsonb_set(report_data::jsonb, '{test}', '"corrupted"')
WHERE id = <id>;
```

### Restore Report
```sql
UPDATE financial_reports
SET report_data = report_data::jsonb - 'test'
WHERE id = <id>;
```

### View Logs
Check your server terminal for error messages.

## Success Criteria

✅ **Task 22 is working if:**

1. Valid snapshots display without errors
2. Corrupted snapshots are detected
3. Critical errors are logged
4. Admin notifications are logged
5. Error responses are returned
6. Draft reports work normally
7. Restored reports work correctly

## Troubleshooting

### Issue: "column snapshot_checksum does not exist"
**Solution:** Run database migration: `pnpm db:migrate`

### Issue: No snapshot created on submission
**Solution:** Check `submitForApproval` in workflow service

### Issue: Corruption not detected
**Solution:** Verify checksum is being computed and stored

### Issue: All reports show as corrupted
**Solution:** Check if checksums are being computed correctly

## Files for Reference

- **Test Plan:** `TASK_22_TEST_PLAN.md`
- **SQL Script:** `test-snapshot-integrity.sql`
- **Implementation:** `TASK_22_COMPLETION_SUMMARY.md`
- **Documentation:** `apps/client/components/errors/SNAPSHOT_CORRUPTION_ERROR_HANDLING.md`

## Next Steps After Testing

1. ✅ Verify all tests pass
2. 📝 Document any issues found
3. 🔧 Fix any bugs discovered
4. 🎨 Integrate corruption dialog into UI
5. 📧 Consider implementing email notifications
6. 🚀 Deploy to staging/production

## Quick Test Checklist

- [ ] Database migration applied
- [ ] Report created and submitted
- [ ] Snapshot checksum stored (64 chars)
- [ ] Valid report displays correctly
- [ ] Corrupted report is blocked
- [ ] Critical error logged
- [ ] Admin notification logged
- [ ] Draft reports work normally
- [ ] Restored reports work correctly

---

**Ready to test?** Start with Step 1 and work through the guide!
