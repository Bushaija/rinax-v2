# Requirements Document

## Introduction

This feature enhances the user registration and update interface by replacing the manual facility ID input field with a searchable facility name selector. The system will allow administrators to select facilities by name (with district context) rather than requiring them to know and enter numeric facility IDs. This improves usability and reduces errors when assigning users to facilities.

## Requirements

### Requirement 1: Facility Name Selection for User Registration

**User Story:** As an admin, I want to select a facility by name when registering a new user, so that I don't need to remember or look up facility IDs.

#### Acceptance Criteria

1. WHEN an admin opens the user registration form THEN the system SHALL display a searchable facility selector instead of a numeric facility ID input
2. WHEN the facility selector is opened THEN the system SHALL load and display all available facilities with their names and districts
3. WHEN an admin types in the facility selector THEN the system SHALL filter facilities by name in real-time
4. WHEN an admin selects a facility from the list THEN the system SHALL store the facility's ID for the user record
5. WHEN the form is submitted THEN the system SHALL validate that a facility has been selected
6. IF no facility is selected THEN the system SHALL display a validation error "Facility is required"

### Requirement 2: Facility Name Display with District Context

**User Story:** As an admin, I want to see both the facility name and district when selecting facilities, so that I can distinguish between facilities with similar names in different districts.

#### Acceptance Criteria

1. WHEN facilities are displayed in the selector THEN the system SHALL show the facility name as the primary text
2. WHEN facilities are displayed in the selector THEN the system SHALL show the district name as secondary text
3. WHEN multiple facilities have the same name THEN the system SHALL clearly distinguish them by their district
4. WHEN facilities are listed THEN the system SHALL group or sort them by district for easier navigation
5. WHEN a facility is selected THEN the system SHALL display both facility name and district in the selected value display

### Requirement 3: Facility Type Indication

**User Story:** As an admin, I want to see whether a facility is a district hospital or health center when selecting, so that I can assign users to the appropriate facility type.

#### Acceptance Criteria

1. WHEN facilities are displayed in the selector THEN the system SHALL indicate the facility type (Hospital or Health Center)
2. WHEN displaying facility type THEN the system SHALL use clear visual indicators (icons, badges, or labels)
3. WHEN filtering facilities THEN the system SHALL allow filtering by facility type
4. WHEN a district hospital is displayed THEN the system SHALL visually distinguish it from health centers

### Requirement 4: Facility Name Selection for User Updates

**User Story:** As an admin, I want to update a user's facility assignment using the facility name selector, so that I can easily reassign users to different facilities.

#### Acceptance Criteria

1. WHEN an admin opens the user update form THEN the system SHALL display the current facility name (not ID) in the selector
2. WHEN the current facility is displayed THEN the system SHALL show both the facility name and district
3. WHEN an admin changes the facility selection THEN the system SHALL update the facilityId in the user record
4. WHEN the update form is submitted THEN the system SHALL validate that a facility is selected
5. WHEN the facility is changed THEN the system SHALL preserve the change in the database

### Requirement 5: Facility Data Loading and Caching

**User Story:** As a system, I need to efficiently load facility data for the selector, so that the user interface remains responsive.

#### Acceptance Criteria

1. WHEN the user form is opened THEN the system SHALL fetch the list of facilities from the API
2. WHEN facilities are loaded THEN the system SHALL include facility ID, name, district name, and facility type
3. WHEN facilities are fetched THEN the system SHALL cache the results for the duration of the form session
4. IF the facility fetch fails THEN the system SHALL display an error message and allow retry
5. WHEN facilities are loading THEN the system SHALL display a loading indicator in the selector

### Requirement 6: Search and Filter Functionality

**User Story:** As an admin, I want to quickly search for facilities by name or district, so that I can find the right facility without scrolling through a long list.

#### Acceptance Criteria

1. WHEN an admin types in the search field THEN the system SHALL filter facilities by matching facility name
2. WHEN an admin types in the search field THEN the system SHALL also match against district name
3. WHEN search text is entered THEN the system SHALL perform case-insensitive matching
4. WHEN search results are displayed THEN the system SHALL highlight the matching text
5. WHEN no facilities match the search THEN the system SHALL display "No facilities found"
6. WHEN the search field is cleared THEN the system SHALL show all facilities again

### Requirement 7: Accessibility and Keyboard Navigation

**User Story:** As an admin using keyboard navigation, I want to select facilities without using a mouse, so that I can work efficiently.

#### Acceptance Criteria

1. WHEN the facility selector receives focus THEN the system SHALL allow keyboard navigation with arrow keys
2. WHEN an admin presses Enter on a facility THEN the system SHALL select that facility
3. WHEN an admin presses Escape THEN the system SHALL close the selector without changing the selection
4. WHEN navigating with keyboard THEN the system SHALL provide clear visual focus indicators
5. WHEN using screen readers THEN the system SHALL announce facility names, districts, and types

### Requirement 8: Validation and Error Handling

**User Story:** As an admin, I want clear validation messages when facility selection is incomplete or invalid, so that I can correct errors before submitting.

#### Acceptance Criteria

1. WHEN the form is submitted without a facility selection THEN the system SHALL display "Facility is required"
2. WHEN a facility is selected THEN the system SHALL clear any previous validation errors
3. IF the facility list fails to load THEN the system SHALL display "Failed to load facilities. Please try again."
4. IF a selected facility becomes invalid THEN the system SHALL display a warning and require reselection
5. WHEN validation errors occur THEN the system SHALL focus the facility selector field

### Requirement 9: API Endpoint for Facility List

**User Story:** As a frontend application, I need an API endpoint that provides facility data optimized for selection, so that I can populate the facility selector efficiently.

#### Acceptance Criteria

1. WHEN the frontend requests facilities THEN the API SHALL return a list with id, name, districtName, and facilityType
2. WHEN facilities are returned THEN the API SHALL order them by district name and then facility name
3. WHEN the API is called THEN the system SHALL only return active facilities
4. WHEN an admin user requests facilities THEN the API SHALL return all facilities in the system
5. IF the request is unauthorized THEN the API SHALL return a 401 error
6. WHEN facilities are returned THEN the response SHALL be in JSON format with proper typing

### Requirement 10: Backward Compatibility with Existing User Records

**User Story:** As a system, I need to maintain compatibility with existing user records that have facility IDs, so that no data is lost during the transition.

#### Acceptance Criteria

1. WHEN loading a user with an existing facilityId THEN the system SHALL resolve and display the facility name
2. WHEN updating a user THEN the system SHALL continue to store the facilityId as an integer in the database
3. IF a user has an invalid facilityId THEN the system SHALL display a warning and allow correction
4. WHEN the facility selector is used THEN the system SHALL maintain the same data structure in the database
5. WHEN existing API consumers access user data THEN the system SHALL continue to return facilityId as before
