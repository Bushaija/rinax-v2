# Financial Report Viewer - Visual Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back]  View Financial Report                    [Status] 🔒 │
│  Report Code: FIN-2025-001                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [📷 Snapshot] Captured: Jan 15, 2025 at 2:30 PM                │
│  [🔒 Period Locked]                                              │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│  ⚠️ This report is locked and cannot be edited                  │
├─────────────────────────────────────────────────────────────────┤
│  Report Details                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Title: Monthly Financial Report                         │   │
│  │                                                          │   │
│  │ Report Data:                                            │   │
│  │ {                                                       │   │
│  │   "statement": { ... }                                  │   │
│  │ }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Report Information                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Project: Health Project      Facility: Main Hospital    │   │
│  │ Fiscal Year: 2025           Version: 1.1                │   │
│  │ Created: Jan 1, 2025        Updated: Jan 15, 2025       │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│  Version History                                Current: 1.1     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Ver │ Timestamp        │ Created By │ Changes │ Actions │   │
│  ├─────┼──────────────────┼────────────┼─────────┼─────────┤   │
│  │ 1.1 │ Jan 15, 2:30 PM │ John Doe   │ Updated │ [View]  │   │
│  │ 1.0 │ Jan 10, 9:00 AM │ Jane Smith │ Initial │ [View]  │   │
│  │     │                  │            │         │ [Compare]│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Badge States

### Snapshot Indicator

#### Live Data (Draft Reports)
```
┌──────────────────────┐
│ 📊 Live Data         │  ← Blue badge
└──────────────────────┘
Tooltip: "This report displays real-time data from the database.
         Data will update as changes are made to planning and 
         execution records."
```

#### Snapshot (Submitted/Approved Reports)
```
┌──────────────────────────────────────────────────┐
│ 📷 Snapshot  Captured: Jan 15, 2025 at 2:30 PM  │  ← Gray badge
└──────────────────────────────────────────────────┘
Tooltip: "This report displays frozen snapshot data captured at 
         submission. The data will not change even if source 
         records are updated."
```

#### Outdated Snapshot
```
┌──────────────────────────────────────────────────────────────────┐
│ 📷 Snapshot  Captured: Jan 15, 2025  ⚠️ Source data changed     │
└──────────────────────────────────────────────────────────────────┘
                                        ↑ Amber warning badge
Tooltip: "The underlying planning or execution data has been 
         modified since this snapshot was captured. Consider 
         resubmitting the report to create a new version with 
         updated data."
```

### Period Lock Badge

#### Locked Period
```
┌──────────────────────┐
│ 🔒 Period Locked     │  ← Red badge
└──────────────────────┘
Tooltip: "This reporting period is locked.
         This period is locked due to an approved financial report.
         Locked by: John Doe
         Locked: Jan 15, 2025 at 2:30 PM
         Contact an administrator to unlock this period if changes 
         are needed."
```

#### Unlocked Period
```
(No badge displayed)
```

## Version History Section

### Multiple Versions
```
┌─────────────────────────────────────────────────────────────────┐
│ Version History                              Current: 1.2        │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────┬──────────────────┬────────────┬─────────────┬─────────┐│
│ │ Ver │ Timestamp        │ Created By │ Changes     │ Actions ││
│ ├─────┼──────────────────┼────────────┼─────────────┼─────────┤│
│ │ 1.2 │ Jan 20, 3:45 PM │ 👤 John    │ Resubmitted │ [👁 View]││
│ │     │ 🕐              │            │ with fixes  │         ││
│ ├─────┼──────────────────┼────────────┼─────────────┼─────────┤│
│ │ 1.1 │ Jan 15, 2:30 PM │ 👤 John    │ Updated     │ [👁 View]││
│ │     │ 🕐              │            │ amounts     │ [⚖ Comp]││
│ ├─────┼──────────────────┼────────────┼─────────────┼─────────┤│
│ │ 1.0 │ Jan 10, 9:00 AM │ 👤 Jane    │ Initial     │ [👁 View]││
│ │     │ 🕐              │            │ version     │ [⚖ Comp]││
│ └─────┴──────────────────┴────────────┴─────────────┴─────────┘│
│                                                                  │
│ Total versions: 3                                                │
│ Each version represents a snapshot of the report at the time    │
│ of submission.                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Single Version (Hidden)
```
(Version History section not displayed)
```

## User Flows

### Flow 1: Viewing a Draft Report
1. User navigates to report page
2. Report status is "draft"
3. Component displays:
   - ✅ "Live Data" badge (blue)
   - ❌ No period lock badge (unless period is locked for other reasons)
   - ❌ No version history section
4. User sees real-time data from database

### Flow 2: Viewing a Submitted Report
1. User navigates to report page
2. Report status is "pending_daf_approval"
3. Component displays:
   - ✅ "Snapshot" badge with timestamp (gray)
   - ✅ Period lock badge (red) - if period is locked
   - ✅ Version history section - if multiple versions exist
4. User sees frozen snapshot data

### Flow 3: Viewing an Outdated Report
1. User navigates to report page
2. Report has `isOutdated: true`
3. Component displays:
   - ✅ "Snapshot" badge with timestamp
   - ✅ "Source data changed" warning badge (amber)
   - ✅ Period lock badge (if locked)
   - ✅ Version history section
4. User is warned that data has changed since snapshot

### Flow 4: Viewing Version History
1. User scrolls to bottom of page
2. If multiple versions exist:
   - Version history table is displayed
   - User can click "View" to see specific version (TODO)
   - User can click "Compare" to compare versions (TODO)
3. If single version:
   - Version history section is hidden

## Responsive Behavior

### Desktop (> 768px)
- Full layout as shown above
- Version history table shows all columns
- Badges display inline with full text

### Tablet (768px - 1024px)
- Slightly condensed layout
- Version history table may wrap
- Badges remain visible

### Mobile (< 768px)
- Stacked layout
- Version history table scrolls horizontally
- Badges may wrap to multiple lines

## Accessibility

- All badges have proper ARIA labels
- Tooltips are keyboard accessible
- Color is not the only indicator (icons + text)
- Proper heading hierarchy
- Focus management for interactive elements

## Color Scheme

### Light Mode
- Live Data Badge: Blue (bg-blue-50, border-blue-200, text-blue-700)
- Snapshot Badge: Gray (bg-gray-100, border-gray-300)
- Outdated Badge: Amber (bg-amber-100, border-amber-300, text-amber-800)
- Period Lock Badge: Red (bg-red-100, border-red-300, text-red-800)

### Dark Mode
- Live Data Badge: Blue (bg-blue-950, border-blue-800, text-blue-300)
- Snapshot Badge: Gray (bg-gray-800, border-gray-700)
- Outdated Badge: Amber (bg-amber-950, border-amber-800, text-amber-300)
- Period Lock Badge: Red (bg-red-950, border-red-800, text-red-300)

## Icons Used

- 📊 Activity (Live Data)
- 📷 Camera (Snapshot)
- ⚠️ AlertCircle (Outdated)
- 🔒 Lock (Period Locked)
- 🕐 Clock (Timestamp)
- 👤 User (Creator)
- 👁 Eye (View action)
- ⚖ GitCompare (Compare action)
