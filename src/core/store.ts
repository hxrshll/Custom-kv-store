export interface KeyValueStore {
  set(key: string, value: string): "OK";
  get(key: string): string | null;
  del(key: string): number;
  has(key: string): boolean;
  clear(): void;
}

export class InMemoryStore implements KeyValueStore {
  private store = new Map<string, string>();

  set(key: string, value: string): "OK" {
    this.store.set(key, value);
    return "OK";
  }

  get(key: string): string | null {
    const value = this.store.get(key);
    return value ?? null;
  }

  del(key: string): number {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  clear(): void {
    this.store.clear();
  }
}