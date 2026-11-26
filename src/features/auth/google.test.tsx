// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";
import { DEMO_GOOGLE_TOKEN, DEMO_NEW_USER_TOKEN } from "@/lib/demo";

const gateway = vi.hoisted(() => ({ signIn: vi.fn(), complete: vi.fn() }));
const session = vi.hoisted(() => ({
  saveSession: vi.fn(),
  saveSocialRegistration: vi.fn(),
  socialRegistration: vi.fn(),
  clearSocialRegistration: vi.fn(),
}));
const theme = vi.hoisted(() => ({ applyTheme: vi.fn() }));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));

vi.mock("./data/google-gateway", async (original) => ({
  ...(await original<object>()),
  googleGateway: () => gateway,
}));
vi.mock("@/lib/auth/session", () => session);
vi.mock("./apply-theme", () => theme);
vi.mock("next/navigation", () => navigation);

const { signInWithGoogle, completeGoogleProfile } = await import("./google-actions");
const { demoGoogleGateway } = await import("./data/google-gateway");
const { GoogleButton } = await import("./components/google-button");
const { CompleteProfileForm } = await import("./components/complete-profile-form");

const tokens = { access_token: "a", refresh_token: "r", expires_in: 900 };
const registration = { token: "reg", email: "ana@gmail.com", firstName: "Ana", lastName: null };

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => vi.clearAllMocks());

describe("signInWithGoogle", () => {
  it("RF-9 a known account enters like with the password", async () => {
    gateway.signIn.mockResolvedValue({ kind: "signed_in", tokens });

    await expect(signInWithGoogle("id-token")).rejects.toThrow("redirect:/map");
    expect(gateway.signIn).toHaveBeenCalledWith("id-token");
    expect(session.saveSession).toHaveBeenCalledWith(tokens);
    expect(theme.applyTheme).toHaveBeenCalledWith("a");
  });

  it("RF-10 a new person goes to Completa tu perfil, with the token in the cookie", async () => {
    gateway.signIn.mockResolvedValue({
      kind: "registration_required",
      registrationToken: "reg",
      email: "ana@gmail.com",
      firstName: "Ana",
      lastName: null,
    });

    await expect(signInWithGoogle("id-token")).rejects.toThrow("redirect:/register/google");
    expect(session.saveSocialRegistration).toHaveBeenCalledWith(registration);
    expect(session.saveSession).not.toHaveBeenCalled();
  });

  it("returns the API code when Google's token is refused", async () => {
    gateway.signIn.mockRejectedValue(new ApiError("invalid_provider_token", 401));

    expect(await signInWithGoogle("bad")).toEqual({ error: "invalid_provider_token" });
  });
});

describe("completeGoogleProfile", () => {
  it("without a registration token it asks to enter again", async () => {
    session.socialRegistration.mockResolvedValue(undefined);

    expect(await completeGoogleProfile({}, form({}))).toEqual({ error: "registration_expired" });
  });

  it("needs the names and the terms", async () => {
    session.socialRegistration.mockResolvedValue(registration);

    expect(await completeGoogleProfile({}, form({ first_name: "Ana", last_name: " " }))).toEqual({
      error: "name_required",
    });
    expect(
      await completeGoogleProfile({}, form({ first_name: "Ana", last_name: "Rojas" })),
    ).toEqual({ error: "terms_required" });
    expect(gateway.complete).not.toHaveBeenCalled();
  });

  it("creates the account, saves the session and opens the app", async () => {
    session.socialRegistration.mockResolvedValue(registration);
    gateway.complete.mockResolvedValue(tokens);

    await expect(
      completeGoogleProfile({}, form({ first_name: " Ana ", last_name: "Rojas", terms: "on" })),
    ).rejects.toThrow("redirect:/map");
    expect(gateway.complete).toHaveBeenCalledWith({
      registration_token: "reg",
      first_name: "Ana",
      last_name: "Rojas",
      terms_version: "2026-10",
    });
    expect(session.saveSession).toHaveBeenCalledWith(tokens);
    expect(session.clearSocialRegistration).toHaveBeenCalled();
  });

  it("an expired registration token clears the cookie", async () => {
    session.socialRegistration.mockResolvedValue(registration);
    gateway.complete.mockRejectedValue(new ApiError("invalid_registration_token", 401));

    expect(
      await completeGoogleProfile({}, form({ first_name: "Ana", last_name: "Rojas", terms: "on" })),
    ).toEqual({ error: "registration_expired" });
    expect(session.clearSocialRegistration).toHaveBeenCalled();
  });
});

describe("demo Google", () => {
  it("asks to complete the profile the first time and then enters", async () => {
    expect((await demoGoogleGateway.signIn(DEMO_GOOGLE_TOKEN)).kind).toBe("registration_required");
    const created = await demoGoogleGateway.complete({
      registration_token: "demo-registration",
      first_name: "Ana",
      last_name: "Rojas",
      terms_version: "2026-10",
    });
    expect(created.access_token).toBe(DEMO_NEW_USER_TOKEN);
    expect((await demoGoogleGateway.signIn(DEMO_GOOGLE_TOKEN)).kind).toBe("signed_in");
  });
});

describe("Google on screen", () => {
  it("without a Client ID and outside the demo there is no Google", () => {
    const { container } = render(<GoogleButton action={signInWithGoogle} demo={false} />);
    expect(container.innerHTML).toBe("");
  });

  it("the demo button sends the demo token", async () => {
    const action = vi.fn().mockResolvedValue({});
    render(<GoogleButton action={action} demo />);

    expect(screen.getByText("o continúa con")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));
    expect(action).toHaveBeenCalledWith(DEMO_GOOGLE_TOKEN);
  });

  it("RF-10 Crear cuenta waits for the names and the terms", async () => {
    render(
      <CompleteProfileForm
        action={completeGoogleProfile}
        email="ana@gmail.com"
        firstName="Ana"
        lastName={null}
      />,
    );
    const submit = screen.getByRole("button", { name: "Crear cuenta" }) as HTMLButtonElement;
    expect(screen.getByText("ana@gmail.com verificado con Google")).toBeTruthy();
    expect(submit.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText("Apellido"), "Rojas");
    expect(submit.disabled).toBe(true);
    await userEvent.click(screen.getByLabelText("Acepto los Términos y la Privacidad"));
    expect(submit.disabled).toBe(false);
  });
});
