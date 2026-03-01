import { NextRequest, NextResponse } from 'next/server';
import { deleteSubmission, approveSubmission, approveComments, saveSubmission, updateSubmission, getEditions, RankingData } from '@/lib/db';
import { randomUUID } from 'crypto';

function checkAuth(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
  return secret === expectedSecret;
}

export async function DELETE(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissionId = request.nextUrl.searchParams.get('id');
    if (!submissionId) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    const deleted = await deleteSubmission(submissionId);

    if (!deleted) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deletedId: submissionId });
  } catch (error) {
    console.error('Error deleting submission:', error);
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, action } = body;

    if (!id) {
      return NextResponse.json({ error: 'Submission ID required' }, { status: 400 });
    }

    if (action === 'approve') {
      const approved = await approveSubmission(id);
      if (!approved) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, approvedId: id });
    }

    if (action === 'approve_comments') {
      const approved = await approveComments(id);
      if (!approved) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, approvedCommentsFor: id });
    }

    if (action === 'delete_comments') {
      const updated = await updateSubmission(id, { comments: undefined, commentStatus: undefined });
      if (!updated) {
        return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, deletedCommentsFor: id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Error updating submission:', error);
    return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { submissions } = body;

    if (!Array.isArray(submissions) || submissions.length === 0) {
      return NextResponse.json({ error: 'submissions array required' }, { status: 400 });
    }

    const validEditions = await getEditions();
    const validEditionIds = new Set(validEditions.map(e => e.id));

    const added: string[] = [];
    const errors: string[] = [];

    for (const entry of submissions) {
      const { name, rankings } = entry as { name: string; rankings: Record<string, number> };

      if (!name || !rankings || typeof rankings !== 'object') {
        errors.push(`Invalid entry for "${name || 'unknown'}"`);
        continue;
      }

      const attendedEditions: string[] = [];
      const validRankings: RankingData = {};
      let valid = true;

      for (const [editionId, score] of Object.entries(rankings)) {
        if (!validEditionIds.has(editionId)) {
          errors.push(`Unknown edition "${editionId}" for "${name}"`);
          valid = false;
          break;
        }
        if (![1, 2, 3, 4].includes(score as number)) {
          errors.push(`Invalid score ${score} for "${editionId}" in "${name}"`);
          valid = false;
          break;
        }
        attendedEditions.push(editionId);
        validRankings[editionId] = score as 1 | 2 | 3 | 4;
      }

      if (!valid) continue;

      const submission = {
        id: randomUUID(),
        timestamp: Date.now(),
        name: name.trim(),
        attendedEditions,
        rankings: validRankings,
        status: 'approved' as const,
      };

      await saveSubmission(submission);
      added.push(submission.id);
    }

    return NextResponse.json({ success: true, addedCount: added.length, addedIds: added, errors });
  } catch (error) {
    console.error('Error adding submissions:', error);
    return NextResponse.json({ error: 'Failed to add submissions' }, { status: 500 });
  }
}
