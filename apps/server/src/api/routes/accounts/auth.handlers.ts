import { count, eq } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import * as HttpStatusCodes from "stoker/http-status-codes"

import { db } from '@/api/db'
import { auth } from '@/api/lib/auth'
import * as schema from '@/api/db/schema'
import type { AppRouteHandler } from "@/api/lib/types"
import { ValidationService } from '../../services/validation.service'
import type {
  SignUpRoute,
  SignInRoute,
  // SignInOtpRoute,
  // VerifyOtpRoute,
  SignOutRoute,
  GetSessionRoute,
  // RefreshSessionRoute,
  UpdateProfileRoute,
  ForgotPasswordRoute,
  ResetPasswordRoute,
  VerifyEmailRoute,
  ForcePasswordChangeRoute,
  BanUser,
  UnbanUser,
} from "./auth.routes"


// Enhanced helper function to format user response
const formatUserResponse = (user: any, session: any) => {
  // Helper function to safely convert dates to ISO string
  const safeToISOString = (date: any) => {
    if (!date) return null;
    try {
      // If it's already a Date object
      if (date instanceof Date) {
        return date.toISOString();
      }
      // If it's a string or number, try to create a Date
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return null;
      }
      return parsedDate.toISOString();
    } catch (error) {
      console.warn('Date conversion error:', error);
      return null;
    }
  };

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      facilityId: user.facilityId,
      districtId: user.districtId,
      permissions: user.permissions || [],
      projectAccess: user.projectAccess || [],
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      banned: user.banned,
      banReason: user.banReason,
      banExpires: safeToISOString(user.banExpires),
      lastLoginAt: safeToISOString(user.lastLoginAt),
      createdAt: safeToISOString(user.createdAt),
      updatedAt: safeToISOString(user.updatedAt),
    },
    session: {
      id: session.id,
      token: session.token,
      expiresAt: safeToISOString(session.expiresAt),
    },
  };
};

export const formatBanDuration = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  }
};

// Common ban duration constants (in seconds)
export const BAN_DURATIONS = {
  ONE_HOUR: 60 * 60,
  ONE_DAY: 60 * 60 * 24,
  ONE_WEEK: 60 * 60 * 24 * 7,
  ONE_MONTH: 60 * 60 * 24 * 30,
  THREE_MONTHS: 60 * 60 * 24 * 90,
  SIX_MONTHS: 60 * 60 * 24 * 180,
  ONE_YEAR: 60 * 60 * 24 * 365,
} as const;

export const signUp: AppRouteHandler<SignUpRoute> = async (c) => {
  const { 
    name, 
    email, 
    password, 
    role, 
    facilityId, 
    permissions,
    projectAccess,
    mustChangePassword,
    isActive,
    banned,
    banReason,
    banExpires
  } = await c.req.json()

  try {
    if (process.env.DISABLE_SIGNUP === "true") {
      const userCount = await db
        .select({ count: count() })
        .from(schema.users);
      
      const totalUsers = userCount[0]?.count || 0
      
      if (totalUsers > 0) {
        throw new HTTPException(403, {
          message: "Public registration is disabled. Please contact an administrator to create your account.",
        })
      }
    }

    // For development mode, allow signup but with warnings
    if (process.env.NODE_ENV === "development" && process.env.DISABLE_SIGNUP !== "true") {
      console.warn("WARNING: Public signup is enabled in development mode")
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    })

    if (existingUser) {
      throw new HTTPException(409, {
        message: "User with this email already exists",
      })
    }

    // Validate facility if provided
    if (facilityId) {
      const facility = await db.query.facilities.findFirst({
        where: eq(schema.facilities.id, facilityId)
      })
      if (!facility) {
        throw new HTTPException(400, {
          message: "Invalid facility ID",
        })
      }
    }

    const [district] = await db
      .select({ districtId: schema.facilities.districtId})
      .from(schema.facilities)
      .where(eq(schema.facilities.id, facilityId))
      .limit(1)
    console.log("district: ", district)
    if (!district) {
      throw new HTTPException(400, {
        message: "Invalid district ID",
      })
    }


    // Validate project access if provided
    if (projectAccess && projectAccess.length > 0) {
      await ValidationService.validateProjectAccess(projectAccess);
    }

    // Validate permissions if provided
    if (permissions && permissions.length > 0) {
      await ValidationService.validatePermissions(permissions);
    }

    // Check if this will be the first user
    const currentUserCount = await db
      .select({ count: count() })
      .from(schema.users)
    
    const isFirstUser = (currentUserCount[0]?.count || 0) === 0

    // Prepare custom headers for better-auth
    const customHeaders = new Headers(c.req.raw.headers)
    customHeaders.set('x-signup-role', role || 'accountant')
    if (facilityId) customHeaders.set('x-signup-facility-id', facilityId.toString())

    // Create user with better-auth first
    const result = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
      headers: customHeaders,
    })

    // Update user with additional fields after creation
    let responseUser: any = result.user
    if (result.user) {
      const updateData: any = {
        role: role || 'accountant',
      };

      // Add optional fields if provided
      if (facilityId !== undefined) updateData.facilityId = facilityId;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (projectAccess !== undefined) updateData.projectAccess = projectAccess;
      if (mustChangePassword !== undefined) updateData.mustChangePassword = mustChangePassword;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (banned !== undefined) updateData.banned = banned;
      if (banReason !== undefined && banReason.trim() !== "") updateData.banReason = banReason;
      if (banExpires !== undefined && banExpires.trim() !== "") {
        try {
          updateData.banExpires = new Date(banExpires);
          if (isNaN(updateData.banExpires.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (error) {
          throw new HTTPException(400, {
            message: "Invalid banExpires date format",
          });
        }
      }

      // Update the user record with additional fields
      const [updatedUser] = await db
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, parseInt(result.user.id)))
        .returning();

      // Build response user without mutating typed auth object
      responseUser = { 
        ...result.user, 
        ...updatedUser, 
        id: updatedUser.id.toString(),
        districtId: district.districtId,
      };
    }

    // Log important information
    if (isFirstUser) {
      console.log(`First user created and promoted to superadmin: ${email}`)
    } else {
      console.log(`New user registered: ${email} with role: ${role || 'accountant'}`)
      if (banned) {
        console.log(`User ${email} was created in banned state: ${banReason}`)
      }
    }

    return c.json(formatUserResponse(responseUser, result.token), HttpStatusCodes.CREATED)

  } catch (error: any) {
    console.error('Sign up error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }

    // Handle specific better-auth errors
    if (error.message?.includes('already exists')) {
      throw new HTTPException(409, {
        message: 'User with this email already exists',
      })
    }

    if (error.message?.includes('validation')) {
      throw new HTTPException(400, {
        message: 'Invalid input data provided',
      })
    }

    throw new HTTPException(400, {
      message: error.message || 'Failed to create account',
    })
  }
};

export const banUser: AppRouteHandler<BanUser> = async (c) => {
  const { userId, banReason, banExpiresIn, banExpiresAt } = await c.req.json();

  try {
    // Check if user exists first
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    });

    if (!existingUser) {
      throw new HTTPException(404, {
        message: "User not found",
      });
    }

    // Check if user is already banned
    if (existingUser.banned) {
      throw new HTTPException(409, {
        message: "User is already banned",
      });
    }

    // Calculate ban expiration date if banExpiresIn is provided
    let calculatedBanExpires: Date | undefined;
    if (banExpiresIn) {
      calculatedBanExpires = new Date(Date.now() + (banExpiresIn * 1000));
    } else if (banExpiresAt) {
      calculatedBanExpires = new Date(banExpiresAt);
      if (isNaN(calculatedBanExpires.getTime())) {
        throw new HTTPException(400, {
          message: "Invalid banExpiresAt date format",
        });
      }
    }

    // Update our database directly since better-auth doesn't have banUser API
    const [updatedUser] = await db
      .update(schema.users)
      .set({
        banned: true,
        banReason: banReason,
        banExpires: calculatedBanExpires || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))
      .returning();

    // Log the ban action
    console.log(`User banned - ID: ${userId}, Email: ${existingUser.email}, Reason: ${banReason}${
      calculatedBanExpires ? `, Expires: ${calculatedBanExpires.toISOString()}` : ' (Permanent)'
    }`);

    // Format response
    const response = {
      success: true,
      message: calculatedBanExpires 
        ? `User banned until ${calculatedBanExpires.toISOString()}` 
        : "User permanently banned",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        banned: updatedUser.banned,
        banReason: updatedUser.banReason,
        banExpires: updatedUser.banExpires ? updatedUser.banExpires.toISOString() : null,
      },
    };

    return c.json(response, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Ban user error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }

    // Handle specific better-auth errors
    if (error.message?.includes('User not found')) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    if (error.message?.includes('already banned')) {
      throw new HTTPException(409, {
        message: 'User is already banned',
      });
    }

    if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions to ban user',
      });
    }

    throw new HTTPException(500, {
      message: error.message || 'Failed to ban user',
    });
  }
};

// Unban user handler
export const unbanUser: AppRouteHandler<UnbanUser> = async (c) => {
  const { userId, reason } = await c.req.json();

  try {
    // Check if user exists first
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(userId))
    });

    if (!existingUser) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    // Check if user is actually banned
    if (!existingUser.banned) {
      throw new HTTPException(409, {
        message: 'User is not currently banned',
      });
    }

    // Update database directly since better-auth doesn't have unbanUser API
    const updatedUser = await db
      .update(schema.users)
      .set({
        banned: false,
        banReason: null,
        banExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(userId)))
      .returning();

    if (!updatedUser || updatedUser.length === 0) {
      throw new HTTPException(500, {
        message: 'Failed to update user in local database',
      });
    }

    console.log(`User ${userId} unbanned${reason ? `, Reason: ${reason}` : ''}`);

    // Format response
    const response = {
      success: true,
      message: "User successfully unbanned",
      user: {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        banned: updatedUser[0].banned,
        banReason: updatedUser[0].banReason,
        banExpires: updatedUser[0].banExpires,
      },
    };

    return c.json(response, HttpStatusCodes.OK);

  } catch (error: any) {
    console.error('Unban user error:', error);
    
    if (error instanceof HTTPException) {
      throw error;
    }

    // Handle specific better-auth errors
    if (error.message?.includes('User not found')) {
      throw new HTTPException(404, {
        message: 'User not found',
      });
    }

    if (error.message?.includes('not banned')) {
      throw new HTTPException(409, {
        message: 'User is not currently banned',
      });
    }

    if (error.message?.includes('permission') || error.message?.includes('unauthorized')) {
      throw new HTTPException(403, {
        message: 'Insufficient permissions to unban user',
      });
    }

    throw new HTTPException(500, {
      message: error.message || 'Failed to unban user',
    });
  }
};

// Sign in handler (no public sign up)
export const signIn: AppRouteHandler<SignInRoute> = async (c) => {
  const { email, password, rememberMe } = await c.req.json()

  try {
    // Check if user exists and is active
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    })

    if (!user) {
      throw new HTTPException(401, {
        message: 'Invalid email or password',
      })
    }

    if (!user.isActive) {
      throw new HTTPException(403, {
        message: 'Your account has been deactivated. Please contact an administrator.',
      })
    }

    const result = await auth.api.signInEmail({
      body: { email, password, rememberMe },
      headers: c.req.header(),
    });

    c.header("Set-Cookie", `session=${result.token}; HttpOnly; Path=/; Secure; SameSite=Strict`)

    // Check if user must change password
    if (user.mustChangePassword) {
      return c.json({
        ...formatUserResponse(result.user, result.token),
        token: result.token,
        mustChangePassword: true,
        message: 'Password change required',
      }, HttpStatusCodes.OK)
    }

    return c.json(formatUserResponse(result.user, result.token), HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Sign in error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(401, {
      message: 'Invalid email or password',
    })
  }
};

// OTP sign in handler (for admins mainly)
// export const signInOtp: AppRouteHandler<SignInOtpRoute> = async (c) => {
//   const { email } = await c.req.json()

//   try {
//     // Check if user exists and is active
//     const user = await db.query.users.findFirst({
//       where: eq(schema.users.email, email)
//     })

//     if (!user) {
//       throw new HTTPException(404, {
//         message: 'No account found with this email address',
//       })
//     }

//     if (!user.isActive) {
//       throw new HTTPException(403, {
//         message: 'Your account has been deactivated. Please contact an administrator.',
//       })
//     }

//     // await auth.api.sendVerificationOTP({
//     //   body: { email, type: 'sign-in' },
//     //   headers: c.req.raw.headers,
//     // })

//     await auth.api.sendVerificationOTP({
//       body: {
//         email,
//         type: "sign-in"
//       }
//     });

//     return c.json({
//       message: 'Sign-in code sent to your email',
//     }, HttpStatusCodes.OK)
//   } catch (error: any) {
//     console.error('OTP sign in error:', error)
    
//     if (error instanceof HTTPException) {
//       throw error
//     }
    
//     throw new HTTPException(400, {
//       message: 'Failed to send sign-in code',
//     })
//   }
// };

// Verify OTP handler
// export const verifyOtp: AppRouteHandler<VerifyOtpRoute> = async (c) => {
//   const { email, otp } = await c.req.json()

//   try {
//     // Check if user is active before verification
//     const user = await db.query.users.findFirst({
//       where: eq(schema.users.email, email)
//     })

//     if (!user?.isActive) {
//       throw new HTTPException(403, {
//         message: 'Your account has been deactivated. Please contact an administrator.',
//       })
//     }
    
//     const { success } = await auth.api.checkVerificationOTP({
//       body: { email, otp, type: "sign-in" },
//       headers: c.req.header(),
//     })

//     if (!success) {
//       throw new HTTPException(401, { message: "Invalid or expired verification code" })
//     }

//     // Check if user must change password
//     if (user.mustChangePassword) {
//       return c.json({
//         mustChangePassword: true,
//         message: 'Password change required',
//       }, HttpStatusCodes.OK)
//     }

//     return c.json({ success: true }, HttpStatusCodes.OK)
//   } catch (error: any) {
//     console.error('Verify OTP error:', error)
    
//     throw new HTTPException(401, {
//       message: 'Invalid or expired verification code',
//     })
//   }
// }

// Sign out handler
export const signOut: AppRouteHandler<SignOutRoute> = async (c) => {
  try {
    await auth.api.signOut({
      headers: c.req.header(),
    })

    return c.json({
      message: 'Signed out successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Sign out error:', error)
    
    // Still return success even if there was an error
    return c.json({
      message: 'Signed out successfully',
    }, HttpStatusCodes.OK)
  }
}

export const getSession: AppRouteHandler<GetSessionRoute> = async (c) => {
  try {
    const headers = new Headers();
    const authHeader = c.req.header("authorization");
    const cookieHeader = c.req.header("cookie");

    if (authHeader) {
      const token = authHeader.startsWith("Bearer ") ? authHeader : `Bearer ${authHeader}`;
      headers.set("authorization", token);
    }
    
    
    if (authHeader) headers.set("authorization", authHeader);
    if (cookieHeader) headers.set("cookie", cookieHeader);
    
    const session = await auth.api.getSession({ headers });
    
    console.log("session: ", session);

    if (!session) {
      return c.json(
        { message: "No active session", code: "AUTH_NO_SESSION", status: 401 },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const userId = Number(session.user.id);
    if (!Number.isFinite(userId)) {
      return c.json(
        { message: "Invalid session user ID", code: "AUTH_BAD_USER_ID", status: 401 },
        HttpStatusCodes.UNAUTHORIZED
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
    });

    if (!user?.isActive) {
      await auth.api.signOut({ headers: c.req.header() });

      return c.json(
        {
          message: "Your account has been deactivated. Please contact an administrator.",
          code: "ACCOUNT_DEACTIVATED",
          status: 403,
        },
        HttpStatusCodes.FORBIDDEN
      );
    }

    return c.json(
      {
        ...formatUserResponse(session.user, session.session),
        mustChangePassword: user.mustChangePassword,
      },
      HttpStatusCodes.OK
    );
  } catch (error: any) {
    console.error("Get session error:", error);

    return c.json(
      { message: "Invalid session", code: "AUTH_INVALID", status: 401 },
      HttpStatusCodes.UNAUTHORIZED
    );
  }
};



// // Refresh session handler
// export const refreshSession: AppRouteHandler<RefreshSessionRoute> = async (c) => {
//   try {
//     const result = await auth.api.refreshToken({
//       headers: c.req.header(),
//     })

//     if (!result) {
//       throw new HTTPException(401, {
//         message: 'Cannot refresh session',
//       })
//     }

//     // Check if user is still active
//     const user = await db.query.users.findFirst({
//       where: eq(schema.users.id, result.user.id)
//     })

//     if (!user?.isActive) {
//       throw new HTTPException(403, {
//         message: 'Your account has been deactivated. Please contact an administrator.',
//       })
//     }

//     return c.json({
//       ...formatUserResponse(result.user, result.session),
//       mustChangePassword: user.mustChangePassword,
//     }, HttpStatusCodes.OK)
//   } catch (error: any) {
//     console.error('Refresh session error:', error)
    
//     if (error instanceof HTTPException) {
//       throw error
//     }
    
//     throw new HTTPException(401, {
//       message: 'Failed to refresh session',
//     })
//   }
// }

// Update profile handler
export const updateProfile: AppRouteHandler<UpdateProfileRoute> = async (c) => {
  const { name, email, currentPassword, newPassword } = await c.req.json()

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    // Update user profile
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    const result = await auth.api.updateUser({
      body: updateData,
      headers: c.req.header(),
    })

    // Handle password change
    if (currentPassword && newPassword) {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: c.req.header(),
      })

      // Clear mustChangePassword flag if set
      await db
        .update(schema.users)
        .set({ 
          mustChangePassword: false,
          updatedAt: new Date(),
        })
        .where(eq(schema.users.id, parseInt(session.user.id)))
    }

    return c.json({
      user: formatUserResponse(result, session.session).user,
      message: 'Profile updated successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Update profile error:', error)
    
    if (error.message?.includes('password')) {
      throw new HTTPException(400, {
        message: 'Current password is incorrect',
      })
    }
    
    throw new HTTPException(400, {
      message: error.message || 'Failed to update profile',
    })
  }
};

// Force password change handler (for first-time login)
export const forcePasswordChange: AppRouteHandler<ForcePasswordChangeRoute> = async (c) => {
  const { currentPassword, newPassword } = await c.req.json()

  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    })

    if (!session) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, parseInt(session.user.id))
    })

    if (!user?.mustChangePassword) {
      throw new HTTPException(400, {
        message: 'Password change not required',
      })
    }

    // Change password
    await auth.api.changePassword({
      body: {
        currentPassword,
        newPassword,
      },
      headers: c.req.header(),
    })

    // Clear mustChangePassword flag
    await db
      .update(schema.users)
      .set({ 
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, parseInt(session.user.id)))

    return c.json({
      message: 'Password changed successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Force password change error:', error)
    
    if (error.message?.includes('password')) {
      throw new HTTPException(400, {
        message: 'Current password is incorrect',
      })
    }
    
    throw new HTTPException(400, {
      message: error.message || 'Failed to change password',
    })
  }
};

// Forgot password handler (for admin password reset only)
export const forgotPassword: AppRouteHandler<ForgotPasswordRoute> = async (c) => {
  const { email } = await c.req.json()

  try {
    // Check if user exists and is admin (only admins can use forgot password)
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    })

    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      // Always return success to prevent email enumeration
      return c.json({
        message: 'If an admin account with this email exists, a password reset code will be sent',
      }, HttpStatusCodes.OK)
    }

    if (!user.isActive) {
      return c.json({
        message: 'If an admin account with this email exists, a password reset code will be sent',
      }, HttpStatusCodes.OK)
    }

    await auth.api.forgetPassword({
      body: { email },
      headers: c.req.header(),
    })

    return c.json({
      message: 'If an admin account with this email exists, a password reset code will be sent',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Forgot password error:', error)
    
    // Always return success to prevent email enumeration
    return c.json({
      message: 'If an admin account with this email exists, a password reset code will be sent',
    }, HttpStatusCodes.OK)
  }
};

export const resetPassword: AppRouteHandler<ResetPasswordRoute> = async (c) => {
  // const { email, otp, newPassword } = await c.req.json()
  const { email, newPassword } = await c.req.json()

  try {
    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email)
    })

    if (!user || !['admin', 'superadmin'].includes(user.role)) {
      throw new HTTPException(400, {
        message: 'Invalid or expired reset code',
      })
    }

    // await auth.api.resetPassword({
    //   body: {
    //     email,
    //     otp,
    //     password: newPassword,
    //   },
    //   headers: c.req.raw.headers,
    // })

   await auth.api.resetPassword({
    body: {
      newPassword,
    },
    headers: c.req.raw.headers
   })

    // Clear mustChangePassword flag
    await db
      .update(schema.users)
      .set({ 
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, user.id))

    return c.json({
      message: 'Password reset successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Reset password error:', error)
    
    throw new HTTPException(400, {
      message: 'Invalid or expired reset code',
    })
  }
}

// Verify email handler (disabled for regular users)
export const verifyEmail: AppRouteHandler<VerifyEmailRoute> = async (c) => {
  return c.json({
    message: 'Email verification is handled by administrators',
  }, HttpStatusCodes.OK)
}


// Sign up handler
// export const signUp: AppRouteHandler<SignUpRoute> = async (c) => {
//   const { name, email, password, role, facilityId } = await c.req.json()

//   try {
//     // Check if signup is disabled
//     if (process.env.DISABLE_SIGNUP === "true") {
//       throw new HTTPException(403, {
//         message: "Sign up is currently disabled",
//       })
//     }

//     const result = await auth.api.signUpEmail({
//       body: {
//         name,
//         email,
//         password,
//         role: role || 'accountant',
//         facilityId: facilityId || null,
//       },
//       headers: c.req.header(),
//     })

//     return c.json(formatUserResponse(result.user, result.session), HttpStatusCodes.CREATED)
//   } catch (error: any) {
//     console.error('Sign up error:', error)
    
//     if (error.message?.includes('already exists')) {
//       throw new HTTPException(409, {
//         message: 'User with this email already exists',
//       })
//     }

//     throw new HTTPException(400, {
//       message: error.message || 'Failed to create account',
//     })
//   }
// }

/* 


// Sign in handler
export const signIn: AppRouteHandler<SignInRoute> = async (c) => {
  const { email, password, rememberMe } = await c.req.json()

  try {
    const result = await auth.api.signInEmail({
      body: { email, password, rememberMe },
      headers: c.req.header(),
    })

    return c.json(formatUserResponse(result.user, result.session), HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Sign in error:', error)
    
    throw new HTTPException(401, {
      message: 'Invalid email or password',
    })
  }
}

// OTP sign in handler
export const signInOtp: AppRouteHandler<SignInOtpRoute> = async (c) => {
  const { email } = await c.req.json()

  try {
    await auth.api.sendVerificationOTP({
      body: { email, type: 'sign-in' },
      headers: c.req.header(),
    })

    return c.json({
      message: 'Sign-in code sent to your email',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('OTP sign in error:', error)
    
    throw new HTTPException(400, {
      message: error.message || 'Failed to send sign-in code',
    })
  }
}

// Verify OTP handler
export const verifyOtp: AppRouteHandler<VerifyOtpRoute> = async (c) => {
  const { email, otp } = await c.req.json()

  try {
    const result = await auth.api.verifyOTP({
      body: { email, otp },
      headers: c.req.header(),
    })

    return c.json(formatUserResponse(result.user, result.session), HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Verify OTP error:', error)
    
    throw new HTTPException(401, {
      message: 'Invalid or expired verification code',
    })
  }
}

// Sign out handler
export const signOut: AppRouteHandler<SignOutRoute> = async (c) => {
  try {
    await auth.api.signOut({
      headers: c.req.header(),
    })

    return c.json({
      message: 'Signed out successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Sign out error:', error)
    
    // Still return success even if there was an error
    return c.json({
      message: 'Signed out successfully',
    }, HttpStatusCodes.OK)
  }
}

// Get session handler
export const getSession: AppRouteHandler<GetSessionRoute> = async (c) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.header(),
    })

    if (!session) {
      throw new HTTPException(401, {
        message: 'No active session',
      })
    }

    return c.json(formatUserResponse(session.user, session.session), HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Get session error:', error)
    
    if (error instanceof HTTPException) {
      throw error
    }
    
    throw new HTTPException(401, {
      message: 'Invalid session',
    })
  }
}

// Refresh session handler
export const refreshSession: AppRouteHandler<RefreshSessionRoute> = async (c) => {
  try {
    const result = await auth.api.refreshSession({
      headers: c.req.header(),
    })

    if (!result) {
      throw new HTTPException(401, {
        message: 'Cannot refresh session',
      })
    }

    return c.json(formatUserResponse(result.user, result.session), HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Refresh session error:', error)
    
    throw new HTTPException(401, {
      message: 'Failed to refresh session',
    })
  }
}

// Update profile handler
export const updateProfile: AppRouteHandler<UpdateProfileRoute> = async (c) => {
  const { name, email, currentPassword, newPassword } = await c.req.json()

  try {
    const session = await auth.api.getSession({
      headers: c.req.header(),
    })

    if (!session) {
      throw new HTTPException(401, {
        message: 'Authentication required',
      })
    }

    // Update user profile
    const updateData: any = {}
    if (name) updateData.name = name
    if (email) updateData.email = email

    const result = await auth.api.updateUser({
      body: updateData,
      headers: c.req.header(),
    })

    // Handle password change
    if (currentPassword && newPassword) {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
        headers: c.req.header(),
      })
    }

    return c.json({
      user: formatUserResponse(result, session.session).user,
      message: 'Profile updated successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Update profile error:', error)
    
    if (error.message?.includes('password')) {
      throw new HTTPException(400, {
        message: 'Current password is incorrect',
      })
    }
    
    throw new HTTPException(400, {
      message: error.message || 'Failed to update profile',
    })
  }
}

// Forgot password handler
export const forgotPassword: AppRouteHandler<ForgotPasswordRoute> = async (c) => {
  const { email } = await c.req.json()

  try {
    await auth.api.forgetPassword({
      body: { email },
      headers: c.req.header(),
    })

    return c.json({
      message: 'If an account with this email exists, a password reset code will be sent',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Forgot password error:', error)
    
    // Always return success to prevent email enumeration
    return c.json({
      message: 'If an account with this email exists, a password reset code will be sent',
    }, HttpStatusCodes.OK)
  }
}

// Reset password handler
export const resetPassword: AppRouteHandler<ResetPasswordRoute> = async (c) => {
  const { email, otp, newPassword } = await c.req.json()

  try {
    await auth.api.resetPassword({
      body: {
        email,
        otp,
        password: newPassword,
      },
      headers: c.req.header(),
    })

    return c.json({
      message: 'Password reset successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Reset password error:', error)
    
    throw new HTTPException(400, {
      message: 'Invalid or expired reset code',
    })
  }
}

// Verify email handler
export const verifyEmail: AppRouteHandler<VerifyEmailRoute> = async (c) => {
  const { email, otp } = await c.req.json()

  try {
    await auth.api.verifyEmail({
      body: { email, otp },
      headers: c.req.header(),
    })

    return c.json({
      message: 'Email verified successfully',
    }, HttpStatusCodes.OK)
  } catch (error: any) {
    console.error('Verify email error:', error)
    
    throw new HTTPException(400, {
      message: 'Invalid or expired verification code',
    })
  }
}

// OAuth handlers are automatically handled by Better Auth
// Just need to ensure the routes are properly configured
*/
