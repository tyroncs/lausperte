import Link from 'next/link';
import { calculateRankings, getSubmissionCount, getApprovedComments, getEvents } from '@/lib/db';
import { getAllEditions } from '@/data/events';
import RankingsList from './RankingsList';

// Revalidate this page every 60 seconds to show updated rankings
export const revalidate = 60;

export default async function HomePage() {
  const [allEditions, rankings, contributorCount, allComments, dbEvents] = await Promise.all([
    getAllEditions(),
    calculateRankings(),
    getSubmissionCount(),
    getApprovedComments(),
    getEvents(),
  ]);

  const eventCodes = dbEvents.map(e => ({ code: e.code, name: e.name }));
  const logoMap: Record<string, string> = {};
  const flagMap: Record<string, string> = {};
  allEditions.forEach(ed => {
    if (ed.logo) logoMap[ed.id] = ed.logo;
    if (ed.flag) flagMap[ed.id] = ed.flag;
  });

  return (
    <div className="min-h-screen bg-[#F9F3EB]">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-12">
        {/* Header */}
        <header className="text-center mb-8">
          <div className="relative mx-auto w-56 h-56 -mb-3 group">
            <img src="/lausperte-logo.png" alt="laŭsperte" className="w-56 h-56 object-cover object-top group-hover:opacity-0" />
            <img src="/lausperte-logo-hover.png" alt="laŭsperte" className="absolute inset-0 w-56 h-56 object-contain opacity-0 group-hover:opacity-100" />
          </div>
          <h1 className="w-56 mx-auto text-4xl font-bold text-emerald-900 tracking-tight text-center">laŭsperte</h1>
        </header>

        {/* Rankings */}
        {rankings.length > 0 ? (
          <RankingsList rankings={rankings} eventCodes={eventCodes} comments={allComments} contributorCount={contributorCount} logoMap={logoMap} flagMap={flagMap} />
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-12 text-center">
            <p className="text-gray-500 text-lg">Ankoraŭ neniu kontribuis. Estu la unua!</p>
          </div>
        )}
      </div>
    </div>
  );
}
