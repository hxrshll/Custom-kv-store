import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { InMemoryStore } from "../src/core/store";

describe("save/load persistence", () => {
  it("saves and loads store to/from file", () => {
    const tmp = os.tmpdir();
    const file = path.join(tmp, `kv-dump-${Date.now()}.json`);

    const store = new InMemoryStore();
    store.set("a", "1");
    store.set("b", "2");
    // give a long TTL so it doesn't expire during the test
    store.set("session", "user1", { ttl: 60_000 });

    // save
    store.saveToFile(file);
    expect(fs.existsSync(file)).toBe(true);

    // create fresh store and load
    const other = new InMemoryStore();
    const res = other.loadFromFile(file);
    expect(res).toBe("OK");

    expect(other.get("a")).toBe("1");
    expect(other.get("b")).toBe("2");
    expect(other.get("session")).toBe("user1");

    // cleanup
    try {
      fs.unlinkSync(file);
    } catch {}
  });

  it("load returns error when file missing", () => {
    const store = new InMemoryStore();
    const res = store.loadFromFile("/this-file-should-not-exist.json");
    expect(typeof res).toBe("string");
    expect((res as string).startsWith("ERR")).toBe(true);
  });
});