import { describe, expect, it } from "vitest";

import { categoryName, noticeText, planName } from "./api-texts";

describe("Textos de la API en el idioma elegido (MM-191)", () => {
  it("translates the default categories and keeps the ones the person named", () => {
    expect(categoryName("Supermercado", "en")).toBe("Groceries");
    expect(categoryName("Salud", "pt")).toBe("Saúde");
    expect(categoryName("Health", "es")).toBe("Salud");
    expect(categoryName("Mi negocio", "en")).toBe("Mi negocio");
    expect(categoryName(null, "en")).toBeNull();
  });

  it("translates the seed plan names but not a name the administrator wrote", () => {
    expect(planName("free", "Gratuito", "en")).toBe("Free");
    expect(planName("paid_1", "Plan de pago 1", "pt")).toBe("Plano pago 1");
    expect(planName("paid_1", "Plus", "en")).toBe("Plus");
  });

  it("rebuilds every inbox phrase the back writes", () => {
    const en = (type: string, title: string, body: string) =>
      noticeText(type, { title, body }, "en");

    expect(
      en("recurring.due_soon", "Tienes 2 pagos recurrentes mañana", "Abre MoneyMap para verlos."),
    ).toEqual({
      title: "You have 2 recurring payments tomorrow",
      body: "Open MoneyMap to see them.",
    });
    expect(
      en("recurring.due_soon", "Tienes un pago recurrente el 05/11", "Netflix (Bs 60.00).").title,
    ).toBe("You have a recurring payment on 11/05");
    expect(
      en("money_story.ready", "Tu Money Story está lista", "Mira cómo te fue en octubre."),
    ).toEqual({
      title: "Your Money Story is ready",
      body: "See how October went.",
    });
    expect(
      en("goal.milestone", "Vas por el 50 % de tu meta", "Viaje: llevas Bs 500.00 de Bs 1000.00."),
    ).toEqual({
      title: "You're at 50 % of your goal",
      body: "Viaje: Bs 500.00 of Bs 1000.00 saved.",
    });
    expect(en("goal.achieved", "Cumpliste tu meta", "Abre MoneyMap para verla.").title).toBe(
      "You reached your goal",
    );
    expect(
      en(
        "budget.exceeded",
        "Superaste tu presupuesto de Supermercado",
        "Llevas Bs 900.00 de Bs 800.00 este mes.",
      ),
    ).toEqual({
      title: "You went over your Groceries budget",
      body: "Bs 900.00 of Bs 800.00 spent this month.",
    });
    expect(
      noticeText("budget.threshold", { title: "Usaste el 80 % de Salud", body: "x" }, "pt").title,
    ).toBe("Você usou 80 % de Saúde");
  });

  it("leaves Spanish and unknown phrases as they came", () => {
    const notice = { title: "Tu Money Story está lista", body: "Mira cómo te fue en octubre." };
    expect(noticeText("money_story.ready", notice, "es")).toBe(notice);
    const other = { title: "Nuevo inicio de sesión", body: "Desde Chrome" };
    expect(noticeText("security.new_login", other, "en")).toBe(other);
  });
});
