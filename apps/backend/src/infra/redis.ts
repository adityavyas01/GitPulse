import type { FastifyBaseLogger } from 'fastify';
import { createClient, type RedisClientType } from 'redis';

export type RedisConnection = RedisClientType;

export interface RedisHandle {
  client: RedisConnection;
  ready: boolean;
}

let handle: RedisHandle | null = null;

export async function connectRedis(redisUrl: string, log: FastifyBaseLogger): Promise<boolean> {
  const client = createClient({ url: redisUrl });
  client.on('error', (err) => log.error({ err }, 'redis client error'));
  try {
    await client.connect();
    await client.ping();
    handle = { client, ready: true };
    log.info('redis connection established');
    return true;
  } catch (err) {
    log.error({ err }, 'redis connection failed — continuing without cache');
    client.destroy();
    handle = null;
    return false;
  }
}

export function getRedis(): RedisConnection {
  if (!handle) {
    throw new Error('redis not connected');
  }
  return handle.client;
}

export async function closeRedis(): Promise<void> {
  if (handle) {
    await handle.client.quit();
    handle = null;
  }
}
