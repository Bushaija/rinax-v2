# Period Lock Error Flow - Visual Guide

## User Experience Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User fills out planning/execution form                     │
│  - Enters data for a specific period                        │
│  - Clicks "Submit" or "Update"                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  Form submits data to API                                   │
│  - Mutation hook calls API endpoint                         │
│  - Request includes period/project/facility IDs             │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  API Middleware validates period lock                       │
│  - Checks if period is locked                               │
│  - Validates user permissions                               │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    Period Locked           Period Unlocked
         │                       │
         ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Returns 403 Error  │  │  Processes Request  │
│  with message:      │  │  - Saves data       │
│  "Period is locked" │  │  - Returns success  │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Mutation Hook      │  │  Success Handler    │
│  - Detects error    │  │  - Shows toast      │
│  - Checks for 403   │  │  - Updates cache    │
│  - Checks "locked"  │  │  - Calls onSuccess  │
└──────────┬──────────┘  └─────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│  onPeriodLockError Callback                                 │
│  - Enriches error with context                              │
│  - Sets dialog state to open                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  PeriodLockErrorDialog Appears                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🔒 Period Locked                                     │  │
│  │                                                       │  │
│  │  This reporting period is locked due to an approved  │  │
│  │  financial report. You cannot create or edit data    │  │
│  │  for this period.                                    │  │
│  │                                                       │  │
│  │  Period Information:                                 │  │
│  │  • Period: January 2024                              │  │
│  │  • Project: Malaria Control                          │  │
│  │  • Facility: Central Hospital                        │  │
│  │                                                       │  │
│  │  If you need to make changes, contact an admin.     │  │
│  │                                                       │  │
│  │  [📧 Contact Administrator]  [Close]                 │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    User Clicks              User Clicks
    "Contact Admin"          "Close"
         │                       │
         ▼                       ▼
┌─────────────────────┐  ┌─────────────────────┐
│  Opens Email Client │  │  Dialog Closes      │
│  - Pre-filled       │  │  - User returns to  │
│    subject          │  │    form             │
│  - Pre-filled body  │  │  - Can try again    │
│  - Period info      │  │    later            │
└─────────────────────┘  └─────────────────────┘
```

## Technical Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Component Layer                                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  PlanningForm / ExecutionForm                        │   │
│  │  - usePeriodLockError()                              │   │
│  │  - useCreatePlanning() / useCreateExecution()        │   │
│  │  - <PeriodLockErrorDialog />                         │   │
│  └────────────┬─────────────────────────────────────────┘   │
└───────────────┼─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Hook Layer                                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  usePeriodLockError                                  │   │
│  │  - State: showDialog, periodLockError                │   │
│  │  - Handler: handleMutationError()                    │   │
│  └────────────┬─────────────────────────────────────────┘   │
│               │                                             │
│  ┌────────────▼─────────────────────────────────────────┐   │
│  │  useCreatePlanning / useUpdatePlanning               │   │
│  │  - onPeriodLockError callback                        │   │
│  │  - checkPeriodLockError() utility                    │   │
│  └────────────┬─────────────────────────────────────────┘   │
└───────────────┼─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  API Layer                                                  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  POST /planning or /execution                        │   │
│  │  - validatePeriodLock middleware                     │   │
│  │  - periodLockService.validateEditOperation()         │   │
│  └────────────┬─────────────────────────────────────────┘   │
└───────────────┼─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│  Database Layer                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  period_locks table                                  │   │
│  │  - Check isLocked status                             │   │
│  │  - Validate user permissions                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Error Detection Logic

```typescript
// 1. API returns error
Response: {
  status: 403,
  message: "This reporting period is locked due to an approved financial report..."
}

// 2. Mutation hook receives error
onError: (error) => {
  // 3. Check if it's a period lock error
  const lockError = checkPeriodLockError(error);
  
  if (lockError.isPeriodLockError) {
    // 4. Call period lock error handler
    onPeriodLockError?.(error);
  } else {
    // 5. Handle other errors
    toast.error(error.message);
  }
}

// 6. usePeriodLockError hook handles the error
handleMutationError: (error) => {
  const lockError = checkPeriodLockError(error);
  
  if (lockError.isPeriodLockError) {
    // 7. Enrich with context
    setPeriodLockError({
      ...lockError,
      periodName: "January 2024",
      projectName: "Malaria Control",
      facilityName: "Central Hospital"
    });
    
    // 8. Show dialog
    setShowPeriodLockDialog(true);
  }
}
```

## State Management

```
Component State:
├── showPeriodLockDialog: boolean
│   └── Controls dialog visibility
│
├── periodLockError: PeriodLockErrorInfo | null
│   ├── isPeriodLockError: boolean
│   ├── message: string
│   ├── periodName?: string
│   ├── projectName?: string
│   ├── facilityName?: string
│   ├── lockedBy?: string
│   └── lockedAt?: string
│
└── Mutation State (from React Query)
    ├── isPending: boolean
    ├── isError: boolean
    ├── error: Error | null
    └── data: Response | undefined
```

## Integration Points

```
Form Component
    │
    ├─→ usePeriodLockError()
    │   ├─→ Returns: handleMutationError
    │   ├─→ Returns: showPeriodLockDialog
    │   └─→ Returns: periodLockError
    │
    ├─→ useCreatePlanning({ onPeriodLockError: handleMutationError })
    │   └─→ Calls handleMutationError on 403 errors
    │
    └─→ <PeriodLockErrorDialog
            open={showPeriodLockDialog}
            {...periodLockError}
        />
```

## Error Message Format

```
Default Toast (if no custom handler):
┌─────────────────────────────────────┐
│ ⚠️ Period Locked                    │
│                                     │
│ This reporting period is locked.    │
│ Contact an administrator to unlock. │
└─────────────────────────────────────┘

Dialog (with custom handler):
┌─────────────────────────────────────────────────┐
│ 🔒 Period Locked                                │
│                                                 │
│ This reporting period is locked due to an       │
│ approved financial report. You cannot create    │
│ or edit data for this period.                   │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ Period Information:                         │ │
│ │ • Period: January 2024                      │ │
│ │ • Project: Malaria Control                  │ │
│ │ • Facility: Central Hospital                │ │
│ │ • Locked by: John Doe                       │ │
│ │ • Locked at: 2024-01-15 10:30 AM           │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ If you need to make changes to this period,     │
│ please contact an administrator to request      │
│ an unlock.                                      │
│                                                 │
│ [📧 Contact Administrator]  [Close]             │
└─────────────────────────────────────────────────┘
```

## Email Template

```
To: admin@example.com
Subject: Period Unlock Request: January 2024

Hello,

I need to edit data for the following locked period:

Period: January 2024
Project: Malaria Control
Facility: Central Hospital

Reason for unlock request:
[User fills in their reason here]

Thank you.
```

## Responsive Behavior

```
Desktop (≥640px):
┌─────────────────────────────────────────────────┐
│ 🔒 Period Locked                                │
│                                                 │
│ [Content]                                       │
│                                                 │
│ [📧 Contact Administrator]  [Close]             │
└─────────────────────────────────────────────────┘

Mobile (<640px):
┌─────────────────────────────┐
│ 🔒 Period Locked            │
│                             │
│ [Content]                   │
│                             │
│ [📧 Contact Administrator]  │
│ [Close]                     │
└─────────────────────────────┘
```
