import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { InMemoryStore } from "../src/core/store";
import { CommandHandler } from "../src/commands/command-parser";

describe("save/load persistence (async)", () => {
  it("saves and loads store to/from file via commands (async)", async () => {
    const tmp = os.tmpdir();
    const file = path.join(tmp, `kv-dump-${Date.now()}.json`);

    const store = new InMemoryStore();
    const handler = new CommandHandler(store);

    await handler.execute(`SET a 1`);
    await handler.execute(`SET b 2`);
    await handler.execute(`SET session user1 PX 60000`);

    // save (async)
    const saveRes = await handler.execute(`SAVE ${file}`);
    expect(saveRes).toBe("OK");
    expect(fs.existsSync(file)).toBe(true);

    // clear and load
    await handler.execute(`CLEAR`);
    expect(await handler.execute(`GET a`)).toBeNull();

    const loadRes = await handler.execute(`LOAD ${file}`);
    expect(loadRes).toBe("OK");
    expect(await handler.execute(`GET a`)).toBe("1");
    expect(await handler.execute(`GET b`)).toBe("2");
    expect(await handler.execute(`GET session`)).toBe("user1");

    // cleanup
    try {
      fs.unlinkSync(file);
    } catch {}
  });

  it("LOAD returns error when file missing", async () => {
    const handler = new CommandHandler(new InMemoryStore());
    const res = await handler.execute(`LOAD /this-file-should-not-exist.json`);
    expect(typeof res).toBe("string");
    expect((res as string).startsWith("ERR")).toBe(true);
  });
});