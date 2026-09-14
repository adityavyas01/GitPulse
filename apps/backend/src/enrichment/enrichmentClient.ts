import type { FastifyBaseLogger } from 'fastify';

import type { GithubConfig } from '../github/config.js';
import { TtlCache } from './cache.js';
import { diagProfileFetch } from './diagnostics.js';

export interface UserProfile {
  userId: number;
  username: string | null;
  /** Self-reported public profile location; not verified GPS (ADR-004). */
  location: string | null;
}

export interface RepositoryMetadata {
  repositoryId: number;
  name: string | null;
  /** Repository language metadata; not the exact event language (ADR-006). */
  primaryLanguage: string | null;
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 10000;

/**
 * GitHub user/repository metadata via the public REST API, cache-first.
 * Shares the same token/timeout/error philosophy as the ingestion client.
 * Reuses the ingestion token so credentials stay server-side and single-sourced.
 */
export class EnrichmentClient {
  readonly users: TtlCache<UserProfile>;
  readonly repositories: TtlCache<RepositoryMetadata>;
  private readonly config: GithubConfig;
  private readonly log: FastifyBaseLogger;

  constructor(config: GithubConfig, log: FastifyBaseLogger) {
    this.config = config;
    this.log = log;
    this.users = new TtlCache<UserProfile>(DEFAULT_TTL_MS, DEFAULT_MAX_ENTRIES, (id) => this.loadUser(id));
    this.repositories = new TtlCache<RepositoryMetadata>(DEFAULT_TTL_MS, DEFAULT_MAX_ENTRIES, (id) => this.loadRepository(id));
  }

  private async requestJson(path: string): Promise<unknown> {
    const headers: Record<string, string> = {
      'User-Agent': 'Git-Pulse/0.1',
      Accept: 'application/vnd.github+json'
    };
    if (this.config.token) {
      headers.Authorization = `Bearer ${this.config.token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await fetch(`${this.config.apiUrl}${path}`, { headers, signal: controller.signal });
      if (path.startsWith('/user/')) diagProfileFetch(response.status);
      if (response.status === 404) {
        return null;
      }
      if (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0') {
        this.log.warn('enrichment rate limited');
        return null;
      }
      if (!response.ok) {
        return null;
      }
      return (await response.json().catch(() => null)) as unknown;
    } catch (err) {
      if (path.startsWith('/user/')) diagProfileFetch('network_fail');
      this.log.warn({ err }, 'enrichment request failed');
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async loadUser(userId: string): Promise<UserProfile | null> {
    const body = (await this.requestJson(`/user/${userId}`)) as {
      id?: number;
      login?: string;
      location?: string | null;
    } | null;
    if (!body || typeof body.id !== 'number') {
      return null;
    }
    return {
      userId: body.id,
      username: typeof body.login === 'string' ? body.login : null,
      location: typeof body.location === 'string' && body.location.length > 0 ? body.location : null
    };
  }

  private async loadRepository(repoId: string): Promise<RepositoryMetadata | null> {
    const body = (await this.requestJson(`/repositories/${repoId}`)) as {
      id?: number;
      name?: string;
      language?: string | null;
    } | null;
    if (!body || typeof body.id !== 'number') {
      return null;
    }
    return {
      repositoryId: body.id,
      name: typeof body.name === 'string' ? body.name : null,
      primaryLanguage: typeof body.language === 'string' && body.language.length > 0 ? body.language : null
    };
  }
}
