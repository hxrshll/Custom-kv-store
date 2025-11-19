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
}

export class InMemoryStore implements KeyValueStore {
  private store = new Map<string, StoredValue>();
  private cleanupTimer?: NodeJS.Timer;

  /**
   * @param cleanupIntervalMs optional sweep interval in ms. 0 (default) disables background sweep.
   */
  constructor(cleanupIntervalMs = 0) {
    if (cleanupIntervalMs > 0) {
      const t = setInterval(() => this.cleanupExpired(), cleanupIntervalMs);
      // don't keep node alive just for cleanup
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

  // -- numeric helpers --

  incr(key: string): number {
    // Note: use get() so TTL is respected (lazy expiration)
    const currentVal = this.get(key);
    const currentNum = Number(currentVal ?? 0);
    const next = currentNum + 1;
    // set as plain string, do not change existing TTL
    // if key existed with TTL, preserve it by reading stored entry
    const stored = this.store.get(key);
    const expiresAt = stored?.expiresAt;
    if (expiresAt) {
      // compute remaining TTL and set with remaining ttl
      const remaining = expiresAt - Date.now();
      // if remaining <= 0, set without TTL (but it wouldn't get here because get() would have removed it)
      if (remaining > 0) {
        this.set(key, String(next), { ttl: remaining });
      } else {
        // expired, just set fresh value
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

  // Batch read
  mget(keys: string[]): (string | null)[] {
    return keys.map((k) => this.get(k));
  }

  // ---------------- internal helpers ----------------

  private isExpired(entry: StoredValue): boolean {
    return (
      typeof entry.expiresAt === "number" &&
      entry.expiresAt <= Date.now()
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
