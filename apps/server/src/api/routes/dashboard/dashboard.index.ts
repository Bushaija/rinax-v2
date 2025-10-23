import { createRouter } from "@/api/lib/create-app"
import * as handlers from "./dashboard.handlers"
import * as routes from "./dashboard.routes"

const router = createRouter()
  .openapi(routes.getAccountantFacilityOverview, handlers.getAccountantFacilityOverview)
  .openapi(routes.getAccountantTasks, handlers.getAccountantTasks)

export default router;

