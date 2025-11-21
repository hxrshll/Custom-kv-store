import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

export interface SetOptions {
  /** time to live in milliseconds */
  ttl?: number;
}

type StoredValue = {
  value: string;
  expiresAt?: number;
};

export interface KeyValueStore {
  set(key: string, value: string, options?: SetOptions): "OK";
  get(key: string): string | null;
  del(key: string): number;
  has(key: string): boolean;
  clear(): void;
  incr(key: string): number;
  decr(key: string): number;
  mget(keys: string[]): (string | null)[];
  mset(pairs: Array<[string, string]>): "OK";
  saveToFile(filePath?: string): void;
  loadFromFile(filePath?: string): "OK" | string;
  saveToFileAsync(filePath?: string): Promise<void>;
  loadFromFileAsync(filePath?: string): Promise<"OK" | string>;
}

export class InMemoryStore implements KeyValueStore {
  private store = new Map<string, StoredValue>();
  private cleanupTimer?: NodeJS.Timer;

  constructor(cleanupIntervalMs = 0) {
    if (cleanupIntervalMs > 0) {
      const t = setInterval(() => this.cleanupExpired(), cleanupIntervalMs);
      (t as any).unref?.();
      this.cleanupTimer = t;
    }
  }

  set(key: string, value: string, options?: SetOptions): "OK" {
    const ttl = options?.ttl;
    const expiresAt =
      typeof ttl === "number" && ttl > 0 ? Date.now() + ttl : undefined;

    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  del(key: string): number {
    const entry = this.store.get(key);
    if (!entry) return 0;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return 0;
    }
    return this.store.delete(key) ? 1 : 0;
  }

  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  clear(): void {
    this.store.clear();
  }

  incr(key: string): number {
    const currentVal = this.get(key);
    const currentNum = Number(currentVal ?? 0);
    const next = currentNum + 1;
    const stored = this.store.get(key);
    const expiresAt = stored?.expiresAt;
    if (expiresAt) {
      const remaining = expiresAt - Date.now();
      if (remaining > 0) {
        this.set(key, String(next), { ttl: remaining });
      } else {
        this.set(key, String(next));
      }
    } else {
      this.set(key, String(next));
    }
    return next;
  }

  decr(key: string): number {
    const currentVal = this.get(key);
    const currentNum = Number(currentVal ?? 0);
    const next = currentNum - 1;
    const stored = this.store.get(key);
    const expiresAt = stored?.expiresAt;
    if (expiresAt) {
      const remaining = expiresAt - Date.now();
      if (remaining > 0) {
        this.set(key, String(next), { ttl: remaining });
      } else {
        this.set(key, String(next));
      }
    } else {
      this.set(key, String(next));
    }
    return next;
  }

  mget(keys: string[]): (string | null)[] {
    return keys.map((k) => this.get(k));
  }

  mset(pairs: Array<[string, string]>): "OK" {
    for (const [k, v] of pairs) {
      this.set(k, v);
    }
    return "OK";
  }

  saveToFile(filePath = "dump.json"): void {
    const absolute = path.resolve(filePath);
    const arr: Array<[string, StoredValue]> = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= Date.now()) continue;
      arr.push([key, entry]);
    }
    try {
      fs.writeFileSync(absolute, JSON.stringify(arr), { encoding: "utf8" });
    } catch (err) {
      throw new Error(`Failed to save to file ${absolute}: ${String(err)}`);
    }
  }

  loadFromFile(filePath = "dump.json"): "OK" | string {
    const absolute = path.resolve(filePath);
    if (!fs.existsSync(absolute)) {
      return `ERR file not found: ${absolute}`;
    }
    try {
      const raw = fs.readFileSync(absolute, { encoding: "utf8" });
      const parsed = JSON.parse(raw) as Array<[string, StoredValue]>;
      this.store.clear();
      const now = Date.now();
      for (const [key, entry] of parsed) {
        if (entry.expiresAt && entry.expiresAt <= now) continue;
        this.store.set(key, {
          value: String(entry.value),
          expiresAt: entry.expiresAt,
        });
      }
      return "OK";
    } catch (err) {
      return `ERR failed to load file ${absolute}: ${String(err)}`;
    }
  }

  async saveToFileAsync(filePath = "dump.json"): Promise<void> {
    const absolute = path.resolve(filePath);
    const arr: Array<[string, StoredValue]> = [];
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= Date.now()) continue;
      arr.push([key, entry]);
    }
    await fsPromises.writeFile(absolute, JSON.stringify(arr), "utf8");
  }

  async loadFromFileAsync(filePath = "dump.json"): Promise<"OK" | string> {
    const absolute = path.resolve(filePath);
    try {
      const raw = await fsPromises.readFile(absolute, "utf8");
      const parsed = JSON.parse(raw) as Array<[string, StoredValue]>;
      this.store.clear();
      const now = Date.now();
      for (const [key, entry] of parsed) {
        if (entry.expiresAt && entry.expiresAt <= now) continue;
        this.store.set(key, {
          value: String(entry.value),
          expiresAt: entry.expiresAt,
        });
      }
      return "OK";
    } catch (err: any) {
      return `ERR failed to load file ${absolute}: ${String(err)}`;
    }
  }

  // ---------------- internal helpers ----------------

  private isExpired(entry: StoredValue): boolean {
    return (
      typeof entry.expiresAt === "number" && entry.expiresAt <= Date.now()
    );
  }

  private cleanupExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
