# Dashboard Endpoints - Current State Analysis

## Overview
The dashboard API provides comprehensive budget tracking, approval monitoring, and task management capabilities across multiple organizational levels (facility, district, province). The endpoints support role-based access control and hierarchical data aggregation.

---

## Active Endpoints

### 1. **GET /api/dashboard/metrics**
**Purpose**: Core metrics endpoint providing aggregated budget data at province or district level

**Query Parameters**:
- `level` (required): `province` | `district`
- `provinceId` (optional): Required when level=province
- `districtId` (optional): Required when level=district
- `programId` (optional): Filter by specific program
- `quarter` (optional): Filter by quarter (1-4)

**Response Insights**:
```json
{
  "totalAllocated": number,      // Total budget allocated
  "totalSpent": number,           // Total budget spent
  "remaining": number,            // Remaining budget
  "utilizationPercentage": number, // Budget utilization (0-100)
  "reportingPeriod": {
    "id": number,
    "year": number,
    "periodType": string,
    "startDate": string,
    "endDate": string
  }
}
```

**Key Insights Provided**:
- Budget allocation vs spending at organizational level
- Utilization rates for performance tracking
- Current reporting period context
- Filterable by program and quarter for granular analysis

---

### 2. **GET /api/dashboard/program-distribution**
**Purpose**: Shows budget distribution across different programs

**Query Parameters**:
- `level` (required): `province` | `district`
- `provinceId` (optional): Province filter
- `districtId` (optional): District filter
- `quarter` (optional): Quarter filter (1-4)

**Response Insights**:
```json
{
  "programs": [
    {
      "programId": number,
      "programName": string,
      "allocatedBudget": number,
      "percentage": number        // % of total budget
    }
  ],
  "total": number
}
```

**Key Insights Provided**:
- Program-wise budget allocation breakdown
- Percentage distribution across programs (HIV, Malaria, TB, etc.)
- Helps identify program funding priorities
- Supports resource allocation decisions

---

### 3. **GET /api/dashboard/budget-by-district**
**Purpose**: District-level budget breakdown within a province

**Query Parameters**:
- `provinceId` (required): Province to analyze
- `programId` (optional): Filter by program
- `quarter` (optional): Quarter filter (1-4)

**Response Insights**:
```json
{
  "districts": [
    {
      "districtId": number,
      "districtName": string,
      "allocatedBudget": number,
      "spentBudget": number,
      "utilizationPercentage": number
    }
  ]
}
```

**Key Insights Provided**:
- District-by-district budget comparison
- Utilization rates across districts
- Identifies high/low performing districts
- Supports provincial oversight and resource reallocation

---

### 4. **GET /api/dashboard/budget-by-facility**
**Purpose**: Facility-level budget breakdown within a district

**Query Parameters**:
- `districtId` (required): District to analyze
- `programId` (optional): Filter by program
- `quarter` (optional): Quarter filter (1-4)

**Response Insights**:
```json
{
  "facilities": [
    {
      "facilityId": number,
      "facilityName": string,
      "facilityType": string,      // hospital, health_center
      "allocatedBudget": number,
      "spentBudget": number,
      "utilizationPercentage": number
    }
  ]
}
```

**Key Insights Provided**:
- Facility-level budget performance
- Facility type comparison (hospitals vs health centers)
- Granular spending patterns
- Supports district-level management decisions

---

### 5. **GET /api/dashboard/approved-budgets/province**
**Purpose**: Province-level approval status summary by district

**Query Parameters**:
- `provinceId` (required): Province to analyze
- `programId` (optional): Filter by program
- `quarter` (optional): Quarter filter (1-4)

**Response Insights**:
```json
{
  "districts": [
    {
      "districtId": number,
      "districtName": string,
      "allocatedBudget": number,
      "approvedCount": number,     // # of approved plans
      "rejectedCount": number,     // # of rejected plans
      "pendingCount": number,      // # of pending plans
      "totalCount": number,        // Total plans
      "approvalRate": number       // % approved
    }
  ]
}
```

**Key Insights Provided**:
- Approval workflow progress by district
- Approval rates for performance monitoring
- Bottleneck identification (high pending counts)
- Quality indicators (rejection rates)

---

### 6. **GET /api/dashboard/approved-budgets/district**
**Purpose**: District-level approval details by facility and project

**Query Parameters**:
- `districtId` (required): District to analyze
- `programId` (optional): Filter by program
- `quarter` (optional): Quarter filter (1-4)

**Response Insights**:
```json
{
  "facilities": [
    {
      "facilityId": number,
      "facilityName": string,
      "projectId": number,
      "projectName": string,
      "projectCode": string,
      "allocatedBudget": number,
      "approvalStatus": "APPROVED" | "PENDING" | "REJECTED",
      "approvedBy": string | null,
      "approvedAt": string | null,
      "quarter": number | null
    }
  ]
}
```

**Key Insights Provided**:
- Granular approval status per facility/project
- Audit trail (who approved, when)
- Project-level budget tracking
- Supports detailed review and follow-up

---

### 7. **GET /api/dashboard/accountant/facility-overview** ⚠️ DEPRECATED
**Purpose**: Legacy facility-level overview (replaced by /metrics)

**Deprecation Notice**:
- Header: `X-Deprecated: true`
- Replacement: `/api/dashboard/metrics`
- Deprecation Date: 2025-01-26

**Query Parameters**:
- `facilityId` (optional): Specific facility or user's accessible facilities

**Response Insights**:
```json
{
  "currentReportingPeriod": {...},
  "facility": {
    "id": number,
    "name": string,
    "facilityType": string
  },
  "budgetSummary": {
    "totalAllocated": number,
    "totalSpent": number,
    "totalRemaining": number,
    "utilizationPercentage": number
  },
  "projectBreakdown": [
    {
      "projectId": number,
      "projectName": string,
      "projectCode": string,
      "allocated": number,
      "spent": number,
      "remaining": number,
      "utilizationPercentage": number
    }
  ]
}
```

**Key Insights Provided**:
- Facility-specific budget overview
- Project-by-project breakdown
- Historical data (maintained for backward compatibility)

---

### 8. **GET /api/dashboard/accountant/tasks**
**Purpose**: Task management for accountants - pending work items

**Query Parameters**:
- `facilityId` (optional): Filter by facility

**Response Insights**:
```json
{
  "pendingPlans": [
    {
      "projectId": number,
      "projectName": string,
      "projectCode": string,
      "reportingPeriodId": number,
      "reportingPeriodYear": number,
      "deadline": string,
      "status": string
    }
  ],
  "pendingExecutions": [
    {
      "projectId": number,
      "projectName": string,
      "projectCode": string,
      "reportingPeriodId": number,
      "reportingPeriodYear": number,
      "quarter": number,
      "deadline": string,
      "status": string
    }
  ],
  "correctionsRequired": [...],
  "upcomingDeadlines": [
    {
      "reportingPeriodId": number,
      "year": number,
      "periodType": string,
      "endDate": string,
      "daysRemaining": number
    }
  ]
}
```

**Key Insights Provided**:
- Incomplete planning entries (projects without plans)
- Missing execution reports (quarterly tracking)
- Items requiring corrections
- Deadline awareness (days remaining)
- Workload visibility for accountants

---

## Data Aggregation Architecture

### Service Layer Components

**1. Budget Calculation Service** (`budget-calculations.service.ts`)
- `calculateAllocatedBudget()`: Sums planning entry budgets
- `calculateSpentBudget()`: Sums execution entry budgets
- `calculateUtilization()`: Computes utilization percentage

**2. Aggregation Service** (`aggregation.service.ts`)
- `getCurrentReportingPeriod()`: Fetches active reporting period
- `fetchPlanningEntries()`: Retrieves approved planning data with filters
- `fetchExecutionEntries()`: Retrieves execution data with filters
- `aggregateBudgetData()`: Core aggregation logic
- `aggregateByDistrict()`: District-level rollup
- `aggregateByFacility()`: Facility-level rollup
- `aggregateByProgram()`: Program-level distribution

**3. Access Control Service**
- `validateProvinceAccess()`: Ensures user can access province data
- `validateDistrictAccess()`: Ensures user can access district data
- `getAccessibleFacilitiesInProvince()`: Returns authorized facilities
- `getAccessibleFacilitiesInDistrict()`: Returns authorized facilities

---

## Key Features

### 1. **Hierarchical Data Access**
- Province → District → Facility drill-down
- Role-based access control at each level
- Automatic filtering to accessible facilities only

### 2. **Multi-Dimensional Filtering**
- **Geographic**: Province, District, Facility
- **Program**: HIV, Malaria, TB, etc.
- **Temporal**: Quarter (1-4), Reporting Period
- **Status**: Approval status (APPROVED, PENDING, REJECTED)

### 3. **Budget Tracking**
- **Allocated**: From approved planning entries
- **Spent**: From execution entries
- **Remaining**: Calculated difference
- **Utilization**: Percentage of budget used

### 4. **Approval Workflow Monitoring**
- Approval counts and rates
- Pending items tracking
- Rejection analysis
- Audit trail (who, when)

### 5. **Task Management**
- Identifies missing planning entries
- Tracks incomplete execution reports
- Deadline monitoring
- Correction requirements

---

## Data Sources

### Primary Tables
1. **schemaFormDataEntries**: Planning and execution data
   - `entityType`: 'planning' | 'execution'
   - `approvalStatus`: 'APPROVED' | 'PENDING' | 'REJECTED'
   - `formData`: JSONB containing budget activities
   - `metadata`: JSONB with quarter, approval info

2. **projects**: Project definitions
   - `projectType`: Program identifier (HIV, Malaria, TB)
   - `facilityId`: Associated facility
   - `reportingPeriodId`: Active period

3. **facilities**: Facility master data
   - `districtId`: Geographic hierarchy
   - `facilityType`: hospital, health_center

4. **districts**: District master data
   - `provinceId`: Geographic hierarchy

5. **reportingPeriods**: Time period definitions
   - `status`: 'ACTIVE' | 'CLOSED'
   - `year`, `periodType`, `startDate`, `endDate`

---

## Performance Considerations

### Optimizations
- Approved entries only for planning data (reduces noise)
- Facility-level access control filtering
- Indexed queries on `entityType`, `reportingPeriodId`, `facilityId`
- JSONB metadata queries for quarter filtering

### Potential Bottlenecks
- Large facility sets (province-level queries)
- JSONB field parsing for budget calculations
- Multiple aggregation levels (nested queries)

---

## Use Cases by Role

### **Provincial Manager**
- Province-level metrics overview
- District comparison and ranking
- Program distribution analysis
- Approval rate monitoring across districts

### **District Manager**
- District-level metrics
- Facility comparison within district
- Approval workflow management
- Budget allocation oversight

### **Facility Accountant**
- Facility-specific budget tracking
- Project-level breakdown
- Task list (pending plans/executions)
- Deadline monitoring

---

## Insights Summary

### **Financial Insights**
✅ Total budget allocation vs spending  
✅ Utilization rates at all organizational levels  
✅ Program-wise budget distribution  
✅ Remaining budget tracking  
✅ Quarterly spending patterns  

### **Operational Insights**
✅ Approval workflow progress  
✅ Pending work items (plans, executions)  
✅ Deadline awareness  
✅ Correction requirements  
✅ Task prioritization for accountants  

### **Performance Insights**
✅ District/facility utilization comparison  
✅ Approval rates (quality indicator)  
✅ Rejection analysis  
✅ Completion rates (plans vs executions)  

### **Strategic Insights**
✅ Program funding priorities  
✅ Geographic resource distribution  
✅ Capacity indicators (by facility type)  
✅ Audit trail for accountability  

---

## Recommendations for Enhancement

### **Missing Insights**
1. **Trend Analysis**: Historical comparison (year-over-year, quarter-over-quarter)
2. **Forecasting**: Projected spending based on current utilization
3. **Variance Analysis**: Budget vs actual with explanations
4. **Efficiency Metrics**: Cost per outcome, spending velocity
5. **Alerts**: Automated notifications for anomalies (overspending, underutilization)

### **Data Quality**
1. **Validation**: Budget entry completeness checks
2. **Reconciliation**: Planning vs execution matching
3. **Audit Logs**: Change tracking for budget modifications

### **User Experience**
1. **Drill-down Navigation**: Click-through from summary to detail
2. **Export Capabilities**: CSV/Excel export for offline analysis
3. **Visualization**: Chart data endpoints for graphs
4. **Saved Views**: User-defined filters and preferences

---

## Technical Notes

### **Budget Calculation Logic**
The system uses a flexible form data parser (`calculateBudgetFromFormData`) that handles:
- Planning structure: `activities[].total_budget`
- Execution structure: `rollups.bySection[].total`
- Fallback fields: `budget`, `amount`, `cumulative_balance`

### **Access Control**
- User context includes `accessibleFacilityIds` based on role and district
- All endpoints validate access before returning data
- Hierarchical access: province access implies district access

### **Deprecation Strategy**
- Legacy endpoint maintained with deprecation headers
- Migration path clearly documented
- Backward compatibility preserved during transition period

---

## Conclusion

The dashboard endpoints provide comprehensive budget tracking and approval monitoring across the organizational hierarchy. They support:

- **Multi-level aggregation** (province → district → facility)
- **Flexible filtering** (program, quarter, status)
- **Role-based access control**
- **Task management** for accountants
- **Approval workflow tracking**

The insights enable data-driven decision-making for resource allocation, performance monitoring, and operational efficiency at all organizational levels.
