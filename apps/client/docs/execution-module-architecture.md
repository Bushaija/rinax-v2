# Execution Module Architecture (Dynamic, Schema-Driven)

## Overview

Execution is the second stage after Planning. It records implementation data for already planned activities, using the same schema-driven architecture as Planning:

- Server: Hono + zod-openapi, Drizzle ORM (PostgreSQL)
- Client: Next.js App Router, React Query, React Hook Form, shadcn/ui
- Data model: `form_schemas` and `schema_form_data_entries` with `entityType = 'execution'`

Goals:
- Replace hardcoded forms with dynamic schemas
- Compute balances and validate accounting equation at save-time
- Filter executions by facilities with existing plans

---

## Database Schema

Core tables (shared with Planning):
- `form_schemas` (`moduleType = 'execution'`)
  - Path: `apps/server/src/db/schema/form-schemas/schema.ts`
  - Keys: `projectType`, `facilityType`, `moduleType`, `schema`, `metadata`
- `schema_form_data_entries` (persist execution entries)
  - Path: `apps/server/src/db/schema/schema-form-data-entries/schema.ts`
  - Keys: `schemaId`, `entityType='execution'`, `projectId`, `facilityId`, `reportingPeriodId`, `formData`, `computedValues`, `validationState`, `metadata`

Execution-related catalogs and helpers:
- `dynamic_activities` and `schema_activity_categories` (if execution also needs activity catalogs by module)
  - Path: `apps/server/src/db/schema/dynamic-activities/schema.ts`, `.../schema-activity-categories/schema.ts`
- `events` and event mappings (for accounting categories and reporting)
  - Path: `apps/server/src/db/schema/events/schema.ts`, `.../configurable-event-mappings/schema.ts`

Data conventions:
- `form_schemas.moduleType = 'execution'` selects the form definition
- `schema_form_data_entries.entityType = 'execution'` scopes records to the module
- `computedValues` stores balances and derived totals
- `validationState` stores `{ isValid, isBalanced, lastValidated }`

---

## Server API

Location: `apps/server/src/api/routes/execution/`
- Index: `execution.index.ts`
- Routes: `execution.routes.ts`
- Handlers: `execution.handlers.ts`
- Types: `execution.types.ts`

Endpoints (subject to exact type contracts in `execution.routes.ts`):
- `GET /execution` — list entries
  - Query: pagination + filters via `executionListQuerySchema`
  - Response: `{ data: ExecutionEntry[], pagination }`
- `GET /execution/{id}` — get one entry
  - Response: `ExecutionEntry`
- `POST /execution` — create entry
  - Body: `insertExecutionDataSchema` (includes `schemaId`, `projectId`, `facilityId`, `reportingPeriodId`, `formData`, `metadata?`)
  - Flow: validate form data → compute balances → validate accounting equation → persist
- `PUT /execution/{id}` — update entry
  - Body: `patchExecutionDataSchema`
- `DELETE /execution/{id}` — delete entry
  - Response: 204 No Content
- `GET /execution/quarterly-summary` — aggregate by quarter
  - Query: project/facility/reporting period filters
  - Response: summary dataset
- `POST /execution/calculate-balances` — server-side calculations
  - Body: `calculateBalancesSchema`
  - Response: `balancesResponseSchema`
- `POST /execution/validate-accounting-equation` — validate F = G (if exposed separately)

Handler guarantees (from `execution.handlers.ts`):
- Uses `validationService.validateFormData(schemaId, formData)`
- Uses `computationService.calculateExecutionBalances(formData)`
- Validates accounting equation; stores `computedValues` and `validationState`

---

## Client Data Layer (Fetchers)

Location: `apps/client/fetchers/execution/`
- `get-executions.ts` → `GET /execution` (filters + pagination)
- `get-execution-by-id.ts` → `GET /execution/{id}`
- `create-execution.ts` → `POST /execution`
- `update-execution.ts` → `PUT /execution/{id}`
- `delete-execution.ts` → `DELETE /execution/{id}`
- `get-quarterly-summary.ts` → `GET /execution/quarterly-summary`
- `calculate-balances.ts` → `POST /execution/calculate-balances`

Conventions:
- Use `honoClient` proxy with typed `InferRequestType`/`InferResponseType`
- Centralize shared types and response shapes

---

## Client Hooks

Location: `apps/client/hooks/`

Queries:
- `queries/use-get-executions.ts` → list executions
- `queries/use-get-execution-by-id.ts` → detail
- `queries/use-get-execution-quarterly-summary.ts` → aggregates

Mutations:
- `mutations/use-create-execution.ts` → create
- `mutations/use-update-execution.ts` → update
- `mutations/use-delete-execution.ts` → delete
- `mutations/use-calculate-execution-balances.ts` → optional local calc call

Form state:
- `use-execution-form.ts` (to add) — mirrors planning’s `use-planning-form`:
  - Fetch `form_schemas` for moduleType `execution` by `projectType` and `facilityType`
  - Initialize RHF with schema defaults
  - Compute derived values locally; debounce where appropriate
  - Expose `validate` and `calculateBalances` helpers

---

## UI and Pages

Base folder: `apps/client/app/dashboard/execution/`

- Listing page: `page.tsx`
  - Columns: facility name, facility type, reporting period, program, created at, actions
  - Filters: search, facility type, program
  - Row actions: edit, details, delete
  - Table actions: new execution, export all, generate report, view
  - Facility filter dialog: show only facilities that have approved/available planned entries
  - Pagination: 10 rows per page
  - Component: `features/execution/execution-listing-table.tsx`

- Details page: `details/[id]/page.tsx` (to add)
  - Design mirrors planning details but uses execution schema/values
  - Read-only, grouped by categories/activities; shows computed balances

- New page: `new/page.tsx`
  - Renders `ExecutionForm` (schema-driven)
  - Initializes by `projectType`, `facilityType`, `reportingPeriodId`, and (optionally) references planned activities

- Edit page: `edit/[id]/page.tsx`
  - Loads entry by id and renders `ExecutionForm` in edit mode

Components (to align with Planning patterns):
- `features/execution/components/execution-form.tsx`
  - Schema-driven field rendering by sections/categories
  - Inline totals; server-validated balances on save
- `features/execution/components/*`
  - `category-section.tsx`, `form-actions.tsx`, `readonly-category-section.tsx`

---

## Data Flow

1) Context selection → restrict to facilities and projects with planned entries
2) Schema load → `GET form_schemas` filtered by `moduleType='execution'`, `projectType`, `facilityType`
3) Form render → RHF fields per schema; map to dynamic activities if applicable
4) Client calculations → local derived values; optional server `POST /execution/calculate-balances`
5) Validation → server `validateFormData` and accounting equation
6) Persistence → `POST /execution` or `PUT /execution/{id}`; response returns persisted entry with `computedValues`
7) Reporting & summaries → `GET /execution/quarterly-summary` and dedicated reports

---

## Filtering: Planned Facilities Only

- Server-side helper endpoint (to add): `GET /planning/available-facilities` or reuse planning summary to derive availability
- Listing query should include a filter `hasPlan=true` to restrict candidates
- Facility filter dialog consumes that endpoint

---

## Validation & Computation Rules

- Validation service enforces schema constraints and business rules (required fields, ranges)
- Computation service calculates execution balances:
  - Quarterly amounts, cumulative totals
  - Accounting checks (e.g., Surplus/Deficit, Net financial assets)
- Accounting equation check (F = G) must pass before persistence

---

## API Contracts (Draft Types)

ExecutionEntry:
```ts
interface ExecutionEntry {
  id: number;
  schemaId: number;
  entityType: 'execution';
  projectId: number;
  facilityId: number;
  reportingPeriodId?: number;
  formData: Record<string, any>;
  computedValues: Record<string, any>;
  validationState: { isValid: boolean; isBalanced?: boolean; lastValidated?: string };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

List query (example):
```ts
interface ExecutionListQuery {
  page?: number; // default 1
  limit?: number; // default 10
  facilityType?: 'hospital' | 'health_center';
  program?: 'HIV' | 'Malaria' | 'TB';
  search?: string;
}
```

---

## Implementation Plan (High-Level)

- Server
  - Ensure execution routes and types are finalized and documented in OpenAPI
  - Add endpoint for “planned facilities only” if not present
  - Seed `form_schemas` for `moduleType='execution'` by program and facility type

- Client
  - Implement `use-execution-form` mirroring planning
  - Build details page and refine listing table (filters, pagination, actions)
  - Wire facility filter dialog to planned facilities endpoint

- QA
  - Validate accounting equation path end-to-end
  - Verify pagination (10 per page) and all table actions (create/edit/details/delete/export/report)

---

## References

- Server routes: `apps/server/src/api/routes/execution/*`
- DB schema: `apps/server/src/db/schema/*`
- Client fetchers: `apps/client/fetchers/execution/*`
- Client hooks: `apps/client/hooks/{queries,mutations}/*`
- UI pages: `apps/client/app/dashboard/execution/*`

