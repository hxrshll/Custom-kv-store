// minimal pub/sub manager. servers register a send function per subscriber.

export type SubscriberId = string;

export type SendFn = (payload: string) => void;

export class PubSub {
  private channels = new Map<string, Map<SubscriberId, SendFn>>();

  subscribe(channel: string, id: SubscriberId, send: SendFn): number {
    let m = this.channels.get(channel);
    if (!m) {
      m = new Map();
      this.channels.set(channel, m);
    }
    m.set(id, send);
    return m.size;
  }

  unsubscribe(channel: string, id: SubscriberId): number {
    const m = this.channels.get(channel);
    if (!m) return 0;
    m.delete(id);
    const remain = m.size;
    if (remain === 0) this.channels.delete(channel);
    return remain;
  }

  unsubscribeAll(id: SubscriberId): number {
    let total = 0;
    for (const [chan, map] of this.channels.entries()) {
      if (map.has(id)) {
        map.delete(id);
        total++;
        if (map.size === 0) this.channels.delete(chan);
      }
    }
    return total;
  }

  publish(channel: string, payload: string): number {
    const m = this.channels.get(channel);
    if (!m) return 0;
    for (const send of Array.from(m.values())) {
      try {
        send(payload);
      } catch {
      }
    }
    return m.size;
  }

  subscribersCount(channel: string): number {
    const m = this.channels.get(channel);
    return m ? m.size : 0;
  }
}

export const globalPubSub = new PubSub();
