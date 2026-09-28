/**
 * Production API/WebSocket base URL configuration.
 *
 * Development: `VITE_API_BASE_URL` is unset, so REST paths stay relative
 * (`/api/...`) and flow through the Vite dev proxy to the local Fastify
 * server. WebSockets use the dev host directly (the proxy forwards `/api`).
 *
 * Production: `VITE_API_BASE_URL` points at the Render backend
 * (e.g. `https://git-pulse-backend.onrender.com`), so REST and WebSocket
 * requests reach Fastify instead of the static frontend host.
 */
const rawBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() ?? '';

/** Trailing slashes would produce `//api/...`; normalize once here. */
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

/**
 * Absolute URL for a `/api/...` REST path. With no configured base the path
 * is returned unchanged, preserving local development behavior.
 */
export function apiUrl(path: string): string {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

/**
 * WebSocket URL for a `/api/...` path. An `http(s)` base is translated to
 * `ws(s)`; without a configured base the current origin is used, which is
 * correct for local development (Vite proxy with `ws: true`).
 */
export function wsUrl(path: string): string {
  if (API_BASE_URL) {
    return `${API_BASE_URL.replace(/^http/, 'ws')}${path}`;
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}${path}`;
}
