import { createRoute, z } from "@hono/zod-openapi"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import { errorSchema, authResponseSchema } from "./auth.types"


const tags = ["accounts"]

const banUserResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  user: z.object({
    id: z.union([z.string(), z.number()]),
    email: z.string(),
    banned: z.boolean(),
    banReason: z.string().nullable(),
    banExpires: z.string().nullable(),
  }),
});

// Enhanced Sign up route
export const signUp = createRoute({
  path: "/accounts/sign-up",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(['admin', 'accountant', "project_manager"]).optional(),
        facilityId: z.number().optional(),
        permissions: z.array(z.string()).optional().default([]),
        projectAccess: z.array(z.number()).optional().default([]),
        mustChangePassword: z.boolean().optional(),
        isActive: z.boolean().optional(),
        banned: z.boolean().optional(),
        banReason: z.string().optional(),
        banExpires: z.string().optional(),
      }).refine((data) => {
        // If banned is true, banReason should be provided
        if (data.banned && !data.banReason) {
          return false;
        }
        return true;
      }, "Ban reason is required when user is banned"),
      "Enhanced user registration data"
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      authResponseSchema,
      "User registered successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorSchema,
      "User already exists"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions or signup disabled"
    ),
  },
});

export const banUser = createRoute({
  path: "/accounts/ban-user",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        userId: z.union([z.string(), z.number()]).transform((val) => 
          typeof val === 'string' ? parseInt(val, 10) : val
        ),
        banReason: z.string().min(1, "Ban reason is required"),
        banExpiresIn: z.number().optional().describe("Ban duration in seconds (optional for permanent ban)"),
        banExpiresAt: z.string().datetime().optional().describe("Specific ban expiration date (alternative to banExpiresIn)"),
      }).refine((data) => {
        // Either banExpiresIn or banExpiresAt can be provided, but not both
        if (data.banExpiresIn && data.banExpiresAt) {
          return false;
        }
        return true;
      }, "Cannot specify both banExpiresIn and banExpiresAt"),
      "User ban data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      banUserResponseSchema,
      "User banned successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorSchema,
      "User already banned"
    ),
  },
});

// Unban user route
export const unbanUser = createRoute({
  path: "/accounts/unban-user",
  method: "post",
  tags: ["User Management"],
  request: {
    body: jsonContentRequired(
      z.object({
        userId: z.union([z.string(), z.number()]).transform((val) => 
          typeof val === 'string' ? parseInt(val, 10) : val
        ),
        reason: z.string().optional().describe("Reason for unbanning (optional)"),
      }),
      "User unban data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        user: z.object({
          id: z.union([z.string(), z.number()]),
          email: z.string(),
          banned: z.boolean(),
          banReason: z.string().nullable(),
          banExpires: z.string().nullable(),
        }),
      }),
      "User unbanned successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.NOT_FOUND]: jsonContent(
      errorSchema,
      "User not found"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Insufficient permissions"
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      errorSchema,
      "User not currently banned"
    ),
  },
});

// Sign in route
export const signIn = createRoute({
  path: "/accounts/sign-in",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.email("Invalid email address"),
        password: z.string().min(1, "Password is required"),
        rememberMe: z.boolean().optional(),
      }),
      "User login credentials"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      authResponseSchema.extend({
        mustChangePassword: z.boolean().optional(),
        message: z.string().optional(),
      }),
      "Signed in successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Invalid credentials"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Account deactivated"
    ),
  },
})

// OTP sign in route
// export const signInOtp = createRoute({
//   path: "/accounts/sign-in/otp",
//   method: "post", 
//   tags,
//   request: {
//     body: jsonContentRequired(
//       z.object({
//         email: z.email("Invalid email address"),
//       }),
//       "Email for OTP sign in"
//     ),
//   },
//   responses: {
//     [HttpStatusCodes.OK]: jsonContent(
//       z.object({
//         message: z.string(),
//       }),
//       "OTP sent successfully"
//     ),
//     [HttpStatusCodes.BAD_REQUEST]: jsonContent(
//       errorSchema,
//       "Invalid email"
//     ),
//     [HttpStatusCodes.NOT_FOUND]: jsonContent(
//       errorSchema,
//       "Account not found"
//     ),
//     [HttpStatusCodes.FORBIDDEN]: jsonContent(
//       errorSchema,
//       "Account deactivated"
//     ),
//   },
// })

// Verify OTP route
export const verifyOtp = createRoute({
  path: "/accounts/verify-otp",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.email("Invalid email address"),
        otp: z.string().length(6, "OTP must be 6 digits"),
      }),
      "OTP verification data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      authResponseSchema.extend({
        mustChangePassword: z.boolean().optional(),
        message: z.string().optional(),
      }),
      "OTP verified successfully"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Invalid OTP"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Account deactivated"
    ),
  },
})

// Sign out route
export const signOut = createRoute({
  path: "/accounts/sign-out",
  method: "post",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Signed out successfully"
    ),
  },
})

// Get current session route
export const getSession = createRoute({
  path: "/accounts/session",
  method: "get",
  tags,
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      authResponseSchema.extend({
        mustChangePassword: z.boolean().optional(),
      }),
      "Current session"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Not authenticated"
    ),
    [HttpStatusCodes.FORBIDDEN]: jsonContent(
      errorSchema,
      "Account deactivated"
    ),
  },
})

// Refresh session route
// export const refreshSession = createRoute({
//   path: "/accounts/refresh",
//   method: "post",
//   tags,
//   responses: {
//     [HttpStatusCodes.OK]: jsonContent(
//       authResponseSchema.extend({
//         mustChangePassword: z.boolean().optional(),
//       }),
//       "Session refreshed"
//     ),
//     [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
//       errorSchema,
//       "Invalid refresh token"
//     ),
//     [HttpStatusCodes.FORBIDDEN]: jsonContent(
//       errorSchema,
//       "Account deactivated"
//     ),
//   },
// })

// Update profile route
export const updateProfile = createRoute({
  path: "/accounts/profile",
  method: "put",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters").optional(),
        email: z.email("Invalid email address").optional(),
        currentPassword: z.string().optional(),
        newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
      }),
      "Profile update data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        user: authResponseSchema.shape.user,
        message: z.string(),
      }),
      "Profile updated successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
  },
});

// Force password change route (for first-time login)
export const forcePasswordChange = createRoute({
  path: "/accounts/force-password-change",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }),
      "Password change data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Password changed successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid input data or password change not required"
    ),
    [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
      errorSchema,
      "Authentication required"
    ),
  },
})

// Forgot password route
export const forgotPassword = createRoute({
  path: "/accounts/forgot-password",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.email("Invalid email address"),
      }),
      "Email for password reset"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Password reset email sent"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid email"
    ),
  },
})

// Reset password route
export const resetPassword = createRoute({
  path: "/accounts/reset-password",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.email("Invalid email address"),
        // otp: z.string().length(6, "OTP must be 6 digits"),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }),
      "Password reset data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Password reset successfully"
    ),
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      errorSchema,
      "Invalid data"
    ),
  },
})

// Verify email route (disabled for regular users)
export const verifyEmail = createRoute({
  path: "/accounts/verify-email",
  method: "post",
  tags,
  request: {
    body: jsonContentRequired(
      z.object({
        email: z.email("Invalid email address"),
        otp: z.string().length(6, "OTP must be 6 digits"),
      }),
      "Email verification data"
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "Email verification handled by administrators"
    ),
  },
})

// // OAuth callback routes (handled by Better Auth internally)
// export const googleCallback = createRoute({
//   path: "/accounts/callback/google",
//   method: "get",
//   tags,
//   responses: {
//     [HttpStatusCodes.MOVED_TEMPORARILY]: {
//       description: "Redirect to frontend with auth result",
//     },
//   },
// })

// export const githubCallback = createRoute({
//   path: "/accounts/callback/github", 
//   method: "get",
//   tags,
//   responses: {
//     [HttpStatusCodes.MOVED_TEMPORARILY]: {
//       description: "Redirect to frontend with auth result",
//     },
//   },
// })

// Export types for handlers
export type SignUpRoute = typeof signUp
export type BanUser = typeof banUser;
export type UnbanUser = typeof unbanUser;
export type SignInRoute = typeof signIn
// export type SignInOtpRoute = typeof signInOtp
export type VerifyOtpRoute = typeof verifyOtp
export type SignOutRoute = typeof signOut
export type GetSessionRoute = typeof getSession
// export type RefreshSessionRoute = typeof refreshSession
export type UpdateProfileRoute = typeof updateProfile
export type ForcePasswordChangeRoute = typeof forcePasswordChange
export type ForgotPasswordRoute = typeof forgotPassword
export type ResetPasswordRoute = typeof resetPassword
export type VerifyEmailRoute = typeof verifyEmail