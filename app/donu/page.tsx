import { buildServerApiUrl } from '@/lib/server-api-url';
import DonuClient from './DonuClient';

export const dynamic = 'force-dynamic';

export default async function DonuPage() {
  const response = await fetch(buildServerApiUrl('/api/events'), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load events');
  }
  const { events, editions } = await response.json();

  const eventsWithEditions = events.map((ev: { code: string; name: string }) => ({
    code: ev.code,
    name: ev.name,
    editions: editions
      .filter((ed: { eventCode: string }) => ed.eventCode === ev.code)
      .map((ed: { id: string; eventName: string; label: string; location: string; year: number; logo: string }) => ({
        id: ed.id,
        eventName: ed.eventName,
        label: ed.label,
        location: ed.location,
        year: ed.year,
        logo: ed.logo,
      })),
  }));

  return <DonuClient events={eventsWithEditions} />;
}
