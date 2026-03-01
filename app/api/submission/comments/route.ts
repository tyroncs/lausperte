import { NextRequest, NextResponse } from 'next/server';
import { getSubmissionByEditToken, updateSubmission, getSettings } from '@/lib/db';

/**
 * POST /api/submission/comments — add comments to an existing submission
 * Body: { editToken: string, comments: { [editionId]: string } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { editToken, comments } = body;

    if (!editToken || typeof editToken !== 'string') {
      return NextResponse.json({ error: 'editToken required' }, { status: 400 });
    }

    if (!comments || typeof comments !== 'object') {
      return NextResponse.json({ error: 'comments object required' }, { status: 400 });
    }

    const submission = await getSubmissionByEditToken(editToken);
    if (!submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    // Validate comments: only for attended editions, max 200 chars
    const validComments: { [editionId: string]: string } = {};
    for (const [edId, text] of Object.entries(comments)) {
      if (typeof text !== 'string') continue;
      const trimmed = text.trim();
      if (!trimmed) continue;
      if (!submission.attendedEditions.includes(edId)) continue;
      if (trimmed.length > 200) {
        return NextResponse.json({ error: `Comment too long for ${edId} (max 200)` }, { status: 400 });
      }
      validComments[edId] = trimmed;
    }

    if (Object.keys(validComments).length === 0) {
      return NextResponse.json({ success: true, message: 'No comments to save' });
    }

    const settings = await getSettings();
    await updateSubmission(submission.id, {
      comments: validComments,
      commentStatus: settings.requireCommentModeration ? 'pending' : 'approved',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving comments:', error);
    return NextResponse.json({ error: 'Failed to save comments' }, { status: 500 });
  }
}
