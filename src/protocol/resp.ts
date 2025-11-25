export type RespData = string | number | null | RespData[];

export class RespEncoder {
  static encode(value: RespData): string {
    if (Array.isArray(value)) {
      let out = `*${value.length}\r\n`;
      for (const v of value) {
        out += RespEncoder.encode(v);
      }
      return out;
    }

    if (value === null) {
      return `$-1\r\n`;
    }

    switch (typeof value) {
      case "string":
        return `$${value.length}\r\n${value}\r\n`;
      case "number":
        return `:${value}\r\n`;
      default:
        return `-ERR unknown type\r\n`;
    }
  }

  static simple(msg: string) {
    return `+${msg}\r\n`;
  }

  static error(msg: string) {
    return `-ERR ${msg}\r\n`;
  }
}

export class RespParser {
  private buffer = "";

  push(chunk: Buffer | string): RespData[] {
    this.buffer += chunk.toString();
    const results: RespData[] = [];

    while (true) {
      const parsed = this.parseOne(this.buffer);
      if (!parsed) break;
      const { value, rest } = parsed;
      results.push(value);
      this.buffer = rest;
    }

    return results;
  }

  private parseOne(input: string): { value: RespData; rest: string } | null {
    if (!input.length) return null;

    const type = input[0];
    const rest = input.slice(1);

    if (type === "+") {
      const end = rest.indexOf("\r\n");
      if (end === -1) return null;
      return { value: rest.slice(0, end), rest: rest.slice(end + 2) };
    }

    if (type === "-") {
      const end = rest.indexOf("\r\n");
      if (end === -1) return null;
      return {
        value: `ERR ${rest.slice(0, end)}`,
        rest: rest.slice(end + 2),
      };
    }

    if (type === ":") {
      const end = rest.indexOf("\r\n");
      if (end === -1) return null;
      return {
        value: parseInt(rest.slice(0, end), 10),
        rest: rest.slice(end + 2),
      };
    }

    if (type === "$") {
      const end = rest.indexOf("\r\n");
      if (end === -1) return null;
      const len = parseInt(rest.slice(0, end), 10);
      if (len === -1) {
        return { value: null, rest: rest.slice(end + 2) };
      }
      const start = end + 2;
      const endBulk = start + len;
      if (rest.length < endBulk + 2) return null;
      return {
        value: rest.slice(start, endBulk),
        rest: rest.slice(endBulk + 2),
      };
    }

    if (type === "*") {
      const end = rest.indexOf("\r\n");
      if (end === -1) return null;
      const count = parseInt(rest.slice(0, end), 10);
      let cur = rest.slice(end + 2);

      const arr: RespData[] = [];
      for (let i = 0; i < count; i++) {
        const parsed = this.parseOne(cur);
        if (!parsed) return null;
        arr.push(parsed.value);
        cur = parsed.rest;
      }

      return { value: arr, rest: cur };
    }

    return null;
  }
}
