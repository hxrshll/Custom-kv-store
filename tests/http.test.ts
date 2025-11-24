import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";

let server: any;

beforeAll(() => {
  server = spawn("ts-node", ["src/server/http-server.ts"]);
});

afterAll(() => {
  server.kill("SIGTERM");
});

describe("HTTP API", () => {
  it("SET + GET", async () => {
    await fetch("http://127.0.0.1:8080/set", {
      method: "POST",
      body: JSON.stringify({ key: "a", value: "123" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await fetch("http://127.0.0.1:8080/get?key=a");
    const json = await res.json();

    expect(json.result).toBe("123");
  });

  it("MGET", async () => {
    await fetch("http://127.0.0.1:8080/set", {
      method: "POST",
      body: JSON.stringify({ key: "x", value: "1" }),
      headers: { "Content-Type": "application/json" },
    });

    await fetch("http://127.0.0.1:8080/set", {
      method: "POST",
      body: JSON.stringify({ key: "y", value: "2" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await fetch("http://127.0.0.1:8080/mget?keys=x,y,z");
    const json = await res.json();

    expect(json.result).toEqual(["1", "2", null]);
  });

  it("DELETE", async () => {
    await fetch("http://127.0.0.1:8080/set", {
      method: "POST",
      body: JSON.stringify({ key: "temp", value: "foo" }),
      headers: { "Content-Type": "application/json" },
    });

    const delRes = await fetch("http://127.0.0.1:8080/del?key=temp", {
      method: "DELETE",
    });

    const data = await delRes.json();
    expect(data.deleted).toBe(1);

    const check = await fetch("http://127.0.0.1:8080/get?key=temp");
    const checkJson = await check.json();
    expect(checkJson.result).toBeNull();
  });
});
