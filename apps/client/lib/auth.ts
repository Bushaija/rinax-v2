import {
    adminClient,
  } from "better-auth/client/plugins";
  import { createAuthClient } from "better-auth/react";
  
  export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:9999",
    // plugins: [adminClient()],
    plugins: [adminClient()],
    fetchOptions: {
      credentials: "include",
    },
  });