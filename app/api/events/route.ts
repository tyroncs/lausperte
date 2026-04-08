import { NextResponse } from 'next/server';
import { getEvents, getEditions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [events, dbEditions] = await Promise.all([getEvents(), getEditions()]);
    const eventNameMap = new Map(events.map(e => [e.code, e.name]));
    const editions = dbEditions.map(ed => ({
      id: ed.id,
      eventCode: ed.eventCode,
      eventName: eventNameMap.get(ed.eventCode) ?? ed.eventCode,
      label: ed.label,
      location: ed.location,
      year: ed.year,
      logo: ed.logo,
      flag: ed.flag,
    }));

    return NextResponse.json({ events, editions });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
