# Design Document

## Overview

This document outlines the technical design for a multi-level dashboard system that provides budget allocation, execution, and utilization insights across organizational hierarchies (province → district → facility). The system features tabbed navigation, dynamic filtering, visual analytics (pie charts, bar charts), and detailed approval tracking tables.

### Key Design Principles

1. **Hierarchical Data Aggregation**: Data flows from facility → district → province levels
2. **User Access Control**: Leverage existing `getUserContext` for permission-based filtering
3. **Consistent API Patterns**: Follow existing Hono + Zod OpenAPI patterns
4. **Reusable Components**: Build modular React components for charts, cards, and tables
5. **Performance Optimization**: Implement efficient database queries with proper indexing
6. **Responsive Design**: Mobile-first approach with adaptive layouts

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Dashboard Page (Tabs: Province | District)            │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │ Filter Bar   │  │ Summary Cards│  │ Charts       │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ Data Tables (Province/District specific)         │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓ ↑                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Query Hooks (Data Fetching & Caching)          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Hono)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Dashboard Routes                                      │ │
│  │  • /api/dashboard/metrics                             │ │
│  │  • /api/dashboard/program-distribution                │ │
│  │  • /api/dashboard/budget-by-district                  │ │
│  │  • /api/dashboard/budget-by-facility                  │ │
│  │  • /api/dashboard/approved-budgets/province           │ │
│  │  • /api/dashboard/approved-budgets/district           │ │
│  └────────────────────────────────────────────────────────┘ │
│                           ↓ ↑                                │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Service Layer (Business Logic)                       │ │
│  │  • Budget Aggregation Service                         │ │
│  │  • Approval Status Service                            │ │
│  │  • Access Control Service                             │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↓ ↑
┌─────────────────────────────────────────────────────────────┐
│                  Database (PostgreSQL)                       │
│  • provinces → districts → facilities                       │
│  • projects → schemaFormDataEntries (planning/execution)    │
│  • reportingPeriods                                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User Authentication**: Session validated via `getUserContext`
2. **Access Control**: User's accessible facilities determined by role and facility type
3. **Filter Application**: User selects province/district, program, quarter
4. **Data Aggregation**: Backend aggregates budget data based on filters and access control
5. **Response Delivery**: JSON data returned to client
6. **UI Rendering**: React components render charts, cards, and tables
7. **Auto-refresh**: Data refreshed every 5 minutes via React Query


## Components and Interfaces

### Frontend Component Structure

```
apps/client/app/dashboard/
├── page.tsx                              # Main dashboard page with tab navigation
├── _components/
│   ├── DashboardTabs.tsx                 # Tab switcher (Province/District)
│   ├── DashboardFilters.tsx              # Filter bar component
│   ├── BudgetSummaryCards.tsx            # 4 metric cards (reuse existing)
│   ├── ProgramDistributionChart.tsx      # Pie chart for program budgets
│   ├── BudgetBarChart.tsx                # Bar chart (district or facility)
│   ├── ProvinceApprovalTable.tsx         # District-level approval summary
│   ├── DistrictApprovalTable.tsx         # Facility-level approval details
│   └── DashboardSkeleton.tsx             # Loading states

apps/client/hooks/queries/dashboard/
├── use-get-metrics.ts                    # Fetch summary metrics
├── use-get-program-distribution.ts       # Fetch program distribution
├── use-get-budget-by-district.ts         # Fetch district budgets
├── use-get-budget-by-facility.ts         # Fetch facility budgets
├── use-get-province-approvals.ts         # Fetch province-level approvals
└── use-get-district-approvals.ts         # Fetch district-level approvals

apps/client/fetchers/dashboard/
├── get-metrics.ts
├── get-program-distribution.ts
├── get-budget-by-district.ts
├── get-budget-by-facility.ts
├── get-province-approvals.ts
└── get-district-approvals.ts
```

### Backend API Structure

```
apps/server/src/api/routes/dashboard/
├── dashboard.routes.ts                   # OpenAPI route definitions
├── dashboard.handlers.ts                 # Request handlers
└── dashboard.index.ts                    # Route registration

apps/server/src/api/services/dashboard/
├── metrics.service.ts                    # Budget metrics aggregation
├── program-distribution.service.ts       # Program budget distribution
├── budget-aggregation.service.ts         # District/facility budget aggregation
└── approval-tracking.service.ts          # Approval status tracking
```

### Key Interfaces

#### Dashboard Metrics Response
```typescript
interface DashboardMetricsResponse {
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  utilizationPercentage: number;
  reportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
  } | null;
}
```

#### Program Distribution Response
```typescript
interface ProgramDistributionItem {
  programId: number;
  programName: string;
  allocatedBudget: number;
  percentage: number;
}

interface ProgramDistributionResponse {
  programs: ProgramDistributionItem[];
  total: number;
}
```

#### Budget by District Response
```typescript
interface DistrictBudgetItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

interface BudgetByDistrictResponse {
  districts: DistrictBudgetItem[];
}
```

#### Budget by Facility Response
```typescript
interface FacilityBudgetItem {
  facilityId: number;
  facilityName: string;
  facilityType: string;
  allocatedBudget: number;
  spentBudget: number;
  utilizationPercentage: number;
}

interface BudgetByFacilityResponse {
  facilities: FacilityBudgetItem[];
}
```

#### Province Approval Summary Response
```typescript
interface ProvinceApprovalItem {
  districtId: number;
  districtName: string;
  allocatedBudget: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  totalCount: number;
  approvalRate: number;
}

interface ProvinceApprovalResponse {
  districts: ProvinceApprovalItem[];
}
```

#### District Approval Details Response
```typescript
interface DistrictApprovalItem {
  facilityId: number;
  facilityName: string;
  projectId: number;
  projectName: string;
  projectCode: string;
  allocatedBudget: number;
  approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
  approvedBy: string | null;
  approvedAt: string | null;
  quarter: number | null;
}

interface DistrictApprovalResponse {
  facilities: DistrictApprovalItem[];
}
```


## Data Models

### Database Schema Relationships

```
provinces (id, name)
    ↓ 1:N
districts (id, name, province_id)
    ↓ 1:N
facilities (id, name, facility_type, district_id, status)
    ↓ 1:N
projects (id, name, code, facility_id, reporting_period_id, status)
    ↓ 1:N
schemaFormDataEntries (id, entity_type, project_id, facility_id, reporting_period_id, form_data, metadata, status)
```

### Key Tables and Fields

#### schemaFormDataEntries
- **entity_type**: 'planning' | 'execution'
- **form_data**: JSONB containing budget activities
  - For planning: `{ activities: { [key]: { total_budget: number } } }`
  - For execution: `{ rollups: { bySection: { [key]: { total: number } } } }`
- **metadata**: JSONB containing additional info
  - `{ quarter: number, approvedBy: string, approvedAt: string }`
- **status**: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DRAFT'

#### projects
- **project_type**: Used to categorize programs (Malaria, HIV, TB, etc.)
- **facility_id**: Links project to a facility
- **reporting_period_id**: Links project to a fiscal period
- **status**: 'ACTIVE' | 'INACTIVE' | 'COMPLETED'

### Budget Calculation Logic

#### Allocated Budget (Planning)
```typescript
function calculateAllocatedBudget(planningEntries: SchemaFormDataEntry[]): number {
  return planningEntries.reduce((sum, entry) => {
    if (entry.formData?.activities) {
      const activities = Object.values(entry.formData.activities);
      const entryTotal = activities.reduce((actSum, activity: any) => {
        return actSum + (activity.total_budget || 0);
      }, 0);
      return sum + entryTotal;
    }
    return sum;
  }, 0);
}
```

#### Spent Budget (Execution)
```typescript
function calculateSpentBudget(executionEntries: SchemaFormDataEntry[]): number {
  return executionEntries.reduce((sum, entry) => {
    if (entry.formData?.rollups?.bySection) {
      const sections = Object.values(entry.formData.rollups.bySection);
      const entryTotal = sections.reduce((secSum, section: any) => {
        return secSum + (section.total || 0);
      }, 0);
      return sum + entryTotal;
    }
    return sum;
  }, 0);
}
```

#### Utilization Percentage
```typescript
function calculateUtilization(allocated: number, spent: number): number {
  if (allocated === 0) return 0;
  return Math.round((spent / allocated) * 100 * 100) / 100;
}
```

### Aggregation Strategies

#### Province-Level Aggregation
1. Filter facilities by province (via district relationship)
2. Apply user access control (accessible facility IDs)
3. Group by district
4. Sum budgets for each district
5. Calculate approval counts per district

#### District-Level Aggregation
1. Filter facilities by district
2. Apply user access control
3. Group by facility
4. Sum budgets for each facility
5. Retrieve approval details per facility

#### Program-Level Aggregation
1. Filter projects by project_type (program)
2. Join with schemaFormDataEntries
3. Sum budgets per program
4. Calculate percentage of total


## API Endpoints Design

### 1. Dashboard Metrics Endpoint

**Route**: `GET /api/dashboard/metrics`

**Query Parameters**:
- `level`: 'province' | 'district' (required)
- `provinceId`: number (optional, required if level=province)
- `districtId`: number (optional, required if level=district)
- `programId`: number (optional)
- `quarter`: number (optional, 1-4)

**Response Schema**:
```typescript
{
  totalAllocated: number;
  totalSpent: number;
  remaining: number;
  utilizationPercentage: number;
  reportingPeriod: {
    id: number;
    year: number;
    periodType: string;
    startDate: string;
    endDate: string;
  } | null;
}
```

**Handler Logic**:
1. Validate user session via `getUserContext`
2. Get current active reporting period
3. Determine scope (province or district)
4. Filter facilities based on scope and user access
5. Fetch planning entries (entity_type='planning')
6. Fetch execution entries (entity_type='execution')
7. Apply program and quarter filters if provided
8. Calculate aggregated metrics
9. Return response

---

### 2. Program Distribution Endpoint

**Route**: `GET /api/dashboard/program-distribution`

**Query Parameters**:
- `level`: 'province' | 'district' (required)
- `provinceId`: number (optional)
- `districtId`: number (optional)
- `quarter`: number (optional)

**Response Schema**:
```typescript
{
  programs: Array<{
    programId: number;
    programName: string;
    allocatedBudget: number;
    percentage: number;
  }>;
  total: number;
}
```

**Handler Logic**:
1. Validate user and get context
2. Determine facility scope
3. Fetch projects grouped by project_type (program)
4. Join with planning entries
5. Calculate allocated budget per program
6. Calculate percentage of total
7. Sort by allocated budget descending
8. Return response

---

### 3. Budget by District Endpoint

**Route**: `GET /api/dashboard/budget-by-district`

**Query Parameters**:
- `provinceId`: number (required)
- `programId`: number (optional)
- `quarter`: number (optional)

**Response Schema**:
```typescript
{
  districts: Array<{
    districtId: number;
    districtName: string;
    allocatedBudget: number;
    spentBudget: number;
    utilizationPercentage: number;
  }>;
}
```

**Handler Logic**:
1. Validate user and get context
2. Fetch districts in province
3. For each district, fetch facilities
4. Apply user access control
5. Aggregate planning and execution data per district
6. Apply program and quarter filters
7. Calculate metrics per district
8. Sort by allocated budget descending
9. Return response

---

### 4. Budget by Facility Endpoint

**Route**: `GET /api/dashboard/budget-by-facility`

**Query Parameters**:
- `districtId`: number (required)
- `programId`: number (optional)
- `quarter`: number (optional)

**Response Schema**:
```typescript
{
  facilities: Array<{
    facilityId: number;
    facilityName: string;
    facilityType: string;
    allocatedBudget: number;
    spentBudget: number;
    utilizationPercentage: number;
  }>;
}
```

**Handler Logic**:
1. Validate user and get context
2. Fetch facilities in district
3. Apply user access control
4. Aggregate planning and execution data per facility
5. Apply program and quarter filters
6. Calculate metrics per facility
7. Sort by allocated budget descending
8. Return response

---

### 5. Province Approval Summary Endpoint

**Route**: `GET /api/dashboard/approved-budgets/province`

**Query Parameters**:
- `provinceId`: number (required)
- `programId`: number (optional)
- `quarter`: number (optional)

**Response Schema**:
```typescript
{
  districts: Array<{
    districtId: number;
    districtName: string;
    allocatedBudget: number;
    approvedCount: number;
    rejectedCount: number;
    pendingCount: number;
    totalCount: number;
    approvalRate: number;
  }>;
}
```

**Handler Logic**:
1. Validate user and get context
2. Fetch districts in province
3. For each district, count planning entries by status
4. Calculate approval rate
5. Sum allocated budgets
6. Apply program and quarter filters
7. Sort by district name
8. Return response

---

### 6. District Approval Details Endpoint

**Route**: `GET /api/dashboard/approved-budgets/district`

**Query Parameters**:
- `districtId`: number (required)
- `programId`: number (optional)
- `quarter`: number (optional)

**Response Schema**:
```typescript
{
  facilities: Array<{
    facilityId: number;
    facilityName: string;
    projectId: number;
    projectName: string;
    projectCode: string;
    allocatedBudget: number;
    approvalStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
    approvedBy: string | null;
    approvedAt: string | null;
    quarter: number | null;
  }>;
}
```

**Handler Logic**:
1. Validate user and get context
2. Fetch facilities in district
3. Apply user access control
4. Fetch planning entries with project details
5. Extract approval metadata (approvedBy, approvedAt from metadata JSONB)
6. Apply program and quarter filters
7. Sort by facility name, then project name
8. Return response


## Error Handling

### Backend Error Handling Strategy

#### Authentication Errors
- **401 Unauthorized**: Session invalid or missing
- **403 Forbidden**: User lacks permission to access requested data

#### Validation Errors
- **400 Bad Request**: Missing required parameters or invalid parameter values
- Example: Missing `level` parameter, invalid `quarter` value

#### Data Errors
- **404 Not Found**: Requested province, district, or facility doesn't exist
- **500 Internal Server Error**: Database query failures, unexpected errors

#### Error Response Format
```typescript
{
  message: string;
  code?: string;
  details?: any;
}
```

### Frontend Error Handling Strategy

#### Network Errors
- Display: "Unable to connect to the server. Please check your internet connection."
- Action: Provide "Retry" button

#### Permission Errors (403)
- Display: "You do not have permission to view this data."
- Action: Redirect to accessible view or show contact admin message

#### Server Errors (500)
- Display: "An error occurred while loading dashboard data. Please try again later."
- Action: Provide "Retry" button, log error to monitoring service

#### Empty States
- No data available: Display friendly message with illustration
- No filters applied: Show prompt to select filters
- No permissions: Show access request information

### Error Logging
- Backend: Log all errors with context (user ID, request params, stack trace)
- Frontend: Log errors to console in development, send to monitoring in production


## Testing Strategy

### Unit Testing

#### Backend Unit Tests
- **Service Layer Tests**: Test budget calculation functions in isolation
  - `calculateAllocatedBudget()` with various form data structures
  - `calculateSpentBudget()` with execution data
  - `calculateUtilization()` with edge cases (zero allocated, negative values)
  
- **Access Control Tests**: Test `getUserContext` and permission filtering
  - Hospital users accessing district facilities
  - Health center users restricted to own facility
  - Admin users with full access

- **Aggregation Logic Tests**: Test data grouping and summing
  - Province-level aggregation
  - District-level aggregation
  - Program-level grouping

#### Frontend Unit Tests
- **Component Tests**: Test individual components with mock data
  - `BudgetSummaryCards` renders correct values
  - `ProgramDistributionChart` displays pie slices correctly
  - `BudgetBarChart` sorts and displays bars properly
  
- **Hook Tests**: Test React Query hooks with mock API responses
  - Successful data fetching
  - Error handling
  - Loading states

### Integration Testing

#### API Integration Tests
- Test complete request-response cycles for each endpoint
- Test with different user roles and permissions
- Test filter combinations (province + program + quarter)
- Test pagination and sorting

#### End-to-End Tests
- User navigates between Province and District tabs
- User applies filters and sees updated data
- User clicks on district in table and drills down
- Charts and tables update correctly with filter changes

### Performance Testing

#### Load Testing
- Test endpoints with large datasets (1000+ facilities)
- Measure response times for aggregation queries
- Test concurrent user access

#### Query Optimization
- Ensure proper database indexes on:
  - `facilities.district_id`
  - `facilities.facility_type`
  - `projects.facility_id`
  - `projects.reporting_period_id`
  - `schemaFormDataEntries.entity_type`
  - `schemaFormDataEntries.project_id`
  - `schemaFormDataEntries.facility_id`

### Test Data Requirements
- Multiple provinces with districts and facilities
- Projects with both planning and execution entries
- Various approval statuses (APPROVED, PENDING, REJECTED)
- Different programs (Malaria, HIV, TB)
- Multiple quarters of data


## UI/UX Design Specifications

### Layout Structure

#### Desktop Layout (≥1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Dashboard Title                                      │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Province] [District]                                  │
├─────────────────────────────────────────────────────────────┤
│ Filters: [Province ▼] [Program ▼] [Quarter ▼]               │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│ │Allocated │ │  Spent   │ │Remaining │ │Utilization│        │
│ │  Card    │ │  Card    │ │  Card    │ │   Card    │        │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐ ┌─────────────────────────────────┐ │
│ │  Pie Chart          │ │  Bar Chart                      │ │
│ │  (Program Dist.)    │ │  (District/Facility Budgets)    │ │
│ │                     │ │                                 │ │
│ └─────────────────────┘ └─────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Table: Approval Summary / Details                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ID │ Name │ Budget │ Approved │ Rejected │ Rate │       │ │
│ ├────┼──────┼────────┼──────────┼──────────┼──────┤       │ │
│ │... │ ...  │  ...   │   ...    │   ...    │ ...  │       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Mobile Layout (<768px)
```
┌─────────────────────────┐
│ Dashboard               │
├─────────────────────────┤
│ [Province] [District]   │
├─────────────────────────┤
│ Filters (Collapsible)   │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Allocated Card      │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Spent Card          │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Remaining Card      │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Utilization Card    │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Pie Chart           │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │ Bar Chart           │ │
│ └─────────────────────┘ │
├─────────────────────────┤
│ Table (Scrollable)      │
└─────────────────────────┘
```

### Color Scheme

#### Summary Cards
- **Allocated**: Blue (#3B82F6)
- **Spent**: Green (#10B981)
- **Remaining**: Orange (#F59E0B)
- **Utilization**: Purple (#8B5CF6)

#### Approval Status Colors
- **Approved**: Green (#10B981)
- **Pending**: Yellow (#F59E0B)
- **Rejected**: Red (#EF4444)

#### Chart Colors
- Use consistent color palette from design system
- Ensure sufficient contrast for accessibility (WCAG AA)

### Interactive Elements

#### Filters
- Dropdown selects with search capability
- Clear all filters button
- Active filter indicators (badges)

#### Charts
- Hover tooltips with detailed information
- Click on bar/slice to drill down (future enhancement)
- Legend with toggle capability

#### Tables
- Sortable columns (click header to sort)
- Pagination controls (10, 20, 50 rows per page)
- Row hover effect
- Click row to view details (district table → navigate to District tab)

### Loading States
- Skeleton loaders matching component structure
- Shimmer animation for visual feedback
- Preserve layout to prevent content shift

### Empty States
- Friendly illustrations
- Clear messaging
- Actionable suggestions (e.g., "Try adjusting your filters")

### Accessibility
- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly
- Focus indicators
- Color contrast compliance (WCAG AA)


## Performance Optimization

### Database Query Optimization

#### Indexing Strategy
```sql
-- Existing indexes (verify)
CREATE INDEX idx_facilities_district_type ON facilities(district_id, facility_type);
CREATE INDEX idx_facilities_parent ON facilities(parent_facility_id);

-- New indexes for dashboard queries
CREATE INDEX idx_projects_facility_period ON projects(facility_id, reporting_period_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_schema_entries_entity_facility ON schemaFormDataEntries(entity_type, facility_id, reporting_period_id);
CREATE INDEX idx_schema_entries_project ON schemaFormDataEntries(project_id, entity_type);
CREATE INDEX idx_schema_entries_status ON schemaFormDataEntries(status) WHERE status IN ('APPROVED', 'PENDING', 'REJECTED');
```

#### Query Patterns

**Efficient Aggregation Query Example**:
```sql
-- Province-level budget aggregation
SELECT 
  d.id as district_id,
  d.name as district_name,
  SUM(
    CASE 
      WHEN sfd.entity_type = 'planning' 
      THEN (sfd.form_data->'activities'->>'total_budget')::numeric 
      ELSE 0 
    END
  ) as allocated_budget,
  SUM(
    CASE 
      WHEN sfd.entity_type = 'execution' 
      THEN (sfd.form_data->'rollups'->'bySection'->>'total')::numeric 
      ELSE 0 
    END
  ) as spent_budget
FROM districts d
JOIN facilities f ON f.district_id = d.id
JOIN projects p ON p.facility_id = f.id
LEFT JOIN schemaFormDataEntries sfd ON sfd.project_id = p.id
WHERE d.province_id = $1
  AND p.reporting_period_id = $2
  AND p.status = 'ACTIVE'
  AND f.id = ANY($3) -- User accessible facility IDs
GROUP BY d.id, d.name
ORDER BY allocated_budget DESC;
```

### Caching Strategy

#### Server-Side Caching
- Cache aggregated metrics for 5 minutes using Redis or in-memory cache
- Cache key format: `dashboard:metrics:{level}:{id}:{programId}:{quarter}:{reportingPeriodId}`
- Invalidate cache on data updates (planning/execution entry changes)

#### Client-Side Caching
- React Query with 5-minute stale time
- Background refetch on window focus
- Optimistic updates for filter changes

### Data Fetching Optimization

#### Parallel Requests
- Fetch metrics, charts, and table data in parallel
- Use React Query's parallel queries feature
- Show partial data as it arrives

#### Pagination
- Implement cursor-based pagination for large tables
- Default page size: 20 rows
- Lazy load additional pages

#### Data Compression
- Enable gzip compression for API responses
- Minimize JSON payload size (remove null fields)

### Frontend Performance

#### Code Splitting
- Lazy load chart libraries (recharts, chart.js)
- Split dashboard components by tab
- Use React.lazy() for heavy components

#### Memoization
- Memoize expensive calculations (budget aggregations)
- Use React.memo() for chart components
- useMemo() for filtered/sorted data

#### Virtual Scrolling
- Implement virtual scrolling for tables with 100+ rows
- Use libraries like react-virtual or tanstack-virtual


## Migration Strategy

### Phase 1: Backend API Development
1. Create new service layer for dashboard aggregations
2. Implement 6 new API endpoints with Zod schemas
3. Add database indexes for performance
4. Write unit tests for service functions
5. Test endpoints with Postman/Insomnia

### Phase 2: Legacy Endpoint Migration
1. Create new `/api/dashboard/metrics` endpoint
2. Update existing `/api/dashboard/accountant/facility-overview` to use new service layer
3. Add deprecation warning to old endpoint
4. Update internal references to use new endpoint
5. Schedule old endpoint removal (3 months)

### Phase 3: Frontend Component Development
1. Create reusable dashboard components
2. Implement Province tab with filters and visualizations
3. Implement District tab with filters and visualizations
4. Add loading states and error handling
5. Implement responsive design

### Phase 4: Integration and Testing
1. Connect frontend to new API endpoints
2. Test with real data across different user roles
3. Performance testing and optimization
4. Accessibility audit and fixes
5. Cross-browser testing

### Phase 5: Deployment and Monitoring
1. Deploy backend changes to staging
2. Deploy frontend changes to staging
3. User acceptance testing
4. Production deployment
5. Monitor performance and errors
6. Gather user feedback

### Rollback Plan
- Keep old endpoint functional during migration
- Feature flag for new dashboard (enable/disable)
- Database migrations are reversible
- Quick rollback to previous frontend version if issues arise

### Data Migration
- No data migration required (using existing tables)
- Ensure `schemaFormDataEntries.metadata` JSONB contains approval info
- Backfill missing approval metadata if needed


## Security Considerations

### Authentication and Authorization

#### Session Validation
- All endpoints require valid session via `getUserContext`
- Reject requests with expired or invalid sessions (401)

#### Access Control
- Enforce facility-based access control on all queries
- Hospital users: Access all facilities in their district
- Health center users: Access only their own facility
- Admin users: Access all facilities (with audit logging)

#### Data Filtering
- Always filter queries by `userContext.accessibleFacilityIds`
- Never expose data from facilities user doesn't have access to
- Validate province/district IDs against user permissions

### Input Validation

#### Query Parameter Validation
- Use Zod schemas for all query parameters
- Validate numeric IDs (positive integers)
- Validate enum values (level, quarter)
- Sanitize inputs to prevent SQL injection

#### Rate Limiting
- Implement rate limiting on dashboard endpoints
- Limit: 100 requests per minute per user
- Return 429 Too Many Requests if exceeded

### Data Privacy

#### Sensitive Data Handling
- Don't expose user passwords or tokens in responses
- Mask sensitive financial data based on user role
- Log access to sensitive endpoints for audit

#### CORS Configuration
- Restrict CORS to allowed origins only
- Don't allow wildcard (*) in production

### SQL Injection Prevention
- Use parameterized queries (Drizzle ORM handles this)
- Never concatenate user input into SQL strings
- Validate all inputs before database queries

### XSS Prevention
- Sanitize all user-generated content before rendering
- Use React's built-in XSS protection
- Set proper Content-Security-Policy headers

### Audit Logging
- Log all dashboard data access with:
  - User ID
  - Timestamp
  - Endpoint accessed
  - Query parameters
  - Response status
- Store logs securely for compliance


## Technology Stack

### Backend
- **Framework**: Hono (lightweight web framework)
- **Validation**: Zod (schema validation)
- **ORM**: Drizzle ORM (type-safe database queries)
- **Database**: PostgreSQL (relational database)
- **API Documentation**: OpenAPI 3.0 (via @hono/zod-openapi)
- **Authentication**: Better-auth (session management)

### Frontend
- **Framework**: Next.js 14 (React framework with App Router)
- **Language**: TypeScript
- **State Management**: React Query (TanStack Query v5)
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS)
- **Charts**: Recharts or Chart.js (to be decided)
- **Forms**: React Hook Form + Zod
- **Styling**: Tailwind CSS

### Development Tools
- **Package Manager**: pnpm
- **Monorepo**: Turborepo or pnpm workspaces
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Vitest (unit tests), Playwright (e2e tests)

### Infrastructure
- **Hosting**: TBD (Vercel, AWS, etc.)
- **Database**: PostgreSQL (managed service)
- **Caching**: Redis (optional, for performance)
- **Monitoring**: TBD (Sentry, DataDog, etc.)


## Future Enhancements

### Phase 2 Features (Post-MVP)

#### Advanced Filtering
- Date range picker for custom periods
- Multi-select for programs (compare multiple programs)
- Facility type filter (hospitals vs health centers)
- Status filter (active, completed, inactive projects)

#### Enhanced Visualizations
- Trend charts (budget over time)
- Heatmaps (geographic budget distribution)
- Comparison charts (current vs previous period)
- Drill-down capability (click chart to filter table)

#### Export Functionality
- Export tables to CSV/Excel
- Export charts as PNG/PDF
- Generate PDF reports with all dashboard data
- Schedule automated email reports

#### Real-time Updates
- WebSocket connection for live data updates
- Notification system for approval status changes
- Real-time collaboration (multiple users viewing same data)

#### Advanced Analytics
- Predictive analytics (budget forecasting)
- Anomaly detection (unusual spending patterns)
- Benchmarking (compare against similar facilities)
- Performance scoring (facility efficiency metrics)

#### Mobile App
- Native mobile app for iOS/Android
- Offline mode with data sync
- Push notifications for approvals
- Mobile-optimized charts and tables

#### Customization
- User-configurable dashboard layouts
- Save custom filter presets
- Personalized metric cards
- Custom report templates

### Technical Debt to Address
- Refactor existing `calculateBudgetFromFormData` function
- Standardize form data structure across planning/execution
- Improve error messages with i18n support
- Add comprehensive API documentation
- Implement automated testing pipeline


## Appendix

### Glossary of Terms

- **Aggregation**: The process of combining data from multiple sources into summary statistics
- **Drill-down**: Navigation from summary data to detailed data
- **Utilization Rate**: Percentage of allocated budget that has been spent
- **Approval Rate**: Percentage of budget plans that have been approved
- **Reporting Period**: A fiscal time period (annual or quarterly)
- **Entity Type**: Classification of form data (planning or execution)
- **Form Data**: JSONB structure containing budget activities and amounts
- **Accessible Facilities**: Facilities a user has permission to view based on their role

### API Response Examples

#### Metrics Response Example
```json
{
  "totalAllocated": 15000000,
  "totalSpent": 9500000,
  "remaining": 5500000,
  "utilizationPercentage": 63.33,
  "reportingPeriod": {
    "id": 1,
    "year": 2024,
    "periodType": "ANNUAL",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }
}
```

#### Program Distribution Response Example
```json
{
  "programs": [
    {
      "programId": 1,
      "programName": "Malaria Control",
      "allocatedBudget": 6000000,
      "percentage": 40.0
    },
    {
      "programId": 2,
      "programName": "HIV/AIDS Prevention",
      "allocatedBudget": 5000000,
      "percentage": 33.33
    },
    {
      "programId": 3,
      "programName": "TB Treatment",
      "allocatedBudget": 4000000,
      "percentage": 26.67
    }
  ],
  "total": 15000000
}
```

#### Budget by District Response Example
```json
{
  "districts": [
    {
      "districtId": 1,
      "districtName": "Kigali District",
      "allocatedBudget": 8000000,
      "spentBudget": 5200000,
      "utilizationPercentage": 65.0
    },
    {
      "districtId": 2,
      "districtName": "Musanze District",
      "allocatedBudget": 7000000,
      "spentBudget": 4300000,
      "utilizationPercentage": 61.43
    }
  ]
}
```

### Database Query Examples

#### Get Accessible Facilities for User
```typescript
const userContext = await getUserContext(c);
const facilities = await db.query.facilities.findMany({
  where: (facilities, { inArray }) => 
    inArray(facilities.id, userContext.accessibleFacilityIds)
});
```

#### Aggregate Budget by District
```typescript
const districtBudgets = await db
  .select({
    districtId: districts.id,
    districtName: districts.name,
    allocatedBudget: sql<number>`
      COALESCE(SUM(
        CASE WHEN ${schemaFormDataEntries.entityType} = 'planning'
        THEN (${schemaFormDataEntries.formData}->>'total_budget')::numeric
        ELSE 0 END
      ), 0)
    `,
    spentBudget: sql<number>`
      COALESCE(SUM(
        CASE WHEN ${schemaFormDataEntries.entityType} = 'execution'
        THEN (${schemaFormDataEntries.formData}->>'total')::numeric
        ELSE 0 END
      ), 0)
    `
  })
  .from(districts)
  .leftJoin(facilities, eq(facilities.districtId, districts.id))
  .leftJoin(projects, eq(projects.facilityId, facilities.id))
  .leftJoin(schemaFormDataEntries, eq(schemaFormDataEntries.projectId, projects.id))
  .where(
    and(
      eq(districts.provinceId, provinceId),
      inArray(facilities.id, accessibleFacilityIds)
    )
  )
  .groupBy(districts.id, districts.name);
```

### References

- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Recharts Documentation](https://recharts.org/)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: Development Team  
**Status**: Draft - Pending Review
