import { buildServerApiUrl } from '@/lib/server-api-url';
import RezultojClient from './RezultojClient';

export default async function RezultojPage() {
  const response = await fetch(buildServerApiUrl('/api/events'), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load events');
  }
  const { editions } = await response.json();

  const mappedEditions = editions.map((ed: {
    id: string;
    eventName: string;
    label: string;
    location: string;
    year: number;
    logo: string;
    flag?: string;
  }) => ({
    id: ed.id,
    eventName: ed.eventName,
    label: ed.label,
    location: ed.location,
    year: ed.year,
    logo: ed.logo,
    flag: ed.flag,
  }));

  return <RezultojClient editions={mappedEditions} />;
}
