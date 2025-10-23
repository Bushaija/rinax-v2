# Design Document: Cash Flow Working Capital Changes

## Overview

This design implements automatic calculation of working capital changes (receivables and payables) for the Cash Flow Statement using the indirect method. The solution queries balance sheet data from `schema_form_data_entries` for both current and previous periods, calculates the period-over-period changes, and applies the correct signs for cash flow adjustments.

## Architecture

### High-Level Flow

```
1. Cash Flow Statement Generation Request
   ↓
2. Identify Current and Previous Reporting Periods
   ↓
3. Query Balance Sheet Data (schema_form_data_entries)
   ├─ Current Period: Receivables & Payables
   └─ Previous Period: Receivables & Payables
   ↓
4. Calculate Changes
   ├─ ΔReceivables = Current - Previous
   └─ ΔPayables = Current - Previous
   ↓
5. Apply Cash Flow Signs
   ├─ CF Adjustment (Receivables) = -ΔReceivables
   └─ CF Adjustment (Payables) = +ΔPayables
   ↓
6. Inject into Statement Lines
   ↓
7. Calculate Operating Cash Flow Total
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  generateStatement Handler                   │
│  (financial-reports.handlers.ts)                            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ├─ Uses existing engines
                     │
        ┌────────────┴────────────┬──────────────────────────┐
        │                         │                          │
┌───────▼────────┐    ┌──────────▼──────────┐   ┌──────────▼──────────┐
│ TemplateEngine │    │ DataAggregationEngine│   │   FormulaEngine     │
│                │    │                      │   │                     │
│ - Load CASH_   │    │ - collectEventData() │   │ - Evaluate formulas │
│   FLOW template│    │ - NEW: collectBalance│   │ - NEW: Support      │
│                │    │   SheetData()        │   │   BALANCE_SHEET     │
│ - Identify     │    │ - aggregateByEvent() │   │   context           │
│   computed     │    │                      │   │                     │
│   lines        │    └──────────────────────┘   └─────────────────────┘
└────────────────┘                │
                                  │
                     ┌────────────▼────────────┐
                     │ WorkingCapitalCalculator│
                     │  (NEW SERVICE)          │
                     │                         │
                     │ - calculateChanges()    │
                     │ - applyCashFlowSigns()  │
                     │ - queryBalanceSheet()   │
                     └─────────────────────────┘
                                  │
                     ┌────────────▼────────────┐
                     │ schema_form_data_entries│
                     │  (DATABASE)             │
                     │                         │
                     │ - formData.amount       │
                     │ - entityType: EXECUTION │
                     │ - reportingPeriodId     │
                     └─────────────────────────┘
```

## Components and Interfaces

### 1. WorkingCapitalCalculator Service

**Location:** `apps/server/src/lib/statement-engine/services/working-capital-calculator.ts`

**Purpose:** Encapsulates all logic for calculating working capital changes from balance sheet data.

```typescript
interface WorkingCapitalChange {
  accountType: 'RECEIVABLES' | 'PAYABLES';
  currentPeriodBalance: number;
  previousPeriodBalance: number;
  change: number;
  cashFlowAdjustment: number;
  eventCodes: string[];
  facilityBreakdown?: FacilityWorkingCapitalBreakdown[];
}

interface WorkingCapitalCalculationResult {
  receivablesChange: WorkingCapitalChange;
  payablesChange: WorkingCapitalChange;
  warnings: string[];
  metadata: {
    currentPeriodId: number;
    previousPeriodId: number | null;
    facilitiesIncluded: number[];
    calculationTimestamp: Date;
  };
}

class WorkingCapitalCalculator {
  constructor(private db: Database);

  /**
   * Calculate working capital changes for a reporting period
   */
  async calculateChanges(params: {
    reportingPeriodId: number;
    projectId: number;
    facilityId?: number;
    facilityIds?: number[];
    projectType: string;
  }): Promise<WorkingCapitalCalculationResult>;

  /**
   * Query balance sheet data for a specific period
   */
  private async queryBalanceSheetData(params: {
    reportingPeriodId: number;
    projectId: number;
    facilityIds: number[];
    eventCodes: string[];
  }): Promise<Map<string, number>>;

  /**
   * Identify the previous reporting period
   */
  private async getPreviousPeriod(
    currentPeriodId: number
  ): Promise<number | null>;

  /**
   * Apply cash flow adjustment signs
   */
  private applyCashFlowSigns(
    accountType: 'RECEIVABLES' | 'PAYABLES',
    change: number
  ): number;
}
```

### 2. Balance Sheet Data Query

**Data Source:** `schema_form_data_entries` table

**Query Logic:**

```typescript
// Pseudo-code for balance sheet query
async function queryBalanceSheetData(params) {
  const query = db
    .select({
      eventCode: events.code,
      totalAmount: sql`COALESCE(SUM(CAST(form_data->>'amount' AS NUMERIC)), 0)`
    })
    .from(schemaFormDataEntries)
    .innerJoin(configurableEventMappings, 
      eq(schemaFormDataEntries.entityId, configurableEventMappings.activityId))
    .innerJoin(events, 
      eq(configurableEventMappings.eventId, events.id))
    .where(and(
      eq(schemaFormDataEntries.projectId, params.projectId),
      eq(schemaFormDataEntries.reportingPeriodId, params.reportingPeriodId),
      eq(schemaFormDataEntries.entityType, 'EXECUTION'),
      inArray(events.code, params.eventCodes), // ADVANCE_PAYMENTS, RECEIVABLES_*, PAYABLES
      params.facilityIds 
        ? inArray(schemaFormDataEntries.facilityId, params.facilityIds)
        : undefined
    ))
    .groupBy(events.code);

  return await query;
}
```

**Event Codes for Balance Sheet Accounts:**
- **Receivables:**
  - `ADVANCE_PAYMENTS` (event #23)
  - `RECEIVABLES_EXCHANGE` (event #42)
  - `RECEIVABLES_NON_EXCHANGE` (event #41)
- **Payables:**
  - `PAYABLES` (event #25)

### 3. Previous Period Identification

**Logic:**

```typescript
async function getPreviousPeriod(currentPeriodId: number): Promise<number | null> {
  // Get current period details
  const currentPeriod = await db.query.reportingPeriods.findFirst({
    where: eq(reportingPeriods.id, currentPeriodId)
  });

  if (!currentPeriod) return null;

  // Find previous period (year - 1, same period type)
  const previousPeriod = await db.query.reportingPeriods.findFirst({
    where: and(
      eq(reportingPeriods.year, currentPeriod.year - 1),
      eq(reportingPeriods.periodType, currentPeriod.periodType)
    )
  });

  return previousPeriod?.id || null;
}
```

### 4. Formula Engine Enhancement

**Current State:** FormulaEngine evaluates formulas with context containing:
- `eventValues`: Map of event codes to amounts
- `lineValues`: Map of line codes to calculated values
- `customMappings`: User-defined mappings

**Enhancement:** Add balance sheet context for working capital calculations

```typescript
interface FormulaContext {
  eventValues: Map<string, number>;
  lineValues: Map<string, number>;
  previousPeriodValues: Map<string, number>;
  customMappings: Record<string, any>;
  // NEW: Balance sheet data
  balanceSheet?: {
    current: Map<string, number>;  // Event code → Amount
    previous: Map<string, number>; // Event code → Amount
  };
}
```

**Formula Syntax for Working Capital:**

```typescript
// In statement template
{
  lineCode: 'CHANGES_RECEIVABLES',
  calculationFormula: 'WORKING_CAPITAL_CHANGE(RECEIVABLES)',
  eventCodes: ['ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE']
}

{
  lineCode: 'CHANGES_PAYABLES',
  calculationFormula: 'WORKING_CAPITAL_CHANGE(PAYABLES)',
  eventCodes: ['PAYABLES']
}
```

**Formula Evaluation:**

```typescript
// In FormulaEngine
async evaluateFormula(formula: string, context: FormulaContext): Promise<number> {
  // ... existing formula evaluation logic ...

  // NEW: Handle WORKING_CAPITAL_CHANGE function
  if (formula.startsWith('WORKING_CAPITAL_CHANGE(')) {
    const accountType = formula.match(/WORKING_CAPITAL_CHANGE\((\w+)\)/)?.[1];
    
    if (!context.balanceSheet) {
      throw new Error('Balance sheet context required for working capital calculations');
    }

    // Get event codes for this account type from template line
    const eventCodes = this.getEventCodesForAccountType(accountType);
    
    // Calculate current period balance
    const currentBalance = eventCodes.reduce((sum, code) => 
      sum + (context.balanceSheet.current.get(code) || 0), 0);
    
    // Calculate previous period balance
    const previousBalance = eventCodes.reduce((sum, code) => 
      sum + (context.balanceSheet.previous.get(code) || 0), 0);
    
    // Calculate change
    const change = currentBalance - previousBalance;
    
    // Apply cash flow sign
    const cashFlowAdjustment = accountType === 'RECEIVABLES' ? -change : change;
    
    return cashFlowAdjustment;
  }

  // ... rest of formula evaluation ...
}
```

### 5. Integration with generateStatement Handler

**Modification Points:**

```typescript
// In generateStatement handler

// Step 6.5: Get working capital changes (NEW)
let workingCapitalResult = null;
if (statementCode === 'CASH_FLOW') {
  console.log('[Financial Reports GenerateStatement] Calculating working capital changes');
  const workingCapitalCalculator = new WorkingCapitalCalculator(db);
  
  workingCapitalResult = await workingCapitalCalculator.calculateChanges({
    reportingPeriodId,
    projectId: project.id,
    facilityId,
    facilityIds: effectiveFacilityIds,
    projectType
  });
  
  console.log('[Financial Reports GenerateStatement] Working capital result:', {
    receivablesChange: workingCapitalResult.receivablesChange.cashFlowAdjustment,
    payablesChange: workingCapitalResult.payablesChange.cashFlowAdjustment,
    warnings: workingCapitalResult.warnings.length
  });
}

// Step 11: Build statement lines from template
for (const templateLine of template.lines) {
  // ... existing logic ...

  // NEW: Handle working capital lines
  if (statementCode === 'CASH_FLOW' && workingCapitalResult) {
    if (templateLine.lineCode === 'CHANGES_RECEIVABLES') {
      currentPeriodValue = workingCapitalResult.receivablesChange.cashFlowAdjustment;
    } else if (templateLine.lineCode === 'CHANGES_PAYABLES') {
      currentPeriodValue = workingCapitalResult.payablesChange.cashFlowAdjustment;
    }
  }

  // ... rest of line building logic ...
}

// Add working capital metadata to response
if (workingCapitalResult) {
  statementMetadata.workingCapital = {
    receivables: {
      currentBalance: workingCapitalResult.receivablesChange.currentPeriodBalance,
      previousBalance: workingCapitalResult.receivablesChange.previousPeriodBalance,
      change: workingCapitalResult.receivablesChange.change,
      cashFlowAdjustment: workingCapitalResult.receivablesChange.cashFlowAdjustment
    },
    payables: {
      currentBalance: workingCapitalResult.payablesChange.currentPeriodBalance,
      previousBalance: workingCapitalResult.payablesChange.previousPeriodBalance,
      change: workingCapitalResult.payablesChange.change,
      cashFlowAdjustment: workingCapitalResult.payablesChange.cashFlowAdjustment
    },
    warnings: workingCapitalResult.warnings
  };
}
```

## Data Models

### Balance Sheet Data Structure

```typescript
// Data from schema_form_data_entries
interface BalanceSheetEntry {
  id: number;
  entityId: number;
  entityType: 'EXECUTION';
  projectId: number;
  facilityId: number;
  reportingPeriodId: number;
  formData: {
    amount: number;
    // ... other fields
  };
  // ... other fields
}

// Aggregated balance sheet data
interface BalanceSheetAggregation {
  eventCode: string;
  totalAmount: number;
  facilityBreakdown: {
    facilityId: number;
    amount: number;
  }[];
}
```

### Working Capital Metadata

```typescript
interface WorkingCapitalMetadata {
  receivables: {
    currentBalance: number;
    previousBalance: number;
    change: number;
    cashFlowAdjustment: number;
    eventCodes: string[];
  };
  payables: {
    currentBalance: number;
    previousBalance: number;
    change: number;
    cashFlowAdjustment: number;
    eventCodes: string[];
  };
  warnings: string[];
  facilityBreakdown?: {
    facilityId: number;
    facilityName: string;
    receivablesChange: number;
    payablesChange: number;
  }[];
}
```

## Error Handling

### Error Scenarios

1. **Previous Period Not Found**
   - **Handling:** Use zero as previous balance, add warning
   - **Warning:** "Previous period data not available, using zero as baseline"

2. **No Balance Sheet Data for Current Period**
   - **Handling:** Use zero for current balance, add warning
   - **Warning:** "No balance sheet data found for current period"

3. **Negative Balance for Asset Accounts**
   - **Handling:** Include in calculation but flag as validation error
   - **Error:** "Negative balance detected for receivables account"

4. **Extreme Variance (>100% change)**
   - **Handling:** Calculate normally but flag as significant variance
   - **Warning:** "Significant variance detected: receivables changed by X%"

5. **Multi-Facility Aggregation with Missing Data**
   - **Handling:** Aggregate available data, list missing facilities
   - **Warning:** "Facilities [X, Y, Z] have no balance sheet data"

### Validation Rules

```typescript
interface ValidationRule {
  ruleId: string;
  check: (data: WorkingCapitalCalculationResult) => boolean;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

const validationRules: ValidationRule[] = [
  {
    ruleId: 'WC_001',
    check: (data) => data.receivablesChange.currentPeriodBalance >= 0,
    message: 'Receivables balance should not be negative',
    severity: 'error'
  },
  {
    ruleId: 'WC_002',
    check: (data) => {
      const variance = Math.abs(data.receivablesChange.change / 
        (data.receivablesChange.previousPeriodBalance || 1));
      return variance <= 1.0; // 100%
    },
    message: 'Receivables changed by more than 100%',
    severity: 'warning'
  },
  {
    ruleId: 'WC_003',
    check: (data) => data.metadata.previousPeriodId !== null,
    message: 'Previous period data not available',
    severity: 'warning'
  }
];
```

## Testing Strategy

### Unit Tests

1. **WorkingCapitalCalculator.calculateChanges()**
   - Test with normal data (increase and decrease scenarios)
   - Test with zero previous period balance
   - Test with missing current period data
   - Test with multi-facility aggregation

2. **WorkingCapitalCalculator.applyCashFlowSigns()**
   - Test receivables increase (should be negative)
   - Test receivables decrease (should be positive)
   - Test payables increase (should be positive)
   - Test payables decrease (should be negative)

3. **WorkingCapitalCalculator.queryBalanceSheetData()**
   - Test single facility query
   - Test multi-facility aggregation
   - Test with missing data
   - Test with multiple event codes

4. **FormulaEngine.evaluateFormula() - WORKING_CAPITAL_CHANGE**
   - Test WORKING_CAPITAL_CHANGE(RECEIVABLES)
   - Test WORKING_CAPITAL_CHANGE(PAYABLES)
   - Test with missing balance sheet context
   - Test with zero balances

### Integration Tests

1. **Cash Flow Statement Generation with Working Capital**
   - Generate statement with normal working capital changes
   - Generate statement with missing previous period
   - Generate statement for multiple facilities
   - Verify operating cash flow calculation includes adjustments

2. **End-to-End Scenario Tests**
   - Scenario 1: Receivables increase, Payables increase
   - Scenario 2: Receivables decrease, Payables decrease
   - Scenario 3: Mixed changes (one increase, one decrease)
   - Scenario 4: First period (no previous data)

### Test Data Setup

```typescript
// Sample test data
const testData = {
  currentPeriod: {
    reportingPeriodId: 2,
    year: 2025,
    receivables: 50000, // ADVANCE_PAYMENTS + RECEIVABLES_*
    payables: 18000
  },
  previousPeriod: {
    reportingPeriodId: 1,
    year: 2024,
    receivables: 40000,
    payables: 25000
  },
  expected: {
    receivablesChange: 10000,
    receivablesCashFlowAdjustment: -10000, // Subtract
    payablesChange: -7000,
    payablesCashFlowAdjustment: -7000 // Subtract
  }
};
```

## Performance Considerations

### Query Optimization

1. **Index Requirements:**
   ```sql
   -- Ensure indexes exist for efficient querying
   CREATE INDEX IF NOT EXISTS idx_schema_form_data_entries_balance_sheet 
   ON schema_form_data_entries(
     project_id, 
     reporting_period_id, 
     entity_type, 
     facility_id
   );
   ```

2. **Query Batching:**
   - Query current and previous period data in parallel
   - Aggregate multiple event codes in single query

3. **Caching Strategy:**
   - Cache balance sheet data for frequently accessed periods
   - Cache previous period lookups

### Expected Performance

- **Single Facility:** < 100ms for working capital calculation
- **Multi-Facility (10 facilities):** < 500ms
- **Multi-Facility (50 facilities):** < 2s

## Migration Strategy

### Phase 1: Service Implementation
1. Create `WorkingCapitalCalculator` service
2. Add unit tests
3. Add integration tests

### Phase 2: Formula Engine Enhancement
1. Add balance sheet context support
2. Implement `WORKING_CAPITAL_CHANGE` function
3. Test formula evaluation

### Phase 3: Handler Integration
1. Integrate with `generateStatement` handler
2. Add working capital metadata to response
3. Update validation logic

### Phase 4: Template Update
1. Update CASH_FLOW template with calculation formulas
2. Mark lines as computed
3. Test statement generation

### Phase 5: Validation & Deployment
1. Run full test suite
2. Test with production-like data
3. Deploy to staging
4. Monitor and validate
5. Deploy to production

## Backward Compatibility

- Existing cash flow statements will continue to work
- Old statements without working capital calculations will show zero values
- No breaking changes to API contracts
- Metadata additions are optional and backward compatible

## Future Enhancements

1. **Support for Other Working Capital Items:**
   - Inventory changes
   - Prepaid expenses
   - Accrued liabilities

2. **Quarterly Period Support:**
   - Calculate changes between quarters
   - Support for interim periods

3. **Drill-Down Capability:**
   - Click on working capital line to see facility breakdown
   - View transaction-level details

4. **Automated Reconciliation:**
   - Compare cash flow working capital changes with balance sheet movements
   - Flag discrepancies automatically
