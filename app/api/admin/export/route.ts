import { NextRequest, NextResponse } from 'next/server';
import { getAllSubmissions } from '@/lib/db';
import { getAllEditions, getEditionById } from '@/data/events';

function checkAuth(request: NextRequest): boolean {
  const secret = request.nextUrl.searchParams.get('secret');
  const expectedSecret = process.env.ADMIN_SECRET || 'change-me-in-production';
  return secret === expectedSecret;
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const format = request.nextUrl.searchParams.get('format') || 'json';
    const [submissions, allEditions] = await Promise.all([
      getAllSubmissions(),
      getAllEditions(),
    ]);

    if (format === 'csv') {
      const sortedEditions = allEditions.sort((a, b) => a.id.localeCompare(b.id));

      const headers = [
        'name', 'date', 'status', 'flag_duplicate', 'attended_count',
        ...sortedEditions.map(e => e.id),
      ];

      const rows = submissions.map(sub => {
        const date = new Date(sub.timestamp).toISOString().split('T')[0];
        const status = sub.status || 'approved';
        const base = [
          escapeCSV(sub.name),
          date,
          status,
          sub.flagDuplicate ? 'true' : '',
          sub.attendedEditions.length.toString(),
        ];

        const scores = sortedEditions.map(e => {
          const score = sub.rankings[e.id];
          return score ? score.toString() : '';
        });

        return [...base, ...scores].join(',');
      });

      const csv = [headers.join(','), ...rows].join('\n');

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="lausperte-export-${Date.now()}.csv"`,
        },
      });
    }

    // JSON format
    const editionMap = new Map(allEditions.map(e => [e.id, e]));
    const exportData = submissions.map(sub => {
      const attendedEditionsReadable = sub.attendedEditions.map(id => {
        const edition = editionMap.get(id);
        return edition ? `${edition.eventName} ${edition.label}` : id;
      });

      const rankingsReadable: Record<string, { edition: string; score: number; category: string }> = {};
      Object.entries(sub.rankings).forEach(([editionId, score]) => {
        const edition = editionMap.get(editionId);
        const categoryName = ['', 'Malbona', 'Averaĝa', 'Sufiĉe bone', 'Elstara'][score];
        rankingsReadable[editionId] = {
          edition: edition ? `${edition.eventName} ${edition.label}` : editionId,
          score,
          category: categoryName,
        };
      });

      return {
        id: sub.id,
        name: sub.name,
        timestamp: sub.timestamp,
        date: new Date(sub.timestamp).toISOString(),
        status: sub.status || 'approved',
        flagDuplicate: sub.flagDuplicate,
        attendedCount: sub.attendedEditions.length,
        attendedEditions: attendedEditionsReadable,
        rankings: rankingsReadable,
        comments: sub.comments,
      };
    });

    return NextResponse.json({
      totalSubmissions: submissions.length,
      exportDate: new Date().toISOString(),
      submissions: exportData,
    }, {
      headers: {
        'Content-Disposition': `attachment; filename="lausperte-export-${Date.now()}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}
