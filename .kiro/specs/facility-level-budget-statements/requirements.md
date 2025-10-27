# Requirements Document

## Introduction

This feature extends the Budget vs Actual financial statement generation to support flexible aggregation levels. Currently, the system only generates district-wide consolidated statements by aggregating all health facilities within a district. This enhancement enables single-facility budget vs actual statements, allowing health center managers to view their own facility's budget performance, while maintaining backward compatibility with district-level aggregation.

## Glossary

- **Financial Statement System**: The server-side system responsible for generating standardized financial statements from planning and execution data
- **Budget vs Actual Statement**: A financial statement comparing planned budget (from planning data) against actual expenditure (from execution data)
- **Aggregation Level**: The organizational level at which financial data is consolidated (facility, district, or province)
- **Planning Data**: Budget allocation data stored with entityType='PLANNING' in schema_form_data_entries
- **Execution Data**: Actual expenditure data stored with entityType='EXECUTION' in schema_form_data_entries
- **Health Facility**: A health center or hospital that submits planning and execution data
- **District Accountant**: A user role with access to all facilities within their assigned district
- **Health Center Manager**: A user role with access to their own facility's data
- **Facility Breakdown**: Detailed per-facility budget and actual amounts shown within an aggregated statement

## Requirements

### Requirement 1: Support Multiple Aggregation Levels

**User Story:** As a system administrator, I want the Budget vs Actual statement generation to support multiple aggregation levels, so that different user roles can view appropriate levels of financial detail

#### Acceptance Criteria

1. WHEN THE Financial Statement System receives a statement generation request, THE Financial Statement System SHALL accept an optional aggregationLevel parameter with values 'FACILITY', 'DISTRICT', or 'PROVINCE'
2. WHEN aggregationLevel is not provided, THE Financial Statement System SHALL default to 'DISTRICT' aggregation to maintain backward compatibility
3. WHEN aggregationLevel is 'FACILITY', THE Financial Statement System SHALL generate a statement for a single facility
4. WHEN aggregationLevel is 'DISTRICT', THE Financial Statement System SHALL generate a consolidated statement for all accessible facilities in the district
5. WHEN aggregationLevel is 'PROVINCE', THE Financial Statement System SHALL generate a consolidated statement for all accessible facilities in the province

### Requirement 2: Single Facility Statement Generation

**User Story:** As a health center manager, I want to generate a Budget vs Actual statement for my facility only, so that I can track my facility's budget performance independently

#### Acceptance Criteria

1. WHEN a user requests a Budget vs Actual statement with aggregationLevel='FACILITY' and a valid facilityId, THE Financial Statement System SHALL collect planning data only from the specified facility
2. WHEN a user requests a Budget vs Actual statement with aggregationLevel='FACILITY' and a valid facilityId, THE Financial Statement System SHALL collect execution data only from the specified facility
3. WHEN aggregationLevel is 'FACILITY' and facilityId is not provided, THE Financial Statement System SHALL return an error with message "facilityId is required when aggregationLevel is FACILITY"
4. WHEN aggregationLevel is 'FACILITY', THE Financial Statement System SHALL calculate variance between the single facility's budget and actual amounts
5. WHEN aggregationLevel is 'FACILITY', THE Financial Statement System SHALL include facility identification metadata in the response

### Requirement 3: Access Control for Facility-Level Statements

**User Story:** As a district accountant, I want to generate Budget vs Actual statements for any facility in my district, so that I can review individual facility performance

#### Acceptance Criteria

1. WHEN a user requests a facility-level statement, THE Financial Statement System SHALL validate that the requested facilityId is in the user's accessibleFacilityIds list
2. IF the requested facilityId is not in the user's accessibleFacilityIds list, THEN THE Financial Statement System SHALL return a 403 Forbidden error with message "Access denied to facility"
3. WHEN a district accountant requests a facility-level statement for any facility in their district, THE Financial Statement System SHALL allow the request
4. WHEN a health center manager requests a facility-level statement for their own facility, THE Financial Statement System SHALL allow the request
5. WHEN a health center manager requests a facility-level statement for a different facility, THE Financial Statement System SHALL deny the request

### Requirement 4: Enhanced Response Metadata

**User Story:** As a frontend developer, I want the statement response to include aggregation metadata, so that I can display appropriate context to users

#### Acceptance Criteria

1. WHEN THE Financial Statement System generates a statement, THE Financial Statement System SHALL include an aggregationMetadata object in the response
2. WHEN aggregationLevel is 'FACILITY', THE Financial Statement System SHALL include facilityId, facilityName, and facilityType in aggregationMetadata
3. WHEN aggregationLevel is 'DISTRICT', THE Financial Statement System SHALL include districtId, districtName, and list of facilitiesIncluded in aggregationMetadata
4. WHEN aggregationLevel is 'PROVINCE', THE Financial Statement System SHALL include provinceId, provinceName, and list of facilitiesIncluded in aggregationMetadata
5. THE Financial Statement System SHALL include totalFacilities count in aggregationMetadata for all aggregation levels

### Requirement 5: Optional Facility Breakdown for Aggregated Statements

**User Story:** As a district accountant, I want to see per-facility budget and actual amounts within a district-level statement, so that I can identify which facilities are over or under budget

#### Acceptance Criteria

1. WHEN a user requests a statement with includeFacilityBreakdown=true, THE Financial Statement System SHALL include a facilityBreakdown array in the response
2. WHEN includeFacilityBreakdown is true and aggregationLevel is 'DISTRICT' or 'PROVINCE', THE Financial Statement System SHALL calculate budget, actual, and variance for each facility
3. WHEN includeFacilityBreakdown is true and aggregationLevel is 'FACILITY', THE Financial Statement System SHALL omit the facilityBreakdown array as it is redundant
4. THE Financial Statement System SHALL include facilityId, facilityName, budget, actual, variance, and variancePercentage for each facility in the breakdown
5. THE Financial Statement System SHALL sort facilities in the breakdown by variance percentage in descending order

### Requirement 6: Validation Rules for Facility-Level Statements

**User Story:** As a system administrator, I want facility-level statements to have appropriate validation rules, so that data quality issues are detected

#### Acceptance Criteria

1. WHEN generating a facility-level statement, THE Financial Statement System SHALL validate that the facility has planning data for the reporting period
2. WHEN generating a facility-level statement, THE Financial Statement System SHALL validate that the facility has execution data for the reporting period
3. IF a facility has planning data but no execution data, THEN THE Financial Statement System SHALL include a warning "Facility has budget but no actual expenditure recorded"
4. IF a facility has execution data but no planning data, THEN THE Financial Statement System SHALL include a warning "Facility has expenditure but no budget allocated"
5. WHEN a facility has neither planning nor execution data, THE Financial Statement System SHALL return an error "No data available for facility in the specified reporting period"

### Requirement 7: Backward Compatibility

**User Story:** As a system administrator, I want existing API clients to continue working without changes, so that the enhancement does not break existing integrations

#### Acceptance Criteria

1. WHEN an API request does not include aggregationLevel parameter, THE Financial Statement System SHALL default to district-level aggregation
2. WHEN an API request does not include facilityId parameter and aggregationLevel is not specified, THE Financial Statement System SHALL use the user's accessible facilities
3. THE Financial Statement System SHALL maintain the existing response structure for statements without the new optional fields
4. WHEN includeFacilityBreakdown is not provided, THE Financial Statement System SHALL default to false
5. THE Financial Statement System SHALL not require any changes to existing API clients to continue functioning

### Requirement 8: Performance Optimization for Facility Queries

**User Story:** As a system administrator, I want single-facility queries to be optimized, so that they execute faster than district-wide queries

#### Acceptance Criteria

1. WHEN aggregationLevel is 'FACILITY', THE Financial Statement System SHALL filter data collection to a single facility before aggregation
2. WHEN querying planning data for a single facility, THE Financial Statement System SHALL use the facility_id index on schema_form_data_entries
3. WHEN querying execution data for a single facility, THE Financial Statement System SHALL use the facility_id index on schema_form_data_entries
4. THE Financial Statement System SHALL complete single-facility statement generation in less than 50% of the time required for district-level aggregation
5. THE Financial Statement System SHALL log query execution time in the performance metadata
