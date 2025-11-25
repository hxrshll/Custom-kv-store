import net from "net";
import { InMemoryStore } from "../core/store";
import { CommandHandler, CommandResult } from "../commands/command-parser";
import { globalPubSub, SubscriberId } from "../core/pubsub";

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
        "commands: SET key value | GET key | DEL key | EXISTS key | CLEAR | INCR | DECR | MGET | MSET | SAVE | LOAD | SUB | UNSUB | PUB\n"
    );

    const sid: SubscriberId = `${socket.remoteAddress}:${socket.remotePort}:${Date.now()}`;

    const sendPub = (chan: string) => (payload: string) => {
      socket.write(`MESSAGE ${chan} ${payload}\n`);
    };

    let buffer = "";

    socket.on("data", async (chunk) => {
      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        const [cmdRaw, ...args] = line.split(/\s+/);
        const cmd = cmdRaw.toUpperCase();

        if (cmd === "SUB") {
          const [channel] = args;
          if (!channel) {
            socket.write("ERR wrong number of arguments for 'SUB'\n");
            continue;
          }
          globalPubSub.subscribe(channel, sid, sendPub(channel));
          socket.write(`OK sub ${channel}\n`);
          continue;
        }

        if (cmd === "UNSUB") {
          const [channel] = args;
          if (!channel) {
            socket.write("ERR wrong number of arguments for 'UNSUB'\n");
            continue;
          }
          globalPubSub.unsubscribe(channel, sid);
          socket.write(`OK unsub ${channel}\n`);
          continue;
        }

        if (cmd === "PUB") {
          const [channel, ...rest] = args;
          if (!channel) {
            socket.write("ERR wrong number of arguments for 'PUB'\n");
            continue;
          }
          const message = rest.join(" ");
          const count = globalPubSub.publish(channel, message);
          socket.write(String(count) + "\n");
          continue;
        }

        try {
          const result = await handler.execute(line);
          socket.write(formatResult(result));
        } catch (err) {
          socket.write(`ERR ${String(err)}\n`);
        }
      }
    });

    socket.on("close", () => {
      globalPubSub.unsubscribeAll(sid);
    });

    socket.on("error", () => {
      globalPubSub.unsubscribeAll(sid);
    });
  });

  server.listen(port, host, () => {
    console.log(`kv-store server (tcp) listening on ${host}:${port}`);
  });

  return server;
}

if (typeof require !== "undefined" && require.main === module) {
  startTcpServer();
}