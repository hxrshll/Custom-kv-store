import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startHttpServer } from "../src/server/http-server";
import type { Server } from "http";

let server: Server;
const baseUrl = "http://127.0.0.1:8081";

beforeAll(() => {
  server = startHttpServer(8081, "127.0.0.1");
});

afterAll(async () => {
  if (!server) return;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe("HTTP API", () => {
  it("SET + GET", async () => {
    await fetch(`${baseUrl}/set`, {
      method: "POST",
      body: JSON.stringify({ key: "a", value: "123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await fetch(`${baseUrl}/get?key=a`);
    const json: any = await res.json();

    expect(json.result).toBe("123");
  });

  it("MGET", async () => {
    await fetch(`${baseUrl}/set`, {
      method: "POST",
      body: JSON.stringify({ key: "x", value: "1" }),
      headers: { "Content-Type": "application/json" },
    });

    await fetch(`${baseUrl}/set`, {
      method: "POST",
      body: JSON.stringify({ key: "y", value: "2" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await fetch(`${baseUrl}/mget?keys=x,y,z`);
    const json: any = await res.json();

    expect(json.result).toEqual(["1", "2", null]);
  });

  it("DELETE", async () => {
    await fetch(`${baseUrl}/set`, {
      method: "POST",
      body: JSON.stringify({ key: "temp", value: "foo" }),
      headers: { "Content-Type": "application/json" },
    });

    const delRes = await fetch(`${baseUrl}/del?key=temp`, {
      method: "DELETE",
    });

    const data: any = await delRes.json();
    expect(data.deleted).toBe(1);

    const check = await fetch(`${baseUrl}/get?key=temp`);
    const checkJson: any = await check.json();
    expect(checkJson.result).toBeNull();
  });
});
