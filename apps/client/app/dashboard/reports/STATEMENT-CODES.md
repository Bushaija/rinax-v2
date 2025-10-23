# Statement Codes Reference

## Database Statement Codes

These are the actual statement codes stored in the `statement_templates` table:

```sql
SELECT DISTINCT statement_code FROM statement_templates;
```

| Statement Code | Description | Page |
|----------------|-------------|------|
| `REV_EXP` | Revenue & Expenditure Statement | `/reports/revenue-expenditure` |
| `ASSETS_LIAB` | Balance Sheet (Assets & Liabilities) | `/reports/balance-sheet` |
| `CASH_FLOW` | Cash Flow Statement | `/reports/cash-flow` |
| `NET_ASSETS_CHANGES` | Statement of Changes in Net Assets | `/reports/net-assets-changes` |
| `BUDGET_VS_ACTUAL` | Budget vs Actual Comparison | `/reports/budget-vs-actual` |

## Usage in Code

### Generate Statement Request
```typescript
generateStatement({
  statementCode: "REV_EXP", // Use exact code from table above
  reportingPeriodId: 2,
  projectType: "HIV",
  includeComparatives: true,
});
```

### Statement Code Constants
```typescript
// Define constants for type safety
const STATEMENT_CODES = {
  REVENUE_EXPENDITURE: "REV_EXP",
  BALANCE_SHEET: "ASSETS_LIAB",
  CASH_FLOW: "CASH_FLOW",
  NET_ASSETS_CHANGES: "NET_ASSETS_CHANGES",
  BUDGET_VS_ACTUAL: "BUDGET_VS_ACTUAL",
} as const;

// Usage
generateStatement({
  statementCode: STATEMENT_CODES.REVENUE_EXPENDITURE,
  // ...
});
```

## Common Mistakes

### ❌ Incorrect Codes
```typescript
// These will cause 422 errors:
statementCode: "BAL_SHEET"        // Wrong! Use "ASSETS_LIAB"
statementCode: "NET_ASSETS"       // Wrong! Use "NET_ASSETS_CHANGES"
statementCode: "BUDGET_ACTUAL"    // Wrong! Use "BUDGET_VS_ACTUAL"
```

### ✅ Correct Codes
```typescript
// These will work:
statementCode: "ASSETS_LIAB"
statementCode: "NET_ASSETS_CHANGES"
statementCode: "BUDGET_VS_ACTUAL"
```

## Validation

The backend validates statement codes against the `statement_templates` table. If you use an invalid code, you'll receive a 422 Unprocessable Entity error.

### Error Response Example
```json
{
  "error": "Invalid statement code",
  "message": "Statement code 'BAL_SHEET' not found in templates",
  "validCodes": [
    "REV_EXP",
    "ASSETS_LIAB",
    "CASH_FLOW",
    "NET_ASSETS_CHANGES",
    "BUDGET_VS_ACTUAL"
  ]
}
```

## Adding New Statement Types

To add a new statement type:

1. **Add template to database**:
   ```sql
   INSERT INTO statement_templates (statement_code, statement_name, ...)
   VALUES ('NEW_CODE', 'New Statement Name', ...);
   ```

2. **Create page**:
   ```typescript
   // apps/client/app/dashboard/reports/new-statement/page.tsx
   generateStatement({
     statementCode: "NEW_CODE",
     // ...
   });
   ```

3. **Update constants**:
   ```typescript
   const STATEMENT_CODES = {
     // ... existing codes
     NEW_STATEMENT: "NEW_CODE",
   };
   ```

4. **Update documentation**:
   - Add to this file
   - Update README.md
   - Update MIGRATION-GUIDE.md

## Troubleshooting

### 422 Error: Invalid Statement Code
**Problem**: Using incorrect statement code

**Solution**: Check the database for valid codes:
```sql
SELECT statement_code, statement_name 
FROM statement_templates 
WHERE is_active = true;
```

### Statement Not Generating
**Problem**: Statement code exists but no data

**Solution**: Check if template has line definitions:
```sql
SELECT COUNT(*) 
FROM statement_template_lines 
WHERE template_id = (
  SELECT id FROM statement_templates 
  WHERE statement_code = 'YOUR_CODE'
);
```

## Reference Links

- **Backend Routes**: `apps/server/src/api/routes/financial-reports/`
- **Database Schema**: `apps/server/src/db/schema/statement-templates.ts`
- **Frontend Pages**: `apps/client/app/dashboard/reports/`
- **Hooks**: `apps/client/hooks/mutations/financial-reports/`

---

**Last Updated**: October 5, 2025
**Maintained By**: Development Team
