import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

  if (dsn) {
    const environment =
      process.env.VERCEL_ENV || process.env.NODE_ENV || "development";
    const tracesSampleRate =
      environment === "production" ? 0.1 : 1.0;

    Sentry.init({
      dsn,
      environment,
      release: process.env.VERCEL_GIT_COMMIT_SHA,
      tracesSampleRate,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
