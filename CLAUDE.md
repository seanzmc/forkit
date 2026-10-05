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

iOS builds run on EAS: `npx eas-cli@latest build --profile <development|development-simulator|preview|production> --platform ios`. TestFlight: `npx eas-cli@latest build --profile production --platform ios --auto-submit` builds and uploads to App Store Connect app 6819387031 ("ForkIt: Swipe to Decide", set in `submit.production` in eas.json). eas-cli is deliberately not a dependency; `cli.version` in [eas.json](eas.json) sets the minimum (24.4.2 fixed Apple sign-in failing with "iTunes service key is empty").

## Contribution workflow

All changes go through a PR to `main` (see [CONTRIBUTING.md](CONTRIBUTING.md)). CI has two jobs, `check` (typecheck, lint, server build, smoke test) and `expo-config` (asserts release-critical `app.json` values). Don't push to `main` directly.

## Environment

- `EXPO_PUBLIC_DOMAIN` — **required by the client**. `getApiUrl()` in [lib/query-client.ts](lib/query-client.ts) throws if unset, and every API call plus the WebSocket URL derives from it. `npm start` defaults it to `localhost:5000`; `expo:dev` sets it from `REPLIT_DEV_DOMAIN:5000`; EAS builds get it from the profile `env` in [eas.json](eas.json).
- `GOOGLE_PLACES_API_KEY` — server-side; absent ⇒ dine-out silently falls back to the curated `DISHES` list.
- `GEMINI_API_KEY` — server-side; enables real popular dishes per restaurant via Gemini "Grounding with Google Maps" ([server/menu-grounding.ts](server/menu-grounding.ts)). Absent, or no Maps-sourced answer ⇒ that restaurant falls back to cuisine-table dishes labeled "Suggested". `GEMINI_MAPS_MODEL` overrides the model (default `gemini-3.8-flash`: `3.5-flash-lite` calls Maps but returns no grounding chunks, so every answer is dropped; `gemini-2.5-*` returns 404 for projects that never used it). Grounded dishes must render with their Google Maps source links right after them (`components/GroundedSource.tsx`) and must never be persisted — Google's terms.
- `EXPO_ACCESS_TOKEN` — server-side, optional; only needed if "enhanced push security" is turned on for the Expo project. Match notifications go through Expo's push service ([server/push.ts](server/push.ts)) either way.
- `SPOONACULAR_API_KEY` — server-side; enables real menu items with photos for chain restaurants ([server/chain-menus.ts](server/chain-menus.ts), cards marked `menuSource: "spoonacular"`, labeled "On the menu", credited with a link to spoonacular). spoonacular's terms cap caching at 1 hour, so lookups live only in an in-memory 1-hour cache. Each place costs ~1.1 points (~2.2 for a chain); the free plan's 50 points/day covers only a couple of rooms. Absent ⇒ suggested dishes.
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
- `dine-out` — server calls Google Places `searchNearby`, resolves photo redirects, then builds up to 3 dish cards per restaurant: real popular dishes from Gemini Maps grounding when `GEMINI_API_KEY` is set and Gemini answers with a Maps source, otherwise real menu items for chains from spoonacular when `SPOONACULAR_API_KEY` is set, otherwise picks from a hardcoded cuisine→dishes table (`CUISINE_DISHES` in [server/cuisine-dishes.ts](server/cuisine-dishes.ts), keyed by Places `types`) and marks them `suggested`. Suggested dishes show an example photo of that dish from Wikimedia Commons (`assets/dishes/<slug>.jpg`, served at `/assets`; author and license in `server/dish-photos.json`), labeled "example photo" and credited via `photoCredit` ("Photo: author · license · Wikimedia Commons"; CC BY/BY-SA require it). Adding a dish to the table means fetching its photo with `npx tsx scripts/fetch-dish-photos.ts` (no key; check the result, then `--source`/`--pick` to replace a bad one); dishes without one fall back to the place's own photo. Only one Places photo is resolved per place (each is a billed request). Fast-food places and cuisines with no table entry get one `restaurantOnly` card (no invented dish; description from `editorialSummary`). Cards also carry `phone`, `website` and `mapsUrl` for the match screen's actions (`components/MatchActions.tsx`). Grounding runs in parallel (15 s timeout each) while the session is created, so dine-out session creation takes ~10 s with Gemini on. Match = majority liked the same **restaurant**; the winning dish is the most-liked one there.
- `cook-in` — 20 curated recipes, no location. Match = majority liked the same **dish**.

Both paths funnel into `checkForMatch()`, which runs on every swipe. Majority is a strict majority — `floor(memberCount / 2) + 1`, so 2/2, 2/3, 3/4, 3/5.

**Client↔server protocol** is hand-rolled JSON over one WebSocket at `/ws`. Message types are declared in [lib/websocket.ts](lib/websocket.ts) (`WsMessage`) but the server does not validate inbound messages — inbound kinds are `join` (optionally with `pushToken`), `push_token`, `start`, `swipe`, `undo`, `ping`, matched by string in the `ws.on("message")` block. Adding a message type means editing both files.

Host is whoever joins first (`session.hostId`); on host disconnect it transfers to the next member. Only the host's `start` is honored.

**Identity is ephemeral**: `Crypto.randomUUID()` generated per screen mount. `/session/[code]` mints one and passes it to `/swipe/[code]` as a route param — if that param is lost, the user rejoins as a new member and their swipes reset. Only the display name persists (AsyncStorage `userName`).

Each device's own swipes are kept in `lib/swipe-review.ts` (module-level, reset per swipe screen) so the done and match screens can show what you swiped right and left on.

**Match notifications**: the lobby asks for notification permission; the swipe screen sends the Expo push token in a `push_token` message once it resolves (`lib/push.ts`). The server keeps tokens per session even after members disconnect and pushes to all of them on a match; the app hides the banner while in the foreground. Tapping one opens `/match` from the dish in the payload (the session may be gone by then). `lib/push.ts` loads `expo-notifications` defensively, so builds without the native module just run without push.

**Invite links**: `https://<host>/join/CODE` (served by `server/index.ts`, with `/.well-known/apple-app-site-association` for team `N526K73K96`) and `forkit://join/CODE` both map to `/session/CODE` in `app/+native-intent.tsx`. With no saved name, the lobby sends you to `/` with `join` set and returns after the name is entered. The https form needs a build that includes `ios.associatedDomains`.

**Screens** (`app/`, expo-router file-based, typedRoutes enabled): `index` name entry → `home` mode/create/join → `session/[code]` lobby → `swipe/[code]` game → `match` result. Both `session/` and `swipe/` open their own WebSocket independently.

## Server-as-Expo-host

`server/index.ts` does more than serve `/api`. It inspects the `expo-platform` header on `/` and `/manifest` to serve native manifests out of `static-build/<platform>/manifest.json`, and otherwise renders `server/templates/landing-page.html` with the base URL injected. `scripts/build.js` produces `static-build/` by booting Metro, downloading the ios/android bundles and manifests from it, then killing it.

CORS allows only `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` origins plus any `localhost`/`127.0.0.1` port.

## Gotchas

- `metro.config.js` blocks `.local/skills/.tmp-*` from the resolver — temp agent-skill dirs crashed Metro. Don't remove it.
- `postinstall` runs `patch-package` (`patches/expo-asset+12.0.13.patch`); use `npm install`, not a raw node_modules copy.
- `reactCompiler` is enabled in `app.json` experiments — babel-plugin-react-compiler runs on all app code.
- Theme is fixed dark: `#0F0F0F` background, `#FF6B35` accent, Poppins loaded in `_layout.tsx` (renders `null` until fonts resolve). Colors live in [constants/colors.ts](constants/colors.ts).
- Path aliases: `@/*` → repo root, `@shared/*` → `shared/`.
