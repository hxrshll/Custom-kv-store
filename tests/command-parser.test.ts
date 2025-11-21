import { describe, it, expect, vi } from "vitest";
import { InMemoryStore } from "../src/core/store";
import { CommandHandler } from "../src/commands/command-parser";

describe("CommandHandler commands", () => {
  it("SET/GET without ttl", async () => {
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(await handler.execute("SET foo bar")).toBe("OK");
    expect(await handler.execute("GET foo")).toBe("bar");
  });

  it("SET with PX ttl (ms) via command", async () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(await handler.execute("SET temp 123 PX 1000")).toBe("OK");
    expect(await handler.execute("GET temp")).toBe("123");

    vi.advanceTimersByTime(1100);
    expect(await handler.execute("GET temp")).toBeNull();

    vi.useRealTimers();
  });

  it("SET with EX ttl (sec) via command", async () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(await handler.execute("SET temp 123 EX 2")).toBe("OK");
    expect(await handler.execute("GET temp")).toBe("123");

    vi.advanceTimersByTime(2100);
    expect(await handler.execute("GET temp")).toBeNull();

    vi.useRealTimers();
  });

  it("INCR/DECR via commands", async () => {
    const handler = new CommandHandler(new InMemoryStore());
    expect(await handler.execute("INCR a")).toBe(1);
    expect(await handler.execute("INCR a")).toBe(2);
    expect(await handler.execute("DECR a")).toBe(1);
  });

  it("MGET via command", async () => {
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    await handler.execute("SET a 1");
    await handler.execute("SET b 2");

    expect(await handler.execute("MGET a b c")).toEqual(["1", "2", null]);
  });

  it("SET with PX ttl via command (existing test)", async () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(await handler.execute("SET temp2 777 PX 1000")).toBe("OK");
    expect(await handler.execute("GET temp2")).toBe("777");

    vi.advanceTimersByTime(1100);
    expect(await handler.execute("GET temp2")).toBeNull();
    vi.useRealTimers();
  });
});