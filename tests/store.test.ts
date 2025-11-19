import { describe, it, expect, vi } from "vitest";
import { InMemoryStore } from "../src/core/store";

describe("InMemoryStore", () => {
  it("sets and gets values", () => {
    const store = new InMemoryStore();

    expect(store.get("foo")).toBeNull();

    const res = store.set("foo", "bar");
    expect(res).toBe("OK");
    expect(store.get("foo")).toBe("bar");
  });

  it("deletes values", () => {
    const store = new InMemoryStore();
    store.set("foo", "bar");

    expect(store.del("foo")).toBe(1);
    expect(store.get("foo")).toBeNull();
    expect(store.del("foo")).toBe(0);
  });

  it("has and clear work", () => {
    const store = new InMemoryStore();
    store.set("a", "1");
    store.set("b", "2");

    expect(store.has("a")).toBe(true);
    expect(store.has("c")).toBe(false);

    store.clear();
    expect(store.has("a")).toBe(false);
  });

  it("expires keys after ttl", () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();

    store.set("temp", "123", { ttl: 1000 }); // 1 second

    // immediately available
    expect(store.get("temp")).toBe("123");
    expect(store.has("temp")).toBe(true);

    // jump 1.1s into the future
    vi.advanceTimersByTime(1100);

    // key should be expired and removed lazily on access
    expect(store.get("temp")).toBeNull();
    expect(store.has("temp")).toBe(false);

    vi.useRealTimers();
  });

  it("increments and decrements values", () => {
    const store = new InMemoryStore();

    expect(store.incr("count")).toBe(1);
    expect(store.incr("count")).toBe(2);
    expect(store.decr("count")).toBe(1);
  });

  it("mget returns array of values", () => {
    const store = new InMemoryStore();
    store.set("a", "1");
    store.set("b", "2");

    expect(store.mget(["a", "b", "c"])).toEqual(["1", "2", null]);
  });
});