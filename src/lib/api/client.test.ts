import { describe, expect, it } from "vitest";

import { createApiClient } from "./client";
import { ApiError, NETWORK_ERROR, UNKNOWN_ERROR, errorCode, unwrap } from "./errors";

const BASE_URL = "http://api.test";

function respond(status: number, body: unknown) {
  const requests: Request[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push(new Request(input, init));
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
  return { fetch, requests };
}

describe("createApiClient", () => {
  it("sends the access token as a bearer header", async () => {
    const { fetch, requests } = respond(200, {});
    const client = createApiClient({ baseUrl: BASE_URL, accessToken: "abc", fetch });

    await client.GET("/v1/me");

    expect(requests[0]?.headers.get("Authorization")).toBe("Bearer abc");
    expect(requests[0]?.url).toBe("http://api.test/v1/me");
  });

  it("sends no authorization header without a token", async () => {
    const { fetch, requests } = respond(200, {});
    const client = createApiClient({ baseUrl: BASE_URL, fetch });

    await client.GET("/v1/countries");

    expect(requests[0]?.headers.has("Authorization")).toBe(false);
  });
});

describe("unwrap", () => {
  it("returns the data of a successful response", async () => {
    const { fetch } = respond(200, [{ code: "BO", name: "Bolivia" }]);
    const client = createApiClient({ baseUrl: BASE_URL, fetch });

    const countries = await unwrap(client.GET("/v1/countries"));

    expect(countries).toEqual([{ code: "BO", name: "Bolivia" }]);
  });

  it("throws the problem code of a failed response", async () => {
    const { fetch } = respond(409, { code: "email_taken", detail: "Ya existe" });
    const client = createApiClient({ baseUrl: BASE_URL, fetch });

    const call = unwrap(
      client.POST("/v1/auth/email-verifications", { body: { email: "ana@correo.com" } }),
    );

    await expect(call).rejects.toEqual(new ApiError("email_taken", 409));
  });

  it("throws an unknown code when the body has none", async () => {
    const { fetch } = respond(500, { message: "boom" });
    const client = createApiClient({ baseUrl: BASE_URL, fetch });

    await expect(unwrap(client.GET("/v1/me"))).rejects.toMatchObject({ code: UNKNOWN_ERROR });
  });

  it("throws a network error when there is no response", async () => {
    const fetch = async () => {
      throw new TypeError("fetch failed");
    };
    const client = createApiClient({ baseUrl: BASE_URL, fetch });

    await expect(unwrap(client.GET("/v1/me"))).rejects.toMatchObject({
      code: NETWORK_ERROR,
      status: 0,
    });
  });
});

describe("errorCode", () => {
  it("reads the code of an ApiError and hides anything else", () => {
    expect(errorCode(new ApiError("plan_limit", 403))).toBe("plan_limit");
    expect(errorCode(new Error("boom"))).toBe(UNKNOWN_ERROR);
  });
});
