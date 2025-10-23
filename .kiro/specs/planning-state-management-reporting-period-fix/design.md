# Design Document

## Overview

This design addresses a critical bug in the planning module's state management where draft and auto-save data is incorrectly shared across different reporting periods. The root cause is that the localStorage storage key does not include the `reportingPeriodId`, causing data collision when users work with the same facility and program but different reporting periods.

The fix involves updating the storage key construction throughout the `EnhancedPlanningForm` component to include the `reportingPeriodId`, while maintaining backward compatibility for existing drafts.

## Architecture

### Current Architecture

The planning form uses localStorage to persist draft and auto-save data through the `PlanningStorage` utility class. The storage key is currently constructed as:

```typescript
const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
```

This key is used in multiple locations within `enhanced-planning-form.tsx`:
1. **Line 124**: Loading initial data from drafts/auto-save
2. **Line 210**: Removing draft after successful submission
3. **Line 243**: Auto-saving form data on field changes
4. **Line 329**: Manually saving draft
5. **Line 487**: Removing draft on cancel

### Proposed Architecture

The storage key will be updated to include `reportingPeriodId`:

```typescript
const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}_${reportingPeriodId}`;
```

This ensures that each reporting period has its own isolated storage space in localStorage.

## Components and Interfaces

### 1. Storage Key Construction

**Location**: `apps/client/features/planning/v3/enhanced-planning-form.tsx`

**Current Implementation**:
```typescript
const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
```

**New Implementation**:
```typescript
// Helper function to construct storage key
const getStorageKey = useCallback(() => {
  const periodId = reportingPeriodId ?? 1; // Default to 1 if undefined
  return `${projectType}_${facilityType}_${projectId}_${facilityId}_${periodId}`;
}, [projectType, facilityType, projectId, facilityId, reportingPeriodId]);
```

**Rationale**: 
- Using a helper function ensures consistency across all storage operations
- Provides a default value (1) if `reportingPeriodId` is undefined
- Uses `useCallback` to memoize the function and prevent unnecessary re-renders

### 2. Initial Data Loading with Migration

**Location**: `enhanced-planning-form.tsx` - `initialData` useMemo (around line 115-126)

**Current Implementation**:
```typescript
const initialData = useMemo(() => {
  if (mode === 'edit' && existingData) {
    const formData = existingData.formData?.activities || {};
    return formData;
  }
  
  const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
  return PlanningStorage.loadDraft(storageKey) || PlanningStorage.loadAutoSave(storageKey) || {};
}, [mode, existingData, projectType, facilityType, projectId, facilityId]);
```

**New Implementation**:
```typescript
const initialData = useMemo(() => {
  if (mode === 'edit' && existingData) {
    const formData = existingData.formData?.activities || {};
    return formData;
  }
  
  // Try new key format first
  const newStorageKey = getStorageKey();
  let data = PlanningStorage.loadDraft(newStorageKey) || PlanningStorage.loadAutoSave(newStorageKey);
  
  // Backward compatibility: try old key format if no data found
  if (!data || Object.keys(data).length === 0) {
    const oldStorageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
    data = PlanningStorage.loadDraft(oldStorageKey) || PlanningStorage.loadAutoSave(oldStorageKey);
    
    // Migrate old data to new key format
    if (data && Object.keys(data).length > 0) {
      console.log('Migrating draft data to new storage key format');
      PlanningStorage.saveDraft(newStorageKey, data);
      PlanningStorage.removeDraft(oldStorageKey);
      // Also remove old auto-save if it exists
      localStorage.removeItem(`planning_autosave_${oldStorageKey}`);
    }
  }
  
  return data || {};
}, [mode, existingData, projectType, facilityType, projectId, facilityId, reportingPeriodId, getStorageKey]);
```

**Rationale**:
- Attempts to load with new key format first for optimal performance
- Falls back to old key format for backward compatibility
- Automatically migrates old data to new format
- Cleans up old storage entries after migration

### 3. Field Change Handler with Auto-Save

**Location**: `enhanced-planning-form.tsx` - `handleFieldChange` callback (around line 230-260)

**Current Implementation**:
```typescript
const handleFieldChange = useCallback(async (activityId: string, fieldKey: string, value: any) => {
  try {
    hookHandleFieldChange(activityId, fieldKey, value);
    setHasUnsavedChanges(true);
    
    const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
    const currentFormData = formData || {};
    PlanningStorage.autoSave(storageKey, currentFormData);
    setAutoSaveStatus('saved');
    
    // ... validation logic
  } catch (error) {
    // ... error handling
  }
}, [hookHandleFieldChange, projectType, facilityType, projectId, facilityId, formData]);
```

**New Implementation**:
```typescript
const handleFieldChange = useCallback(async (activityId: string, fieldKey: string, value: any) => {
  try {
    hookHandleFieldChange(activityId, fieldKey, value);
    setHasUnsavedChanges(true);
    
    const storageKey = getStorageKey();
    const currentFormData = formData || {};
    PlanningStorage.autoSave(storageKey, currentFormData);
    setAutoSaveStatus('saved');
    
    // ... validation logic
  } catch (error) {
    // ... error handling
  }
}, [hookHandleFieldChange, projectType, facilityType, projectId, facilityId, reportingPeriodId, formData, getStorageKey]);
```

**Rationale**:
- Uses the helper function for consistency
- Adds `reportingPeriodId` to dependency array

### 4. Save Draft Handler

**Location**: `enhanced-planning-form.tsx` - `handleSaveDraft` callback (around line 320-335)

**Current Implementation**:
```typescript
const handleSaveDraft = useCallback(async () => {
  try {
    const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
    PlanningStorage.saveDraft(storageKey, formData);
    toast.success('Draft saved successfully');
    setHasUnsavedChanges(false);
  } catch (error) {
    toast.error('Failed to save draft');
  }
}, [formData, projectType, facilityType, projectId, facilityId]);
```

**New Implementation**:
```typescript
const handleSaveDraft = useCallback(async () => {
  try {
    const storageKey = getStorageKey();
    PlanningStorage.saveDraft(storageKey, formData);
    toast.success('Draft saved successfully');
    setHasUnsavedChanges(false);
  } catch (error) {
    toast.error('Failed to save draft');
  }
}, [formData, projectType, facilityType, projectId, facilityId, reportingPeriodId, getStorageKey]);
```

**Rationale**:
- Uses the helper function for consistency
- Adds `reportingPeriodId` to dependency array

### 5. Update Mutation Success Handler

**Location**: `enhanced-planning-form.tsx` - `updateMutation` definition (around line 205-215)

**Current Implementation**:
```typescript
const updateMutation = useUpdatePlanning({
  onSuccess: (data) => {
    const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
    PlanningStorage.removeDraft(storageKey);
    setHasUnsavedChanges(false);
    onSuccess?.(data);
  }
});
```

**New Implementation**:
```typescript
const updateMutation = useUpdatePlanning({
  onSuccess: (data) => {
    const storageKey = getStorageKey();
    PlanningStorage.removeDraft(storageKey);
    setHasUnsavedChanges(false);
    onSuccess?.(data);
  }
});
```

**Rationale**:
- Uses the helper function for consistency
- Ensures draft is removed from correct storage location

### 6. Cancel Handler

**Location**: `enhanced-planning-form.tsx` - `handleCancel` callback (around line 480-495)

**Current Implementation**:
```typescript
const handleCancel = useCallback(() => {
  if (hasUnsavedChanges) {
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
    if (!confirmed) return;
  }

  const storageKey = `${projectType}_${facilityType}_${projectId}_${facilityId}`;
  PlanningStorage.removeDraft(storageKey);
  
  onCancel?.();
  router.back();
}, [hasUnsavedChanges, projectType, facilityType, projectId, facilityId, onCancel, router]);
```

**New Implementation**:
```typescript
const handleCancel = useCallback(() => {
  if (hasUnsavedChanges) {
    const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?');
    if (!confirmed) return;
  }

  const storageKey = getStorageKey();
  PlanningStorage.removeDraft(storageKey);
  
  onCancel?.();
  router.back();
}, [hasUnsavedChanges, projectType, facilityType, projectId, facilityId, reportingPeriodId, onCancel, router, getStorageKey]);
```

**Rationale**:
- Uses the helper function for consistency
- Adds `reportingPeriodId` to dependency array

## Data Models

### Storage Key Format

**Old Format**:
```
planning_draft_HIV_hospital_1_23
planning_autosave_HIV_hospital_1_23
```

**New Format**:
```
planning_draft_HIV_hospital_1_23_2
planning_autosave_HIV_hospital_1_23_2
```

Where the components are:
- `projectType`: HIV | TB | Malaria
- `facilityType`: hospital | health_center
- `projectId`: numeric project ID
- `facilityId`: numeric facility ID
- `reportingPeriodId`: numeric reporting period ID (NEW)

### localStorage Data Structure

No changes to the data structure itself, only the key format:

```typescript
{
  data: Record<string, any>,  // Activity data keyed by activity ID
  timestamp: string           // ISO 8601 timestamp
}
```

## Error Handling

### Missing Reporting Period ID

**Scenario**: `reportingPeriodId` is `null` or `undefined`

**Handling**:
```typescript
const getStorageKey = useCallback(() => {
  const periodId = reportingPeriodId ?? 1;
  if (!reportingPeriodId) {
    console.warn('reportingPeriodId is undefined, defaulting to 1');
  }
  return `${projectType}_${facilityType}_${projectId}_${facilityId}_${periodId}`;
}, [projectType, facilityType, projectId, facilityId, reportingPeriodId]);
```

**Rationale**: Provides a sensible default while logging a warning for debugging

### Migration Failures

**Scenario**: Error occurs during migration from old to new storage format

**Handling**:
```typescript
try {
  if (data && Object.keys(data).length > 0) {
    PlanningStorage.saveDraft(newStorageKey, data);
    PlanningStorage.removeDraft(oldStorageKey);
    localStorage.removeItem(`planning_autosave_${oldStorageKey}`);
  }
} catch (error) {
  console.error('Failed to migrate draft data:', error);
  // Continue with the loaded data even if migration fails
}
```

**Rationale**: Ensures the user can still access their data even if migration fails

### localStorage Quota Exceeded

**Scenario**: localStorage is full and cannot save new data

**Handling**: Already handled by `PlanningStorage` class with try-catch and console warnings

## Testing Strategy

### Unit Tests

**Test File**: `apps/client/lib/planning/__tests__/storage.test.ts` (if exists) or create new test file

**Test Cases**:
1. **Storage key construction**
   - Verify key includes all required components
   - Verify default value when `reportingPeriodId` is undefined
   - Verify key format matches expected pattern

2. **Data isolation**
   - Save data for period 1, verify it doesn't appear for period 2
   - Save data for period 2, verify it doesn't affect period 1
   - Verify multiple periods can have independent drafts

3. **Backward compatibility**
   - Create draft with old key format
   - Verify it loads correctly with new code
   - Verify migration to new format occurs
   - Verify old key is cleaned up after migration

### Integration Tests

**Test File**: `apps/client/features/planning/v3/__tests__/enhanced-planning-form.test.tsx` (create if doesn't exist)

**Test Cases**:
1. **Form initialization**
   - Mount form with `reportingPeriodId=1`, verify correct storage key
   - Mount form with `reportingPeriodId=2`, verify different storage key
   - Verify form loads correct draft for each period

2. **Field changes and auto-save**
   - Change field in period 1, verify auto-save uses correct key
   - Switch to period 2, verify different data
   - Return to period 1, verify original data persists

3. **Draft operations**
   - Save draft for period 1
   - Navigate to period 2, verify empty form
   - Save draft for period 2
   - Navigate back to period 1, verify period 1 draft intact

### Manual Testing

**Test Scenarios**:

1. **New user workflow**
   - Create planning for facility 23, HIV, period 1
   - Enter some data
   - Navigate to facility 23, HIV, period 2
   - Verify form is empty
   - Enter different data
   - Navigate back to period 1
   - Verify original data is present

2. **Existing draft migration**
   - Manually create old-format draft in localStorage
   - Load form with new code
   - Verify data loads correctly
   - Verify new-format key is created
   - Verify old-format key is removed

3. **Edge cases**
   - Test with `reportingPeriodId` missing from URL
   - Test with invalid `reportingPeriodId` values
   - Test with multiple browser tabs open to different periods

## Performance Considerations

### localStorage Access

- **Impact**: Minimal - localStorage operations are synchronous and fast
- **Optimization**: Use `useCallback` for `getStorageKey` to prevent unnecessary recalculations

### Migration Performance

- **Impact**: One-time cost when loading old drafts
- **Optimization**: Migration only occurs if new key has no data, minimizing unnecessary operations

### Memory Usage

- **Impact**: Negligible - each draft is typically < 50KB
- **Consideration**: Multiple periods will create multiple localStorage entries, but this is expected behavior

## Security Considerations

### Data Isolation

- **Benefit**: Prevents accidental data leakage between reporting periods
- **Implementation**: Storage key includes all identifying parameters

### localStorage Limitations

- **Consideration**: localStorage is not encrypted and accessible via browser DevTools
- **Mitigation**: Planning data is not sensitive; final submission goes through secure API

## Deployment Strategy

### Rollout Plan

1. **Phase 1**: Deploy code changes
   - No database changes required
   - No API changes required
   - Frontend-only change

2. **Phase 2**: Monitor for issues
   - Check browser console for migration logs
   - Monitor user reports of data loss
   - Verify localStorage keys in production

### Rollback Plan

If issues arise:
1. Revert frontend code to previous version
2. Old code will continue to work with old storage keys
3. New storage keys will be ignored by old code (no data loss)

### Communication

- **Users**: No communication needed - change is transparent
- **Developers**: Update documentation about storage key format
- **QA**: Provide test scenarios for verification

## Future Enhancements

### Potential Improvements

1. **Storage cleanup utility**
   - Add function to remove old/expired drafts
   - Implement in user settings or admin panel

2. **Draft synchronization**
   - Consider syncing drafts to server for cross-device access
   - Would require API changes and database schema

3. **Storage key versioning**
   - Add version prefix to storage keys for future migrations
   - Example: `v2_planning_draft_...`

4. **Reporting period validation**
   - Add validation to ensure `reportingPeriodId` matches available periods
   - Prevent users from accessing invalid periods
