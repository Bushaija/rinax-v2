# Implementation Plan

- [x] 1. Create helper functions for data normalization





  - Create `normalizeProgramType()` function to handle program name variations (MAL → Malaria)
  - Create `getCategoryDisplayKey()` function to map program keys to category display keys
  - Create `deriveCategoryDescription()` helper to generate fallback descriptions
  - _Requirements: 5.1, 5.2_

- [x] 2. Replace PROGRAM_CONFIGURATIONS with new data structures





  - Replace `PROGRAM_CONFIGURATIONS` constant with `programActivities` object using the provided data
  - Add `categoryDisplayNames` mapping with category metadata
  - Remove old `ProgramConfig`, `CategoryConfig`, and `ActivityConfig` interfaces if no longer needed
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
-

- [x] 3. Refactor seedFormSchemas function




  - Update function to extract program types from `programActivities` keys
  - Extract unique facility types from activities within each program
  - Normalize program types before creating form schemas
  - Maintain existing form schema structure and metadata
  - _Requirements: 2.1, 5.2_

- [x] 4. Refactor seedSchemaActivityCategories function





  - Extract unique category codes from activities grouped by program and facility
  - Look up category names from `categoryDisplayNames` using normalized keys
  - Implement fallback logic for missing category metadata
  - Calculate activity counts per category from flat activity array
  - Maintain category display order and metadata structure
  - _Requirements: 2.2, 3.1, 4.2_

- [x] 5. Refactor seedDynamicActivities function





  - Update to iterate over `programActivities` object keys
  - Filter activities by facility type and category code directly (no `applicableTo` logic)
  - Group activities by program, facility type, and category code
  - Preserve activity properties (isAnnualOnly, displayOrder, etc.)
  - Maintain existing activity metadata and field mappings
  - _Requirements: 2.3, 3.2, 3.3, 5.2_

- [ ] 6. Update exports and maintain backward compatibility





  - Update exports to include new data structures
  - Ensure `seedEnhancedPlanningData` function works with refactored code
  - Update `seedProgramPlanningData` helper function if needed
  - Verify all exported functions remain functional
  - _Requirements: 2.4, 5.3_

- [ ] 7. Validate refactored code
  - Run TypeScript compilation to check for type errors
  - Review code for logical errors and edge cases
  - Verify all activities from original structure are present in new structure
  - Check that category codes and display names are consistent
  - _Requirements: 3.4, 4.3, 5.3, 5.4_
