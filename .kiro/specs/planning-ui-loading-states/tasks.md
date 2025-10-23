# Implementation Plan

- [x] 1. Enhance save operation with proper loading feedback





  - Modify the `handleSubmit` function in `enhanced-planning-form.tsx` to ensure proper toast sequencing
  - Ensure loading toast completes before showing success toast
  - Add proper await on query refetch to ensure data synchronization before redirect
  - Add 500ms delay before redirect to ensure success toast is visible
  - Update error handling to keep user on form page when errors occur
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_
-

- [x] 2. Update query invalidation to include all planning query keys




  - Add invalidation for both `['planning', 'list']` and `['planning-activities']` query keys
  - Use proper refetch options with `type: 'active'` to only refetch active queries
  - Ensure refetch completes before redirect in both create and update flows
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Disable save button during submission





  - Update the save button in `enhanced-form-actions.tsx` or inline button to be disabled when mutations are pending
  - Add loading spinner icon to button during submission
  - Update button text to show operation type (Create/Update)
  - _Requirements: 1.6, 4.4_
-

- [x] 4. Integrate DataTableSkeleton in planning table component




  - Replace simple loading text in `planning-table.tsx` with DataTableSkeleton component
  - Configure skeleton with 8 columns matching the planning table structure
  - Set appropriate cell widths for each column
  - Configure skeleton to show 10 rows, 3 filters, and pagination
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
-

- [x] 5. Enhance planning page loading state




  - Update the loading state in `page.tsx` to use skeleton components
  - Add skeleton for page header (title and description)
  - Use DataTableSkeleton for the table loading state
  - Ensure skeleton appears quickly (within 100ms) for good UX
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.1, 6.2_

- [x] 6. Improve error handling and user feedback




  - Ensure error toast shows descriptive messages from handleApiError
  - Verify user stays on form page when save errors occur
  - Add proper error display in listing page when data fetch fails
  - Log warnings for refetch failures but still allow redirect
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 7. Test and verify all loading states
  - Test create flow: verify loading toast → success toast → redirect → data appears
  - Test update flow: verify loading toast → success toast → redirect → data appears
  - Test error flow: verify error toast → user stays on form → button re-enabled
  - Test skeleton loading: verify skeleton appears → replaced with data
  - Test with slow network to ensure loading states are visible
  - Test with fast network to ensure no UI flashing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 6.3, 6.4, 6.5_
