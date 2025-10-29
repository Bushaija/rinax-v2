# Implementation Plan

- [x] 1. Create multi-catalog loading infrastructure





  - Implement `loadMultipleActivityCatalogs()` function in `execution.handlers.ts` that detects unique facility types from execution data and loads activity catalogs for each type in parallel
  - Create `ActivityCatalogMap` and `FacilityCatalogMapping` TypeScript interfaces in `execution.types.ts`
  - Add database queries to load activities filtered by facility type, project type, and module type
  - Build facility-to-catalog mapping that associates each facility ID with its appropriate catalog
  - Load subcategory names for all facility types
  - Add error handling for catalog loading failures with detailed logging
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Build unified activity structure





  - Create `UnifiedActivity` interface extending `ActivityDefinition` with `facilityTypes` and `sourceCode` fields
  - Implement `buildUnifiedActivityCatalog()` function in `aggregation.service.ts` that merges catalogs from multiple facility types
  - Create normalized keys for grouping similar activities across facility types (category + subcategory + displayOrder)
  - Handle activities that exist in only one facility type by tracking which facility types have each activity
  - Sort unified catalog by category and display order
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
-

- [x] 3. Enhance aggregation service for multi-catalog support




  - Add `aggregateByActivityWithMultipleCatalogs()` function to `aggregation.service.ts`
  - Update aggregation logic to use facility-specific catalogs instead of single catalog
  - Implement activity matching that finds corresponding activity in facility's catalog based on category, subcategory, and display order
  - Extract values using facility-specific activity codes
  - Handle missing activities by using zero values with warning logs
  - Add debug logging for activity matching process
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Update compiled endpoint to use multi-catalog system





  - Replace single-catalog loading (lines 2440-2470) with `loadMultipleActivityCatalogs()` call
  - Pass `facilityCatalogMap` and `unifiedCatalog` to aggregation service
  - Update `aggregateByActivity()` call to use new `aggregateByActivityWithMultipleCatalogs()` function
  - Maintain backward compatibility when `facilityType` filter is provided (load only that type's catalog)
  - Add logging for detected facility types and catalog loading process
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 5.1, 5.2, 5.3_

- [x] 5. Add comprehensive error handling and logging







  - Add warning logs when activity codes don't match between facility data and catalog
  - Log catalog loading failures with facility type and project type details
  - Add audit logging when multiple facility types are detected
  - Log the number of activities included from each facility type in unified structure
  - Add error responses for catalog loading failures with appropriate HTTP status codes
  - _Requirements: 1.5, 2.4, 7.1, 7.2, 7.3, 7.4, 7.5_
-

- [x] 6. Implement performance optimizations






  - Use `Promise.all()` for parallel catalog loading
  - Implement catalog reuse for facilities of the same type (avoid duplicate loads)
  - Use efficient Map/Object data structures for activity lookups
  - Process facilities in single pass during aggregation
  - Add performance warning when facility count exceeds 100
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 7. Write unit tests for multi-catalog functionality
  - Write tests for `buildUnifiedActivityCatalog()` covering merge scenarios, facility-type-specific activities, and edge cases
  - Write tests for `aggregateByActivityWithMultipleCatalogs()` covering mixed facility types, missing activities, and zero values
  - Write tests for `loadMultipleActivityCatalogs()` covering parallel loading, facility type detection, and error handling
  - Test backward compatibility with single facility type scenarios
  - Test error handling for missing catalogs and malformed data
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [ ]* 8. Write integration tests for compiled endpoint
  - Create test that executes data for both hospital and health center, then verifies both show non-zero values in compiled response
  - Test backward compatibility with `facilityType` filter parameter
  - Test error responses when catalog loading fails
  - Test performance with large datasets (>100 facilities)
  - Test edge cases: no execution data, single facility type, all facilities same type
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.5_

- [ ]* 9. Add documentation and migration notes
  - Update API documentation for compiled endpoint to note support for mixed facility types
  - Add JSDoc comments to new functions explaining multi-catalog behavior
  - Document the unified activity structure format
  - Add migration notes explaining the bug fix and behavior changes
  - Document performance characteristics and recommendations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
