'use client';

import { useState } from 'react';
import EditionLogo from '@/app/EditionLogo';

interface EditionRanking {
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

interface Comment {
  editionId: string;
  name: string;
  comment: string;
  submissionId: string;
}

interface RankingsListProps {
  rankings: EditionRanking[];
  eventCodes: Array<{ code: string; name: string }>;
  comments?: Comment[];
  contributorCount?: number;
  logoMap?: Record<string, string>;
}

export default function RankingsList({ rankings, eventCodes = [], comments = [], contributorCount, logoMap = {} }: RankingsListProps) {
  const [showAll, setShowAll] = useState(false);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [postCovidOnly, setPostCovidOnly] = useState(false);
  const [minVoters, setMinVoters] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'score' | 'responses'>('score');

  const safeEventCodes = eventCodes ?? [];

  // Apply filters
  let filtered = rankings;

  if (eventFilter !== 'all') {
    filtered = filtered.filter(r => r.eventCode === eventFilter);
  }

  if (postCovidOnly) {
    filtered = filtered.filter(r => r.year >= 2022);
  }

  if (minVoters) {
    filtered = filtered.filter(r => r.voterCount >= 5);
  }

  // Apply sort
  const sorted = sortMode === 'responses'
    ? [...filtered].sort((a, b) => b.voterCount - a.voterCount)
    : filtered;

  const displayed = showAll ? sorted : sorted.slice(0, 10);
  const hasMore = sorted.length > 10;

  return (
    <div className="bg-white rounded-xl shadow-xl">
      <div className="bg-emerald-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
        <h2 className="text-2xl font-bold">Rangigo</h2>
        {contributorCount !== undefined && (
          <span className="text-base text-emerald-100">{contributorCount} jam kontribuis!</span>
        )}
      </div>

      {/* Filter bar — outside overflow-hidden so native select popup is never clipped */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3 flex-wrap">
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        >
          <option value="all">Ĉiuj eventoj</option>
          {safeEventCodes.map(ev => (
            <option key={ev.code} value={ev.code}>{ev.name}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={postCovidOnly}
            onChange={(e) => setPostCovidOnly(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
          />
          Nur post-KOVIM
        </label>

        <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={minVoters}
            onChange={(e) => setMinVoters(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
          />
          Almenaŭ 5 voĉdonantoj
        </label>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-sm text-gray-600">Ordigu laŭ</span>
          <button
            onClick={() => setSortMode('score')}
            className={`px-2 py-1 rounded-l-lg text-sm font-medium border transition-colors ${
              sortMode === 'score'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            poentoj
          </button>
          <button
            onClick={() => setSortMode('responses')}
            className={`px-2 py-1 rounded-r-lg text-sm font-medium border-t border-b border-r transition-colors ${
              sortMode === 'responses'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            respondoj
          </button>
        </div>
      </div>

      {/* Rankings list */}
      <div className="overflow-hidden rounded-b-xl">
        {sorted.length > 0 ? (
          <>
            <div className="divide-y divide-gray-200">
              {displayed.map((ranking, index) => (
                <RankingRow
                  key={ranking.editionId}
                  ranking={ranking}
                  position={index + 1}
                  isExpanded={expandedId === ranking.editionId}
                  onToggle={() => setExpandedId(expandedId === ranking.editionId ? null : ranking.editionId)}
                  comments={comments.filter(c => c.editionId === ranking.editionId)}
                  logoUrl={logoMap[ranking.editionId]}
                />
              ))}
            </div>

            {/* Show all / collapse toggle */}
            {hasMore && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="text-emerald-600 hover:text-emerald-800 font-semibold text-sm transition-colors"
                >
                  {showAll
                    ? 'Montri nur la unuajn 10'
                    : `Montri ĉiujn (${sorted.length})`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="px-6 py-8 text-center text-gray-500">
            Neniu rezulto kun la elektitaj filtriloj.
          </div>
        )}
      </div>
    </div>
  );
}

interface RankingRowProps {
  ranking: EditionRanking;
  position: number;
  isExpanded: boolean;
  onToggle: () => void;
  comments: Comment[];
  logoUrl?: string;
}

function RankingRow({ ranking, position, isExpanded, onToggle, comments, logoUrl }: RankingRowProps) {
  const [showAllComments, setShowAllComments] = useState(false);
  // Show 5 random comments by default, all on "show all"
  const displayedComments = showAllComments ? comments : comments.slice(0, 5);
  return (
    <div
      className="px-6 py-3 hover:bg-emerald-50 transition-colors cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-center gap-4">
        {/* Position */}
        <span className="flex-shrink-0 w-12 text-center text-xl font-bold text-emerald-800">{position}</span>

        {/* Event Info */}
        <EditionLogo size={48} logoUrl={logoUrl} />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{ranking.editionName}</h3>
          <p className="text-sm text-gray-600">{ranking.location}</p>
        </div>

        {/* Expand indicator */}
        <div className="flex-shrink-0 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Inline Pie Chart + Comments when expanded */}
      {isExpanded && (
        <div className="mt-4" onClick={(e) => e.stopPropagation()}>
          <PieChartInline
            distribution={ranking.distribution}
            voterCount={ranking.voterCount}
          />
          {comments.length > 0 && (
            <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Komentoj ({comments.length})</h4>
              <div className="space-y-3">
                {displayedComments.map((c, i) => (
                  <div key={i} className="bg-white rounded-lg border border-gray-100 px-4 py-3">
                    <p className="text-sm text-gray-600 italic">&ldquo;{c.comment}&rdquo;</p>
                    <div className="text-right mt-1">
                      <span className="text-xs font-bold text-gray-500">&mdash; {c.name}</span>
                    </div>
                  </div>
                ))}
              </div>
              {comments.length > 5 && (
                <button
                  onClick={() => setShowAllComments(v => !v)}
                  className="mt-2 text-sm text-emerald-600 hover:text-emerald-800 font-medium"
                >
                  {showAllComments ? 'Montri malpli' : `Montri ĉiujn ${comments.length} komentojn`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface Distribution {
  elstara: number;
  suficeBone: number;
  averaga: number;
  malbona: number;
}

const CHART_SEGMENTS = [
  { label: 'Elstara', key: 'elstara' as const, color: '#047857' },        // emerald-700
  { label: 'Tre bona', key: 'suficeBone' as const, color: '#34d399' },      // emerald-400
  { label: 'Enorde', key: 'averaga' as const, color: '#eab308' },          // yellow-500
  { label: 'Malbona', key: 'malbona' as const, color: '#ef4444' },        // red-500
];

function buildGradient(distribution: Distribution) {
  const segments = CHART_SEGMENTS.map(s => ({ ...s, pct: distribution[s.key] }));
  let cumulative = 0;
  const gradientParts: string[] = [];
  segments.forEach(seg => {
    if (seg.pct > 0) {
      gradientParts.push(`${seg.color} ${cumulative}% ${cumulative + seg.pct}%`);
      cumulative += seg.pct;
    }
  });
  return gradientParts.length > 0
    ? `conic-gradient(${gradientParts.join(', ')})`
    : 'conic-gradient(#d1d5db 0% 100%)';
}

function PieChartInline({ distribution, voterCount }: { distribution: Distribution; voterCount: number }) {
  const gradient = buildGradient(distribution);
  const segments = CHART_SEGMENTS.map(s => ({ ...s, pct: distribution[s.key] }));

  return (
    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-200">
      <div className="flex items-center gap-6">
        {/* Pie chart */}
        <div className="flex-shrink-0">
          <div
            className="w-20 h-20 rounded-full"
            style={{ background: gradient }}
          />
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-1">
          {segments.map(seg => (
            seg.pct > 0 && (
              <div key={seg.label} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: seg.color }} />
                  <span className="text-gray-700">{seg.label}</span>
                </div>
                <span className="font-bold text-gray-900">{seg.pct.toFixed(1)}%</span>
              </div>
            )
          ))}
          <div className="text-xs text-gray-500 pt-1">
            {voterCount} voĉdonantoj
          </div>
        </div>
      </div>
    </div>
  );
}
