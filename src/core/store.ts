export interface SetOptions {
  /*** time to live in milliseconds*/
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
}

export class InMemoryStore implements KeyValueStore {
  private store = new Map<string, StoredValue>();
  private cleanupTimer?: NodeJS.Timer;

  constructor(cleanupIntervalMs = 0) {
    if (cleanupIntervalMs > 0) {
      const timer = setInterval(
        () => this.cleanupExpired(),
        cleanupIntervalMs
      );
      (timer as any).unref?.();
      this.cleanupTimer = timer;
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

    const existed = this.store.delete(key);
    return existed ? 1 : 0;
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

  // ---- internals ----

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