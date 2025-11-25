import net from "net";
import { RespParser, RespEncoder } from "../protocol/resp";
import { CommandHandler } from "../commands/command-parser";
import { InMemoryStore } from "../core/store";
import { globalPubSub, SubscriberId } from "../core/pubsub";

const store = new InMemoryStore();
const handler = new CommandHandler(store);
const parser = new RespParser();

export function startRespServer(port = 6380) {
  const server = net.createServer((socket) => {
    socket.setEncoding("utf8");

    const sid: SubscriberId = `${socket.remoteAddress}:${socket.remotePort}:${Date.now()}`;

    const sendResp = (obj: any) => {
      try {
        socket.write(RespEncoder.encode(obj));
      } catch {
      }
    };

    const subs = new Map<string, (payload: string) => void>();

    socket.on("data", async (chunk) => {
      const frames = parser.push(chunk);

      for (const frame of frames) {
        if (!Array.isArray(frame)) {
          socket.write(RespEncoder.error("expected array command"));
          continue;
        }

        const [cmdRaw, ...argsRaw] = frame;
        if (typeof cmdRaw !== "string") {
          socket.write(RespEncoder.error("invalid command type"));
          continue;
        }

        const cmdUpper = cmdRaw.toUpperCase();

        if (cmdUpper === "SUB") {
          for (const ch of argsRaw.map(String)) {
            const sendFn = (payload: string) =>
              socket.write(RespEncoder.encode(["message", ch, payload]));
            globalPubSub.subscribe(ch, sid + ":" + ch, sendFn);
            subs.set(ch, sendFn);
            const count = globalPubSub.subscribersCount(ch);
            socket.write(RespEncoder.encode(["subscribe", ch, count]));
          }
          continue;
        }

        if (cmdUpper === "UNSUB") {
          for (const ch of argsRaw.map(String)) {
            globalPubSub.unsubscribe(ch, sid + ":" + ch);
            subs.delete(ch);
            const count = globalPubSub.subscribersCount(ch);
            socket.write(RespEncoder.encode(["unsubscribe", ch, count]));
          }
          continue;
        }

        if (cmdUpper === "PUB") {
          const [chRaw, payloadRaw] = argsRaw;
          const ch = String(chRaw ?? "");
          const payload = String(payloadRaw ?? "");
          const cnt = globalPubSub.publish(ch, payload);
          socket.write(RespEncoder.encode(cnt));
          continue;
        }
        const cmd = [cmdRaw, ...argsRaw.map(String)].join(" ");
        const result = await handler.execute(cmd);

        if (result === "OK") {
          socket.write(RespEncoder.simple("OK"));
        } else if (typeof result === "number") {
          socket.write(RespEncoder.encode(result));
        } else if (Array.isArray(result)) {
          socket.write(RespEncoder.encode(result));
        } else if (result === null) {
          socket.write(RespEncoder.encode(null));
        } else if (typeof result === "string") {
          socket.write(RespEncoder.encode(result));
        } else {
          socket.write(RespEncoder.error("unknown response"));
        }
      }
    });

    socket.on("close", () => {
      for (const ch of subs.keys()) {
        globalPubSub.unsubscribe(ch, sid + ":" + ch);
      }
    });

    socket.on("error", () => {
      for (const ch of subs.keys()) {
        globalPubSub.unsubscribe(ch, sid + ":" + ch);
      }
    });
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`RESP server ready on 127.0.0.1:${port}`);
  });
}

if (require.main === module) {
  startRespServer();
}
