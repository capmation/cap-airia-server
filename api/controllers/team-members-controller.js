import express from "express";
import fs from "fs";
import path from "path";
import { emitExceptUser } from "../utils/sockets.js";
import { authRequired } from "./auth-controller.js";

const router = express.Router();
const __dirname = path.resolve();
const filePath = path.join(__dirname, "/datasource/team-members-db.json");

// GET /api/team-members
router.get("/", (_req, res) => {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const teamMembers = JSON.parse(data);
    res.json({ teamMembers });
  } catch (err) {
    console.error("Error fetching team-members.json:", err);
    res.status(500).json({ error: "Error fetching team-members.json" });
  }
});

// POST /api/team-members/create
router.post("/create", authRequired, (req, res) => {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const teamMembers = JSON.parse(data);

    const { id, name, lastname, email, allocated, position } = req.body;

    if (!id || !name || !lastname || !email) {
      return res
        .status(400)
        .json({ error: "id, name, lastname y email are required" });
    }

    if (teamMembers.find((m) => m.id === id)) {
      return res
        .status(400)
        .json({ error: "Team member with this id already exist" });
    }

    const newMember = { id, name, lastname, email, allocated, position };
    teamMembers.push(newMember);
    fs.writeFileSync(filePath, JSON.stringify(teamMembers, null, 2));

    // Realtime event
    emitExceptUser("team-member:created", newMember, {
      userId: req.user?.sub,
      room: "global",
    });

    res
      .status(201)
      .json({ message: "Team member created successfuly", teamMember: newMember });
  } catch (err) {
    console.error("Error creating team member:", err);
    res.status(500).json({ error: "Error creating team member" });
  }
});

export default router;
