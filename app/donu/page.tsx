import { getEvents, getEditions } from '@/lib/db';
import DonuClient from './DonuClient';

export default async function DonuPage() {
  const [dbEvents, dbEditions] = await Promise.all([getEvents(), getEditions()]);
  const editionsByEvent = new Map(dbEvents.map(ev => [ev.code, ev.name]));

  const events = dbEvents.map(ev => ({
    code: ev.code,
    name: ev.name,
    editions: dbEditions
      .filter(ed => ed.eventCode === ev.code)
      .map(ed => ({
        id: ed.id,
        eventName: editionsByEvent.get(ed.eventCode) ?? ed.eventCode,
        label: ed.label,
        location: ed.location,
        year: ed.year,
        logo: ed.logo,
      })),
  }));

  return <DonuClient events={events} />;
}
