import express from "express";

const router = express.Router();

const {
  AIRIA_AGENT_ENDPOINT,
  AIRIA_API_KEY,
} = process.env;

// POST /api/agent/chat
router.post("/chat", async (req, res) => {
  try {
    if (!AIRIA_AGENT_ENDPOINT || !AIRIA_API_KEY) {
      return res.status(500).json({ error: "Airia config missing" });
    }

    const userInput = req.body?.text ?? "Example user input";
    const body = {
      userId: null,
      userInput,
      asyncOutput: false,
    };

    const r = await fetch(AIRIA_AGENT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": AIRIA_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (err) {
    console.error("Proxy error:", err);
    res.status(500).json({ error: "Proxy error calling Airia" });
  }
});

export default router;
