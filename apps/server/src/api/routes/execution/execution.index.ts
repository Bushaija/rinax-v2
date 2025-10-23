import { createRouter } from "@/api/lib/create-app";
import * as handlers from "./execution.handlers";
import * as routes from "./execution.routes";

const router = createRouter()
  .openapi(routes.getFormSchema, handlers.getFormSchema)
  .openapi(routes.checkExisting, handlers.checkExisting)
  .openapi(routes.getActivities, handlers.getActivities)
  .openapi(routes.quarterlySummary, handlers.quarterlySummary)
  .openapi(routes.compiled, handlers.compiled)
  // .openapi(routes.compiledExport, handlers.compiledExport)
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.create, handlers.create)
  .openapi(routes.update, handlers.update)
  .openapi(routes.remove, handlers.remove)
  
  .openapi(routes.calculateBalances, handlers.calculateBalances)
  .openapi(routes.validateAccountingEquation, handlers.validateAccountingEquation)

export default router;