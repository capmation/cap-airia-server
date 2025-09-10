import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { initSocket } from "./api/utils/sockets.js";

// Controllers
import authRouter, { authRequired } from "./api/controllers/auth-controller.js";
import airiaRouter from "./api/controllers/airia-controller.js";
import projectsRouter from "./api/controllers/projects-controller.js";
import teamMembersRouter from "./api/controllers/team-members-controller.js";

// API key middleware
import { verifyToolKey } from "./api/middleware/verify-tool-key.js";

dotenv.config();

const app = express();
/**
 * IMPORTANT:
 * We capture the raw body for HMAC signature verification.
 * This runs BEFORE any routers so req.rawBody is available.
 */
app.use(express.json({
  limit: "1mb",
  verify: (req, _res, buf) => {
    // Save raw buffer to compute HMAC (`ts.rawBody`)
    req.rawBody = buf;
  },
}));

const {
  AIRIA_CHAT_URL,
  AIRIA_AGENT_ENDPOINT,
  AIRIA_API_KEY,
  JWT_SECRET,
  AIRIA_TOOL_TOKEN,
  AIRIA_TOOL_TOKEN_NEXT,
  PORT = 8787,
} = process.env;

const allowedOrigins = [
  "http://localhost:5173",
  AIRIA_CHAT_URL,
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

if (!AIRIA_AGENT_ENDPOINT || !AIRIA_API_KEY) {
  console.error("Missing AIRIA_AGENT_ENDPOINT or AIRIA_API_KEY in .env");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET in .env");
  process.exit(1);
}
if (!AIRIA_TOOL_TOKEN && !AIRIA_TOOL_TOKEN_NEXT) {
  console.error("Missing AIRIA_TOOL_TOKEN in .env");
  process.exit(1);
}
if (!JWT_SECRET) {
  console.error("Missing JWT_SECRET en .env");
  process.exit(1);
}

// ---- HTTP server + WebSockets ----
const server = http.createServer(app);
initSocket({
  server,
  allowedOrigins,
  jwtSecret: JWT_SECRET,
});

const toolGuard = verifyToolKey({
  headerName: "x-api-key",
  tokens: [AIRIA_TOOL_TOKEN, AIRIA_TOOL_TOKEN_NEXT].filter(Boolean),
});

// ---- Cotrollers ----
app.use("/api/auth", authRouter);                 // POST /api/auth/login
app.use("/api/agent", authRequired, airiaRouter); // POST /api/agent/chat 
app.use("/api/projects", toolGuard, projectsRouter);         // GET /, POST /create, PUT/DELETE members
app.use("/api/team-members", toolGuard, teamMembersRouter);  // GET /, POST /create

// Health
app.get("/health", (_req, res) => res.send("ok"));

// Start
server.listen(PORT, () => {
  console.log(`HTTP + WS running on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.filter(Boolean).join(", ")}`);
});
