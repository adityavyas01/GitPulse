import { useEffect, useRef, useState } from 'react';

/**
 * Week 9 — WebSocket live updates (WS /api/live). Receives compact,
 * aggregated, location-based messages (API_CONTRACT.md). Reconnects with
 * exponential backoff capped at 60s; "LIVE" stays on unless the socket
 * is down (UI uses "LIVE", never "real-time").
 */
export interface LiveUpdate {
  locationId: string;
  count: number;
}

export interface LiveMessage {
  timestamp: number;
  updates: LiveUpdate[];
}

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 60_000;

export function useLiveSocket(enabled = true): { connected: boolean; last: LiveMessage | null } {
  const [connected, setConnected] = useState(false);
  const [last, setLast] = useState<LiveMessage | null>(null);
  const attemptRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const connect = () => {
      if (closed) return;
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      ws = new WebSocket(`${proto}://${window.location.host}/api/live`);

      ws.onopen = () => {
        attemptRef.current = 0;
        setConnected(true);
      };
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data as string) as LiveMessage;
          if (
            typeof message.timestamp === 'number' &&
            Array.isArray(message.updates) &&
            message.updates.every(
              (u) => typeof u.locationId === 'string' && typeof u.count === 'number'
            )
          ) {
            setLast(message);
          }
        } catch {
          // malformed frame — ignore, never fabricate
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (closed) return;
        const delay = Math.min(
          RECONNECT_BASE_MS * 2 ** attemptRef.current,
          RECONNECT_MAX_MS
        );
        attemptRef.current += 1;
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();
    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled]);

  return { connected, last };
}
