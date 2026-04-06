import { describe, it, expect, vi } from "vitest";
import { withRetry, isRetryableHttpError } from "@/lib/integrations/retry";

describe("retry", () => {
  it("returns result on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure and eventually succeeds", async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValue("ok");
    const result = await withRetry(fn, { maxRetries: 3, baseDelayMs: 10 });
    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws after exhausting retries", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fail"));
    await expect(withRetry(fn, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow("always fail");
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("stops retrying when retryOn returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("permanent"));
    await expect(
      withRetry(fn, { maxRetries: 3, baseDelayMs: 10, retryOn: () => false })
    ).rejects.toThrow("permanent");
    expect(fn).toHaveBeenCalledTimes(1); // No retries
  });
});

describe("isRetryableHttpError", () => {
  it("identifies network errors as retryable", () => {
    expect(isRetryableHttpError(new Error("fetch failed"))).toBe(true);
    expect(isRetryableHttpError(new Error("network error"))).toBe(true);
    expect(isRetryableHttpError(new Error("ECONNRESET"))).toBe(true);
  });

  it("identifies non-network errors as non-retryable", () => {
    expect(isRetryableHttpError(new Error("validation failed"))).toBe(false);
    expect(isRetryableHttpError(new Error("not found"))).toBe(false);
  });
});
