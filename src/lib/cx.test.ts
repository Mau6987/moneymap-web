import { describe, expect, it } from "vitest";

import { cx } from "./cx";

describe("cx", () => {
  it("joins the classes with a space and drops the empty ones", () => {
    expect(cx("a", false, "b", undefined, null, "", "c")).toBe("a b c");
  });
});
