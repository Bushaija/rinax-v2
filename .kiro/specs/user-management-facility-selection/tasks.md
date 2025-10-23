# Implementation Plan

- [x] 1. Create server-side API endpoint for fetching all facilities













  - Create new route definition in `facilities.routes.ts` for GET /api/facilities/all
  - Implement handler in `facilities.handlers.ts` that joins facilities and districts tables
  - Return facilities ordered by district name then facility name
 
 - Include id, name, facilityType, districtId, and districtName in response
 
 - _Requirements: 1.2, 2.1, 2.2, 2.3, 5.1, 5.2, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
-

- [x] 2. Create client-side data fetching infrastructure







  - [x] 2.1 Create API fetcher function

    - Create `apps/client/fetchers/facilities/get-all-facilities.ts`
    - Implement getAllFacilities() function that calls GET /api/facilities/all
    - Define FacilityWithDistrict type for response data
    - Handle API errors appropriately
    - _Requirements: 5.1, 5.4_

  - [x] 2.2 Create React Query hook


    - Create `apps/client/hooks/queries/facilities/use-get-all-facilities.ts`
    - Implement useGetAllFacilities() hook using React Query
    - Configure staleTime (5 minutes) and cacheTime (10 minutes)
    - Return data, isLoading, error, and refetch function
    - _Requirements: 5.1, 5.3, 5.4_
-

- [x] 3. Build FacilitySelector component




  - [x] 3.1 Create base component structure


    - Create `apps/client/components/facility-selector.tsx`
    - Define FacilitySelectorProps interface (value, onChange, disabled, error)
    - Use shadcn/ui Combobox or Select as base component
    - Implement controlled component pattern with value and onChange
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Implement facility data loading and display

    - Integrate useGetAllFacilities() hook in component
    - Display loading state while fetching facilities
    - Render facility list with name as primary text
    - Show district name as secondary text in muted color
    - Display facility type badge (Hospital/Health Center) with appropriate styling
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1, 5.4_

  - [x] 3.3 Add search and filter functionality

    - Implement search input field in dropdown
    - Filter facilities by name (case-insensitive)
    - Filter facilities by district name (case-insensitive)
    - Display "No facilities found" when search returns empty results
    - Clear search when dropdown closes
    - Use useMemo for filtered results optimization
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_

  - [x] 3.4 Implement keyboard navigation and accessibility

    - Support arrow key navigation through facility list
    - Handle Enter key for selection
    - Handle Escape key to close dropdown
    - Add proper ARIA labels and roles
    - Ensure screen reader announces facility name, district, and type
    - Add visible focus indicators
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_


  - [ ] 3.5 Add error handling and validation


    - Display error state when API fetch fails
    - Show retry button in error state
    - Handle empty facility list scenario
    - Display validation error message when provided via props
    - _Requirements: 5.4, 8.1, 8.2, 8.3, 8.4_

- [x] 4. Update UserForm component to use FacilitySelector





  - Replace numeric facilityId input field with FacilitySelector component
  - Pass form field value and onChange to FacilitySelector
  - Pass validation error message to FacilitySelector
  - Maintain existing form validation logic
  - Ensure facilityId is still stored as number in form state
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 1.6, 4.2, 8.1, 8.2, 10.4_
-

- [x] 5. Update UpdateUserSheet to display current facility




  - Ensure form is populated with current user's facilityId
  - Verify FacilitySelector displays facility name (not ID) when form loads
  - Handle case where user has invalid facilityId
  - Maintain existing form reset and submission logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 10.1, 10.3_
- [x] 6. Update CreateUserSheet (if exists) or registration flow




- [ ] 6. Update CreateUserSheet (if exists) or registration flow

  - Integrate FacilitySelector in user creation form
  - Ensure facility selection is required for form submission
  - Validate facilityId before submitting to API
  - Handle form validation errors appropriately
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.1, 8.5_
-

- [ ] 7. Add visual styling and polish



  - Style facility type badges with appropriate colors (blue for hospital, green for health center)
  - Ensure district context text is properly muted
  - Add icons for facility types if desired
  - Ensure consistent spacing and alignment in dropdown
  - Test responsive behavior on different screen sizes
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 8. Write unit tests for FacilitySelector component
  - Test component renders with loading state initially
  - Test facilities display after successful fetch
  - Test search filtering by facility name
  - Test search filtering by district name
  - Test facility selection triggers onChange with correct ID
  - Test error state display and retry functionality
  - Test "No facilities found" empty state
  - Test keyboard navigation (arrow keys, Enter, Escape)
  - Test accessibility attributes (ARIA labels, roles)
  - _Requirements: All requirements_

- [ ]* 9. Write integration tests for API endpoint
  - Test GET /api/facilities/all returns all facilities with district names
  - Test facilities are ordered by district name then facility name
  - Test response includes all required fields
  - Test authentication requirement (401 for unauthenticated)
  - Test database error handling
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ]* 10. Write integration tests for UserForm
  - Test UserForm renders FacilitySelector instead of numeric input
  - Test form validation requires facility selection
  - Test selected facility ID is included in form submission
  - Test facility selector displays current facility on edit
  - Test form handles facility change correctly
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2_

- [ ] 11. Manual testing and validation
  - Test complete user registration flow with facility selection
  - Test user update flow with facility change
  - Test search functionality with various queries
  - Test keyboard navigation through entire form
  - Test with screen reader for accessibility
  - Test error scenarios (API failure, network timeout, invalid facility)
  - Verify database records have correct facilityId after creation/update
  - _Requirements: All requirements_

- [ ] 12. Documentation and cleanup
  - Update user management documentation with new facility selection process
  - Add JSDoc comments to FacilitySelector component
  - Document API endpoint in API documentation
  - Remove any unused code or imports
  - Ensure code follows project style guidelines
  - _Requirements: All requirements_
