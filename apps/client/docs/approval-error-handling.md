# Approval Workflow Error Handling

This document describes the comprehensive error handling implementation for the planning approval workflow.

## Overview

The error handling system provides:
- **Status-specific error messages** (403, 404, 400, 409, 422, 500, 503, network errors)
- **User-friendly toast notifications** for all success and error scenarios
- **Loading indicators** on all action buttons
- **Button disable logic** during API calls to prevent duplicates
- **Graceful handling** of network errors and unexpected failures

## Components

### 1. Enhanced ApiError Class

**Location:** `packages/api-client/src/index.ts`

The `ApiError` class has been enhanced with utility methods:

```typescript
class ApiError {
  getUserMessage(): string        // Get user-friendly error message
  isNetworkError(): boolean        // Check if network error
  isPermissionError(): boolean     // Check if permission error (401/403)
  isValidationError(): boolean     // Check if validation error (400/422)
}
```

### 2. useApprovalErrorHandler Hook

**Location:** `apps/client/hooks/use-approval-error-handler.ts`

Custom hook for consistent error handling across all approval components:

```typescript
const { handleError, handleSuccess } = useApprovalErrorHandler();

// Handle errors with context
handleError(error, "approve this plan");

// Handle success
handleSuccess("Success", "Plan approved successfully");
```

**Features:**
- Contextual error messages based on operation
- Status-specific titles and descriptions
- Automatic toast notification display
- Support for ApiError, Error, and unknown error types

### 3. Error Utility Functions

**Location:** `apps/client/lib/approval-error-utils.ts`

Utility functions for advanced error handling:

- `retryOperation()` - Retry failed operations with exponential backoff
- `getApprovalErrorMessage()` - Format error messages with context
- `isRecoverableError()` - Check if error is recoverable
- `formatValidationErrors()` - Format Zod validation errors

## Error Handling by Status Code

| Status | Title | Description | Recoverable |
|--------|-------|-------------|-------------|
| 400 | Invalid Request | Request validation failed | No |
| 401 | Unauthorized | User not authenticated | No |
| 403 | Permission Denied | User lacks permission | No |
| 404 | Not Found | Resource not found | No |
| 409 | Conflict | State conflict (e.g., already processed) | Yes |
| 422 | Validation Error | Input validation failed | No |
| 500 | Server Error | Internal server error | Yes |
| 503 | Service Unavailable | Service temporarily unavailable | Yes |
| 0 | Network Error | Connection failed | Yes |

## Implementation in Components

### ApprovalActionsCard

**Location:** `apps/client/components/planning/approval-actions-card.tsx`

- Uses `useApprovalErrorHandler` for error handling
- Shows loading spinner on active button during processing
- Disables both buttons during API calls
- Provides contextual error messages ("approve this plan" / "reject this plan")

### ApprovalCommentsDialog

**Location:** `apps/client/components/planning/approval-comments-dialog.tsx`

- Shows loading spinner in confirm button
- Disables all inputs and buttons during processing
- Prevents dialog close during API calls
- Validates required comments for rejection

### Planning Table Actions

**Location:** `apps/client/app/dashboard/planning/_components/planning-table-columns.tsx`

- Shows loading spinner in dropdown trigger during processing
- Disables all menu items during API calls
- Uses centralized error handler with context
- Refreshes table data after successful action

### Planning Table Toolbar

**Location:** `apps/client/app/dashboard/planning/_components/planning-table-toolbar-actions.tsx`

- Shows loading spinner in submit button
- Disables button during submission
- Validates selection before submission
- Provides count of plans being submitted

## Loading States

All action buttons implement loading states:

1. **Visual Indicator:** Spinner icon replaces action icon
2. **Button Text:** Changes to "Processing..." or "Submitting..."
3. **Disabled State:** Button disabled to prevent duplicate clicks
4. **Related Controls:** Other buttons/inputs disabled during operation

## User Feedback

### Success Notifications

```typescript
handleSuccess("Success", "Plan approved successfully");
```

- Green toast notification
- Descriptive message with action result
- Auto-dismisses after 5 seconds

### Error Notifications

```typescript
handleError(error, "approve this plan");
```

- Red toast notification
- Status-specific title (e.g., "Permission Denied", "Network Error")
- User-friendly description with actionable guidance
- Auto-dismisses after 7 seconds

## Best Practices

1. **Always use context:** Provide operation context to error handler
   ```typescript
   handleError(error, "submit plans for approval");
   ```

2. **Show loading states:** Always disable buttons and show spinners
   ```typescript
   <Button disabled={isLoading}>
     {isLoading && <Loader2 className="animate-spin" />}
     Submit
   </Button>
   ```

3. **Prevent duplicates:** Disable actions during processing
   ```typescript
   const [isLoading, setIsLoading] = useState(false);
   // ... in handler
   setIsLoading(true);
   try { /* ... */ } finally { setIsLoading(false); }
   ```

4. **Validate before submit:** Check preconditions before API calls
   ```typescript
   if (selectedDraftPlans.length === 0) {
     handleError(new Error("No draft plans selected"));
     return;
   }
   ```

5. **Refresh after success:** Update UI to reflect changes
   ```typescript
   handleSuccess("Success", result.message);
   onRefresh(); // Refresh data
   ```

## Testing Error Scenarios

To test error handling:

1. **Network Errors:** Disconnect network or use offline mode
2. **Permission Errors:** Use account without required role
3. **Validation Errors:** Submit invalid data (e.g., reject without comments)
4. **Conflict Errors:** Try to approve already-processed plan
5. **Server Errors:** Simulate 500 errors in backend

## Future Enhancements

Potential improvements:

- Retry logic for network errors (using `retryOperation()`)
- Offline queue for failed operations
- Detailed error logging for debugging
- Error analytics and monitoring
- Undo functionality for certain operations
