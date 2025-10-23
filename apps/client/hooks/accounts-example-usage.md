# Accounts Hooks Usage Examples

This document provides examples of how to use the custom hooks for accounts and user management.

## Available Hooks

### Account Management Hooks

#### 1. User Registration (`useSignUp`)

```typescript
import { useSignUp } from "@/hooks/mutations";

function UserRegistrationForm() {
  const signUpMutation = useSignUp();

  const handleSubmit = async (formData: {
    name: string;
    email: string;
    password: string;
    role?: 'admin' | 'accountant' | 'project_manager';
    facilityId?: number;
    permissions?: string;
    projectAccess?: string;
  }) => {
    try {
      const result = await signUpMutation.mutateAsync(formData);
      console.log('User created:', result.user);
      console.log('Session:', result.session);
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button 
        type="submit" 
        disabled={signUpMutation.isPending}
      >
        {signUpMutation.isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  );
}
```

#### 2. Ban User (`useBanUser`)

```typescript
import { useBanUser } from "@/hooks/mutations";

function BanUserButton({ userId }: { userId: string | number }) {
  const banUserMutation = useBanUser();

  const handleBanUser = async (banReason: string, banExpiresIn?: number) => {
    try {
      const result = await banUserMutation.mutateAsync({
        userId,
        banReason,
        banExpiresIn, // Optional: ban duration in seconds
      });
      console.log('User banned:', result.user);
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  return (
    <button 
      onClick={() => handleBanUser('Policy violation', 604800)} // 1 week ban
      disabled={banUserMutation.isPending}
    >
      {banUserMutation.isPending ? 'Banning...' : 'Ban User'}
    </button>
  );
}
```

#### 3. Unban User (`useUnbanUser`)

```typescript
import { useUnbanUser } from "@/hooks/mutations";

function UnbanUserButton({ userId }: { userId: string | number }) {
  const unbanUserMutation = useUnbanUser();

  const handleUnbanUser = async (reason?: string) => {
    try {
      const result = await unbanUserMutation.mutateAsync({
        userId,
        reason, // Optional: reason for unbanning
      });
      console.log('User unbanned:', result.user);
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  return (
    <button 
      onClick={() => handleUnbanUser('Appeal approved')}
      disabled={unbanUserMutation.isPending}
    >
      {unbanUserMutation.isPending ? 'Unbanning...' : 'Unban User'}
    </button>
  );
}
```

### User Management Hooks

#### 4. Get Users List (`useGetUsers`)

```typescript
import { useGetUsers } from "@/hooks/queries";

function UsersList() {
  const { data, isLoading, error } = useGetUsers({
    page: '1',
    limit: '10',
    role: 'project_manager',
    isActive: 'true',
    search: 'john'
  });

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h2>Users ({data?.pagination.total})</h2>
      {data?.users.map(user => (
        <div key={user.id}>
          <h3>{user.name}</h3>
          <p>Email: {user.email}</p>
          <p>Role: {user.role}</p>
          <p>Status: {user.isActive ? 'Active' : 'Inactive'}</p>
        </div>
      ))}
    </div>
  );
}
```

#### 5. Get Single User (`useGetUser`)

```typescript
import { useGetUser } from "@/hooks/queries";

function UserProfile({ userId }: { userId: string | number }) {
  const { data: user, isLoading, error } = useGetUser({ userId });

  if (isLoading) return <div>Loading user...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
      <p>Facility: {user.facility?.name}</p>
      <p>Last Login: {user.lastLoginAt || 'Never'}</p>
    </div>
  );
}
```

## Advanced Usage Patterns

### Combining Hooks

```typescript
import { useGetUsers, useBanUser, useUnbanUser } from "@/hooks";

function UserManagementTable() {
  const { data: users, refetch } = useGetUsers();
  const banUserMutation = useBanUser();
  const unbanUserMutation = useUnbanUser();

  const handleBanUser = async (userId: string | number, reason: string) => {
    try {
      await banUserMutation.mutateAsync({ userId, banReason: reason });
      // Refetch users list to show updated status
      refetch();
    } catch (error) {
      console.error('Failed to ban user:', error);
    }
  };

  const handleUnbanUser = async (userId: string | number, reason?: string) => {
    try {
      await unbanUserMutation.mutateAsync({ userId, reason });
      // Refetch users list to show updated status
      refetch();
    } catch (error) {
      console.error('Failed to unban user:', error);
    }
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {users?.users.map(user => (
          <tr key={user.id}>
            <td>{user.name}</td>
            <td>{user.email}</td>
            <td>{user.role}</td>
            <td>{user.isActive ? 'Active' : 'Inactive'}</td>
            <td>
              {user.banned ? (
                <button 
                  onClick={() => handleUnbanUser(user.id, 'Appeal approved')}
                  disabled={unbanUserMutation.isPending}
                >
                  {unbanUserMutation.isPending ? 'Unbanning...' : 'Unban User'}
                </button>
              ) : (
                <button 
                  onClick={() => handleBanUser(user.id, 'Policy violation')}
                  disabled={banUserMutation.isPending}
                >
                  {banUserMutation.isPending ? 'Banning...' : 'Ban User'}
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### Error Handling

```typescript
import { useSignUp } from "@/hooks/mutations";
import { toast } from "@/hooks/use-toast";

function RegistrationForm() {
  const signUpMutation = useSignUp();

  const handleSubmit = async (formData: any) => {
    try {
      await signUpMutation.mutateAsync(formData);
      toast({
        title: "Success",
        description: "User created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  };

  // ... rest of component
}
```

## Type Safety

All hooks are fully typed with TypeScript. The request and response types are automatically inferred from the Hono client:

```typescript
import type { SignUpRequest, SignUpResponse } from "@/fetchers/accounts";
import type { GetUsersRequest, GetUsersResponse } from "@/fetchers/users";

// Use these types in your components for better type safety
const signUpData: SignUpRequest = {
  name: "John Doe",
  email: "john@example.com",
  password: "securepassword123",
  role: "project_manager",
  facilityId: 1,
};
```

## Query Key Management

The hooks follow a consistent query key structure:

- Users list: `["users", "list", { filters }]`
- Single user: `["users", userId]`

This ensures proper cache invalidation and updates across the application.
