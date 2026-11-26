// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

import { NoticeSwitch } from "./components/notice-forms";
import type { InboxItem, NoticeSetting } from "./data/notifications-gateway";
import { noticeHref, noticeIcon } from "./domain/notices";
import { toggleNotice } from "./notifications-actions";

// Una función común y no `vi.fn()`: el espía deja sin manejar el rechazo que la acción sí atrapa.
const calls: unknown[][] = [];
let outcome: () => Promise<unknown> = async () => [];
const setEnabled = (...args: unknown[]) => {
  calls.push(args);
  return outcome();
};
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => unknown) => call("token"),
}));
vi.mock("./data/notifications-gateway", async (original) => {
  const real = await original<typeof import("./data/notifications-gateway")>();
  return {
    ...real,
    notificationsGateway: () => ({ ...real.demoNotificationsGateway, setEnabled }),
  };
});

const item = (data: Record<string, unknown>): InboxItem => ({
  id: "n1",
  type: "goal.milestone",
  title: "",
  body: "",
  data,
  created_at: "2026-10-23T15:00:00Z",
  read_at: null,
});

const setting = (over: Partial<NoticeSetting>): NoticeSetting => ({
  type: "goal.milestone",
  description: "Al llegar al 25, 50 y 75 %",
  enabled: true,
  can_disable: true,
  ...over,
});

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

beforeEach(() => {
  calls.length = 0;
  outcome = async () => [];
});

describe("Avisos", () => {
  it("each notice opens its screen, when the web has it", () => {
    expect(noticeHref(item({ screen: "goal", goal_id: "g1" }))).toBe("/goals?goal=g1");
    expect(noticeHref(item({ screen: "budgets", budget_id: "b1" }))).toBe("/budgets?budget=b1");
    expect(noticeHref(item({ screen: "money_story", period: "2026-09" }))).toBe(
      "/money-story?period=2026-09",
    );
    expect(noticeHref(item({ screen: "recurring", due_on: "2026-10-01" }))).toBeNull();
    expect(noticeHref(item({ screen: "something_new" }))).toBeNull();
  });

  it("a type it does not know uses the bell", () => {
    expect(noticeIcon("goal.achieved")).toBe("goals");
    expect(noticeIcon("subscription.renewed")).toBe("bell");
  });
});

describe("Notificaciones", () => {
  it("RF-11 the switch sends the opposite value", async () => {
    await expect(
      toggleNotice({}, form({ type: "goal.milestone", enabled: "false" })),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(calls).toEqual([["token", "goal.milestone", false]]);
  });

  it("a failed change is reported, not hidden", async () => {
    outcome = async () => {
      throw new ApiError("network_error", 0);
    };

    expect(await toggleNotice({}, form({ type: "goal.milestone", enabled: "true" }))).toEqual({
      error: "network_error",
    });
  });

  it("RF-11 shows the switch state", () => {
    render(<NoticeSwitch setting={setting({})} action={toggleNotice} />);

    const button = screen.getByRole("switch");
    expect(button.getAttribute("aria-checked")).toBe("true");
    expect((button as HTMLButtonElement).disabled).toBe(false);
  });

  it("RF-12 security notices cannot be turned off", () => {
    render(
      <NoticeSwitch
        setting={setting({ type: "security.new_login", can_disable: false })}
        action={toggleNotice}
      />,
    );

    expect((screen.getByRole("switch") as HTMLButtonElement).disabled).toBe(true);
  });
});
