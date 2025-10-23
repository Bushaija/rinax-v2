import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP, organization } from "better-auth/plugins";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { sendVerificationEmail, sendAccountCreationEmail } from "./email.service";
import { eq } from "drizzle-orm";
import { APIError } from "better-auth";

const getAllowedOrigins = () => {
  const origins = [process.env.FRONTEND_URL || "http://localhost:3000"];
  
  if (process.env.NODE_ENV === "development") {
    origins.push("http://localhost:3001", "http://localhost:3002");
  }
  
  return origins;
};

export const auth: ReturnType<typeof betterAuth> = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
    },
  }),
  
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    disableSignUp: true, // Only admin can create accounts
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "accountant",
        required: true,
      },
      facilityId: {
        type: "number",
        required: false,
      },
      permissions: {
        type: "string",
        required: false,
      },
      projectAccess: {
        type: "string", 
        required: false,
      },
      configAccess: {
        type: "string",
        required: false,
      },
      lastLoginAt: {
        type: "date",
        required: false,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
      createdBy: {
        type: "number",
        required: false,
      },
      mustChangePassword: {
        type: "boolean",
        defaultValue: true,
        required: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  plugins: [
    admin({
      adminRoles: ["admin", "superadmin"],
      adminEmails: process.env.ADMIN_EMAILS?.split(",") || [],
    }),
    organization({
      allowUserToCreateOrganization: false,
      creatorRole: "owner",
      sendInvitationEmail: async ({ invitation, inviter, organization }) => {
        // Check inviter permissions
        if (!["admin", "superadmin"].includes(inviter.role)) {
          throw new Error("Only admins can send invitations");
        }

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation?invitationId=${invitation.id}&organization=${organization.name}`;
        
        await sendAccountCreationEmail({
          email: invitation.email,
          inviterEmail: inviter.user.email,
          organizationName: organization.name,
          inviteLink,
          temporaryPassword: "TEMP_PASSWORD_PLACEHOLDER", // Generate proper temp password
        });
      },
    }),

    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        await sendVerificationEmail({ email, otp, type });
      },
      otpLength: 6,
      expiresIn: 60 * 10, // 10 minutes
    }),
  ],

  trustedOrigins: getAllowedOrigins(),
  
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: {
      enabled: process.env.NODE_ENV === "production",
      domain: process.env.COOKIE_DOMAIN,
    },
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
    },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          const headers = ctx?.headers ?? new Headers();
          const session = await auth.api.getSession({ headers });
          
          // Assign admin role based on email if it's in admin emails
          let userRole = user.role || "accountant";
          if (process.env.ADMIN_EMAILS?.split(",").includes(user.email)) {
            userRole = "admin";
          }
          
          return {
            data: {...user,
            role: userRole,
            isActive: true,
            permissions: user.permissions || "{}",
            projectAccess: user.projectAccess || "[]",
            configAccess: user.configAccess || "{}",
            createdBy: session?.user?.id ? parseInt(session.user.id) : null,
            mustChangePassword: true,
            createdAt: new Date(),
            updatedAt: new Date(),}
          };
        },
        
        after: async (user) => {
          // Handle first user becoming superadmin
          const userCount = await db.$count(schema.users);
          
          if (userCount === 1) {
            await db
              .update(schema.users)
              .set({
                role: "superadmin",
                permissions: JSON.stringify({ 
                  superadmin: true, 
                  all_facilities: true 
                }),
                mustChangePassword: false,
                updatedAt: new Date(),
              })
              .where(eq(schema.users.id, parseInt(user.id)));
          }
        },
      },
      update: {
        before: async (user) => ({
          data: {...user,
          updatedAt: new Date(),}
        }),
      },
    },
    session: {
      create: {
        before: async (session, ctx) => {
          // Check user status before creating session
          const user = await db.query.users.findFirst({
            where: eq(schema.users.id, parseInt(session.userId)),
          });
    
          if (!user) {
            throw new APIError("NOT_FOUND", {
              message: "user not found",
              code: "USER_NOT_FOUND"
            });
          }
    
          // Check if user is banned (better-auth handles this automatically)
          if (user.banned) {
            throw new APIError("FORBIDDEN", {
              message: user.banReason || "Account is banned",
              code: "ACCOUNT_BANNED",
            });
          }
          
          if (!user.isActive) {
            throw new APIError("FORBIDDEN", {
              message: "Account is deactivated",
              code: "ACCOUNT_INACTIVE",
            });
          }
          
    
          return { data: session };
        },
        
        after: async (session) => {
          // Update last login time
          await db
            .update(schema.users)
            .set({ 
              lastLoginAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(schema.users.id, parseInt(session.userId)));
        },
      },
    },
  },

  rateLimit: {
    enabled: true,
    window: 60, // 1 minute
    max: 100, // Reasonable limit
    storage: "memory",
  },
});

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user;