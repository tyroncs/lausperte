import { NextResponse } from 'next/server';
import { calculateRankings } from '@/lib/db';

export async function GET() {
  try {
    const rankings = await calculateRankings();
    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
  }
}
