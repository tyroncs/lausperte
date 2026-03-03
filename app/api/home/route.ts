import { NextResponse } from 'next/server';
import { calculateRankings, getSubmissionCount, getApprovedComments, getEvents, getEditions } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [dbEditions, rankings, contributorCount, comments, events] = await Promise.all([
      getEditions(),
      calculateRankings(),
      getSubmissionCount(),
      getApprovedComments(),
      getEvents(),
    ]);

    const eventCodes = events.map(e => ({ code: e.code, name: e.name }));
    const logoMap: Record<string, string> = {};
    dbEditions.forEach(ed => {
      if (ed.logo) logoMap[ed.id] = ed.logo;
    });

    return NextResponse.json({
      rankings,
      contributorCount,
      comments,
      eventCodes,
      logoMap,
    });
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return NextResponse.json({ error: 'Failed to fetch homepage data' }, { status: 500 });
  }
}
