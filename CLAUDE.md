# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ForkIt — a Tinder-style group food-decision app. Members join a session by 6-char code, swipe on dish cards, and the server declares a match when a majority likes the same thing. Expo Router (React Native + web) front end, Express + `ws` back end.

## Commands

```bash
npm run server:dev    # Express + WebSocket on :5000 (tsx, no watch)
npm run expo:dev      # Metro / Expo on :8081 (needs REPLIT_DEV_DOMAIN)
npm start             # plain `expo start` for local dev
npm run lint          # expo lint (eslint-config-expo flat config)
npm run lint:fix
npm run typecheck     # tsc --noEmit
npm run db:push       # drizzle-kit push (requires DATABASE_URL)
```

Both processes must run together — the app is useless without the backend. Replit's "Project" workflow (`.replit`) starts both in parallel.

There is **no test suite**. `npm run typecheck` and `npm run lint` are the only automated checks; `.github/workflows/ci.yml` runs both plus a server build and a boot/health/create-session smoke test on every push and PR to `main`.

CI must regenerate `expo-env.d.ts` (via `npx expo customize tsconfig.json`) before typechecking. `tsconfig.json` includes that file, it supplies the `expo/types` reference that types `process.env`, and it is gitignored — so a fresh checkout fails typecheck with implicit-any errors that never reproduce locally.

Production build: `npm run expo:static:build && npm run server:build`, then `npm run server:prod`.

## Contribution workflow

All changes go through a PR to `main` (see [CONTRIBUTING.md](CONTRIBUTING.md)). CI has two jobs, `check` (typecheck, lint, server build, smoke test) and `expo-config` (asserts release-critical `app.json` values). Don't push to `main` directly.

## Environment

- `EXPO_PUBLIC_DOMAIN` — **required by the client**. `getApiUrl()` in [lib/query-client.ts](lib/query-client.ts) throws if unset, and every API call plus the WebSocket URL derives from it. `npm start` defaults it to `localhost:5000`; `expo:dev` sets it from `REPLIT_DEV_DOMAIN:5000`; EAS builds get it from the profile `env` in [eas.json](eas.json).
- `GOOGLE_PLACES_API_KEY` — server-side; absent ⇒ dine-out silently falls back to the curated `DISHES` list.
- `GEMINI_API_KEY` — server-side; enables real popular dishes per restaurant via Gemini "Grounding with Google Maps" ([server/menu-grounding.ts](server/menu-grounding.ts)). Absent, or no Maps-sourced answer ⇒ that restaurant falls back to cuisine-table dishes labeled "Suggested". `GEMINI_MAPS_MODEL` overrides the model (default `gemini-3.8-flash`: `3.5-flash-lite` calls Maps but returns no grounding chunks, so every answer is dropped; `gemini-2.5-*` returns 404 for projects that never used it). Grounded dishes must render with their Google Maps source links right after them (`components/GroundedSource.tsx`) and must never be persisted — Google's terms.
- `ALLOWED_ORIGINS` — server-side CORS allowlist, comma-separated, scheme optional. The `REPLIT_*` domain vars still work as a fallback.
- `PRIVACY_CONTACT_EMAIL` — server-side; contact address shown on `/privacy`.
- `DATABASE_URL` — only needed for `db:push`; the running app never touches Postgres.

`getApiUrl()` picks `http` for localhost/LAN hosts and `https` otherwise; `getWsUrl()` derives `ws`/`wss` from that, so local dev connects without edits.

## Deployment

The server runs on Railway (project `forkit`, service `forkit-server`) at `https://forkit-server-production.up.railway.app`, configured by [railway.json](railway.json). Pushing to `main` auto-deploys.

**`numReplicas` must stay 1.** Session state is an in-memory `Map`, so a second replica would split members of one session across servers. Any deploy also drops every live session.

`/api/health` backs the platform healthcheck. `/privacy` serves the store-required privacy policy from `server/templates/privacy-policy.html`.

## Architecture

**All session state is in-memory** in a module-level `Map` in [server/routes.ts](server/routes.ts). Restarting the server drops every live session. Sessions self-delete when the last member disconnects, plus a 1-hour sweep every 5 min. `shared/schema.ts` (Drizzle `users` table) and `server/storage.ts` (`MemStorage`) are unused scaffolding — no route reads them.

**`lib/food-data.ts` is shared across the client/server boundary** — `server/routes.ts` imports it via a relative path. Keep it free of React Native imports or the server build breaks.

**Two session modes** (`SessionMode = "dine-out" | "cook-in"`), chosen on `/home` and fixed at session-create time:
- `dine-out` — server calls Google Places `searchNearby`, resolves photo redirects, then builds up to 3 dish cards per restaurant: real popular dishes from Gemini Maps grounding when `GEMINI_API_KEY` is set and Gemini answers with a Maps source, otherwise picks from a hardcoded cuisine→dishes table (`CUISINE_DISHES`) and marks them `suggested`. Grounding runs in parallel (15 s timeout each) while the session is created, so dine-out session creation takes ~10 s with Gemini on. Match = majority liked the same **restaurant**; the winning dish is the most-liked one there.
- `cook-in` — 20 curated recipes, no location. Match = majority liked the same **dish**.

Both paths funnel into `checkForMatch()`, which runs on every swipe. Majority is a strict majority — `floor(memberCount / 2) + 1`, so 2/2, 2/3, 3/4, 3/5.

**Client↔server protocol** is hand-rolled JSON over one WebSocket at `/ws`. Message types are declared in [lib/websocket.ts](lib/websocket.ts) (`WsMessage`) but the server does not validate inbound messages — inbound kinds are `join`, `start`, `swipe`, `undo`, `ping`, matched by string in the `ws.on("message")` block. Adding a message type means editing both files.

Host is whoever joins first (`session.hostId`); on host disconnect it transfers to the next member. Only the host's `start` is honored.

**Identity is ephemeral**: `Crypto.randomUUID()` generated per screen mount. `/session/[code]` mints one and passes it to `/swipe/[code]` as a route param — if that param is lost, the user rejoins as a new member and their swipes reset. Only the display name persists (AsyncStorage `userName`).

**Screens** (`app/`, expo-router file-based, typedRoutes enabled): `index` name entry → `home` mode/create/join → `session/[code]` lobby → `swipe/[code]` game → `match` result. Both `session/` and `swipe/` open their own WebSocket independently.

## Server-as-Expo-host

`server/index.ts` does more than serve `/api`. It inspects the `expo-platform` header on `/` and `/manifest` to serve native manifests out of `static-build/<platform>/manifest.json`, and otherwise renders `server/templates/landing-page.html` with the base URL injected. `scripts/build.js` produces `static-build/` by booting Metro, downloading the ios/android bundles and manifests from it, then killing it.

CORS allows only `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` origins plus any `localhost`/`127.0.0.1` port.

## Gotchas

- `metro.config.js` blocks `.local/skills/.tmp-*` from the resolver — temp agent-skill dirs crashed Metro. Don't remove it.
- `.npmrc` sets `legacy-peer-deps=true` because the Expo SDK 58 beta pins `react-native@0.88.0-rc.x`, which npm doesn't match against peer ranges like `0.86 - 0.88`. Remove it once SDK 58 is stable on RN 0.88.0.
- Expo SDK 58 (beta) / React Native 0.88 / React 19.3 / TypeScript 6. iOS uses the UIScene life cycle (`SceneDelegate.swift`), required for Xcode 27 builds. Splash is configured through the `expo-splash-screen` plugin in `app.json` (the top-level `splash` key was removed).
- `reactCompiler` is enabled in `app.json` experiments — babel-plugin-react-compiler runs on all app code.
- Theme is fixed dark: `#0F0F0F` background, `#FF6B35` accent, Poppins loaded in `_layout.tsx` (renders `null` until fonts resolve). Colors live in [constants/colors.ts](constants/colors.ts).
- Path aliases: `@/*` → repo root, `@shared/*` → `shared/`.
