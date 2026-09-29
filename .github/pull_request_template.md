## What & why

<!-- One or two sentences: what changed and why. -->

## How it was tested

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Ran the app (server + client) for anything user-facing

## Release impact

- [ ] Touches `app.json`, `eas.json`, or native config (needs a new EAS build)
- [ ] Touches the WebSocket protocol (`lib/websocket.ts` and `server/routes.ts` both updated)
- [ ] Server change (Railway deploy drops all live sessions)
