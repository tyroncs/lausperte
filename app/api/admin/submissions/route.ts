import { NextRequest, NextResponse } from 'next/server';
import { getAllSubmissions, getSubmissionsByStatus, getSettings } from '@/lib/db';
import { requireAdminAuth } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireAdminAuth(request);
    if (unauthorized) return unauthorized;

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
