import { NextResponse } from 'next/server';
import { calculateRankings, getSubmissionCount, getEvents, getEditions } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const [dbEditions, rankings, contributorCount, events] = await Promise.all([
      getEditions(),
      calculateRankings(),
      getSubmissionCount(),
      getEvents(),
    ]);

    const eventCodes = events.map(e => ({ code: e.code, name: e.name }));
    const logoMap: Record<string, string> = {};
    dbEditions.forEach(ed => {
      if (ed.logo) logoMap[ed.id] = ed.logo;
    });

    return NextResponse.json(
      {
        rankings,
        contributorCount,
        eventCodes,
        logoMap,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  } catch (error) {
    console.error('Error fetching homepage data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homepage data' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );
  }
}
