function normalizeBaseUrl(rawBase: string): string {
  const trimmed = rawBase.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function buildApiUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL
    ? normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL)
    : '';

  if (!base) return path;

  const normalizedPath = path.startsWith('/api') ? path.slice(4) : path;
  const safePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${base}${safePath}`;
}
