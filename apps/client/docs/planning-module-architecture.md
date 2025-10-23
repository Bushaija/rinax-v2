# Planning Module Architecture

## Overview

The Planning module is a schema-driven system for creating, editing, validating, and reviewing annual plans across projects and facilities. It uses server-defined form schemas to render dynamic client forms, performs server-side validation and computations, and persists normalized entries.

- **Server technologies**: Hono with zod-openapi, Drizzle ORM (PostgreSQL)
- **Client technologies**: Next.js (App Router), React Query, React Hook Form, shadcn/ui

---

## Database Schema (key tables)

- **`form_schemas`**: Stores versioned form schemas and metadata per module/project/facility type.
  - Path: `apps/server/src/db/schema/form-schemas/schema.ts`
  - Fields: `id`, `name`, `version`, `projectType`, `facilityType`, `moduleType`, `isActive`, `schema`, `metadata`, audit fields

- **`schema_form_data_entries`**: Persisted entries for schema-driven modules (entityType = 'planning').
  - Path: `apps/server/src/db/schema/schema-form-data-entries/schema.ts`
  - Fields: `id`, `schemaId`, `entityId` (planning activity), `entityType`, `projectId`, `facilityId`, `reportingPeriodId`, `formData`, `computedValues`, `validationState`, `metadata`, audit fields

- **`dynamicActivities`** and **`schemaActivityCategories`**: Dynamic activity and category catalogs used to render planning activities and groupings.
  - Exported via: `@/api/db/schema` (used in handlers)

- Related lookups (referenced in relations): `projects`, `facilities`, `reportingPeriods`, `users`.

---

## Server API Endpoints

Route registration: `apps/server/src/api/routes/planning/planning.index.ts`
Route definitions: `apps/server/src/api/routes/planning/planning.routes.ts`
Handlers: `apps/server/src/api/routes/planning/planning.handlers.ts`

- List planning entries
  - `GET /planning`
  - Query: pagination + filters via `planningListQuerySchema`
  - Response: `{ data: PlanningEntry[], pagination }`

- Get one planning entry
  - `GET /planning/{id}`
  - Response: `PlanningEntry`

- Create planning entry
  - `POST /planning`
  - Body: `insertPlanningDataSchema` (includes `schemaId`, `projectId`, `facilityId`, `reportingPeriodId?`, `formData`, `metadata?`)
  - Response: created `PlanningEntry`

- Update planning entry
  - `PUT /planning/{id}`
  - Body: `patchPlanningDataSchema`
  - Response: updated `PlanningEntry`

- Delete planning entry
  - `DELETE /planning/{id}`
  - Response: 204 No Content

- Calculate totals (server computation service)
  - `POST /planning/calculate-totals`
  - Body: `calculatePlanningTotalsSchema`
  - Response: `planningTotalsResponseSchema`

- Validate planning data (server validation service)
  - `POST /planning/validate`
  - Body: `validatePlanningDataSchema`
  - Response: `{ isValid, errors[], computedValues }`

- Get activities (dynamic catalog)
  - `GET /planning/activities`
  - Query: `{ projectType: HIV|Malaria|TB, facilityType: hospital|health_center }`
  - Response: `{ data: Activity[] }`

- Get planning form schema
  - `GET /planning/schema`
  - Query: `{ projectType: HIV|Malaria|TB, facilityType: hospital|health_center }`
  - Response: `{ data: { id, name, version, schema, metadata } }`

- Get planning data summary
  - `GET /planning/summary`
  - Query: `{ projectId, facilityId, reportingPeriodId? }`
  - Response: `{ data: SummaryRow[] }`

---

## Client Data Layer (fetchers)

Location: `apps/client/fetchers/planning/`

- Listing and details
  - `get-planning.ts` → `GET /planning` (filters, pagination)
  - `get-planning-list.ts` → `GET /planning` (URLSearchParams-based)
  - `get-planning-by-id.ts` → `GET /planning/{id}`

- Create/Update/Delete
  - `create-planning.ts` → `POST /planning`
  - `update-planning.ts` → `PUT /planning/{id}`
  - `validate-planning.ts` → `POST /planning/validate`

- Schema and activities
  - `get-planning-schema.ts` → `GET /planning/schema`
  - `get-planning-activitities.ts` → `GET /planning/activities`

- Calculations and summaries
  - `calculate-totals.ts` → `POST /planning/calculate-totals`
  - `get-data-summary.ts` → `GET /planning/summary`

- Aggregated helper
  - `planning-api.ts` consolidates common calls (types + thin wrappers)

---

## Client Hooks

Location: `apps/client/hooks/`

- Query hooks
  - `queries/use-get-planning.ts` → list planning entries
  - `queries/use-get-planning-details.ts` → planning detail by id
  - `queries/use-planning-list.ts` → list with params
  - `queries/use-get-planning-by-id.ts` → single by id
  - `queries/use-get-planning-schema.ts` → planning form schema
  - `queries/use-planning-activities.ts` → activities catalog

- Mutation hooks
  - `mutations/use-create-planning.ts` → create planning
  - `mutations/use-update-planning.ts` → update planning
  - `mutations/use-delete-planning.ts` → delete planning
  - `mutations/use-form-calculations.ts` → local computed totals helper

- Form state hooks
  - `use-planning-form.ts` (root) and `hooks/queries/use-planning-form.ts` → orchestrate schema, activities, calculations, RHF state, validation

---

## UI Components and Pages

Pages (Next.js App Router):
- `app/dashboard/planning/page.tsx` → Planning dashboard/list shell
- `app/dashboard/planning/new/page.tsx` → Create planning (uses enhanced form)
- `app/dashboard/planning/edit/[id]/page.tsx` → Edit planning
- `app/dashboard/planning/details/[id]/page.tsx` → Read-only details view
- Test harness equivalents under `app/dashboard/test-plan/*` for development/demo

Core planning UI components:
- V3 enhanced forms (`apps/client/features/planning/v3/`)
  - `enhanced-planning-form.tsx` → main create/edit form (schema-driven)
  - `readonly-planning-form.tsx` → read-only review form
  - `enhanced-category-section.tsx`, `readonly-category-section.tsx`, `planning-form-context.tsx`

- V2/V1 legacy components (`apps/client/features/planning/components/` and `v2/`)
  - `plan-form.tsx` → earlier comprehensive form
  - Subcomponents: `plan-activities-table.tsx`, `plan-form-actions.tsx`, `plan-metadata-header.tsx`, `form-error-summary.tsx`

- Listing tables
  - `app/dashboard/planning/_components/planning-table-columns.tsx`
  - `app/dashboard/test-plan/list/_components/planning-table-columns.tsx`

- Details view
  - `app/dashboard/planning/details/_components/planning-details-view.tsx`

Shared utilities:
- `apps/client/lib/planning` → transformations, formatting, storage, export, error handling, submission prep

---

## Data Flow (high level)

1) Client loads context (project, facility, reporting period) and fetches:
   - `GET /planning/schema` and `GET /planning/activities`
2) Form renders dynamically (RHF) with per-activity fields; as the user edits:
   - Local totals are computed (hook); optional `POST /planning/calculate-totals` for server parity
3) Validation via `POST /planning/validate` (server zod/business rules)
4) Persist via `POST /planning` (create) or `PUT /planning/{id}` (update)
5) Read/review via `GET /planning/{id}` and summary via `GET /planning/summary`

---

## Notes and Considerations

- Ensure `moduleType = 'planning'` in `form_schemas` drives schema selection based on `projectType` and `facilityType`.
- `schema_form_data_entries.entityType` is set to `'planning'` for module scoping.
- Activities and categories are dynamic; IDs map to `formData` keys by activity.
- Handlers rely on `computationService` and `validationService` for totals and validation.

---

## Quick References

- Server routes: `apps/server/src/api/routes/planning/*`
- DB schema exports: `apps/server/src/db/schema/*` (and `@/api/db/schema` barrel)
- Client fetchers: `apps/client/fetchers/planning/*`
- Client hooks: `apps/client/hooks/{queries,mutations}/*`
- UI: `apps/client/features/planning/*` and `apps/client/app/dashboard/planning/*`
