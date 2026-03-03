import { neon } from '@neondatabase/serverless';

function sql() {
  return neon(process.env.DATABASE_URL!);
}

// ─── Types ───

export type WeightingMode = 'logarithmic' | 'linear' | 'equal';

export interface Settings {
  requireModeration: boolean;
  requireCommentModeration: boolean;
  priPageContent: string;
  weightingMode: WeightingMode;
}

export interface DbEvent {
  code: string;
  name: string;
}

export interface DbEdition {
  id: string;
  eventCode: string;
  label: string;
  location: string;
  year: number;
  logo: string;
  flag?: string;
}

export interface RankingData {
  [editionId: string]: 1 | 2 | 3 | 4;
}

export interface Submission {
  id: string;
  timestamp: number;
  name: string;
  attendedEditions: string[];
  rankings: RankingData;
  intraRankings?: { [editionId: string]: number };
  status?: 'approved' | 'pending';
  editToken?: string;
  comments?: { [editionId: string]: string };
  commentStatus?: 'approved' | 'pending';
  flagDuplicate?: boolean;
  flagDuplicateIp?: boolean;
  ip?: string;
}

// ─── Row mappers ───

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSubmission(row: any): Submission {
  return {
    id: row.id,
    timestamp: Number(row.timestamp),
    name: row.name,
    attendedEditions: row.attended_editions,
    rankings: row.rankings as RankingData,
    intraRankings: row.intra_rankings ?? undefined,
    status: (row.status as 'approved' | 'pending') ?? 'approved',
    editToken: row.edit_token ?? undefined,
    comments: row.comments ?? undefined,
    commentStatus: (row.comment_status as 'approved' | 'pending') ?? undefined,
    flagDuplicate: row.flag_duplicate ?? false,
    flagDuplicateIp: row.flag_duplicate_ip ?? false,
    ip: row.ip ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToSettings(row: any): Settings {
  return {
    requireModeration: row.require_moderation,
    requireCommentModeration: row.require_comment_moderation,
    priPageContent: row.pri_page_content,
    weightingMode: row.weighting_mode as WeightingMode,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEdition(row: any): DbEdition {
  return {
    id: row.id,
    eventCode: row.event_code,
    label: row.label,
    location: row.location,
    year: row.year,
    logo: row.logo,
    flag: row.flag ?? undefined,
  };
}

// ─── Events ───

export async function getEvents(): Promise<DbEvent[]> {
  const db = sql();
  const rows = await db`SELECT code, name FROM events ORDER BY code`;
  return rows.map(r => ({ code: r.code as string, name: r.name as string }));
}

export async function addEvent(event: DbEvent): Promise<void> {
  const db = sql();
  await db`INSERT INTO events (code, name) VALUES (${event.code}, ${event.name})`;
}

export async function updateEvent(code: string, data: Partial<DbEvent>): Promise<boolean> {
  if (!data.name) return false;
  const db = sql();
  const result = await db`UPDATE events SET name = ${data.name} WHERE code = ${code}`;
  return result.length >= 0; // neon returns affected rows differently; assume success if no error
}

export async function deleteEvent(code: string): Promise<boolean> {
  const db = sql();
  // Check for editions first
  const editions = await db`SELECT id FROM editions WHERE event_code = ${code} LIMIT 1`;
  if (editions.length > 0) return false;
  await db`DELETE FROM events WHERE code = ${code}`;
  return true;
}

// ─── Editions ───

export async function getEditions(): Promise<DbEdition[]> {
  const db = sql();
  const rows = await db`SELECT * FROM editions ORDER BY year, id`;
  return rows.map(rowToEdition);
}

export async function getEditionsByEvent(eventCode: string): Promise<DbEdition[]> {
  const db = sql();
  const rows = await db`SELECT * FROM editions WHERE event_code = ${eventCode} ORDER BY year`;
  return rows.map(rowToEdition);
}

export async function addEdition(edition: DbEdition): Promise<void> {
  const db = sql();
  await db`
    INSERT INTO editions (id, event_code, label, location, year, logo, flag)
    VALUES (${edition.id}, ${edition.eventCode}, ${edition.label}, ${edition.location}, ${edition.year}, ${edition.logo}, ${edition.flag ?? null})
  `;
}

export async function updateEdition(id: string, data: Partial<DbEdition>): Promise<boolean> {
  const db = sql();
  const rows = await db`SELECT * FROM editions WHERE id = ${id}`;
  if (rows.length === 0) return false;
  const existing = rowToEdition(rows[0]);
  const merged = { ...existing, ...data };
  await db`
    UPDATE editions
    SET event_code = ${merged.eventCode},
        label      = ${merged.label},
        location   = ${merged.location},
        year       = ${merged.year},
        logo       = ${merged.logo},
        flag       = ${merged.flag ?? null}
    WHERE id = ${id}
  `;
  return true;
}

export async function deleteEdition(id: string): Promise<{ deleted: boolean; hasSubmissions: boolean }> {
  const db = sql();
  const subRows = await db`
    SELECT id FROM submissions
    WHERE attended_editions @> ARRAY[${id}]::text[]
    LIMIT 1
  `;
  const hasSubmissions = subRows.length > 0;
  const result = await db`DELETE FROM editions WHERE id = ${id} RETURNING id`;
  return { deleted: result.length > 0, hasSubmissions };
}

// ─── Settings ───

export async function getSettings(): Promise<Settings> {
  const db = sql();
  const rows = await db`SELECT * FROM settings WHERE id = 1`;
  if (rows.length === 0) {
    // Return defaults if row doesn't exist yet
    return {
      requireModeration: false,
      requireCommentModeration: false,
      priPageContent: '',
      weightingMode: 'logarithmic',
    };
  }
  return rowToSettings(rows[0]);
}

export async function updateSettings(partial: Partial<Settings>): Promise<Settings> {
  const db = sql();
  const current = await getSettings();
  const merged = { ...current, ...partial };
  await db`
    INSERT INTO settings (id, require_moderation, require_comment_moderation, pri_page_content, weighting_mode)
    VALUES (1, ${merged.requireModeration}, ${merged.requireCommentModeration}, ${merged.priPageContent}, ${merged.weightingMode})
    ON CONFLICT (id) DO UPDATE SET
      require_moderation         = EXCLUDED.require_moderation,
      require_comment_moderation = EXCLUDED.require_comment_moderation,
      pri_page_content           = EXCLUDED.pri_page_content,
      weighting_mode             = EXCLUDED.weighting_mode
  `;
  return merged;
}

// ─── Submissions ───

export async function saveSubmission(submission: Submission): Promise<void> {
  const db = sql();
  const settings = await getSettings();
  const status = submission.status ?? (settings.requireModeration ? 'pending' : 'approved');
  await db`
    INSERT INTO submissions (
      id, timestamp, name, attended_editions, rankings, intra_rankings,
      status, edit_token, comments, comment_status,
      flag_duplicate, flag_duplicate_ip, ip
    ) VALUES (
      ${submission.id},
      ${submission.timestamp},
      ${submission.name},
      ${submission.attendedEditions},
      ${JSON.stringify(submission.rankings)},
      ${submission.intraRankings ? JSON.stringify(submission.intraRankings) : null},
      ${status},
      ${submission.editToken ?? null},
      ${submission.comments ? JSON.stringify(submission.comments) : null},
      ${submission.commentStatus ?? null},
      ${submission.flagDuplicate ?? false},
      ${submission.flagDuplicateIp ?? false},
      ${submission.ip ?? null}
    )
  `;
}

export async function getAllSubmissions(): Promise<Submission[]> {
  const db = sql();
  const rows = await db`SELECT * FROM submissions ORDER BY timestamp DESC`;
  return rows.map(rowToSubmission);
}

export async function getSubmissionsByStatus(status: 'approved' | 'pending'): Promise<Submission[]> {
  const db = sql();
  if (status === 'approved') {
    const rows = await db`
      SELECT * FROM submissions
      WHERE status = 'approved' OR status IS NULL
      ORDER BY timestamp DESC
    `;
    return rows.map(rowToSubmission);
  }
  const rows = await db`SELECT * FROM submissions WHERE status = ${status} ORDER BY timestamp DESC`;
  return rows.map(rowToSubmission);
}

export async function approveSubmission(id: string): Promise<boolean> {
  const db = sql();
  const result = await db`UPDATE submissions SET status = 'approved' WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const db = sql();
  const result = await db`DELETE FROM submissions WHERE id = ${id} RETURNING id`;
  return result.length > 0;
}

export async function getSubmissionCount(): Promise<number> {
  const db = sql();
  const rows = await db`
    SELECT COUNT(*) as count FROM submissions
    WHERE status = 'approved' OR status IS NULL
  `;
  return Number(rows[0].count);
}

export async function getSubmissionByEditToken(token: string): Promise<Submission | undefined> {
  const db = sql();
  const rows = await db`SELECT * FROM submissions WHERE edit_token = ${token}`;
  return rows.length > 0 ? rowToSubmission(rows[0]) : undefined;
}

export async function hasSubmissionFromIp(ip: string): Promise<boolean> {
  const db = sql();
  const rows = await db`SELECT id FROM submissions WHERE ip = ${ip} LIMIT 1`;
  return rows.length > 0;
}

export async function updateSubmission(id: string, data: Partial<Omit<Submission, 'id'>>): Promise<boolean> {
  const db = sql();
  const rows = await db`SELECT * FROM submissions WHERE id = ${id}`;
  if (rows.length === 0) return false;
  const existing = rowToSubmission(rows[0]);

  // Merge: keys present in data (even if undefined) override existing values
  const merged = { ...existing };
  if ('timestamp' in data) merged.timestamp = data.timestamp!;
  if ('name' in data) merged.name = data.name!;
  if ('attendedEditions' in data) merged.attendedEditions = data.attendedEditions!;
  if ('rankings' in data) merged.rankings = data.rankings!;
  if ('intraRankings' in data) merged.intraRankings = data.intraRankings;
  if ('status' in data) merged.status = data.status;
  if ('editToken' in data) merged.editToken = data.editToken;
  if ('comments' in data) merged.comments = data.comments;
  if ('commentStatus' in data) merged.commentStatus = data.commentStatus;
  if ('flagDuplicate' in data) merged.flagDuplicate = data.flagDuplicate;
  if ('flagDuplicateIp' in data) merged.flagDuplicateIp = data.flagDuplicateIp;
  if ('ip' in data) merged.ip = data.ip;

  await db`
    UPDATE submissions SET
      timestamp        = ${merged.timestamp},
      name             = ${merged.name},
      attended_editions = ${merged.attendedEditions},
      rankings         = ${JSON.stringify(merged.rankings)},
      intra_rankings   = ${merged.intraRankings ? JSON.stringify(merged.intraRankings) : null},
      status           = ${merged.status ?? 'approved'},
      edit_token       = ${merged.editToken ?? null},
      comments         = ${merged.comments ? JSON.stringify(merged.comments) : null},
      comment_status   = ${merged.commentStatus ?? null},
      flag_duplicate   = ${merged.flagDuplicate ?? false},
      flag_duplicate_ip = ${merged.flagDuplicateIp ?? false},
      ip               = ${merged.ip ?? null}
    WHERE id = ${id}
  `;
  return true;
}

export async function getApprovedComments(): Promise<{ editionId: string; name: string; comment: string; submissionId: string }[]> {
  const db = sql();
  const rows = await db`
    SELECT id, name, comments
    FROM submissions
    WHERE (status = 'approved' OR status IS NULL)
      AND comments IS NOT NULL
      AND comment_status = 'approved'
  `;
  const results: { editionId: string; name: string; comment: string; submissionId: string }[] = [];
  for (const row of rows) {
    const comments = row.comments as { [editionId: string]: string };
    for (const [editionId, comment] of Object.entries(comments)) {
      if (typeof comment === 'string' && comment.trim()) {
        results.push({ editionId, name: row.name as string, comment, submissionId: row.id as string });
      }
    }
  }
  return results;
}

export async function getPendingComments(): Promise<{ submissionId: string; name: string; comments: { [editionId: string]: string } }[]> {
  const db = sql();
  const rows = await db`
    SELECT id, name, comments
    FROM submissions
    WHERE comment_status = 'pending' AND comments IS NOT NULL
  `;
  return rows
    .filter(r => r.comments && Object.keys(r.comments as object).length > 0)
    .map(r => ({
      submissionId: r.id as string,
      name: r.name as string,
      comments: r.comments as { [editionId: string]: string },
    }));
}

export async function approveComments(submissionId: string): Promise<boolean> {
  const db = sql();
  const result = await db`
    UPDATE submissions SET comment_status = 'approved' WHERE id = ${submissionId} RETURNING id
  `;
  return result.length > 0;
}

// ─── Rankings ───

export interface EditionRanking {
  editionId: string;
  editionName: string;
  location: string;
  eventCode: string;
  year: number;
  weightedScore: number;
  totalWeight: number;
  voterCount: number;
  distribution: {
    elstara: number;
    suficeBone: number;
    averaga: number;
    malbona: number;
  };
}

export async function calculateRankings(): Promise<EditionRanking[]> {
  const db = sql();

  const [submissionRows, editionRows, eventRows, settingsRows] = await Promise.all([
    db`SELECT * FROM submissions WHERE status = 'approved' OR status IS NULL`,
    db`SELECT * FROM editions`,
    db`SELECT code, name FROM events`,
    db`SELECT * FROM settings WHERE id = 1`,
  ]);

  if (submissionRows.length === 0) return [];

  const submissions = submissionRows.map(rowToSubmission);
  const editions = editionRows.map(rowToEdition);
  const eventNameMap = new Map(eventRows.map(r => [r.code as string, r.name as string]));
  const settings = settingsRows.length > 0
    ? rowToSettings(settingsRows[0])
    : { weightingMode: 'logarithmic' as WeightingMode, requireModeration: false, requireCommentModeration: false, priPageContent: '' };

  const editionStats = new Map<string, {
    scores: number[];
    weights: number[];
    distribution: { 1: number; 2: number; 3: number; 4: number };
  }>();

  for (const submission of submissions) {
    const attendanceCount = submission.attendedEditions.length;
    let weight: number;
    if (settings.weightingMode === 'equal') {
      weight = 1;
    } else if (settings.weightingMode === 'linear') {
      weight = attendanceCount;
    } else {
      weight = Math.log(attendanceCount + 1);
    }

    for (const [editionId, categoryScore] of Object.entries(submission.rankings)) {
      if (!editionStats.has(editionId)) {
        editionStats.set(editionId, {
          scores: [],
          weights: [],
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0 },
        });
      }
      const stats = editionStats.get(editionId)!;
      const effectiveScore = submission.intraRankings?.[editionId] ?? (categoryScore - 0.5);
      stats.scores.push(effectiveScore);
      stats.weights.push(weight);
      stats.distribution[categoryScore]++;
    }
  }

  const rankings: EditionRanking[] = [];

  editionStats.forEach((stats, editionId) => {
    const edition = editions.find(e => e.id === editionId);
    if (!edition) return;

    const weightedSum = stats.scores.reduce((sum, score, idx) => sum + score * stats.weights[idx], 0);
    const totalWeight = stats.weights.reduce((sum, w) => sum + w, 0);
    const weightedScore = weightedSum / totalWeight;
    const totalVotes = stats.scores.length;

    const distribution = {
      elstara:    (stats.distribution[4] / totalVotes) * 100,
      suficeBone: (stats.distribution[3] / totalVotes) * 100,
      averaga:    (stats.distribution[2] / totalVotes) * 100,
      malbona:    (stats.distribution[1] / totalVotes) * 100,
    };

    const eventName = eventNameMap.get(edition.eventCode) ?? edition.eventCode;

    rankings.push({
      editionId: edition.id,
      editionName: `${eventName} ${edition.label}`,
      location: edition.location,
      eventCode: edition.eventCode,
      year: edition.year,
      weightedScore,
      totalWeight,
      voterCount: totalVotes,
      distribution,
    });
  });

  rankings.sort((a, b) => b.weightedScore - a.weightedScore);
  return rankings;
}
