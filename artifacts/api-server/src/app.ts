import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "node:path";
import { existsSync } from "node:fs";
import { tenantGuard } from "./middlewares/tenantGuard";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛡️ Global Tenant Isolation Security
// All requests to /api MUST have a valid x-etab-id header
app.use("/api", tenantGuard);

app.use("/api", router);

// Production: serve frontend static files (Docker mode)
const frontendPath = path.resolve(import.meta.dirname, "..", "..", "ofppt-manager", "dist", "public");
if (process.env.NODE_ENV === "production" && existsSync(frontendPath)) {
  logger.info({ frontendPath }, "Serving frontend static files");
  app.use(express.static(frontendPath));
  // SPA fallback: send index.html for all non-API routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

export default app;
