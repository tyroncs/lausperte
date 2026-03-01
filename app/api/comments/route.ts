import { NextResponse } from 'next/server';
import { getApprovedComments } from '@/lib/db';

/**
 * GET /api/comments — get all approved comments grouped by edition
 */
export async function GET() {
  try {
    const comments = await getApprovedComments();
    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}
