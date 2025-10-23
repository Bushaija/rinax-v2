# Design Document

## Overview

This design document outlines the technical approach for restructuring the Statement of Changes in Net Assets from a two-column format (Current Period, Previous Period) to a three-column format (Accumulated surplus/loss, Adjustments, Total). The implementation requires coordinated changes across the template definition, backend processing logic, and frontend rendering components.

## Architecture

### High-Level Flow

```
Template Definition (statement-templates.ts)
    ↓
Template Engine (loads template with column metadata)
    ↓
Data Aggregation Engine (collects event data)
    ↓
Net Assets Processor (categorizes into 3 columns)
    ↓
Formula Engine (calculates totals)
    ↓
API Response (3-column structure)
    ↓
Transform Function (maps to component format)
    ↓
Frontend Component (renders 3-column table)
```

### Key Design Decisions

1. **Column Metadata in Template**: Add a `columnType` field to template lines to indicate which column the data belongs to
2. **Processor Logic**: Enhance NetAssetsProcessor to maintain three separate value fields
3. **API Response Structure**: Extend StatementLine interface to include three value fields
4. **Frontend Transformation**: Update transform function to handle three-column mapping
5. **Backward Compatibility**: Use feature detection to apply changes only to NET_ASSETS_CHANGES

## Components and Interfaces

### 1. Template Structure Enhancement

**File**: `apps/server/src/db/seeds/data/statement-templates.ts`

Add `columnType` metadata to template lines:

```typescript
export type ColumnType = 'ACCUMULATED' | 'ADJUSTMENT' | 'TOTAL' | 'CALCULATED';

export type TemplateLine = {
  lineItem: string;
  lineCode: string;
  eventCodes: string[];
  displayOrder: number;
  level: number;
  parentLineId?: number;
  isTotalLine?: boolean;
  isSubtotalLine?: boolean;
  calculationFormula?: string;
  aggregationMethod?: string;
  formatRules?: Record<string, any>;
  metadata?: {
    columnType?: ColumnType;  // NEW: Indicates which column this line belongs to
    note?: number;
    [key: string]: any;
  };
};
```

**Template Line Examples**:

```typescript
// Opening balance - goes to ACCUMULATED column
{ 
  lineItem: 'Balances as at 30th June {{PREV_YEAR}}', 
  lineCode: 'BALANCES_JUNE_PREV', 
  eventCodes: [], 
  displayOrder: 1, 
  level: 1, 
  isSubtotalLine: true,
  metadata: { columnType: 'ACCUMULATED' }
},

// Adjustment line - goes to ADJUSTMENT column
{ 
  lineItem: 'Cash and cash equivalent', 
  lineCode: 'CASH_EQUIVALENT_PREV_CURRENT', 
  eventCodes: ['CASH_EQUIVALENTS_END'], 
  displayOrder: 3, 
  level: 2,
  metadata: { columnType: 'ADJUSTMENT' }
},

// Total line - calculated from ACCUMULATED + ADJUSTMENT
{ 
  lineItem: 'Balance as at 30th June {{CURRENT_YEAR}}', 
  lineCode: 'BALANCE_JUNE_CURRENT', 
  eventCodes: [], 
  displayOrder: 9, 
  level: 1, 
  isTotalLine: true,
  metadata: { columnType: 'TOTAL' }
},
```

### 2. Statement Line Interface Extension

**File**: `apps/server/src/lib/statement-engine/types/core.types.ts`

Extend the StatementLine interface to support three columns:

```typescript
export interface StatementLine {
  id: string;
  description: string;
  
  // Legacy fields (keep for backward compatibility)
  currentPeriodValue?: number | null;
  previousPeriodValue?: number | null;
  
  // NEW: Three-column fields for NET_ASSETS_CHANGES
  accumulatedSurplus?: number | null;
  adjustments?: number | null;
  total?: number | null;
  
  variance?: {
    absolute: number;
    percentage: number;
  };
  formatting: {
    bold: boolean;
    italic: boolean;
    indentLevel: number;
    isSection: boolean;
    isSubtotal: boolean;
    isTotal: boolean;
  };
  metadata: {
    lineCode: string;
    eventCodes: string[];
    formula?: string;
    isComputed: boolean;
    displayOrder: number;
    columnType?: ColumnType;  // NEW
  };
}
```

### 3. Net Assets Processor Enhancement

**File**: `apps/server/src/lib/statement-engine/processors/net-assets-processor.ts`

Update the processor to handle three-column logic:

```typescript
export class NetAssetsProcessor {
  
  processStatement(
    template: StatementTemplate,
    currentPeriodData: EventAggregation,
    previousPeriodData?: EventAggregation
  ): {
    lines: StatementLine[];
    categories: NetAssetsCategories;
    validation: ValidationResults;
  } {
    const lines: StatementLine[] = [];
    
    for (const templateLine of template.lines) {
      const columnType = this.getColumnType(templateLine);
      const value = this.calculateLineValue(templateLine, currentPeriodData);
      
      const statementLine: StatementLine = {
        id: `NET_ASSETS_${templateLine.lineCode}`,
        description: templateLine.lineItem,
        
        // Assign value to appropriate column based on columnType
        accumulatedSurplus: columnType === 'ACCUMULATED' ? value : null,
        adjustments: columnType === 'ADJUSTMENT' ? value : null,
        total: columnType === 'TOTAL' ? this.calculateTotal(templateLine, lines) : null,
        
        formatting: { /* ... */ },
        metadata: {
          lineCode: templateLine.lineCode,
          eventCodes: templateLine.eventCodes || [],
          columnType: columnType,
          /* ... */
        }
      };
      
      lines.push(statementLine);
    }
    
    // Calculate totals for TOTAL-type lines
    this.calculateTotalLines(lines);
    
    return { lines, categories, validation };
  }
  
  private getColumnType(templateLine: any): ColumnType {
    // Check metadata first
    if (templateLine.metadata?.columnType) {
      return templateLine.metadata.columnType;
    }
    
    // Fallback: Infer from lineCode
    const lineCode = templateLine.lineCode.toUpperCase();
    
    if (lineCode.includes('BALANCE') && lineCode.includes('JUNE')) {
      return lineCode.includes('PREV') ? 'ACCUMULATED' : 'TOTAL';
    }
    
    if (lineCode.includes('BALANCE') && lineCode.includes('JULY')) {
      return 'ACCUMULATED';
    }
    
    if (lineCode.includes('BALANCE') && lineCode.includes('PERIOD_END')) {
      return 'TOTAL';
    }
    
    if (lineCode.includes('ADJUSTMENTS')) {
      return 'ACCUMULATED';  // Header line
    }
    
    // Default: adjustment lines
    return 'ADJUSTMENT';
  }
  
  private calculateTotalLines(lines: StatementLine[]): void {
    // Find section boundaries and calculate totals
    let accumulatedSum = 0;
    let adjustmentSum = 0;
    
    for (const line of lines) {
      const columnType = line.metadata.columnType;
      
      if (columnType === 'ACCUMULATED' && line.accumulatedSurplus !== null) {
        accumulatedSum += line.accumulatedSurplus;
      }
      
      if (columnType === 'ADJUSTMENT' && line.adjustments !== null) {
        adjustmentSum += line.adjustments;
      }
      
      // When we hit a TOTAL line, calculate the sum
      if (columnType === 'TOTAL') {
        line.total = accumulatedSum + adjustmentSum;
        line.accumulatedSurplus = accumulatedSum;
        line.adjustments = adjustmentSum;
        
        // Reset for next section
        accumulatedSum = 0;
        adjustmentSum = 0;
      }
      
      // Carry forward accumulated balance to next section
      if (line.metadata.lineCode === 'BALANCE_JUNE_CURRENT') {
        accumulatedSum = line.total || 0;
      }
    }
  }
}
```

### 4. Data Transformation Layer

**File**: `apps/client/app/dashboard/reports/utils/transform-statement-data.ts`

Add new transformation function for three-column format:

```typescript
export interface NetAssetsRow {
  description: string;
  note: number | null;
  accumulated: number | null;
  adjustments: number | null;
  total: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
}

export interface ThreeColumnStatementLine extends StatementLine {
  accumulatedSurplus?: number | null;
  adjustments?: number | null;
  total?: number | null;
}

export function transformNetAssetsLine(line: ThreeColumnStatementLine): NetAssetsRow {
  const note = line.metadata?.eventCodes && line.metadata.eventCodes.length > 0 
    ? line.metadata.eventCodes[0] 
    : null;

  return {
    description: line.description,
    note: note,
    accumulated: line.accumulatedSurplus ?? null,
    adjustments: line.adjustments ?? null,
    total: line.total ?? null,
    isTotal: line.formatting?.isTotal ?? false,
    isSubtotal: line.formatting?.isSubtotal ?? false,
  };
}

export function transformNetAssetsData(lines: ThreeColumnStatementLine[]): NetAssetsRow[] {
  return lines.map(transformNetAssetsLine);
}
```

### 5. Frontend Component Update

**File**: `apps/client/features/reports/changes-in-net-assets.tsx`

Update component to render three columns:

```typescript
export type NetAssetRow = {
  description: string;
  note: number | null;
  accumulated: number | null;
  adjustments: number | null;
  total: number | null;
  isTotal: boolean;
  isSubtotal: boolean;
};

interface Props {
  initialData: NetAssetRow[];
}

export function ChangesInNetAssetsStatement({ initialData }: Props) {
  if (!initialData) return null;

  const formatValue = (value: number | null): string => {
    if (value === null) return '-';
    if (value === 0) return '0';
    return formatCurrency(value);
  };

  const renderRow = (row: NetAssetRow, idx: number) => {
    const rowClass = `${row.isSubtotal ? 'font-semibold' : ''} ${row.isTotal ? 'font-bold border-t-2' : ''}`;
    
    return (
      <tr key={idx} className={rowClass}>
        <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-700 w-2/5">
          {row.description}
        </td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">
          {formatValue(row.accumulated)}
        </td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">
          {formatValue(row.adjustments)}
        </td>
        <td className="px-6 py-2 text-right text-sm text-gray-900">
          {formatValue(row.total)}
        </td>
      </tr>
    );
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-2/5">
              Description
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Accumulated surplus/loss (Frw)
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Adjustments (Frw)
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total (Frw)
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {initialData.map(renderRow)}
        </tbody>
      </table>
    </div>
  );
}
```

## Data Models

### Template Line with Column Metadata

```typescript
{
  lineItem: 'Cash and cash equivalent',
  lineCode: 'CASH_EQUIVALENT_CURRENT_NEXT',
  eventCodes: ['CASH_EQUIVALENTS_BEGIN'],
  displayOrder: 12,
  level: 2,
  metadata: {
    columnType: 'ADJUSTMENT'  // Indicates this goes in the Adjustments column
  }
}
```

### Statement Line with Three Columns

```typescript
{
  id: 'NET_ASSETS_CASH_EQUIVALENT_CURRENT_NEXT',
  description: 'Cash and cash equivalent',
  accumulatedSurplus: null,
  adjustments: 4182622,
  total: null,
  formatting: {
    bold: false,
    italic: false,
    indentLevel: 2,
    isSection: false,
    isSubtotal: false,
    isTotal: false
  },
  metadata: {
    lineCode: 'CASH_EQUIVALENT_CURRENT_NEXT',
    eventCodes: ['CASH_EQUIVALENTS_BEGIN'],
    columnType: 'ADJUSTMENT',
    displayOrder: 12
  }
}
```

### Transformed Row for Frontend

```typescript
{
  description: 'Cash and cash equivalent',
  note: null,
  accumulated: null,
  adjustments: 4182622,
  total: null,
  isTotal: false,
  isSubtotal: false
}
```

## Error Handling

### Template Validation
- Validate that columnType values are valid enum values
- Warn if TOTAL lines don't have corresponding ACCUMULATED/ADJUSTMENT lines
- Ensure section boundaries are properly defined

### Data Processing
- Handle missing event data gracefully (display 0 or -)
- Validate that totals match accumulated + adjustments
- Log warnings for mismatched calculations

### Frontend Rendering
- Handle null/undefined values by displaying "-"
- Gracefully degrade if three-column data is not available
- Provide fallback to two-column format for backward compatibility

## Testing Strategy

### Unit Tests

1. **Template Engine Tests**
   - Test loading template with columnType metadata
   - Verify column type inference from lineCode
   - Test template validation

2. **Net Assets Processor Tests**
   - Test column categorization logic
   - Test total calculation across sections
   - Test carryforward of accumulated balances
   - Test validation rules for three-column format

3. **Transformation Tests**
   - Test transformNetAssetsLine function
   - Test handling of null values
   - Test backward compatibility with two-column data

4. **Component Tests**
   - Test rendering of three columns
   - Test formatting of values (currency, dashes)
   - Test bold/italic styling for totals

### Integration Tests

1. **End-to-End Statement Generation**
   - Generate NET_ASSETS_CHANGES statement
   - Verify three-column structure in API response
   - Verify correct rendering in frontend

2. **Data Flow Tests**
   - Test event data → aggregation → categorization → rendering
   - Test with real financial data
   - Test with edge cases (all zeros, negative values)

3. **Backward Compatibility Tests**
   - Verify other statement types still work
   - Test with old template format (without columnType)
   - Test fallback behavior

### Manual Testing Checklist

- [ ] Statement displays three columns correctly
- [ ] Opening balances appear in Accumulated column
- [ ] Adjustments appear in Adjustments column
- [ ] Totals are calculated correctly
- [ ] Fiscal year labels are removed from line items
- [ ] Currency formatting is correct
- [ ] Bold/italic formatting is applied correctly
- [ ] Zero values display as "0"
- [ ] Null values display as "-"
- [ ] Statement exports to PDF correctly
- [ ] Other statement types are not affected

## Performance Considerations

- Column categorization adds minimal overhead (O(n) where n = number of lines)
- Total calculation requires single pass through lines
- No additional database queries required
- Frontend rendering performance unchanged (same number of rows)

## Security Considerations

- No new security concerns introduced
- Existing access control remains unchanged
- Data validation rules apply to all three columns

## Deployment Strategy

1. **Phase 1**: Update template definition with columnType metadata
2. **Phase 2**: Deploy backend processor changes
3. **Phase 3**: Deploy frontend component changes
4. **Phase 4**: Run database migration to update existing templates
5. **Phase 5**: Verify in staging environment
6. **Phase 6**: Deploy to production

## Rollback Plan

If issues are discovered:
1. Revert frontend component to two-column format
2. Revert backend processor changes
3. Revert template changes
4. Re-seed database with old template format

The changes are designed to be backward compatible, so rollback should be straightforward.
