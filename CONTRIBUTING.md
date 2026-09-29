# Contributing

`main` is protected: every change lands through a pull request. Do not push to `main` directly.

## Flow

1. Branch from `main`: `git switch -c <type>/<short-name>` (e.g. `fix/join-validation`).
2. Commit in small, focused steps.
3. Run the checks locally:
   ```bash
   npx expo customize tsconfig.json   # once per fresh checkout; generates expo-env.d.ts
   npm run typecheck
   npm run lint
   ```
4. Push and open a PR against `main`. Fill in the PR template.
5. CI (`.github/workflows/ci.yml`) must pass. It runs typecheck, lint, an Expo config
   check, a server build, and a boot/health/create-session smoke test.
6. Squash-merge once CI is green. Merging to `main` deploys the server on Railway.

## Expo config guard

CI fails if `app.json` drifts from release requirements: bundle ID must be
`com.seandm.forkit`, `ITSAppUsesNonExemptEncryption` must be `false`, and the
iOS build must not target tablets. Change the guard in `ci.yml` if you change these on purpose.

## Repo settings (maintainer, one time)

In GitHub → Settings → Branches, add a rule for `main`: require a pull request,
require the `CI / check` and `CI / expo-config` status checks, require branches to be up to date.
