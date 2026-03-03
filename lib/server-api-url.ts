import { headers } from 'next/headers';
import { buildApiUrl } from '@/lib/api-url';

export function buildServerApiUrl(path: string): string {
  const apiUrl = buildApiUrl(path);
  if (/^https?:\/\//.test(apiUrl)) {
    return apiUrl;
  }

  const requestHeaders = headers();
  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host') ?? process.env.VERCEL_URL;
  const protocol = requestHeaders.get('x-forwarded-proto') ?? (process.env.VERCEL ? 'https' : 'http');

  if (!host) {
    throw new Error('Unable to resolve API host for server-side request');
  }

  return `${protocol}://${host}${apiUrl}`;
}
