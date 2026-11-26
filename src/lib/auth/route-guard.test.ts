import { describe, expect, it } from "vitest";

import { guard } from "./route-guard";

describe("guard", () => {
  it("sends a visitor without a session to the login (RF-1)", () => {
    expect(guard("/map", false, false)).toBe("to-login");
    expect(guard("/goals/123", false, false)).toBe("to-login");
  });

  it("lets a visitor without a session open the guest pages", () => {
    expect(guard("/login", false, false)).toBe("continue");
    expect(guard("/register", false, false)).toBe("continue");
    expect(guard("/forgot-password", false, false)).toBe("continue");
  });

  it("refreshes first when only the refresh token is left (RF-19)", () => {
    expect(guard("/map", false, true)).toBe("refresh");
    expect(guard("/login", false, true)).toBe("refresh");
  });

  it("sends a signed-in person away from the guest pages", () => {
    expect(guard("/login", true, true)).toBe("to-home");
    expect(guard("/map", true, true)).toBe("continue");
  });

  it("never redirects the session and email-link routes", () => {
    expect(guard("/session/expired", true, true)).toBe("continue");
    expect(guard("/verify-email", false, false)).toBe("continue");
  });
});
