# Cash Flow Statement Generation - Deep Dive

## Overview

This document provides a comprehensive explanation of how cash flow statements are generated in the backend, from data collection to final statement output.

## Architecture

The cash flow statement generation follows a **three-engine architecture**:

1. **Template Engine** - Loads statement templates
2. **Data Aggregation Engine** - Collects and aggregates event data
3. **Formula Engine** - Evaluates formulas and computed lines

Additionally, there's a specialized **Cash Flow Processor** that handles cash flow-specific logic.

## Generation Flow

### Step 1: Request Initiation

**Endpoint**: `POST /api/financial-reports/generate-statement`

**Request Body**:
```json
{
  "statementCode": "CASH_FLOW",
  "reportingPeriodId": 123,
  "projectType": "HIV",
  "facilityId": 456,
  "includeComparatives": true,
  "customMappings": {}
}
```

**Handler**: `apps/server/src/api/routes/financial-reports/financial-reports.handlers.ts`

### Step 2: User Context & Access Control

The system first validates user access:

```typescript
const userContext = await getUserContext(c);
// Returns: userId, facilityId, districtId, facilityType, accessibleFacilityIds, role
```


**District-Based Filtering**:
- Uses `buildFacilityFilter()` to ensure users only see data from their district
- District accountants see aggregated data from ALL health centers in their district
- Facility users see only their own facility data

### Step 3: Template Loading

**Engine**: `TemplateEngine` (`apps/server/src/lib/statement-engine/engines/template-engine.ts`)

```typescript
const template = await templateEngine.loadTemplate('CASH_FLOW');
```

**Template Structure**:
- `statementCode`: "CASH_FLOW"
- `statementName`: "Cash Flow Statement"
- `lines[]`: Array of template lines with:
  - `lineCode`: Unique identifier (e.g., "OPERATING_RECEIPTS")
  - `description`: Display text
  - `eventMappings[]`: Array of event codes to aggregate
  - `calculationFormula`: Optional formula for computed lines
  - `formatting`: Display formatting (bold, indent, etc.)
  - `displayOrder`: Sort order

### Step 4: Event Code Extraction

The system extracts all unique event codes from the template:

```typescript
const eventCodes = template.lines
  .flatMap(line => line.eventMappings || [])
  .filter((code, index, array) => array.indexOf(code) === index);
```

This creates a list of all events needed for the statement.


### Step 5: Project Lookup

The system finds the correct project for the project type:

```typescript
const project = await db.query.projects.findFirst({
  where: sql`${projects.projectType} = ${projectType}`
});
```

This ensures data is collected for the correct project (HIV, Malaria, or TB).

### Step 6: Data Collection

**Engine**: `DataAggregationEngine` (`apps/server/src/lib/statement-engine/engines/data-aggregation-engine.ts`)

**Data Filters Setup**:
```typescript
const dataFilters: DataFilters = {
  projectId: project.id,
  facilityId: facilityId,
  facilityIds: effectiveFacilityIds, // Array of accessible facilities
  reportingPeriodId: reportingPeriodId,
  projectType: projectType,
  entityTypes: [EventType.EXECUTION] // Cash flow uses EXECUTION data
};
```

**Data Collection Process**:

1. **Current Period Data**:
   - Queries `schemaFormDataEntries` table
   - Joins with `configurableEventMappings` to get event codes
   - Filters by project, facility, period, and entity type
   - Returns array of `EventEntry` objects

2. **Previous Period Data** (if comparatives requested):
   - Same process but for previous reporting period
   - Used for variance calculations


**Query Structure** (simplified):
```sql
SELECT 
  events.code as eventCode,
  form_data->>'amount' as amount,
  facility_id,
  reporting_period_id
FROM schema_form_data_entries
INNER JOIN configurable_event_mappings 
  ON entity_id = activity_id
INNER JOIN events 
  ON event_id = events.id
WHERE 
  project_id = ?
  AND facility_id IN (?)  -- District-based filtering
  AND reporting_period_id = ?
  AND entity_type = 'EXECUTION'
```

### Step 7: Data Aggregation

**Method**: `aggregateByEvent()`

The engine aggregates collected data into three maps:

1. **Event Totals Map**: `Map<eventCode, totalAmount>`
   ```typescript
   eventTotals.set(entry.eventCode, currentTotal + entry.amount);
   ```

2. **Facility Totals Map**: `Map<facilityId, totalAmount>`
   - Tracks total amounts per facility
   - Used for facility breakdown reports

3. **Period Totals Map**: `Map<periodId, totalAmount>`
   - Tracks total amounts per period
   - Used for period comparisons

**Example Output**:
```typescript
{
  eventTotals: Map {
    'CASH_RECEIPTS_CUSTOMERS' => 150000,
    'CASH_PAYMENTS_SUPPLIERS' => 80000,
    'ASSET_PURCHASE' => 25000,
    ...
  },
  facilityTotals: Map { 456 => 225000 },
  periodTotals: Map { 123 => 225000 },
  metadata: {
    totalEvents: 45,
    totalFacilities: 1,
    totalAmount: 225000,
    aggregationMethod: 'SUM',
    processingTime: 125
  }
}
```


### Step 8: Statement Line Processing

**Processor**: `CashFlowProcessor` (`apps/server/src/lib/statement-engine/processors/cash-flow-processor.ts`)

For each template line, the system:

1. **Calculates Line Value**:
   ```typescript
   // Sum all event mappings for the line
   let total = 0;
   for (const eventCode of templateLine.eventMappings || []) {
     total += aggregatedData.eventTotals.get(eventCode) || 0;
   }
   ```

2. **Categorizes the Line**:
   - **Operating Activities**: Cash receipts, cash payments
   - **Investing Activities**: Asset purchases, asset sales
   - **Financing Activities**: Borrowings, repayments, capital contributions

3. **Creates Statement Line**:
   ```typescript
   const statementLine: StatementLine = {
     id: `CASH_FLOW_${templateLine.lineCode}`,
     description: templateLine.description,
     currentPeriodValue: currentValue,
     previousPeriodValue: previousValue,
     variance: calculateVariance(currentValue, previousValue),
     formatting: { bold, italic, indentLevel, isSection, isSubtotal, isTotal },
     metadata: { lineCode, eventCodes, formula, isComputed, displayOrder }
   };
   ```

### Step 9: Computed Lines & Totals

The Cash Flow Processor automatically calculates:

1. **Net Operating Cash Flow**:
   ```typescript
   netOperatingCashFlow = cashReceipts - cashPayments
   ```

2. **Net Investing Cash Flow**:
   ```typescript
   netInvestingCashFlow = assetSales - assetPurchases
   ```

3. **Net Financing Cash Flow**:
   ```typescript
   netFinancingCashFlow = borrowings + capitalContributions - repayments
   ```

4. **Net Change in Cash**:
   ```typescript
   netCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow
   ```

5. **Ending Cash Balance**:
   ```typescript
   endingCash = beginningCash + netCashFlow
   ```


### Step 10: Validation

**Validation Rules**:

1. **Cash Flow Balance Check**:
   ```typescript
   expectedEndingCash = beginningCash + netCashFlow
   isValid = Math.abs(endingCash - expectedEndingCash) <= 0.01
   ```

2. **Net Cash Flow Calculation**:
   ```typescript
   expectedNetCashFlow = netOperatingCashFlow + netInvestingCashFlow + netFinancingCashFlow
   isValid = Math.abs(netCashFlow - expectedNetCashFlow) <= 0.01
   ```

3. **Operating Activity Check**:
   - Validates that operating cash flow activities are present

4. **Receipt to Payment Ratio**:
   - Checks if ratio is reasonable (between 10% and 1000%)

**Warnings Generated**:
- Negative operating cash flow
- Large negative cash flow relative to beginning balance
- Unusual investing or financing patterns

**Errors Generated**:
- Significant cash flow imbalance (> 100)
- Large negative ending cash balance (< -1000)

### Step 11: Period Comparisons

If `includeComparatives: true`, the system:

1. Collects previous period data
2. Aggregates previous period data
3. Calculates variances for each line:
   ```typescript
   variance = {
     absolute: currentValue - previousValue,
     percentage: (absolute / Math.abs(previousValue)) * 100
   }
   ```


### Step 12: Response Assembly

**Final Response Structure**:

```typescript
{
  statement: {
    statementCode: "CASH_FLOW",
    statementName: "Cash Flow Statement",
    reportingPeriod: {
      id: 123,
      year: 2024,
      type: "QUARTERLY",
      startDate: "2024-01-01",
      endDate: "2024-03-31"
    },
    previousPeriod: { ... }, // If comparatives included
    hasPreviousPeriodData: true,
    facility: {
      id: 456,
      name: "District Hospital",
      type: "DISTRICT_HOSPITAL",
      district: "Central District"
    },
    generatedAt: "2024-03-31T12:00:00Z",
    lines: [
      {
        id: "CASH_FLOW_OPERATING_RECEIPTS",
        description: "Cash Receipts from Customers",
        currentPeriodValue: 150000,
        previousPeriodValue: 140000,
        variance: { absolute: 10000, percentage: 7.14 },
        formatting: { bold: false, italic: false, indentLevel: 1, ... },
        metadata: { lineCode: "OPERATING_RECEIPTS", eventCodes: [...], ... }
      },
      // ... more lines
    ],
    totals: {
      NET_OPERATING_CASH_FLOW: 70000,
      NET_INVESTING_CASH_FLOW: -25000,
      NET_FINANCING_CASH_FLOW: 5000,
      NET_CHANGE_CASH: 50000,
      ENDING_CASH: 100000
    },
    metadata: {
      templateVersion: "1.0",
      calculationFormulas: { ... },
      validationResults: { ... },
      footnotes: [ ... ]
    }
  },
  validation: {
    isValid: true,
    accountingEquation: {
      isValid: true,
      leftSide: 100000,
      rightSide: 100000,
      difference: 0,
      equation: "Beginning Cash + Net Cash Flow = Ending Cash"
    },
    businessRules: [ ... ],
    warnings: [ ... ],
    errors: [ ... ]
  },
  performance: {
    processingTimeMs: 1250,
    linesProcessed: 25,
    eventsProcessed: 45,
    formulasCalculated: 6
  }
}
```


## Key Components

### 1. Template Engine

**Location**: `apps/server/src/lib/statement-engine/engines/template-engine.ts`

**Responsibilities**:
- Load statement templates from database
- Parse template configuration
- Provide template structure to other engines

### 2. Data Aggregation Engine

**Location**: `apps/server/src/lib/statement-engine/engines/data-aggregation-engine.ts`

**Responsibilities**:
- Collect event data from database
- Aggregate data by event, facility, and period
- Calculate period comparisons
- Handle district-based access control

**Key Methods**:
- `collectEventData()` - Collects raw event data
- `aggregateByEvent()` - Aggregates into maps
- `calculatePeriodComparisons()` - Computes variances

### 3. Formula Engine

**Location**: `apps/server/src/lib/statement-engine/engines/formula-engine.ts`

**Responsibilities**:
- Evaluate calculation formulas
- Handle computed lines (totals, subtotals)
- Support formula syntax (SUM, LINE, EVENT references)

### 4. Cash Flow Processor

**Location**: `apps/server/src/lib/statement-engine/processors/cash-flow-processor.ts`

**Responsibilities**:
- Categorize cash flows (operating, investing, financing)
- Calculate net cash flows
- Validate cash flow balance
- Generate cash flow-specific warnings

**Categorization Logic**:
- Uses line codes and descriptions to categorize
- Keywords: "receipt", "payment", "asset", "loan", etc.
- Automatically identifies cash flow types

