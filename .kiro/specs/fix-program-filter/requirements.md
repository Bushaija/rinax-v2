# Requirements Document

## Introduction

The unified dashboard API currently accepts a `programId` parameter as a number, but the underlying data model uses `projectType` as a string enum ("HIV", "Malaria", "TB"). This mismatch causes filtering to fail because the code converts the numeric `programId` to a string and compares it against the enum values, which will never match. This specification addresses the semantic and functional issues with program filtering across the dashboard API.

## Glossary

- **Dashboard API**: The unified dashboard endpoint at `/api/dashboard` that fetches multiple dashboard components
- **Project Type**: An enum field on the projects table with values "HIV", "Malaria", "TB" representing health programs
- **Program Filter**: A query parameter that filters dashboard data by health program
- **Component**: A dashboard data module (metrics, programDistribution, budgetByDistrict, etc.)
- **Filter Interface**: TypeScript interfaces defining query parameters for dashboard requests

## Requirements

### Requirement 1

**User Story:** As a dashboard API consumer, I want to filter data by program type using the correct semantic parameter name, so that the API is intuitive and self-documenting

#### Acceptance Criteria

1. WHEN a client sends a request to the Dashboard API with a program filter, THE Dashboard API SHALL accept a query parameter named `projectType`
2. THE Dashboard API SHALL validate that the `projectType` parameter matches one of the enum values: "HIV", "Malaria", or "TB"
3. THE Dashboard API SHALL reject requests with invalid `projectType` values with HTTP 400 status code
4. THE Dashboard API SHALL include the `projectType` parameter in the OpenAPI route schema documentation
5. THE Dashboard API SHALL remove the deprecated `programId` parameter from the route schema

### Requirement 2

**User Story:** As a dashboard service developer, I want the filter interfaces to use correct types, so that type safety prevents runtime errors

#### Acceptance Criteria

1. THE DashboardFilters interface SHALL define `projectType` as an optional string field
2. THE DashboardFilters interface SHALL remove the `programId` field
3. THE AggregationFilters interface SHALL define `projectType` as an optional string field
4. THE AggregationFilters interface SHALL remove the `programId` field
5. WHERE TypeScript is used, THE Filter Interface SHALL enforce type checking at compile time

### Requirement 3

**User Story:** As a dashboard component handler, I want to filter data using the projectType string directly, so that filtering logic is correct and efficient

#### Acceptance Criteria

1. WHEN filtering planning entries by program, THE Component Handler SHALL compare `entry.project.projectType` against `filters.projectType` as strings
2. THE Component Handler SHALL NOT perform numeric-to-string conversions on the projectType filter value
3. WHEN the `projectType` filter is undefined, THE Component Handler SHALL return data for all project types
4. THE Component Handler SHALL apply the projectType filter consistently across all components (metrics, programDistribution, budgetByDistrict, budgetByFacility, provinceApprovals, districtApprovals)
5. THE Aggregation Service SHALL pass the `projectType` filter to all aggregation functions without type conversion

### Requirement 4

**User Story:** As a client-side developer, I want the React hook and TypeScript types to use projectType, so that the client API matches the server API

#### Acceptance Criteria

1. THE DashboardFilters client type SHALL define `projectType` as an optional string field
2. THE DashboardFilters client type SHALL remove the `programId` field
3. THE useDashboard hook SHALL include `projectType` in the query parameters when provided
4. THE useDashboard hook SHALL NOT send a `programId` parameter
5. THE Client Type SHALL match the server-side filter interface structure

### Requirement 5

**User Story:** As a test component developer, I want example usage to demonstrate correct projectType filtering, so that developers understand how to use the API

#### Acceptance Criteria

1. THE Test Component SHALL demonstrate filtering with `projectType: "HIV"`
2. THE Test Component SHALL demonstrate filtering with `projectType: "Malaria"`
3. THE Test Component SHALL demonstrate filtering with `projectType: "TB"`
4. THE Test Component SHALL demonstrate requests without projectType filter (all programs)
5. THE Test Component SHALL display the projectType value in the UI when a filter is active
