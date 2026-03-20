import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DEFAULT_ALLOWED_HOSTS = ['34.34.123.132:8080'];
const DEFAULT_ALLOWED_PATH_PREFIX = '/v1/results/';
const DEFAULT_TIMEOUT_MS = 20000;

function getAllowedHosts(): Set<string> {
  const raw =
    process.env.GPU_IMAGE_PROXY_ALLOWED_HOSTS ||
    DEFAULT_ALLOWED_HOSTS.join(',');

  return new Set(
    raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src');
  if (!src) {
    return new Response('Missing src', { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(src);
  } catch {
    return new Response('Invalid src', { status: 400 });
  }

  if (!['http:', 'https:'].includes(target.protocol)) {
    return new Response('Unsupported protocol', { status: 400 });
  }

  if (!getAllowedHosts().has(target.host.toLowerCase())) {
    return new Response('Host not allowed', { status: 403 });
  }

  if (!target.pathname.startsWith(DEFAULT_ALLOWED_PATH_PREFIX)) {
    return new Response('Path not allowed', { status: 403 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const upstream = await fetch(target.toString(), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return new Response('Upstream fetch failed', { status: upstream.status || 502 });
    }

    const headers = new Headers();
    headers.set(
      'Content-Type',
      upstream.headers.get('content-type') || 'application/octet-stream'
    );
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch {
    return new Response('Upstream fetch failed', { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
