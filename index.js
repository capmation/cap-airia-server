import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";
import path from "path";

dotenv.config();
const app = express();
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://airia-chat-gvyl.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
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

// Airia API Chat
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

//HOOKS
app.get("/api/projects", (req, res) => {
  try {
    const filePath = path.join(__dirname, "/datasource/projects-db.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);
    console.log('projects data', {projects})
    res.json({ projects });
  } catch (err) {
    console.error("❌ Error fetching projects.json:", err);
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
    console.error("❌ Error fetching team-members.json:", err);
    res.status(500).json({ error: "Error leyendo team-members.json" });
  }
});


app.post("/api/team-members/create", (req, res) => {
  try {
    const filePath = path.join(__dirname, "/datasource/team-members-db.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const teamMembers = JSON.parse(data);

    const { id, name, lastname, email, allocated, position } = req.body;

    if (!id || !name || !lastname || !email) {
      return res.status(400).json({ error: "id, name, lastname y email are required" });
    }

    if (teamMembers.find(m => m.id === id)) {
      return res.status(400).json({ error: "El teamMember con ese id ya existe" });
    }

    const newMember = { id, name, lastname, email, allocated, position };
    teamMembers.push(newMember);
    fs.writeFileSync(filePath, JSON.stringify(teamMembers, null, 2));

    res.status(201).json({ message: "Team member creado con éxito", teamMember: newMember });
  } catch (err) {
    console.error("❌ Error creando team member:", err);
    res.status(500).json({ error: "Error creando team member" });
  }
});

app.post("/api/projects/create", (req, res) => {
  try {
    const filePath = path.join(__dirname, "/datasource/projects-db.json");
    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);

    const { id, name, userIds } = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "id and name are required" });
    }

    if (projects.find(p => p.id === id)) {
      return res.status(400).json({ error: "Project id already exist" });
    }

    const newProject = { id, name, userIds: userIds || [] };
    projects.push(newProject);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    res.status(201).json({ message: "Project created successfully", project: newProject });
  } catch (err) {
    console.error("Error creating project:", err);
    res.status(500).json({ error: "Error creating project" });
  }
});

app.delete("/api/projects/:projectId/team-members/:userId", (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const filePath = path.join(__dirname, "/datasource/projects-db.json");

    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const index = project.userIds.indexOf(Number(userId));
    if (index === -1) {
      return res.status(404).json({ error: "Team member not found for this project" });
    }

    project.userIds.splice(index, 1);

    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    res.json({ message: `Team member ${userId} removed from project ${projectId}`, project });
  } catch (err) {
    console.error("Error removing team member from project:", err);
    res.status(500).json({ error: "Error removing team member from project" });
  }
});

app.put("/api/projects/:projectId/team-members/:userId", (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const filePath = path.join(__dirname, "/datasource/projects-db.json");

    const data = fs.readFileSync(filePath, "utf-8");
    const projects = JSON.parse(data);

    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const userIdNum = Number(userId);

    if (project.userIds.includes(userIdNum)) {
      return res.status(400).json({ error: "Team member already assined to this project" });
    }
    project.userIds.push(userIdNum);
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));

    res.json({ message: `Team member ${userId} added to the project ${projectId}`, project });
  } catch (err) {
    console.error("Error adding team member to the project:", err);
    res.status(500).json({ error: "Error adding team member to the project" });
  }
});



app.listen(PORT, () => console.log(`Airia proxy running on http://localhost:${PORT}`));
