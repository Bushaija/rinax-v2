# Execution Module – Step-by-Step Development Plan

## 1. Foundations (Architecture & Seeds)
- **Confirm schema-driven approach**: reuse `form_schemas` and `schema_form_data_entries` with `moduleType='execution'` and `entityType='execution'`.
- **Seed execution schemas**: create `form_schemas` for each `projectType` × `facilityType` needed.
- **Align services**: ensure `computationService.calculateExecutionBalances` and validation service cover execution rules.
- **Decide planned-facilities strategy**: server endpoint or derive from planning summary.

Deliverables:
- SQL/seed scripts for execution `form_schemas`
- Unit tests for computation/validation

## 2. Server API Readiness
- Finalize `apps/server/src/api/routes/execution/*`:
  - List, detail, create, update, delete
  - `quarterly-summary`, `calculate-balances`, optional `validate-accounting-equation`
- Add planned-facilities endpoint if required (or extend planning summary).
- OpenAPI docs updated; regression tests.

Deliverables:
- Route/type updates, handlers wired to services
- OpenAPI build passes

## 3. Client Data Layer (Fetchers)
- Implement/verify fetchers in `apps/client/fetchers/execution/*`:
  - `get-executions`, `get-execution-by-id`
  - `create-execution`, `update-execution`, `delete-execution`
  - `get-quarterly-summary`, `calculate-balances`
- Add fetcher for planned-facilities filter.

Deliverables:
- All fetchers typed with `InferRequestType`/`InferResponseType`
- Error handling normalized

## 4. Client Hooks (Queries/Mutations)
- Queries: `useGetExecutions`, `useGetExecutionById`, `useGetExecutionQuarterlySummary`.
- Mutations: `useCreateExecution`, `useUpdateExecution`, `useDeleteExecution`, `useCalculateExecutionBalances`.
- Add `usePlannedFacilities` (or reuse planning hook) for dialog.

Deliverables:
- Hook tests (React Query cache keys, enabled flags)

## 5. Execution Form State Hook
- Create `use-execution-form` mirroring planning:
  - Load execution schema by `projectType` and `facilityType`.
  - Initialize RHF defaults; expose `onFieldChange` and derived totals.
  - Integrate server `calculate-balances` for parity when saving.
  - Provide `validate` method to preflight save.

Deliverables:
- Hook with storybook/dev harness if applicable

## 6. Listing Page
- Implement `app/dashboard/execution/page.tsx` listing:
  - Columns: facility, facility type, reporting period, program, created at, actions
  - Filters: search, facility type, program
  - Row actions: edit, details, delete
  - Table actions: new execution, export all, generate report, view
  - Pagination: 10 rows per page
  - Facility filter dialog: planned facilities only

Deliverables:
- `ExecutionListingTable` with responsive UI and empty/loading states

## 7. New Execution Page
- Implement `new/page.tsx`:
  - Route params/query: facility, program, facilityType, reportingPeriodId
  - Render schema-driven `ExecutionForm`
  - Save flow: validate → calculate balances → create → toast → redirect

Deliverables:
- Form UX parity with planning

## 8. Edit Execution Page
- Implement `edit/[id]/page.tsx`:
  - Preload entry → hydrate `ExecutionForm`
  - Update flow with optimistic UX and cache updates

Deliverables:
- Error/edge cases covered (not found, conflict)

## 9. Details Page (Read-only)
- Implement `details/[id]/page.tsx`:
  - Read-only rendering of categories/activities with computed balances

Deliverables:
- Export to CSV/PDF hooks prepared for future

## 10. Reports and Export
- Wire `generate report` and `export all` actions:
  - Use `quarterly-summary` and events mapping as needed
  - Normalize CSV export structure

Deliverables:
- Download flows with progress/error states

## 11. Planned Facilities Filter
- Implement dialog to show only facilities with available plans:
  - Backed by planned-facilities endpoint or planning summary
  - Pass selected context to `new/page.tsx`

Deliverables:
- `FacilityFilterDialog` integration and tests

## 12. Validation & Accounting QA
- Unit/integration tests for:
  - Validation failures (required fields, ranges)
  - Balance calculation parity with server
  - Accounting equation enforcement (F = G)

Deliverables:
- Test matrix and CI green

## 13. Performance & UX
- Skeletons for list/form
- Debounced local calculations; avoid unnecessary re-renders
- Accessibility checks for tables/forms

Deliverables:
- Lighthouse/AXE checks passed for key pages

## 14. Security & Permissions
- Ensure route/handler guards (role checks) align with accountant persona
- Confirm client navigation guards where appropriate

Deliverables:
- E2E tests for unauthorized access

## 15. Rollout Plan
- Feature flag for execution module
- Migrate initial schemas & pilot facilities
- Observability: logs/metrics around validation failures and equation mismatches

Deliverables:
- Rollout checklist and fallback plan

## Ownership & Workstream Breakdown
- Backend: routes, services, seeds, planned-facilities endpoint
- Frontend Data: fetchers, hooks, form state hook
- Frontend UI: pages, forms, tables, dialogs
- QA: tests (unit/integration/E2E), accessibility, performance

## Definition of Done
- All endpoints documented and covered by tests
- CRUD + calculations + validation flows working end-to-end
- Listing (10/page), filters, actions, details operational
- Planned-facilities dialog filters correctly
- OpenAPI and docs updated, no critical lint/type issues

