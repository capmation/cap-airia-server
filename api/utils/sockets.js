import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let ioInstance = null;

export function initSocket({
  server,
  allowedOrigins = [],
  jwtSecret,              
  path = "/socket.io",    
} = {}) {
  if (ioInstance) return ioInstance; 

  const io = new Server(server, {
    cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: false },
    path,
    pingInterval: 25000,
    pingTimeout: 20000,
  });
  ioInstance = io;

  if (jwtSecret) {
    io.use((socket, next) => {      
      const header = socket.handshake.headers?.authorization || "";
      console.log({header})
      const bearer = header.startsWith("Bearer ") ? header.slice(7) : null;
      const token =
        socket.handshake.auth?.token ||
        bearer ||
        socket.handshake.query?.token;

      if (!token) return next(new Error("unauthorized"));

      try {
        const payload = jwt.verify(token, jwtSecret);
        socket.data.user = { id: payload.sub, username: payload.username };
        next();
      } catch {
        next(new Error("invalid_token"));
      }
    });
  }

  const allowEvent = makeRateLimiter(15, 5000);

  io.on("connection", (socket) => {
    const u = socket.data.user?.username || "anon";
    console.log(`socket connected: ${socket.id} (user: ${u})`);

    socket.on("ping:client", () => socket.emit("pong:server", Date.now()));

    socket.on("room:join", (room) => {
      if (!allowEvent(socket)) return socket.emit("error", "rate_limited");
      socket.join(room);
      socket.emit("room:joined", room);
    });

    socket.on("room:leave", (room) => {
      if (!allowEvent(socket)) return socket.emit("error", "rate_limited");
      socket.leave(room);
      socket.emit("room:left", room);
    });

    socket.on("chat:message", ({ room, message }) => {
      if (!allowEvent(socket)) return socket.emit("error", "rate_limited");
      const payload = { from: u, message, ts: Date.now() };
      room ? io.to(room).emit("chat:message", payload) : io.emit("chat:message", payload);
    });

    socket.on("disconnect", (reason) => {
      console.log(`socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

/** Get the existing Socket.IO instance anywhere in your app */
export function getIO() {
  if (!ioInstance) throw new Error("Socket.io not initialized. Call initSocket() first.");
  return ioInstance;
}

/** Convenience: emit globally or to a room */
export function emit(event, payload, room) {
  const io = getIO();
  room ? io.to(room).emit(event, payload) : io.emit(event, payload);
}

export function joinRoom(socket, room) { socket.join(room); }
export function leaveRoom(socket, room) { socket.leave(room); }

/* ------------------ utils ------------------ */
function makeRateLimiter(max = 15, windowMs = 5000) {
  return (socket) => {
    const now = Date.now();
    let bucket = socket.data._rl;
    if (!bucket) {
      bucket = { count: 0, start: now };
      socket.data._rl = bucket;
    }
    if (now - bucket.start > windowMs) {
      bucket.start = now;
      bucket.count = 0;
    }
    bucket.count++;
    return bucket.count <= max;
  };
}
