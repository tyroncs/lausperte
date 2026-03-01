import { NextRequest, NextResponse } from 'next/server';
import { getEvents, addEvent, updateEvent, deleteEvent, getEditions } from '@/lib/db';

function checkAuth(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
  return secret === expectedSecret;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const [events, editions] = await Promise.all([getEvents(), getEditions()]);
    const eventsWithCounts = events.map(ev => ({
      ...ev,
      editionCount: editions.filter(ed => ed.eventCode === ev.code).length,
    }));
    return NextResponse.json({ events: eventsWithCounts });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { code, name } = body;
    if (!code || !name || typeof code !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'code and name are required strings' }, { status: 400 });
    }
    const existing = await getEvents();
    if (existing.some(e => e.code === code)) {
      return NextResponse.json({ error: 'Event with this code already exists' }, { status: 409 });
    }
    await addEvent({ code: code.toUpperCase(), name });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { code, name } = body;
    if (!code || !name || typeof code !== 'string' || typeof name !== 'string') {
      return NextResponse.json({ error: 'code and name are required' }, { status: 400 });
    }
    const ok = await updateEvent(code, { name });
    if (!ok) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'code parameter required' }, { status: 400 });
    }
    const ok = await deleteEvent(code);
    if (!ok) {
      return NextResponse.json({ error: 'Cannot delete: event not found or has editions' }, { status: 400 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
  }
}
