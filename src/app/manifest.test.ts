import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { guard } from "@/lib/auth/route-guard";

import manifest from "./manifest";

describe("PWA", () => {
  it("installs as a standalone app that opens on the Map, with the app logo", () => {
    const m = manifest();

    expect(m.display).toBe("standalone");
    expect(m.start_url).toBe("/map");
    const sizes = m.icons?.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(m.icons?.some((i) => i.purpose === "maskable")).toBe(true);
    for (const icon of m.icons ?? []) {
      expect(existsSync(join(process.cwd(), "public", icon.src))).toBe(true);
    }
  });

  it("the offline page opens without a session", () => {
    expect(guard("/offline", false, false)).toBe("continue");
  });
});
