import { describe, expect, it } from "vitest";

import { cleanName, passwordStrength, passwordsMatch } from "./register-validation";

describe("cleanName", () => {
  it("trims and collapses repeated spaces", () => {
    expect(cleanName("  Ana   María ")).toBe("Ana María");
  });
});

describe("passwordStrength", () => {
  it.each([
    ["", 0],
    ["abc", 1],
    ["abcdefgh", 1],
    ["abcdefg1", 2],
    ["contrasena12", 3],
    ["Contrasena12!", 4],
  ])("rates %j as %i of 4 (RF-2f)", (password, level) => {
    expect(passwordStrength(password)).toBe(level);
  });
});

describe("passwordsMatch", () => {
  it("never matches an empty confirmation (RF-3)", () => {
    expect(passwordsMatch("", "")).toBe(false);
    expect(passwordsMatch("secreta12", "secreta12")).toBe(true);
    expect(passwordsMatch("secreta12", "secreta13")).toBe(false);
  });
});
