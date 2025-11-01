# Unified Dashboard API Specification

## Overview

This specification defines a unified dashboard API that consolidates eight existing dashboard endpoints into a single, composable endpoint. The new architecture eliminates critical pain points in the current implementation while maintaining backward compatibility.

## Problem Statement

The current dashboard implementation suffers from:

1. **Filter Synchronization Nightmare**: Applying filters across multiple endpoints requires manual synchronization
2. **Loading State Chaos**: Charts and widgets pop in at different times, creating poor UX
3. **Error Handling Complexity**: Some data loads while others fail, with no graceful degradation
4. **Filter State Duplication**: Each hook manages its own filter state, leading to inconsistencies
5. **Performance Overhead**: Multiple round trips to the server slow down dashboard loading

## Solution

A single unified endpoint (`GET /api/dashboard`) that:

- Accepts a list of components to fetch (`metrics`, `programDistribution`, `tasks`, etc.)
- Applies unified filters (scope, program, period, quarter) to all components
- Executes component queries in parallel for optimal performance
- Isolates errors so one failing component doesn't block others
- Enforces role-based access control automatically

## Key Features

### 🎯 Component-Based Fetching
Request only the data you need:
```
GET /api/dashboard?components=metrics,programDistribution,tasks
```

### 🔄 Unified Filters
Apply filters once, affect all components:
```
GET /api/dashboard?components=metrics,budgetByDistrict&scope=province&scopeId=5&programId=1&quarter=2
```

### ⚡ Parallel Execution
All components execute simultaneously using `Promise.all` for maximum performance.

### 🛡️ Error Isolation
One component fails? Others still return data:
```json
{
  "metrics": { "data": { ... } },
  "programDistribution": { "error": true, "message": "Failed to aggregate" },
  "tasks": { "data": { ... } }
}
```

### 🔐 Role-Based Access Control
Automatic scope restrictions based on user role:
- **National Admin**: All data
- **Provincial Accountant**: Province + districts + facilities
- **District Accountant**: District + facilities
- **Hospital Accountant**: Hospital + child health centers

### 🔄 Backward Compatible
Legacy endpoints remain functional during migration with deprecation headers.

## Architecture

```
Client (useDashboard hook)
    ↓ Single HTTP Request
API Route Handler
    ↓ Parse & Validate
DashboardService (Orchestrator)
    ↓ Parallel Execution
Component Handlers → Aggregation Services → Database
```

## Components

| Component | Description | Data Returned |
|-----------|-------------|---------------|
| `metrics` | Budget allocation, spending, utilization | Totals and percentages |
| `programDistribution` | Budget breakdown by program | Program allocations and percentages |
| `budgetByDistrict` | District-level budget comparison | District budgets and utilization |
| `budgetByFacility` | Facility-level budget detail | Facility budgets and utilization |
| `provinceApprovals` | Approval status by district | Approval counts and rates |
| `districtApprovals` | Approval details by facility/project | Detailed approval status |
| `tasks` | Pending work items for accountants | Pending plans, executions, deadlines |

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `components` | string | Yes | Comma-separated list of components |
| `scope` | enum | No | `country`, `province`, `district`, `facility` |
| `scopeId` | number | No* | ID of scope entity (*required if scope provided) |
| `programId` | number | No | Filter by program |
| `periodId` | number | No | Reporting period (defaults to active) |
| `quarter` | number | No | Quarter filter (1-4) |

## Example Requests

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

## Frontend Integration

### Before (Multiple Hooks)
```typescript
const { data: metrics } = useMetrics({ scope, scopeId, program, quarter })
const { data: programs } = useProgramDistribution({ scope, scopeId, quarter })
const { data: tasks } = useTasks({ facilityId })
// Filter synchronization nightmare!
```

### After (Single Hook)
```typescript
const { data, isLoading, error } = useDashboard({
  components: ['metrics', 'programDistribution', 'tasks'],
  filters: { scope, scopeId, program, quarter }
})
// Single loading state, synchronized filters!
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Response Time (1 component) | < 500ms (P95) |
| Response Time (7 components) | < 3s (P95) |
| Database Queries per Request | < 15 |
| Concurrent Requests | 100+ sustained |

## Migration Plan

1. **Week 1**: Implement unified endpoint and add deprecation headers
2. **Week 2-3**: Migrate frontend pages to unified hook
3. **Week 4-6**: Monitor usage and performance
4. **Week 7+**: Remove legacy endpoints

## Files

- `requirements.md`: Detailed requirements with user stories and acceptance criteria
- `design.md`: Complete technical design with architecture, components, and data models
- `tasks.md`: Implementation task list with requirement traceability

## Getting Started

To begin implementation, open `tasks.md` and click "Start task" next to task 1.1.

## Benefits Summary

✅ **Single API Call**: One request instead of 8  
✅ **Unified Filters**: Apply once, affect all components  
✅ **Parallel Execution**: Faster response times  
✅ **Error Isolation**: Graceful degradation  
✅ **Role-Aware**: Automatic access control  
✅ **Type-Safe**: Full TypeScript support  
✅ **Backward Compatible**: Zero downtime migration  
✅ **Better UX**: Single loading state, synchronized data  

## Questions?

Refer to the design document for detailed technical specifications, or review the requirements document for acceptance criteria.
