import { NextRequest, NextResponse } from 'next/server';
import { getAllSubmissions, getSubmissionsByStatus, getSettings } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret');
    const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const statusFilter = request.nextUrl.searchParams.get('status') || 'all';
    const [settings, submissions] = await Promise.all([
      getSettings(),
      statusFilter === 'approved' || statusFilter === 'pending'
        ? getSubmissionsByStatus(statusFilter)
        : getAllSubmissions(),
    ]);

    return NextResponse.json({ submissions, settings });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
