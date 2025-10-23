# Design Document

## Overview

The Compiled Execution Aggregation feature provides district-level financial reporting by aggregating execution data across multiple health facilities. The system will create a new API endpoint that queries execution data from multiple facilities, aggregates the financial values, and returns a structured response optimized for tabular display in the UI.

## Architecture

### High-Level Flow
1. **Request Processing**: Validate and parse query parameters for filtering
2. **Data Retrieval**: Query execution data from multiple facilities based on filters
3. **Activity Catalog Loading**: Load the complete activity structure for consistent reporting
4. **Data Aggregation**: Sum quarterly values across facilities for each activity
5. **Response Formatting**: Structure data for optimal UI rendering

### Key Components
- **Compiled Execution Handler**: Main endpoint logic for aggregation
- **Aggregation Service**: Business logic for summing values across facilities
- **Activity Structure Builder**: Ensures consistent activity hierarchy
- **Response Formatter**: Optimizes data structure for frontend consumption

## Components and Interfaces

### API Endpoint
```typescript
GET /api/execution/compiled
Query Parameters:
- projectType?: 'HIV' | 'Malaria' | 'TB'
- facilityType?: 'hospital' | 'health_center'
- reportingPeriodId?: number
- year?: number
- quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4'
- districtId?: number (future enhancement)
```

### Response Structure
```typescript
interface CompiledExecutionResponse {
  data: {
    facilities: FacilityColumn[];
    activities: ActivityRow[];
    sections: SectionSummary[];
    totals: FacilityTotals;
  };
  meta: {
    filters: AppliedFilters;
    aggregationDate: string;
    facilityCount: number;
    reportingPeriod: string;
  };
}

interface FacilityColumn {
  id: number;
  name: string;
  facilityType: string;
  projectType: string;
  hasData: boolean;
}

interface ActivityRow {
  code: string;
  name: string;
  category: string;
  subcategory?: string;
  displayOrder: number;
  isSection: boolean;
  isSubcategory: boolean;
  isComputed: boolean;
  computationFormula?: string;
  values: Record<string, number>; // facilityId -> value
  total: number;
  level: number; // 0=section, 1=subcategory, 2=activity
}
```

### Database Queries

#### Primary Data Query
```sql
SELECT 
  sfe.id,
  sfe.formData,
  sfe.computedValues,
  f.id as facilityId,
  f.name as facilityName,
  f.facilityType,
  p.projectType,
  rp.year,
  rp.quarter
FROM schemaFormDataEntries sfe
JOIN facilities f ON sfe.facilityId = f.id
JOIN projects p ON sfe.projectId = p.id
LEFT JOIN reportingPeriods rp ON sfe.reportingPeriodId = rp.id
WHERE sfe.entityType = 'execution'
  AND sfe.isActive = true
  [AND additional filters based on query params]
```

#### Activity Catalog Query
```sql
SELECT 
  da.code,
  da.name,
  da.displayOrder,
  da.isTotalRow,
  da.fieldMappings,
  sac.name as categoryName,
  sac.code as categoryCode,
  sac.subCategoryCode,
  sac.isComputed,
  sac.computationFormula
FROM dynamicActivities da
JOIN schemaActivityCategories sac ON da.categoryId = sac.id
WHERE da.moduleType = 'execution'
  AND da.isActive = true
  AND sac.isActive = true
  [AND project/facility type filters]
ORDER BY sac.displayOrder, da.displayOrder
```

## Data Models

### Aggregation Logic
```typescript
interface AggregationEngine {
  aggregateByActivity(
    executionData: ExecutionEntry[],
    activityCatalog: ActivityDefinition[]
  ): AggregatedData;
  
  calculateComputedValues(
    aggregatedData: AggregatedData
  ): ComputedValues;
  
  buildHierarchicalStructure(
    aggregatedData: AggregatedData,
    computedValues: ComputedValues
  ): ActivityRow[];
}
```

### Value Extraction
```typescript
interface ValueExtractor {
  extractActivityValues(
    formData: any,
    activityCode: string
  ): QuarterlyValues;
  
  sumQuarterlyValues(
    values: QuarterlyValues[]
  ): QuarterlyValues;
}

interface QuarterlyValues {
  q1: number;
  q2: number;
  q3: number;
  q4: number;
  total: number;
}
```

## Error Handling

### Validation Errors
- **Invalid Filters**: Return 400 with specific validation messages
- **Missing Required Parameters**: Return 400 with parameter requirements
- **Invalid Enum Values**: Return 400 with valid options

### Data Errors
- **No Execution Data Found**: Return 200 with empty data and explanatory message
- **Incomplete Activity Catalog**: Log warning and continue with available activities
- **Facility Data Inconsistencies**: Include facility in results but flag issues

### System Errors
- **Database Connection Issues**: Return 500 with generic error message
- **Query Timeouts**: Return 500 with timeout message
- **Memory Issues**: Implement pagination if dataset is too large

## Testing Strategy

### Unit Tests
- **Aggregation Logic**: Test summing of quarterly values across facilities
- **Value Extraction**: Test extraction of activity values from form data
- **Computed Calculations**: Test C=A-B, F=D-E calculations
- **Response Formatting**: Test structure of API response

### Integration Tests
- **Database Queries**: Test query performance with large datasets
- **Filter Combinations**: Test various filter parameter combinations
- **Error Scenarios**: Test handling of missing data and invalid parameters

### Performance Tests
- **Large Dataset Handling**: Test with 50+ facilities and full activity catalogs
- **Query Optimization**: Ensure queries complete within 30 seconds
- **Memory Usage**: Monitor memory consumption during aggregation

## Implementation Considerations

### Performance Optimizations
1. **Batch Data Loading**: Load all execution data in single query with joins
2. **Activity Catalog Caching**: Cache activity structure to avoid repeated queries
3. **Efficient Aggregation**: Use Map/Set data structures for O(1) lookups
4. **Response Streaming**: Consider streaming for very large datasets

### Data Consistency
1. **Activity Code Matching**: Handle cases where facilities have different activity versions
2. **Missing Activities**: Treat missing activities as zero values in aggregation
3. **Computed Value Validation**: Recalculate computed values to ensure accuracy

### Scalability Considerations
1. **Pagination Support**: Add pagination for districts with many facilities
2. **Async Processing**: Consider background processing for very large reports
3. **Caching Strategy**: Cache compiled reports for frequently requested combinations

### Security and Access Control
1. **District-Level Access**: Ensure users can only access facilities in their district
2. **Role-Based Filtering**: Apply facility access controls based on user roles
3. **Data Sensitivity**: Log access to compiled financial reports for audit trails