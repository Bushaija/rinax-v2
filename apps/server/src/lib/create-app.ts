// import type { Schema } from "hono";
import { cors } from "hono/cors";
import { OpenAPIHono } from "@hono/zod-openapi";
import { requestId } from "hono/request-id";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";
import { auth } from "./auth";
import { getSessionMiddleware } from "../middlewares/auth";
import { facilityHierarchyMiddleware } from "../middlewares/facility-hierarchy";

// import { pinoLogger } from "../middlewares/pino-logger";

import type { AppBindings } from "../lib/types";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  // Apply base path so that routes are mounted under /api
  const { BASE_PATH } = require("./constants");
  const app = createRouter().basePath(BASE_PATH);
  app
    .use("*", cors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002'
      ],
      credentials: true,
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: [
        'Content-Type',
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control'
      ]
    }))
    .use(requestId())
    .use(serveEmojiFavicon("📝"))
    // .use(pinoLogger());
    .use("*", getSessionMiddleware)
    .use("*", facilityHierarchyMiddleware)
  
  .on(["POST", "GET"], "/auth/*", async (c) => {
    return auth?.handler(c.req.raw);
  });

  app.notFound(notFound);
  app.onError(onError);
  return app;
};