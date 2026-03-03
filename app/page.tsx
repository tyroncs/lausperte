import { buildServerApiUrl } from '@/lib/server-api-url';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage() {
  const response = await fetch(buildServerApiUrl('/api/home'), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load homepage data');
  }

  const initialData = await response.json();
  return <HomeClient initialData={initialData} />;
}
