# Cash Flow Statement: Template-Driven vs Hardcoded Analysis

## Executive Summary

The Cash Flow statement is **partially template-driven** with significant hardcoded logic. Approximately **60% template-driven, 40% hardcoded**.

## Breakdown by Component

### 1. **Line Structure & Display** - 100% Template-Driven ✅

**From Template**:
- Line descriptions (e.g., "Tax revenue", "Compensation of employees")
- Display order (38 lines in specific sequence)
- Hierarchy levels (1-4 levels of indentation)
- Formatting rules (bold, italic, subtotals)
- Section headers (Operating, Investing, Financing)

**Example from template**:
```typescript
{ 
  lineItem: 'Tax revenue', 
  lineCode: 'TAX_REVENUE', 
  eventCodes: ['TAX_REVENUE'], 
  displayOrder: 4, 
  level: 4 
}
```

**Verdict**: Fully template-driven. Adding/removing/reordering lines only requires template changes.

---

### 2. **Event Mappings (Data Lines)** - 100% Template-Driven ✅

**From Template**:
- Which events map to which lines
- Event codes for each line (e.g., `TAX_REVENUE`, `GRANTS`)
- Multiple events per line (e.g., `PROCEEDS_BORROWINGS` = `DOMESTIC_BORROWINGS` + `EXTERNAL_BORROWINGS`)

**Example from template**:
```typescript
{ 
  lineItem: 'Proceeds from borrowings', 
  lineCode: 'PROCEEDS_BORROWINGS', 
  eventCodes: ['DOMESTIC_BORROWINGS', 'EXTERNAL_BORROWINGS'],
  displayOrder: 33, 
  level: 2 
}
```

**Code that uses it**:
```typescript
// Generic code - works for ANY event mapping from template
for (const eventCodeOrId of templateLine.eventMappings || []) {
  const amount = aggregatedData.eventTotals.get(eventCodeToLookup) || 0;
  currentPeriodValue += amount;
}
```

**Verdict**: Fully template-driven. Changing event mappings only requires template changes.

---

### 3. **Working Capital Lines** - 50% Template-Driven ⚠️

**From Template**:
```typescript
{ 
  lineItem: 'Changes in receivables', 
  lineCode: 'CHANGES_RECEIVABLES', 
  eventCodes: ['ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE'], 
  displayOrder: 23, 
  level: 3, 
  calculationFormula: 'WORKING_CAPITAL_CHANGE(RECEIVABLES)', 
  metadata: { isComputed: true } 
}
```

**Hardcoded Logic**:
```typescript
// HARDCODED: Specific check for CASH_FLOW statement
if (statementCode === 'CASH_FLOW' && workingCapitalResult) {
  // HARDCODED: Specific check for CHANGES_RECEIVABLES line
  if (templateLine.lineCode === 'CHANGES_RECEIVABLES') {
    currentPeriodValue = workingCapitalResult.receivablesChange.cashFlowAdjustment;
    isWorkingCapitalComputed = true;
  } 
  // HARDCODED: Specific check for CHANGES_PAYABLES line
  else if (templateLine.lineCode === 'CHANGES_PAYABLES') {
    currentPeriodValue = workingCapitalResult.payablesChange.cashFlowAdjustment;
    isWorkingCapitalComputed = true;
  }
}
```

**Hardcoded Working Capital Calculation**:
```typescript
// HARDCODED: Event codes for receivables
const receivablesEventCodes = ['ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE'];
// HARDCODED: Event codes for payables
const payablesEventCodes = ['PAYABLES'];

// HARDCODED: Sign logic
const receivablesCashFlowAdjustment = -receivablesChange;  // Negative for increase
const payablesCashFlowAdjustment = payablesChange;         // Positive for increase
```

**What's Template-Driven**:
- Line codes (`CHANGES_RECEIVABLES`, `CHANGES_PAYABLES`)
- Display properties
- Event codes (but duplicated in hardcoded logic)

**What's Hardcoded**:
- Detection of which lines need working capital calculation
- Event codes for working capital calculation (duplicated from template)
- Sign logic (negative for receivables, positive for payables)
- Calculation method (current - previous)

**Verdict**: Partially template-driven. The template defines WHAT to display, but hardcoded logic defines HOW to calculate.

---

### 4. **Carryforward (Beginning Cash)** - 25% Template-Driven ⚠️

**From Template**:
```typescript
{ 
  lineItem: 'Cash and cash equivalents at beginning of period', 
  lineCode: 'CASH_BEGINNING', 
  eventCodes: ['CASH_EQUIVALENTS_BEGIN'], 
  displayOrder: 37, 
  level: 2 
}
```

**Hardcoded Logic**:
```typescript
// HARDCODED: Specific check for CASH_FLOW statement
if (statementCode === 'CASH_FLOW') {
  // HARDCODED: Call to CarryforwardService
  const carryforwardService = new CarryforwardService(db);
  
  carryforwardResult = await carryforwardService.getBeginningCash({
    reportingPeriodId,
    facilityId,
    facilityIds: effectiveFacilityIds,
    projectType,
    statementCode
  });
  
  // HARDCODED: Injection logic
  if (carryforwardResult.source === 'CARRYFORWARD' || 
      carryforwardResult.source === 'CARRYFORWARD_AGGREGATED') {
    const existingAmount = aggregatedData.eventTotals.get('CASH_EQUIVALENTS_BEGIN') || 0;
    
    if (existingAmount !== 0) {
      // Manual entry exists, preserve it
    } else {
      // Inject carryforward
      aggregatedData.eventTotals.set('CASH_EQUIVALENTS_BEGIN', carryforwardResult.beginningCash);
    }
  }
}
```

**What's Template-Driven**:
- Line code (`CASH_BEGINNING`)
- Event code (`CASH_EQUIVALENTS_BEGIN`)
- Display properties

**What's Hardcoded**:
- Detection that CASH_FLOW needs carryforward
- CarryforwardService invocation
- Priority logic (manual entry > carryforward > fallback)
- Multi-facility aggregation logic
- Timeout handling (15 seconds)
- Injection into aggregatedData

**Verdict**: Minimally template-driven. The template only defines the line; all logic is hardcoded.

---

### 5. **Section Totals** - 0% Template-Driven ❌

**From Template**:
```typescript
{ 
  lineItem: 'Net cash flows from operating activities', 
  lineCode: 'NET_CASH_FLOW_OPERATING', 
  eventCodes: [], 
  displayOrder: 26, 
  level: 1, 
  isTotalLine: true 
}
```

**Hardcoded Logic**:
```typescript
// HARDCODED: Detection of which lines need special calculation
function shouldComputeTotal(lineCode: string): boolean {
  const totalLineCodes = [
    // HARDCODED: List of line codes
    'NET_CASH_FLOW_OPERATING',
    'NET_CASH_FLOW_INVESTING',
    'NET_CASH_FLOW_FINANCING',
    'NET_INCREASE_CASH',
    'CASH_ENDING',
    // ... other statements
  ];
  return totalLineCodes.includes(lineCode);
}

// HARDCODED: Calculation logic for each total
function calculateSpecialTotal(lineCode, statementLines, statementCode) {
  switch (lineCode) {
    case 'NET_CASH_FLOW_OPERATING':
      return calculateOperatingCashFlow(statementLines);
    case 'NET_CASH_FLOW_INVESTING':
      return calculateInvestingCashFlow(statementLines);
    case 'NET_CASH_FLOW_FINANCING':
      return calculateFinancingCashFlow(statementLines);
    case 'NET_INCREASE_CASH':
      return calculateNetIncreaseCash(statementLines);
    case 'CASH_ENDING':
      return calculateCashEnding(statementLines);
    default:
      return 0;
  }
}

// HARDCODED: Operating cash flow calculation
function calculateOperatingCashFlow(statementLines: StatementLine[]): number {
  // HARDCODED: Which lines are revenues
  const revenues = sumLinesByPattern(statementLines, [
    'TAX_REVENUE', 'GRANTS', 'TRANSFERS_CENTRAL', 'TRANSFERS_PUBLIC',
    'FINES_PENALTIES', 'PROPERTY_INCOME', 'SALES_GOODS_SERVICES', 'OTHER_REVENUE'
  ]);

  // HARDCODED: Which lines are expenses
  const expenses = sumLinesByPattern(statementLines, [
    'COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS',
    'SUBSIDIES', 'SOCIAL_ASSISTANCE', 'FINANCE_COSTS', 'OTHER_EXPENSES'
  ]);

  // HARDCODED: Which lines are adjustments
  const adjustments = sumLinesByPattern(statementLines, [
    'CHANGES_RECEIVABLES', 'CHANGES_PAYABLES', 'PRIOR_YEAR_ADJUSTMENTS'
  ]);

  // HARDCODED: Formula
  return revenues - expenses + adjustments;
}
```

**What's Template-Driven**:
- Line code (`NET_CASH_FLOW_OPERATING`)
- Display properties
- `isTotalLine: true` flag (but not used for calculation)

**What's Hardcoded**:
- Detection of which lines need special calculation
- Which child lines to sum
- Calculation formula (revenues - expenses + adjustments)
- Sign logic (subtract expenses, add adjustments)

**Verdict**: Not template-driven at all. The template only defines the line; all calculation logic is hardcoded.

---

### 6. **HOTFIX for Ending Cash** - 0% Template-Driven ❌

**From Template**:
```typescript
{ 
  lineItem: 'Cash and cash equivalents at end of period', 
  lineCode: 'CASH_ENDING', 
  eventCodes: ['CASH_EQUIVALENTS_END'], 
  displayOrder: 38, 
  level: 2 
}
```

**Hardcoded Logic**:
```typescript
// HARDCODED: Specific check for CASH_FLOW and CASH_ENDING
if (statementCode === 'CASH_FLOW' && 
    templateLine.lineCode === 'CASH_ENDING' && 
    currentPeriodValue === 0) {
  
  // HARDCODED: Use carryforward service as workaround
  const carryforwardService = new CarryforwardService(db);
  const endingCashResult = await carryforwardService.getBeginningCash({
    reportingPeriodId,
    facilityId,
    facilityIds: effectiveFacilityIds,
    projectType,
    statementCode: 'CASH_FLOW'
  });
  
  if (endingCashResult.success && endingCashResult.beginningCash !== 0) {
    currentPeriodValue = endingCashResult.beginningCash;
  }
}
```

**Verdict**: Completely hardcoded workaround. Not template-driven at all.

---

## Summary Table

| Component | Template-Driven % | Hardcoded % | Notes |
|-----------|------------------|-------------|-------|
| Line Structure & Display | 100% | 0% | ✅ Fully template-driven |
| Event Mappings (Data Lines) | 100% | 0% | ✅ Fully template-driven |
| Working Capital Lines | 50% | 50% | ⚠️ Template defines WHAT, code defines HOW |
| Carryforward (Beginning Cash) | 25% | 75% | ⚠️ Mostly hardcoded logic |
| Section Totals | 0% | 100% | ❌ Completely hardcoded |
| HOTFIX for Ending Cash | 0% | 100% | ❌ Completely hardcoded |
| **Overall** | **~60%** | **~40%** | ⚠️ Partially template-driven |

## What Would Be Needed for 100% Template-Driven?

### 1. **Working Capital Calculation**

**Current Template**:
```typescript
{ 
  lineCode: 'CHANGES_RECEIVABLES', 
  calculationFormula: 'WORKING_CAPITAL_CHANGE(RECEIVABLES)' 
}
```

**What's Needed**:
- Formula engine must support `WORKING_CAPITAL_CHANGE()` function
- Template must specify event codes for calculation
- Template must specify sign logic (negative for receivables)

**Proposed Template Enhancement**:
```typescript
{ 
  lineCode: 'CHANGES_RECEIVABLES',
  calculationFormula: 'WORKING_CAPITAL_CHANGE(RECEIVABLES)',
  calculationConfig: {
    method: 'BALANCE_CHANGE',
    eventCodes: ['ADVANCE_PAYMENTS', 'RECEIVABLES_EXCHANGE', 'RECEIVABLES_NON_EXCHANGE'],
    signMultiplier: -1,  // Negative for receivables increase
    requiresPreviousPeriod: true
  }
}
```

### 2. **Carryforward Logic**

**Current Template**:
```typescript
{ 
  lineCode: 'CASH_BEGINNING', 
  eventCodes: ['CASH_EQUIVALENTS_BEGIN'] 
}
```

**What's Needed**:
- Template must specify carryforward behavior
- Template must specify priority (manual > carryforward > fallback)
- Template must specify source event for carryforward

**Proposed Template Enhancement**:
```typescript
{ 
  lineCode: 'CASH_BEGINNING',
  eventCodes: ['CASH_EQUIVALENTS_BEGIN'],
  carryforwardConfig: {
    enabled: true,
    sourceEvent: 'CASH_EQUIVALENTS_END',
    sourcePeriod: 'PREVIOUS',
    priority: ['MANUAL_ENTRY', 'CARRYFORWARD', 'FALLBACK'],
    fallbackValue: 0,
    aggregationMethod: 'SUM'  // For multi-facility
  }
}
```

### 3. **Section Totals**

**Current Template**:
```typescript
{ 
  lineCode: 'NET_CASH_FLOW_OPERATING', 
  isTotalLine: true 
}
```

**What's Needed**:
- Template must specify calculation formula
- Template must specify which child lines to include
- Template must specify sign logic

**Proposed Template Enhancement**:
```typescript
{ 
  lineCode: 'NET_CASH_FLOW_OPERATING',
  isTotalLine: true,
  calculationFormula: 'SUM(REVENUES) - SUM(EXPENSES) + SUM(ADJUSTMENTS)',
  calculationConfig: {
    REVENUES: ['TAX_REVENUE', 'GRANTS', 'TRANSFERS_CENTRAL', 'TRANSFERS_PUBLIC', 
               'FINES_PENALTIES', 'PROPERTY_INCOME', 'SALES_GOODS_SERVICES', 'OTHER_REVENUE'],
    EXPENSES: ['COMPENSATION_EMPLOYEES', 'GOODS_SERVICES', 'GRANTS_TRANSFERS',
               'SUBSIDIES', 'SOCIAL_ASSISTANCE', 'FINANCE_COSTS', 'OTHER_EXPENSES'],
    ADJUSTMENTS: ['CHANGES_RECEIVABLES', 'CHANGES_PAYABLES', 'PRIOR_YEAR_ADJUSTMENTS']
  }
}
```

### 4. **Cash Reconciliation**

**Current Template**:
```typescript
{ 
  lineCode: 'CASH_ENDING', 
  eventCodes: ['CASH_EQUIVALENTS_END'] 
}
```

**What's Needed**:
- Template must specify reconciliation formula
- Template must specify fallback logic

**Proposed Template Enhancement**:
```typescript
{ 
  lineCode: 'CASH_ENDING',
  eventCodes: ['CASH_EQUIVALENTS_END'],
  calculationFormula: 'CASH_BEGINNING + NET_INCREASE_CASH',
  fallbackConfig: {
    enabled: true,
    method: 'CARRYFORWARD_SERVICE',
    condition: 'VALUE_IS_ZERO'
  }
}
```

## Comparison with Assets & Liabilities

| Aspect | Assets & Liabilities | Cash Flow |
|--------|---------------------|-----------|
| Line Structure | 100% Template | 100% Template |
| Event Mappings | 100% Template | 100% Template |
| Special Calculations | 0% Template (hardcoded) | 0-50% Template (mixed) |
| Unique Logic | None | Carryforward + Working Capital (hardcoded) |
| Overall Template-Driven | ~70% | ~60% |

**Key Difference**: Cash Flow has more hardcoded logic due to:
1. Carryforward requirements
2. Working capital adjustments
3. More complex section totals

## Recommendations

### Short-Term (Keep Current Architecture)
1. **Document Hardcoded Logic**: Add comments explaining why certain logic is hardcoded
2. **Consolidate Duplicates**: Event codes for working capital are in both template and code
3. **Fix HOTFIX**: Resolve the root cause of `CASH_EQUIVALENTS_END` mapping failure

### Medium-Term (Enhance Template Engine)
1. **Implement Formula Functions**: Add `WORKING_CAPITAL_CHANGE()`, `CARRYFORWARD()` to formula engine
2. **Add Calculation Configs**: Extend template schema to support calculation configurations
3. **Reduce Hardcoded Checks**: Replace `if (statementCode === 'CASH_FLOW')` with template-driven behavior

### Long-Term (Fully Template-Driven)
1. **Declarative Templates**: All calculation logic defined in templates
2. **Generic Calculation Engine**: No statement-specific code in handlers
3. **Plugin Architecture**: Special behaviors (carryforward, working capital) as plugins

## Conclusion

The Cash Flow statement is **moderately template-driven** (60%):

**Template-Driven** ✅:
- Line structure and display (100%)
- Event mappings for data lines (100%)
- Basic formatting and hierarchy (100%)

**Hardcoded** ❌:
- Working capital calculation logic (50%)
- Carryforward logic (75%)
- Section total calculations (100%)
- HOTFIX for ending cash (100%)

**To achieve 100% template-driven**, the system would need:
1. Enhanced template schema with calculation configs
2. Formula engine supporting special functions
3. Generic calculation engine without statement-specific code
4. Plugin architecture for unique behaviors

The current architecture is a **pragmatic compromise** between flexibility (template-driven) and functionality (hardcoded for complex logic).
