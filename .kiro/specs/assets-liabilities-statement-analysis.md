# Assets and Liabilities Statement Generation Analysis

## Overview
This document provides a comprehensive analysis of how the Assets and Liabilities (Balance Sheet) statement is generated in the financial reporting system.

## Statement Generation Flow

### 1. **Request Entry Point**
- **Handler**: `generateStatement` in `financial-reports.handlers.ts`
- **Route**: POST `/api/financial-reports/generate`
- **Request Parameters**:
  - `statementCode`: 'ASSETS_LIAB' (or other statement codes)
  - `reportingPeriodId`: The fiscal period to generate for
  - `projectType`: The project type (e.g., 'HEALTH')
  - `facilityId`: Optional facility filter
  - `includeComparatives`: Boolean for previous period comparison

### 2. **Template Loading** (Step 1)
```typescript
const templateEngine = new TemplateEngine(db);
const template = await templateEngine.loadTemplate(statementCode);
```

**Template Structure** (from `statement-templates.ts`):
- **Statement Code**: ASSETS_LIAB
- **Lines**: 26 template lines organized hierarchically
- **Sections**:
  1. **ASSETS** (Lines 1-10)
     - Current Assets (Cash, Receivables, Advance Payments)
     - Non-Current Assets (Direct Investments)
  2. **LIABILITIES** (Lines 11-20)
     - Current Liabilities (Payables, Advance Receipts, Securities)
     - Non-Current Liabilities (Direct Borrowings)
  3. **NET ASSETS / EQUITY** (Lines 21-26)
     - Accumulated Surplus/Deficits
     - Prior Year Adjustments
     - Surplus/Deficits of the Period

### 3. **Event Code Extraction** (Step 2)
```typescript
const eventCodes = template.lines
  .flatMap(line => line.eventMappings || [])
  .filter((code, index, array) => array.indexOf(code) === index);
```

**Event Codes Used in Assets & Liabilities**:
- **Assets**:
  - `CASH_EQUIVALENTS_END` - Ending cash balance
  - `RECEIVABLES_EXCHANGE` - Exchange receivables
  - `RECEIVABLES_NON_EXCHANGE` - Non-exchange receivables
  - `ADVANCE_PAYMENTS` - Advance payments made
  - `DIRECT_INVESTMENTS` - Investment assets

- **Liabilities**:
  - `PAYABLES` - Accounts payable
  - `PAYMENTS_RECEIVED_ADVANCE` - Advance receipts
  - `RETAINED_PERFORMANCE_SECURITIES` - Performance securities
  - `DIRECT_BORROWINGS` - Long-term borrowings

- **Equity**:
  - `ACCUMULATED_SURPLUS_DEFICITS` - Retained earnings
  - `PRIOR_YEAR_ADJUSTMENTS` - Prior period adjustments

### 4. **Data Collection** (Steps 3-7)
```typescript
const dataFilters: DataFilters = {
  projectId: project.id,
  facilityId,
  facilityIds: effectiveFacilityIds,
  reportingPeriodId,
  projectType,
  entityTypes: [EventType.EXECUTION] // Balance sheet uses execution data only
};

const eventData = await dataEngine.collectEventData(dataFilters, eventCodes);
const aggregatedData = await dataEngine.aggregateByEvent(eventData);
```

**Data Sources**:
- **Primary**: `schema_form_data_entries` table (traditional data entry)
- **Secondary**: Quarterly JSON data in `execution_data` table
- **Aggregation**: Sums all event amounts by event code across facilities

### 5. **Statement Line Calculation** (Step 11)

For each template line, the system determines the value using one of three methods:

#### Method A: Direct Event Mapping (Data Lines)
```typescript
// Example: CASH_EQUIVALENTS line
for (const eventCodeOrId of templateLine.eventMappings || []) {
  const amount = aggregatedData.eventTotals.get(eventCodeToLookup) || 0;
  currentPeriodValue += amount;
}
```

**Lines using this method**:
- CASH_EQUIVALENTS → CASH_EQUIVALENTS_END event
- RECEIVABLES_EXCHANGE → RECEIVABLES_EXCHANGE + RECEIVABLES_NON_EXCHANGE events
- ADVANCE_PAYMENTS → ADVANCE_PAYMENTS event
- DIRECT_INVESTMENTS → DIRECT_INVESTMENTS event
- PAYABLES → PAYABLES event
- PAYMENTS_RECEIVED_ADVANCE → PAYMENTS_RECEIVED_ADVANCE event
- RETAINED_PERFORMANCE_SECURITIES → RETAINED_PERFORMANCE_SECURITIES event
- DIRECT_BORROWINGS → DIRECT_BORROWINGS event
- ACCUMULATED_SURPLUS_DEFICITS → ACCUMULATED_SURPLUS_DEFICITS event
- PRIOR_YEAR_ADJUSTMENTS → PRIOR_YEAR_ADJUSTMENTS event

#### Method B: Formula Calculation (Calculated Lines)
```typescript
// Example: TOTAL_ASSETS line
if (templateLine.calculationFormula) {
  const context = {
    eventValues: aggregatedData.eventTotals,
    lineValues: new Map(statementLines.map(line => 
      [line.metadata.lineCode, line.currentPeriodValue]
    )),
    customMappings
  };
  currentPeriodValue = await formulaEngine.evaluateFormula(
    templateLine.calculationFormula, 
    context
  );
}
```

**Lines using formulas**:
- **TOTAL_ASSETS**: `SUM(TOTAL_CURRENT_ASSETS, TOTAL_NON_CURRENT_ASSETS)`
- **TOTAL_LIABILITIES**: `SUM(TOTAL_CURRENT_LIABILITIES, TOTAL_NON_CURRENT_LIABILITIES)`
- **NET_ASSETS**: `TOTAL_ASSETS - TOTAL_LIABILITIES`
- **SURPLUS_DEFICITS_PERIOD**: Complex formula summing all revenues minus all expenses

#### Method C: Special Total Calculation (Hardcoded Totals)
```typescript
// Example: TOTAL_CURRENT_ASSETS
function calculateSpecialTotal(lineCode, statementLines, statementCode) {
  switch (lineCode) {
    case 'TOTAL_CURRENT_ASSETS':
      return sumLinesByPattern(statementLines, [
        'CASH_EQUIVALENTS', 
        'RECEIVABLES_EXCHANGE', 
        'ADVANCE_PAYMENTS'
      ]);
    // ... other cases
  }
}
```

**Lines using special totals**:
- **TOTAL_CURRENT_ASSETS**: Sum of CASH_EQUIVALENTS + RECEIVABLES_EXCHANGE + ADVANCE_PAYMENTS
- **TOTAL_NON_CURRENT_ASSETS**: Sum of DIRECT_INVESTMENTS
- **TOTAL_CURRENT_LIABILITIES**: Sum of PAYABLES + PAYMENTS_RECEIVED_ADVANCE + RETAINED_PERFORMANCE_SECURITIES
- **TOTAL_NON_CURRENT_LIABILITIES**: Sum of DIRECT_BORROWINGS
- **TOTAL_NET_ASSETS**: Sum of ACCUMULATED_SURPLUS_DEFICITS + PRIOR_YEAR_ADJUSTMENTS + SURPLUS_DEFICITS_PERIOD

### 6. **Period Comparison** (Step 8)
```typescript
if (includeComparatives && eventData.previousPeriod.length > 0) {
  const previousAggregation = await dataEngine.aggregateByEvent({
    currentPeriod: eventData.previousPeriod,
    previousPeriod: [],
    metadata: eventData.metadata
  });
  periodComparison = dataEngine.calculatePeriodComparisons(
    aggregatedData, 
    previousAggregation
  );
}
```

**Variance Calculation**:
- For each line, calculates: `variance = currentPeriodValue - previousPeriodValue`
- Includes both absolute difference and percentage change

### 7. **Validation** (Step 13)
```typescript
const validationResults = formulaEngine.validateCalculations(financialStatement);
```

**Key Validation Rules**:
- **Accounting Equation**: Assets = Liabilities + Net Assets
- **Balance Check**: NET_ASSETS should equal TOTAL_NET_ASSETS
- **Formula Consistency**: All calculated lines match their formulas
- **Data Completeness**: All required events have data

## Key Calculation Logic

### Total Current Assets
```
TOTAL_CURRENT_ASSETS = 
  CASH_EQUIVALENTS + 
  RECEIVABLES_EXCHANGE + 
  ADVANCE_PAYMENTS
```

### Total Assets
```
TOTAL_ASSETS = 
  TOTAL_CURRENT_ASSETS + 
  TOTAL_NON_CURRENT_ASSETS
```

### Total Liabilities
```
TOTAL_LIABILITIES = 
  TOTAL_CURRENT_LIABILITIES + 
  TOTAL_NON_CURRENT_LIABILITIES
```

### Net Assets (Accounting Equation)
```
NET_ASSETS = TOTAL_ASSETS - TOTAL_LIABILITIES
```

### Total Net Assets (Equity Reconciliation)
```
TOTAL_NET_ASSETS = 
  ACCUMULATED_SURPLUS_DEFICITS + 
  PRIOR_YEAR_ADJUSTMENTS + 
  SURPLUS_DEFICITS_PERIOD
```

**Critical Validation**: `NET_ASSETS` must equal `TOTAL_NET_ASSETS`

### Surplus/Deficits of the Period
```
SURPLUS_DEFICITS_PERIOD = 
  (All Revenues + Borrowings + Asset Sales) - 
  (All Expenses + Asset Purchases + Debt Repayments)
```

## Data Flow Diagram

```
Request (statementCode='ASSETS_LIAB')
    ↓
Load Template (26 lines)
    ↓
Extract Event Codes (11 unique events)
    ↓
Collect Event Data (from execution tables)
    ↓
Aggregate by Event Code
    ↓
For Each Template Line:
    ├─ Has Event Mappings? → Sum event amounts
    ├─ Has Formula? → Evaluate formula
    └─ Is Special Total? → Calculate from child lines
    ↓
Calculate Period Comparisons (if requested)
    ↓
Validate Accounting Equation
    ↓
Return Statement Response
```

## Important Notes

### 1. **Cash Equivalents Handling**
- Uses `CASH_EQUIVALENTS_END` event only
- `CASH_EQUIVALENTS_BEGIN` is used for carryforward in Cash Flow statement
- Represents the ending balance for the reporting period

### 2. **Surplus/Deficits Calculation**
- Calculated using a comprehensive formula that includes ALL revenue and expense events
- This is the "bottom line" that flows into the equity section
- Must reconcile with the Revenue & Expenditure statement

### 3. **Dual Calculation Approach**
- **Top-down**: NET_ASSETS = TOTAL_ASSETS - TOTAL_LIABILITIES
- **Bottom-up**: TOTAL_NET_ASSETS = Sum of equity components
- These MUST match for the statement to be valid

### 4. **District-Based Access Control**
- Facility filtering applied at data collection stage
- District accountants see aggregated data from all health centers
- Individual facilities see only their own data

### 5. **No Working Capital Adjustments**
- Unlike Cash Flow statement, Balance Sheet doesn't need working capital calculations
- Shows point-in-time balances, not changes

## Potential Issues & Considerations

### Issue 1: Special Total vs Formula Inconsistency
**Problem**: Some totals are calculated via `calculateSpecialTotal()` function while others use formulas in the template.

**Example**:
- `TOTAL_CURRENT_ASSETS` → Uses `calculateSpecialTotal()` (hardcoded)
- `TOTAL_ASSETS` → Uses formula `SUM(TOTAL_CURRENT_ASSETS, TOTAL_NON_CURRENT_ASSETS)`

**Impact**: 
- Maintenance burden (logic in two places)
- Potential for inconsistency if template is updated but code isn't

**Recommendation**: Standardize on one approach (preferably formulas in template)

### Issue 2: Surplus/Deficits Formula Complexity
**Problem**: The `SURPLUS_DEFICITS_PERIOD` formula is extremely long and includes all revenue/expense events.

**Current Formula**:
```
(TAX_REVENUE + GRANTS + TRANSFERS_CENTRAL_TREASURY + ... + EXTERNAL_BORROWINGS) - 
(COMPENSATION_EMPLOYEES + GOODS_SERVICES + ... + OTHER_EXPENSES)
```

**Impact**:
- Hard to maintain
- Prone to errors if new events are added
- Duplicates logic from Revenue & Expenditure statement

**Recommendation**: 
- Calculate from Revenue & Expenditure statement totals
- Or use a reference to that statement's net result

### Issue 3: Event Code vs Event ID Mapping
**Problem**: Template uses event codes (strings) but some legacy code uses event IDs (numbers).

**Current Handling**:
```typescript
const numericId = parseInt(eventCodeOrId);
if (!isNaN(numericId)) {
  const eventCode = eventIdToCodeMap.get(numericId);
  if (eventCode) eventCodeToLookup = eventCode;
}
```

**Impact**: Additional complexity and potential for bugs

**Recommendation**: Standardize on event codes throughout

### Issue 4: Missing Intermediate Subtotals
**Problem**: Template has header lines (e.g., `CURRENT_ASSETS_HEADER`) but they don't calculate values.

**Current Behavior**: Headers show as 0 or blank

**Recommendation**: Either remove headers or make them calculate subtotals

## Summary

The Assets and Liabilities statement generation follows a **template-driven, event-based aggregation** approach:

1. **Template defines structure** (26 lines with hierarchy)
2. **Events provide data** (11 event types from execution tables)
3. **Three calculation methods** (direct mapping, formulas, special totals)
4. **Validation ensures accuracy** (accounting equation must balance)
5. **Period comparison** (optional previous period for variance analysis)

The system is **flexible and extensible** but has some **technical debt** around calculation method consistency and formula complexity.
