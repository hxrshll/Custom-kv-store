import { InMemoryStore } from "../core/store";

export type CommandResult = string | number | null;

export class CommandHandler {
  constructor(private store: InMemoryStore) {}

  execute(raw: string): CommandResult {
    const line = raw.trim();
    if (!line) return null;

    const [cmd, ...args] = line.split(/\s+/);
    const command = cmd.toUpperCase();

    switch (command) {
      case "SET": {
        const [key, value] = args;
        if (!key || value === undefined) {
          return "ERR wrong number of arguments for 'SET'";
        }
        this.store.set(key, value);
        return "OK";
      }

      case "GET": {
        const [key] = args;
        if (!key) {
          return "ERR wrong number of arguments for 'GET'";
        }
        return this.store.get(key);
      }

      case "DEL":
      case "DELETE": {
        const [key] = args;
        if (!key) {
          return "ERR wrong number of arguments for 'DEL'";
        }
        return this.store.del(key);
      }

      case "EXISTS": {
        const [key] = args;
        if (!key) {
          return "ERR wrong number of arguments for 'EXISTS'";
        }
        return this.store.has(key) ? 1 : 0;
      }

      case "CLEAR":
      case "FLUSHALL": {
        this.store.clear();
        return "OK";
      }

      default:
        return `ERR unknown command '${cmd}'`;
    }
  }
}