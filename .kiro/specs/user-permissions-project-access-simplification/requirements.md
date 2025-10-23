# Requirements Document

## Introduction

This feature simplifies the user permissions and project access data structures to make them more client-friendly while maintaining their flexibility and scalability. Currently, these fields are stored as stringified JSON in text columns, which creates complexity for client applications when parsing and validating the data. The system will transition to using proper array structures that are easier to work with on both the frontend and backend, while keeping the underlying storage as arrays for clarity, scalability, and flexibility.

## Requirements

### Requirement 1: Simplified Permissions Array Structure

**User Story:** As a frontend developer, I want to work with permissions as a simple array of strings, so that I can easily check, add, or remove permissions without complex JSON parsing.

#### Acceptance Criteria

1. WHEN a user is created with permissions THEN the system SHALL accept permissions as an array of permission strings
2. WHEN permissions are stored THEN the system SHALL validate that each permission is a valid string
3. WHEN permissions are retrieved THEN the system SHALL return them as an array of strings
4. WHEN permissions are empty THEN the system SHALL return an empty array instead of null or undefined
5. WHEN invalid permission format is provided THEN the system SHALL return a clear validation error message

### Requirement 2: Simplified Project Access Array Structure

**User Story:** As a frontend developer, I want to work with project access as a simple array of project IDs, so that I can easily manage which projects a user can access without parsing JSON strings.

#### Acceptance Criteria

1. WHEN a user is created with project access THEN the system SHALL accept projectAccess as an array of project ID numbers
2. WHEN project access is stored THEN the system SHALL validate that each project ID is a valid number
3. WHEN project access is retrieved THEN the system SHALL return it as an array of numbers
4. WHEN project access is empty THEN the system SHALL return an empty array instead of null or undefined
5. WHEN invalid project access format is provided THEN the system SHALL return a clear validation error message

### Requirement 3: API Route Schema Validation

**User Story:** As a backend developer, I want the API routes to validate permissions and project access as arrays, so that invalid data is rejected before reaching the database.

#### Acceptance Criteria

1. WHEN the sign-up endpoint receives permissions THEN the system SHALL validate it as an array of strings
2. WHEN the sign-up endpoint receives projectAccess THEN the system SHALL validate it as an array of numbers
3. WHEN invalid permissions format is submitted THEN the system SHALL return a 400 error with message "Permissions must be an array of strings"
4. WHEN invalid project access format is submitted THEN the system SHALL return a 400 error with message "Project access must be an array of numbers"
5. WHEN permissions contain non-string values THEN the system SHALL reject the request with a validation error
6. WHEN project access contains non-numeric values THEN the system SHALL reject the request with a validation error

### Requirement 4: Database Schema Update

**User Story:** As a system, I need to store permissions and project access efficiently while supporting array operations, so that queries and updates are performant.

#### Acceptance Criteria

1. WHEN the database schema is updated THEN the system SHALL use JSONB columns for permissions and projectAccess
2. WHEN permissions are stored THEN the system SHALL store them as a JSON array in the database
3. WHEN project access is stored THEN the system SHALL store it as a JSON array in the database
4. WHEN querying users THEN the system SHALL support array operations on permissions and projectAccess
5. WHEN migrating existing data THEN the system SHALL convert text-based JSON strings to proper JSONB arrays

### Requirement 5: Backward Compatibility During Migration

**User Story:** As a system administrator, I want existing user records to be automatically migrated to the new format, so that no manual data conversion is required.

#### Acceptance Criteria

1. WHEN the migration runs THEN the system SHALL convert existing text-based permissions to JSONB arrays
2. WHEN the migration runs THEN the system SHALL convert existing text-based project access to JSONB arrays
3. WHEN existing data is null or empty THEN the system SHALL set it to an empty array
4. WHEN existing data is invalid JSON THEN the system SHALL log a warning and set it to an empty array
5. WHEN the migration completes THEN the system SHALL verify all records have been converted successfully

### Requirement 6: Type Safety in TypeScript

**User Story:** As a TypeScript developer, I want proper type definitions for permissions and project access, so that I get compile-time type checking and IDE autocomplete.

#### Acceptance Criteria

1. WHEN defining user types THEN the system SHALL type permissions as string[]
2. WHEN defining user types THEN the system SHALL type projectAccess as number[]
3. WHEN using permissions in code THEN the system SHALL provide type checking for array operations
4. WHEN using project access in code THEN the system SHALL provide type checking for numeric array operations
5. WHEN serializing user data THEN the system SHALL maintain type safety for permissions and projectAccess

### Requirement 7: Frontend Form Handling

**User Story:** As a frontend developer, I want to easily add or remove permissions and project access in forms, so that the user management interface is intuitive.

#### Acceptance Criteria

1. WHEN displaying permissions in a form THEN the system SHALL render them as a multi-select or tag input
2. WHEN displaying project access in a form THEN the system SHALL render it as a multi-select with project names
3. WHEN a user adds a permission THEN the system SHALL append it to the permissions array
4. WHEN a user removes a permission THEN the system SHALL remove it from the permissions array
5. WHEN submitting the form THEN the system SHALL send permissions and projectAccess as arrays in the request body

### Requirement 8: Permission Validation Rules

**User Story:** As a system administrator, I want to ensure only valid permissions can be assigned to users, so that the system maintains security and consistency.

#### Acceptance Criteria

1. WHEN permissions are provided THEN the system SHALL validate against a predefined list of valid permissions
2. WHEN an invalid permission is provided THEN the system SHALL return an error listing the invalid permission
3. WHEN permissions are empty THEN the system SHALL allow the user to be created with no permissions
4. WHEN duplicate permissions are provided THEN the system SHALL deduplicate them automatically
5. WHEN permissions are updated THEN the system SHALL validate the entire permissions array

### Requirement 9: Project Access Validation Rules

**User Story:** As a system administrator, I want to ensure only valid project IDs can be assigned to users, so that users cannot access non-existent projects.

#### Acceptance Criteria

1. WHEN project access is provided THEN the system SHALL validate that each project ID exists in the database
2. WHEN an invalid project ID is provided THEN the system SHALL return an error listing the invalid project ID
3. WHEN project access is empty THEN the system SHALL allow the user to be created with no project access
4. WHEN duplicate project IDs are provided THEN the system SHALL deduplicate them automatically
5. WHEN project access is updated THEN the system SHALL validate all project IDs exist

### Requirement 10: API Response Consistency

**User Story:** As a frontend developer, I want consistent API responses for permissions and project access, so that I can reliably parse and display user data.

#### Acceptance Criteria

1. WHEN retrieving a user THEN the system SHALL always return permissions as an array (never null or string)
2. WHEN retrieving a user THEN the system SHALL always return projectAccess as an array (never null or string)
3. WHEN a user has no permissions THEN the system SHALL return an empty array []
4. WHEN a user has no project access THEN the system SHALL return an empty array []
5. WHEN serializing user data THEN the system SHALL ensure arrays are properly formatted in JSON responses

### Requirement 11: Documentation and Examples

**User Story:** As a developer integrating with the API, I want clear documentation on how to use permissions and project access, so that I can implement features correctly.

#### Acceptance Criteria

1. WHEN accessing API documentation THEN the system SHALL show permissions as an array of strings in examples
2. WHEN accessing API documentation THEN the system SHALL show projectAccess as an array of numbers in examples
3. WHEN viewing request examples THEN the system SHALL include sample permissions arrays
4. WHEN viewing request examples THEN the system SHALL include sample projectAccess arrays
5. WHEN viewing response examples THEN the system SHALL show how permissions and projectAccess are returned
