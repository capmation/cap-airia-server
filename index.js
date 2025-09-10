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

dotenv.config();

const app = express();
app.use(express.json());

const {
  AIRIA_CHAT_URL,
  AIRIA_AGENT_ENDPOINT,
  AIRIA_API_KEY,
  JWT_SECRET,
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
  console.error("Missing AIRIA_AGENT_ENDPOINT or AIRIA_API_KEY en .env");
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

// ---- Cotrollers ----
app.use("/api/auth", authRouter);                 // POST /api/auth/login
app.use("/api/agent", authRequired, airiaRouter); // POST /api/agent/chat 
app.use("/api/projects", projectsRouter);         // GET /, POST /create, PUT/DELETE members
app.use("/api/team-members", teamMembersRouter);  // GET /, POST /create

// Health
app.get("/health", (_req, res) => res.send("ok"));

// Start
server.listen(PORT, () => {
  console.log(`HTTP + WS running on http://localhost:${PORT}`);
  console.log(`Allowed origins: ${allowedOrigins.filter(Boolean).join(", ")}`);
});
