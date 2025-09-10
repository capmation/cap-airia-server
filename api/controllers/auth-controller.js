import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

const {
  DEMO_USER,
  DEMO_PASS,
  B2B_USER,
  B2B_PASS,
  JWT_SECRET,
} = process.env;

// Middleware
function authRequired(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (_err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  
  const matchesDemo = username === DEMO_USER && password === DEMO_PASS;
  const matchesB2B = username === B2B_USER && password === B2B_PASS;
  console.log({ username, password, matchesDemo, matchesB2B, DEMO_USER, DEMO_PASS })
  if (matchesDemo || matchesB2B) {
    const token = jwt.sign(
      { sub: "demo-user-1", username },
      JWT_SECRET,
      { expiresIn: "2h" }
    );
    return res.json({ token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

export { authRequired };
export default router;
