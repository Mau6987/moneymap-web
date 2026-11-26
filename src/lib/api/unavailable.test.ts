import { describe, expect, it } from "vitest";

import { ApiError, NETWORK_ERROR } from "./errors";
import { isApiUnavailable, safeReturn, unavailableUrl } from "./unavailable";

describe("MM-182 MoneyMap no responde", () => {
  it("is the API down: no answer, 502, 503 or 504", () => {
    expect(isApiUnavailable(new ApiError(NETWORK_ERROR, 0))).toBe(true);
    expect(isApiUnavailable(new ApiError("unknown_error", 503))).toBe(true);
    expect(isApiUnavailable(new ApiError("validation_error", 422))).toBe(false);
    expect(isApiUnavailable(new Error("boom"))).toBe(false);
  });

  it("only goes back to a path of this site", () => {
    expect(safeReturn("/budgets?currency=USD")).toBe("/budgets?currency=USD");
    expect(safeReturn("//evil.example")).toBe("/map");
    expect(safeReturn("https://evil.example")).toBe("/map");
    expect(safeReturn("/unavailable?from=/map")).toBe("/map");
    expect(safeReturn(null)).toBe("/map");
    expect(unavailableUrl("/goals")).toBe("/unavailable?from=%2Fgoals");
  });
});
