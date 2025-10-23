# Requirements Document

## Introduction

The accounting team has requested a refactoring of the planning activities data structure in the seed file. The current structure uses a hierarchical `PROGRAM_CONFIGURATIONS` array with nested categories and activities. The new structure should use a flat `programActivities` object organized by program type, with each activity explicitly specifying its facility type and category code. This refactoring aims to simplify the data structure while maintaining all existing functionality and ensuring backward compatibility with the database seeding process.

## Requirements

### Requirement 1: Data Structure Migration

**User Story:** As a developer, I want to replace the `PROGRAM_CONFIGURATIONS` structure with the new `programActivities` format, so that the data structure aligns with the accounting team's requirements while maintaining all existing functionality.

#### Acceptance Criteria

1. WHEN the seed file is updated THEN the `PROGRAM_CONFIGURATIONS` constant SHALL be replaced with the new `programActivities` structure
2. WHEN the new structure is implemented THEN it SHALL include all three programs (HIV, MAL/Malaria, TB) with their respective activities
3. WHEN activities are defined THEN each activity SHALL explicitly specify `facilityType`, `categoryCode`, `name`, and `displayOrder`
4. WHEN the new structure is used THEN the `categoryDisplayNames` mapping SHALL be included to provide category metadata

### Requirement 2: Maintain Existing Functionality

**User Story:** As a system administrator, I want the database seeding process to continue working without errors after the refactoring, so that existing functionality is not disrupted.

#### Acceptance Criteria

1. WHEN the seeding functions are executed THEN they SHALL successfully create form schemas for all program-facility combinations
2. WHEN categories are seeded THEN they SHALL use the `categoryDisplayNames` mapping to retrieve category names and descriptions
3. WHEN activities are seeded THEN they SHALL be correctly associated with their categories based on `categoryCode` and `facilityType`
4. WHEN the seed process completes THEN the database SHALL contain the same number and types of records as before the refactoring

### Requirement 3: Data Integrity and Validation

**User Story:** As a data administrator, I want to ensure that all activity data is correctly mapped and no data is lost during the migration, so that the system continues to function correctly.

#### Acceptance Criteria

1. WHEN activities are processed THEN each activity SHALL be correctly mapped to its corresponding category
2. WHEN facility-specific activities are created THEN they SHALL only be associated with the appropriate facility type
3. WHEN activities have special properties (isAnnualOnly) THEN these properties SHALL be preserved in the new structure
4. WHEN the migration is complete THEN all activity names, display orders, and metadata SHALL match the original configuration

### Requirement 4: Code Maintainability

**User Story:** As a developer, I want the refactored code to be clear and maintainable, so that future updates to planning activities are straightforward.

#### Acceptance Criteria

1. WHEN the new structure is implemented THEN it SHALL include clear comments indicating program boundaries
2. WHEN category codes are used THEN they SHALL be consistent across the `programActivities` and `categoryDisplayNames` structures
3. WHEN the code is reviewed THEN the relationship between activities, categories, and facility types SHALL be immediately apparent
4. WHEN new activities need to be added THEN the flat structure SHALL make it easy to add them without complex nesting

### Requirement 5: Type Safety and Interface Compatibility

**User Story:** As a developer, I want to ensure that the new data structure is compatible with existing TypeScript interfaces, so that type checking continues to work correctly.

#### Acceptance Criteria

1. WHEN the new structure is defined THEN it SHALL use a TypeScript interface that matches the expected `PlanningActivityData` type
2. WHEN the seeding functions access the data THEN they SHALL be updated to work with the new flat structure
3. WHEN TypeScript compilation occurs THEN there SHALL be no type errors related to the data structure change
4. WHEN the code is executed THEN runtime errors related to missing or incorrect properties SHALL not occur
