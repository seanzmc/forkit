import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { on, once } from "node:events";
import WebSocket from "ws";

// Uses isolated local rooms. Sample restaurants avoid external lookups.
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

async function instantRoom(body) {
  const response = await fetch(origin + "/api/sessions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ swipeFirst: true, ...body }), signal,
  });
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.session.status, "swiping");
  return result;
}

async function checkInviteAfterSwiping() {
  const { code, dishes } = await instantRoom({ mode: "cook-in", recipeOrder: ["r3", "r1", "r2"] });
  assert.deepEqual(dishes.slice(0, 3).map(dish => dish.id), ["r3", "r1", "r2"]);
  const host = await join(code, "Host", { swipes: { r3: "pass", r1: "like" }, round: 1 });
  assert.equal(snapshotCount(host.joined, host.id), 2);
  host.send({ type: "swipe", dishId: "r2", vote: "like" });
  host.send({ type: "ping" });
  await host.next("pong");
  const friend = await join(code, "Friend");
  assert.equal(friend.joined.session.status, "swiping");
  assert.equal(snapshotCount(friend.joined, host.id), 3);
  assert.deepEqual(friend.joined.dishes, dishes);
  friend.send({ type: "swipe", dishId: "r1", vote: "pass" });
  await expectCount(host, friend.id, 1);
  friend.send({ type: "leave" });
  assert.equal((await host.next("member_left")).session.status, "swiping");
  const other = await join(code, "Another friend");
  other.send({ type: "swipe", dishId: "r1", vote: "like" });
  await expectCount(host, other.id, 1);
  assert.equal((await host.next("match")).dish.id, "r1");
}

async function checkRestaurantMajority() {
  const { code, dishes } = await instantRoom({ mode: "dine-out", meal: "dinner", deck: "dishes" });
  const samePlace = dishes.filter(d => d.restaurant === "The Grill House");
  assert.ok(samePlace.length >= 2);
  const host = await join(code, "Host");
  for (const dish of samePlace) host.send({ type: "swipe", dishId: dish.id, vote: "like" });
  host.send({ type: "ping" });
  await host.next("pong");
  const second = await join(code, "Second");
  const third = await join(code, "Third");
  await join(code, "Fourth");
  second.send({ type: "swipe", dishId: samePlace[1].id, vote: "like" });
  await expectCount(host, second.id, 1);
  const state = await (await fetch(origin + "/api/sessions/" + code, { signal })).json();
  assert.equal(state.status, "swiping"); // Two out of four is still a tie.
  third.send({ type: "swipe", dishId: samePlace[0].id, vote: "like" });
  await expectCount(host, third.id, 1);
  assert.equal((await host.next("match")).dish.restaurant, samePlace[0].restaurant);
}

try {
  await checkInviteAfterSwiping();
  await checkRestaurantMajority();
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
  console.log("Invite handoff, two-voter minimum, restaurant majority, private progress, build 9 compatibility and reconnect passed.");
} finally {
  for (const ws of sockets) ws.terminate();
}
