# Requirements Document

## Introduction

This specification defines a unified dashboard API that consolidates multiple dashboard endpoints into a single, composable endpoint. The System addresses critical pain points in the current implementation: filter synchronization issues, loading state chaos, error handling complexity, filter state duplication, and performance overhead from multiple round trips. The new architecture provides a modular, role-aware dashboard API that supports parallel data fetching while maintaining consistent state management.

## Glossary

- **Dashboard System**: The unified API endpoint and service layer that provides dashboard data
- **Component**: A discrete data module (e.g., metrics, programDistribution, approvals) that can be requested independently
- **Scope**: The organizational level at which data is aggregated (country, province, district, facility)
- **Filter Context**: The set of parameters (program, period, scope) that determine what data is returned
- **Role-Based Access Control (RBAC)**: Security mechanism that restricts data access based on user role and organizational assignment
- **Parallel Execution**: Simultaneous processing of multiple component requests within a single API call
- **Error Isolation**: Pattern where failure of one component does not prevent other components from returning data
- **User Context**: The authenticated user's role, facility assignment, and access permissions

## Requirements

### Requirement 1: Unified Dashboard Endpoint

**User Story:** As a frontend developer, I want a single dashboard endpoint that can serve multiple components, so that I can eliminate redundant API calls and synchronize filters across all dashboard widgets.

#### Acceptance Criteria

1. THE Dashboard System SHALL expose a single GET endpoint at `/api/dashboard`
2. WHEN a client requests dashboard data, THE Dashboard System SHALL accept a `components` query parameter containing a comma-separated list of component names
3. THE Dashboard System SHALL return a JSON object where each key corresponds to a requested component name and each value contains the component's data
4. WHEN multiple components are requested, THE Dashboard System SHALL execute all component queries in parallel
5. THE Dashboard System SHALL complete all component requests within a single HTTP round trip

### Requirement 2: Component-Based Data Fetching

**User Story:** As a dashboard user, I want to load only the data I need for visible widgets, so that the dashboard loads faster and uses less bandwidth.

#### Acceptance Criteria

1. THE Dashboard System SHALL support the following component types: `metrics`, `programDistribution`, `budgetByDistrict`, `budgetByFacility`, `provinceApprovals`, `districtApprovals`, `tasks`
2. WHEN a component is not requested, THE Dashboard System SHALL NOT execute queries for that component
3. WHEN a component is requested, THE Dashboard System SHALL return data in the same format as the legacy endpoint for that component
4. THE Dashboard System SHALL allow clients to request any combination of components in a single call
5. WHEN an unknown component is requested, THE Dashboard System SHALL return an error object for that component without failing other components

### Requirement 3: Unified Filter Management

**User Story:** As a dashboard user, I want to apply filters (program, period, scope) once and have them affect all dashboard components, so that I see consistent data across all widgets.

#### Acceptance Criteria

1. THE Dashboard System SHALL accept the following filter parameters: `scope`, `scopeId`, `programId`, `periodId`, `quarter`
2. WHEN filter parameters are provided, THE Dashboard System SHALL apply them to all requested components
3. THE Dashboard System SHALL validate that `scopeId` is provided when `scope` is specified
4. THE Dashboard System SHALL validate that `scope` is one of: `country`, `province`, `district`, `facility`
5. WHEN `quarter` is provided, THE Dashboard System SHALL validate it is between 1 and 4

### Requirement 4: Role-Based Data Scoping

**User Story:** As a system administrator, I want users to only see data they have permission to access based on their role and organizational assignment, so that data security is maintained.

#### Acceptance Criteria

1. WHEN a user with role `national_admin` requests dashboard data, THE Dashboard System SHALL allow access to all provinces, districts, and facilities
2. WHEN a user with role `provincial_accountant` requests dashboard data, THE Dashboard System SHALL restrict access to their assigned province and all districts and facilities within it
3. WHEN a user with role `district_accountant` requests dashboard data, THE Dashboard System SHALL restrict access to their assigned district and all facilities within it
4. WHEN a user with role `hospital_accountant` requests dashboard data, THE Dashboard System SHALL restrict access to their assigned hospital and all health centers under that hospital
5. WHEN a user requests data outside their permitted scope, THE Dashboard System SHALL return a 403 Forbidden error

### Requirement 5: Error Isolation

**User Story:** As a dashboard user, I want to see available data even when some components fail to load, so that I can still use the dashboard productively.

#### Acceptance Criteria

1. WHEN one component query fails, THE Dashboard System SHALL continue processing other component queries
2. WHEN a component query fails, THE Dashboard System SHALL return an error object for that component containing `error: true` and a `message` field
3. WHEN a component query succeeds, THE Dashboard System SHALL return the component's data in the expected format
4. THE Dashboard System SHALL return HTTP 200 status even when some components fail, as long as the request itself is valid
5. WHEN all components fail, THE Dashboard System SHALL return HTTP 200 with error objects for each component

### Requirement 6: Performance Optimization

**User Story:** As a dashboard user, I want the dashboard to load quickly, so that I can access insights without waiting.

#### Acceptance Criteria

1. THE Dashboard System SHALL execute all component queries in parallel using Promise.all
2. THE Dashboard System SHALL complete all queries within 3 seconds for typical datasets (up to 100 facilities)
3. THE Dashboard System SHALL reuse database connections across component queries within a single request
4. THE Dashboard System SHALL apply filters at the database query level rather than in application code
5. THE Dashboard System SHALL return cached reporting period data when the same period is requested multiple times in a single call

### Requirement 7: Backward Compatibility

**User Story:** As a system maintainer, I want existing dashboard endpoints to continue working during the migration period, so that we can migrate clients gradually without breaking changes.

#### Acceptance Criteria

1. THE Dashboard System SHALL maintain all existing dashboard endpoints (`/api/dashboard/metrics`, `/api/dashboard/program-distribution`, etc.) during the migration period
2. WHEN legacy endpoints are called, THE Dashboard System SHALL add deprecation headers: `X-Deprecated: true`, `X-Deprecation-Message`, `X-Deprecation-Date`
3. THE Dashboard System SHALL return identical data formats from legacy endpoints as before the unified API implementation
4. THE Dashboard System SHALL log usage of legacy endpoints for migration tracking
5. WHEN the unified endpoint is used, THE Dashboard System SHALL NOT add deprecation headers

### Requirement 8: Consistent Loading States

**User Story:** As a frontend developer, I want a single loading state for the entire dashboard, so that I can show a consistent loading experience to users.

#### Acceptance Criteria

1. THE Dashboard System SHALL return all requested component data in a single response
2. WHEN the unified endpoint is called, THE Dashboard System SHALL NOT return partial responses or streaming data
3. THE Dashboard System SHALL complete all component queries before sending the response
4. WHEN using the unified endpoint, THE Client Application SHALL display a single loading indicator for all components
5. WHEN all data is loaded, THE Client Application SHALL render all components simultaneously

### Requirement 9: Filter State Centralization

**User Story:** As a frontend developer, I want to manage filter state in one place, so that I don't have to synchronize filters across multiple hooks and components.

#### Acceptance Criteria

1. THE Client Application SHALL provide a single `useDashboard` hook that manages all filter state
2. WHEN filters change, THE Client Application SHALL make a single API call with updated filters
3. THE Client Application SHALL NOT duplicate filter state across multiple hooks or components
4. WHEN the dashboard mounts, THE Client Application SHALL initialize filters from URL query parameters or user preferences
5. WHEN filters change, THE Client Application SHALL update URL query parameters to maintain shareable links

### Requirement 10: Scope-Aware Component Behavior

**User Story:** As a dashboard user, I want to see components that are relevant to my current scope, so that I don't see irrelevant or empty data.

#### Acceptance Criteria

1. WHEN scope is `country`, THE Dashboard System SHALL return province-level aggregations for `budgetByDistrict` component
2. WHEN scope is `province`, THE Dashboard System SHALL return district-level aggregations for `budgetByDistrict` component
3. WHEN scope is `district`, THE Dashboard System SHALL return facility-level aggregations for `budgetByFacility` component
4. WHEN scope is `facility`, THE Dashboard System SHALL return project-level breakdowns for `metrics` component
5. THE Dashboard System SHALL return empty arrays for components that are not applicable to the current scope rather than errors
