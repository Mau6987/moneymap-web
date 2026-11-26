import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { catalogs } from "@/lib/i18n/catalog";

// Sin `globals`, testing-library no desmonta solo entre tests.
afterEach(cleanup);

// Fuera de un pedido no hay cookies ni Accept-Language: los componentes del
// servidor y las server actions leen los textos en español, como el
// `LocaleProvider` sin valor en los del navegador (MM-172).
vi.mock("@/lib/i18n/server", () => ({
  getLanguageChoice: async () => "system",
  getLocale: async () => "es",
  getMessages: async () => catalogs.es,
  useServerMessages: () => catalogs.es,
}));
