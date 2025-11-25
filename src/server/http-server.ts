// src/server/http-server.ts

import http, { IncomingMessage, Server, ServerResponse } from "http";
import { URL } from "url";
import { InMemoryStore } from "../core/store";

function createHandler(store: InMemoryStore) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.statusCode = 400;
      return res.end("missing url");
    }

    const url = new URL(req.url, "http://localhost");
    const path = url.pathname;
    const method = req.method ?? "GET";

    res.setHeader("Content-Type", "application/json");

    if (method === "GET" && path === "/get") {
      const key = url.searchParams.get("key");
      if (!key) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "missing key" }));
      }
      return res.end(JSON.stringify({ result: store.get(key) }));
    }

    if (method === "GET" && path === "/mget") {
      const keysParam = url.searchParams.get("keys");
      if (!keysParam) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "missing keys" }));
      }
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

          if (!key || value === undefined) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: "missing key or value" }));
          }

          store.set(
            key,
            String(value),
            typeof ttl === "number" ? { ttl } : undefined
          );
          return res.end(JSON.stringify({ ok: true }));
        } catch (err: any) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: String(err) }));
        }
      });
      return;
    }

    if (method === "DELETE" && path === "/del") {
      const key = url.searchParams.get("key");
      if (!key) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: "missing key" }));
      }
      const deleted = store.del(key);
      return res.end(JSON.stringify({ deleted }));
    }

    res.statusCode = 404;
    res.end(JSON.stringify({ error: "not found" }));
  };
}

export function startHttpServer(
  port = 8080,
  host = "127.0.0.1"
): Server {
  const store = new InMemoryStore();
  const handler = createHandler(store);
  const server = http.createServer(handler);
  server.listen(port, host, () => {
    console.log(`HTTP KV server listening on http://${host}:${port}`);
  });
  return server;
}

if (typeof require !== "undefined" && require.main === module) {
  startHttpServer();
}
