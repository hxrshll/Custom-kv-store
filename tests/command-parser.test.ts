import { describe, it, expect, vi } from "vitest";
import { InMemoryStore } from "../src/core/store";
import { CommandHandler } from "../src/commands/command-parser";

describe("CommandHandler SET with TTL", () => {
  it("sets without ttl", () => {
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    expect(handler.execute("SET foo bar")).toBe("OK");
    expect(handler.execute("GET foo")).toBe("bar");
  });

  it("sets with PX ttl (ms)", () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    handler.execute("SET temp 123 PX 1000");

    expect(handler.execute("GET temp")).toBe("123");

    vi.advanceTimersByTime(1100);

    expect(handler.execute("GET temp")).toBeNull();
    vi.useRealTimers();
  });

  it("sets with EX ttl (seconds)", () => {
    vi.useFakeTimers();
    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    handler.execute("SET temp 123 EX 2");

    expect(handler.execute("GET temp")).toBe("123");

    vi.advanceTimersByTime(2100);

    expect(handler.execute("GET temp")).toBeNull();
    vi.useRealTimers();
  });
});