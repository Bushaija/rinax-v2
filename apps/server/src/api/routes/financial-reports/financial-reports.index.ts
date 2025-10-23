import { createRouter } from "@/api/lib/create-app";

import * as handlers from "./financial-reports.handlers";
import * as routes from "./financial-reports.routes";

const router = createRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.generateStatement, handlers.generateStatement)
  .openapi(routes.exportStatement, handlers.exportStatement);

export default router;