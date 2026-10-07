import express from "express";
import type { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import * as fs from "fs";
import * as path from "path";

const app = express();
const log = console.log;

// Bump this when the privacy policy text changes.
const PRIVACY_LAST_UPDATED = "4 October 2026";
const PRIVACY_CONTACT_EMAIL =
  process.env.PRIVACY_CONTACT_EMAIL || "seanzmc9613@gmail.com";
// Store listing URLs for the public home page. Unset ⇒ a "Coming soon" chip
// instead of a link that would 404 before the listing is live.
const APP_STORE_URL = process.env.APP_STORE_URL;
const PLAY_STORE_URL = process.env.PLAY_STORE_URL;

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

function setupCors(app: express.Application) {
  app.use((req, res, next) => {
    const origins = new Set<string>();

    // Comma-separated list of allowed origins, with or without scheme.
    // Primary mechanism for non-Replit deployments.
    if (process.env.ALLOWED_ORIGINS) {
      process.env.ALLOWED_ORIGINS.split(",").forEach((o) => {
        const trimmed = o.trim();
        if (!trimmed) return;
        origins.add(
          /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`,
        );
      });
    }

    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }

    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }

    const origin = req.header("origin");

    // Allow localhost origins for Expo web development (any port)
    const isLocalhost =
      origin?.startsWith("http://localhost:") ||
      origin?.startsWith("http://127.0.0.1:");

    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS",
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    next();
  });
}

function setupBodyParsing(app: express.Application) {
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.use(express.urlencoded({ extended: false }));
}

function setupRequestLogging(app: express.Application) {
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      if (!path.startsWith("/api")) return;

      const duration = Date.now() - start;

      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    });

    next();
  });
}

function getAppName(): string {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}

function serveExpoManifest(platform: string, res: Response) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json",
  );

  if (!fs.existsSync(manifestPath)) {
    return res
      .status(404)
      .json({ error: `Manifest not found for platform: ${platform}` });
  }

  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");

  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}

function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName,
}: {
  req: Request;
  res: Response;
  landingPageTemplate: string;
  appName: string;
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;

  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);

  const html = landingPageTemplate
    .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
    .replace(/EXPS_URL_PLACEHOLDER/g, expsUrl)
    .replace(/APP_NAME_PLACEHOLDER/g, appName);

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function storeButtons(): string {
  const button = (label: string, url?: string) =>
    url
      ? `<a class="store" href="${escapeHtml(url)}">${label}</a>`
      : `<span class="store soon">${label}: coming soon</span>`;
  return button("App Store", APP_STORE_URL) + button("Google Play", PLAY_STORE_URL);
}

function configureExpoAndLanding(app: express.Application) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html",
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();

  // Public home page, shown at / to ordinary browsers. The Expo Go preview
  // page (QR code) that used to live there is at /preview.
  const homeTemplate = fs.readFileSync(
    path.resolve(process.cwd(), "server", "templates", "home.html"),
    "utf-8",
  );
  const serveHome = (req: Request, res: Response) => {
    const protocol = req.header("x-forwarded-proto") || req.protocol || "https";
    const host = req.header("x-forwarded-host") || req.get("host");
    const html = homeTemplate
      .replace(/STORE_BUTTONS_PLACEHOLDER/g, storeButtons())
      .replace(/BASE_URL_PLACEHOLDER/g, `${protocol}://${host}`)
      .replace(/CONTACT_EMAIL_PLACEHOLDER/g, PRIVACY_CONTACT_EMAIL)
      .replace(/YEAR_PLACEHOLDER/g, String(new Date().getFullYear()))
      .replace(/APP_NAME_PLACEHOLDER/g, appName);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  };

  app.get("/preview", (req: Request, res: Response) => {
    serveLandingPage({ req, res, landingPageTemplate, appName });
  });

  // The App Store and Play Console both require a publicly reachable privacy
  // policy URL, so it is served from the same host as the API.
  const privacyPath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "privacy-policy.html",
  );
  const privacyTemplate = fs.readFileSync(privacyPath, "utf-8");
  const privacyHtml = privacyTemplate
    .replace(/APP_NAME_PLACEHOLDER/g, appName)
    .replace(/LAST_UPDATED_PLACEHOLDER/g, PRIVACY_LAST_UPDATED)
    .replace(/CONTACT_EMAIL_PLACEHOLDER/g, PRIVACY_CONTACT_EMAIL);

  app.get("/privacy", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(privacyHtml);
  });

  // Invite links: https://<host>/join/<code>. With the app installed, iOS
  // opens it straight into the session (universal link, via the
  // apple-app-site-association file below and the app's associatedDomains);
  // otherwise this page shows the code and an "Open in ForkIt" button.
  const joinTemplate = fs.readFileSync(
    path.resolve(process.cwd(), "server", "templates", "join.html"),
    "utf-8",
  );
  app.get("/join/:code", (req: Request, res: Response) => {
    const code = String(req.params.code).toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(code)) {
      return res.redirect("/");
    }
    const html = joinTemplate
      .replace(/APP_NAME_PLACEHOLDER/g, appName)
      .replace(/CODE_PLACEHOLDER/g, code)
      .replace(/APP_LINK_PLACEHOLDER/g, `forkit://join/${code}`);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  });

  // Team ID N526K73K96 + bundle ID: the app allowed to open /join links.
  app.get("/.well-known/apple-app-site-association", (_req: Request, res: Response) => {
    res.json({
      applinks: {
        details: [
          {
            appIDs: ["N526K73K96.com.seandm.forkit"],
            components: [{ "/": "/join/*" }],
          },
        ],
      },
    });
  });

  // Android App Links: lets the app's autoVerify intent filter claim /join
  // links. ANDROID_CERT_SHA256 is the Play app-signing key's SHA-256
  // (Play Console → Test and release → App integrity), comma-separated to
  // also allow an upload or EAS dev key. Unset ⇒ 404, links open the browser.
  const androidCertFingerprints = (process.env.ANDROID_CERT_SHA256 || "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter(Boolean);
  app.get("/.well-known/assetlinks.json", (_req: Request, res: Response) => {
    if (androidCertFingerprints.length === 0) {
      return res.status(404).json([]);
    }
    res.json([
      {
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: "com.seandm.forkit",
          sha256_cert_fingerprints: androidCertFingerprints,
        },
      },
    ]);
  });

  log("Serving static Expo files with dynamic manifest routing");

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }

    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }

    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }

    if (req.path === "/") {
      return serveHome(req, res);
    }

    next();
  });

  // Includes the example dish photos (assets/dishes). The app requests them
  // with a ?v=<content hash>, so a replaced photo gets a new URL and a week
  // of caching never pairs an old image with a new credit.
  app.use("/assets", express.static(path.resolve(process.cwd(), "assets"), { maxAge: "7d" }));
  app.use(express.static(path.resolve(process.cwd(), "static-build")));

  log("Expo routing: Checking expo-platform header on / and /manifest");
}

function setupErrorHandler(app: express.Application) {
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    const error = err as {
      status?: number;
      statusCode?: number;
      message?: string;
    };

    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });
}

(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);

  configureExpoAndLanding(app);

  const server = await registerRoutes(app);

  setupErrorHandler(app);

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      // SO_REUSEPORT is Linux-only; macOS and Windows throw ENOTSUP
      reusePort: process.platform === "linux",
    },
    () => {
      log(`express server serving on port ${port}`);
    },
  );
})();
