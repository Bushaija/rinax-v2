# Design Document

## Overview

This design addresses the horizontal scrolling bug in readonly mode and introduces a cleaner "view" mode for the EnhancedPlanningForm component. The solution involves:
1. Fixing the CSS class application to preserve scrolling functionality in readonly mode
2. Extending the mode prop to support a "view" value for better semantic clarity
3. Updating the planning details page to use the new view mode

## Architecture

### Component Structure

```
PlanningDetailsPage
  └── EnhancedPlanningForm (mode="view")
      ├── Card (Header - conditional)
      ├── Card (Activities Table)
      │   └── div (scrollable container)
      │       └── table
      │           ├── thead
      │           └── tbody
      │               └── EnhancedCategorySection[]
      └── EnhancedFormActions (hidden in view mode)
```

### Key Changes

1. **EnhancedPlanningForm Component**
   - Extend `mode` prop type from `'create' | 'edit'` to `'create' | 'edit' | 'view'`
   - Derive readonly behavior from mode when mode is "view"
   - Fix CSS class application on scrollable container

2. **Planning Details Page**
   - Change from `mode="edit"` with `readOnly` to `mode="view"`
   - Remove redundant `readOnly` prop

## Components and Interfaces

### EnhancedPlanningForm Props Interface

```typescript
interface EnhancedPlanningFormProps {
  mode: 'create' | 'edit' | 'view';  // Extended to include 'view'
  planningId?: string;
  projectId: number;
  facilityId: number;
  reportingPeriodId?: number;
  onSuccess?: (data: any) => void;
  onCancel?: () => void;
  facilityName?: string;
  program?: string;
  facilityType?: string;
  showHeader?: boolean;
  readOnly?: boolean;  // Kept for backward compatibility, but derived from mode
}
```

### CSS Class Logic

**Current (Buggy):**
```tsx
<div className={`overflow-x-auto ${readOnly ? 'pointer-events-none opacity-95' : ''}`}>
```

**Problem:** `pointer-events-none` prevents all pointer events including scrolling.

**Fixed:**
```tsx
<div className="overflow-x-auto">
  <table className={`w-full ${readOnly ? 'pointer-events-none opacity-95' : ''}`}>
```

**Rationale:** Apply `pointer-events-none` to the table element (which contains inputs) rather than the scrollable container, preserving scroll functionality while disabling form interactions.

## Data Models

No data model changes required. This is purely a UI/UX fix.

## Implementation Details

### 1. Fix Scrolling in Readonly Mode

**File:** `apps/client/features/planning/v3/enhanced-planning-form.tsx`

**Location:** Line 767-769

**Change:**
- Move `pointer-events-none` and `opacity-95` classes from the scrollable div to the table element
- Keep `overflow-x-auto` on the container div without conditional disabling

**Before:**
```tsx
<div className={`overflow-x-auto ${readOnly ? 'pointer-events-none opacity-95' : ''}`}>
  <table className="w-full">
```

**After:**
```tsx
<div className="overflow-x-auto">
  <table className={`w-full ${readOnly ? 'pointer-events-none opacity-95' : ''}`}>
```

### 2. Add View Mode Support

**File:** `apps/client/features/planning/v3/enhanced-planning-form.tsx`

**Changes:**

a) Update interface (line ~50):
```typescript
interface EnhancedPlanningFormProps {
  mode: 'create' | 'edit' | 'view';
  // ... rest of props
}
```

b) Derive readonly state from mode (after line ~75):
```typescript
// Derive readonly from mode or explicit prop
const isReadOnly = mode === 'view' || readOnly;
```

c) Update all references to `readOnly` to use `isReadOnly` instead

d) Update conditional rendering of form actions (line ~860):
```typescript
{!isReadOnly && (
  <EnhancedFormActions
    // ... props
  />
)}
```

### 3. Update Planning Details Page

**File:** `apps/client/app/dashboard/planning/details/[id]/page.tsx`

**Location:** Line 135-144

**Change:**
```typescript
// Before
<EnhancedPlanningForm
  mode="edit"
  readOnly
  // ... other props
/>

// After
<EnhancedPlanningForm
  mode="view"
  // ... other props (remove readOnly)
/>
```

## Error Handling

No new error handling required. The changes are purely presentational and don't introduce new failure modes.

## Testing Strategy

### Manual Testing

1. **Horizontal Scrolling Test**
   - Navigate to planning details page
   - Verify table is horizontally scrollable on narrow screens
   - Verify all columns are accessible via scrolling
   - Verify inputs are not interactive (pointer-events-none working)

2. **View Mode Test**
   - Navigate to planning details page
   - Verify form displays in readonly state
   - Verify form action buttons are hidden
   - Verify data displays correctly

3. **Backward Compatibility Test**
   - Test existing edit mode with readOnly prop still works
   - Verify create mode is unaffected
   - Verify edit mode without readOnly still allows editing

### Browser Testing

- Test on Chrome, Firefox, Safari, Edge
- Test on mobile devices (iOS Safari, Chrome Android)
- Test with different screen sizes (mobile, tablet, desktop)

### Regression Testing

- Verify planning creation flow still works
- Verify planning edit flow still works
- Verify export functionality works in view mode
- Verify all existing planning list features work

## Design Decisions

### Decision 1: Move pointer-events-none to table instead of removing it

**Rationale:** We want to preserve the visual indication (opacity-95) and prevent accidental interactions with form inputs while still allowing scrolling. Moving the class to the table element achieves both goals.

**Alternatives Considered:**
- Remove pointer-events-none entirely: Would allow accidental clicks on disabled inputs
- Use a more specific selector: More complex and harder to maintain

### Decision 2: Add "view" mode instead of just fixing the bug

**Rationale:** Using mode="edit" with readOnly is semantically confusing and makes the code harder to understand. A dedicated "view" mode makes the intent clearer and provides better separation of concerns.

**Alternatives Considered:**
- Just fix the CSS bug: Would leave the semantic confusion in place
- Remove edit mode entirely: Would break existing functionality

### Decision 3: Keep readOnly prop for backward compatibility

**Rationale:** Other parts of the codebase might be using the readOnly prop with edit mode. Keeping it ensures we don't break existing functionality while providing a better path forward.

**Alternatives Considered:**
- Remove readOnly prop: Could break existing code
- Make readOnly and view mode mutually exclusive: More complex logic

## Visual Changes

### Before (Buggy)
- Table not scrollable in readonly mode
- User cannot see all columns on narrow screens
- Confusing mode="edit" with readOnly prop

### After (Fixed)
- Table scrollable in all modes
- All columns accessible via horizontal scroll
- Clear mode="view" for readonly display
- Inputs still disabled (pointer-events-none on table)
- Slight opacity (0.95) indicates readonly state
