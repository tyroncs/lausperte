'use client';

import { useEffect, useState } from 'react';
import RankingsList from './RankingsList';

interface EditionRanking {
  editionId: string;
  editionName: string;
  location: string;
  eventCode: string;
  year: number;
  weightedScore: number;
  wilsonLowerBound: number;
  wilsonUpperBound: number;
  totalWeight: number;
  voterCount: number;
  distribution: {
    elstara: number;
    suficeBone: number;
    averaga: number;
    malbona: number;
  };
}

interface HomeData {
  rankings: EditionRanking[];
  contributorCount: number;
  eventCodes: Array<{ code: string; name: string }>;
  logoMap: Record<string, string>;
}

interface HomeClientProps {
  initialData: HomeData;
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const [data, setData] = useState<HomeData>(initialData);

  useEffect(() => {
    let isCancelled = false;

    const fetchHomeData = async () => {
      try {
        const response = await fetch('/api/home', { cache: 'no-store' });
        if (!response.ok) return;
        const nextData = await response.json() as HomeData;
        if (!isCancelled) {
          setData(nextData);
        }
      } catch {
        // Keep current data if refresh fails
      }
    };

    fetchHomeData();
    const interval = setInterval(fetchHomeData, 60000);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F9F3EB]">
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-12">
        <header className="text-center mb-8">
          <div className="relative mx-auto w-56 h-56 -mb-3 group">
            <img src="/lausperte-logo.png" alt="laŭsperte" className="w-56 h-56 object-cover object-top group-hover:opacity-0" />
            <img src="/lausperte-logo-hover.png" alt="laŭsperte" className="absolute inset-0 w-56 h-56 object-contain opacity-0 group-hover:opacity-100" />
          </div>
          <h1 className="w-56 mx-auto text-4xl font-bold text-emerald-900 tracking-tight text-center">laŭsperte</h1>
        </header>

        {data.rankings.length > 0 ? (
          <RankingsList
            rankings={data.rankings}
            eventCodes={data.eventCodes}
            contributorCount={data.contributorCount}
            logoMap={data.logoMap}
          />
        ) : (
          <div className="bg-white rounded-xl shadow-xl p-12 text-center">
            <p className="text-gray-500 text-lg">Ankoraŭ neniu kontribuis. Estu la unua!</p>
          </div>
        )}
      </div>
    </div>
  );
}
