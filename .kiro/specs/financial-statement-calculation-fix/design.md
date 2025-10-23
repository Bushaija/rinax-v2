# Design Document

## Overview

This design addresses the financial statement calculation inconsistencies by implementing a unified surplus/deficit calculation approach across all financial statements. The solution removes hardcoded values, standardizes calculation formulas, and ensures compliance with accounting principles while maintaining system performance and maintainability.

## Architecture

### Current Problem Analysis

**Revenue & Expenditure Statement**: ✅ Correct
```typescript
calculationFormula: 'TOTAL_REVENUE - TOTAL_EXPENDITURE'
```

**Assets & Liabilities Statement**: ❌ Incorrect
```typescript
eventMappings: ['SURPLUS_DEFICIT_PERIOD'] // Uses potentially incorrect event data
```

**Net Assets Changes Statement**: ❌ Incorrect
```typescript
eventMappings: ['NET_SURPLUS_DEFICIT'] // Uses potentially incorrect event data
```

**Financial Reports Handlers**: ❌ Hardcoded
```typescript
case 'SURPLUS_DEFICITS_PERIOD':
  return statementCode === 'ASSETS_LIAB' ? -80 : 0; // Hardcoded -80!
```

### Proposed Solution Architecture

Implement a unified calculation approach where all surplus/deficit references use the same formula based on actual revenue and expenditure events, eliminating hardcoded values and event mapping dependencies.

## Components and Interfaces

### 1. Statement Template Updates

**Purpose**: Standardize surplus/deficit calculation across all statement templates

**Changes Required**:

1. **Assets & Liabilities Statement**:
   - Remove `eventMappings: ['SURPLUS_DEFICIT_PERIOD']`
   - Add standardized `calculationFormula`

2. **Net Assets Changes Statement**:
   - Remove `eventMappings: ['NET_SURPLUS_DEFICIT']`
   - Add standardized `calculationFormula` for both period references

### 2. Formula Engine Integration

**Purpose**: Ensure the formula engine can properly evaluate the unified surplus/deficit formula

**Current Capability**: ✅ Already supports
- Event code references in formulas
- Cross-event calculations
- Complex arithmetic expressions

**Formula Structure**:
```typescript
calculationFormula: '(TAX_REVENUE + GRANTS + TRANSFERS_CENTRAL + TRANSFERS_PUBLIC_ENTITIES + FINES_PENALTIES + PROPERTY_INCOME + SALES_GOODS_SERVICES + OTHER_REVENUE) - (COMPENSATION_EMPLOYEES + GOODS_SERVICES + GRANTS_TRANSFERS + SUBSIDIES + SOCIAL_ASSISTANCE + FINANCE_COSTS + OTHER_EXPENSES)'
```

### 3. Handler Cleanup

**Purpose**: Remove hardcoded surplus/deficit calculations from financial report handlers

**Changes Required**:
- Remove `SURPLUS_DEFICITS_PERIOD` from special totals array
- Remove `NET_SURPLUS_PREV_CURRENT` and `NET_SURPLUS_CURRENT_NEXT` from special totals
- Remove hardcoded case statements returning -80

## Data Models

### Unified Surplus/Deficit Calculation

**Revenue Events** (Sum):
- `TAX_REVENUE`: Tax revenue collections
- `GRANTS`: Grant funding received
- `TRANSFERS_CENTRAL`: Central government transfers
- `TRANSFERS_PUBLIC_ENTITIES`: Transfers from other public entities
- `FINES_PENALTIES`: Fines, penalties and forfeits
- `PROPERTY_INCOME`: Property income
- `SALES_GOODS_SERVICES`: Sales of goods and services
- `OTHER_REVENUE`: Other revenue sources

**Expenditure Events** (Sum):
- `COMPENSATION_EMPLOYEES`: Employee compensation
- `GOODS_SERVICES`: Use of goods and services
- `GRANTS_TRANSFERS`: Grants and transfers paid
- `SUBSIDIES`: Subsidies paid
- `SOCIAL_ASSISTANCE`: Social assistance payments
- `FINANCE_COSTS`: Finance costs
- `OTHER_EXPENSES`: Other expenses

**Calculation**:
```
Surplus/Deficit = Total Revenue - Total Expenditure
                = (Sum of Revenue Events) - (Sum of Expenditure Events)
```

### Statement Template Structure

```typescript
interface StatementLine {
  lineCode: string;
  description: string;
  eventMappings: string[]; // Empty for calculated lines
  calculationFormula: string | null; // Unified formula for surplus/deficit
  displayOrder: number;
  formatting: LineFormatting;
}
```

## Error Handling

### Missing Event Data
- **Scenario**: Revenue or expenditure events have no data
- **Handling**: Treat missing events as zero in calculations
- **Result**: Surplus/deficit calculation continues with available data

### Formula Evaluation Errors
- **Scenario**: Formula engine encounters invalid references
- **Handling**: Log error and return zero for the line
- **Result**: Statement generation continues, error is logged for investigation

### Backward Compatibility
- **Scenario**: Existing event mappings for surplus/deficit
- **Handling**: Keep event mappings in database but don't use them in templates
- **Result**: No breaking changes to existing data structure

## Testing Strategy

### Unit Tests
- Formula evaluation with various event data combinations
- Zero handling for missing events
- Calculation accuracy verification

### Integration Tests
- End-to-end statement generation with consistent surplus/deficit
- Cross-statement value comparison
- Performance impact assessment

### Validation Tests
- Accounting equation validation: Assets = Liabilities + Net Assets
- Multi-period consistency checks
- Event data traceability verification

## Implementation Approach

### Phase 1: Template Updates
1. Update Assets & Liabilities statement template
2. Update Net Assets Changes statement template
3. Verify formula syntax and event code references

### Phase 2: Handler Cleanup
1. Remove hardcoded surplus/deficit calculations
2. Remove special total handling for surplus/deficit lines
3. Update total line codes array

### Phase 3: Validation and Testing
1. Test statement generation with updated templates
2. Verify calculation consistency across statements
3. Validate accounting equation compliance
4. Performance testing with large datasets

## Performance Considerations

### Formula Complexity
- **Impact**: Longer formula with multiple event references
- **Mitigation**: Formula engine already optimized for complex calculations
- **Result**: Minimal performance impact expected

### Caching Strategy
- **Current**: Event values cached during statement generation
- **Enhancement**: Consider caching calculated surplus/deficit values
- **Benefit**: Avoid recalculation across multiple statement references

## Migration Strategy

### Database Changes
- **Required**: None - only template configuration changes
- **Backward Compatibility**: Full - existing event mappings preserved
- **Rollback**: Simple - revert template changes

### Deployment Approach
1. Deploy template changes
2. Verify statement generation
3. Monitor for calculation errors
4. Rollback if issues detected

## Monitoring and Observability

### Calculation Validation
- Log surplus/deficit values across all statements
- Alert on inconsistent values between statements
- Track formula evaluation performance

### Data Quality Monitoring
- Monitor for missing revenue/expenditure events
- Track calculation accuracy over time
- Alert on significant surplus/deficit changes