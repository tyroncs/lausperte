import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings, WeightingMode } from '@/lib/db';

function checkAuth(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
  return secret === expectedSecret;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

const VALID_WEIGHTING_MODES: WeightingMode[] = ['logarithmic', 'linear', 'equal'];

export async function PUT(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const update: Record<string, unknown> = {};

    if ('requireModeration' in body) {
      if (typeof body.requireModeration !== 'boolean') {
        return NextResponse.json({ error: 'requireModeration must be a boolean' }, { status: 400 });
      }
      update.requireModeration = body.requireModeration;
    }

    if ('priPageContent' in body) {
      if (typeof body.priPageContent !== 'string') {
        return NextResponse.json({ error: 'priPageContent must be a string' }, { status: 400 });
      }
      update.priPageContent = body.priPageContent;
    }

    if ('requireCommentModeration' in body) {
      if (typeof body.requireCommentModeration !== 'boolean') {
        return NextResponse.json({ error: 'requireCommentModeration must be a boolean' }, { status: 400 });
      }
      update.requireCommentModeration = body.requireCommentModeration;
    }

    if ('weightingMode' in body) {
      if (!VALID_WEIGHTING_MODES.includes(body.weightingMode)) {
        return NextResponse.json({ error: `weightingMode must be one of: ${VALID_WEIGHTING_MODES.join(', ')}` }, { status: 400 });
      }
      update.weightingMode = body.weightingMode;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const settings = await updateSettings(update);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
