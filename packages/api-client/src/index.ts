import { hc } from "hono/client";
import type { router } from "@/api/routes/index"

const API_BASE_URL = 'http://localhost:9999/api';

export const honoClient = hc<router>(API_BASE_URL, {
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: 'include',
    });
  },
});

export type HonoClient = typeof honoClient;

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

export type ErrorSchema = {
  error: {
    issues: {
      code: string;
      path: (string | number)[];
      message?: string | undefined;
    }[];
    name: string;
  };
  success: boolean;
};