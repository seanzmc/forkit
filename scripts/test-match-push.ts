import assert from "node:assert/strict";
import { DISHES } from "../lib/food-data";
import { matchPushTarget, sendMatchPush } from "../server/push";

async function checkMatchPush() {
  // No push leaves this process. A missing Android channel drops the whole
  // notification, so keep a mixed room of old, fresh and upgraded installs.
  const legacy = matchPushTarget("ExpoPushToken[oldinstall1]", undefined)!;
  const fresh = matchPushTarget("ExpoPushToken[newinstall2]", "default")!;
  const upgraded = matchPushTarget("ExpoPushToken[newinstall3]", "matches-dinner-bell")!;
  assert.equal(matchPushTarget("invalid", "default"), undefined);
  assert.deepEqual(matchPushTarget(legacy.token, "unknown"), legacy);
  const requests: { to: string; sound: string; channelId: string; data: { code: string } }[][] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, init) => {
    const messages = JSON.parse(String(init?.body));
    requests.push(messages);
    return Response.json({ data: messages.map(() => ({ status: "ok" })) });
  };
  try {
    await sendMatchPush([legacy, fresh, upgraded, fresh], "TEST01", DISHES[0]);
    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0].map((m) => [m.to, m.sound, m.channelId]), [
      [legacy.token, "default", "default"],
      [fresh.token, "dinner_bell.wav", "default"],
      [upgraded.token, "dinner_bell.wav", "matches-dinner-bell"],
    ]);
    assert.ok(requests[0].every((m) => m.data.code === "TEST01"));
  } finally {
    globalThis.fetch = originalFetch;
  }
}

void checkMatchPush().then(() => console.log("Mixed-version match notification sounds passed."));
