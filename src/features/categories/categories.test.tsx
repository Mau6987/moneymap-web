// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/errors";

const gateway = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));
const navigation = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
  unstable_rethrow: vi.fn((error: unknown) => {
    if (error instanceof Error && error.message.startsWith("redirect:")) throw error;
  }),
}));

vi.mock("./data/categories-gateway", async (original) => ({
  ...(await original<object>()),
  categoriesGateway: () => gateway,
}));
vi.mock("@/lib/auth/session", () => ({
  withAccessToken: (call: (token: string) => Promise<unknown>) => call("t"),
}));
vi.mock("next/navigation", () => navigation);

const { saveCategory, deleteCategory } = await import("./categories-actions");
const { demoCategoriesGateway } = await import("./data/categories-gateway");
const { CategoryEditor } = await import("./components/category-editor");
const { inkOn } = await import("./domain/category-style");

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const food = {
  id: "c-food",
  name: "Comida",
  type: "expense" as const,
  money_flow_group: "needs" as const,
  icon: "restaurant",
  color: "#D25A42",
  template_key: null,
};

beforeEach(() => vi.clearAllMocks());

describe("category actions", () => {
  it("RF-16 a new expense goes with its group and a default icon", async () => {
    gateway.create.mockResolvedValue({ ...food, id: "c9" });

    await expect(
      saveCategory(
        {},
        form({ type: "expense", name: " Mascotas ", color: "#7c3aed", group: "lifestyle" }),
      ),
    ).rejects.toThrow("redirect:/categories?t=expense&id=c9&saved=created");
    expect(gateway.create).toHaveBeenCalledWith("t", {
      name: "Mascotas",
      type: "expense",
      color: "#7C3AED",
      money_flow_group: "lifestyle",
      icon: "shopping_bag",
    });
  });

  it("an income has no Money Flow group and keeps its icon when edited", async () => {
    await expect(
      saveCategory({}, form({ id: "c-salary", type: "income", name: "Sueldo", color: "#2E8A62" })),
    ).rejects.toThrow("redirect:/categories?t=income&id=c-salary&saved=saved");
    expect(gateway.update).toHaveBeenCalledWith("t", "c-salary", {
      name: "Sueldo",
      color: "#2E8A62",
      money_flow_group: null,
    });
  });

  it("like the app, the icon is picked; an unknown one is ignored", async () => {
    await expect(
      saveCategory(
        {},
        form({
          id: "c-food",
          type: "expense",
          name: "Comida",
          color: "#D25A42",
          icon: "restaurant",
        }),
      ),
    ).rejects.toThrow("redirect:");
    expect(gateway.update).toHaveBeenLastCalledWith(
      "t",
      "c-food",
      expect.objectContaining({ icon: "restaurant" }),
    );

    await expect(
      saveCategory({}, form({ type: "expense", name: "Mascotas", color: "#D25A42", icon: "nope" })),
    ).rejects.toThrow("redirect:");
    expect(gateway.create).toHaveBeenLastCalledWith(
      "t",
      expect.objectContaining({ icon: "shopping_bag" }),
    );
  });

  it("refuses an empty name or a color outside the palette before calling the API", async () => {
    expect(await saveCategory({}, form({ name: " ", color: "#3E4BD2" }))).toEqual({
      error: "name_required",
    });
    expect(await saveCategory({}, form({ name: "Gym", color: "#123456" }))).toEqual({
      error: "validation_error",
    });
    expect(gateway.create).not.toHaveBeenCalled();
  });

  it("returns the API code, so the form stays open", async () => {
    gateway.create.mockRejectedValueOnce(new ApiError("category_name_taken", 409));

    expect(await saveCategory({}, form({ name: "Comida", color: "#3E4BD2" }))).toEqual({
      error: "category_name_taken",
    });
  });

  it("RF-17 deleting goes back to its tab; one in use is explained", async () => {
    gateway.remove.mockRejectedValueOnce(new ApiError("category_in_use", 409));
    expect(await deleteCategory({}, form({ id: "c-subs", type: "expense" }))).toEqual({
      error: "category_in_use",
    });

    await expect(deleteCategory({}, form({ id: "c-food", type: "expense" }))).rejects.toThrow(
      "redirect:/categories?t=expense&saved=removed",
    );
  });
});

describe("demo categories", () => {
  it("refuses a repeated name and a category in use", async () => {
    await expect(
      demoCategoriesGateway.create("t", {
        name: "comida",
        type: "expense",
        icon: "x",
        color: "#3E4BD2",
      }),
    ).rejects.toMatchObject({ code: "category_name_taken" });
    await expect(demoCategoriesGateway.remove("t", "c-subs")).rejects.toMatchObject({
      code: "category_in_use",
    });
  });
});

describe("CategoryEditor", () => {
  it("RF-16 edits the name, the color and the group", async () => {
    render(
      <CategoryEditor category={food} type="expense" save={saveCategory} remove={deleteCategory} />,
    );

    expect(screen.getByRole("heading", { name: "Editar categoría" })).toBeTruthy();
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe("Comida");
    expect(screen.getByRole("radio", { name: "Color #D25A42" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("radio", { name: "Necesidades" }).getAttribute("aria-checked")).toBe(
      "true",
    );

    await userEvent.click(screen.getByRole("radio", { name: "Estilo de vida" }));
    expect(screen.getByRole("radio", { name: "Estilo de vida" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Eliminar" })).toBeTruthy();
  });

  it("a new income has no group and no Eliminar", () => {
    render(<CategoryEditor type="income" save={saveCategory} remove={deleteCategory} />);

    expect(screen.getByRole("heading", { name: "Nueva categoría" })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: "Necesidades" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Eliminar" })).toBeNull();
    expect(screen.getByRole("button", { name: "Crear categoría" })).toBeTruthy();
  });

  it("the initial is dark on amber and white on indigo", () => {
    expect(inkOn("#E2A93C")).toBe("#151936");
    expect(inkOn("#3E4BD2")).toBe("#FFFFFF");
  });
});
