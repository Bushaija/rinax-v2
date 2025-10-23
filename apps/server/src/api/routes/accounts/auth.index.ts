import { createRouter } from "@/api/lib/create-app"
import * as handlers from "./auth.handlers"
import * as routes from "./auth.routes"

const router = createRouter()
  .openapi(routes.signUp, handlers.signUp)
  .openapi(routes.banUser, handlers.banUser)
  .openapi(routes.unbanUser, handlers.unbanUser)
  .openapi(routes.signIn, handlers.signIn)
  .openapi(routes.signOut, handlers.signOut)
  
  // .openapi(routes.signInOtp, handlers.signInOtp)
  // .openapi(routes.verifyOtp, handlers.verifyOtp)
  
  .openapi(routes.getSession, handlers.getSession)
  // .openapi(routes.refreshSession, handlers.refreshSession)
  
  .openapi(routes.updateProfile, handlers.updateProfile)
  
  .openapi(routes.forgotPassword, handlers.forgotPassword)
  .openapi(routes.resetPassword, handlers.resetPassword)
  
  .openapi(routes.verifyEmail, handlers.verifyEmail)

// Mount Better Auth handlers for OAuth and other endpoints
// This handles all the Better Auth endpoints like /auth/sign-in/google, etc.

export default router;