
# custom-kv-store

Tiny in-memory key-value store written in TypeScript.
Basically diet-Redis: no persistence, no magic
just a map with opinions.

I built this to understand how something like Redis actually works under the hood instead of treating it like a black box.

## What this thing actually does

- Keeps stuff in memory using a `Map`.
- Supports the bare minimum commands you’d expect:
  - `SET key value`
  - `GET key`
  - `DEL key`
  - `EXISTS key`
  - `CLEAR`
- Has a tiny “command parser” so you can talk to it like you would a real DB.
- Optional TCP server so you can `nc 127.0.0.1 6379` and pretend you’re hacking.

Is this production-ready? Absolutely not. Does it work? Yep.

## Folder vibes


```
src/
 ├─ core/          # the real engine – in-memory key/value store
 ├─ commands/      # parses text commands (SET, GET, DEL, etc.)
 ├─ server/        # tiny TCP server so you can connect like redis
tests/             # yes, I actually wrote tests
```

## Quick usage

```typescript
import { InMemoryStore } from "./src/core/store";

const store = new InMemoryStore();
store.set("name", "harshal");  // "OK"
store.get("name");              // "harshal"
store.del("name");              // 1
store.get("name");              // null
```

If you want to use fake Redis syntax:

```typescript
const handler = new CommandHandler(store);
handler.execute("SET a 10");  // "OK"
handler.execute("GET a");     // "10"
handler.execute("DEL a");     // 1
```

## Run it

```powershell
npm install
npm run dev      # small demo
npm test         # vitest
npm run server   # starts TCP listener on 127.0.0.1:6379
```

Then:

```powershell
nc localhost 6379
```

Type:

```
SET foo bar
GET foo
DEL foo
GET foo
CLEAR
```

It’ll answer back like a loyal dog.

## Why does this exist

Because reading Redis docs does not give you the same understanding as writing 150 lines of code and going:

“Oh so it’s literally just a map and some text parsing… huh”

## Future maybe

- TTL support so keys self-destruct
- Real Redis RESP protocol instead of plain text
- File dump so it survives a restart
- Anything else I feel like adding at 2am

## License

MIT, because I don’t care what you do with it.