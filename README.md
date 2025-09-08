# server (Airia Server — Node/Express)

## Overview
A **Node/Express** API that:
- Exposes a **login** endpoint with hardcoded demo credentials → issues a short-lived **JWT**.
- Proxies **chat** requests to your **Airia** Agent endpoint.
- (Optional) Supports an additional **B2B** login pair for a separate flow.

> ⚠️ Intended for **development/demo**. For production, add proper user storage, password hashing, HTTPS, rate limiting, short token lifetimes, refresh tokens, etc.

## Features
- `POST /api/auth/login` → returns JWT for valid demo credentials
- `POST /api/agent/chat` → protected route calling Airia Agent
- CORS configured to allow your frontend origin
- Config via `.env`

## Prerequisites
- Node 18+ and npm
- Valid **Airia** API key and Agent endpoint

## Getting Started

```bash
# 1) Install dependencies
npm install

# 2) Create env file
cp .env.example .env

# 3) Start server
npm run dev   # or: npm start
# Default: http://localhost:${PORT} (e.g., 8787)
```

### .env.example
```env
# --- Airia configuration ---
AIRIA_AGENT_ENDPOINT=https://api.airia.ai/agents/xxx/invoke
AIRIA_API_KEY=your-airia-api-key
AIRIA_CHAT_URL=https://your-frontend-chat.example.com  # optional, for logs/links/CORS allowlist

# --- Auth (JWT + demo/B2B logins) ---
JWT_SECRET=change-this-in-prod

# Default demo user (frontend login)
DEMO_USER=admin
DEMO_PASS=123456

# Optional B2B credentials (if you implement a second login route)
B2B_USER=partner_user
B2B_PASS=partner_pass

# --- Server ---
PORT=8787
```

## Environment Variables

| Name                   | Required | Example                                          | Description |
|------------------------|----------|--------------------------------------------------|-------------|
| `AIRIA_AGENT_ENDPOINT` | Yes      | `https://api.airia.ai/agents/xxx/invoke`        | Airia Agent endpoint your server calls from `/api/agent/chat`. |
| `AIRIA_API_KEY`        | Yes      | `sk-airia-...`                                   | API key sent as `X-API-Key` to the Airia endpoint. |
| `AIRIA_CHAT_URL`       | No       | `https://your-frontend-chat.example.com`         | Optional—useful for logs, links, or CORS allowlisting. |
| `JWT_SECRET`           | Yes      | `a-long-random-string`                           | Secret key used to sign JWTs. Change in production. |
| `DEMO_USER`            | Yes      | `admin`                                          | Demo username accepted by `/api/auth/login`. |
| `DEMO_PASS`            | Yes      | `123456`                                         | Demo password accepted by `/api/auth/login`. |
| `B2B_USER`             | No       | `partner_user`                                   | Optional second username (if you add a B2B login path). |
| `B2B_PASS`             | No       | `partner_pass`                                   | Optional second password (paired with `B2B_USER`). |
| `PORT`                 | No       | `8787`                                           | Port where the server listens. Defaults to 8787. |

## Endpoints

### `POST /api/auth/login`
**Body**
```json
{ "username": "admin", "password": "123456" }
```
**Response**
```json
{ "token": "eyJhbGciOi..." }
```

### `POST /api/agent/chat` (protected)
**Headers**
```
Authorization: Bearer <JWT>
Content-Type: application/json
```
**Body**
```json
{ "text": "Hello Airia" }
```
**Response**
- Proxied response from Airia (string or JSON depending on your agent).

## CORS
Ensure the allowed origin includes your React app:

```js
app.use(cors({
  origin: ["http://localhost:5173"], // add your production domain here
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
```

## Scripts

| Command        | Description                          |
|----------------|--------------------------------------|
| `npm run dev`  | Start with nodemon (if configured)   |
| `npm start`    | Start server with Node               |

## Security Notes
- Do **not** commit real API keys or secrets.
- Rotate `JWT_SECRET` and shorten token lifetimes in production.
- Add HTTPS, rate limiting, request size limits, and robust logging.
- Replace hardcoded demo creds with real user storage + hashed passwords.

## Minimal Server Skeleton (reference)

```js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.json());

app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET","POST","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

const {
  AIRIA_AGENT_ENDPOINT,
  AIRIA_API_KEY,
  JWT_SECRET = "dev-change-me",
  DEMO_USER = "admin",
  DEMO_PASS = "123456",
  PORT = 8787,
} = process.env;

function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username === DEMO_USER && password === DEMO_PASS) {
    const token = jwt.sign({ sub: "demo-user", username }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ token });
  }
  return res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/agent/chat", authRequired, async (req, res) => {
  try {
    const r = await fetch(AIRIA_AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AIRIA_API_KEY,
      },
      body: JSON.stringify({
        userInput: req.body?.text ?? "",
        asyncOutput: false,
      }),
    });
    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error calling Airia" });
  }
});

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
```
