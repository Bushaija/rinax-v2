# Requirements Document

## Introduction

This feature implements district-based and facility-based access control for the planning and execution modules. The system will automatically filter API resources based on the authenticated user's facility assignment and district hierarchy. District hospital accountants can access data from their hospital and all health centers within their district, while health center users can only access their own facility's data. Admin users will retain access to all facilities.

## Requirements

### Requirement 1: District-Based Facility Filtering for List Operations

**User Story:** As a district hospital accountant, I want to see data from my hospital and all health centers in my district when listing planning or execution records, so that I can monitor and manage the entire district's activities.

#### Acceptance Criteria

1. WHEN a district hospital accountant requests a list of planning data THEN the system SHALL automatically filter results to include their hospital and all health centers in the same district
2. WHEN a health center user requests a list of planning data THEN the system SHALL automatically filter results by only their facilityId
3. WHEN a district hospital accountant requests a list of execution data THEN the system SHALL automatically filter results to include their hospital and all health centers in the same district
4. WHEN a health center user requests a list of execution data THEN the system SHALL automatically filter results by only their facilityId
5. WHEN an admin user requests a list of planning or execution data THEN the system SHALL return data from all facilities
6. IF a non-admin user provides a facilityId query parameter for a facility outside their district THEN the system SHALL return a 403 Forbidden error
7. IF a district hospital accountant provides a facilityId query parameter for a facility within their district THEN the system SHALL honor that parameter
8. IF an admin user provides a facilityId query parameter THEN the system SHALL honor that parameter

### Requirement 2: District-Based Access Control for Single Record Retrieval

**User Story:** As a district hospital accountant, I want to view individual planning or execution records from any facility in my district, so that I can review detailed information across my district.

#### Acceptance Criteria

1. WHEN a district hospital accountant requests a specific planning record by ID THEN the system SHALL verify the record belongs to a facility in their district
2. WHEN a health center user requests a specific planning record by ID THEN the system SHALL verify the record belongs to their facility
3. WHEN a district hospital accountant requests a specific execution record by ID THEN the system SHALL verify the record belongs to a facility in their district
4. WHEN a health center user requests a specific execution record by ID THEN the system SHALL verify the record belongs to their facility
5. IF a user attempts to access a record from a facility outside their district THEN the system SHALL return a 403 Forbidden error
6. WHEN an admin user requests any record THEN the system SHALL allow access regardless of facility or district

### Requirement 3: District-Based Facility Assignment for Create Operations

**User Story:** As a district hospital accountant, I want to create planning and execution records for any facility in my district, so that I can manage planning across all facilities under my supervision.

#### Acceptance Criteria

1. WHEN a district hospital accountant creates a planning record with a facilityId in their district THEN the system SHALL allow the creation
2. WHEN a health center user creates a planning record THEN the system SHALL automatically set the facilityId to their assigned facility
3. WHEN a district hospital accountant creates an execution record with a facilityId in their district THEN the system SHALL allow the creation
4. WHEN a health center user creates an execution record THEN the system SHALL automatically set the facilityId to their assigned facility
5. IF a district hospital accountant provides a facilityId outside their district THEN the system SHALL return a 403 Forbidden error
6. IF a health center user provides a different facilityId in the request body THEN the system SHALL override it with their assigned facilityId
7. WHEN an admin user creates a record THEN the system SHALL use the provided facilityId from the request body
8. IF an admin user doesn't provide a facilityId THEN the system SHALL return a validation error

### Requirement 4: District-Based Access Control for Update Operations

**User Story:** As a district hospital accountant, I want to update planning or execution records for any facility in my district, so that I can make corrections and adjustments across my district.

#### Acceptance Criteria

1. WHEN a district hospital accountant attempts to update a planning record from a facility in their district THEN the system SHALL allow the update
2. WHEN a health center user attempts to update a planning record THEN the system SHALL verify the record belongs to their facility before allowing the update
3. WHEN a district hospital accountant attempts to update an execution record from a facility in their district THEN the system SHALL allow the update
4. WHEN a health center user attempts to update an execution record THEN the system SHALL verify the record belongs to their facility before allowing the update
5. IF a user attempts to update a record from a facility outside their district THEN the system SHALL return a 403 Forbidden error
6. WHEN updating a record THEN the system SHALL prevent changing the facilityId field to a facility outside the user's district
7. WHEN an admin user updates any record THEN the system SHALL allow the update regardless of facility or district

### Requirement 5: District-Based Access Control for Delete Operations

**User Story:** As a district hospital accountant, I want to delete planning or execution records for any facility in my district, so that I can remove incorrect or duplicate entries across my district.

#### Acceptance Criteria

1. WHEN a district hospital accountant attempts to delete a planning record from a facility in their district THEN the system SHALL allow the deletion
2. WHEN a health center user attempts to delete a planning record THEN the system SHALL verify the record belongs to their facility before allowing deletion
3. WHEN a district hospital accountant attempts to delete an execution record from a facility in their district THEN the system SHALL allow the deletion
4. WHEN a health center user attempts to delete an execution record THEN the system SHALL verify the record belongs to their facility before allowing deletion
5. IF a user attempts to delete a record from a facility outside their district THEN the system SHALL return a 403 Forbidden error
6. WHEN an admin user deletes any record THEN the system SHALL allow the deletion regardless of facility or district

### Requirement 6: District Identification and Hierarchy

**User Story:** As a system, I need to identify which facilities belong to the same district, so that district-based access control can be enforced correctly.

#### Acceptance Criteria

1. WHEN a user's facility is loaded THEN the system SHALL retrieve the facility's district_id
2. WHEN determining accessible facilities for a district hospital user THEN the system SHALL query all facilities with the same district_id
3. WHEN determining accessible facilities for a health center user THEN the system SHALL only include their own facility
4. IF a facility does not have a district_id THEN the system SHALL treat it as an isolated facility with no district relationships
5. WHEN a user context is created THEN the system SHALL include district_id and accessible_facility_ids in the context
6. WHEN identifying a district hospital THEN the system SHALL use facility_type = 'hospital' as the indicator

### Requirement 7: Authentication Middleware Integration

**User Story:** As a system administrator, I want all planning and execution endpoints to require authentication, so that only authenticated users can access the API.

#### Acceptance Criteria

1. WHEN any planning or execution endpoint is called without authentication THEN the system SHALL return a 401 Unauthorized error
2. WHEN a user's session is invalid or expired THEN the system SHALL return a 401 Unauthorized error
3. WHEN a user's account is deactivated THEN the system SHALL return a 403 Forbidden error
4. WHEN authentication succeeds THEN the system SHALL make the user object with district context available in the request context

### Requirement 8: User Context Tracking

**User Story:** As a system administrator, I want to track which user created and updated each record, so that we have an audit trail.

#### Acceptance Criteria

1. WHEN a user creates a planning or execution record THEN the system SHALL set the createdBy field to the user's ID
2. WHEN a user updates a planning or execution record THEN the system SHALL set the updatedBy field to the user's ID
3. IF the user context is not available THEN the system SHALL set these fields to null rather than failing
4. WHEN retrieving records THEN the system SHALL include creator information in the response

### Requirement 9: Admin Override Capabilities

**User Story:** As an admin user, I want to access and manage data from any facility, so that I can perform system-wide administration tasks.

#### Acceptance Criteria

1. WHEN an admin user is identified by role 'admin' or 'superadmin' THEN the system SHALL bypass facility and district filtering
2. WHEN an admin creates a record THEN the system SHALL require an explicit facilityId in the request
3. WHEN an admin updates a record THEN the system SHALL allow changing any field including facilityId
4. WHEN an admin lists records THEN the system SHALL return data from all facilities unless a specific facilityId filter is provided

### Requirement 10: Error Handling and User Feedback

**User Story:** As a user, I want clear error messages when I'm denied access to resources, so that I understand why my request failed.

#### Acceptance Criteria

1. WHEN a user is denied access due to facility or district mismatch THEN the system SHALL return a 403 status with message "Access denied to this facility's data"
2. WHEN a user is not authenticated THEN the system SHALL return a 401 status with message "Authentication required"
3. WHEN a user's account is inactive THEN the system SHALL return a 403 status with message "Account is deactivated"
4. WHEN validation fails THEN the system SHALL return detailed error information including field names and error codes
5. WHEN a district hospital accountant attempts to access a facility outside their district THEN the system SHALL return a 403 status with message "Access denied: facility not in your district"

### Requirement 11: Backward Compatibility

**User Story:** As a developer, I want the district-based filtering to work with existing query parameters and filters, so that existing API consumers continue to work.

#### Acceptance Criteria

1. WHEN existing query parameters (projectType, reportingPeriod, etc.) are provided THEN the system SHALL apply them in addition to district-based facility filtering
2. WHEN pagination parameters are provided THEN the system SHALL apply pagination after district-based facility filtering
3. WHEN the API response format changes THEN the system SHALL maintain backward compatibility with existing consumers
4. IF a facilityId query parameter conflicts with user's accessible facilities THEN the system SHALL return a 403 error with clear messaging
5. WHEN a health center user's behavior is unchanged THEN the system SHALL continue to filter by their single facility as before
