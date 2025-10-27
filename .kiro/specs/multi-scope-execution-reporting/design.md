# Design Document

## Overview

The Multi-Scope Execution Reporting feature extends the existing compiled execution aggregation handler to support hierarchical reporting at district, provincial, and country levels. The design introduces a scope parameter that determines the aggregation level and column representation, following the natural organizational hierarchy.

**Key Principle: Hierarchical Compilation**

The system follows a "compile down" approach that mirrors the natural organizational structure:

| **Scope**         | **Columns Represent**                            | **Aggregation Level**     |
| ----------------- | ------------------------------------------------ | ------------------------- |
| District          | Individual facilities (Hospital + HCs)           | Facility-level detail     |
| Provincial        | District hospitals (pre-aggregated with HCs)     | District-level summary    |
| Country           | Provinces (pre-aggregated)                       | Provincial-level summary  |

This approach provides:
- **Meaningful aggregation** at each level (operational → management → executive view)
- **Scalability** by reducing column count at higher levels (5 provinces vs 100+ facilities)
- **Natural hierarchy** that mirrors real-world organizational structure
- **Clear ownership** at each level

The implementation follows a strategy pattern for scope-based filtering and aggregation, making it extensible for future scope types while maintaining backward compatibility with the existing district-level reporting.

## Architecture

### High-Level Flow

1. **Request Validation**: Parse and validate scope parameter along with existing filters
2. **Access Control**: Verify user has permission to access the requested scope
3. **Scope-Based Filtering**: Build facility filter based on scope and user context
4. **Data Retrieval**: Query execution data using scope-filtered facility list
5. **Aggregation**: Use existing aggregation service (unchanged)
6. **Response Enhancement**: Add scope metadata to response

### Key Design Principles

- **Minimal Changes**: Leverage existing aggregation logic without modification
- **Strategy Pattern**: Encapsulate scope-specific filtering logic in separate functions
- **Role-Based Access**: Enforce access control before executing queries
- **Performance Awareness**: Use indexed queries and provide performance warnings
- **Extensibility**: Design for easy addition of new scope types

## Components and Interfaces

### 1. API Endpoint Extension

**Existing Endpoint**: `GET /api/execution/compiled`

**New Query Parameter**:
```typescript
scope?: 'district' | 'provincial' | 'country'
```

**Updated Query Schema**:
```typescript
export const compiledExecutionQuerySchema = z.object({
  // New scope parameter
  scope: z.enum(['district', 'provincial', 'country'])
    .optional()
    .default('district')
    .describe("Organizational scope for aggregation"),
  
  // New provincial scope parameter
  provinceId: z.coerce.number().int().optional()
    .describe("Province ID (required for provincial scope)"),
  
  // Existing parameters remain unchanged
  projectType: z.enum(['HIV', 'Malaria', 'TB']).optional(),
  facilityType: z.enum(['hospital', 'health_center']).optional(),
  reportingPeriodId: z.coerce.number().int().optional(),
  year: z.coerce.number().int().optional(),
  quarter: z.enum(['Q1', 'Q2', 'Q3', 'Q4']).optional(),
  districtId: z.coerce.number().int().optional(),
});
```

### 2. Hierarchical Aggregation Strategy

The aggregation logic differs by scope to create meaningful column representations:

**District Scope Aggregation**:
```typescript
// Group by individual facility
const columns = facilities.map(facility => ({
  id: facility.id,
  name: facility.name,
  type: 'facility',
  values: aggregateByFacility(facility.id)
}));
```

**Provincial Scope Aggregation**:
```typescript
// Group by district hospital (aggregate hospital + its child HCs)
const districtHospitals = facilities.filter(f => f.facilityType === 'hospital');

const columns = districtHospitals.map(hospital => {
  const childHCs = facilities.filter(f => f.parentFacilityId === hospital.id);
  const allFacilities = [hospital, ...childHCs];
  
  return {
    id: hospital.districtId,
    name: `${hospital.district.name} District Hospital`,
    type: 'district',
    values: aggregateMultipleFacilities(allFacilities.map(f => f.id))
  };
});
```

**Country Scope Aggregation**:
```typescript
// Group by province (aggregate all facilities in province)
const provinces = await db.select().from(provinces);

const columns = provinces.map(province => {
  const provinceFacilities = facilities.filter(f => 
    f.district.provinceId === province.id
  );
  
  return {
    id: province.id,
    name: province.name,
    type: 'province',
    values: aggregateMultipleFacilities(provinceFacilities.map(f => f.id))
  };
});
```

### 3. Scope Filter Builder (Strategy Pattern)

**Interface**:
```typescript
interface ScopeFilterBuilder {
  buildFilter(
    userContext: UserContext,
    queryParams: CompiledExecutionQuery
  ): SQL | null;
  
  validateAccess(
    userContext: UserContext,
    queryParams: CompiledExecutionQuery
  ): { allowed: boolean; message?: string };
}
```

**Implementation**:
```typescript
// District scope filter (existing behavior)
function buildDistrictScopeFilter(
  userContext: UserContext,
  queryParams: CompiledExecutionQuery
): SQL | null {
  // If user has districtId, filter to their district(s)
  if (userContext.districtId) {
    return eq(facilities.districtId, userContext.districtId);
  }
  
  // If admin specifies districtId, use that
  if (queryParams.districtId && hasAdminAccess(userContext)) {
    return eq(facilities.districtId, queryParams.districtId);
  }
  
  return null; // No district filter (admin viewing all)
}

// Provincial scope filter (new)
// Returns district hospitals with their child HCs pre-aggregated
function buildProvincialScopeFilter(
  userContext: UserContext,
  queryParams: CompiledExecutionQuery
): SQL | null {
  if (!queryParams.provinceId) {
    throw new Error("provinceId is required for provincial scope");
  }
  
  // Filter to all facilities in districts within the province
  // These will be aggregated by district hospital in the aggregation step
  return inArray(
    facilities.districtId,
    db.select({ id: districts.id })
      .from(districts)
      .where(eq(districts.provinceId, queryParams.provinceId))
  );
}

// Country scope filter (new)
// Returns all facilities to be aggregated by province
function buildCountryScopeFilter(
  userContext: UserContext,
  queryParams: CompiledExecutionQuery
): SQL | null {
  // Include all active facilities - will be aggregated by province
  return eq(facilities.isActive, true);
}

// Main scope filter builder
function buildScopeFilter(
  scope: 'district' | 'provincial' | 'country',
  userContext: UserContext,
  queryParams: CompiledExecutionQuery
): SQL | null {
  switch (scope) {
    case 'district':
      return buildDistrictScopeFilter(userContext, queryParams);
    case 'provincial':
      return buildProvincialScopeFilter(userContext, queryParams);
    case 'country':
      return buildCountryScopeFilter(userContext, queryParams);
    default:
      throw new Error(`Unsupported scope: ${scope}`);
  }
}
```

### 3. Access Control Validation

**Function**:
```typescript
function validateScopeAccess(
  scope: 'district' | 'provincial' | 'country',
  userContext: UserContext,
  queryParams: CompiledExecutionQuery
): { allowed: boolean; message?: string } {
  // Accountants can only access district scope
  if (!hasAdminAccess(userContext.role, userContext.permissions)) {
    if (scope !== 'district') {
      return {
        allowed: false,
        message: `Access denied: ${userContext.role} role can only access district scope`
      };
    }
    
    // Validate district access for accountants
    if (queryParams.districtId && 
        userContext.districtId && 
        queryParams.districtId !== userContext.districtId) {
      return {
        allowed: false,
        message: "Access denied: cannot access data from other districts"
      };
    }
  }
  
  // Admins can access all scopes
  if (hasAdminAccess(userContext.role, userContext.permissions)) {
    // Provincial scope requires provinceId
    if (scope === 'provincial' && !queryParams.provinceId) {
      return {
        allowed: false,
        message: "provinceId is required for provincial scope"
      };
    }
    
    return { allowed: true };
  }
  
  return { allowed: true };
}
```

### 4. Response Schema Extension

**Updated Column Schema**:
```typescript
// Flexible column schema that works for all scope types
export const columnSchema = z.object({
  id: z.number().int().describe("Column identifier (facility/district/province ID)"),
  name: z.string().describe("Column display name"),
  type: z.enum(['facility', 'district', 'province']).describe("Column aggregation type"),
  facilityType: z.string().optional().describe("Facility type (for facility-level columns)"),
  projectType: z.string().optional().describe("Project type"),
  hasData: z.boolean().describe("Whether this column has execution data"),
  aggregatedFacilityCount: z.number().optional().describe("Number of facilities aggregated in this column"),
});
```

**Updated Response Metadata**:
```typescript
export const compiledExecutionResponseSchema = z.object({
  data: z.object({
    columns: z.array(columnSchema), // Renamed from 'facilities' to reflect flexible aggregation
    activities: z.array(activityRowSchema),
    sections: z.array(sectionSummarySchema),
    totals: z.object({
      byColumn: z.record(z.string(), z.number()), // Column ID -> total
      grandTotal: z.number(),
    }),
  }),
  meta: z.object({
    filters: appliedFiltersSchema,
    aggregationDate: z.string(),
    columnCount: z.number().describe("Number of columns in the report"),
    underlyingFacilityCount: z.number().describe("Total facilities aggregated"),
    reportingPeriod: z.string(),
    
    // Scope metadata
    scope: z.enum(['district', 'provincial', 'country']),
    scopeDetails: z.object({
      // District scope
      districtIds: z.array(z.number()).optional(),
      districtNames: z.array(z.string()).optional(),
      
      // Provincial scope
      provinceId: z.number().optional(),
      provinceName: z.string().optional(),
      districtCount: z.number().optional().describe("Number of districts in province"),
      
      // Country scope
      provinceCount: z.number().optional().describe("Number of provinces"),
      totalDistrictCount: z.number().optional().describe("Total districts nationwide"),
    }).optional(),
    performanceWarning: z.string().optional(),
  }),
});
```

## Visual Examples

### Example Report Structure by Scope

**District Scope - Gasabo District**:
```
| Activity Code | Hospital A | HC A1 | HC A2 | Hospital B | HC B1 | Total |
|---------------|-----------|-------|-------|-----------|-------|-------|
| A1.1          | 1000      | 200   | 150   | 800       | 180   | 2330  |
| A1.2          | 2000      | 400   | 300   | 1600      | 360   | 4660  |
| B1.1          | 500       | 100   | 75    | 400       | 90    | 1165  |
```
- 5 facility columns
- Operational detail for district management

**Provincial Scope - Kigali Province**:
```
| Activity Code | Gasabo District | Kicukiro District | Nyarugenge District | Total |
|---------------|----------------|-------------------|---------------------|-------|
| A1.1          | 2330           | 1500              | 1800                | 5630  |
| A1.2          | 4660           | 3000              | 3600                | 11260 |
| B1.1          | 1165           | 750               | 900                 | 2815  |
```
- 3 district columns (each aggregating 5-10 facilities)
- Management summary for provincial oversight
- "Gasabo District" = Hospital A + HC A1 + HC A2 + Hospital B + HC B1

**Country Scope - Rwanda**:
```
| Activity Code | Kigali | Eastern | Northern | Southern | Western | Total  |
|---------------|--------|---------|----------|----------|---------|--------|
| A1.1          | 5630   | 4200    | 3800     | 4500     | 3900    | 22030  |
| A1.2          | 11260  | 8400    | 7600     | 9000     | 7800    | 44060  |
| B1.1          | 2815   | 2100    | 1900     | 2250     | 1950    | 11015  |
```
- 5 province columns (each aggregating 20-30 facilities)
- Executive summary for national planning
- "Kigali" = All facilities in Gasabo + Kicukiro + Nyarugenge + other districts

## Data Models

### Database Schema Assumptions

Based on the code analysis, we assume the following schema relationships:

```typescript
// Facilities table
interface Facility {
  id: number;
  name: string;
  facilityType: 'hospital' | 'health_center';
  districtId: number;
  parentFacilityId?: number; // For child health centers
  isActive: boolean;
}

// Districts table
interface District {
  id: number;
  name: string;
  provinceId: number;
}

// Provinces table
interface Province {
  id: number;
  name: string;
}
```

### Facility Hierarchy

```
Country
└── Province 1 (Kigali)
    ├── District 1 (Gasabo)
    │   ├── Hospital A (parent)
    │   │   ├── Health Center A1 (child)
    │   │   └── Health Center A2 (child)
    │   └── Hospital B (parent)
    │       └── Health Center B1 (child)
    └── District 2 (Kicukiro)
        └── Hospital C (parent)
            └── Health Center C1 (child)
```

### Hierarchical Compilation by Scope

**District Scope** - Individual Facility View:
```
Columns: Hospital A | HC A1 | HC A2 | Hospital B | HC B1 | Total
```
- Shows all individual facilities in the district
- Each column represents one facility
- Suitable for operational management

**Provincial Scope** - District Hospital View:
```
Columns: Gasabo District Hospital | Kicukiro District Hospital | Total
```
- Each column represents a district hospital **pre-aggregated with its child health centers**
- "Gasabo District Hospital" = Hospital A + HC A1 + HC A2 + Hospital B + HC B1
- "Kicukiro District Hospital" = Hospital C + HC C1
- Reduces columns from 6 facilities to 2 district summaries
- Suitable for provincial management

**Country Scope** - Provincial View:
```
Columns: Kigali | Eastern | Northern | Southern | Western | Total
```
- Each column represents a province **pre-aggregated with all its district hospitals and health centers**
- "Kigali" = All facilities in Gasabo + Kicukiro + other districts
- Reduces columns from 100+ facilities to 5 provinces
- Suitable for national executive view

### Aggregation Roll-up Table

| **Scope**         | **Aggregates**                                   | **Rolls up to**   |
| ----------------- | ------------------------------------------------ | ----------------- |
| Health Center     | —                                                | District Hospital |
| District Hospital | District total (Hospital + HCs)                  | Province          |
| Province          | Provincial total (sum of all district hospitals) | Country           |
| Country           | National total                                   | —                 |

## Implementation Flow

### Handler Modification

```typescript
export const compiled: AppRouteHandler<CompiledRoute> = async (c) => {
  try {
    const userContext = await getUserContext(c);
    const query = compiledExecutionQuerySchema.parse(c.req.query());
    
    const { scope = 'district', provinceId, ...otherFilters } = query;
    
    // 1. Validate scope access
    const accessCheck = validateScopeAccess(scope, userContext, query);
    if (!accessCheck.allowed) {
      return c.json({
        data: { facilities: [], activities: [], sections: [], totals: { byFacility: {}, grandTotal: 0 } },
        meta: { /* ... */ },
        message: accessCheck.message
      }, HttpStatusCodes.FORBIDDEN);
    }
    
    // 2. Build scope-based facility filter
    let whereConditions: any[] = [
      eq(schemaFormDataEntries.entityType, 'execution')
    ];
    
    try {
      const scopeFilter = buildScopeFilter(scope, userContext, query);
      if (scopeFilter) {
        whereConditions.push(scopeFilter);
      }
    } catch (error: any) {
      return c.json({
        message: error.message,
        error: "Invalid scope configuration"
      }, HttpStatusCodes.BAD_REQUEST);
    }
    
    // 3. Execute query (existing logic)
    const baseQuery = db
      .select({ /* ... */ })
      .from(schemaFormDataEntries)
      .leftJoin(facilities, eq(schemaFormDataEntries.facilityId, facilities.id))
      .leftJoin(projects, eq(schemaFormDataEntries.projectId, projects.id))
      .leftJoin(reportingPeriods, eq(schemaFormDataEntries.reportingPeriodId, reportingPeriods.id))
      .where(and(...whereConditions));
    
    let results = await baseQuery;
    
    // 4. Apply additional filters (existing logic)
    // ... facilityType, projectType, year, quarter filtering ...
    
    // 5. Build hierarchical columns based on scope
    let columns: Column[];
    let underlyingFacilityCount: number;
    
    switch (scope) {
      case 'district':
        // Individual facility columns
        columns = buildFacilityColumns(filteredResults);
        underlyingFacilityCount = columns.length;
        break;
        
      case 'provincial':
        // District hospital columns (pre-aggregated with child HCs)
        columns = buildDistrictColumns(filteredResults, query.provinceId);
        underlyingFacilityCount = filteredResults.length;
        break;
        
      case 'country':
        // Province columns (pre-aggregated with all facilities)
        columns = await buildProvinceColumns(filteredResults);
        underlyingFacilityCount = filteredResults.length;
        break;
    }
    
    // 6. Aggregate data by columns
    const activities = aggregateActivitiesByColumns(filteredResults, columns, scope);
    const sections = calculateSectionTotals(activities);
    const totals = calculateColumnTotals(activities, columns);
    
    // 7. Build scope metadata
    const scopeDetails = await buildScopeMetadata(scope, query, filteredResults, columns);
    
    // 8. Add performance warning if needed
    let performanceWarning: string | undefined;
    if (scope === 'country' && underlyingFacilityCount > 200) {
      performanceWarning = "Large dataset: Consider using filters to improve performance";
    }
    
    // 9. Return response with scope metadata
    const response: CompiledExecutionResponse = {
      data: {
        columns,
        activities,
        sections,
        totals
      },
      meta: {
        filters: appliedFilters,
        aggregationDate: new Date().toISOString(),
        columnCount: columns.length,
        underlyingFacilityCount,
        reportingPeriod: /* ... */,
        scope,
        scopeDetails,
        performanceWarning
      }
    };
    
    return c.json(response, HttpStatusCodes.OK);
    
  } catch (error: any) {
    // ... existing error handling ...
  }
};
```

### Column Builder Functions

```typescript
// Build facility-level columns for district scope
function buildFacilityColumns(results: any[]): Column[] {
  const uniqueFacilities = new Map<number, any>();
  
  results.forEach(r => {
    if (r.facility && !uniqueFacilities.has(r.facility.id)) {
      uniqueFacilities.set(r.facility.id, r.facility);
    }
  });
  
  return Array.from(uniqueFacilities.values()).map(facility => ({
    id: facility.id,
    name: facility.name,
    type: 'facility',
    facilityType: facility.facilityType,
    projectType: facility.projectType,
    hasData: true,
    aggregatedFacilityCount: 1,
  }));
}

// Build district-level columns for provincial scope
function buildDistrictColumns(results: any[], provinceId: number): Column[] {
  // Group facilities by district
  const districtMap = new Map<number, { district: any; facilities: any[] }>();
  
  results.forEach(r => {
    if (r.facility && r.facility.district) {
      const districtId = r.facility.district.id;
      if (!districtMap.has(districtId)) {
        districtMap.set(districtId, {
          district: r.facility.district,
          facilities: []
        });
      }
      districtMap.get(districtId)!.facilities.push(r.facility);
    }
  });
  
  // Create one column per district (aggregating all its facilities)
  return Array.from(districtMap.values()).map(({ district, facilities }) => ({
    id: district.id,
    name: `${district.name} District`,
    type: 'district',
    hasData: true,
    aggregatedFacilityCount: facilities.length,
  }));
}

// Build province-level columns for country scope
async function buildProvinceColumns(results: any[]): Promise<Column[]> {
  // Group facilities by province
  const provinceMap = new Map<number, { province: any; facilities: any[] }>();
  
  results.forEach(r => {
    if (r.facility && r.facility.district && r.facility.district.province) {
      const provinceId = r.facility.district.province.id;
      if (!provinceMap.has(provinceId)) {
        provinceMap.set(provinceId, {
          province: r.facility.district.province,
          facilities: []
        });
      }
      provinceMap.get(provinceId)!.facilities.push(r.facility);
    }
  });
  
  // Create one column per province (aggregating all its facilities)
  return Array.from(provinceMap.values()).map(({ province, facilities }) => ({
    id: province.id,
    name: province.name,
    type: 'province',
    hasData: true,
    aggregatedFacilityCount: facilities.length,
  }));
}

// Aggregate activities by columns
function aggregateActivitiesByColumns(
  results: any[],
  columns: Column[],
  scope: string
): ActivityRow[] {
  // For each activity, sum values across facilities that belong to each column
  const activityMap = new Map<string, ActivityRow>();
  
  results.forEach(result => {
    const columnId = getColumnIdForFacility(result.facility, columns, scope);
    
    Object.entries(result.formData).forEach(([activityCode, value]) => {
      if (!activityMap.has(activityCode)) {
        activityMap.set(activityCode, {
          code: activityCode,
          name: getActivityName(activityCode),
          category: getActivityCategory(activityCode),
          values: {},
          total: 0,
          // ... other activity properties
        });
      }
      
      const activity = activityMap.get(activityCode)!;
      activity.values[columnId] = (activity.values[columnId] || 0) + (value || 0);
      activity.total += (value || 0);
    });
  });
  
  return Array.from(activityMap.values());
}

// Helper to determine which column a facility belongs to
function getColumnIdForFacility(
  facility: any,
  columns: Column[],
  scope: string
): number {
  switch (scope) {
    case 'district':
      return facility.id; // Facility itself
    case 'provincial':
      return facility.district.id; // District
    case 'country':
      return facility.district.province.id; // Province
    default:
      throw new Error(`Unknown scope: ${scope}`);
  }
}
```

### Scope Metadata Builder

```typescript
async function buildScopeMetadata(
  scope: 'district' | 'provincial' | 'country',
  query: CompiledExecutionQuery,
  results: any[],
  columns: Column[]
): Promise<ScopeDetails> {
  const uniqueDistrictIds = [...new Set(results.map(r => r.facility?.districtId).filter(Boolean))];
  
  switch (scope) {
    case 'district': {
      const districts = await db
        .select({ id: districts.id, name: districts.name })
        .from(districts)
        .where(inArray(districts.id, uniqueDistrictIds));
      
      return {
        districtIds: districts.map(d => d.id),
        districtNames: districts.map(d => d.name),
      };
    }
    
    case 'provincial': {
      const province = await db
        .select({ id: provinces.id, name: provinces.name })
        .from(provinces)
        .where(eq(provinces.id, query.provinceId!))
        .limit(1);
      
      return {
        provinceId: province[0]?.id,
        provinceName: province[0]?.name,
        districtCount: columns.length, // Number of district columns
      };
    }
    
    case 'country': {
      const totalDistricts = await db
        .select({ count: count() })
        .from(districts);
      
      return {
        provinceCount: columns.length, // Number of province columns
        totalDistrictCount: totalDistricts[0]?.count || 0,
      };
    }
  }
}
```

## Error Handling

### Validation Errors

| Error Condition | HTTP Status | Response Message |
|----------------|-------------|------------------|
| Invalid scope value | 400 | "Invalid scope: must be district, provincial, or country" |
| Missing provinceId for provincial scope | 400 | "provinceId is required for provincial scope" |
| Invalid provinceId | 400 | "Invalid provinceId: province not found" |

### Access Control Errors

| Error Condition | HTTP Status | Response Message |
|----------------|-------------|------------------|
| Accountant requests provincial/country scope | 403 | "Access denied: accountant role can only access district scope" |
| Accountant requests other district | 403 | "Access denied: cannot access data from other districts" |
| Invalid scope configuration | 400 | "Invalid scope configuration" |

### Performance Warnings

| Condition | Warning Message |
|-----------|----------------|
| Country scope with >100 facilities | "Large dataset: Consider using filters to improve performance" |
| Query execution >30 seconds | Logged to server: "Performance warning: scope query exceeded 30s" |

## Testing Strategy

### Unit Tests

1. **Scope Filter Builders**
   - Test district scope filter with accountant context
   - Test district scope filter with admin context
   - Test provincial scope filter with valid provinceId
   - Test country scope filter (no geographic restrictions)
   - Test error handling for missing provinceId

2. **Access Control Validation**
   - Test accountant cannot access provincial scope
   - Test accountant cannot access country scope
   - Test accountant cannot access other districts
   - Test admin can access all scopes
   - Test admin can specify any districtId

3. **Scope Metadata Builder**
   - Test district metadata includes district names
   - Test provincial metadata includes province name and district count
   - Test country metadata includes province and district counts

### Integration Tests

1. **End-to-End Scope Queries**
   - Test district scope returns correct facilities
   - Test provincial scope returns all facilities in province
   - Test country scope returns all facilities
   - Test scope combined with projectType filter
   - Test scope combined with facilityType filter
   - Test scope combined with reportingPeriod filter

2. **Role-Based Access**
   - Test accountant can access district scope
   - Test accountant receives 403 for provincial scope
   - Test admin can access all scopes
   - Test admin can specify provinceId for provincial scope

3. **Performance Tests**
   - Test district scope completes within 30 seconds
   - Test provincial scope with 50+ facilities completes within 30 seconds
   - Test country scope with 200+ facilities completes within 60 seconds
   - Test performance warning appears for large datasets

## Performance Considerations

### Database Indexing

**Required Indexes**:
```sql
-- Existing indexes (assumed)
CREATE INDEX idx_facilities_district_id ON facilities(districtId);
CREATE INDEX idx_facilities_is_active ON facilities(isActive);
CREATE INDEX idx_form_data_entries_entity_type ON schemaFormDataEntries(entityType);
CREATE INDEX idx_form_data_entries_facility_id ON schemaFormDataEntries(facilityId);

-- New indexes for multi-scope support
CREATE INDEX idx_districts_province_id ON districts(provinceId);
CREATE INDEX idx_facilities_parent_facility_id ON facilities(parentFacilityId);
CREATE INDEX idx_facilities_facility_type ON facilities(facilityType);

-- Composite index for provincial scope queries
CREATE INDEX idx_facilities_district_type ON facilities(districtId, facilityType);
```

### Query Optimization

1. **District Scope**: 
   - Query: Single indexed lookup on `facilities.districtId` - O(log n)
   - Columns: Individual facilities (10-20 columns typical)
   - Aggregation: Direct mapping, no grouping needed

2. **Provincial Scope**: 
   - Query: Indexed lookup on `districts.provinceId` - O(log n)
   - Columns: District-level aggregation (5-10 columns typical)
   - Aggregation: Group by district, sum facilities within each district
   - Performance gain: 50-70% fewer columns than district scope

3. **Country Scope**: 
   - Query: Full table scan with `isActive` filter - O(n)
   - Columns: Province-level aggregation (5 columns)
   - Aggregation: Group by province, sum all facilities within each province
   - Performance gain: 95% fewer columns than district scope (5 vs 100+)
   - Acceptable for infrequent executive queries

### Caching Strategy (Future Enhancement)

```typescript
// Cache compiled reports for frequently requested combinations
interface CacheKey {
  scope: string;
  provinceId?: number;
  districtId?: number;
  projectType?: string;
  facilityType?: string;
  reportingPeriodId?: number;
}

// Cache TTL: 1 hour for district, 2 hours for provincial, 4 hours for country
// Invalidate on new execution data entry
```

## Security and Access Control

### Role-Based Access Matrix

| Role | District Scope | Provincial Scope | Country Scope |
|------|---------------|------------------|---------------|
| Accountant | ✅ Own district(s) only | ❌ | ❌ |
| Admin | ✅ Any district | ✅ Any province | ✅ All facilities |

### Audit Logging

```typescript
// Log scope access for audit trails
logger.info('Compiled execution report accessed', {
  userId: userContext.userId,
  role: userContext.role,
  scope,
  provinceId: query.provinceId,
  districtId: query.districtId,
  facilityCount: results.length,
  timestamp: new Date().toISOString()
});
```

## Extensibility

### Adding New Scope Types

To add a new scope type (e.g., "regional", "zone"):

1. **Update Enum**:
```typescript
scope: z.enum(['district', 'provincial', 'regional', 'country'])
```

2. **Add Filter Builder**:
```typescript
function buildRegionalScopeFilter(
  userContext: UserContext,
  queryParams: CompiledExecutionQuery
): SQL | null {
  // Implement regional filtering logic
}
```

3. **Update Switch Statement**:
```typescript
case 'regional':
  return buildRegionalScopeFilter(userContext, queryParams);
```

4. **Update Access Control**:
```typescript
// Define which roles can access regional scope
```

No changes needed to:
- Aggregation service
- Response formatting
- Activity catalog loading
- Computed value calculations

## Migration and Backward Compatibility

### Backward Compatibility

- **Default Behavior**: If `scope` parameter is omitted, defaults to `'district'` (existing behavior)
- **Existing Clients**: No breaking changes - existing API consumers continue to work
- **Response Structure**: New metadata fields are optional and additive

### Migration Steps

1. Deploy database indexes (no downtime)
2. Deploy updated handler code (backward compatible)
3. Update frontend to support scope selector (optional)
4. Monitor performance and adjust indexes as needed

## Open Questions and Future Enhancements

1. **Pagination**: Should country scope support pagination for very large datasets?
2. **Caching**: Should we implement Redis caching for frequently accessed reports?
3. **Export**: Should large scope reports support async export to CSV/Excel?
4. **Real-time**: Should we add WebSocket support for live updates during data entry?
5. **Drill-down**: Should provincial/country views support drill-down to district level?
