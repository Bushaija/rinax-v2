# Requirements Document

## Introduction

This feature addresses two issues with the planning form in readonly mode:
1. The form table is not horizontally scrollable when displayed in readonly mode on the planning details page
2. The planning details page uses "edit" mode with a readOnly flag, which is semantically incorrect and causes styling issues

## Glossary

- **EnhancedPlanningForm**: The main planning form component that displays planning activities in a table format
- **Planning Details Page**: The page that displays planning data in readonly mode at `/dashboard/planning/details/[id]`
- **Readonly Mode**: A display mode where form inputs are disabled and users can only view data
- **Horizontal Scrolling**: The ability to scroll the table left and right to view columns that don't fit on screen

## Requirements

### Requirement 1: Enable Horizontal Scrolling in Readonly Mode

**User Story:** As a user viewing planning details, I want to scroll horizontally through the planning table, so that I can view all columns when they don't fit on my screen.

#### Acceptance Criteria

1. WHEN the EnhancedPlanningForm is rendered with readOnly prop set to true, THE table container SHALL remain horizontally scrollable
2. WHEN the user attempts to scroll the table horizontally in readonly mode, THE table SHALL respond to scroll gestures and display hidden columns
3. WHILE the form is in readonly mode, THE table container SHALL maintain the overflow-x-auto CSS class without pointer-events-none interference
4. THE EnhancedPlanningForm SHALL apply pointer-events-none only to interactive form elements (inputs, buttons) and not to the scrollable container

### Requirement 2: Support View Mode for Planning Details

**User Story:** As a developer, I want the planning details page to use a semantically correct "view" mode instead of "edit" mode with readOnly flag, so that the component behavior is clearer and more maintainable.

#### Acceptance Criteria

1. THE EnhancedPlanningForm SHALL accept a mode value of "view" in addition to "create" and "edit"
2. WHEN mode is set to "view", THE EnhancedPlanningForm SHALL automatically apply readonly behavior without requiring a separate readOnly prop
3. WHEN mode is set to "view", THE EnhancedPlanningForm SHALL hide form action buttons (save, submit, cancel)
4. THE planning details page SHALL use mode="view" instead of mode="edit" with readOnly prop
5. WHILE maintaining backward compatibility, THE EnhancedPlanningForm SHALL continue to support the readOnly prop for existing implementations
