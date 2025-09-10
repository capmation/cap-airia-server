import express from "express";
import fs from "fs";
import path from "path";
import { emit } from "../utils/sockets.js";

const router = express.Router();
const __dirname = path.resolve();
const filePath = path.join(__dirname, "/datasource/projects-db.json");

// GET /api/projects
router.get("/", (_req, res) => {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);
    res.json({ projects });
  } catch (err) {
    console.error("Error fetching projects.json:", err);
    res.status(500).json({ error: "Error fetching projects" });
  }
});

// POST /api/projects/create
router.post("/create", (req, res) => {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);

    const { id, name, userIds } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required" });
    }
    if (projects.find((p) => p.id === id)) {
      return res.status(400).json({ error: "Project id already exists" });
    }

    const newProject = { id, name, userIds: userIds || [] };
    projects.push(newProject);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    // Realtime event
    emit("project:created", newProject);
    res
      .status(201)
      .json({ message: "Project created successfully", project: newProject });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Error creating project" });
  }
});

// DELETE /api/projects/:projectId/team-members/:userId
router.delete("/:projectId/team-members/:userId", (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);

    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const index = project.userIds.indexOf(Number(userId));
    if (index === -1) {
      return res
        .status(404)
        .json({ error: "Team member not found for this project" });
    }

    project.userIds.splice(index, 1);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    // Realtime event
    emit("project:deleted", project);
    res.json({
      message: `Team member ${userId} removed from project ${projectId}`,
      project,
    });
  } catch (err) {
    console.error("Error removing team member from project:", err);
    res
      .status(500)
      .json({ error: "Error removing team member from project" });
  }
});

// PUT /api/projects/:projectId/team-members/:userId
router.put("/:projectId/team-members/:userId", (req, res) => {
  try {
    const { projectId, userId } = req.params;

    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);

    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const userIdNum = Number(userId);
    if (project.userIds.includes(userIdNum)) {
      return res
        .status(400)
        .json({ error: "Team member already assined to this project" });
    }

    project.userIds.push(userIdNum);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    // Realtime event
    emit("project:updated", project);
    res.json({
      message: `Team member ${userId} added to the project ${projectId}`,
      project,
    });
  } catch (err) {
    console.error("Error adding team member to the project:", err);
    res.status(500).json({ error: "Error adding team member to the project" });
  }
});

export default router;
