'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { buildApiUrl } from '@/lib/api-url';

interface Edition {
  id: string;
  eventName: string;
  label: string;
  location: string;
  year: number;
  logo: string;
}

interface Event {
  code: string;
  name: string;
  editions: Edition[];
}

type RankingCategory = 'elstara' | 'sufice-bone' | 'averaga' | 'malbona';

interface CategoryOrder {
  top: string[];    // pinned at top (best first)
  bottom: string[]; // pinned at bottom (worst last)
}

const CATEGORIES: Array<{ id: RankingCategory; label: string; score: number; color: string; bgLight: string }> = [
  { id: 'elstara', label: 'Elstara', score: 4, color: 'bg-emerald-800', bgLight: 'bg-emerald-50' },
  { id: 'sufice-bone', label: 'Tre bona', score: 3, color: 'bg-emerald-600', bgLight: 'bg-emerald-50' },
  { id: 'averaga', label: 'Enorde', score: 2, color: 'bg-yellow-500', bgLight: 'bg-yellow-50' },
  { id: 'malbona', label: 'Malbona', score: 1, color: 'bg-red-500', bgLight: 'bg-red-50' },
];

const UpArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const DownArrow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

function DonuPageInner({ events }: { events: Event[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'intro' | 'select' | 'rank' | 'top3'>('intro');

  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedEditions, setSelectedEditions] = useState<Set<string>>(new Set());
  const [rankings, setRankings] = useState<Map<string, RankingCategory>>(new Map());
  const [name, setName] = useState('');

  // Edit mode
  const [editToken, setEditToken] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Optional fields

  // DnD state for cross-category drag
  const [draggedEditionId, setDraggedEditionId] = useState<string | null>(null);
  const [dragOverCategory, setDragOverCategory] = useState<RankingCategory | null>(null);

  // Intra-category ordering: top = pinned best, bottom = pinned worst, rest = equal middle
  const [categoryOrders, setCategoryOrders] = useState<Map<RankingCategory, CategoryOrder>>(new Map());

  // Intra-category drag-and-drop
  const [intraDragItem, setIntraDragItem] = useState<{ id: string; category: RankingCategory } | null>(null);
  const [intraDragOverIndex, setIntraDragOverIndex] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intro step state
  const [attendedEventCodes, setAttendedEventCodes] = useState<Set<string>>(new Set());

  // Top-3 disambiguation state
  const [top3Candidates, setTop3Candidates] = useState<string[]>([]);
  const [top3Slots, setTop3Slots] = useState<(string | null)[]>([]);
  const [submitResult, setSubmitResult] = useState<{ editToken?: string; edited?: boolean } | null>(null);

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step]);

  // Load existing submission when edit token is present in URL
  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) return;
    setEditToken(token);
    setLoadingEdit(true);
    fetch(buildApiUrl(`/api/submission?token=${encodeURIComponent(token)}`))
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setIsEditMode(true);
        setName(data.name || '');
        const editions = new Set<string>(data.attendedEditions || []);
        setSelectedEditions(editions);
        // Expand events that have selected editions
        const eventsToExpand = new Set<string>();
        events.forEach(ev => {
          if (ev.editions.some(ed => editions.has(ed.id))) {
            eventsToExpand.add(ev.code);
          }
        });
        setExpandedEvents(eventsToExpand);
        // Set rankings from category scores
        if (data.rankings) {
          const scoreToCategory: Record<number, RankingCategory> = {
            4: 'elstara', 3: 'sufice-bone', 2: 'averaga', 1: 'malbona'
          };
          const newRankings = new Map<string, RankingCategory>();
          for (const [edId, score] of Object.entries(data.rankings)) {
            const cat = scoreToCategory[score as number];
            if (cat) newRankings.set(edId, cat);
          }
          setRankings(newRankings);
        }
        setStep('rank');
      })
      .catch(() => {
        setError('Nevalida redakta ligilo');
      })
      .finally(() => setLoadingEdit(false));
  }, [searchParams]);

  const getCatOrder = (cat: RankingCategory): CategoryOrder =>
    categoryOrders.get(cat) || { top: [], bottom: [] };

  const setCatOrder = (orders: Map<RankingCategory, CategoryOrder>, cat: RankingCategory, order: CategoryOrder) => {
    if (order.top.length === 0 && order.bottom.length === 0) {
      orders.delete(cat);
    } else {
      orders.set(cat, order);
    }
  };

  // Remove an edition from a category's top/bottom lists
  const removeFromCatOrder = (orders: Map<RankingCategory, CategoryOrder>, editionId: string, cat?: RankingCategory) => {
    const cats = cat ? [cat] : (Array.from(orders.keys()) as RankingCategory[]);
    cats.forEach(c => {
      const order = orders.get(c);
      if (!order) return;
      const newOrder = {
        top: order.top.filter(id => id !== editionId),
        bottom: order.bottom.filter(id => id !== editionId),
      };
      setCatOrder(orders, c, newOrder);
    });
  };

  const toggleEvent = (eventCode: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventCode)) {
      newExpanded.delete(eventCode);
    } else {
      newExpanded.add(eventCode);
    }
    setExpandedEvents(newExpanded);
  };

  const toggleEdition = (editionId: string) => {
    const newSelected = new Set(selectedEditions);
    if (newSelected.has(editionId)) {
      newSelected.delete(editionId);
      const newRankings = new Map(rankings);
      newRankings.delete(editionId);
      setRankings(newRankings);
      const newOrders = new Map(categoryOrders);
      removeFromCatOrder(newOrders, editionId);
      setCategoryOrders(newOrders);
    } else {
      newSelected.add(editionId);
    }
    setSelectedEditions(newSelected);
  };

  const toggleAttendedEvent = (code: string) => {
    setAttendedEventCodes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const proceedFromIntro = () => {
    if (attendedEventCodes.size === 0) return;
    setStep('select');
  };

  const proceedToRanking = () => {
    if (selectedEditions.size === 0) {
      setError('Bonvolu elekti almenaŭ unu eventon');
      return;
    }
    setError(null);
    setStep('rank');
  };

  // Assign edition to category — starts UNPINNED
  const assignRanking = (editionId: string, category: RankingCategory) => {
    const newRankings = new Map(rankings);
    const oldCategory = newRankings.get(editionId);
    newRankings.set(editionId, category);
    setRankings(newRankings);

    const newOrders = new Map(categoryOrders);
    if (oldCategory) {
      removeFromCatOrder(newOrders, editionId, oldCategory);
    }
    setCategoryOrders(newOrders);
  };

  // Pin at bottom of top list (promote)
  const pinTop = (category: RankingCategory, editionId: string) => {
    const newOrders = new Map(categoryOrders);
    removeFromCatOrder(newOrders, editionId, category);
    const order = newOrders.get(category) || { top: [], bottom: [] };
    const newOrder = { top: [...order.top, editionId], bottom: [...order.bottom] };
    setCatOrder(newOrders, category, newOrder);
    setCategoryOrders(newOrders);
  };

  // Pin at top of bottom list (demote)
  const pinBottom = (category: RankingCategory, editionId: string) => {
    const newOrders = new Map(categoryOrders);
    removeFromCatOrder(newOrders, editionId, category);
    const order = newOrders.get(category) || { top: [], bottom: [] };
    const newOrder = { top: [...order.top], bottom: [editionId, ...order.bottom] };
    setCatOrder(newOrders, category, newOrder);
    setCategoryOrders(newOrders);
  };

  const moveInList = (category: RankingCategory, list: 'top' | 'bottom', fromIndex: number, toIndex: number) => {
    const newOrders = new Map(categoryOrders);
    const order = newOrders.get(category);
    if (!order) return;
    const arr = [...order[list]];
    const [item] = arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, item);
    setCatOrder(newOrders, category, { ...order, [list]: arr });
    setCategoryOrders(newOrders);
  };

  // Build flat ordered list for a category: top → unpinned → bottom
  const getFlatOrder = (category: RankingCategory, editions: Edition[]): string[] => {
    const { top, bottom } = getCatOrder(category);
    const pinnedIds = new Set([...top, ...bottom]);
    const unpinned = editions.filter(ed => !pinnedIds.has(ed.id)).map(ed => ed.id);
    return [...top, ...unpinned, ...bottom];
  };

  // Reorder within a category: pin dragged item at top or bottom zone
  const reorderInCategory = (category: RankingCategory, draggedId: string, targetIndex: number) => {
    const editions = getEditionsInCategory(category);
    const N = editions.length;
    const newOrders = new Map(categoryOrders);
    removeFromCatOrder(newOrders, draggedId, category);
    const order = newOrders.get(category) || { top: [], bottom: [] };
    const topLen = order.top.length;
    const bottomLen = order.bottom.length;

    if (targetIndex <= topLen) {
      // Top zone: insert into top list
      const newTop = [...order.top];
      newTop.splice(Math.min(targetIndex, newTop.length), 0, draggedId);
      setCatOrder(newOrders, category, { top: newTop, bottom: [...order.bottom] });
    } else if (targetIndex >= N - 1 - bottomLen) {
      // Bottom zone: insert into bottom list
      const newBottom = [...order.bottom];
      const bottomPos = targetIndex - (N - 1 - bottomLen);
      newBottom.splice(Math.min(bottomPos, newBottom.length), 0, draggedId);
      setCatOrder(newOrders, category, { top: [...order.top], bottom: newBottom });
    } else {
      // Middle (unpinned) zone: leave unpinned
      setCatOrder(newOrders, category, { top: [...order.top], bottom: [...order.bottom] });
    }
    setCategoryOrders(newOrders);
  };

  const getEditionsInCategory = useCallback((category: RankingCategory): Edition[] => {
    const editionIds = Array.from(rankings.entries())
      .filter(([_, cat]) => cat === category)
      .map(([id]) => id);
    return editionIds
      .map(id => events.flatMap(e => e.editions).find(ed => ed.id === id))
      .filter((ed): ed is Edition => ed !== undefined);
  }, [rankings]);

  const getUnrankedEditions = (): Edition[] => {
    const rankedIds = new Set(rankings.keys());
    return Array.from(selectedEditions)
      .filter(id => !rankedIds.has(id))
      .map(id => events.flatMap(e => e.editions).find(ed => ed.id === id))
      .filter((ed): ed is Edition => ed !== undefined);
  };

  const allRanked = rankings.size === selectedEditions.size && selectedEditions.size > 0;

  const removeRanking = (editionId: string) => {
    const newRankings = new Map(rankings);
    const oldCategory = newRankings.get(editionId);
    newRankings.delete(editionId);
    setRankings(newRankings);
    if (oldCategory) {
      const newOrders = new Map(categoryOrders);
      removeFromCatOrder(newOrders, editionId, oldCategory);
      setCategoryOrders(newOrders);
    }
  };

  // Compute fractional intraRankings with top/bottom pinning
  const computeIntraRankings = (): { [editionId: string]: number } => {
    const result: { [editionId: string]: number } = {};

    CATEGORIES.forEach(cat => {
      const editions = getEditionsInCategory(cat.id);
      if (editions.length < 2) return;
      const { top, bottom } = getCatOrder(cat.id);
      if (top.length === 0 && bottom.length === 0) return;

      const N = editions.length;
      const S = cat.score;

      top.forEach((editionId, i) => {
        result[editionId] = (S - 1) + (2 * (N - i) - 1) / (2 * N);
      });

      bottom.forEach((editionId, j) => {
        const pos = N - bottom.length + j;
        result[editionId] = (S - 1) + (2 * (N - pos) - 1) / (2 * N);
      });

      const pinnedIds = new Set([...top, ...bottom]);
      const unpinnedIds = editions.filter(ed => !pinnedIds.has(ed.id)).map(ed => ed.id);
      if (unpinnedIds.length > 0) {
        let sum = 0;
        for (let i = top.length; i < N - bottom.length; i++) {
          sum += (S - 1) + (2 * (N - i) - 1) / (2 * N);
        }
        const avgScore = sum / unpinnedIds.length;
        unpinnedIds.forEach(id => { result[id] = avgScore; });
      }
    });

    return result;
  };

  // Compute all ranked pairs (full list with ranks, best→worst)
  const computeAllPairs = (): Array<{ rank: number; id: string }> => {
    const pairs: { rank: number; id: string }[] = [];
    let rank = 1;
    for (const cat of CATEGORIES) {
      const editions = getEditionsInCategory(cat.id);
      if (editions.length === 0) continue;
      const { top, bottom } = getCatOrder(cat.id);
      const pinnedIds = new Set([...top, ...bottom]);
      const unpinned = editions.filter(ed => !pinnedIds.has(ed.id));

      for (const id of top) {
        pairs.push({ rank, id });
        rank++;
      }
      if (unpinned.length > 0) {
        for (const ed of unpinned) {
          pairs.push({ rank, id: ed.id });
        }
        rank += unpinned.length;
      }
      for (const id of bottom) {
        pairs.push({ rank, id });
        rank++;
      }
    }
    return pairs;
  };

  // Determine if we need user to disambiguate their top 3
  // Show the top3 page unless the first 3 positions each have a unique distinct rank
  const getDisambiguation = (pairs: Array<{ rank: number; id: string }>): { needed: boolean; candidates: string[] } => {
    if (pairs.length < 3) return { needed: false, candidates: [] };

    // Check if positions 1, 2, 3 each have a unique rank (no ties)
    const hasExplicitTop3 = pairs[0].rank !== pairs[1].rank
      && pairs[1].rank !== pairs[2].rank;

    if (hasExplicitTop3) {
      return { needed: false, candidates: [] };
    }

    // Collect all candidates that could be in the top 3
    const collected: string[] = [];
    let i = 0;
    while (i < pairs.length && collected.length < 3) {
      const currentRank = pairs[i].rank;
      while (i < pairs.length && pairs[i].rank === currentRank) {
        collected.push(pairs[i].id);
        i++;
      }
    }

    return { needed: true, candidates: collected };
  };

  const handleSubmit = async () => {
    if (rankings.size !== selectedEditions.size) {
      setError('Bonvolu rangigi ĉiujn elektitajn eventojn');
      return;
    }
    if (!name.trim()) {
      setError('Bonvolu skribi vian nomon');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const rankingData: Record<string, number> = {};
      rankings.forEach((category, editionId) => {
        const categoryData = CATEGORIES.find(c => c.id === category);
        if (categoryData) rankingData[editionId] = categoryData.score;
      });
      const intraRankings = computeIntraRankings();
      const response = await fetch(buildApiUrl('/api/submit'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          attendedEditions: Array.from(selectedEditions),
          rankings: rankingData,
          ...(Object.keys(intraRankings).length > 0 ? { intraRankings } : {}),
          ...(editToken ? { editToken } : {}),
        }),
      });
      if (!response.ok) throw new Error('Submission failed');

      const result = await response.json();

      const pairs = computeAllPairs();
      const disambiguation = getDisambiguation(pairs);

      // Build result page params, include editToken for new submissions
      const buildResultParams = () => {
        const params = new URLSearchParams({ n: String(selectedEditions.size) });
        const allEds = events.flatMap(e => e.editions);
        const years = Array.from(selectedEditions)
          .map(id => allEds.find(e => e.id === id)?.year)
          .filter((y): y is number => y !== undefined);
        if (years.length > 0) params.set('since', String(Math.min(...years)));
        if (result.editToken) params.set('editToken', result.editToken);
        if (result.edited) params.set('edited', '1');
        return params;
      };

      if (disambiguation.needed) {
        setTop3Candidates(disambiguation.candidates);
        setTop3Slots([null, null, null]);
        setIsSubmitting(false);
        setStep('top3');
        // Store result for use in top3 continuation
        setSubmitResult(result);
      } else {
        const top3 = pairs.slice(0, 3).map(p => `${p.rank}:${p.id}`);
        const params = buildResultParams();
        if (top3.length > 0) params.set('top', top3.join(','));
        setIsSubmitting(false);
        router.push(`/rezultoj?${params.toString()}`);
      }
    } catch {
      setError('Eraro okazis. Bonvolu reprovi.');
      setIsSubmitting(false);
    }
  };


  const PODIUM = [
    { bg: 'bg-yellow-50', border: 'border-yellow-300', badge: 'bg-yellow-500', label: '1-a' },
    { bg: 'bg-gray-100', border: 'border-gray-300', badge: 'bg-gray-400', label: '2-a' },
    { bg: 'bg-amber-50', border: 'border-amber-300', badge: 'bg-amber-700', label: '3-a' },
  ];

  const assignSlot = (slotIndex: number, id: string) => {
    const newSlots = [...top3Slots];
    newSlots[slotIndex] = id;
    setTop3Slots(newSlots);
  };

  const clearSlot = (slotIndex: number) => {
    const newSlots = [...top3Slots];
    newSlots[slotIndex] = null;
    setTop3Slots(newSlots);
  };

  const isTop3Valid = (): boolean => {
    return top3Slots.length > 0 && top3Slots.every(s => s !== null);
  };

  const handleTop3Continue = () => {
    const top3Result = top3Slots
      .map((id, i) => id ? `${i + 1}:${id}` : null)
      .filter(Boolean) as string[];
    const params = new URLSearchParams({ n: String(selectedEditions.size) });
    const allEds = events.flatMap(e => e.editions);
    const years = Array.from(selectedEditions)
      .map(id => allEds.find(e => e.id === id)?.year)
      .filter((y): y is number => y !== undefined);
    if (years.length > 0) params.set('since', String(Math.min(...years)));
    if (top3Result.length > 0) params.set('top', top3Result.join(','));
    // Carry over editToken from submission result
    if (submitResult?.editToken) params.set('editToken', submitResult.editToken);
    if (submitResult?.edited) params.set('edited', '1');
    router.push(`/rezultoj?${params.toString()}`);
  };



  // Editions filtered by intro selections (used in the select step)
  const visibleEvents = events
    .filter(ev => attendedEventCodes.size === 0 || attendedEventCodes.has(ev.code));

  const findEdition = (id: string) => events.flatMap(e => e.editions).find(ed => ed.id === id);

  if (loadingEdit) {
    return (
      <div className="min-h-screen bg-[#F9F3EB] flex items-center justify-center">
        <div className="text-emerald-700 text-lg">Ŝargante vian respondon...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F3EB]">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-emerald-900 mb-2">
            {step === 'intro' && 'Kiujn eventojn?'}
            {step === 'select' && (isEditMode ? 'Redaktu vian opinion' : 'Kiujn eventojn?')}
            {step === 'rank' && 'Rangigu!'}
            {step === 'top3' && 'Rangigu!'}
          </h1>
          <p className="text-emerald-700">
            {step === 'intro' && <>Elektu ĉiujn eventojn kiujn vi <em>iam ajn</em> ĉeestis</>}
            {step === 'select' && 'Elektu la specifajn eventojn kiujn vi ĉeestis'}
            {step === 'rank' && 'Bonvolu meti la eventojn en unu de la kategoriojn'}
            {step === 'top3' && 'Kiuj estis viaj 3 plej bonaj eventoj?'}
          </p>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 rounded border bg-red-100 border-red-400 text-red-700">
            {error}
          </div>
        )}

        {/* Step 0: Intro */}
        {step === 'intro' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4" />
              {/* Event types section */}
              <div className="px-8 py-8 text-center">
                <div className="flex flex-wrap justify-center gap-3">
                  {events.map(event => (
                    <button
                      key={event.code}
                      onClick={() => toggleAttendedEvent(event.code)}
                      className={`px-6 py-2.5 rounded-full font-semibold text-base border-2 transition-all ${
                        attendedEventCodes.has(event.code)
                          ? 'bg-emerald-800 text-white border-emerald-800'
                          : 'bg-white text-emerald-800 border-emerald-200 hover:border-emerald-500 hover:bg-emerald-50'
                      }`}
                    >
                      {event.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={proceedFromIntro}
              disabled={attendedEventCodes.size === 0}
              className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold px-6 py-4 rounded-xl transition-colors text-lg"
            >
              Daŭrigi
            </button>
          </div>
        )}

        {/* Step 1: Event Selection */}
        {step === 'select' && (
          <div>
            <div className="bg-white rounded-xl shadow-xl overflow-hidden">
              <div className="bg-emerald-600 px-6 py-4" />
              <div className="divide-y divide-gray-200">
                {visibleEvents.map(event => {
                  return (
                    <div key={event.code}>
                      <button
                        onClick={() => toggleEvent(event.code)}
                        className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
                      >
                        <span className="font-semibold text-gray-900">{event.name}</span>
                        <span className="text-gray-400 text-xl">{expandedEvents.has(event.code) ? '−' : '+'}</span>
                      </button>
                      {expandedEvents.has(event.code) && (
                        <div className="px-6 pb-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {event.editions.map(edition => (
                            <label
                              key={edition.id}
                              className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                                selectedEditions.has(edition.id)
                                  ? 'bg-emerald-50 border-emerald-300'
                                  : 'bg-white border-gray-200 hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedEditions.has(edition.id)}
                                onChange={() => toggleEdition(edition.id)}
                                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-gray-900 text-sm">{edition.label}</div>
                                <div className="text-xs text-gray-500 truncate">{edition.location}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button onClick={() => isEditMode ? router.push('/') : setStep('intro')} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors">
                {isEditMode ? 'Nuligi' : 'Reen'}
              </button>
              <button onClick={proceedToRanking} className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                Daŭrigi al rangigo
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Ranking */}
        {step === 'rank' && (
          <div className="space-y-6">
            {/* Intra-ordering hint */}
            {allRanked && CATEGORIES.some(cat => getEditionsInCategory(cat.id).length >= 2) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-800">
                Pluraj eventoj en la sama kategorio? Uzu la sagojn (aŭ treni) por ordigi ilin. Alikaze ili estos traktataj kiel egalaj.
              </div>
            )}

            {/* Unranked editions */}
            {getUnrankedEditions().length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="font-semibold text-lg mb-4 text-gray-700">Nerangigitaj eventoj</h3>
                <div className="space-y-3">
                  {getUnrankedEditions().map(edition => (
                    <div key={edition.id} className="p-3 bg-gray-50 rounded border border-gray-200"
                      draggable onDragStart={() => setDraggedEditionId(edition.id)} onDragEnd={() => setDraggedEditionId(null)}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <div className="font-medium">{edition.eventName} {edition.label}</div>
                          <div className="text-sm text-gray-600">{edition.location}</div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {CATEGORIES.map(category => (
                          <button key={category.id} onClick={() => assignRanking(edition.id, category.id)}
                            className={`${category.color} text-white px-3 py-1 rounded text-sm font-medium hover:opacity-90 transition-opacity`}>
                            {category.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category buckets */}
            {CATEGORIES.map(category => {
              const editions = getEditionsInCategory(category.id);
              const isOver = dragOverCategory === category.id;
              const { top, bottom } = getCatOrder(category.id);
              const pinnedIds = new Set([...top, ...bottom]);
              const flatOrder = getFlatOrder(category.id, editions);
              const N = editions.length;
              const equalRank = top.length + 1;

              return (
                <div key={category.id}
                  className={`bg-white rounded-lg shadow-md overflow-hidden transition-all ${isOver ? 'ring-2 ring-offset-2 ring-emerald-400' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (draggedEditionId || (intraDragItem && intraDragItem.category !== category.id)) setDragOverCategory(category.id);
                  }}
                  onDragLeave={() => { if (draggedEditionId || (intraDragItem && intraDragItem.category !== category.id)) setDragOverCategory(null); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (draggedEditionId) {
                      setDragOverCategory(null);
                      assignRanking(draggedEditionId, category.id);
                      setDraggedEditionId(null);
                    } else if (intraDragItem && intraDragItem.category === category.id) {
                      reorderInCategory(category.id, intraDragItem.id, N - 1);
                      setIntraDragItem(null);
                      setIntraDragOverIndex(null);
                    } else if (intraDragItem && intraDragItem.category !== category.id) {
                      setDragOverCategory(null);
                      assignRanking(intraDragItem.id, category.id);
                      setIntraDragItem(null);
                      setIntraDragOverIndex(null);
                    }
                  }}>
                  <div className={`${category.color} text-white px-6 py-4`}>
                    <h3 className="text-xl font-bold">{category.label}</h3>
                  </div>
                  <div className="p-4 min-h-[60px]">
                    {editions.length > 0 ? (
                      <div className="space-y-2">
                        {editions.length >= 2 ? (
                          flatOrder.map((editionId, flatIndex) => {
                            const edition = findEdition(editionId);
                            if (!edition) return null;
                            const isPinned = pinnedIds.has(editionId);
                            const isInTop = top.includes(editionId);
                            const isInBottom = bottom.includes(editionId);
                            const isDragOver = intraDragItem?.category === category.id && intraDragOverIndex === flatIndex;

                            let rankDisplay: React.ReactNode;
                            if (isInTop) {
                              const topIdx = top.indexOf(editionId);
                              rankDisplay = <span className="text-emerald-700 font-mono text-sm w-6 text-center font-bold">{topIdx + 1}</span>;
                            } else if (isInBottom) {
                              const bottomIdx = bottom.indexOf(editionId);
                              const bottomStartRank = N - bottom.length + 1;
                              rankDisplay = <span className="text-red-600 font-mono text-sm w-6 text-center font-bold">{bottomStartRank + bottomIdx}</span>;
                            } else {
                              rankDisplay = <span className="text-gray-400 font-mono text-sm w-6 text-center">={equalRank}</span>;
                            }

                            const canMoveUp = flatIndex > 0;
                            const canMoveDown = flatIndex < N - 1;
                            const handleMoveUp = () => {
                              if (!canMoveUp) return;
                              if (isInTop) {
                                const topIdx = top.indexOf(editionId);
                                if (topIdx > 0) moveInList(category.id, 'top', topIdx, topIdx - 1);
                              } else {
                                pinTop(category.id, editionId);
                              }
                            };
                            const handleMoveDown = () => {
                              if (!canMoveDown) return;
                              if (isInBottom) {
                                const bottomIdx = bottom.indexOf(editionId);
                                if (bottomIdx < bottom.length - 1) moveInList(category.id, 'bottom', bottomIdx, bottomIdx + 1);
                              } else {
                                pinBottom(category.id, editionId);
                              }
                            };

                            return (
                              <div key={editionId}
                                className={`p-3 rounded border flex justify-between items-center cursor-grab ${
                                  isDragOver ? 'border-emerald-400 bg-emerald-50' :
                                  isPinned ? 'border-gray-200 bg-gray-50' : 'border-gray-100 bg-gray-50/50'
                                }`}
                                draggable
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  setIntraDragItem({ id: editionId, category: category.id });
                                }}
                                onDragEnd={() => { setIntraDragItem(null); setIntraDragOverIndex(null); }}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  if (intraDragItem && intraDragItem.category === category.id) {
                                    e.stopPropagation();
                                    if (intraDragItem.id !== editionId) setIntraDragOverIndex(flatIndex);
                                  }
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  if (intraDragItem && intraDragItem.category === category.id) {
                                    e.stopPropagation();
                                    reorderInCategory(category.id, intraDragItem.id, flatIndex);
                                    setIntraDragItem(null);
                                    setIntraDragOverIndex(null);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  {rankDisplay}
                                  <div>
                                    <div className="font-medium">{edition.eventName} {edition.label}</div>
                                    <div className="text-sm text-gray-600">{edition.location}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={handleMoveUp}
                                    disabled={!canMoveUp} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Movi supren">
                                    <UpArrow />
                                  </button>
                                  <button onClick={handleMoveDown}
                                    disabled={!canMoveDown} className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed" title="Movi malsupren">
                                    <DownArrow />
                                  </button>
                                  <button onClick={() => removeRanking(editionId)} className="text-red-600 hover:text-red-800 font-medium text-sm ml-2">Forigi</button>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          editions.map(edition => (
                            <div key={edition.id} className="p-3 bg-gray-50 rounded border border-gray-200 flex justify-between items-center cursor-grab"
                              draggable onDragStart={() => setDraggedEditionId(edition.id)} onDragEnd={() => setDraggedEditionId(null)}>
                              <div>
                                <div className="font-medium">{edition.eventName} {edition.label}</div>
                                <div className="text-sm text-gray-600">{edition.location}</div>
                              </div>
                              <button onClick={() => removeRanking(edition.id)} className="text-red-600 hover:text-red-800 font-medium text-sm">Forigi</button>
                            </div>
                          ))
                        )}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic text-center py-4">
                        {draggedEditionId ? 'Faligi ĉi tien' : 'Trenu eventojn ĉi tien aŭ klaku butonon'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Name and optional fields */}
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              {isEditMode && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                  Vi redaktas vian antaŭan respondon. Via rangigo estos ĝisdatigita.
                </div>
              )}

              <div>
                <label htmlFor="name" className="block font-semibold text-gray-700 mb-2">Via nomo aŭ kaŝnomo</label>
                <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} placeholder="Ekz. Zamenhof"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
              </div>

              {!isEditMode && (
                <p className="text-xs text-gray-400">
                  Se vi jam antaŭe plenigis la formularon kaj volas redakti ĝin, kontaktu la administranton por ricevi redaktan ligilon.
                </p>
              )}
            </div>

            <div className="flex gap-4 pt-6">
              <button onClick={() => setStep('select')} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-6 py-3 rounded-lg transition-colors">Reen</button>
              <button onClick={handleSubmit} disabled={isSubmitting || !allRanked || !name.trim()}
                className="flex-1 bg-emerald-800 hover:bg-emerald-900 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
                {isSubmitting ? 'Sendante...' : 'Sendi'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Top 3 Disambiguation */}
        {step === 'top3' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="space-y-4">
                {top3Slots.map((assigned, slotIndex) => {
                  const rankNumber = slotIndex + 1;
                  const podium = PODIUM[rankNumber - 1];
                  const available = top3Candidates.filter(id =>
                    id === assigned || !top3Slots.includes(id)
                  );
                  const assignedEdition = assigned ? findEdition(assigned) : null;

                  return (
                    <div key={slotIndex} className={`rounded-lg border-2 ${podium.border} ${podium.bg} p-4`}>
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`w-10 h-10 rounded-full ${podium.badge} text-white flex items-center justify-center font-bold text-lg`}>
                          {rankNumber}
                        </span>
                        <span className="font-semibold text-gray-700">{podium.label} loko</span>
                      </div>

                      {assignedEdition ? (
                        <div
                          onClick={() => clearSlot(slotIndex)}
                          className="p-3 rounded-lg border-2 border-emerald-400 bg-white flex items-center justify-between cursor-pointer hover:bg-red-50 transition-colors"
                        >
                          <div>
                            <div className="font-medium text-gray-900">{assignedEdition.eventName} {assignedEdition.label}</div>
                            <div className="text-sm text-gray-500">{assignedEdition.location}</div>
                          </div>
                          <span className="text-gray-400 hover:text-red-500 text-lg">&times;</span>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {available.map(id => {
                            const edition = findEdition(id);
                            if (!edition) return null;
                            return (
                              <button
                                key={id}
                                onClick={() => assignSlot(slotIndex, id)}
                                className="px-3 py-2 rounded-lg border border-gray-300 bg-white hover:bg-emerald-50 hover:border-emerald-400 transition-colors text-sm font-medium text-gray-800"
                              >
                                {edition.eventName} {edition.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                onClick={handleTop3Continue}
                disabled={!isTop3Valid()}
                className="w-full bg-emerald-800 hover:bg-emerald-900 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
              >
                Daŭrigi
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default function DonuClient({ events }: { events: Event[] }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F9F3EB] flex items-center justify-center">
        <div className="text-emerald-700 text-lg">Ŝargante...</div>
      </div>
    }>
      <DonuPageInner events={events} />
    </Suspense>
  );
}
