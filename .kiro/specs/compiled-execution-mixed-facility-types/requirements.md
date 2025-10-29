# Requirements Document

## Introduction

The compiled execution endpoint currently fails to display data correctly when multiple facility types (hospitals and health centers) are present in the same report. This occurs because the endpoint loads a single activity catalog based on the first facility's type, causing mismatches when aggregating data from facilities with different activity structures. This feature will enable the endpoint to handle mixed facility types by loading multiple activity catalogs and matching each facility's data to its appropriate catalog.

## Glossary

- **Compiled Execution Endpoint**: The API endpoint that aggregates execution data across multiple facilities and presents it in a tabular format
- **Activity Catalog**: The set of financial activity definitions (receipts, expenditures, assets, liabilities) specific to a facility type and project type
- **Facility Type**: The classification of a facility as either 'hospital' or 'health_center'
- **Project Type**: The program classification (HIV, Malaria, TB)
- **Activity Code**: A unique identifier for a financial activity (e.g., HIV_EXEC_HOSPITAL_A_1, HIV_EXEC_HEALTH_CENTER_A_1)
- **Aggregation Service**: The service responsible for summing financial values across facilities
- **Execution Entry**: A record of quarterly financial execution data for a specific facility

## Requirements

### Requirement 1: Multi-Catalog Loading

**User Story:** As a district accountant, I want to view execution data from both hospitals and health centers in a single compiled report, so that I can see the complete financial picture of my district.

#### Acceptance Criteria

1. WHEN THE Compiled Execution Endpoint receives a request with multiple facility types, THE System SHALL load activity catalogs for all unique facility types present in the execution data
2. WHEN loading activity catalogs, THE System SHALL filter each catalog by the appropriate facility type, project type, and module type ('execution')
3. WHEN multiple facility types exist, THE System SHALL create a mapping structure that associates each facility ID with its corresponding activity catalog
4. WHEN no execution data exists for a facility type, THE System SHALL NOT load an activity catalog for that facility type
5. WHEN activity catalog loading fails for any facility type, THE System SHALL return an error response with details about which facility type failed

### Requirement 2: Facility-Specific Activity Matching

**User Story:** As a system, I need to match each facility's execution data to its correct activity catalog, so that hospital activities are not matched against health center catalogs and vice versa.

#### Acceptance Criteria

1. WHEN aggregating execution data, THE System SHALL identify each facility's facility type from the execution entry
2. WHEN processing a facility's data, THE System SHALL retrieve the activity catalog corresponding to that facility's type
3. WHEN an activity code exists in the facility's data, THE System SHALL look up the activity definition in the facility-type-specific catalog
4. WHEN an activity code is not found in the appropriate catalog, THE System SHALL log a warning and treat the activity value as zero
5. WHEN aggregating values, THE System SHALL only sum values from activities that exist in the unified activity structure

### Requirement 3: Unified Activity Structure

**User Story:** As a frontend developer, I want the API response to contain a unified activity structure that represents all activities from all facility types, so that I can display a consistent table structure.

#### Acceptance Criteria

1. WHEN building the response structure, THE System SHALL create a unified activity hierarchy that includes activities from all facility types
2. WHEN an activity exists in only one facility type's catalog, THE System SHALL include it in the unified structure with zero values for facilities of other types
3. WHEN activities from different facility types have the same category and subcategory, THE System SHALL group them together in the unified structure
4. WHEN activities have different names but serve the same purpose, THE System SHALL keep them as separate line items with their original names
5. WHEN building the hierarchical structure, THE System SHALL maintain proper ordering by display order within each section and subcategory

### Requirement 4: Aggregation Logic Enhancement

**User Story:** As a system, I need to aggregate financial values correctly across mixed facility types, so that totals and computed values are accurate.

#### Acceptance Criteria

1. WHEN aggregating activity values, THE System SHALL sum values only from activities that match the unified activity code
2. WHEN calculating section totals (A, B, D, E, G), THE System SHALL sum all child activity values for each facility using its facility-type-specific catalog
3. WHEN calculating computed values (C = A - B, F = D - E), THE System SHALL use the aggregated section totals
4. WHEN a facility has no data for a specific activity, THE System SHALL treat the value as zero in aggregations
5. WHEN building facility totals, THE System SHALL sum all section totals for each facility regardless of facility type

### Requirement 5: Backward Compatibility

**User Story:** As a system administrator, I want the fix to maintain backward compatibility with existing single-facility-type queries, so that current functionality is not broken.

#### Acceptance Criteria

1. WHEN a facilityType filter is provided in the query, THE System SHALL load only the activity catalog for that facility type
2. WHEN all facilities in the result set have the same facility type, THE System SHALL produce the same response structure as before the fix
3. WHEN the endpoint is called with existing query parameters, THE System SHALL return responses in the same format as before
4. WHEN no execution data exists, THE System SHALL return an empty response structure as before
5. WHEN errors occur, THE System SHALL return error responses in the same format as before

### Requirement 6: Performance Optimization

**User Story:** As a system, I need to load activity catalogs efficiently, so that response times remain acceptable even with multiple facility types.

#### Acceptance Criteria

1. WHEN loading multiple activity catalogs, THE System SHALL execute database queries in parallel where possible
2. WHEN the same facility type appears multiple times, THE System SHALL load the activity catalog only once and reuse it
3. WHEN building the unified structure, THE System SHALL use efficient data structures to minimize memory usage
4. WHEN aggregating values, THE System SHALL process facilities in a single pass through the data
5. WHEN the number of facilities exceeds 100, THE System SHALL include a performance warning in the response metadata

### Requirement 7: Error Handling and Logging

**User Story:** As a developer, I want clear error messages and logs when activity matching fails, so that I can diagnose and fix data issues.

#### Acceptance Criteria

1. WHEN an activity code in execution data does not match any catalog, THE System SHALL log a warning with the facility ID, activity code, and facility type
2. WHEN activity catalog loading fails, THE System SHALL log the error with the facility type and project type that failed
3. WHEN aggregation produces unexpected results, THE System SHALL log details about the mismatch
4. WHEN multiple facility types are detected, THE System SHALL log the facility types being processed for audit purposes
5. WHEN the unified structure is built, THE System SHALL log the total number of activities included from each facility type
