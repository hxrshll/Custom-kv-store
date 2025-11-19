import net from "net";
import { InMemoryStore } from "../core/store";
import { CommandHandler, CommandResult } from "../commands/command-parser";

export interface ServerOptions {
  port?: number;
  host?: string;
}

function formatResult(result: CommandResult): string {
  if (Array.isArray(result)) {
    return JSON.stringify(result) + "\n";
  }
  if (result === null) return "(nil)\n";
  return String(result) + "\n";
}

export function startTcpServer(options: ServerOptions = {}) {
  const port = options.port ?? 6379;
  const host = options.host ?? "127.0.0.1";

  const store = new InMemoryStore();
  const handler = new CommandHandler(store);

  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");

    socket.write(
      "custom kv store server\n" +
        "commands: SET key value | GET key | DEL key | EXISTS key | CLEAR | INCR | DECR | MGET\n"
    );

    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;

        const result = handler.execute(line);
        socket.write(formatResult(result));
      }
    });

    socket.on("error", (err) => {
      console.error("client error:", err);
    });
  });

  server.listen(port, host, () => {
    console.log(`kv-store server listening on ${host}:${port}`);
  });

  return server;
}

if (typeof require !== "undefined" && require.main === module) {
  startTcpServer();
}