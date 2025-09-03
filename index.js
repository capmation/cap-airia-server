import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

dotenv.config();
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

const { AIRIA_USER_ID, AIRIA_AGENT_ENDPOINT, AIRIA_API_KEY, PORT = 8787 } = process.env;

const __dirname = path.resolve();

if (!AIRIA_AGENT_ENDPOINT || !AIRIA_API_KEY || !AIRIA_USER_ID) {
  console.error("❌ Falta AIRIA_AGENT_ENDPOINT o AIRIA_API_KEY en .env");
  process.exit(1);
}

app.post("/api/agent/chat", async (req, res) => {
  try {
    const userInput = req.body?.text ?? "Example user input";

    const body = {
      userId: null,
      userInput,
      asyncOutput: false
    };

    const r = await fetch(AIRIA_AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AIRIA_API_KEY
      },
      body: JSON.stringify(body)
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error calling Airia" });
  }
});

app.get("/api/projects", (req, res) => {
  try {
    const filePath = path.join(__dirname, "/datasource/projects-db.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);
    res.json({ projects });
  } catch (err) {
    console.error("❌ Error leyendo projects.json:", err);
    res.status(500).json({ error: "Error leyendo projects.json" });
  }
});

app.get("/api/team-members", (req, res) => {
  try {
    const filePath = path.join(__dirname, "/datasource/team-members-db.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const teamMembers = JSON.parse(data);
    res.json({ teamMembers });
  } catch (err) {
    console.error("❌ Error leyendo team-members.json:", err);
    res.status(500).json({ error: "Error leyendo team-members.json" });
  }
});

app.listen(PORT, () => console.log(`✅ Airia proxy running on http://localhost:${PORT}`));
