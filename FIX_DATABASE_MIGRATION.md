# Fix: Database Migration Required

## Issue
The application is failing with error: `column "snapshot_checksum" does not exist`

This is because the database schema is missing the snapshot-related columns that Task 22 depends on.

## Root Cause
The migration file `0007_add_snapshot_and_period_locking.sql` exists but hasn't been applied to your database yet.

## Solution

### Option 1: Run Migration via Drizzle (Recommended)

```bash
# Navigate to server directory
cd apps/server

# Run migrations
pnpm db:migrate
# or
npm run db:migrate
# or
yarn db:migrate
```

### Option 2: Apply Migration Manually

If you don't have a migration command, you can apply the SQL directly:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name

# Or if using a connection string
psql "postgresql://username:password@localhost:5432/database_name"

# Then run the migration file
\i apps/server/src/db/migrations/0007_add_snapshot_and_period_locking.sql
```

### Option 3: Run SQL Directly

Copy and paste this SQL into your database client:

```sql
-- Add snapshot-related columns to financial_reports table
ALTER TABLE "financial_reports"
ADD COLUMN IF NOT EXISTS "snapshot_checksum" varchar(64),
ADD COLUMN IF NOT EXISTS "snapshot_timestamp" timestamp,
ADD COLUMN IF NOT EXISTS "source_data_version" varchar(20),
ADD COLUMN IF NOT EXISTS "is_outdated" boolean DEFAULT false;

-- Create report_versions table for version control
CREATE TABLE IF NOT EXISTS "report_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"report_id" integer NOT NULL,
	"version_number" varchar(20) NOT NULL,
	"snapshot_data" jsonb NOT NULL,
	"snapshot_checksum" varchar(64) NOT NULL,
	"snapshot_timestamp" timestamp NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"changes_summary" text
);

-- Add foreign key constraints
ALTER TABLE "report_versions" 
ADD CONSTRAINT "report_versions_report_id_fkey" 
FOREIGN KEY ("report_id") REFERENCES "financial_reports"("id") ON DELETE cascade;

-- Add unique constraint
ALTER TABLE "report_versions" 
ADD CONSTRAINT "report_versions_report_id_version_number_unique" 
UNIQUE("report_id", "version_number");

-- Create period_locks table
CREATE TABLE IF NOT EXISTS "period_locks" (
	"id" serial PRIMARY KEY NOT NULL,
	"reporting_period_id" integer NOT NULL,
	"project_id" integer NOT NULL,
	"facility_id" integer NOT NULL,
	"is_locked" boolean DEFAULT true,
	"locked_by" integer,
	"locked_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"locked_reason" text,
	"unlocked_by" integer,
	"unlocked_at" timestamp,
	"unlocked_reason" text
);

-- Add foreign key constraints for period_locks
ALTER TABLE "period_locks" 
ADD CONSTRAINT "period_locks_reporting_period_id_fkey" 
FOREIGN KEY ("reporting_period_id") REFERENCES "reporting_periods"("id") ON DELETE cascade;

ALTER TABLE "period_locks" 
ADD CONSTRAINT "period_locks_project_id_fkey" 
FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE cascade;

ALTER TABLE "period_locks" 
ADD CONSTRAINT "period_locks_facility_id_fkey" 
FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE cascade;

-- Add unique constraint for period locks
ALTER TABLE "period_locks" 
ADD CONSTRAINT "period_locks_reporting_period_id_project_id_facility_id_unique" 
UNIQUE("reporting_period_id", "project_id", "facility_id");

-- Create period_lock_audit_log table
CREATE TABLE IF NOT EXISTS "period_lock_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_lock_id" integer NOT NULL,
	"action" varchar(20) NOT NULL,
	"performed_by" integer NOT NULL,
	"performed_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"reason" text,
	"metadata" jsonb
);

-- Add foreign key constraint for audit log
ALTER TABLE "period_lock_audit_log" 
ADD CONSTRAINT "period_lock_audit_log_period_lock_id_fkey" 
FOREIGN KEY ("period_lock_id") REFERENCES "period_locks"("id") ON DELETE cascade;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_financial_reports_snapshot_timestamp" ON "financial_reports" ("snapshot_timestamp");
CREATE INDEX IF NOT EXISTS "idx_financial_reports_is_outdated" ON "financial_reports" ("is_outdated");
CREATE INDEX IF NOT EXISTS "idx_report_versions_report_id" ON "report_versions" ("report_id");
CREATE INDEX IF NOT EXISTS "idx_report_versions_version_number" ON "report_versions" ("version_number");
CREATE INDEX IF NOT EXISTS "idx_report_versions_snapshot_timestamp" ON "report_versions" ("snapshot_timestamp");
CREATE INDEX IF NOT EXISTS "idx_period_locks_reporting_period_id" ON "period_locks" ("reporting_period_id");
CREATE INDEX IF NOT EXISTS "idx_period_locks_facility_id" ON "period_locks" ("facility_id");
CREATE INDEX IF NOT EXISTS "idx_period_locks_is_locked" ON "period_locks" ("is_locked");
CREATE INDEX IF NOT EXISTS "idx_period_lock_audit_log_period_lock_id" ON "period_lock_audit_log" ("period_lock_id");
CREATE INDEX IF NOT EXISTS "idx_period_lock_audit_log_performed_at" ON "period_lock_audit_log" ("performed_at");
```

## Verification

After running the migration, verify the columns exist:

```sql
-- Check financial_reports table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'financial_reports' 
AND column_name IN ('snapshot_checksum', 'snapshot_timestamp', 'source_data_version', 'is_outdated');

-- Check report_versions table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'report_versions';

-- Check period_locks table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'period_locks';
```

Expected output should show all 4 columns for financial_reports and both new tables.

## After Migration

Once the migration is complete:

1. ✅ Restart your server
2. ✅ Try creating a report again
3. ✅ The error should be resolved

## Note

This is NOT a bug in Task 22 implementation. Task 22 correctly uses the snapshot columns that should have been created by earlier tasks in the spec. The migration file exists and just needs to be applied to your database.

## Related Files

- Migration file: `apps/server/src/db/migrations/0007_add_snapshot_and_period_locking.sql`
- Schema file: Check `apps/server/src/db/schema/financial-reports/schema.ts` for column definitions
