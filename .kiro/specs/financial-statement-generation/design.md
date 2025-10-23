# Design Document

## Overview

The Financial Statement Generation system provides a scalable, template-driven approach to generate standardized financial statements from planning and execution data. The system uses a three-layer architecture: Template Engine (reads database templates), Data Aggregation Engine (processes event mappings), and Formula Engine (handles calculations and validations). This design ensures new financial statements can be added through database configuration without code changes.

## Architecture

### High-Level Flow
1. **Request Validation**: Parse and validate statement generation parameters
2. **Template Loading**: Load TemplateLine structure for the requested statement type
3. **Event Data Collection**: Gather planning/execution data based on event mappings
4. **Data Aggregation**: Aggregate event data by facility, period, and event codes
5. **Formula Processing**: Calculate computed values, totals, and subtotals
6. **Multi-Period Processing**: Generate current and previous period values
7. **Validation**: Perform accounting equation and business rule validations
8. **Response Formatting**: Structure data for optimal UI rendering

### Core Engines

#### Template Engine
- Loads TemplateLine configurations from database
- Builds hierarchical statement structure
- Manages display order, formatting, and metadata
- Handles template versioning and validation

#### Data Aggregation Engine  
- Maps activities to standardized event codes via EventMappingData
- Aggregates values across facilities and time periods
- Handles missing data and data source prioritization
- Supports both planning and execution data sources

#### Formula Engine
- Processes calculation formulas (SUM, DIFF, computed balances)
- Resolves line item dependencies in correct order
- Handles variance calculations for budget vs actual
- Validates accounting equations and business rules

## Components and Interfaces

### API Endpoint
```typescript
POST /api/financial-reports/generate-statement
{
  "statementCode": "REV_EXP" | "BAL_SHEET" | "CASH_FLOW" | "NET_ASSETS" | "BUDGET_VS_ACTUAL",
  "reportingPeriodId": number,
  "projectType": "HIV" | "Malaria" | "TB",
  "facilityId"?: number, // optional - if omitted, aggregates all facilities
  "includeComparatives": boolean, // default: true
  "customMappings"?: Record<string, any> // optional overrides
}
```

### Response Structure
```typescript
interface FinancialStatementResponse {
  statement: {
    statementCode: string;
    statementName: string;
    reportingPeriod: PeriodInfo;
    facility?: FacilityInfo;
    generatedAt: string;
    lines: StatementLine[];
    totals: Record<string, number>;
    metadata: StatementMetadata;
  };
  validation: {
    isValid: boolean;
    accountingEquation: BalanceValidation;
    businessRules: BusinessRuleValidation[];
    warnings: string[];
    errors: string[];
  };
  performance: {
    processingTimeMs: number;
    linesProcessed: number;
    eventsProcessed: number;
    formulasCalculated: number;
  };
}

interface StatementLine {
  id: string;
  description: string;
  note?: number;
  currentPeriodValue: number;
  previousPeriodValue: number;
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
  };
}
```

### Database Schema Integration

#### Template Lines Query
```sql
SELECT 
  tl.id,
  tl.lineCode,
  tl.lineItem as description,
  tl.displayOrder,
  tl.isTotalLine,
  tl.isSubtotalLine,
  tl.indentLevel,
  tl.bold,
  tl.italic,
  tl.calculationFormula,
  tl.eventMappings,
  tl.displayConditions,
  tl.noteReference,
  st.statementCode,
  st.statementName
FROM templateLines tl
JOIN statementTemplates st ON tl.templateId = st.id
WHERE st.statementCode = ? 
  AND st.isActive = true
  AND tl.isActive = true
ORDER BY tl.displayOrder
```

#### Event Data Aggregation Query
```sql
WITH event_data AS (
  SELECT 
    emd.eventCode,
    ed.eventType,
    ed.debitCredit,
    sfe.facilityId,
    sfe.reportingPeriodId,
    sfe.formData,
    sfe.entityType,
    rp.year,
    rp.quarter
  FROM eventMappingData emd
  JOIN eventData ed ON emd.eventCode = ed.eventCode
  JOIN schemaFormDataEntries sfe ON emd.activityId = sfe.activityId
  JOIN reportingPeriods rp ON sfe.reportingPeriodId = rp.id
  WHERE sfe.projectId = ?
    AND (? IS NULL OR sfe.facilityId = ?)
    AND sfe.entityType IN (?, ?) -- planning/execution based on statement type
    AND rp.year IN (?, ?) -- current and previous year
)
SELECT 
  eventCode,
  facilityId,
  year,
  entityType,
  SUM(CASE WHEN debitCredit = 'debit' THEN amount ELSE -amount END) as netAmount
FROM event_data
GROUP BY eventCode, facilityId, year, entityType
```

## Data Models

### Template Processing
```typescript
interface TemplateProcessor {
  loadTemplate(statementCode: string): Promise<StatementTemplate>;
  validateTemplate(template: StatementTemplate): ValidationResult;
  buildLineHierarchy(templateLines: TemplateLine[]): StatementLine[];
}

interface StatementTemplate {
  id: number;
  statementCode: string;
  statementName: string;
  lines: TemplateLine[];
  metadata: TemplateMetadata;
}

interface TemplateLine {
  id: number;
  lineCode: string;
  description: string;
  displayOrder: number;
  eventMappings: string[];
  calculationFormula?: string;
  formatting: LineFormatting;
  displayConditions?: DisplayCondition[];
}
```

### Event Data Processing
```typescript
interface EventDataProcessor {
  collectEventData(
    filters: DataFilters,
    eventCodes: string[]
  ): Promise<EventDataCollection>;
  
  aggregateByEvent(
    eventData: EventDataCollection
  ): Promise<EventAggregation>;
  
  calculatePeriodComparisons(
    currentPeriod: EventAggregation,
    previousPeriod: EventAggregation
  ): PeriodComparison;
}

interface EventDataCollection {
  currentPeriod: EventEntry[];
  previousPeriod: EventEntry[];
  metadata: CollectionMetadata;
}

interface EventEntry {
  eventCode: string;
  facilityId: number;
  amount: number;
  entityType: 'planning' | 'execution';
  reportingPeriodId: number;
}
```

### Formula Processing
```typescript
interface FormulaProcessor {
  evaluateFormula(
    formula: string,
    context: FormulaContext
  ): Promise<number>;
  
  resolveDependencies(
    lines: StatementLine[]
  ): StatementLine[];
  
  validateCalculations(
    statement: FinancialStatement
  ): ValidationResult;
}

interface FormulaContext {
  eventValues: Map<string, number>;
  lineValues: Map<string, number>;
  previousPeriodValues: Map<string, number>;
  customMappings?: Record<string, any>;
}
```

## Error Handling

### Template Errors
- **Missing Template**: Return 404 with available statement codes
- **Invalid Template Structure**: Return 400 with template validation errors
- **Template Version Conflicts**: Log warning and use latest active version

### Data Collection Errors
- **Missing Event Mappings**: Log warning, treat as zero values, continue processing
- **Data Source Unavailable**: Return 503 with retry information
- **Invalid Event Codes**: Log error, skip invalid events, include in warnings

### Formula Processing Errors
- **Formula Syntax Errors**: Log error, return zero for line, include in validation results
- **Circular Dependencies**: Return 400 with dependency chain information
- **Division by Zero**: Return zero and include warning in validation results

### Validation Errors
- **Accounting Equation Imbalance**: Include in validation results, don't block generation
- **Business Rule Violations**: Include warnings, allow statement generation
- **Data Integrity Issues**: Log errors, include in validation results

## Testing Strategy

### Unit Tests
- **Template Loading**: Test template parsing and validation
- **Event Data Aggregation**: Test data collection and aggregation logic
- **Formula Evaluation**: Test all supported formula types and edge cases
- **Multi-Period Processing**: Test current vs previous period calculations
- **Validation Logic**: Test accounting equation and business rule validations

### Integration Tests
- **End-to-End Statement Generation**: Test complete flow for each statement type
- **Database Integration**: Test template and event data queries
- **Error Scenarios**: Test handling of missing data and invalid parameters
- **Performance**: Test with large datasets and complex formulas

### Statement-Specific Tests
- **Revenue & Expenditure**: Test revenue/expense categorization and totals
- **Balance Sheet**: Test asset/liability/equity balance validation
- **Cash Flow**: Test cash flow categorization and balance
- **Budget vs Actual**: Test variance calculations and multi-source data
- **Net Assets**: Test net asset change calculations

## Implementation Considerations

### Performance Optimizations
1. **Template Caching**: Cache loaded templates to avoid repeated database queries
2. **Event Data Batching**: Load all required event data in optimized batch queries
3. **Formula Optimization**: Pre-compile and cache formula expressions
4. **Parallel Processing**: Process independent calculations in parallel
5. **Memory Management**: Stream large datasets to prevent memory issues

### Data Consistency
1. **Event Code Standardization**: Ensure consistent event code mapping across modules
2. **Period Boundary Handling**: Handle fiscal year vs calendar year differences
3. **Currency Consistency**: Ensure all amounts are in consistent currency units
4. **Rounding Standards**: Apply consistent rounding rules across all calculations

### Scalability Considerations
1. **Horizontal Scaling**: Design for multiple concurrent statement generations
2. **Database Optimization**: Index event data tables for optimal query performance
3. **Caching Strategy**: Implement Redis caching for frequently requested statements
4. **Async Processing**: Support background generation for complex statements

### Security and Access Control
1. **Facility Access Control**: Ensure users can only access authorized facility data
2. **Data Sensitivity**: Log all financial statement generations for audit trails
3. **Template Security**: Validate template formulas to prevent code injection
4. **Rate Limiting**: Implement rate limiting to prevent system abuse

### Extensibility Design
1. **Plugin Architecture**: Support custom formula functions through plugins
2. **Template Versioning**: Support multiple template versions for different periods
3. **Custom Statement Types**: Enable new statement types through database configuration
4. **Integration Points**: Provide hooks for custom validation and processing logic