export interface UpdateUserRequest {
  userId: string;
  name?: string;
  email?: string;
  role?: "admin" | "accountant" | "program_manager";
  facilityId?: number | null;
  permissions?: string[];
  projectAccess?: number[];
  isActive?: boolean;
  mustChangePassword?: boolean;
}

async function updateUser({ userId, ...payload }: UpdateUserRequest) {
  const response = await fetch(`http://localhost:9999/api/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();
  return data;
}

export default updateUser;
