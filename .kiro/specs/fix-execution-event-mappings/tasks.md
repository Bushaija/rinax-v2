# Implementation Plan

- [x] 1. Update executionEventMappings array with correct Payable activity names





  - Fix all 13 HIV payable mappings to use title case
  - Fix all 13 Malaria payable mappings to use title case
  - Fix all 13 TB payable mappings to use title case
  - _Requirements: 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_
-

- [x] 2. Modify activity loading query to exclude total rows




  - Add `isTotalRow` field to SELECT statement
  - Add WHERE clause filter: `eq(schema.dynamicActivities.isTotalRow, false)`
  - Verify query returns only non-total activities
  - _Requirements: 1.1, 1.2_

- [x] 3. Implement case-insensitive activity lookup map





  - Modify map key generation to use `activity.name.toLowerCase()`
  - Update map key format: `${projectType}|${name.toLowerCase()}`
  - Ensure all map lookups use lowercase keys
  - _Requirements: 2.1, 2.4_

- [x] 4. Update explicit mapping lookup to use case-insensitive matching





  - Modify mapping loop to lowercase `mapping.activityName`
  - Update key generation: `${mapping.projectType}|${mapping.activityName.toLowerCase()}`
  - Verify matching works for all case variations
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
-

- [x] 5. Load category information for fallback filtering




  - Query `schema_activity_categories` table
  - Build `categoryMap: Map<number, CategoryInfo>`
  - Include fields: id, code, subCategoryCode
  - _Requirements: 6.4, 6.5_
-

- [x] 6. Improve fallback mapping filter logic




  - Add check: `if (a.isTotalRow) return false`
  - Add check: `if (a.activityType?.includes('TOTAL')) return false`
  - Add check: `if (a.activityType === 'COMPUTED') return false`
  - Add category filter: only include activities where category code ends with '_B'
  - Remove old name-based total row check
  - _Requirements: 1.1, 1.2, 1.3, 6.1, 6.2, 6.3, 6.4, 6.5_
-

- [x] 7. Create validateExecutionEventMappings function




  - Create new async function with proper signature
  - Return object with isValid, errors, warnings, statistics
  - _Requirements: 4.1, 4.5_

- [x] 7.1 Implement total rows validation check


  - Query for mappings where `da.is_total_row = true`
  - Add error if count > 0
  - _Requirements: 1.4, 4.2_

- [x] 7.2 Implement payables validation check

  - Query for Payable activities not mapped to PAYABLES event
  - Add error for each misrouted payable
  - _Requirements: 3.5, 4.3_

- [x] 7.3 Implement GOODS_SERVICES validation check

  - Query for non-B-category activities mapped to GOODS_SERVICES
  - Add error for each incorrect mapping
  - _Requirements: 4.4, 6.5_

- [x] 7.4 Generate mapping statistics

  - Count total mappings
  - Count mappings by event code
  - Count total rows mapped (should be 0)
  - Count payables to GOODS_SERVICES (should be 0)
  - _Requirements: 4.1_
-

- [x] 8. Integrate validation into seedExecutionEventMappings




  - Call validateExecutionEventMappings after mapping insertion
  - Log validation results
  - Include validation errors in return object
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
-

- [x] 9. Enhance logging output




  - Log total activities loaded
  - Log total rows excluded count
  - Log explicit vs fallback mapping counts
  - Log mappings by event code
  - Log validation errors if any
  - _Requirements: 4.1, 4.5_

- [ ] 10. Create database cleanup script
  - Write SQL to delete mappings for total rows
  - Write SQL to delete incorrect payable mappings
  - Save as migration or manual script
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 11. Test the complete mapping process
  - Run seeder for HIV project
  - Run seeder for Malaria project
  - Run seeder for TB project
  - Verify validation passes for all projects
  - Run query to confirm 0 total rows mapped
  - Run query to confirm all payables map to PAYABLES
  - Run query to confirm only B expenses map to GOODS_SERVICES
  - _Requirements: 1.4, 3.1, 3.2, 3.3, 3.4, 3.5, 4.2, 4.3, 4.4_
