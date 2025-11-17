import { describe, it, expect } from "vitest";
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
});