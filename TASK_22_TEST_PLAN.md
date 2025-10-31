# Task 22 Test Plan: Snapshot Integrity Validation

## Prerequisites

Before testing, ensure:
- ✅ Database migration has been applied (`pnpm db:migrate`)
- ✅ Server is running
- ✅ Client is running
- ✅ You have a test report with data

## Test Scenarios

### Test 1: Normal Submission Flow (Baseline)

**Purpose:** Verify that normal submission works and creates valid snapshots

**Steps:**
1. Create a new financial report
2. Add some planning and execution data
3. Submit the report for approval
4. View the submitted report

**Expected Results:**
- ✅ Report submits successfully
- ✅ Snapshot is captured
- ✅ Checksum is computed and stored
- ✅ Report displays correctly (using snapshot data)
- ✅ No corruption errors

**Verification:**
```sql
-- Check snapshot was created
SELECT id, status, snapshot_checksum, snapshot_timestamp, is_outdated
FROM financial_reports
WHERE id = <your_report_id>;

-- Should show:
-- - status: 'pending_daf_approval'
-- - snapshot_checksum: 64-character hex string
-- - snapshot_timestamp: timestamp when submitted
-- - is_outdated: false
```

---

### Test 2: Snapshot Integrity Validation (Valid Snapshot)

**Purpose:** Verify that valid snapshots pass integrity checks

**Steps:**
1. Use a report from Test 1 (with valid snapshot)
2. Try to view the report via:
   - Direct report view: `/dashboard/financial-reports/{id}`
   - Generate statement with reportId parameter

**Expected Results:**
- ✅ Report displays successfully
- ✅ No corruption errors
- ✅ Snapshot data is shown
- ✅ No errors in server logs

**Server Logs Should Show:**
```
No errors related to checksum validation
```

---

### Test 3: Corrupted Snapshot Detection (Simulated)

**Purpose:** Verify that corrupted snapshots are detected and blocked

**Steps:**
1. Submit a report (creates valid snapshot)
2. Manually corrupt the snapshot in database:
   ```sql
   -- Corrupt the report_data (snapshot)
   UPDATE financial_reports
   SET report_data = jsonb_set(
     report_data,
     '{corrupted}',
     '"true"'
   )
   WHERE id = <your_report_id>;
   -- DO NOT update snapshot_checksum
   ```
3. Try to view the corrupted report

**Expected Results:**
- ✅ Server logs critical error
- ✅ Admin notification logged
- ✅ Client receives error response
- ✅ Corruption dialog appears (if integrated)
- ✅ Report content is NOT displayed

**Server Logs Should Show:**
```
[CRITICAL] Snapshot integrity validation failed for report <id>
[ADMIN NOTIFICATION] Snapshot corruption detected for report <id>
```

**API Response:**
```json
{
  "error": "SNAPSHOT_CORRUPTED",
  "message": "Snapshot integrity check failed. Report data may be corrupted.",
  "details": "The snapshot checksum does not match the stored value.",
  "reportId": <id>,
  "reportStatus": "pending_daf_approval"
}
```

---

### Test 4: Generate Statement with Corrupted Snapshot

**Purpose:** Verify corruption detection in generateStatement endpoint

**Steps:**
1. Use corrupted report from Test 3
2. Call generate statement API with reportId:
   ```bash
   curl -X POST http://localhost:9999/api/financial-reports/generate-statement \
     -H "Content-Type: application/json" \
     -d '{
       "reportId": <your_report_id>,
       "statementCode": "REV_EXP",
       "reportingPeriodId": 2,
       "projectType": "HIV"
     }'
   ```

**Expected Results:**
- ✅ Returns 500 error
- ✅ Error response contains "SNAPSHOT_CORRUPTED"
- ✅ Server logs critical error
- ✅ Admin notification logged

---

### Test 5: Get Report with Corrupted Snapshot

**Purpose:** Verify corruption detection in getOne endpoint

**Steps:**
1. Use corrupted report from Test 3
2. Fetch report directly:
   ```bash
   curl http://localhost:9999/api/financial-reports/<your_report_id>
   ```

**Expected Results:**
- ✅ Returns 200 OK (report metadata still returned)
- ✅ Response includes `snapshotCorrupted: true`
- ✅ Response includes `snapshotError` message
- ✅ Server logs critical error
- ✅ Admin notification logged

**Response Format:**
```json
{
  "id": <id>,
  "status": "pending_daf_approval",
  "snapshotCorrupted": true,
  "snapshotError": "Snapshot integrity check failed. Report data may be corrupted.",
  ...other fields
}
```

---

### Test 6: Draft Report (No Snapshot)

**Purpose:** Verify that draft reports work normally (no snapshot validation)

**Steps:**
1. Create a new report (don't submit it)
2. View the draft report

**Expected Results:**
- ✅ Report displays successfully
- ✅ Shows live data (not snapshot)
- ✅ No integrity validation performed
- ✅ No errors

---

### Test 7: Restore Corrupted Report

**Purpose:** Verify that fixing the checksum resolves the issue

**Steps:**
1. Use corrupted report from Test 3
2. Recalculate and update the checksum:
   ```sql
   -- This would need to be done programmatically
   -- For testing, you can restore the original data:
   
   -- Option 1: Revert the corruption
   UPDATE financial_reports
   SET report_data = report_data - 'corrupted'
   WHERE id = <your_report_id>;
   
   -- Option 2: Regenerate snapshot (requires code)
   ```
3. Try to view the report again

**Expected Results:**
- ✅ Report displays successfully
- ✅ No corruption errors
- ✅ Integrity validation passes

---

## Test Checklist

### Server-Side Validation
- [ ] Checksum verification runs before displaying snapshots
- [ ] Critical errors are logged with report details
- [ ] Admin notification is attempted
- [ ] Corrupted reports return appropriate error responses
- [ ] Valid reports pass validation without errors

### Client-Side Handling (if integrated)
- [ ] Corruption errors are detected
- [ ] Error dialog displays with report details
- [ ] User sees clear error message
- [ ] Contact admin button works
- [ ] Report content is not displayed when corrupted

### Edge Cases
- [ ] Draft reports work normally (no validation)
- [ ] Reports without snapshots work normally
- [ ] Multiple corruption attempts are all caught
- [ ] Valid reports after corruption fix work correctly

## Manual Testing Commands

### Check Report Status
```sql
SELECT 
  id,
  status,
  snapshot_checksum,
  snapshot_timestamp,
  is_outdated,
  LENGTH(snapshot_checksum) as checksum_length
FROM financial_reports
WHERE id = <your_report_id>;
```

### Simulate Corruption
```sql
-- Corrupt snapshot data
UPDATE financial_reports
SET report_data = jsonb_set(report_data, '{test}', '"corrupted"')
WHERE id = <your_report_id>;
```

### Check Server Logs
Look for these patterns:
- `[CRITICAL] Snapshot integrity validation failed`
- `[ADMIN NOTIFICATION] Snapshot corruption detected`
- `Checksum mismatch for report`

### Restore Report
```sql
-- Remove corruption
UPDATE financial_reports
SET report_data = report_data - 'test'
WHERE id = <your_report_id>;
```

## Success Criteria

✅ **All tests pass:**
1. Normal submissions create valid snapshots
2. Valid snapshots pass integrity checks
3. Corrupted snapshots are detected
4. Appropriate errors are logged and returned
5. Admin notifications are triggered
6. Draft reports work without validation
7. Restored reports work correctly

## Known Limitations

1. **Admin Notifications:** Currently only logs notification intent (no actual emails sent)
2. **Client Integration:** Corruption dialog requires manual integration into report viewers
3. **Automatic Recovery:** No automatic snapshot regeneration (manual fix required)

## Next Steps After Testing

1. If all tests pass → Mark Task 22 as production-ready
2. If issues found → Document and fix
3. Integrate corruption dialog into report viewer components
4. Consider implementing actual email notifications
5. Add automated tests for corruption detection

## Test Results Template

```
Test Date: ___________
Tester: ___________

Test 1 (Normal Submission): [ ] PASS [ ] FAIL
Test 2 (Valid Snapshot): [ ] PASS [ ] FAIL
Test 3 (Corrupted Detection): [ ] PASS [ ] FAIL
Test 4 (Generate Statement): [ ] PASS [ ] FAIL
Test 5 (Get Report): [ ] PASS [ ] FAIL
Test 6 (Draft Report): [ ] PASS [ ] FAIL
Test 7 (Restore Report): [ ] PASS [ ] FAIL

Notes:
_________________________________
_________________________________
_________________________________

Overall Result: [ ] ALL PASS [ ] SOME FAILURES
```
