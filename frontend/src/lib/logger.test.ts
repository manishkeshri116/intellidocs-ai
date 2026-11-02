import { afterEach, describe, expect, it, vi } from "vitest";
import { logger, shouldLog } from "./logger";

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes safe messages and allowlisted metadata to the matching console level", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logger.warn("API request failed", { category: "chat", status: 503 });
    expect(warning).toHaveBeenCalledWith("[warn] API request failed", { category: "chat", status: 503 });
  });

  it("does not include arbitrary metadata that could contain sensitive data", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("Request failed", undefined, { category: "authentication", status: 401, errorType: "AxiosError" });
    expect(error).toHaveBeenCalledWith("[error] Request failed", {
      category: "authentication", status: 401, errorType: "AxiosError",
    });
  });

  it("keeps debug output disabled in production", () => {
    expect(shouldLog("debug", true)).toBe(false);
    expect(shouldLog("info", true)).toBe(true);
    expect(shouldLog("debug", false)).toBe(true);
  });
});
