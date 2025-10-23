# Design Document

## Overview

This design implements a configurable event mapping system that allows Budget vs Actual financial statements to use different event codes for budget and actual columns within the same line item. The system extends the existing statement generation architecture while maintaining backward compatibility with other statement types.

## Architecture

### High-Level Flow

1. **Template Loading**: Load the budget vs actual template with default event codes
2. **Mapping Resolution**: Check for configurable mappings that override default template mappings
3. **Data Collection**: Collect data separately for budget events (planning) and actual events (execution)
4. **Statement Generation**: Apply the correct event codes to their respective columns
5. **Variance Calculation**: Calculate variance as Budget - Actual

### Key Components

- **ConfigurableEventMappingService**: Manages configurable mappings
- **BudgetVsActualProcessor**: Handles budget vs actual specific logic
- **Enhanced TemplateEngine**: Supports configurable mappings
- **Database Schema**: Stores configurable mappings

## Components and Interfaces

### ConfigurableEventMappingService

```typescript
interface ConfigurableEventMapping {
  id: number;
  statementCode: string;
  lineCode: string;
  columnType: 'BUDGET' | 'ACTUAL';
  eventCode: string;
  isActive: boolean;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  metadata?: Record<string, any>;
}

class ConfigurableEventMappingService {
  async getMappingsForStatement(statementCode: string): Promise<ConfigurableEventMapping[]>
  async getMappingForLine(statementCode: string, lineCode: string, columnType: 'BUDGET' | 'ACTUAL'): Promise<string | null>
  async createMapping(mapping: Omit<ConfigurableEventMapping, 'id'>): Promise<ConfigurableEventMapping>
  async updateMapping(id: number, updates: Partial<ConfigurableEventMapping>): Promise<ConfigurableEventMapping>
  async deactivateMapping(id: number): Promise<void>
}
```

### BudgetVsActualProcessor

```typescript
interface BudgetVsActualData {
  budgetEventCodes: string[];
  actualEventCodes: string[];
  budgetAmounts: Map<string, number>;
  actualAmounts: Map<string, number>;
}

class BudgetVsActualProcessor {
  async processLine(
    templateLine: TemplateLine, 
    configurableMappings: Map<string, ConfigurableEventMapping[]>
  ): Promise<{
    budgetEventCodes: string[];
    actualEventCodes: string[];
  }>
  
  async collectBudgetVsActualData(
    dataFilters: DataFilters,
    budgetEventCodes: string[],
    actualEventCodes: string[]
  ): Promise<BudgetVsActualData>
}
```

### Enhanced TemplateEngine

```typescript
interface EnhancedTemplateLine extends TemplateLine {
  budgetEventMappings?: string[];
  actualEventMappings?: string[];
  hasConfigurableMapping?: boolean;
}

class EnhancedTemplateEngine extends TemplateEngine {
  async loadTemplateWithMappings(
    statementCode: string,
    configurableMappings?: ConfigurableEventMapping[]
  ): Promise<{
    template: StatementTemplate;
    enhancedLines: EnhancedTemplateLine[];
  }>
}
```

## Data Models

### Database Schema Extension

```sql
-- New table for configurable event mappings
CREATE TABLE configurable_event_mappings (
  id SERIAL PRIMARY KEY,
  statement_code VARCHAR(50) NOT NULL,
  line_code VARCHAR(100) NOT NULL,
  column_type VARCHAR(10) NOT NULL CHECK (column_type IN ('BUDGET', 'ACTUAL')),
  event_code VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP,
  effective_to TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique mapping per statement/line/column combination
  UNIQUE(statement_code, line_code, column_type, effective_from),
  
  -- Foreign key to events table
  CONSTRAINT fk_event_code 
    FOREIGN KEY (event_code) 
    REFERENCES events(code)
);

-- Index for efficient lookups
CREATE INDEX idx_configurable_mappings_lookup 
ON configurable_event_mappings(statement_code, line_code, column_type, is_active);

-- Index for date range queries
CREATE INDEX idx_configurable_mappings_dates 
ON configurable_event_mappings(effective_from, effective_to);
```

### Initial Data

```sql
-- Configure the specific mapping requested: Transfers from public entities
INSERT INTO configurable_event_mappings (
  statement_code, 
  line_code, 
  column_type, 
  event_code, 
  is_active,
  metadata
) VALUES 
(
  'BUDGET_VS_ACTUAL', 
  'TRANSFERS_PUBLIC', 
  'BUDGET', 
  'GOODS_SERVICES_PLANNING', 
  true,
  '{"description": "Budget column uses planning data for program activities", "reason": "RBC budget allocation comparison"}'
),
(
  'BUDGET_VS_ACTUAL', 
  'TRANSFERS_PUBLIC', 
  'ACTUAL', 
  'TRANSFERS_PUBLIC_ENTITIES', 
  true,
  '{"description": "Actual column uses execution data for transfers received", "reason": "RBC actual transfers received"}'
);
```

## Error Handling

### Validation Rules

1. **Event Code Validation**: Ensure referenced event codes exist in the events table
2. **Statement Code Validation**: Verify statement code is valid (BUDGET_VS_ACTUAL, REV_EXP, etc.)
3. **Date Range Validation**: Ensure effective_from <= effective_to when both are specified
4. **Uniqueness Validation**: Prevent duplicate mappings for same statement/line/column/date combination

### Fallback Strategy

```typescript
class MappingResolver {
  async resolveEventCodes(
    statementCode: string,
    lineCode: string,
    defaultEventCodes: string[]
  ): Promise<{
    budgetEventCodes: string[];
    actualEventCodes: string[];
    warnings: string[];
  }> {
    const warnings: string[] = [];
    
    try {
      // Try to get configurable mappings
      const budgetMapping = await this.getMappingForLine(statementCode, lineCode, 'BUDGET');
      const actualMapping = await this.getMappingForLine(statementCode, lineCode, 'ACTUAL');
      
      // Use configurable mappings if available, otherwise fall back to defaults
      const budgetEventCodes = budgetMapping ? [budgetMapping] : defaultEventCodes;
      const actualEventCodes = actualMapping ? [actualMapping] : defaultEventCodes;
      
      return { budgetEventCodes, actualEventCodes, warnings };
      
    } catch (error) {
      warnings.push(`Failed to resolve configurable mappings for ${lineCode}: ${error.message}`);
      
      // Fall back to default behavior
      return {
        budgetEventCodes: defaultEventCodes,
        actualEventCodes: defaultEventCodes,
        warnings
      };
    }
  }
}
```

## Testing Strategy

### Unit Tests

1. **ConfigurableEventMappingService Tests**
   - Test CRUD operations for mappings
   - Test date range filtering
   - Test validation rules

2. **BudgetVsActualProcessor Tests**
   - Test event code resolution with and without configurable mappings
   - Test data collection for separate budget/actual event codes
   - Test fallback behavior when mappings are invalid

3. **Integration Tests**
   - Test end-to-end budget vs actual statement generation
   - Test with various mapping configurations
   - Test backward compatibility with existing statements

### Test Data

```typescript
const testMappings: ConfigurableEventMapping[] = [
  {
    id: 1,
    statementCode: 'BUDGET_VS_ACTUAL',
    lineCode: 'TRANSFERS_PUBLIC',
    columnType: 'BUDGET',
    eventCode: 'GOODS_SERVICES_PLANNING',
    isActive: true
  },
  {
    id: 2,
    statementCode: 'BUDGET_VS_ACTUAL',
    lineCode: 'TRANSFERS_PUBLIC',
    columnType: 'ACTUAL',
    eventCode: 'TRANSFERS_PUBLIC_ENTITIES',
    isActive: true
  }
];
```

### Performance Considerations

1. **Caching**: Cache configurable mappings to avoid repeated database queries
2. **Indexing**: Proper database indexes for efficient mapping lookups
3. **Lazy Loading**: Only load mappings when processing budget vs actual statements
4. **Batch Processing**: Process multiple mappings in single database queries

### Security Considerations

1. **Access Control**: Ensure only authorized users can modify configurable mappings
2. **Audit Trail**: Log all changes to configurable mappings
3. **Validation**: Validate all input data to prevent SQL injection or invalid configurations
4. **Rollback**: Ability to deactivate problematic mappings quickly

## Integration Points

### Existing Statement Generation Flow

The configurable mapping system integrates at these points:

1. **Template Loading**: Enhanced to check for configurable mappings
2. **Data Collection**: Modified to collect separate budget and actual data
3. **Line Processing**: Updated to apply correct event codes per column
4. **Variance Calculation**: Maintains existing logic but with correct data sources

### API Endpoints

```typescript
// New endpoints for managing configurable mappings
GET    /api/configurable-mappings?statementCode=BUDGET_VS_ACTUAL
POST   /api/configurable-mappings
PUT    /api/configurable-mappings/:id
DELETE /api/configurable-mappings/:id

// Enhanced existing endpoint
POST   /api/financial-reports/generate-statement
// Now supports configurable mappings for BUDGET_VS_ACTUAL statements
```

This design ensures that the configurable mapping system integrates seamlessly with existing functionality while providing the flexibility needed for RBC's specific budget vs actual reporting requirements.