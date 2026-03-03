import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/db';

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ priPageContent: settings.priPageContent });
  } catch (error) {
    console.error('Error fetching pri page content:', error);
    return NextResponse.json({ error: 'Failed to fetch pri page content' }, { status: 500 });
  }
}
