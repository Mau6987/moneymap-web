// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AllScreensMenu } from "@/components/all-screens-menu";
import { catalogs } from "@/lib/i18n/catalog";

import { changeSummary } from "./components/change-summary";
import { PlanFeaturesForm } from "./components/plan-editor";
import { demoAdminGateway } from "./data/admin-gateway";

vi.mock("@/lib/auth/session", () => ({ withAccessToken: vi.fn() }));

const t = catalogs.es.admin;

describe("Panel de planes (MM-190)", () => {
  it("only the administrator sees the panel in All screens", () => {
    const { container, rerender } = render(<AllScreensMenu isCurrent={() => false} />);
    expect(container.querySelector('a[href="/admin"]')).toBeNull();

    rerender(<AllScreensMenu isCurrent={() => false} admin />);
    expect(container.querySelector('a[href="/admin"]')?.textContent).toBe("Panel de planes");
  });

  it("the history reads each change in words, translated", () => {
    const change = {
      occurred_at: "2026-10-27T10:00:00Z",
      entity: "billing.plan_features",
      action: "update",
      changes: { limit_value: [2, null], is_enabled: [true, true], plan_id: ["x", "x"] },
    };

    expect(changeSummary(change, t)).toBe("límite: 2 → sin límite · incluida: sí → sí");
    expect(changeSummary(change, catalogs.en.admin)).toBe(
      "limit: 2 → no limit · included: yes → yes",
    );
  });

  it("the demo keeps the changes and enforces the rules", async () => {
    await demoAdminGateway.setFeature("", "free", "goals.active", { enabled: true, limit: 4 });
    const free = (await demoAdminGateway.plans("")).find((p) => p.code === "free")!;
    expect(free.features.find((f) => f.key === "goals.active")?.limit).toBe(4);
    await expect(
      demoAdminGateway.setFeature("", "free", "notify.push", { enabled: true, limit: 3 }),
    ).rejects.toThrow();
    await expect(
      demoAdminGateway.updatePlan("", "free", {
        name: "Gratuito",
        description: null,
        is_public: false,
      }),
    ).rejects.toThrow();
    expect((await demoAdminGateway.changes("", 5)).length).toBeGreaterThan(0);
    await demoAdminGateway.setFeature("", "free", "goals.active", { enabled: true, limit: null });
  });

  it("the features show translated names and warn that lowering deletes nothing", async () => {
    const plan = (await demoAdminGateway.plans("")).find((p) => p.code === "paid_3")!;
    render(<PlanFeaturesForm plan={plan} action={async () => ({})} />);

    expect(screen.getByText("Metas")).toBeTruthy();
    expect(screen.getByText(/no borra nada/)).toBeTruthy();
  });
});
