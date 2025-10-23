# Dynamic Fiscal Year Implementation

## Overview
Converted hardcoded fiscal years in financial statement templates to dynamic placeholders that are resolved at runtime based on the reporting period.

## Changes Made

### 1. Template Updates (`statement-templates.ts`)

**Before:**
```typescript
{ lineItem: 'Balances as at 30th June 2023', lineCode: 'BALANCES_JUNE_2023', ... }
{ lineItem: 'Prior year adjustments (2023-2024):', lineCode: 'PRIOR_YEAR_ADJUSTMENTS_2023_2024', ... }
```

**After:**
```typescript
{ lineItem: 'Balances as at 30th June {{PREV_YEAR}}', lineCode: 'BALANCES_JUNE_PREV', ... }
{ lineItem: 'Prior year adjustments ({{PREV_YEAR}}-{{CURRENT_YEAR}}):', lineCode: 'PRIOR_YEAR_ADJUSTMENTS_PREV_CURRENT', ... }
```

**Updated Line Codes:**
- `BALANCES_JUNE_2023` → `BALANCES_JUNE_PREV`
- `PRIOR_YEAR_ADJUSTMENTS_2023_2024` → `PRIOR_YEAR_ADJUSTMENTS_PREV_CURRENT`
- `CASH_EQUIVALENT_2023_2024` → `CASH_EQUIVALENT_PREV_CURRENT`
- `RECEIVABLES_2023_2024` → `RECEIVABLES_PREV_CURRENT`
- `INVESTMENTS_2023_2024` → `INVESTMENTS_PREV_CURRENT`
- `PAYABLES_2023_2024` → `PAYABLES_PREV_CURRENT`
- `BORROWING_2023_2024` → `BORROWING_PREV_CURRENT`
- `NET_SURPLUS_2023_2024` → `NET_SURPLUS_PREV_CURRENT`
- `BALANCE_JUNE_2024` → `BALANCE_JUNE_CURRENT`
- `BALANCE_JULY_2024` → `BALANCE_JULY_CURRENT`
- `PRIOR_YEAR_ADJUSTMENTS_2024_2025` → `PRIOR_YEAR_ADJUSTMENTS_CURRENT_NEXT`
- `CASH_EQUIVALENT_2024_2025` → `CASH_EQUIVALENT_CURRENT_NEXT`
- `RECEIVABLES_2024_2025` → `RECEIVABLES_CURRENT_NEXT`
- `INVESTMENTS_2024_2025` → `INVESTMENTS_CURRENT_NEXT`
- `PAYABLES_2024_2025` → `PAYABLES_CURRENT_NEXT`
- `BORROWING_2024_2025` → `BORROWING_CURRENT_NEXT`
- `NET_SURPLUS_2024_2025` → `NET_SURPLUS_CURRENT_NEXT`
- `BALANCE_MARCH_2025` → `BALANCE_PERIOD_END`

### 2. Handler Updates (`financial-reports.handlers.ts`)

#### New Helper Functions

**`getFiscalYearContext()`**
- Extracts fiscal year information from reporting period
- Calculates previous, current, and next years
- Formats period end date with ordinal suffix (e.g., "30th March 2025")

**`replaceFiscalYearPlaceholders()`**
- Replaces template placeholders with actual years at runtime
- Supports: `{{PREV_YEAR}}`, `{{CURRENT_YEAR}}`, `{{NEXT_YEAR}}`, `{{PERIOD_END_DATE}}`

#### Updated Calculation Functions

Renamed and updated to use dynamic line codes:
- `calculateBalanceJune2024()` → `calculateBalanceJuneCurrent()`
- `calculateBalanceJuly2024()` → `calculateBalanceJulyCurrent()`
- `calculateBalanceMarch2025()` → `calculateBalancePeriodEnd()`

Updated `shouldComputeTotal()` to recognize new dynamic line codes.

## Available Placeholders

| Placeholder | Description | Example |
|------------|-------------|---------|
| `{{PREV_YEAR}}` | Previous fiscal year | 2023 |
| `{{CURRENT_YEAR}}` | Current fiscal year | 2024 |
| `{{NEXT_YEAR}}` | Next fiscal year | 2025 |
| `{{PERIOD_END_DATE}}` | Formatted period end date | 30th March 2025 |

## How It Works

### 1. Seeding Phase
Templates are stored in the database with placeholders:
```sql
INSERT INTO statement_templates (line_item, line_code, ...)
VALUES ('Balances as at 30th June {{PREV_YEAR}}', 'BALANCES_JUNE_PREV', ...);
```

### 2. Runtime Phase
When generating a statement:

```typescript
// 1. Get reporting period
const reportingPeriod = await db.query.reportingPeriods.findFirst({
  where: eq(reportingPeriods.id, reportingPeriodId)
});

// 2. Calculate fiscal year context
const fiscalYearContext = await getFiscalYearContext(reportingPeriod);
// Returns: { prevYear: 2023, currentYear: 2024, nextYear: 2025, periodEndDate: "30th March 2025" }

// 3. Replace placeholders in template descriptions
const description = replaceFiscalYearPlaceholders(
  templateLine.description, 
  fiscalYearContext
);
// "Balances as at 30th June {{PREV_YEAR}}" → "Balances as at 30th June 2023"
```

### 3. Response Phase
User receives statement with actual years:
```json
{
  "lines": [
    {
      "description": "Balances as at 30th June 2023",
      "lineCode": "BALANCES_JUNE_PREV",
      "currentPeriodValue": 1000
    }
  ]
}
```

## Benefits

✅ **Future-proof** - Works for any fiscal year without code changes  
✅ **No re-seeding** - Templates work for 2024, 2025, 2026, etc.  
✅ **Historical accuracy** - Old reports show correct years for their period  
✅ **Maintainable** - Single template for all years  
✅ **Flexible** - Easy to add new placeholders if needed

## Example Usage

### API Request
```json
{
  "statementCode": "NET_ASSETS_CHANGES",
  "reportingPeriodId": 5,
  "projectType": "HEALTH",
  "facilityId": 1,
  "includeComparatives": true
}
```

### Response (for FY 2024-2025)
```json
{
  "statement": {
    "lines": [
      {
        "description": "Balances as at 30th June 2023",
        "lineCode": "BALANCES_JUNE_PREV"
      },
      {
        "description": "Prior year adjustments (2023-2024):",
        "lineCode": "PRIOR_YEAR_ADJUSTMENTS_PREV_CURRENT"
      },
      {
        "description": "Balance as at 30th June 2024",
        "lineCode": "BALANCE_JUNE_CURRENT"
      },
      {
        "description": "Balance as at 01st July 2024",
        "lineCode": "BALANCE_JULY_CURRENT"
      },
      {
        "description": "Prior year adjustments (2024-2025):",
        "lineCode": "PRIOR_YEAR_ADJUSTMENTS_CURRENT_NEXT"
      },
      {
        "description": "Balance as at 30th March 2025",
        "lineCode": "BALANCE_PERIOD_END"
      }
    ]
  }
}
```

## Migration Notes

### Database Migration Required
If you have existing data with old line codes, you'll need to run a migration:

```sql
-- Update line codes in statement_templates table
UPDATE statement_templates 
SET line_code = 'BALANCES_JUNE_PREV' 
WHERE line_code = 'BALANCES_JUNE_2023';

UPDATE statement_templates 
SET line_code = 'BALANCE_JUNE_CURRENT' 
WHERE line_code = 'BALANCE_JUNE_2024';

-- Update descriptions with placeholders
UPDATE statement_templates 
SET line_item = 'Balances as at 30th June {{PREV_YEAR}}' 
WHERE line_code = 'BALANCES_JUNE_PREV';

-- ... (repeat for all updated line codes)
```

### Re-seeding
Alternatively, you can re-run your seed scripts to populate with the new template structure.

## Testing

Test with different reporting periods to verify dynamic year replacement:

```bash
# Test with FY 2023-2024
curl -X POST /api/financial-reports/generate \
  -d '{"statementCode":"NET_ASSETS_CHANGES","reportingPeriodId":4}'

# Test with FY 2024-2025
curl -X POST /api/financial-reports/generate \
  -d '{"statementCode":"NET_ASSETS_CHANGES","reportingPeriodId":5}'

# Test with FY 2025-2026
curl -X POST /api/financial-reports/generate \
  -d '{"statementCode":"NET_ASSETS_CHANGES","reportingPeriodId":6}'
```

Each should show the correct years based on the reporting period.
