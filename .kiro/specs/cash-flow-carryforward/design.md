# Design Document: Cash Flow Beginning Cash Carryforward

## Overview

This design implements automatic carryforward of ending cash balances from previous periods to beginning cash balances of current periods in cash flow statements. The solution integrates with the existing three-engine architecture (Template Engine, Data Aggregation Engine, Formula Engine) and the Cash Flow Processor.

## Architecture

### High-Level Flow

```
Statement Generation Request
  ↓
Identify Previous Period
  ↓
Query Previous Period Statement
  ↓
Extract Ending Cash
  ↓
Use as Beginning Cash (or fallback to manual entry)
  ↓
Continue Normal Statement Generation
  ↓
Add Carryforward Metadata
  ↓
Validate & Generate Warnings
```

### Component Integration

The carryforward logic will be implemented as a new service that integrates with the existing statement generation flow:

1. **CarryforwardService** - New service for retrieving previous period data
2. **Financial Reports Handler** - Modified to call CarryforwardService before data aggregation
3. **Cash Flow Processor** - Modified to accept carryforward data
4. **Validation Engine** - Enhanced to validate carryforward consistency



## Components and Interfaces

### 1. CarryforwardService

**Location**: `apps/server/src/lib/statement-engine/services/carryforward-service.ts`

**Purpose**: Retrieve ending cash from previous period statements

**Interface**:
```typescript
interface CarryforwardOptions {
  reportingPeriodId: number;
  facilityId?: number;
  facilityIds?: number[];
  projectType: string;
  statementCode: string;
}

interface CarryforwardResult {
  success: boolean;
  beginningCash: number;
  source: 'CARRYFORWARD' | 'MANUAL_ENTRY' | 'FALLBACK';
  metadata: {
    previousPeriodId?: number;
    previousPeriodEndingCash?: number;
    manualEntryAmount?: number;
    discrepancy?: number;
    error?: string;
  };
  warnings: string[];
}

class CarryforwardService {
  constructor(private db: Database);
  
  async getBeginningCash(options: CarryforwardOptions): Promise<CarryforwardResult>;
  
  private async getPreviousPeriod(currentPeriodId: number): Promise<ReportingPeriod | null>;
  
  private async getPreviousPeriodStatement(
    previousPeriodId: number,
    facilityId: number | undefined,
    projectType: string
  ): Promise<FinancialReport | null>;
  
  private extractEndingCash(statement: FinancialReport): number;
  
  private async getManualBeginningCash(
    reportingPeriodId: number,
    facilityId: number | undefined,
    projectType: string
  ): Promise<number>;
}
```



### 2. Previous Period Identification Logic

**Algorithm**:

```typescript
async function getPreviousPeriod(currentPeriodId: number): Promise<ReportingPeriod | null> {
  // 1. Get current period
  const currentPeriod = await db.query.reportingPeriods.findFirst({
    where: eq(reportingPeriods.id, currentPeriodId)
  });
  
  if (!currentPeriod) return null;
  
  // 2. Calculate previous period based on type
  let previousYear = currentPeriod.year;
  let previousPeriodType = currentPeriod.periodType;
  
  switch (currentPeriod.periodType) {
    case 'ANNUAL':
      previousYear = currentPeriod.year - 1;
      break;
      
    case 'QUARTERLY':
      // Extract quarter from period (e.g., "Q1" -> 1)
      const currentQuarter = extractQuarter(currentPeriod);
      if (currentQuarter === 1) {
        previousYear = currentPeriod.year - 1;
        // Previous period is Q4 of previous year
      }
      break;
      
    case 'MONTHLY':
      // Extract month from period
      const currentMonth = extractMonth(currentPeriod);
      if (currentMonth === 1) {
        previousYear = currentPeriod.year - 1;
        // Previous period is December of previous year
      }
      break;
  }
  
  // 3. Query for previous period
  const previousPeriod = await db.query.reportingPeriods.findFirst({
    where: and(
      eq(reportingPeriods.year, previousYear),
      eq(reportingPeriods.periodType, previousPeriodType),
      // Additional logic for quarter/month matching
    )
  });
  
  return previousPeriod;
}
```

**Note**: The current schema doesn't have explicit quarter/month fields. We'll need to either:
- Option A: Add `quarter` and `month` fields to `reporting_periods` table
- Option B: Use date comparison (previous period's endDate is before current period's startDate)
- **Recommended**: Option B for simplicity



### 3. Statement Retrieval Logic

**Query Strategy**:

```typescript
async function getPreviousPeriodStatement(
  previousPeriodId: number,
  facilityId: number | undefined,
  projectType: string
): Promise<FinancialReport | null> {
  
  // Build query conditions
  const conditions = [
    eq(financialReports.reportingPeriodId, previousPeriodId),
    eq(financialReports.metadata, sql`metadata->>'statementCode' = 'CASH_FLOW'`),
    eq(financialReports.status, 'approved') // Only use approved statements
  ];
  
  // Add facility filter
  if (facilityId) {
    conditions.push(eq(financialReports.facilityId, facilityId));
  }
  
  // Add project filter
  const project = await getProjectByType(projectType);
  if (project) {
    conditions.push(eq(financialReports.projectId, project.id));
  }
  
  // Query for statement
  const statement = await db.query.financialReports.findFirst({
    where: and(...conditions),
    orderBy: desc(financialReports.createdAt) // Get most recent if multiple exist
  });
  
  return statement;
}
```

**Ending Cash Extraction**:

```typescript
function extractEndingCash(statement: FinancialReport): number {
  // Option 1: From reportData.totals
  if (statement.reportData?.totals?.ENDING_CASH) {
    return statement.reportData.totals.ENDING_CASH;
  }
  
  // Option 2: From reportData.lines
  const endingCashLine = statement.reportData?.lines?.find(
    (line: any) => line.metadata?.lineCode === 'ENDING_CASH'
  );
  
  if (endingCashLine) {
    return endingCashLine.currentPeriodValue || 0;
  }
  
  // Option 3: From computedTotals
  if (statement.computedTotals?.ENDING_CASH) {
    return statement.computedTotals.ENDING_CASH;
  }
  
  return 0;
}
```



### 4. Integration with Statement Generation

**Modified Handler Flow**:

```typescript
export const generateStatement: AppRouteHandler<GenerateStatementRoute> = async (c) => {
  // ... existing code for user context, validation, etc.
  
  // NEW: Get carryforward beginning cash
  const carryforwardService = new CarryforwardService(db);
  const carryforwardResult = await carryforwardService.getBeginningCash({
    reportingPeriodId,
    facilityId,
    facilityIds: effectiveFacilityIds,
    projectType,
    statementCode: 'CASH_FLOW'
  });
  
  // ... existing code for template loading, data collection, aggregation
  
  // NEW: Inject carryforward beginning cash into aggregated data
  if (carryforwardResult.success && carryforwardResult.beginningCash > 0) {
    // Add to event totals map
    aggregatedData.eventTotals.set('CASH_OPENING_BALANCE', carryforwardResult.beginningCash);
  }
  
  // ... existing code for statement line processing
  
  // NEW: Add carryforward metadata to response
  const response = {
    statement: {
      // ... existing statement data
      metadata: {
        // ... existing metadata
        carryforward: {
          source: carryforwardResult.source,
          previousPeriodId: carryforwardResult.metadata.previousPeriodId,
          previousPeriodEndingCash: carryforwardResult.metadata.previousPeriodEndingCash,
          manualEntryAmount: carryforwardResult.metadata.manualEntryAmount,
          discrepancy: carryforwardResult.metadata.discrepancy
        }
      }
    },
    validation: {
      // ... existing validation
      warnings: [
        ...existingWarnings,
        ...carryforwardResult.warnings
      ]
    }
  };
  
  return c.json(response);
};
```



### 5. Validation and Warning Generation

**Validation Logic**:

```typescript
class CarryforwardValidator {
  
  /**
   * Validate carryforward consistency and generate warnings
   */
  validateCarryforward(
    carryforwardAmount: number,
    manualEntryAmount: number,
    previousPeriodId: number | undefined
  ): { isValid: boolean; warnings: string[] } {
    
    const warnings: string[] = [];
    
    // Warning 1: No previous period found
    if (!previousPeriodId) {
      warnings.push(
        'No previous period statement found. Beginning cash is based on manual entry or defaults to zero.'
      );
    }
    
    // Warning 2: Discrepancy between carryforward and manual entry
    if (carryforwardAmount > 0 && manualEntryAmount > 0) {
      const difference = Math.abs(carryforwardAmount - manualEntryAmount);
      const tolerance = 0.01;
      
      if (difference > tolerance) {
        warnings.push(
          `Beginning cash discrepancy detected: ` +
          `Previous period ending cash (${carryforwardAmount.toFixed(2)}) ` +
          `differs from manual entry (${manualEntryAmount.toFixed(2)}) ` +
          `by ${difference.toFixed(2)}. Using manual entry value.`
        );
      }
    }
    
    // Warning 3: Previous period ending cash is zero
    if (previousPeriodId && carryforwardAmount === 0) {
      warnings.push(
        'Previous period ending cash is zero. This may indicate missing data or a new account.'
      );
    }
    
    // Warning 4: Large beginning cash balance
    if (carryforwardAmount > 1000000) {
      warnings.push(
        `Large beginning cash balance detected (${carryforwardAmount.toFixed(2)}). ` +
        `Please verify this is correct.`
      );
    }
    
    return {
      isValid: warnings.length === 0,
      warnings
    };
  }
}
```

### 6. Multi-Facility Aggregation

**For District-Level Statements**:

```typescript
async function getAggregatedBeginningCash(
  previousPeriodId: number,
  facilityIds: number[],
  projectType: string
): Promise<number> {
  
  let totalBeginningCash = 0;
  
  // Get statements for all facilities
  for (const facilityId of facilityIds) {
    const statement = await getPreviousPeriodStatement(
      previousPeriodId,
      facilityId,
      projectType
    );
    
    if (statement) {
      const endingCash = extractEndingCash(statement);
      totalBeginningCash += endingCash;
    }
  }
  
  return totalBeginningCash;
}
```

**Metadata for Aggregated Carryforward**:

```typescript
interface AggregatedCarryforwardMetadata {
  source: 'CARRYFORWARD_AGGREGATED';
  previousPeriodId: number;
  facilityBreakdown: Array<{
    facilityId: number;
    facilityName: string;
    endingCash: number;
  }>;
  totalBeginningCash: number;
  facilitiesWithMissingData: number[];
}
```



## Data Models

### Extended Financial Report Metadata

```typescript
interface FinancialReportMetadata {
  // ... existing fields
  
  carryforward?: {
    source: 'CARRYFORWARD' | 'CARRYFORWARD_AGGREGATED' | 'MANUAL_ENTRY' | 'FALLBACK';
    previousPeriodId?: number;
    previousPeriodEndingCash?: number;
    manualEntryAmount?: number;
    discrepancy?: number;
    facilityBreakdown?: Array<{
      facilityId: number;
      facilityName: string;
      endingCash: number;
    }>;
    warnings: string[];
    timestamp: string;
  };
}
```

### Carryforward Cache (Optional Enhancement)

```typescript
// For performance optimization
interface CarryforwardCache {
  key: string; // `${periodId}_${facilityId}_${projectType}`
  beginningCash: number;
  previousPeriodId: number;
  cachedAt: Date;
  expiresAt: Date;
}
```

## Error Handling

### Error Scenarios and Responses

1. **Previous Period Not Found**
   - Action: Use manual entry or default to 0
   - Warning: "No previous period statement found"
   - Log: INFO level

2. **Previous Period Statement Not Found**
   - Action: Use manual entry or default to 0
   - Warning: "Previous period cash flow statement not found"
   - Log: INFO level

3. **Database Query Failure**
   - Action: Fall back to manual entry
   - Warning: "Unable to retrieve previous period data"
   - Log: ERROR level with stack trace

4. **Invalid Statement Data**
   - Action: Use manual entry
   - Warning: "Previous period statement data is invalid or corrupted"
   - Log: WARN level

5. **Timeout**
   - Action: Fall back to manual entry after 5 seconds
   - Warning: "Previous period data retrieval timed out"
   - Log: WARN level

### Error Handling Pattern

```typescript
async function getBeginningCash(options: CarryforwardOptions): Promise<CarryforwardResult> {
  try {
    // Attempt carryforward
    const previousPeriod = await this.getPreviousPeriod(options.reportingPeriodId);
    
    if (!previousPeriod) {
      return this.fallbackToManualEntry(options, 'No previous period found');
    }
    
    const statement = await this.getPreviousPeriodStatement(
      previousPeriod.id,
      options.facilityId,
      options.projectType
    );
    
    if (!statement) {
      return this.fallbackToManualEntry(options, 'No previous period statement found');
    }
    
    const endingCash = this.extractEndingCash(statement);
    
    // Check for manual override
    const manualEntry = await this.getManualBeginningCash(
      options.reportingPeriodId,
      options.facilityId,
      options.projectType
    );
    
    if (manualEntry > 0 && Math.abs(manualEntry - endingCash) > 0.01) {
      return {
        success: true,
        beginningCash: manualEntry,
        source: 'MANUAL_ENTRY',
        metadata: {
          previousPeriodId: previousPeriod.id,
          previousPeriodEndingCash: endingCash,
          manualEntryAmount: manualEntry,
          discrepancy: manualEntry - endingCash
        },
        warnings: [
          `Manual entry (${manualEntry}) differs from carryforward (${endingCash})`
        ]
      };
    }
    
    return {
      success: true,
      beginningCash: endingCash,
      source: 'CARRYFORWARD',
      metadata: {
        previousPeriodId: previousPeriod.id,
        previousPeriodEndingCash: endingCash
      },
      warnings: []
    };
    
  } catch (error) {
    console.error('[CarryforwardService] Error:', error);
    return this.fallbackToManualEntry(
      options,
      `Error retrieving previous period data: ${error.message}`
    );
  }
}

private async fallbackToManualEntry(
  options: CarryforwardOptions,
  reason: string
): Promise<CarryforwardResult> {
  
  const manualEntry = await this.getManualBeginningCash(
    options.reportingPeriodId,
    options.facilityId,
    options.projectType
  );
  
  return {
    success: false,
    beginningCash: manualEntry,
    source: 'FALLBACK',
    metadata: {
      error: reason
    },
    warnings: [reason]
  };
}
```



## Testing Strategy

### Unit Tests

1. **CarryforwardService Tests**
   - Test previous period identification for ANNUAL, QUARTERLY, MONTHLY
   - Test statement retrieval with various filters
   - Test ending cash extraction from different data structures
   - Test manual entry override logic
   - Test error handling and fallback scenarios

2. **Validation Tests**
   - Test warning generation for discrepancies
   - Test tolerance levels for differences
   - Test edge cases (zero balances, negative balances)

3. **Multi-Facility Tests**
   - Test aggregation of multiple facility statements
   - Test handling of missing facility data
   - Test facility breakdown metadata

### Integration Tests

1. **End-to-End Statement Generation**
   - Generate statement for period N
   - Generate statement for period N+1
   - Verify beginning cash of N+1 matches ending cash of N

2. **Cross-Project Tests**
   - Verify HIV project carryforward is independent of Malaria
   - Verify project-specific filtering works correctly

3. **District Aggregation Tests**
   - Generate district-level statement
   - Verify aggregated beginning cash is sum of facility ending cash

### Performance Tests

1. **Query Performance**
   - Measure time to retrieve previous period statement
   - Ensure query completes within 1 second for single facility
   - Ensure query completes within 5 seconds for district aggregation

2. **Concurrent Generation**
   - Test multiple statement generations simultaneously
   - Verify no race conditions or data corruption

## Security Considerations

1. **Access Control**
   - Carryforward respects existing facility-based access control
   - Users can only see carryforward data from facilities they have access to
   - District accountants see aggregated data from their district only

2. **Data Integrity**
   - Only approved statements are used for carryforward
   - Draft or rejected statements are excluded
   - Validation ensures data consistency

3. **Audit Trail**
   - All carryforward operations are logged
   - Metadata includes source and timestamp
   - Discrepancies are tracked and reported

