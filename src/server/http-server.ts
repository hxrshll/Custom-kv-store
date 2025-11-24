import http from "http";
import { URL } from "url";
import { InMemoryStore } from "../core/store";

const store = new InMemoryStore();
console.log("HTTP KV server starting on http://127.0.0.1:8080");

const server = http.createServer(async (req, res) => {
  if (!req.url) return;

  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const method = req.method || "GET";

  res.setHeader("Content-Type", "application/json");

  if (method === "GET" && path === "/get") {
    const key = url.searchParams.get("key");
    if (!key) return res.end(JSON.stringify({ error: "missing key" }));

    return res.end(JSON.stringify({ result: store.get(key) }));
  }

  if (method === "GET" && path === "/mget") {
    const keysParam = url.searchParams.get("keys");
    if (!keysParam) return res.end(JSON.stringify({ error: "missing keys" }));

    const keys = keysParam.split(",");
    return res.end(JSON.stringify({ result: store.mget(keys) }));
  }

  if (method === "POST" && path === "/set") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const data = JSON.parse(body || "{}");
        const { key, value, ttl } = data;

        if (!key || value === undefined)
          return res.end(JSON.stringify({ error: "missing key or value" }));

        store.set(key, String(value), ttl ? { ttl } : undefined);
        res.end(JSON.stringify({ ok: true }));
      } catch (err: any) {
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  if (method === "DELETE" && path === "/del") {
    const key = url.searchParams.get("key");
    if (!key) return res.end(JSON.stringify({ error: "missing key" }));

    const deleted = store.del(key);
    return res.end(JSON.stringify({ deleted }));
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not found" }));
});

server.listen(8080, "127.0.0.1");
