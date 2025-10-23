import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, emailOTP, organization, openAPI } from "better-auth/plugins";
import dotenv from "dotenv";
import { asc, eq, count } from "drizzle-orm";

import env from "@/env";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DISABLE_SIGNUP } from "./const";
import { sendEmail, sendInvitationEmail } from "./resend";

dotenv.config();

const additionalFields = {
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "accountant",
        input: true,
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
    }
  }
} as const;


type AuthType = ReturnType<typeof betterAuth>;

const pluginList = [
  admin({
    adminRoles: ["admin", "superadmin"],
  }),
  openAPI(),
  organization({
    // Allow users to create organizations
    allowUserToCreateOrganization: true,
    // Set the creator role to owner
    creatorRole: "owner",
    sendInvitationEmail: async (invitation) => {
      const inviteLink = `${process.env.BASE_URL}/invitation?invitationId=${invitation.invitation.id}&organization=${invitation.organization.name}&inviterEmail=${invitation.inviter.user.email}`;
      await sendInvitationEmail(
        invitation.email,
        invitation.inviter.user.email,
        invitation.organization.name,
        inviteLink,
      );
    },
  }),
  emailOTP({
    async sendVerificationOTP({ email, otp, type }) {
      let subject, htmlContent;

      if (type === "sign-in") {
        subject = "Your Rybbit Sign-In Code";
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0c; color: #e5e5e5;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Your Sign-In Code</h2>
            <p>Here is your one-time password to sign in to Rybbit:</p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; font-weight: bold; color: #10b981;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `;
      } else if (type === "email-verification") {
        subject = "Verify Your Email Address";
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0c; color: #e5e5e5;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Verify Your Email</h2>
            <p>Here is your verification code for Rybbit:</p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; font-weight: bold; color: #10b981;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `;
      } else if (type === "forget-password") {
        subject = "Reset Your Password";
        htmlContent = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #0c0c0c; color: #e5e5e5;">
            <h2 style="color: #ffffff; font-size: 24px; margin-bottom: 20px;">Reset Your Password</h2>
            <p>You requested to reset your password for Rybbit. Here is your one-time password:</p>
            <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0; font-size: 28px; letter-spacing: 4px; font-weight: bold; color: #10b981;">
              ${otp}
            </div>
            <p>This code will expire in 5 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
        `;
      }

      if (subject && htmlContent) {
        await sendEmail(email, subject, htmlContent);
      }
    },
  }),
];


export const auth: AuthType = betterAuth({
    // basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.users,
        account: schema.account,
        session: schema.session,
        verification: schema.verification,
        organization: schema.organization,
        member: schema.member,
      }
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      disableSignUp: DISABLE_SIGNUP
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          defaultValue: "accountant",
          input: true, // Change this from false to true
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
        districtId: {
          type: "number",
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
      deleteUser: {
        enabled: true,
      },
      changeEmail: {
        enabled: true,
      }
    },
    plugins: pluginList,
    trustedOrigins: ["http://localhost:3000","http://localhost:3001","http://localhost:3002"],
    advanced: {
      useSecureCookies: env.NODE_ENV === "production",
      defaultCookieAttributes: {
        sameSite: "lax",
        // sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        path: "/",
        httpOnly: true,
        secure: env.NODE_ENV === "production"
      },
      database: {
        generateId: false,
      }
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user: any, context: any) => {
        //     console.log('=== DATABASE HOOK BEFORE CREATE ===');
        // console.log('Incoming user data:', user);
        // console.log('Context:', context);
            const headers = context?.headers ?? new Headers();
            const session = await auth.api.getSession({ headers });

            const requestedRole = headers.get('x-signup-role') || 'accountant'
            const facilityId = headers.get('x-signup-facility-id') 
                  ? parseInt(headers.get('x-signup-facility-id')) 
                  : null
            // const districtId = headers.get('x-signup-district-id') 
            //       ? parseInt(headers.get('x-signup-district-id')) 
            //       : null
            const userCount = await db.select({ count: count() }).from(schema.users);
            const isFirstUser = (userCount[0]?.count || 0) === 0;
            
            let permissions = {};
            let projectAccess = []

            if (isFirstUser) {
              permissions = { superadmin: true, all_facilities: true };
              projectAccess.push(1,2,3)
            } else if (requestedRole === 'admin') {
              permissions = { admin: true, all_facilities: true };
              projectAccess.push(1,2,3)
            }


            return {
              data: {
                ...user,
                facilityId,
                // districtId,
                role: isFirstUser ? "superadmin" : requestedRole,
                isActive: true,
                permissions: JSON.stringify(permissions),
                projectAccess: JSON.stringify([1,2]),
                configAccess: JSON.stringify({}),
                createdBy: session?.user?.id || null,
                mustChangePassword: !isFirstUser,
              }
            }

          },
          after: async () => {
            const users = await db.select().from(schema.users).orderBy(asc(schema.users.createdAt));

            // If this is the first user, make them an admin
            if (users.length === 1) {
              await db.update(schema.users).set({ role: "superadmin" }).where(eq(schema.users.id, users[0].id));
            }
          },
        },
        update: {
          before: async (user: any) => {
            return {
              ...user,
              updatedAt: new Date(),
            };
          },
        },
      },
    },
});   

export type AuthSession = typeof auth.$Infer.Session;
export type AuthUser = typeof auth.$Infer.Session.user & { role?: string | null };

