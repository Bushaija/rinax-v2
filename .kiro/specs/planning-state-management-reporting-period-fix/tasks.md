# Implementation Plan

- [x] 1. Add storage key helper function to EnhancedPlanningForm





  - Create `getStorageKey` function using `useCallback` hook
  - Include `reportingPeriodId` in the storage key format: `${projectType}_${facilityType}_${projectId}_${facilityId}_${reportingPeriodId}`
  - Add default value of 1 for `reportingPeriodId` if undefined
  - Add console warning when `reportingPeriodId` is undefined
  - _Requirements: 1.1, 1.2, 4.2_

- [x] 2. Update initialData useMemo with backward compatibility





  - Modify the `initialData` useMemo hook to use the new `getStorageKey` function
  - Implement fallback logic to try old storage key format if new format returns no data
  - Add migration logic to copy data from old key to new key when old data is found
  - Clean up old storage keys (both draft and auto-save) after successful migration
  - Add console log for migration events
  - Update dependency array to include `reportingPeriodId` and `getStorageKey`
  - _Requirements: 1.1, 1.4, 2.1, 2.2, 2.3, 2.4_

- [x] 3. Update handleFieldChange callback





  - Replace inline storage key construction with `getStorageKey()` call
  - Update dependency array to include `reportingPeriodId` and `getStorageKey`
  - _Requirements: 3.3, 1.4_

- [x] 4. Update handleSaveDraft callback





  - Replace inline storage key construction with `getStorageKey()` call
  - Update dependency array to include `reportingPeriodId` and `getStorageKey`
  - _Requirements: 3.1, 1.4_

- [x] 5. Update updateMutation onSuccess handler





  - Replace inline storage key construction with `getStorageKey()` call in the `onSuccess` callback
  - _Requirements: 3.5, 1.4_

- [x] 6. Update handleCancel callback





  - Replace inline storage key construction with `getStorageKey()` call
  - Update dependency array to include `reportingPeriodId` and `getStorageKey`
  - _Requirements: 3.6, 1.4_

- [x] 7. Verify reportingPeriodId prop handling in page component




  - Review `apps/client/app/dashboard/planning/new/page.tsx` to ensure `reportingPeriodId` is correctly parsed from URL params
  - Verify the parsed value is passed to `EnhancedPlanningForm` component
  - Ensure proper number conversion with fallback to 1
  - _Requirements: 4.3_

- [ ] 8. Manual testing and verification
  - Test creating draft for reportingPeriodId=1, verify localStorage key format
  - Test creating draft for reportingPeriodId=2, verify different localStorage key
  - Test switching between periods, verify data isolation
  - Test backward compatibility by manually creating old-format draft and verifying migration
  - Test with missing reportingPeriodId parameter, verify default behavior
  - Verify old storage keys are cleaned up after migration
  - _Requirements: 5.1, 5.2, 5.3, 5.4_
