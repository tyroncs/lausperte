import { NextRequest, NextResponse } from 'next/server';
import { getEditions, addEdition, updateEdition, deleteEdition } from '@/lib/db';

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
    const eventCode = request.nextUrl.searchParams.get('eventCode');
    let editions = await getEditions();
    if (eventCode) {
      editions = editions.filter(ed => ed.eventCode === eventCode);
    }
    return NextResponse.json({ editions });
  } catch (error) {
    console.error('Error fetching editions:', error);
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, eventCode, label, location, year, logo, flag } = body;
    if (!id || !eventCode || !label || !location || !year) {
      return NextResponse.json({ error: 'id, eventCode, label, location, and year are required' }, { status: 400 });
    }
    const existing = await getEditions();
    if (existing.some(e => e.id === id)) {
      return NextResponse.json({ error: 'Edition with this ID already exists' }, { status: 409 });
    }
    await addEdition({ id, eventCode, label, location, year: Number(year), logo: logo || '', flag: flag || undefined });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error creating edition:', error);
    return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    if (data.year) data.year = Number(data.year);
    const ok = await updateEdition(id, data);
    if (!ok) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating edition:', error);
    return NextResponse.json({ error: 'Failed to update edition' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id parameter required' }, { status: 400 });
    }
    const result = await deleteEdition(id);
    if (!result.deleted) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, hasSubmissions: result.hasSubmissions });
  } catch (error) {
    console.error('Error deleting edition:', error);
    return NextResponse.json({ error: 'Failed to delete edition' }, { status: 500 });
  }
}
