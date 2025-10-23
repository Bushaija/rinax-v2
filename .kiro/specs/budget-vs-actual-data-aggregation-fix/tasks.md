# Implementation Plan

- [x] 1. Enhance JSON data structure detection in data aggregation engine





  - Modify `collectQuarterlyJsonData()` method to detect planning vs execution JSON structures
  - Add logic to identify numeric ID keys (planning) vs string code keys (execution)
  - Create separate processing paths for each structure type
  - _Requirements: 1.1, 2.1_

- [ ] 2. Implement planning JSON data processor
  - [ ] 2.1 Create planning-specific JSON processing logic
    - Extract activities with numeric ID keys from planning JSON
    - Process `total_budget` values instead of quarterly sums for planning data
    - Handle planning data structure: `{"activities": {"236": {"total_budget": 500}}}`
    - _Requirements: 1.1, 2.1_

  - [ ] 2.2 Implement direct ID-to-event mapping for planning data
    - Skip activity code resolution since keys are already numeric IDs
    - Query `configurable_event_mappings` directly with numeric activity IDs
    - Map planning activities to event codes (e.g., activities 236-245 → GOODS_SERVICES_PLANNING)
    - _Requirements: 1.3, 2.3_

  - [ ] 2.3 Add planning data aggregation logic
    - Sum `total_budget` values for activities mapped to the same event
    - Create event entries with proper structure for budget vs actual processor
    - Handle edge cases where `total_budget` is missing or invalid
    - _Requirements: 1.2, 2.4_

- [ ] 3. Maintain execution JSON data processing compatibility
  - [ ] 3.1 Preserve existing execution data processing logic
    - Keep string code key processing for execution data unchanged
    - Maintain quarterly sum calculations for execution activities
    - Ensure execution data continues to work with existing logic
    - _Requirements: 2.2_

  - [ ] 3.2 Update activity code resolution for execution data
    - Continue using `getActivityCodeToIdMapping()` for execution data
    - Maintain string code → numeric ID → event code mapping chain
    - Preserve execution data structure handling
    - _Requirements: 2.2_

- [ ] 4. Integrate dual JSON processing with budget vs actual processor
  - [ ] 4.1 Update data collection orchestration
    - Modify `collectPeriodData()` to handle both JSON structures
    - Ensure planning and execution data are processed through appropriate paths
    - Combine results from both processors into unified event aggregation
    - _Requirements: 1.4, 2.4_

  - [ ] 4.2 Enhance event aggregation results
    - Merge planning and execution event totals correctly
    - Maintain separate metadata for planning vs execution processing
    - Provide detailed logging for both processing paths
    - _Requirements: 1.4, 2.4_

- [ ] 5. Add comprehensive error handling and logging
  - [ ] 5.1 Implement planning JSON validation
    - Validate planning JSON structure and required fields
    - Handle missing `total_budget` values gracefully
    - Log detailed errors for malformed planning data
    - _Requirements: 2.3_

  - [ ] 5.2 Add dual-structure processing diagnostics
    - Log which processing path was used for each data entry
    - Provide detailed breakdown of planning vs execution data processing
    - Include processing statistics in aggregation metadata
    - _Requirements: 2.3_

- [ ] 6. Create comprehensive test coverage
  - [ ] 6.1 Unit tests for planning JSON processor
    - Test planning JSON structure detection and processing
    - Test numeric ID key extraction and event mapping
    - Test `total_budget` aggregation logic
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 6.2 Integration tests for dual JSON processing
    - Test budget vs actual generation with planning JSON data
    - Test mixed planning and execution data processing
    - Test error handling for malformed JSON structures
    - _Requirements: 1.4, 2.4_

  - [ ] 6.3 End-to-end tests with real data
    - Test with facility 20, period 2 data (the failing case)
    - Verify GOODS_SERVICES_PLANNING appears in budget column
    - Test with various planning data scenarios and amounts
    - _Requirements: 1.2, 1.3_