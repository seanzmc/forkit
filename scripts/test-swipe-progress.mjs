import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { on, once } from "node:events";
import WebSocket from "ws";

// Run against the local server started by CI, using only a new Cook In room.
const origin = "http://127.0.0.1:" + (process.env.PORT || "5055");
const signal = AbortSignal.timeout(15000);
const sockets = [];

async function join(code, name, options = {}) {
  const ws = new WebSocket(origin.replace("http:", "ws:") + "/ws");
  sockets.push(ws);
  const messages = on(ws, "message", { signal });
  const send = (message) => ws.send(JSON.stringify(message));
  async function next(type) {
    while (true) {
      const { value, done } = await messages.next();
      assert.ok(!done, "Socket closed before " + type);
      const message = JSON.parse(value[0]);
      if (message.session) {
        for (const member of message.session.members) {
          assert.deepEqual(Object.keys(member).sort(), ["away", "id", "name", "swiped"]);
        }
      }
      if (message.type === type) return message;
      // Joins and departures can precede the action we are checking.
      assert.ok(["member_joined", "member_left"].includes(message.type), "Unexpected " + message.type);
    }
  }
  await once(ws, "open", { signal });
  const id = options.userId ?? randomUUID();
  send({ type: "join", code, name, userId: id, ...options });
  return { id, send, next, ws, joined: await next("joined") };
}

async function expectCount(peer, memberId, swiped) {
  assert.deepEqual(await peer.next("swipe_update"), { type: "swipe_update", memberId, swiped });
}

function snapshotCount(message, memberId) {
  return message.session.members.find((member) => member.id === memberId)?.swiped;
}

try {
  const response = await fetch(origin + "/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode: "cook-in" }),
    signal,
  });
  assert.ok(response.ok);
  const { code } = await response.json();
  const host = await join(code, "Host", { supportsSwipeCounts: true });
  const peer = await join(code, "Peer", { supportsSwipeCounts: true });
  const build9 = await join(code, "Build 9");
  host.send({ type: "start" });
  for (const client of [host, peer, build9]) await client.next("game_started");
  const [first, second] = host.joined.dishes;

  host.send({ type: "swipe", dishId: first.id, vote: "pass" });
  for (const client of [peer, build9]) await expectCount(client, host.id, 1);
  // A retry or changing a choice on the same card leaves the count alone.
  host.send({ type: "swipe", dishId: first.id, vote: "pass" });
  host.send({ type: "swipe", dishId: first.id, vote: "like" });
  host.send({ type: "swipe", dishId: second.id, vote: "pass" });
  for (const client of [peer, build9]) await expectCount(client, host.id, 2);

  host.send({ type: "undo", dishId: second.id });
  await expectCount(peer, host.id, 1);
  // The shipped client replaces its counts from a public room snapshot.
  assert.equal(snapshotCount(await build9.next("member_joined"), host.id), 1);
  host.send({ type: "undo", dishId: second.id });
  host.ws.close();
  await peer.next("member_left");
  await build9.next("member_left");

  const rejoined = await join(code, "Host", {
    userId: host.id,
    supportsSwipeCounts: true,
    swipes: { [first.id]: "like", [second.id]: "pass" },
  });
  assert.equal(snapshotCount(rejoined.joined, host.id), 2);
  for (const client of [peer, build9]) {
    assert.equal(snapshotCount(await client.next("member_joined"), host.id), 2);
  }
  peer.send({ type: "swipe", dishId: first.id, vote: "like" });
  await expectCount(build9, peer.id, 1);
  const match = await build9.next("match");
  assert.equal(match.dish.id, first.id);
  assert.equal(match.session.status, "matched");
  console.log("Private progress, build 9 compatibility, reconnect and matching passed.");
} finally {
  for (const ws of sockets) ws.terminate();
}
