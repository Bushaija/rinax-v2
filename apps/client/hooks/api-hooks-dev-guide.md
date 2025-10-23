# API Hooks Development Guide

## Overview

This guide establishes fundamental practices for creating custom hooks that integrate Hono client with TanStack Query. Follow these patterns to ensure consistency, type safety, and maintainability across the application.

## Architecture Overview

```
packages/api-client/
├── src/index.ts          # Main API client setup
apps/client/
├── fetchers/             # Raw API functions
├── hooks/
│   ├── mutations/        # Mutation hooks
│   └── queries/          # Query hooks
└── query-client/         # Query client configuration
```

## Core Components

### 1. API Client Setup (`packages/api-client/src/index.ts`)

The foundation of our API integration:

```typescript
import { hc } from "hono/client";
import type { router } from "@/api/routes"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';
export const honoClient = hc<router>(API_BASE_URL);

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleHonoResponse<T>(
  honoPromise: Promise<Response>
): Promise<T> {
  try {
    const response = await honoPromise;
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error or invalid JSON response', 0, error);
  }
}
```

### 2. Query Client Configuration (`apps/client/query-client/index.ts`)

Global configuration for TanStack Query:

```typescript
import { QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          if (
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError") ||
            error.message.includes("CORS")
          ) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

export default queryClient;
```

## Development Patterns

### 1. Creating Fetcher Functions

**Location**: `apps/client/fetchers/{resource}/{action}.ts`

**Naming Convention**: `{action}{Resource}` (e.g., `createProject`, `getProject`)

**Template**:
```typescript
import { honoClient as client } from "@/api-client/index";
import type { InferRequestType, InferResponseType } from "hono/client";

// Type inference for request payload
export type CreateProjectRequest = InferRequestType<
  (typeof client)["project"]["$post"]
>["json"];

// Type inference for response data
export type CreateProjectResponse = InferResponseType<
  (typeof client)["project"]["$post"]
>;

async function createProject({
  name,
  slug,
  workspaceId,
  icon,
}: CreateProjectRequest) {
  const response = await client.project.$post({
    json: { name, slug, icon, workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default createProject;
```

**Key Requirements**:
- Import `honoClient` as `client`
- Use `InferRequestType` and `InferResponseType` for type safety
- Handle error responses consistently
- Export types for use in hooks
- Default export the function

### 2. Creating Query Hooks

**Location**: `apps/client/hooks/queries/use-{action}-{resource}.ts`

**Naming Convention**: `use{Action}{Resource}` (e.g., `useGetProject`)

**Template**:
```typescript
import getProject from "@/fetchers/project/get-project";
import { useQuery } from "@tanstack/react-query";

function useGetProject({
  id,
  workspaceId,
}: { 
  id: string; 
  workspaceId: string 
}) {
  return useQuery({
    queryFn: () => getProject({ id, workspaceId }),
    queryKey: ["projects", workspaceId, id],
    enabled: !!id && !!workspaceId, // Enable only when required params exist
  });
}

export default useGetProject;
```

**Key Requirements**:
- Import the corresponding fetcher function
- Use descriptive parameter object destructuring
- Include `enabled` condition for conditional queries
- Follow query key hierarchy: `[resource, ...identifiers]`

### 3. Creating Mutation Hooks

**Location**: `apps/client/hooks/mutations/use-{action}-{resource}.ts`

**Naming Convention**: `use{Action}{Resource}` (e.g., `useCreateProject`)

**Template**:
```typescript
import createProject from "@/fetchers/project/create-project";
import { useMutation, useQueryClient } from "@tanstack/react-query";

function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createProject,
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: ["projects", variables.workspaceId]
      });
      
      // Optionally add optimistic updates
      queryClient.setQueryData(
        ["projects", variables.workspaceId, data.id],
        data
      );
    },
    onError: (error) => {
      // Handle errors globally or per mutation
      console.error("Failed to create project:", error);
    },
  });
}

export default useCreateProject;
```

**Key Requirements**:
- Import the corresponding fetcher function
- Include `useQueryClient` for cache management
- Implement `onSuccess` for cache invalidation/updates
- Include error handling in `onError`

## Best Practices

### Type Safety
- Always use `InferRequestType` and `InferResponseType` from Hono client
- Export types from fetcher functions for reuse in hooks and components
- Use TypeScript strict mode and enable all type checking

### Error Handling
- Use the provided `ApiError` class for consistent error handling
- Implement global error handling in mutation hooks
- Consider using error boundaries for query errors

### Query Keys
- Follow hierarchical structure: `[resource, ...identifiers]`
- Include all relevant parameters that affect the data
- Use consistent naming across related queries

### Cache Management
- Invalidate related queries after mutations
- Use optimistic updates where appropriate
- Consider implementing background refetching for real-time data

### Performance
- Use `enabled` option to prevent unnecessary requests
- Implement proper loading and error states
- Consider using `select` option for data transformation

## Advanced Patterns

### Conditional Hooks
```typescript
function useGetProject({ id, workspaceId }: { id?: string; workspaceId: string }) {
  return useQuery({
    queryFn: () => getProject({ id: id!, workspaceId }),
    queryKey: ["projects", workspaceId, id],
    enabled: !!id && !!workspaceId,
  });
}
```

### Optimistic Updates
```typescript
function useUpdateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: updateProject,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: ["projects", variables.workspaceId, variables.id]
      });
      
      const previousProject = queryClient.getQueryData(
        ["projects", variables.workspaceId, variables.id]
      );
      
      queryClient.setQueryData(
        ["projects", variables.workspaceId, variables.id],
        { ...previousProject, ...variables }
      );
      
      return { previousProject };
    },
    onError: (error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(
          ["projects", variables.workspaceId, variables.id],
          context.previousProject
        );
      }
    },
  });
}
```

### Infinite Queries
```typescript
function useGetProjects({ workspaceId }: { workspaceId: string }) {
  return useInfiniteQuery({
    queryFn: ({ pageParam = 1 }) => getProjects({ workspaceId, page: pageParam }),
    queryKey: ["projects", workspaceId],
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
    enabled: !!workspaceId,
  });
}
```

## Checklist for New Hooks

### Before Implementation
- [ ] Define the API endpoint structure in Hono router
- [ ] Ensure proper typing in the backend API
- [ ] Plan the query key hierarchy

### Fetcher Function
- [ ] Located in correct directory: `fetchers/{resource}/{action}.ts`
- [ ] Uses proper naming convention
- [ ] Imports `honoClient` as `client`
- [ ] Uses `InferRequestType` and `InferResponseType`
- [ ] Handles errors consistently
- [ ] Exports types and function

### Hook Implementation
- [ ] Located in correct directory: `hooks/{queries|mutations}/use-{action}-{resource}.ts`
- [ ] Uses proper naming convention
- [ ] Imports corresponding fetcher function
- [ ] Implements proper query key structure
- [ ] Includes `enabled` condition for queries
- [ ] Implements cache invalidation for mutations
- [ ] Includes error handling

### Testing Considerations
- [ ] Test error scenarios
- [ ] Verify cache invalidation works correctly
- [ ] Check loading and error states
- [ ] Validate type safety

## Common Pitfalls

1. **Inconsistent Query Keys**: Ensure all related queries use the same key structure
2. **Missing Error Handling**: Always implement proper error handling in both fetchers and hooks
3. **Cache Invalidation**: Don't forget to invalidate related queries after mutations
4. **Type Safety**: Always use Hono's type inference instead of manual typing
5. **Conditional Logic**: Use `enabled` option instead of conditional hook calls

## Migration Guide

When updating existing hooks to follow these patterns:

1. Move API calls to separate fetcher functions
2. Update imports to use the new fetcher functions
3. Ensure proper type inference is used
4. Implement consistent error handling
5. Update query keys to follow the hierarchical structure
6. Add proper cache invalidation to mutations

Following these patterns will ensure consistent, maintainable, and type-safe API integrations across the application.