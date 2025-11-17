import { InMemoryStore } from "./core/store";
export * from "./core/store";
export * from "./commands/command-parser";
export * from "./server/tcp-server";

declare const require: any;
declare const module: any;

if (typeof require !== "undefined" && require.main === module) {
  const store = new InMemoryStore();
  store.set("name", "harshal");
  console.log("GET name ->", store.get("name"));
}