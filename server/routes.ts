import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { DISHES, shuffleDishes } from "../lib/food-data";

interface SessionMember {
  id: string;
  name: string;
  ws: WebSocket;
  swipes: Record<string, "like" | "pass">;
}

interface Session {
  code: string;
  hostId: string;
  members: Map<string, SessionMember>;
  dishes: typeof DISHES;
  status: "lobby" | "swiping" | "matched";
  matchedRestaurant?: string;
  matchedDish?: (typeof DISHES)[0];
  createdAt: number;
}

const sessions = new Map<string, Session>();

function generateCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function broadcastToSession(session: Session, message: object, excludeId?: string) {
  const payload = JSON.stringify(message);
  session.members.forEach((member) => {
    if (member.id !== excludeId && member.ws.readyState === WebSocket.OPEN) {
      member.ws.send(payload);
    }
  });
}

function getSessionState(session: Session) {
  return {
    code: session.code,
    hostId: session.hostId,
    status: session.status,
    members: Array.from(session.members.values()).map((m) => ({
      id: m.id,
      name: m.name,
    })),
    matchedRestaurant: session.matchedRestaurant,
    matchedDish: session.matchedDish,
  };
}

function checkForMatch(session: Session): boolean {
  const memberCount = session.members.size;
  const majority = Math.ceil(memberCount / 2);

  const restaurantLikes = new Map<string, Set<string>>();
  const dishMatches = new Map<string, { dish: typeof DISHES[0]; likers: Set<string> }>();

  session.members.forEach((member) => {
    Object.entries(member.swipes).forEach(([dishId, vote]) => {
      if (vote === "like") {
        const dish = session.dishes.find((d) => d.id === dishId);
        if (!dish) return;

        if (!restaurantLikes.has(dish.restaurant)) {
          restaurantLikes.set(dish.restaurant, new Set());
        }
        restaurantLikes.get(dish.restaurant)!.add(member.id);

        if (!dishMatches.has(dishId)) {
          dishMatches.set(dishId, { dish, likers: new Set() });
        }
        dishMatches.get(dishId)!.likers.add(member.id);
      }
    });
  });

  for (const [restaurant, likers] of restaurantLikes) {
    if (likers.size >= majority) {
      let bestDish: typeof DISHES[0] | undefined;
      let bestLikers = 0;

      dishMatches.forEach(({ dish, likers: dl }) => {
        if (dish.restaurant === restaurant && dl.size > bestLikers) {
          bestDish = dish;
          bestLikers = dl.size;
        }
      });

      if (bestDish) {
        session.status = "matched";
        session.matchedRestaurant = restaurant;
        session.matchedDish = bestDish;
        return true;
      }
    }
  }

  return false;
}

function cleanupStaleSessions() {
  const now = Date.now();
  sessions.forEach((session, code) => {
    if (now - session.createdAt > 3600000) {
      sessions.delete(code);
    }
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  setInterval(cleanupStaleSessions, 300000);

  app.post("/api/sessions", (req, res) => {
    let code = generateCode();
    while (sessions.has(code)) {
      code = generateCode();
    }

    const session: Session = {
      code,
      hostId: "",
      members: new Map(),
      dishes: shuffleDishes(),
      status: "lobby",
      createdAt: Date.now(),
    };

    sessions.set(code, session);
    res.json({ code });
  });

  app.get("/api/sessions/:code", (req, res) => {
    const session = sessions.get(req.params.code.toUpperCase());
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json(getSessionState(session));
  });

  wss.on("connection", (ws) => {
    let memberId = "";
    let sessionCode = "";

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === "join") {
          const session = sessions.get(msg.code?.toUpperCase());
          if (!session) {
            ws.send(JSON.stringify({ type: "error", message: "Session not found" }));
            return;
          }

          if (session.status === "matched") {
            ws.send(JSON.stringify({
              type: "match",
              session: getSessionState(session),
              dish: session.matchedDish,
            }));
            return;
          }

          memberId = msg.userId;
          sessionCode = session.code;

          if (!session.hostId) {
            session.hostId = memberId;
          }

          session.members.set(memberId, {
            id: memberId,
            name: msg.name,
            ws,
            swipes: {},
          });

          ws.send(
            JSON.stringify({
              type: "joined",
              session: getSessionState(session),
              dishes: session.dishes,
              isHost: session.hostId === memberId,
            })
          );

          broadcastToSession(
            session,
            {
              type: "member_joined",
              session: getSessionState(session),
            },
            memberId
          );
        } else if (msg.type === "start") {
          const session = sessions.get(sessionCode);
          if (!session || session.hostId !== memberId) return;
          if (session.members.size < 1) return;

          session.status = "swiping";

          broadcastToSession(session, {
            type: "game_started",
            session: getSessionState(session),
            dishes: session.dishes,
          });

          ws.send(
            JSON.stringify({
              type: "game_started",
              session: getSessionState(session),
              dishes: session.dishes,
            })
          );
        } else if (msg.type === "swipe") {
          const session = sessions.get(sessionCode);
          if (!session || session.status !== "swiping") return;

          const member = session.members.get(memberId);
          if (!member) return;

          member.swipes[msg.dishId] = msg.vote;

          broadcastToSession(
            session,
            {
              type: "swipe_update",
              memberId,
              dishId: msg.dishId,
              vote: msg.vote,
            },
            memberId
          );

          if (checkForMatch(session)) {
            const matchMsg = {
              type: "match",
              session: getSessionState(session),
              dish: session.matchedDish,
            };
            broadcastToSession(session, matchMsg);
            ws.send(JSON.stringify(matchMsg));
          }
        } else if (msg.type === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      } catch (err) {
        console.error("WS message error:", err);
      }
    });

    ws.on("close", () => {
      if (!sessionCode || !memberId) return;
      const session = sessions.get(sessionCode);
      if (!session) return;

      session.members.delete(memberId);

      if (session.members.size === 0) {
        sessions.delete(sessionCode);
        return;
      }

      if (session.hostId === memberId) {
        session.hostId = session.members.keys().next().value ?? "";
      }

      broadcastToSession(session, {
        type: "member_left",
        memberId,
        session: getSessionState(session),
      });
    });
  });

  return httpServer;
}
