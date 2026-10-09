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

Android builds: `npx eas-cli@latest build --profile production --platform android` (AAB; EAS holds the upload keystore). Google rejects API uploads for an app's first release, so upload the first AAB by hand in Play Console; after that `--auto-submit` sends it to the internal track as a draft via `submit.production.android` in eas.json, which reads the Play service-account key from `./play-service-account.json` (gitignored). Android push needs Firebase (see `GOOGLE_SERVICES_JSON` below).

Store listing text (App Store and Play descriptions, keywords, review notes, privacy labels, Data safety, age ratings) lives in [store/](store/README.md) and is pasted into the consoles by hand. If a change alters what data the app collects or where it goes, update `server/templates/privacy-policy.html` and `store/review-and-privacy.md` in the same PR.

## Contribution workflow

All changes go through a PR to `main` (see [CONTRIBUTING.md](CONTRIBUTING.md)). CI has two jobs, `check` (typecheck, lint, server build, smoke test) and `expo-config` (asserts release-critical `app.json` values). Don't push to `main` directly.

## Environment

- `EXPO_PUBLIC_DOMAIN` — **required by the client**. `getApiUrl()` in [lib/query-client.ts](lib/query-client.ts) throws if unset, and every API call plus the WebSocket URL derives from it. `npm start` defaults it to `localhost:5000`; `expo:dev` sets it from `REPLIT_DEV_DOMAIN:5000`; EAS builds get it from the profile `env` in [eas.json](eas.json).
- `GOOGLE_PLACES_API_KEY` — server-side; absent ⇒ dine-out silently falls back to the curated `DISHES` list.
- `GEMINI_API_KEY` — server-side; enables real popular dishes per restaurant via Gemini "Grounding with Google Maps" ([server/menu-grounding.ts](server/menu-grounding.ts)). Absent, or no Maps-sourced answer ⇒ that restaurant falls back to cuisine-table dishes labeled "Suggested". `GEMINI_MAPS_MODEL` overrides the model (default `gemini-3.8-flash`: `3.5-flash-lite` calls Maps but returns no grounding chunks, so every answer is dropped; `gemini-2.5-*` returns 404 for projects that never used it). Grounded dishes must render with their Google Maps source links right after them (`components/GroundedSource.tsx`) and must never be persisted — Google's terms.
- `GOOGLE_SERVICES_JSON` — EAS secret **file** env var (all three environments) holding Firebase project `forkit-f05c9`'s `google-services.json`, which Android needs to get a push token. The repo is public, so the file is gitignored; [app.config.js](app.config.js) sets `android.googleServicesFile` from this var on EAS, or from a local `./google-services.json` copy if present. Sending to Android also needs the FCM V1 service-account key uploaded via `eas credentials` (Android → Push Notifications: FCM V1).
- `EXPO_ACCESS_TOKEN` — server-side, optional; only needed if "enhanced push security" is turned on for the Expo project. Match notifications go through Expo's push service ([server/push.ts](server/push.ts)) either way.
- `SPOONACULAR_API_KEY` — server-side; enables real menu items with photos for chain restaurants ([server/chain-menus.ts](server/chain-menus.ts), cards marked `menuSource: "spoonacular"`, labeled "On the menu", credited with a link to spoonacular). spoonacular's terms cap caching at 1 hour, so lookups live only in an in-memory 1-hour cache. Most spoonacular items have no photo on its CDN; those still become real-dish cards using the place's own Google photo (credited "Menu: spoonacular · Photo: …"). Each place costs ~1.1 points (~2.2 for a chain); the free plan's 50 points/day covers only a couple of rooms. Absent ⇒ suggested dishes.
- `ALLOWED_ORIGINS` — server-side CORS allowlist, comma-separated, scheme optional. The `REPLIT_*` domain vars still work as a fallback.
- `PRIVACY_CONTACT_EMAIL` — server-side; contact address shown on `/privacy` and the home page.
- `APP_STORE_URL`, `PLAY_STORE_URL` — server-side, optional; store links on the public home page. Unset ⇒ a "coming soon" chip, so set each once its listing is live.
- `ANDROID_CERT_SHA256` — server-side; Play app-signing key SHA-256 for `/.well-known/assetlinks.json` (Android App Links). Absent ⇒ 404.
- `DATABASE_URL` — only needed for `db:push`; the running app never touches Postgres.

`getApiUrl()` picks `http` for localhost/LAN hosts and `https` otherwise; `getWsUrl()` derives `ws`/`wss` from that, so local dev connects without edits.

## Deployment

The server runs on Railway (project `forkit`, service `forkit-server`) at `https://forkit-server-production.up.railway.app`, configured by [railway.json](railway.json). Pushing to `main` auto-deploys.

**`numReplicas` must stay 1.** Session state is an in-memory `Map`, so a second replica would split members of one session across servers. Any deploy also drops every live session.

`/api/health` backs the platform healthcheck. `/privacy` serves the store-required privacy policy from `server/templates/privacy-policy.html`. `/` serves the public home page (`server/templates/home.html`, the URL for store listings and the Play developer profile) to browsers; the Expo Go QR preview page moved to `/preview`.

## Architecture

**All session state is in-memory** in a module-level `Map` in [server/routes.ts](server/routes.ts). Restarting the server drops every live session. Sessions self-delete when the last member disconnects, plus a 1-hour sweep every 5 min. `shared/schema.ts` (Drizzle `users` table) and `server/storage.ts` (`MemStorage`) are unused scaffolding — no route reads them.

**`lib/food-data.ts` is shared across the client/server boundary** — `server/routes.ts` imports it via a relative path. Keep it free of React Native imports or the server build breaks.

**Two session modes** (`SessionMode = "dine-out" | "cook-in"`), chosen on `/home` and fixed at session-create time:
- `dine-out` — the room is for one `Meal` (breakfast/lunch/dinner, picked on `/home`, defaulting from local time). The client also sends its local weekday and minute, and the server keeps only places whose `regularOpeningHours` are open at that meal (`mealTime()`/`openAt()` in routes.ts; no hours listed counts as open). Breakfast rooms get only breakfast dishes and lunch/dinner rooms none. The server calls Google Places `searchNearby`, resolves photo redirects, then builds up to 4 dishes per restaurant: real popular dishes from Gemini Maps grounding when `GEMINI_API_KEY` is set and Gemini answers with a Maps source, otherwise real menu items for the big US chains from our own list ([server/curated-chains.ts](server/curated-chains.ts), `menuSource: "curated"`, signature items only, tagged breakfast or not; a chain on the list with nothing for the meal is left out), otherwise for other chains from spoonacular when `SPOONACULAR_API_KEY` is set (filtered for drinks, sides, garnishes and breakfast in `chain-menus.ts`), otherwise picks from a hardcoded cuisine→dishes table (`CUISINE_DISHES` in [server/cuisine-dishes.ts](server/cuisine-dishes.ts), keyed by Places `types`) and marks them `suggested` (3 per place, preferring dishes no other place in the room got; breakfast/brunch/cafe/coffee/bakery types are used only in breakfast rooms, and only they are). Suggested dishes show an example photo of that dish from Wikimedia Commons (`assets/dishes/<slug>.jpg`, served at `/assets`; author and license in `server/dish-photos.json`), labeled "example photo" and credited via `photoCredit` ("Photo: author · license · Wikimedia Commons"; CC BY/BY-SA require it). Adding a dish to the table means fetching its photo with `npx tsx scripts/fetch-dish-photos.ts` (no key; check the result, then `--source`/`--pick` to replace a bad one); dishes without one fall back to the place's own photo. Only one Places photo is resolved per place (each is a billed request). Places with no dish to show (fast food not on any chain list, cuisines with no table entry, nothing for the meal) are left out: every card has a dish. Cards also carry `phone`, `website` and `mapsUrl` for the match screen's actions (`components/MatchActions.tsx`). Grounding runs in parallel (15 s timeout each) while the session is created, so dine-out session creation takes ~10 s with Gemini on. Match = majority liked the same **restaurant**; the winning dish is the most-liked one there. A dine-out room with no location (or no places found) falls back to the made-up restaurants in `DISHES` (no `placeId`, so no match actions); the session carries `sample: "no-location" | "no-restaurants" | "lookup-failed"` (no Places key or an API error is `lookup-failed`, not `no-restaurants`) and the lobby, cards and match screen say they're sample restaurants. Create waits for the location rather than sending none.
- `cook-in` — 20 curated recipes, no location. Match = majority liked the same **dish**.

Both paths funnel into `checkForMatch()`, which runs on every swipe. Majority is a strict majority — `floor(memberCount / 2) + 1`, so 2/2, 2/3, 3/4, 3/5.

**Client↔server protocol** is hand-rolled JSON over one WebSocket at `/ws`. Message types are declared in [lib/websocket.ts](lib/websocket.ts) (`WsMessage`) but the server does not validate inbound messages — inbound kinds are `join` (optionally with `pushToken`), `push_token`, `start`, `swipe`, `undo`, `ping`, matched by string in the `ws.on("message")` block. Adding a message type means editing both files.

Host is whoever joins first (`session.hostId`); on host disconnect it transfers to the next member. Only the host's `start` is honored.

**Identity is ephemeral**: `Crypto.randomUUID()` generated per screen mount. `/session/[code]` mints one and passes it to `/swipe/[code]` as a route param — if that param is lost, the user rejoins as a new member and their swipes reset. Only the display name persists (AsyncStorage `userName`).

The swipe screen shows one card per restaurant (the server keeps each place's dishes adjacent; the client groups by `placeId`): tapping the photo's right/left half flips through its dishes (edge arrows on every multi-dish card, plus a "Tap for more dishes" hint until the device's first flip, AsyncStorage `seenDishFlipHint`), and a swipe or button votes on the dish showing. Progress counts places, not dishes.

Each device's own swipes are kept in `lib/swipe-review.ts` (module-level, reset per swipe screen) so the done and match screens can show what you swiped right and left on.

**Match notifications**: the lobby asks for notification permission; the swipe screen sends the Expo push token in a `push_token` message once it resolves (`lib/push.ts`). The server keeps tokens per session even after members disconnect and pushes to all of them on a match; the app hides the banner while in the foreground. Tapping one opens `/match` from the dish in the payload (the session may be gone by then). `lib/push.ts` loads `expo-notifications` defensively, so builds without the native module just run without push.

**Invite links**: `https://<host>/join/CODE` (served by `server/index.ts`, with `/.well-known/apple-app-site-association` for team `N526K73K96`) and `forkit://join/CODE` both map to `/session/CODE` in `app/+native-intent.tsx`. With no saved name, the lobby sends you to `/` with `join` set and returns after the name is entered. The https form needs a build that includes `ios.associatedDomains`. On Android it needs the `autoVerify` intent filter in `app.json` plus `/.well-known/assetlinks.json`, which the server serves only when `ANDROID_CERT_SHA256` (Play app-signing key SHA-256, comma-separated for more keys) is set; otherwise it 404s and those links open in the browser.

**Screens** (`app/`, expo-router file-based, typedRoutes enabled): `index` name entry → `home` mode/create/join → `session/[code]` lobby → `swipe/[code]` game → `match` result. Both `session/` and `swipe/` open their own WebSocket independently.

## Server-as-Expo-host

`server/index.ts` does more than serve `/api`. It inspects the `expo-platform` header on `/` and `/manifest` to serve native manifests out of `static-build/<platform>/manifest.json`, and otherwise renders `server/templates/home.html` (the Expo Go preview, `landing-page.html`, is at `/preview`). `scripts/build.js` produces `static-build/` by booting Metro, downloading the ios/android bundles and manifests from it, then killing it.

CORS allows only `REPLIT_DEV_DOMAIN` / `REPLIT_DOMAINS` origins plus any `localhost`/`127.0.0.1` port.

## Gotchas

- `metro.config.js` blocks `.local/skills/.tmp-*` from the resolver — temp agent-skill dirs crashed Metro. Don't remove it.
- `postinstall` runs `patch-package` (`patches/expo-asset+12.0.13.patch`); use `npm install`, not a raw node_modules copy.
- `reactCompiler` is enabled in `app.json` experiments — babel-plugin-react-compiler runs on all app code.
- Brand: the motto is "Swipe right on dinner" (welcome screen, lobby, swipe header, share text, `/join` page). Logo: `assets/images/icon.svg` is the vector master (used by `/join`); `logo.png` is a 360 px copy of `icon.png` for the welcome screen. `splash-icon.svg` is the splash master; Expo needs a PNG, so `splash-icon.png` is rendered from it at 1024 px and the splash `backgroundColor` matches its edge (`#232121`).
- Tester guide: `docs/testers-guide.html` is the source of the TestFlight guide published at https://claude.ai/artifact/Ub3PpMhxWVwEow9kmDaddq (testers already have that link). `npm run guide:build` inlines the logo SVGs and writes `dist/testers-guide.html`, which gets republished to the same URL. It quotes on-screen labels (Let's Eat, Create Room, Join Room, Start Swiping, Allow While Using App), so a PR that renames one of those must update the guide too.
- Theme is fixed dark: `#0F0F0F` background, `#FF6B35` accent, Poppins loaded in `_layout.tsx` (renders `null` until fonts resolve). Colors live in [constants/colors.ts](constants/colors.ts).
- Path aliases: `@/*` → repo root, `@shared/*` → `shared/`.
