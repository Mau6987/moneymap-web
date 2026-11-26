import { describe, expect, it, vi } from "vitest";

import { createRefresher } from "./refresh";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_MAX_AGE_SECONDS,
  clearedCookies,
  sessionCookies,
} from "./tokens";

const pair = { access_token: "a1", refresh_token: "r1", expires_in: 900 };

describe("sessionCookies", () => {
  it("keeps both tokens in httpOnly cookies (RF-4)", () => {
    const cookies = sessionCookies(pair, true);

    expect(cookies.map((c) => [c.name, c.value])).toEqual([
      [ACCESS_COOKIE, "a1"],
      [REFRESH_COOKIE, "r1"],
    ]);
    for (const c of cookies) {
      expect(c.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    }
  });

  it("drops the access cookie before the token expires and keeps the refresh 30 days", () => {
    const [access, refresh] = sessionCookies(pair, false);

    expect(access?.options.maxAge).toBe(870);
    expect(refresh?.options.maxAge).toBe(REFRESH_MAX_AGE_SECONDS);
  });

  it("clears both cookies", () => {
    expect(clearedCookies(true).map((c) => [c.name, c.value, c.options.maxAge])).toEqual([
      [ACCESS_COOKIE, "", 0],
      [REFRESH_COOKIE, "", 0],
    ]);
  });
});

describe("createRefresher", () => {
  it("asks the API once when several requests refresh together (RF-19)", async () => {
    const refresh = vi.fn(async () => ({ ...pair, refresh_token: "r2" }));
    const refreshOnce = createRefresher(refresh);

    const results = await Promise.all([refreshOnce("r1"), refreshOnce("r1"), refreshOnce("r1")]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.refresh_token === "r2")).toBe(true);
  });

  it("forgets a failed refresh so the next request can try again", async () => {
    const refresh = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ ...pair, refresh_token: "r2" });
    const refreshOnce = createRefresher(refresh);

    await expect(refreshOnce("r1")).rejects.toThrow("network");
    await expect(refreshOnce("r1")).resolves.toMatchObject({ refresh_token: "r2" });
  });

  it("forgets a rotated token after a few seconds", async () => {
    let time = 0;
    const refresh = vi.fn(async () => pair);
    const refreshOnce = createRefresher(refresh, () => time);

    await refreshOnce("r1");
    time = 11_000;
    await refreshOnce("r1");

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
