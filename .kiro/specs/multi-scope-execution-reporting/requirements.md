# Requirements Document

## Introduction

The Multi-Scope Execution Reporting feature extends the existing compiled execution aggregation to support hierarchical reporting at district, provincial, and country levels. This enables different user roles to view aggregated financial execution data at appropriate organizational levels, with accountants viewing district-level data and administrators accessing provincial or country-wide reports.

## Glossary

- **System**: The Multi-Scope Execution Reporting module
- **Scope**: The organizational level at which data is aggregated (district, provincial, or country)
- **District Scope**: Aggregation of all facilities (hospitals and child health centers) within one or more districts
- **Provincial Scope**: Aggregation of all district hospitals and their child health centers within a province
- **Country Scope**: Aggregation of all hospitals and health centers across all provinces
- **Accountant**: User role with access to district-level data only
- **Administrator**: User role with access to provincial and country-level data
- **Parent Facility**: A hospital that has child health centers reporting to it
- **Child Facility**: A health center that reports to a parent hospital

## Requirements

### Requirement 1

**User Story:** As an accountant, I want to view compiled execution reports at the district scope, so that I can analyze financial performance across all facilities in my assigned district(s).

#### Acceptance Criteria

1. WHEN an accountant requests a compiled report with scope "district", THE System SHALL return aggregated data for all facilities within the accountant's assigned district(s)
2. WHEN an accountant requests a compiled report with scope "district", THE System SHALL include both hospitals and their child health centers in the aggregation
3. WHEN an accountant attempts to access a district outside their assignment, THE System SHALL return a 403 Forbidden response with an appropriate error message
4. WHEN an accountant does not specify a scope parameter, THE System SHALL default to district scope
5. WHEN an accountant specifies a districtId parameter, THE System SHALL validate that the district belongs to their assigned districts

### Requirement 2

**User Story:** As an administrator, I want to view compiled execution reports at the provincial scope, so that I can analyze financial performance across all district hospitals and their child facilities within a province.

#### Acceptance Criteria

1. WHEN an administrator requests a compiled report with scope "provincial", THE System SHALL return aggregated data for all district hospitals and their child health centers within the specified province
2. WHEN an administrator requests provincial scope without specifying a province, THE System SHALL return a 400 Bad Request response indicating that provinceId is required
3. WHEN an administrator specifies a provinceId parameter with provincial scope, THE System SHALL filter facilities to only those within the specified province
4. WHEN aggregating provincial data, THE System SHALL include all facilities where the parent hospital belongs to the specified province
5. WHEN no facilities exist in the specified province, THE System SHALL return a 200 OK response with empty data and an explanatory message

### Requirement 3

**User Story:** As an administrator, I want to view compiled execution reports at the country scope, so that I can analyze overall financial performance across all provinces and facilities nationwide.

#### Acceptance Criteria

1. WHEN an administrator requests a compiled report with scope "country", THE System SHALL return aggregated data for all hospitals and health centers across all provinces
2. WHEN an administrator requests country scope, THE System SHALL not require any geographic filter parameters
3. WHEN aggregating country-level data, THE System SHALL include all active facilities regardless of province or district
4. WHEN processing country scope requests, THE System SHALL complete the request within 60 seconds for datasets up to 500 facilities
5. WHEN country scope returns more than 100 facilities, THE System SHALL include a warning in the response metadata about potential performance considerations

### Requirement 4

**User Story:** As a system administrator, I want scope-based access control to be enforced based on user roles, so that users can only access data at appropriate organizational levels.

#### Acceptance Criteria

1. WHEN an accountant requests provincial or country scope, THE System SHALL return a 403 Forbidden response indicating insufficient permissions
2. WHEN an administrator requests any scope (district, provincial, or country), THE System SHALL allow the request to proceed
3. WHEN validating scope access, THE System SHALL check the user's role and permissions before executing the data query
4. WHEN a user has admin access, THE System SHALL allow them to specify any districtId regardless of their assigned district
5. WHEN a user lacks admin access, THE System SHALL restrict districtId parameters to their assigned districts only

### Requirement 5

**User Story:** As a frontend developer, I want the API response to include scope metadata, so that I can display appropriate context and labels in the user interface.

#### Acceptance Criteria

1. WHEN returning a compiled report, THE System SHALL include the requested scope in the response metadata
2. WHEN returning provincial scope data, THE System SHALL include the province name and ID in the response metadata
3. WHEN returning district scope data, THE System SHALL include the district name(s) and ID(s) in the response metadata
4. WHEN returning country scope data, THE System SHALL include the total number of provinces and districts in the response metadata
5. WHEN facilities span multiple geographic areas, THE System SHALL provide a breakdown of facility counts by province and district in the metadata

### Requirement 6

**User Story:** As a database administrator, I want the facility filtering logic to use efficient queries with proper indexing, so that multi-scope reports perform well even with large datasets.

#### Acceptance Criteria

1. WHEN executing district scope queries, THE System SHALL use indexed lookups on facilities.districtId
2. WHEN executing provincial scope queries, THE System SHALL use indexed lookups on districts.provinceId and facilities.parentFacilityId
3. WHEN executing country scope queries, THE System SHALL use indexed lookups on facilities.isActive
4. WHEN building facility filters, THE System SHALL construct WHERE clauses that leverage database indexes
5. WHEN query execution exceeds 30 seconds for district or provincial scope, THE System SHALL log a performance warning with query details

### Requirement 7

**User Story:** As a financial analyst, I want to combine scope parameters with existing filters (project type, facility type, reporting period), so that I can analyze specific programs at different organizational levels.

#### Acceptance Criteria

1. WHEN I specify both scope and projectType parameters, THE System SHALL apply both filters using AND logic
2. WHEN I specify both scope and facilityType parameters, THE System SHALL apply both filters using AND logic
3. WHEN I specify both scope and reportingPeriodId parameters, THE System SHALL apply both filters using AND logic
4. WHEN multiple filters are applied, THE System SHALL first filter by scope, then apply additional filters to the scoped dataset
5. WHEN filters result in no matching facilities, THE System SHALL return a 200 OK response with empty data and filter details in metadata

### Requirement 8

**User Story:** As a system architect, I want the scope implementation to be extensible, so that additional scope levels (e.g., regional, zone) can be added in the future without major refactoring.

#### Acceptance Criteria

1. WHEN implementing scope filtering logic, THE System SHALL use a strategy pattern that allows new scope types to be added
2. WHEN validating scope parameters, THE System SHALL use an enum or type definition that can be extended
3. WHEN building facility filters for a scope, THE System SHALL delegate to scope-specific filter builders
4. WHEN new scope types are added, THE System SHALL require minimal changes to the main handler logic
5. WHEN scope logic is modified, THE System SHALL maintain backward compatibility with existing API consumers
