import { InMemoryStore } from "../core/store";

export type CommandResult = string | number | null | (string | null)[];

export class CommandHandler {
  constructor(private store: InMemoryStore) {}

  execute(raw: string): CommandResult {
    const line = raw.trim();
    if (!line) return null;

    const [cmd, ...args] = line.split(/\s+/);
    const command = cmd.toUpperCase();

    switch (command) {
      case "SET":
        return this.handleSet(args);

      case "GET": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'GET'";
        return this.store.get(key);
      }

      case "DEL":
      case "DELETE": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'DEL'";
        return this.store.del(key);
      }

      case "EXISTS": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'EXISTS'";
        return this.store.has(key) ? 1 : 0;
      }

      case "CLEAR":
      case "FLUSHALL": {
        this.store.clear();
        return "OK";
      }

      case "INCR": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'INCR'";
        return this.store.incr(key);
      }

      case "DECR": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'DECR'";
        return this.store.decr(key);
      }

      case "MGET": {
        if (args.length === 0) return "ERR MGET requires at least one key";
        return this.store.mget(args);
      }

      case "SAVE": {
        const [filename] = args;
        try {
          this.store.saveToFile(filename);
          return "OK";
        } catch (err: any) {
          return `ERR ${String(err.message ?? err)}`;
        }
      }

      case "LOAD": {
        const [filename] = args;
        const res = this.store.loadFromFile(filename);
        return res;
      }

      default:
        return `ERR unknown command '${cmd}'`;
    }
  }

  // ---------------- internal helpers ----------------

  private handleSet(args: string[]): CommandResult {
    const [key, value, ...rest] = args;
    if (!key || value === undefined) {
      return "ERR wrong number of arguments for 'SET'";
    }

    let ttlMs: number | undefined;

    if (rest.length > 0) {
      const [flagRaw, ttlRaw] = rest;
      const flag = flagRaw?.toUpperCase();
      const ttlNum = Number(ttlRaw);

      if (!flag || ttlRaw === undefined) {
        return "ERR invalid TTL syntax for 'SET' (use PX <ms> or EX <sec>)";
      }

      if (!Number.isFinite(ttlNum) || ttlNum <= 0) {
        return "ERR TTL must be a positive number";
      }

      if (flag === "PX") {
        ttlMs = ttlNum;
      } else if (flag === "EX") {
        ttlMs = ttlNum * 1000;
      } else {
        return `ERR unknown option '${flag}' for 'SET' (expected PX or EX)`;
      }
    }

    this.store.set(key, value, ttlMs ? { ttl: ttlMs } : undefined);
    return "OK";
  }
}
