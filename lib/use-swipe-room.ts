import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { getWsUrl, type WsMessage } from "./websocket";
import { ownVotesFor, type OwnVotes } from "./swipe-review";

type Status = "connecting" | "connected" | "reconnecting" | "offline";
const DELAYS = [1000, 2000, 4000, 8000, 8000];
const PING_MS = 20000;

export function useSwipeRoom(
  code: string | undefined,
  userId: string,
  getJoin: () => { name: string; votes?: OwnVotes },
  receive: (message: WsMessage, sent?: OwnVotes) => void
) {
  const handlers = useRef({ getJoin, receive });
  useLayoutEffect(() => {
    handlers.current = { getJoin, receive };
  }, [getJoin, receive]);
  const [status, setStatus] = useState<Status>("connecting");
  const socket = useRef<WebSocket | null>(null);
  const stop = useRef<() => void>(() => {});
  const retry = useRef<() => void>(() => {});

  useEffect(() => {
    if (!code || !userId) return;
    let closed = false,
      connecting = false,
      attempts = 0,
      lastHeard = Date.now();
    let heartbeat: ReturnType<typeof setInterval>, timer: ReturnType<typeof setTimeout>;
    function dropped() {
      clearInterval(heartbeat);
      if (closed) return;
      if (attempts >= DELAYS.length) {
        setStatus("offline");
        return;
      }
      setStatus("reconnecting");
      timer = setTimeout(connect, DELAYS[attempts++]);
    }
    async function connect() {
      if (closed || connecting || !code) return;
      const old = socket.current?.readyState;
      if (old === WebSocket.OPEN || old === WebSocket.CONNECTING) return;
      clearTimeout(timer);
      connecting = true;
      const saved = handlers.current.getJoin().votes ?? (await ownVotesFor(code, userId));
      connecting = false;
      if (closed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(getWsUrl());
      } catch {
        dropped();
        return;
      }
      socket.current = ws;
      let sent: OwnVotes | undefined;
      ws.onopen = () => {
        if (closed || socket.current !== ws) return;
        const join = handlers.current.getJoin();
        sent = join.votes ?? saved;
        ws.send(
          JSON.stringify({ type: "join", code, userId, name: join.name, supportsSwipeCounts: true, ...sent })
        );
        lastHeard = Date.now();
        let lastTick = lastHeard;
        heartbeat = setInterval(() => {
          const now = Date.now();
          if (now - lastTick > PING_MS * 1.5) lastHeard = now;
          lastTick = now;
          if (now - lastHeard > 45000) {
            ws.onclose = null;
            socket.current = null;
            ws.close();
            dropped();
          } else if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" }));
        }, PING_MS);
      };
      ws.onmessage = (event) => {
        if (closed || socket.current !== ws) return;
        lastHeard = Date.now();
        let msg: WsMessage;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }
        if (msg.type === "joined") {
          attempts = 0;
          setStatus("connected");
        }
        if (msg.type === "match" || msg.type === "error") disconnect();
        handlers.current.receive(msg, sent);
      };
      ws.onclose = () => {
        if (socket.current === ws) {
          socket.current = null;
          dropped();
        }
      };
    }
    function reconnect() {
      if (closed) return;
      if (socket.current?.readyState === WebSocket.OPEN) {
        lastHeard = Date.now();
        socket.current.send(JSON.stringify({ type: "ping" }));
      } else {
        attempts = 0;
        void connect();
      }
    }
    function disconnect() {
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(timer);
      const ws = socket.current;
      socket.current = null;
      ws?.close();
    }
    stop.current = disconnect;
    retry.current = reconnect;
    setStatus("connecting");
    void connect();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") reconnect();
    });
    return () => {
      sub.remove();
      disconnect();
      stop.current = () => {};
      retry.current = () => {};
    };
  }, [code, userId]);

  const send = useCallback((message: object) => {
    const ws = socket.current;
    if (ws?.readyState !== WebSocket.OPEN) return false;
    ws.send(JSON.stringify(message));
    return true;
  }, []);
  const leave = useCallback(() => {
    send({ type: "leave" });
    stop.current();
  }, [send]);
  return { status, send, leave, retry: () => retry.current() };
}
