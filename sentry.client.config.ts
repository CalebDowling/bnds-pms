import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (dsn) {
  const environment =
    process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
  // Perf-sensitive: 2% prod sampling cuts client-side tracing overhead by ~80%
  // while still giving statistically significant samples for perf monitoring.
  const tracesSampleRate =
    environment === "production" ? 0.02 : 1.0;

  Sentry.init({
    dsn,
    environment,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    tracesSampleRate,
    replaysSessionSampleRate: 0,
    // Was 1.0 — every error captured a full session replay (bandwidth + CPU heavy).
    // 0.25 still gives roughly 1 in 4 error replays for debugging.
    replaysOnErrorSampleRate: 0.25,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
  });
}
