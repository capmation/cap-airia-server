// ./api/middleware/verify-tool-key.js
// Verifies API key (X-Api-Key or Bearer) + optional freshness & idempotency.
// Comments in English for clarity.

import crypto from "crypto";

export function verifyToolKey({
  headerName = "x-api-key",
  tokens = [],            // e.g., [process.env.AIRIA_TOOL_TOKEN, process.env.AIRIA_TOOL_TOKEN_NEXT]
  requireFreshnessMs = 5 * 60 * 1000, // 5 minutes window if X-AirIA-Timestamp is present
  useIdempotency = true,  // uses X-AirIA-Event-Id if present
} = {}) {
  if (!tokens.length) throw new Error("At least one tool token is required");

  // Very small in-memory cache; prefer Redis in production.
  const seen = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [id, ts] of seen.entries()) if (now - ts > 60 * 60 * 1000) seen.delete(id);
  }, 5 * 60 * 1000).unref?.();

  function constTimeEq(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }

  return (req, res, next) => {
    // 1) Extract provided token (X-Api-Key or Authorization: Bearer)
    const keyHeader = req.header(headerName);
    let provided = keyHeader?.trim() || "";

    if (!provided) {
      const auth = req.header("authorization") || req.header("Authorization") || "";
      const m = auth.match(/^Bearer\s+(.+)$/i);
      if (m) provided = m[1].trim();
    }

    if (!provided) return res.status(401).json({ error: "Missing API key" });

    // 2) Constant-time match against any valid token (supporting rotation)
    const ok = tokens.some(tok => tok && constTimeEq(provided, tok));
    if (!ok) return res.status(401).json({ error: "Invalid API key" });

    // 3) Optional freshness window (if caller provides X-AirIA-Timestamp)
    const tsHeader = req.header("X-AirIA-Timestamp");
    if (tsHeader && Number.isFinite(Number(tsHeader)) && requireFreshnessMs > 0) {
      const age = Math.abs(Date.now() - Number(tsHeader));
      if (age > requireFreshnessMs) return res.status(408).json({ error: "Stale request" });
    }

    // 4) Optional idempotency (if caller provides X-AirIA-Event-Id)
    const eventId = req.header("X-AirIA-Event-Id");
    if (useIdempotency && eventId) {
      if (seen.has(eventId)) return res.sendStatus(200); // already processed
      seen.set(eventId, Date.now());
    }

    // Mark request as authenticated
    req.toolAuth = { token: provided, eventId, ts: tsHeader ? Number(tsHeader) : undefined };
    return next();
  };
}
