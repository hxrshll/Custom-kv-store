import { describe, it, expect, vi } from "vitest";
import { InMemoryStore } from "../src/core/store";
import { CommandHandler } from "../src/commands/command-parser";

describe("CommandHandler commands", () => {
  it("SET/GET without ttl", () => {
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(handler.execute("SET foo bar")).toBe("OK");
    expect(handler.execute("GET foo")).toBe("bar");
  });

  it("SET with PX ttl (ms) via command", () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(handler.execute("SET temp 123 PX 1000")).toBe("OK");
    expect(handler.execute("GET temp")).toBe("123");

    vi.advanceTimersByTime(1100);
    expect(handler.execute("GET temp")).toBeNull();

    vi.useRealTimers();
  });

  it("SET with EX ttl (sec) via command", () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(handler.execute("SET temp 123 EX 2")).toBe("OK");
    expect(handler.execute("GET temp")).toBe("123");

    vi.advanceTimersByTime(2100);
    expect(handler.execute("GET temp")).toBeNull();

    vi.useRealTimers();
  });

  it("INCR/DECR via commands", () => {
    const handler = new CommandHandler(new InMemoryStore());
    expect(handler.execute("INCR a")).toBe(1);
    expect(handler.execute("INCR a")).toBe(2);
    expect(handler.execute("DECR a")).toBe(1);
  });

  it("MGET via command", () => {
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    handler.execute("SET a 1");
    handler.execute("SET b 2");

    expect(handler.execute("MGET a b c")).toEqual(["1", "2", null]);
  });
});