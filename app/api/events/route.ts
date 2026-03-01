import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/db';
import { getAllEditions } from '@/data/events';

export async function GET() {
  try {
    const [events, editions] = await Promise.all([getEvents(), getAllEditions()]);
    return NextResponse.json({ events, editions });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}
