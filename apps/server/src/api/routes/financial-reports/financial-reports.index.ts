import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./financial-reports.handlers";
import * as routes from "./financial-reports.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.generateStatement, handlers.generateStatement)
  .openapi(routes.exportStatement, handlers.exportStatement)
  // Approval workflow routes
  .openapi(routes.submitForApproval, handlers.submitForApproval)
  .openapi(routes.dafApprove, handlers.dafApprove)
  .openapi(routes.dafReject, handlers.dafReject)
  .openapi(routes.dgApprove, handlers.dgApprove)
  .openapi(routes.dgReject, handlers.dgReject)
  .openapi(routes.getWorkflowLogs, handlers.getWorkflowLogs);

export default router;