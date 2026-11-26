import { describe, expect, it } from "vitest";

import { isProcessing, reviewOf, type VoiceAccount, type VoiceEntry } from "./voice-review";

const accounts: VoiceAccount[] = [
  { id: "cash", name: "Efectivo", currency: "BOB", label: "Bs", decimals: 2, isDefault: true },
  { id: "visa", name: "Visa", currency: "USD", label: "$", decimals: 2, isDefault: false },
  { id: "clp", name: "Pesos", currency: "CLP", label: "$", decimals: 0, isDefault: false },
];
const categories = [
  { id: "food", name: "Comida", type: "expense", color: "#D25A42" },
  { id: "salary", name: "Salario", type: "income", color: "#2E8A62" },
];
const today = "2026-10-24";

const entry = (extraction: Partial<NonNullable<VoiceEntry["extraction"]>>): VoiceEntry => ({
  id: "v1",
  created_at: "2026-10-24T12:00:00Z",
  input_type: "voice",
  status: "extracted",
  transcript: "frase",
  transaction_id: null,
  extraction: {
    kind: null,
    amount: null,
    currency: null,
    category_id: null,
    account_id: null,
    description: null,
    occurred_on: null,
    missing: [],
    ...extraction,
    multiple: extraction.multiple ?? false,
  },
});

const review = (extraction: Partial<NonNullable<VoiceEntry["extraction"]>>) =>
  reviewOf(entry(extraction), accounts, categories, today);

describe("reviewOf", () => {
  it("a full phrase is ready to confirm", () => {
    const result = review({
      kind: "expense",
      amount: "50.00",
      currency: "BOB",
      category_id: "food",
      account_id: "cash",
      description: "Almuerzo",
      occurred_on: "2026-10-23",
    });

    expect(result.canConfirm).toBe(true);
    expect(result.prefill).toEqual({
      voiceEntryId: "v1",
      kind: "expense",
      amount: "50",
      accountId: "cash",
      categoryId: "food",
      date: "2026-10-23",
      description: "Almuerzo",
    });
  });

  it("RF-11 another currency preselects the account in it", () => {
    const result = review({
      kind: "expense",
      amount: "20",
      currency: "USD",
      category_id: "food",
      account_id: "cash",
    });

    expect(result.account?.id).toBe("visa");
    expect(result.canConfirm).toBe(true);
  });

  it("RF-12 a currency without accounts asks and keeps no account", () => {
    const result = review({ kind: "expense", amount: "20", currency: "EUR", category_id: "food" });

    expect(result.currencyWithoutAccount).toBe("EUR");
    expect(result.currency).toBe("EUR");
    expect(result.account).toBeUndefined();
    expect(result.canConfirm).toBe(false);
  });

  it("without a currency said, the default account is used", () => {
    const result = review({ kind: "expense", amount: "15", category_id: "food" });

    expect(result.account?.id).toBe("cash");
    expect(result.missing.size).toBe(0);
  });

  it("what the phrase did not say is missing, and the day is today", () => {
    const result = review({ kind: "expense", missing: ["amount", "category_id"] });

    expect([...result.missing].sort()).toEqual(["amount", "category"]);
    expect(result.prefill.date).toBe(today);
    expect(result.prefill.amount).toBe("");
  });

  it("a category of the other type does not fit", () => {
    const result = review({ kind: "income", amount: "3000", category_id: "food" });

    expect([...result.missing]).toEqual(["category"]);
  });

  it("an unknown kind must be chosen", () => {
    expect(review({ amount: "10", category_id: "food" }).missing.has("kind")).toBe(true);
  });

  it("RF-5 the amount follows the decimals of the account", () => {
    const result = review({
      kind: "expense",
      amount: "1500.75",
      currency: "CLP",
      category_id: "food",
    });

    expect(result.prefill.amount).toBe("1500");
    expect(result.amount).toBe("1500");
  });

  it("an amount below the currency's decimals is missing", () => {
    expect(
      review({ kind: "expense", amount: "0.001", category_id: "food" }).missing.has("amount"),
    ).toBe(true);
  });

  it("knows when the worker is still on it", () => {
    expect(isProcessing("received")).toBe(true);
    expect(isProcessing("transcribed")).toBe(true);
    expect(isProcessing("extracted")).toBe(false);
  });
});
