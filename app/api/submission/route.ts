import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionByEditToken } from '@/lib/db';

/**
 * GET /api/submission?token=... — fetch a submission by edit token
 * Used by /donu page to pre-fill the form for editing
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const submission = await getSubmissionByEditToken(token);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Return submission data (without the edit token itself for security)
    return NextResponse.json({
      id: submission.id,
      name: submission.name,
      attendedEditions: submission.attendedEditions,
      rankings: submission.rankings,
      intraRankings: submission.intraRankings,
      comments: submission.comments,
    });
  } catch (error) {
    console.error('Error fetching submission:', error);
    return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 });
  }
}
