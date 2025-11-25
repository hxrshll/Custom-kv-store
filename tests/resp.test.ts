import { describe, it, expect, beforeAll, afterAll } from "vitest";
import net from "net";
import { startRespServer } from "../src/server/resp-server";

let server: any;

function sendResp(socket: net.Socket, parts: string[]): Promise<string> {
  return new Promise((resolve) => {
    let buffer = "";
    socket.once("data", (chunk) => {
      buffer += chunk.toString();
      resolve(buffer);
    });

    let out = `*${parts.length}\r\n`;
    for (const part of parts) {
      out += `$${part.length}\r\n${part}\r\n`;
    }
    socket.write(out);
  });
}

beforeAll(() => {
  server = startRespServer(6381) as any;
});

afterAll(async () => {
  if (!server || typeof server.close !== "function") return;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

describe("RESP server", () => {
  it("SET / GET (RESP)", async () => {
    const sock = net.createConnection({ port: 6381, host: "127.0.0.1" });

    await new Promise((resolve) => {
      sock.once("connect", resolve);
    });

    const r1 = await sendResp(sock, ["SET", "a", "1"]);
    expect(r1).toContain("+OK");

    const r2 = await sendResp(sock, ["GET", "a"]);
    expect(r2).toBe("$1\r\n1\r\n");

    sock.end();
  });
});
