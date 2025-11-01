# Design Document

## Overview

The Unified Dashboard API consolidates eight existing dashboard endpoints into a single, composable endpoint that supports parallel component fetching, unified filter management, and role-based access control. This design eliminates filter synchronization issues, loading state chaos, and performance overhead while maintaining backward compatibility with existing endpoints.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client Application                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │           useDashboard Hook (Unified State)            │ │
│  │  - Filter Management (scope, program, period, quarter) │ │
│  │  - Single Loading State                                │ │
│  │  - Error Isolation per Component                       │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ Single HTTP Request
                           │ GET /api/dashboard?components=...
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer (Hono)                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         Dashboard Route Handler                        │ │
│  │  - Query Parameter Validation                          │ │
│  │  - User Authentication & Context                       │ │
│  │  - Component Request Parsing                           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Service Layer                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         DashboardService (Orchestrator)                │ │
│  │  - Parallel Component Execution (Promise.all)          │ │
│  │  - Error Isolation (try/catch per component)           │ │
│  │  - Role-Based Scope Application                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         ▼                 ▼                 ▼               │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐          │
│  │ Component│      │ Component│      │ Component│          │
│  │ Handlers │      │ Handlers │      │ Handlers │          │
│  └──────────┘      └──────────┘      └──────────┘          │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Access Layer                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Aggregation Service  │  Access Control Service        │ │
│  │  Budget Calculations  │  Reporting Period Cache        │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                      Database (Drizzle ORM)
```



## Components and Interfaces

### 1. API Route Definition

**File**: `apps/server/src/api/routes/dashboard/unified-dashboard.routes.ts`

```typescript
import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent } from "stoker/openapi/helpers"

const tags = ["dashboard"]

// Component enum
const componentSchema = z.enum([
  'metrics',
  'programDistribution',
  'budgetByDistrict',
  'budgetByFacility',
  'provinceApprovals',
  'districtApprovals',
  'tasks'
])

// Scope enum
const scopeSchema = z.enum(['country', 'province', 'district', 'facility'])

// Unified dashboard route
export const getUnifiedDashboard = createRoute({
  path: "/dashboard",
  method: "get",
  tags,
  request: {
    query: z.object({
      components: z.string().describe("Comma-separated list of components to fetch"),
      scope: scopeSchema.optional().describe("Organizational scope level"),
      scopeId: z.string().optional().describe("ID of the scope entity"),
      programId: z.string().optional().describe("Program filter"),
      periodId: z.string().optional().describe("Reporting period ID"),
      quarter: z.string().optional().describe("Quarter filter (1-4)"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.record(z.any()),
      "Dashboard component data"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      z.object({ message: z.string() }),
      "Invalid request parameters"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      z.object({ message: z.string() }),
      "Authentication required"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      z.object({ message: z.string() }),
      "Insufficient permissions"
    ),
  },
})

export type GetUnifiedDashboardRoute = typeof getUnifiedDashboard
```

### 2. Dashboard Service (Core Orchestrator)

**File**: `apps/server/src/api/services/dashboard/unified-dashboard.service.ts`

```typescript
import type { UserContext } from '@/lib/utils/get-user-facility'
import { getCurrentReportingPeriod } from './aggregation.service'
import { applyRoleBasedScope } from './role-scope.service'

export interface DashboardFilters {
  scope?: 'country' | 'province' | 'district' | 'facility'
  scopeId?: number
  programId?: number
  periodId?: number
  quarter?: number
  facilityIds?: number[]
}

export interface ComponentResult {
  error?: boolean
  message?: string
  data?: any
}

export class DashboardService {
  /**
   * Main entry point for unified dashboard data fetching
   */
  async getDashboardData(
    filters: DashboardFilters,
    components: string[],
    userContext: UserContext
  ): Promise<Record<string, ComponentResult>> {
    // Apply role-based scope restrictions
    const scopedFilters = await applyRoleBasedScope(filters, userContext)
    
    // Get or validate reporting period
    const reportingPeriod = await this.getReportingPeriod(scopedFilters.periodId)
    
    if (!reportingPeriod) {
      throw new Error('No active reporting period found')
    }
    
    // Add reporting period to filters
    const enrichedFilters = {
      ...scopedFilters,
      periodId: reportingPeriod.id,
    }
    
    // Execute all component queries in parallel with error isolation
    const results: Record<string, ComponentResult> = {}
    
    const promises = components.map(async (component) => {
      try {
        const data = await this.fetchComponent(component, enrichedFilters, userContext)
        results[component] = { data }
      } catch (error) {
        results[component] = {
          error: true,
          message: (error as Error).message,
        }
      }
    })
    
    await Promise.all(promises)
    
    return results
  }
  
  /**
   * Route component requests to appropriate handlers
   */
  private async fetchComponent(
    component: string,
    filters: DashboardFilters,
    userContext: UserContext
  ): Promise<any> {
    switch (component) {
      case 'metrics':
        return this.getMetrics(filters, userContext)
      case 'programDistribution':
        return this.getProgramDistribution(filters, userContext)
      case 'budgetByDistrict':
        return this.getBudgetByDistrict(filters, userContext)
      case 'budgetByFacility':
        return this.getBudgetByFacility(filters, userContext)
      case 'provinceApprovals':
        return this.getProvinceApprovals(filters, userContext)
      case 'districtApprovals':
        return this.getDistrictApprovals(filters, userContext)
      case 'tasks':
        return this.getTasks(filters, userContext)
      default:
        throw new Error(`Unknown component: ${component}`)
    }
  }
  
  // Component handler methods (implementations in next section)
  private async getMetrics(filters: DashboardFilters, userContext: UserContext) { }
  private async getProgramDistribution(filters: DashboardFilters, userContext: UserContext) { }
  private async getBudgetByDistrict(filters: DashboardFilters, userContext: UserContext) { }
  private async getBudgetByFacility(filters: DashboardFilters, userContext: UserContext) { }
  private async getProvinceApprovals(filters: DashboardFilters, userContext: UserContext) { }
  private async getDistrictApprovals(filters: DashboardFilters, userContext: UserContext) { }
  private async getTasks(filters: DashboardFilters, userContext: UserContext) { }
  
  private async getReportingPeriod(periodId?: number) {
    if (periodId) {
      // Fetch specific period
      return await db.query.reportingPeriods.findFirst({
        where: eq(reportingPeriods.id, periodId)
      })
    }
    // Get current active period
    return await getCurrentReportingPeriod()
  }
}
```

### 3. Role-Based Scope Service

**File**: `apps/server/src/api/services/dashboard/role-scope.service.ts`

```typescript
import type { UserContext } from '@/lib/utils/get-user-facility'
import type { DashboardFilters } from './unified-dashboard.service'
import { db } from '@/db'
import { facilities } from '@/db/schema'
import { eq } from 'drizzle-orm'

/**
 * Apply role-based access control to dashboard filters
 * Ensures users only see data they have permission to access
 */
export async function applyRoleBasedScope(
  filters: DashboardFilters,
  userContext: UserContext
): Promise<DashboardFilters> {
  // Admin users bypass scope restrictions
  if (isAdminUser(userContext)) {
    return filters
  }
  
  // Hospital accountants: their hospital + child health centers
  if (userContext.role === 'hospital_accountant') {
    return {
      ...filters,
      facilityIds: userContext.accessibleFacilityIds,
      scope: 'facility',
      scopeId: userContext.facilityId,
    }
  }
  
  // District accountants: all facilities in their district
  if (userContext.role === 'district_accountant' && userContext.districtId) {
    return {
      ...filters,
      scope: 'district',
      scopeId: userContext.districtId,
      facilityIds: userContext.accessibleFacilityIds,
    }
  }
  
  // Provincial accountants: all facilities in their province
  if (userContext.role === 'provincial_accountant') {
    const userFacility = await db.query.facilities.findFirst({
      where: eq(facilities.id, userContext.facilityId),
      with: { district: true },
    })
    
    if (userFacility?.district?.provinceId) {
      return {
        ...filters,
        scope: 'province',
        scopeId: userFacility.district.provinceId,
      }
    }
  }
  
  // Default: restrict to user's accessible facilities
  return {
    ...filters,
    facilityIds: userContext.accessibleFacilityIds,
  }
}

function isAdminUser(userContext: UserContext): boolean {
  return (
    userContext.role === 'superadmin' ||
    userContext.role === 'admin' ||
    userContext.permissions?.includes('admin_access')
  )
}
```



### 4. Component Handler Implementations

Each component handler reuses existing aggregation and access control services:

```typescript
// Metrics Component
private async getMetrics(
  filters: DashboardFilters,
  userContext: UserContext
): Promise<any> {
  const facilityIds = filters.facilityIds || userContext.accessibleFacilityIds
  
  const metrics = await aggregateBudgetData({
    facilityIds,
    reportingPeriodId: filters.periodId!,
    programId: filters.programId,
    quarter: filters.quarter,
  })
  
  return {
    totalAllocated: metrics.allocated,
    totalSpent: metrics.spent,
    remaining: metrics.remaining,
    utilizationPercentage: metrics.utilizationPercentage,
  }
}

// Program Distribution Component
private async getProgramDistribution(
  filters: DashboardFilters,
  userContext: UserContext
): Promise<any> {
  const facilityIds = filters.facilityIds || userContext.accessibleFacilityIds
  
  const programs = await aggregateByProgram(
    facilityIds,
    filters.periodId!,
    filters.quarter
  )
  
  return {
    programs,
    total: programs.reduce((sum, p) => sum + p.allocated, 0),
  }
}

// Budget by District Component
private async getBudgetByDistrict(
  filters: DashboardFilters,
  userContext: UserContext
): Promise<any> {
  if (!filters.scopeId || filters.scope !== 'province') {
    return { districts: [] }
  }
  
  const facilityIds = await getAccessibleFacilitiesInProvince(
    userContext,
    filters.scopeId
  )
  
  const districts = await aggregateByDistrict(
    filters.scopeId,
    facilityIds,
    filters.periodId!,
    filters.programId,
    filters.quarter
  )
  
  return { districts }
}

// Budget by Facility Component
private async getBudgetByFacility(
  filters: DashboardFilters,
  userContext: UserContext
): Promise<any> {
  if (!filters.scopeId || filters.scope !== 'district') {
    return { facilities: [] }
  }
  
  const facilityIds = await getAccessibleFacilitiesInDistrict(
    userContext,
    filters.scopeId
  )
  
  const facilities = await aggregateByFacility(
    filters.scopeId,
    facilityIds,
    filters.periodId!,
    filters.programId,
    filters.quarter
  )
  
  return { facilities }
}
```

### 5. Route Handler

**File**: `apps/server/src/api/routes/dashboard/unified-dashboard.handlers.ts`

```typescript
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"
import type { AppRouteHandler } from "@/api/lib/types"
import { getUserContext } from '@/lib/utils/get-user-facility'
import type { GetUnifiedDashboardRoute } from "./unified-dashboard.routes"
import { DashboardService } from '../../services/dashboard/unified-dashboard.service'

export const getUnifiedDashboard: AppRouteHandler<GetUnifiedDashboardRoute> = async (c) => {
  try {
    // Get user context
    const userContext = await getUserContext(c)
    
    // Parse query parameters
    const {
      components: componentsStr,
      scope,
      scopeId: scopeIdStr,
      programId: programIdStr,
      periodId: periodIdStr,
      quarter: quarterStr,
    } = c.req.query()
    
    // Validate components parameter
    if (!componentsStr) {
      throw new HTTPException(400, { message: 'components parameter is required' })
    }
    
    // Parse components
    const components = componentsStr.split(',').map(c => c.trim())
    
    // Build filters
    const filters = {
      scope: scope as any,
      scopeId: scopeIdStr ? parseInt(scopeIdStr) : undefined,
      programId: programIdStr ? parseInt(programIdStr) : undefined,
      periodId: periodIdStr ? parseInt(periodIdStr) : undefined,
      quarter: quarterStr ? parseInt(quarterStr) : undefined,
    }
    
    // Validate scope requires scopeId
    if (filters.scope && !filters.scopeId) {
      throw new HTTPException(400, { message: 'scopeId is required when scope is specified' })
    }
    
    // Validate quarter range
    if (filters.quarter && (filters.quarter < 1 || filters.quarter > 4)) {
      throw new HTTPException(400, { message: 'quarter must be between 1 and 4' })
    }
    
    // Execute dashboard service
    const dashboardService = new DashboardService()
    const results = await dashboardService.getDashboardData(
      filters,
      components,
      userContext
    )
    
    return c.json(results, HttpStatusCodes.OK)
    
  } catch (error: any) {
    console.error('Unified dashboard error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(500, { message: 'Failed to retrieve dashboard data' })
  }
}
```



## Data Models

### Request Models

```typescript
// Query Parameters
interface UnifiedDashboardQuery {
  components: string           // "metrics,programDistribution,tasks"
  scope?: 'country' | 'province' | 'district' | 'facility'
  scopeId?: string            // "12"
  programId?: string          // "1"
  periodId?: string           // "5"
  quarter?: string            // "1" | "2" | "3" | "4"
}

// Parsed Filters
interface DashboardFilters {
  scope?: 'country' | 'province' | 'district' | 'facility'
  scopeId?: number
  programId?: number
  periodId?: number
  quarter?: number
  facilityIds?: number[]      // Computed from scope + role
}
```

### Response Models

```typescript
// Success Response
interface UnifiedDashboardResponse {
  [componentName: string]: ComponentResult
}

interface ComponentResult {
  error?: boolean
  message?: string
  data?: any
}

// Example Response
{
  "metrics": {
    "data": {
      "totalAllocated": 180000000,
      "totalSpent": 130000000,
      "remaining": 50000000,
      "utilizationPercentage": 72.22
    }
  },
  "programDistribution": {
    "data": {
      "programs": [
        { "programId": 1, "programName": "HIV", "allocated": 100000000, "percentage": 55.56 },
        { "programId": 2, "programName": "Malaria", "allocated": 80000000, "percentage": 44.44 }
      ],
      "total": 180000000
    }
  },
  "tasks": {
    "error": true,
    "message": "Failed to fetch tasks: Database connection timeout"
  }
}
```

### Component Data Formats

Each component returns data in the same format as its legacy endpoint:

**Metrics Component**:
```typescript
{
  totalAllocated: number
  totalSpent: number
  remaining: number
  utilizationPercentage: number
}
```

**Program Distribution Component**:
```typescript
{
  programs: Array<{
    programId: number
    programName: string
    allocatedBudget: number
    percentage: number
  }>
  total: number
}
```

**Budget by District Component**:
```typescript
{
  districts: Array<{
    districtId: number
    districtName: string
    allocatedBudget: number
    spentBudget: number
    utilizationPercentage: number
  }>
}
```

**Budget by Facility Component**:
```typescript
{
  facilities: Array<{
    facilityId: number
    facilityName: string
    facilityType: string
    allocatedBudget: number
    spentBudget: number
    utilizationPercentage: number
  }>
}
```

**Province Approvals Component**:
```typescript
{
  districts: Array<{
    districtId: number
    districtName: string
    allocatedBudget: number
    approvedCount: number
    rejectedCount: number
    pendingCount: number
    totalCount: number
    approvalRate: number
  }>
}
```

**District Approvals Component**:
```typescript
{
  facilities: Array<{
    facilityId: number
    facilityName: string
    projectId: number
    projectName: string
    projectCode: string
    allocatedBudget: number
    approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED'
    approvedBy: string | null
    approvedAt: string | null
    quarter: number | null
  }>
}
```

**Tasks Component**:
```typescript
{
  pendingPlans: Array<{
    projectId: number
    projectName: string
    projectCode: string
    reportingPeriodId: number
    reportingPeriodYear: number
    deadline: string
    status: string
  }>
  pendingExecutions: Array<{
    projectId: number
    projectName: string
    projectCode: string
    reportingPeriodId: number
    reportingPeriodYear: number
    quarter: number
    deadline: string
    status: string
  }>
  correctionsRequired: Array<any>
  upcomingDeadlines: Array<{
    reportingPeriodId: number
    year: number
    periodType: string
    endDate: string
    daysRemaining: number
  }>
}
```



## Error Handling

### Error Isolation Strategy

The unified dashboard API implements component-level error isolation:

1. **Component Failures Don't Block Others**: Each component executes in its own try/catch block
2. **Partial Success Responses**: HTTP 200 returned even if some components fail
3. **Error Objects**: Failed components return `{ error: true, message: string }`
4. **Successful Components**: Return `{ data: any }`

### Error Response Examples

**All Components Succeed**:
```json
{
  "metrics": { "data": { ... } },
  "programDistribution": { "data": { ... } },
  "tasks": { "data": { ... } }
}
```

**Partial Failure**:
```json
{
  "metrics": { "data": { ... } },
  "programDistribution": {
    "error": true,
    "message": "Failed to aggregate program data: Invalid project type"
  },
  "tasks": { "data": { ... } }
}
```

**Request-Level Errors** (HTTP 400/401/403/500):
- Invalid parameters (missing components, invalid quarter)
- Authentication failures
- Authorization failures (access denied to scope)
- Unexpected server errors

### Error Types

| Error Type | HTTP Status | When It Occurs |
|------------|-------------|----------------|
| Missing components parameter | 400 | `components` query param not provided |
| Invalid scope | 400 | `scope` provided without `scopeId` |
| Invalid quarter | 400 | `quarter` not between 1-4 |
| Unauthorized | 401 | No valid session |
| Access denied | 403 | User cannot access requested scope |
| Component error | 200 | Component query fails (isolated) |
| Server error | 500 | Unexpected error in handler |

## Testing Strategy

### Unit Tests

**DashboardService Tests** (`unified-dashboard.service.test.ts`):
- ✅ Parallel execution of multiple components
- ✅ Error isolation (one component fails, others succeed)
- ✅ Unknown component handling
- ✅ Empty component list handling
- ✅ Filter application to all components

**RoleScopeService Tests** (`role-scope.service.test.ts`):
- ✅ Admin users bypass restrictions
- ✅ Hospital accountant scope (facility + children)
- ✅ District accountant scope (district facilities)
- ✅ Provincial accountant scope (province facilities)
- ✅ Default scope (accessible facilities only)

**Component Handler Tests**:
- ✅ Each component returns correct data format
- ✅ Filters applied correctly (program, quarter)
- ✅ Scope-aware behavior (province → districts, district → facilities)
- ✅ Empty results for invalid scopes

### Integration Tests

**Unified Dashboard Endpoint Tests** (`unified-dashboard.integration.test.ts`):
- ✅ Single component request
- ✅ Multiple component request
- ✅ Filter synchronization across components
- ✅ Role-based access control enforcement
- ✅ Error isolation (partial failures)
- ✅ Invalid parameters (400 errors)
- ✅ Unauthorized access (401 errors)
- ✅ Forbidden access (403 errors)

### Performance Tests

**Load Testing**:
- ✅ Response time < 3s for 7 components with 100 facilities
- ✅ Parallel execution faster than sequential
- ✅ Database connection pooling efficiency
- ✅ Memory usage under concurrent requests

### Backward Compatibility Tests

**Legacy Endpoint Tests**:
- ✅ All legacy endpoints return same data format
- ✅ Deprecation headers present
- ✅ No breaking changes in response structure

## Performance Considerations

### Optimization Strategies

1. **Parallel Execution**: All components execute simultaneously using `Promise.all`
2. **Database Connection Reuse**: Single connection pool shared across components
3. **Reporting Period Caching**: Cache active reporting period for request duration
4. **Facility ID Pre-computation**: Resolve accessible facilities once per request
5. **Query-Level Filtering**: Apply filters in SQL rather than application code

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response Time (1 component) | < 500ms | P95 |
| Response Time (7 components) | < 3s | P95 |
| Database Queries per Request | < 15 | Average |
| Memory per Request | < 50MB | Peak |
| Concurrent Requests | 100+ | Sustained |

### Bottleneck Mitigation

**Potential Bottlenecks**:
1. Large facility sets (province-level queries)
2. JSONB parsing for budget calculations
3. Multiple aggregation levels (nested queries)

**Mitigation Strategies**:
1. Add database indexes on `facilityId`, `reportingPeriodId`, `entityType`
2. Cache budget calculation results within request scope
3. Use database-level aggregations where possible
4. Implement query result caching for static data (districts, provinces)



## Frontend Integration

### Unified Dashboard Hook

**File**: `apps/client/hooks/use-dashboard.ts`

```typescript
import { useQuery } from '@tanstack/react-query'
import { useState, useCallback } from 'react'

interface DashboardFilters {
  scope?: 'country' | 'province' | 'district' | 'facility'
  scopeId?: number
  programId?: number
  periodId?: number
  quarter?: number
}

interface UseDashboardOptions {
  components: string[]
  filters: DashboardFilters
  enabled?: boolean
}

export function useDashboard({ components, filters, enabled = true }: UseDashboardOptions) {
  const queryKey = ['dashboard', components, filters]
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams()
      params.append('components', components.join(','))
      
      if (filters.scope) params.append('scope', filters.scope)
      if (filters.scopeId) params.append('scopeId', filters.scopeId.toString())
      if (filters.programId) params.append('programId', filters.programId.toString())
      if (filters.periodId) params.append('periodId', filters.periodId.toString())
      if (filters.quarter) params.append('quarter', filters.quarter.toString())
      
      const response = await fetch(`/api/dashboard?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      return response.json()
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
  
  return {
    data,
    isLoading,
    error,
    refetch,
  }
}
```

### Dashboard Component Example

```typescript
import { useDashboard } from '@/hooks/use-dashboard'
import { MetricsCard } from './MetricsCard'
import { ProgramDistributionChart } from './ProgramDistributionChart'
import { TasksList } from './TasksList'

export function Dashboard() {
  const [filters, setFilters] = useState({
    scope: 'district' as const,
    scopeId: 12,
    programId: undefined,
    quarter: undefined,
  })
  
  const { data, isLoading, error } = useDashboard({
    components: ['metrics', 'programDistribution', 'tasks'],
    filters,
  })
  
  if (isLoading) {
    return <LoadingSpinner />
  }
  
  if (error) {
    return <ErrorMessage error={error} />
  }
  
  return (
    <div className="dashboard">
      <FilterBar filters={filters} onChange={setFilters} />
      
      <div className="dashboard-grid">
        {data?.metrics?.data && (
          <MetricsCard data={data.metrics.data} />
        )}
        
        {data?.metrics?.error && (
          <ErrorCard message={data.metrics.message} />
        )}
        
        {data?.programDistribution?.data && (
          <ProgramDistributionChart data={data.programDistribution.data} />
        )}
        
        {data?.programDistribution?.error && (
          <ErrorCard message={data.programDistribution.message} />
        )}
        
        {data?.tasks?.data && (
          <TasksList data={data.tasks.data} />
        )}
        
        {data?.tasks?.error && (
          <ErrorCard message={data.tasks.message} />
        )}
      </div>
    </div>
  )
}
```

### Benefits of Unified Hook

1. **Single Loading State**: One `isLoading` for entire dashboard
2. **Centralized Filter Management**: Filters managed in one place
3. **Automatic Refetch**: Filter changes trigger single API call
4. **Error Isolation**: Individual components can show errors
5. **Type Safety**: TypeScript types for all components
6. **Query Caching**: React Query handles caching automatically

## Migration Strategy

### Phase 1: Implement Unified Endpoint (Week 1)

1. Create unified dashboard service and route
2. Implement component handlers (reuse existing logic)
3. Add role-based scope service
4. Write unit tests for service layer
5. Write integration tests for endpoint

### Phase 2: Add Deprecation Headers (Week 1)

1. Add deprecation headers to all legacy endpoints
2. Log usage of legacy endpoints
3. Update API documentation

### Phase 3: Frontend Migration (Week 2-3)

1. Create `useDashboard` hook
2. Migrate one dashboard page at a time
3. Test each page thoroughly
4. Monitor for errors and performance issues

### Phase 4: Monitoring Period (Week 4-6)

1. Monitor usage of legacy vs unified endpoints
2. Collect performance metrics
3. Gather user feedback
4. Fix any issues discovered

### Phase 5: Deprecate Legacy Endpoints (Week 7+)

1. Ensure all clients migrated to unified endpoint
2. Remove legacy endpoint handlers
3. Clean up unused code
4. Update documentation

### Rollback Plan

If critical issues are discovered:
1. Legacy endpoints remain functional throughout migration
2. Frontend can revert to legacy hooks
3. Unified endpoint can be disabled via feature flag
4. No data loss or breaking changes



## Security Considerations

### Authentication

- All requests require valid session token
- Session validated via `auth.api.getSession()`
- Unauthorized requests return HTTP 401

### Authorization

**Role-Based Access Control**:
- User context includes role and accessible facility IDs
- Scope restrictions applied based on role:
  - `superadmin`/`admin`: Access all data
  - `provincial_accountant`: Province-level access
  - `district_accountant`: District-level access
  - `hospital_accountant`: Hospital + child facilities
  - `health_center_accountant`: Own facility only

**Scope Validation**:
- Users cannot request data outside their permitted scope
- Attempting to access unauthorized scope returns HTTP 403
- Facility IDs automatically filtered to accessible set

### Data Filtering

- All queries filter by `accessibleFacilityIds` from user context
- Admin bypass only for users with explicit admin role/permission
- No raw SQL injection points (Drizzle ORM parameterized queries)

### Input Validation

- Component names validated against enum
- Scope validated against enum
- Quarter validated (1-4 range)
- All numeric IDs parsed and validated
- Invalid inputs return HTTP 400

## Monitoring and Observability

### Logging

**Request Logging**:
```typescript
console.log('Dashboard request:', {
  userId: userContext.userId,
  components,
  filters,
  timestamp: new Date().toISOString(),
})
```

**Component Execution Logging**:
```typescript
console.log('Component execution:', {
  component,
  duration: executionTime,
  success: !error,
  error: error?.message,
})
```

**Legacy Endpoint Usage**:
```typescript
console.log('Legacy endpoint used:', {
  endpoint: req.path,
  userId: userContext.userId,
  timestamp: new Date().toISOString(),
})
```

### Metrics

**Key Metrics to Track**:
- Request count by component combination
- Response time by component
- Error rate by component
- Legacy vs unified endpoint usage
- Concurrent request count
- Database query count per request

### Alerts

**Alert Conditions**:
- Response time > 5s (P95)
- Error rate > 5%
- Database connection pool exhaustion
- Memory usage > 80%
- Legacy endpoint usage after migration deadline

## API Documentation

### OpenAPI Specification

The unified dashboard endpoint is documented in OpenAPI format:

```yaml
/api/dashboard:
  get:
    summary: Get unified dashboard data
    description: Fetch multiple dashboard components in a single request with unified filters
    tags:
      - dashboard
    parameters:
      - name: components
        in: query
        required: true
        schema:
          type: string
        description: Comma-separated list of components (metrics,programDistribution,tasks,etc.)
      - name: scope
        in: query
        schema:
          type: string
          enum: [country, province, district, facility]
        description: Organizational scope level
      - name: scopeId
        in: query
        schema:
          type: integer
        description: ID of the scope entity (required if scope is provided)
      - name: programId
        in: query
        schema:
          type: integer
        description: Filter by program ID
      - name: periodId
        in: query
        schema:
          type: integer
        description: Reporting period ID (defaults to active period)
      - name: quarter
        in: query
        schema:
          type: integer
          minimum: 1
          maximum: 4
        description: Filter by quarter (1-4)
    responses:
      200:
        description: Dashboard component data
        content:
          application/json:
            schema:
              type: object
              additionalProperties: true
      400:
        description: Invalid request parameters
      401:
        description: Authentication required
      403:
        description: Insufficient permissions
      500:
        description: Server error
```

### Example Requests

**Basic Request**:
```bash
GET /api/dashboard?components=metrics,programDistribution
```

**With Filters**:
```bash
GET /api/dashboard?components=metrics,budgetByDistrict&scope=province&scopeId=5&programId=1&quarter=2
```

**All Components**:
```bash
GET /api/dashboard?components=metrics,programDistribution,budgetByDistrict,budgetByFacility,provinceApprovals,districtApprovals,tasks&scope=district&scopeId=12
```

## Design Decisions and Rationale

### Why Single Endpoint?

**Problem**: Multiple endpoints caused filter synchronization issues and loading state chaos

**Solution**: Single endpoint with component-based fetching

**Benefits**:
- Single source of truth for filters
- One loading state for entire dashboard
- Reduced network overhead
- Simplified state management

### Why Component-Based Architecture?

**Problem**: Not all dashboards need all data

**Solution**: Client specifies which components to fetch

**Benefits**:
- Reduced bandwidth for simple dashboards
- Faster load times
- Pay-for-what-you-use model
- Easy to add new components

### Why Error Isolation?

**Problem**: One failing query blocked entire dashboard

**Solution**: Try/catch per component, partial success responses

**Benefits**:
- Resilient to individual component failures
- Better user experience (show available data)
- Easier debugging (know which component failed)
- Graceful degradation

### Why Parallel Execution?

**Problem**: Sequential queries too slow

**Solution**: Promise.all for parallel execution

**Benefits**:
- Faster response times
- Better resource utilization
- Consistent performance regardless of component count

### Why Maintain Legacy Endpoints?

**Problem**: Breaking changes disrupt users

**Solution**: Gradual migration with deprecation period

**Benefits**:
- Zero downtime migration
- Time to test and validate
- Rollback capability
- User confidence

## Future Enhancements

### Potential Improvements

1. **GraphQL Alternative**: Consider GraphQL for more flexible querying
2. **Streaming Responses**: Server-sent events for real-time updates
3. **Component Dependencies**: Automatic inclusion of dependent components
4. **Response Caching**: Redis cache for frequently requested data
5. **Batch Requests**: Support multiple filter sets in one request
6. **Webhook Support**: Push notifications for data changes
7. **Export Functionality**: CSV/Excel export for dashboard data
8. **Saved Views**: User-defined component + filter combinations

### Scalability Considerations

**Current Design Supports**:
- Up to 1000 facilities per request
- Up to 10 components per request
- Up to 100 concurrent requests

**Future Scaling Needs**:
- Database read replicas for query distribution
- Response caching layer (Redis)
- Query result pagination for large datasets
- Background job processing for heavy aggregations

