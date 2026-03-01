import { NextRequest, NextResponse } from 'next/server';
import { saveSubmission, getSettings, getSubmissionByEditToken, hasSubmissionFromIp, updateSubmission, RankingData } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { attendedEditions, rankings, name, intraRankings, comments, flagDuplicate, editToken } = body;

    // Validate name
    if (typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    if (trimmedName.length > 50) {
      return NextResponse.json(
        { error: 'Name must be at most 50 characters' },
        { status: 400 }
      );
    }

    // Validate input
    if (!Array.isArray(attendedEditions) || attendedEditions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid attended editions' },
        { status: 400 }
      );
    }

    if (!rankings || typeof rankings !== 'object') {
      return NextResponse.json(
        { error: 'Invalid rankings' },
        { status: 400 }
      );
    }

    // Validate that all attended editions have rankings
    const rankedEditions = Object.keys(rankings);
    if (rankedEditions.length !== attendedEditions.length) {
      return NextResponse.json(
        { error: 'All attended editions must be ranked' },
        { status: 400 }
      );
    }

    // Validate ranking scores (must be 1-4)
    const validScores = [1, 2, 3, 4];
    for (const score of Object.values(rankings)) {
      if (!validScores.includes(score as number)) {
        return NextResponse.json(
          { error: 'Invalid ranking score' },
          { status: 400 }
        );
      }
    }

    // Validate intraRankings if provided
    if (intraRankings !== undefined && intraRankings !== null) {
      if (typeof intraRankings !== 'object') {
        return NextResponse.json(
          { error: 'Invalid intra-rankings format' },
          { status: 400 }
        );
      }

      for (const [editionId, score] of Object.entries(intraRankings)) {
        if (!attendedEditions.includes(editionId)) {
          return NextResponse.json(
            { error: `Intra-ranking for unknown edition: ${editionId}` },
            { status: 400 }
          );
        }

        const categoryScore = rankings[editionId] as number;
        const lowerBound = categoryScore - 1;
        const upperBound = categoryScore;
        if (typeof score !== 'number' || score < lowerBound || score > upperBound) {
          return NextResponse.json(
            { error: `Intra-ranking score out of range for ${editionId}` },
            { status: 400 }
          );
        }
      }
    }

    // Validate optional comments
    if (comments !== undefined && comments !== null) {
      if (typeof comments !== 'object') {
        return NextResponse.json({ error: 'Invalid comments format' }, { status: 400 });
      }
      for (const [edId, text] of Object.entries(comments)) {
        if (!attendedEditions.includes(edId)) {
          return NextResponse.json({ error: `Comment for unknown edition: ${edId}` }, { status: 400 });
        }
        if (typeof text !== 'string' || text.length > 200) {
          return NextResponse.json({ error: `Comment too long for ${edId} (max 200 chars)` }, { status: 400 });
        }
      }
    }

    const settings = await getSettings();

    // Handle edit-via-token: update existing submission
    if (editToken) {
      const existing = await getSubmissionByEditToken(editToken);
      if (!existing) {
        return NextResponse.json({ error: 'Invalid edit token' }, { status: 404 });
      }

      const hasComments = comments && Object.keys(comments).length > 0;
      await updateSubmission(existing.id, {
        timestamp: Date.now(),
        name: trimmedName,
        attendedEditions,
        rankings: rankings as RankingData,
        ...(intraRankings && Object.keys(intraRankings).length > 0 ? { intraRankings } : {}),
        ...(hasComments ? {
          comments,
          commentStatus: settings.requireCommentModeration ? 'pending' as const : 'approved' as const,
        } : {}),
      });

      return NextResponse.json({ success: true, submissionId: existing.id, status: existing.status || 'approved', edited: true });
    }

    // Create new submission
    const forwarded = request.headers.get('x-forwarded-for');
    const clientIp = (forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip')) ?? 'unknown';
    const ipAlreadySubmitted = clientIp !== 'unknown' && await hasSubmissionFromIp(clientIp);

    const newEditToken = randomUUID();
    const hasComments = comments && Object.keys(comments).length > 0;
    const submission = {
      id: randomUUID(),
      timestamp: Date.now(),
      name: trimmedName,
      attendedEditions,
      rankings: rankings as RankingData,
      editToken: newEditToken,
      ip: clientIp,
      ...(intraRankings && Object.keys(intraRankings).length > 0 ? { intraRankings } : {}),
      ...(hasComments ? {
        comments,
        commentStatus: settings.requireCommentModeration ? 'pending' as const : 'approved' as const,
      } : {}),
      ...(flagDuplicate ? { flagDuplicate: true } : {}),
      ...(ipAlreadySubmitted ? { flagDuplicateIp: true } : {}),
    };

    await saveSubmission(submission);

    const status = settings.requireModeration ? 'pending' : 'approved';

    return NextResponse.json({ success: true, submissionId: submission.id, status, editToken: newEditToken });
  } catch (error) {
    console.error('Error submitting rankings:', error);
    return NextResponse.json(
      { error: 'Failed to submit rankings' },
      { status: 500 }
    );
  }
}
