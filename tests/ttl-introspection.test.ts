import { describe, it, expect, vi } from "vitest";
import { InMemoryStore } from "../src/core/store";
import { CommandHandler } from "../src/commands/command-parser";

describe("TTL introspection (store)", () => {
  it("remainingTtl returns ms or null", () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();

    store.set("x", "1", { ttl: 5000 });
    const ms = store.remainingTtl("x");
    expect(typeof ms).toBe("number");
    expect(ms! > 0).toBe(true);

    // advance time past expiry
    vi.advanceTimersByTime(6000);
    expect(store.remainingTtl("x")).toBeNull();

    vi.useRealTimers();
  });

  it("persist removes ttl and returns true/false", () => {
    const store = new InMemoryStore();
    store.set("a", "1", { ttl: 5000 });
    const before = store.remainingTtl("a");
    expect(before).not.toBeNull();

    const removed = store.persist("a");
    expect(removed).toBe(true);
    expect(store.remainingTtl("a")).toBeNull();

    // persist on key without ttl returns false
    const removed2 = store.persist("a");
    expect(removed2).toBe(false);

    // persist on non-existing key -> false
    expect(store.persist("nope")).toBe(false);
  });
});

describe("TTL introspection (commands)", () => {
  it("PTTL / TTL / PERSIST via CommandHandler", async () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    await handler.execute("SET s 100 PX 5000"); // 5s
    const pttl = await handler.execute("PTTL s");
    expect(typeof pttl).toBe("number");
    expect((pttl as number) > 0).toBe(true);

    const ttl = await handler.execute("TTL s");
    expect(typeof ttl).toBe("number");
    expect((ttl as number) >= 4).toBe(true); // seconds

    // persist it
    const persistRes = await handler.execute("PERSIST s");
    expect(persistRes).toBe(1);

    // now no TTL
    const pttlAfter = await handler.execute("PTTL s");
    expect(pttlAfter).toBe(-1);

    const ttlAfter = await handler.execute("TTL s");
    expect([-2, -1]).toContain(ttlAfter as number);
// depending on timing, but persist should make it -1 (no TTL)
    // more clearly:
    expect(await handler.execute("TTL s")).toBe(-1);

    // non-existing key -> -2
    const missing = await handler.execute("PTTL nope");
    expect(missing).toBe(-2);

    vi.useRealTimers();
  });
});