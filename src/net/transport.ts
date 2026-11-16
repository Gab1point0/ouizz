import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '../config';
import type { Msg } from './protocol';

export type NetStatus = 'connecting' | 'online' | 'offline';

/**
 * Canal de la partie : tout le monde (animateur + joueurs) écoute le même canal « ouizz:<PIN> ».
 * Deux implémentations :
 *  - Supabase Realtime (Internet) : la vraie partie, téléphones compris ;
 *  - BroadcastChannel (local) : plusieurs onglets du même navigateur, pour tester sans réseau.
 */
export interface Transport {
  send(m: Msg): void;
  onMessage(cb: (m: Msg) => void): void;
  onStatus(cb: (s: NetStatus) => void): void;
  close(): void;
}

/** Chaque canal a son propre client : pas de conflit quand on quitte puis rejoint la même partie. */
export function makeClient(): SupabaseClient {
  const c = getConfig();
  return createClient(c.url, c.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 40 } },
  });
}

class SupabaseTransport implements Transport {
  private client = makeClient();
  private ch: RealtimeChannel | null = null;
  private msgCb: (m: Msg) => void = () => {};
  private statusCb: (s: NetStatus) => void = () => {};
  private queue: Msg[] = [];
  private ready = false;
  private closed = false;
  private retry = 0;

  constructor(private pin: string) {
    this.open();
  }

  private open() {
    if (this.closed) return;
    const ch = this.client.channel(`ouizz:${this.pin}`, { config: { broadcast: { self: false, ack: false } } });
    this.ch = ch;
    ch.on('broadcast', { event: 'm' }, ({ payload }) => this.msgCb(payload as Msg));
    ch.subscribe((status) => {
      if (this.closed || ch !== this.ch) return;
      if (status === 'SUBSCRIBED') {
        this.ready = true;
        this.statusCb('online');
        const q = this.queue;
        this.queue = [];
        q.forEach((m) => this.send(m));
      } else {
        // CHANNEL_ERROR / TIMED_OUT : supabase-js retente seul ; CLOSED : on rouvre nous-mêmes
        this.ready = false;
        this.statusCb('connecting');
        if (status === 'CLOSED') {
          clearTimeout(this.retry);
          this.retry = window.setTimeout(() => {
            if (this.closed) return;
            void this.client.removeChannel(ch).catch(() => {});
            this.open();
          }, 1500);
        }
      }
    });
  }

  send(m: Msg) {
    if (this.closed) return;
    if (!this.ready || !this.ch) {
      // on ne garde que les derniers messages (inutile de rejouer 50 états périmés)
      this.queue.push(m);
      if (this.queue.length > 30) this.queue.splice(0, this.queue.length - 30);
      return;
    }
    this.ch.send({ type: 'broadcast', event: 'm', payload: m }).catch(() => {});
  }
  onMessage(cb: (m: Msg) => void) { this.msgCb = cb; }
  onStatus(cb: (s: NetStatus) => void) { this.statusCb = cb; }
  close() {
    this.closed = true;
    clearTimeout(this.retry);
    const c = this.client;
    void c.removeAllChannels().catch(() => {}).finally(() => c.realtime.disconnect());
  }
}

class LocalTransport implements Transport {
  private bc: BroadcastChannel;
  private closed = false;
  private msgCb: (m: Msg) => void = () => {};
  constructor(pin: string) {
    this.bc = new BroadcastChannel(`ouizz:${pin}`);
    this.bc.onmessage = (e) => this.msgCb(e.data as Msg);
  }
  send(m: Msg) { if (!this.closed) this.bc.postMessage(m); }
  onMessage(cb: (m: Msg) => void) { this.msgCb = cb; }
  onStatus(cb: (s: NetStatus) => void) { setTimeout(() => { if (!this.closed) cb('online'); }, 0); }
  close() { this.closed = true; this.bc.close(); }
}

export function openTransport(pin: string, local: boolean): Transport {
  return local ? new LocalTransport(pin) : new SupabaseTransport(pin);
}

/** Taille approximative d'un message (pour rester sous la limite de Supabase, ~250 ko). */
export const msgSize = (m: unknown) => JSON.stringify(m).length;
