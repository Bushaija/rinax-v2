# Requirements Document

## Introduction

This document specifies requirements for a comprehensive multi-level dashboard system that provides budget allocation, execution, and utilization insights from national to district levels with drill-down capabilities. The system enables stakeholders to monitor financial performance across provinces, districts, and health facilities with visual analytics and detailed approval tracking.

## Glossary

- **Dashboard System**: The web-based interface providing budget and execution insights
- **Province Tab**: Dashboard view showing national-level aggregation by districts
- **District Tab**: Dashboard view showing district-level aggregation by facilities
- **Budget Allocation**: The planned budget amount assigned to projects or facilities
- **Budget Execution**: The actual expenditure recorded against allocated budgets
- **Utilization Rate**: The percentage of allocated budget that has been spent (Spent ÷ Allocated × 100)
- **Approval Status**: The state of a budget plan (Approved, Pending, Rejected)
- **Health Facility**: A healthcare service delivery point (hospital, clinic, health center)
- **Program**: A health intervention category (e.g., Malaria, HIV, TB)
- **Reporting Period**: A time-bound fiscal period (annual or quarterly)
- **Drill-down**: The ability to navigate from aggregated data to detailed data

## Requirements

### Requirement 1: Multi-Level Dashboard Navigation

**User Story:** As a national health administrator, I want to view budget data at both province and district levels, so that I can understand performance across different organizational hierarchies.

#### Acceptance Criteria

1. WHEN THE Dashboard System loads, THE Dashboard System SHALL display two navigation tabs labeled "Province" and "District"
2. WHEN a user selects the Province tab, THE Dashboard System SHALL display province-level aggregated data grouped by districts
3. WHEN a user selects the District tab, THE Dashboard System SHALL display district-level aggregated data grouped by health facilities
4. THE Dashboard System SHALL maintain the selected tab state during the user session
5. WHEN switching between tabs, THE Dashboard System SHALL preserve applicable filter selections

### Requirement 2: Province-Level Data Filtering

**User Story:** As a provincial health officer, I want to filter dashboard data by province, program, and quarter, so that I can analyze specific segments of budget performance.

#### Acceptance Criteria

1. WHEN viewing the Province tab, THE Dashboard System SHALL display filter controls for province, program, and quarter
2. WHEN a user selects a province filter, THE Dashboard System SHALL display only data for districts within that province
3. WHEN a user selects a program filter, THE Dashboard System SHALL display only budget data associated with that health program
4. WHEN a user selects a quarter filter, THE Dashboard System SHALL display only data for that reporting quarter
5. THE Dashboard System SHALL allow multiple filters to be applied simultaneously
6. WHEN filters are changed, THE Dashboard System SHALL update all dashboard components within 2 seconds

### Requirement 3: District-Level Data Filtering

**User Story:** As a district health manager, I want to filter dashboard data by district, program, and quarter, so that I can monitor facility-level performance in my jurisdiction.

#### Acceptance Criteria

1. WHEN viewing the District tab, THE Dashboard System SHALL display filter controls for district, program, and quarter
2. WHEN a user selects a district filter, THE Dashboard System SHALL display only data for health facilities within that district
3. WHEN a user selects a program filter, THE Dashboard System SHALL display only budget data associated with that health program
4. WHEN a user selects a quarter filter, THE Dashboard System SHALL display only data for that reporting quarter
5. THE Dashboard System SHALL allow multiple filters to be applied simultaneously
6. WHEN filters are changed, THE Dashboard System SHALL update all dashboard components within 2 seconds

### Requirement 4: Budget Summary Metrics Display

**User Story:** As a financial analyst, I want to see key budget metrics at the top of the dashboard, so that I can quickly assess overall financial performance.

#### Acceptance Criteria

1. THE Dashboard System SHALL display four summary metric cards: Total Allocated Budget, Total Spent, Remaining, and Utilization Rate
2. WHEN viewing the Province tab, THE Dashboard System SHALL calculate metrics by aggregating all district-level data matching active filters
3. WHEN viewing the District tab, THE Dashboard System SHALL calculate metrics by aggregating all facility-level data matching active filters
4. THE Dashboard System SHALL display Total Allocated Budget as the sum of all planned budgets
5. THE Dashboard System SHALL display Total Spent as the sum of all actual expenditures from execution data
6. THE Dashboard System SHALL display Remaining as the difference between Total Allocated Budget and Total Spent
7. THE Dashboard System SHALL display Utilization Rate as (Total Spent ÷ Total Allocated Budget × 100) rounded to two decimal places
8. WHEN Total Allocated Budget equals zero, THE Dashboard System SHALL display Utilization Rate as 0%

### Requirement 5: Program Budget Distribution Visualization

**User Story:** As a program coordinator, I want to see a pie chart showing budget distribution across health programs, so that I can understand resource allocation priorities.

#### Acceptance Criteria

1. THE Dashboard System SHALL display a pie chart showing allocated budget distribution by program
2. WHEN viewing the Province tab, THE Dashboard System SHALL aggregate program budgets across all districts matching active filters
3. WHEN viewing the District tab, THE Dashboard System SHALL aggregate program budgets across all facilities matching active filters
4. THE Dashboard System SHALL display each program as a distinct pie slice with a unique color
5. THE Dashboard System SHALL display the program name and budget amount in the chart legend
6. WHEN a user hovers over a pie slice, THE Dashboard System SHALL display a tooltip showing program name, budget amount, and percentage of total
7. WHEN no budget data exists for the selected filters, THE Dashboard System SHALL display an empty state message

### Requirement 6: Province-Level Budget Bar Chart

**User Story:** As a national administrator, I want to see a bar chart comparing allocated budgets across districts, so that I can identify resource distribution patterns.

#### Acceptance Criteria

1. WHEN viewing the Province tab, THE Dashboard System SHALL display a bar chart with districts on the X-axis and allocated budget on the Y-axis
2. THE Dashboard System SHALL display one bar per district matching the active filters
3. THE Dashboard System SHALL sort districts by allocated budget in descending order
4. WHEN a user hovers over a bar, THE Dashboard System SHALL display a tooltip showing district name, allocated budget, spent amount, and utilization percentage
5. THE Dashboard System SHALL use a consistent color scheme for all bars
6. WHEN no district data exists for the selected filters, THE Dashboard System SHALL display an empty state message

### Requirement 7: District-Level Budget Bar Chart

**User Story:** As a district manager, I want to see a bar chart comparing allocated budgets across health facilities, so that I can monitor resource distribution within my district.

#### Acceptance Criteria

1. WHEN viewing the District tab, THE Dashboard System SHALL display a bar chart with health facilities on the X-axis and allocated budget on the Y-axis
2. THE Dashboard System SHALL display one bar per facility matching the active filters
3. THE Dashboard System SHALL sort facilities by allocated budget in descending order
4. WHEN a user hovers over a bar, THE Dashboard System SHALL display a tooltip showing facility name, allocated budget, spent amount, and utilization percentage
5. THE Dashboard System SHALL use a consistent color scheme for all bars
6. WHEN no facility data exists for the selected filters, THE Dashboard System SHALL display an empty state message

### Requirement 8: Province-Level Approval Summary Table

**User Story:** As a provincial supervisor, I want to see a table summarizing budget approval status by district, so that I can track approval progress and identify bottlenecks.

#### Acceptance Criteria

1. WHEN viewing the Province tab, THE Dashboard System SHALL display a table with columns: ID, District Name, Allocated Budget, Approved Count, Rejected Count, and Approval Rate
2. THE Dashboard System SHALL display one row per district matching the active filters
3. THE Dashboard System SHALL calculate Approved Count as the number of budget plans with "Approved" status
4. THE Dashboard System SHALL calculate Rejected Count as the number of budget plans with "Rejected" status
5. THE Dashboard System SHALL calculate Approval Rate as (Approved Count ÷ Total Plans × 100) rounded to two decimal places
6. THE Dashboard System SHALL support sorting by any column
7. THE Dashboard System SHALL support pagination when more than 20 districts are displayed
8. WHEN a user clicks on a district row, THE Dashboard System SHALL navigate to the District tab with that district pre-selected

### Requirement 9: District-Level Facility Approval Table

**User Story:** As a district accountant, I want to see detailed approval status for each health facility, so that I can follow up on pending or rejected budget plans.

#### Acceptance Criteria

1. WHEN viewing the District tab, THE Dashboard System SHALL display a table with columns: ID, Health Facility, Allocated Budget, Approved Status, Approved By, and Approved At
2. THE Dashboard System SHALL display one row per facility matching the active filters
3. THE Dashboard System SHALL display Approved Status as one of: "Approved", "Pending", or "Rejected"
4. THE Dashboard System SHALL display Approved By as the username of the reviewer who approved or rejected the plan
5. THE Dashboard System SHALL display Approved At as a formatted timestamp (YYYY-MM-DD HH:MM)
6. WHEN Approved Status is "Pending", THE Dashboard System SHALL display empty values for Approved By and Approved At
7. THE Dashboard System SHALL support sorting by any column
8. THE Dashboard System SHALL support pagination when more than 20 facilities are displayed
9. THE Dashboard System SHALL apply visual styling to distinguish between Approved (green), Pending (yellow), and Rejected (red) statuses

### Requirement 10: Dashboard Metrics API Endpoint

**User Story:** As a backend developer, I need a unified API endpoint for dashboard metrics, so that the frontend can retrieve aggregated budget data efficiently.

#### Acceptance Criteria

1. THE Dashboard System SHALL provide an API endpoint at `/api/dashboard/metrics`
2. THE Dashboard System SHALL accept query parameters: level (district or province), district_id, province_id, program_id, and quarter
3. WHEN level is "district" and district_id is provided, THE Dashboard System SHALL return metrics aggregated for all facilities in that district
4. WHEN level is "province" and province_id is provided, THE Dashboard System SHALL return metrics aggregated for all districts in that province
5. THE Dashboard System SHALL return a JSON response containing: totalAllocated, totalSpent, remaining, and utilizationPercentage
6. THE Dashboard System SHALL calculate metrics based on the current active reporting period
7. THE Dashboard System SHALL apply user access control to ensure users only see data for facilities they have permission to access
8. WHEN required parameters are missing, THE Dashboard System SHALL return a 400 Bad Request error with a descriptive message

### Requirement 11: Program Distribution API Endpoint

**User Story:** As a backend developer, I need an API endpoint for program budget distribution, so that the frontend can render the pie chart visualization.

#### Acceptance Criteria

1. THE Dashboard System SHALL provide an API endpoint at `/api/dashboard/program-distribution`
2. THE Dashboard System SHALL accept query parameters: level, district_id, province_id, and quarter
3. THE Dashboard System SHALL return a JSON array of objects containing: programId, programName, and allocatedBudget
4. WHEN level is "district", THE Dashboard System SHALL aggregate program budgets across facilities in the specified district
5. WHEN level is "province", THE Dashboard System SHALL aggregate program budgets across districts in the specified province
6. THE Dashboard System SHALL order results by allocatedBudget in descending order
7. THE Dashboard System SHALL apply user access control based on the authenticated user's permissions

### Requirement 12: Budget by District API Endpoint

**User Story:** As a backend developer, I need an API endpoint for district-level budget aggregation, so that the Province tab bar chart can display district comparisons.

#### Acceptance Criteria

1. THE Dashboard System SHALL provide an API endpoint at `/api/dashboard/budget-by-district`
2. THE Dashboard System SHALL accept query parameters: province_id, program_id, and quarter
3. THE Dashboard System SHALL return a JSON array of objects containing: districtId, districtName, allocatedBudget, spentBudget, and utilizationPercentage
4. THE Dashboard System SHALL aggregate budget data from all facilities within each district
5. THE Dashboard System SHALL order results by allocatedBudget in descending order
6. THE Dashboard System SHALL apply user access control to filter districts based on user permissions

### Requirement 13: Budget by Facility API Endpoint

**User Story:** As a backend developer, I need an API endpoint for facility-level budget aggregation, so that the District tab bar chart can display facility comparisons.

#### Acceptance Criteria

1. THE Dashboard System SHALL provide an API endpoint at `/api/dashboard/budget-by-facility`
2. THE Dashboard System SHALL accept query parameters: district_id, program_id, and quarter
3. THE Dashboard System SHALL return a JSON array of objects containing: facilityId, facilityName, allocatedBudget, spentBudget, and utilizationPercentage
4. THE Dashboard System SHALL calculate allocatedBudget from planning data entries
5. THE Dashboard System SHALL calculate spentBudget from execution data entries
6. THE Dashboard System SHALL order results by allocatedBudget in descending order
7. THE Dashboard System SHALL apply user access control to filter facilities based on user permissions

### Requirement 14: Province-Level Approval Summary API Endpoint

**User Story:** As a backend developer, I need an API endpoint for province-level approval summaries, so that the Province tab table can display district approval statistics.

#### Acceptance Criteria

1. THE Dashboard System SHALL provide an API endpoint at `/api/dashboard/approved-budgets/province`
2. THE Dashboard System SHALL accept query parameters: province_id, program_id, and quarter
3. THE Dashboard System SHALL return a JSON array of objects containing: districtId, districtName, allocatedBudget, approvedCount, rejectedCount, and approvalRate
4. THE Dashboard System SHALL count budget plans with status "APPROVED" for approvedCount
5. THE Dashboard System SHALL count budget plans with status "REJECTED" for rejectedCount
6. THE Dashboard System SHALL calculate approvalRate as (approvedCount ÷ totalPlans × 100) rounded to two decimal places
7. THE Dashboard System SHALL apply user access control based on user permissions

### Requirement 15: District-Level Facility Approval API Endpoint

**User Story:** As a backend developer, I need an API endpoint for facility-level approval details, so that the District tab table can display detailed approval information.

#### Acceptance Criteria

1. THE Dashboard System SHALL provide an API endpoint at `/api/dashboard/approved-budgets/district`
2. THE Dashboard System SHALL accept query parameters: district_id, program_id, and quarter
3. THE Dashboard System SHALL return a JSON array of objects containing: facilityId, facilityName, allocatedBudget, approvalStatus, approvedBy, and approvedAt
4. THE Dashboard System SHALL retrieve approvalStatus from the budget plan's status field
5. THE Dashboard System SHALL retrieve approvedBy from the user who last updated the approval status
6. THE Dashboard System SHALL retrieve approvedAt as an ISO 8601 formatted timestamp
7. WHEN approvalStatus is "PENDING", THE Dashboard System SHALL return null for approvedBy and approvedAt
8. THE Dashboard System SHALL apply user access control based on user permissions

### Requirement 16: Responsive Dashboard Layout

**User Story:** As a mobile user, I want the dashboard to adapt to my screen size, so that I can view budget insights on any device.

#### Acceptance Criteria

1. THE Dashboard System SHALL display a responsive layout that adapts to screen widths from 320px to 2560px
2. WHEN screen width is less than 768px, THE Dashboard System SHALL stack summary cards vertically
3. WHEN screen width is less than 768px, THE Dashboard System SHALL display charts in full width
4. WHEN screen width is less than 768px, THE Dashboard System SHALL enable horizontal scrolling for tables
5. THE Dashboard System SHALL maintain readability of text and labels at all supported screen sizes

### Requirement 17: Dashboard Loading States

**User Story:** As a user, I want to see loading indicators while dashboard data is being fetched, so that I know the system is working.

#### Acceptance Criteria

1. WHEN dashboard data is being fetched, THE Dashboard System SHALL display skeleton loaders for summary cards
2. WHEN dashboard data is being fetched, THE Dashboard System SHALL display skeleton loaders for charts
3. WHEN dashboard data is being fetched, THE Dashboard System SHALL display skeleton loaders for tables
4. THE Dashboard System SHALL replace skeleton loaders with actual content within 3 seconds of data arrival
5. WHEN a filter is changed, THE Dashboard System SHALL display loading indicators only for affected components

### Requirement 18: Dashboard Error Handling

**User Story:** As a user, I want to see clear error messages when dashboard data fails to load, so that I understand what went wrong and can take action.

#### Acceptance Criteria

1. WHEN an API request fails with a network error, THE Dashboard System SHALL display an error message: "Unable to connect to the server. Please check your internet connection."
2. WHEN an API request fails with a 403 error, THE Dashboard System SHALL display an error message: "You do not have permission to view this data."
3. WHEN an API request fails with a 500 error, THE Dashboard System SHALL display an error message: "An error occurred while loading dashboard data. Please try again later."
4. THE Dashboard System SHALL provide a "Retry" button in error states
5. WHEN a user clicks the Retry button, THE Dashboard System SHALL re-fetch the failed data

### Requirement 19: Dashboard Data Refresh

**User Story:** As a user, I want the dashboard to refresh automatically, so that I always see the most current budget data.

#### Acceptance Criteria

1. THE Dashboard System SHALL automatically refresh dashboard data every 5 minutes
2. THE Dashboard System SHALL display a timestamp showing when data was last updated
3. THE Dashboard System SHALL provide a manual refresh button
4. WHEN a user clicks the manual refresh button, THE Dashboard System SHALL immediately re-fetch all dashboard data
5. THE Dashboard System SHALL display a subtle loading indicator during automatic refreshes

### Requirement 20: Legacy Endpoint Migration

**User Story:** As a system maintainer, I want to migrate the existing facility-overview endpoint to the new metrics endpoint, so that the codebase remains consistent and maintainable.

#### Acceptance Criteria

1. THE Dashboard System SHALL rename the endpoint `/api/dashboard/accountant/facility-overview` to `/api/dashboard/metrics`
2. THE Dashboard System SHALL update the endpoint to accept the new query parameter structure (level, district_id, province_id)
3. THE Dashboard System SHALL maintain backward compatibility by supporting the old facilityId parameter for 3 months
4. WHEN the old facilityId parameter is used, THE Dashboard System SHALL log a deprecation warning
5. THE Dashboard System SHALL update all client-side code to use the new endpoint structure
6. THE Dashboard System SHALL update API documentation to reflect the new endpoint structure
