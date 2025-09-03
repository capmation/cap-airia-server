import express from "express";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  })
);

const { AIRIA_USER_ID, AIRIA_AGENT_ENDPOINT, AIRIA_API_KEY, PORT = 8787 } = process.env;

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

app.listen(PORT, () => console.log(`✅ Airia proxy running on http://localhost:${PORT}`));
