// Railway Infrastructure as Code for the ForkIt server. Railway does not read
// this file on deploy: changes take effect only through `railway config plan`
// and `railway config apply`.
import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const forkitServer = service("forkit-server", {
    // "Wait for CI" (checkSuites) must stay off: on, Railway waits for
    // verify-deploy while verify-deploy waits for Railway, and every deploy is skipped.
    source: github("seanzmc/forkit", { branch: "main", checkSuites: false }),
    build: { builder: "NIXPACKS", buildCommand: "npm run server:build" },
    start: "npm run server:prod",
    healthcheck: "/api/health",
    healthcheckTimeout: 30,
    // Session state is an in-memory Map; a second replica would split sessions.
    replicas: 1,
    deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
  });

  return project("forkit", {
    // Variables (API keys) stay in the Railway dashboard; this file never reads
    // or writes them. The repo is public, so they must never land here.
    // (The CLI reads this key; railway 3.16's types don't declare it yet.)
    variables: { managed: false },
    resources: [forkitServer],
  });
});
