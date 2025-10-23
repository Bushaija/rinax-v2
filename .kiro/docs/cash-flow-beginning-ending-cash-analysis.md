# Cash Flow Statement: Beginning & Ending Cash Balance Analysis

## Question
How are the following generated:
- **Cash and cash equivalents at beginning of period** (current fiscal year)
- **Cash and cash equivalents at end of period** (previous year)

## Answer: Template-Driven with Event Mappings

### Current Implementation

The beginning and ending cash balances are **NOT automatically calculated** from previous statements. Instead, they are:

1. **Defined in the statement template** with specific event mappings
2. **Collected from execution data** like any other line item
3. **Identified by keywords** in the Cash Flow Processor

### How It Works

#### Step 1: Template Definition

In the `statement_templates` table, there are lines for beginning and ending cash:

```json
{
  "lineCode": "BEGINNING_CASH",
  "lineItem": "Cash and cash equivalents at beginning of period",
  "eventMappings": ["CASH_OPENING_BALANCE"],  // Event code(s) to aggregate
  "calculationFormula": null,  // Not computed
  "displayOrder": 100
}
```

```json
{
  "lineCode": "ENDING_CASH",
  "lineItem": "Cash and cash equivalents at end of period",
  "eventMappings": ["CASH_CLOSING_BALANCE"],  // Event code(s) to aggregate
  "calculationFormula": null,  // Not computed
  "displayOrder": 200
}
```


#### Step 2: Data Collection

When generating the cash flow statement:

1. **Event codes are extracted** from template:
   ```typescript
   const eventCodes = template.lines
     .flatMap(line => line.eventMappings || [])
     .filter((code, index, array) => array.indexOf(code) === index);
   // Result: [..., "CASH_OPENING_BALANCE", "CASH_CLOSING_BALANCE", ...]
   ```

2. **Data is collected** from `schemaFormDataEntries`:
   ```sql
   SELECT 
     events.code as eventCode,
     form_data->>'amount' as amount
   FROM schema_form_data_entries
   WHERE event_code IN ('CASH_OPENING_BALANCE', 'CASH_CLOSING_BALANCE')
     AND reporting_period_id = ?
     AND entity_type = 'EXECUTION'
   ```

3. **Data is aggregated** into event totals map:
   ```typescript
   eventTotals.set('CASH_OPENING_BALANCE', 50000);
   eventTotals.set('CASH_CLOSING_BALANCE', 75000);
   ```

#### Step 3: Line Processing

For each template line:

```typescript
// For BEGINNING_CASH line
let currentPeriodValue = 0;
for (const eventCode of templateLine.eventMappings) {
  currentPeriodValue += aggregatedData.eventTotals.get(eventCode) || 0;
}
// Result: currentPeriodValue = 50000
```

#### Step 4: Categorization

The Cash Flow Processor identifies these lines using keywords:

```typescript
private isBeginningCash(lineCode: string, description: string): boolean {
  const beginningKeywords = ['beginning', 'start', 'opening'];
  return beginningKeywords.some(keyword => description.includes(keyword)) ||
         lineCode.includes('BEG') || lineCode.includes('OPEN');
}

private isEndingCash(lineCode: string, description: string): boolean {
  const endingKeywords = ['ending', 'end', 'closing'];
  return endingKeywords.some(keyword => description.includes(keyword)) ||
         lineCode.includes('END') || lineCode.includes('CLOS');
}
```

Then stores them in categories:

```typescript
if (this.isBeginningCash(lineCode, description)) {
  categories.summary.beginningCash = value;  // 50000
} else if (this.isEndingCash(lineCode, description)) {
  categories.summary.endingCash = value;  // 75000
}
```


#### Step 5: Validation

The system validates the cash flow balance:

```typescript
const expectedEndingCash = categories.summary.beginningCash + categories.summary.netCashFlow;
const cashBalanceDifference = categories.summary.endingCash - expectedEndingCash;
const isValid = Math.abs(cashBalanceDifference) <= 0.01;

// If valid: Beginning (50000) + Net Change (25000) = Ending (75000) ✓
```

## The Problem: No Automatic Continuity

### Current Behavior

**Beginning cash of current period** is entered as execution data, NOT automatically pulled from:
- Previous period's ending cash
- Balance sheet's cash balance

**Ending cash of current period** is also entered as execution data, NOT automatically calculated as:
- Beginning cash + Net cash flow

### Example Scenario

**Q1 2024 Cash Flow Statement:**
- Beginning Cash: 50,000 (manually entered via CASH_OPENING_BALANCE event)
- Net Cash Flow: 25,000 (calculated)
- Ending Cash: 75,000 (manually entered via CASH_CLOSING_BALANCE event)

**Q2 2024 Cash Flow Statement:**
- Beginning Cash: ??? (should be 75,000 from Q1, but must be manually entered)
- Net Cash Flow: 30,000 (calculated)
- Ending Cash: ??? (should be 105,000, but must be manually entered)

### Validation Catches Errors

If someone enters incorrect values:
- Beginning: 80,000 (wrong!)
- Net Change: 30,000
- Ending: 105,000

The validation will flag: `80,000 + 30,000 ≠ 105,000` (difference: 5,000)


## Alternative Approaches (Not Currently Implemented)

### Option 1: Automatic Carryforward from Previous Period

```typescript
// Pseudo-code for automatic carryforward
async function getBeginningCash(facilityId, reportingPeriodId) {
  // Get previous period
  const previousPeriod = await getPreviousPeriod(reportingPeriodId);
  
  // Get previous period's cash flow statement
  const previousStatement = await generateStatement({
    statementCode: 'CASH_FLOW',
    reportingPeriodId: previousPeriod.id,
    facilityId
  });
  
  // Return previous period's ending cash as current period's beginning cash
  return previousStatement.totals.ENDING_CASH;
}
```

**Pros:**
- Ensures continuity between periods
- Reduces manual data entry
- Eliminates carryforward errors

**Cons:**
- Requires previous period statement to exist
- What about the very first period?
- Circular dependency if previous period has errors

### Option 2: Pull from Balance Sheet

```typescript
// Pseudo-code for balance sheet integration
async function getBeginningCash(facilityId, reportingPeriodId) {
  // Get period start date
  const period = await getPeriod(reportingPeriodId);
  
  // Get balance sheet at period start
  const balanceSheet = await generateStatement({
    statementCode: 'ASSETS_LIAB',
    asOfDate: period.startDate,
    facilityId
  });
  
  // Return cash balance from balance sheet
  return balanceSheet.lines.find(l => l.lineCode === 'CASH_AND_EQUIVALENTS').currentPeriodValue;
}
```

**Pros:**
- Single source of truth (balance sheet)
- Aligns with accounting principles
- Ensures consistency across statements

**Cons:**
- Requires balance sheet to be generated first
- Balance sheet might not exist for all periods
- Adds complexity to generation flow


### Option 3: Computed Ending Cash (Hybrid Approach)

```typescript
// Current implementation in calculateComputedTotals()
if (categories.summary.endingCash === 0 && categories.summary.beginningCash !== 0) {
  // If ending cash not provided, calculate it
  categories.summary.endingCash = 
    categories.summary.beginningCash + categories.summary.netCashFlow;
}
```

**This is partially implemented!** The system will calculate ending cash if:
- Beginning cash is provided (non-zero)
- Ending cash is NOT provided (zero)

**Current behavior:**
- Beginning cash: **Must be entered** (from event data)
- Ending cash: **Can be calculated** OR entered (from event data)

## Recommendations

### Short-term (Current System)

1. **Document the requirement** that users must enter:
   - `CASH_OPENING_BALANCE` event for beginning cash
   - `CASH_CLOSING_BALANCE` event for ending cash (optional if validation passes)

2. **Rely on validation** to catch errors:
   - The system validates: Beginning + Net Change = Ending
   - Errors are flagged if difference > 0.01

3. **User training** on:
   - How to carry forward ending cash to next period's beginning
   - Importance of consistency

### Medium-term (Enhancement)

1. **Implement automatic carryforward**:
   - Query previous period's ending cash
   - Use as default for current period's beginning cash
   - Allow override if needed

2. **Add UI helper**:
   - Show previous period's ending cash when entering current period
   - Suggest carryforward value
   - Highlight if values don't match

### Long-term (Full Integration)

1. **Integrate with Balance Sheet**:
   - Pull beginning cash from balance sheet at period start
   - Validate ending cash against balance sheet at period end
   - Ensure all three statements reconcile

2. **Implement statement dependencies**:
   - Cash flow depends on balance sheet
   - Net assets changes depend on both
   - Generate in correct order


## Summary

### How Beginning & Ending Cash Are Currently Generated

1. **Template-driven**: Lines are defined in `statement_templates` table
2. **Event-mapped**: Each line maps to specific event codes (e.g., `CASH_OPENING_BALANCE`, `CASH_CLOSING_BALANCE`)
3. **Data-collected**: Values come from `schemaFormDataEntries` where users enter execution data
4. **Keyword-identified**: Cash Flow Processor recognizes these lines by keywords
5. **Validated**: System checks that Beginning + Net Change = Ending

### Key Insight

**Beginning and ending cash are NOT automatically calculated or carried forward.**

They are **manually entered as execution data** and must be mapped to specific events in the template.

The system provides **validation** to ensure consistency, but does NOT enforce **continuity** between periods or **integration** with balance sheets.

### Data Flow

```
User enters execution data
  ↓
CASH_OPENING_BALANCE event created (amount: 50000)
  ↓
Data aggregation collects event
  ↓
Event totals map: { 'CASH_OPENING_BALANCE': 50000 }
  ↓
Template line with eventMappings: ['CASH_OPENING_BALANCE']
  ↓
Line value calculated: 50000
  ↓
Cash Flow Processor identifies as beginning cash
  ↓
categories.summary.beginningCash = 50000
  ↓
Validation: Beginning + Net Change = Ending?
  ↓
Statement generated with beginning cash = 50000
```

### Critical Gap

**No automatic link between:**
- Period N ending cash → Period N+1 beginning cash
- Balance sheet cash balance → Cash flow beginning/ending cash
- Previous year ending → Current year beginning

This must be handled **manually** or through **future enhancements**.

