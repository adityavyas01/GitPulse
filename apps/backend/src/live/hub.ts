import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'node:http';
import { readHotState } from './hotState.js';
import type { RedisConnection } from '../infra/redis.js';

interface LiveSocket extends WebSocket {
  isAlive: boolean;
}

/**
 * WS /api/live per API_CONTRACT.md: new clients get a compact hot-state
 * snapshot (if Redis has one), then aggregated updates as they broadcast.
 * ws attaches directly to the Fastify HTTP server — no plugin type
 * augmentation needed.
 */
export interface LiveHubOptions {
  redis: RedisConnection | null;
  log: {
    debug: (msg: string) => void;
    info: (msg: string) => void;
  };
}

export class LiveHub {
  private wss: WebSocketServer;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor(httpServer: HttpServer, private readonly options: LiveHubOptions) {
    this.wss = new WebSocketServer({ noServer: true });
    httpServer.on('upgrade', (request, socket, head) => {
      const url = request.url ?? '';
      if (url === '/api/live' || url.split('?')[0] === '/api/live') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      } else {
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws) => {
      const live = ws as LiveSocket;
      live.isAlive = true;
      live.on('pong', () => {
        live.isAlive = true;
      });
      void this.sendSnapshot(live);
    });
  }

  private async sendSnapshot(ws: LiveSocket): Promise<void> {
    if (!this.options.redis) return;
    try {
      const hot = await readHotState(this.options.redis);
      if (hot && hot.updates.length > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(hot));
      }
    } catch {
      this.options.log.debug('live snapshot unavailable');
    }
  }

  get clientCount(): number {
    return this.wss.clients.size;
  }

  broadcast(updates: Array<{ locationId: string; count: number }>): void {
    if (updates.length === 0) return;
    const payload = JSON.stringify({ timestamp: Date.now(), updates });
    for (const ws of this.wss.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  startHeartbeat(intervalMs = 30_000): void {
    const timer = setInterval(() => {
      for (const ws of this.wss.clients) {
        const live = ws as LiveSocket;
        if (live.isAlive === false) {
          live.terminate();
          continue;
        }
        live.isAlive = false;
        live.ping();
      }
    }, intervalMs);
    timer.unref();
    this.heartbeatTimer = timer;
  }

  close(): Promise<void> {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    return new Promise((resolve) => this.wss.close(() => resolve()));
  }
}
