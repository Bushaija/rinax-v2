import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./planning.handlers";
import * as routes from "./planning.routes";

const router = createRouter()
  // Static paths first to prevent route collisions
  .openapi(routes.getFormSchema, handlers.getFormSchema)
  .openapi(routes.getActivities, handlers.getActivities)
  .openapi(routes.getDataSummary, handlers.getDataSummary)
  
  // NEW: File upload and template download
  .openapi(routes.uploadFile, handlers.uploadFile)
  .openapi(routes.downloadTemplate, handlers.downloadTemplate)
  
  // NEW: Approval workflow routes
  .openapi(routes.submitForApproval, handlers.submitForApproval)
  .openapi(routes.approvePlanning, handlers.approvePlanning)
  .openapi(routes.reviewPlanning, handlers.reviewPlanning)
  .openapi(routes.bulkReviewPlanning, handlers.bulkReviewPlanning)
  
  // Existing routes
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.calculateTotals, handlers.calculateTotals)
  .openapi(routes.validate, handlers.validate)
  
  // Dynamic :id routes last
  .openapi(routes.getApprovalHistory, handlers.getApprovalHistory)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove);

export default router;