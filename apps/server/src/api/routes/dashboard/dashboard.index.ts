import { createRouter } from "@/api/lib/create-app"
import * as handlers from "./dashboard.handlers"
import * as routes from "./dashboard.routes"

const router = createRouter()
  .openapi(routes.getAccountantFacilityOverview, handlers.getAccountantFacilityOverview)
  .openapi(routes.getAccountantTasks, handlers.getAccountantTasks)
  .openapi(routes.getDashboardMetrics, handlers.getDashboardMetrics)
  .openapi(routes.getProgramDistribution, handlers.getProgramDistribution)
  .openapi(routes.getBudgetByDistrict, handlers.getBudgetByDistrict)
  .openapi(routes.getBudgetByFacility, handlers.getBudgetByFacility)
  .openapi(routes.getProvinceApprovalSummary, handlers.getProvinceApprovalSummary)
  .openapi(routes.getDistrictApprovalDetails, handlers.getDistrictApprovalDetails)

export default router;

