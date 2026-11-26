import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  login: vi.fn(),
  refresh: vi.fn(),
  logout: vi.fn(),
  me: vi.fn(),
}));
const session = vi.hoisted(() => ({
  saveSession: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("./data/auth-gateway", () => ({ authGateway: () => gateway }));
vi.mock("@/lib/auth/session", () => session);
vi.mock("next/navigation", () => navigation);
const theme = vi.hoisted(() => ({ saveTheme: vi.fn() }));
const settings = vi.hoisted(() => ({ preferences: vi.fn() }));
vi.mock("@/lib/theme-cookie", () => theme);
vi.mock("../settings/data/settings-gateway", () => ({ settingsGateway: () => settings }));

const { login } = await import("./login-action");

function form(email: string, password: string) {
  const data = new FormData();
  data.set("email", email);
  data.set("password", password);
  return data;
}

const tokens = { access_token: "a", refresh_token: "r", expires_in: 900 };

beforeEach(() => vi.clearAllMocks());

describe("login", () => {
  it("saves the tokens in the session and opens the app (RF-4)", async () => {
    gateway.login.mockResolvedValue(tokens);

    await expect(login({ email: "" }, form(" ana@correo.com ", "secreta"))).rejects.toThrow(
      "redirect:/",
    );

    expect(gateway.login).toHaveBeenCalledWith("ana@correo.com", "secreta");
    expect(session.saveSession).toHaveBeenCalledWith(tokens);
  });

  it("RF-17 (001) keeps the theme chosen on another device", async () => {
    gateway.login.mockResolvedValue(tokens);
    settings.preferences.mockResolvedValue({ theme: "dark" });

    await expect(login({ email: "" }, form("ana@correo.com", "secreta"))).rejects.toThrow(
      "redirect:/",
    );

    expect(settings.preferences).toHaveBeenCalledWith("a");
    expect(theme.saveTheme).toHaveBeenCalledWith("dark");
  });

  it("signs in even when the preferences do not load", async () => {
    gateway.login.mockResolvedValue(tokens);
    settings.preferences.mockRejectedValue(new ApiError("network_error", 0));

    await expect(login({ email: "" }, form("ana@correo.com", "secreta"))).rejects.toThrow(
      "redirect:/",
    );

    expect(theme.saveTheme).not.toHaveBeenCalled();
  });

  it("returns the API code and the email when it fails (RF-5)", async () => {
    gateway.login.mockRejectedValue(new ApiError("invalid_credentials", 401));

    const state = await login({ email: "" }, form("ana@correo.com", "incorrecta"));

    expect(state).toEqual({ email: "ana@correo.com", error: "invalid_credentials" });
    expect(session.saveSession).not.toHaveBeenCalled();
  });

  it("does not call the API with an invalid email (RF-3)", async () => {
    const state = await login({ email: "" }, form("ana@correo", "secreta"));

    expect(gateway.login).not.toHaveBeenCalled();
    expect(state.error).toBe("invalid_credentials");
  });
});
