'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { buildApiUrl } from '@/lib/api-url';

type SortKey = 'name' | 'date' | 'editions';
type SortDir = 'asc' | 'desc';

interface RankingData {
  [editionId: string]: 1 | 2 | 3 | 4;
}

interface Submission {
  id: string;
  timestamp: number;
  name: string;
  attendedEditions: string[];
  rankings: RankingData;
  intraRankings?: { [editionId: string]: number };
  status?: 'approved' | 'pending';
  editToken?: string;
  flagDuplicate?: boolean;
  flagDuplicateIp?: boolean;
  comments?: { [editionId: string]: string };
  commentStatus?: 'approved' | 'pending';
}

type WeightingMode = 'logarithmic' | 'linear' | 'equal';

interface Settings {
  requireModeration: boolean;
  requireCommentModeration: boolean;
  priPageContent: string;
  weightingMode: WeightingMode;
}

interface ParsedEntry {
  name: string;
  rankings: Record<string, number>;
  error?: string;
}

interface AdminEvent {
  code: string;
  name: string;
  editionCount: number;
}

interface AdminEdition {
  id: string;
  eventCode: string;
  label: string;
  location: string;
  year: number;
  logo: string;
  flag?: string;
}

const SCORE_LABELS: Record<number, string> = {
  4: 'Elstara',
  3: 'Tre bona',
  2: 'Enorde',
  1: 'Malbona',
};

// validEditions is now fetched dynamically from the database

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState('');
  const [loading, setLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<'approved' | 'pending' | 'add' | 'pri' | 'eventoj'>('approved');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [settings, setSettings] = useState<Settings>({ requireModeration: false, requireCommentModeration: false, priPageContent: '', weightingMode: 'logarithmic' });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Pri page editor state
  const [priDraft, setPriDraft] = useState('');
  const [priSaved, setPriSaved] = useState(false);

  // Add responses state
  const [batchText, setBatchText] = useState('');
  const [parsedEntries, setParsedEntries] = useState<ParsedEntry[]>([]);
  const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null);

  // Valid editions (fetched from DB)
  const [validEditions, setValidEditions] = useState<string[]>([]);

  // Events/Editions management state
  const [adminEvents, setAdminEvents] = useState<AdminEvent[]>([]);
  const [adminEditions, setAdminEditions] = useState<AdminEdition[]>([]);
  const [selectedEventCode, setSelectedEventCode] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<{ code: string; name: string } | null>(null);
  const [editingEvent, setEditingEvent] = useState<string | null>(null);
  const [editionForm, setEditionForm] = useState<{
    id: string; eventCode: string; label: string; location: string; year: string; logo: string; flag: string;
  } | null>(null);
  const [editingEdition, setEditingEdition] = useState<string | null>(null);
  const [logoMode, setLogoMode] = useState<'upload' | 'reuse'>('upload');
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiUrl = useCallback((path: string, params: Record<string, string> = {}) => {
    const searchParams = new URLSearchParams(params);
    const query = searchParams.toString();
    return buildApiUrl(query ? `${path}?${query}` : path);
  }, []);

  const apiFetch = useCallback(async (
    path: string,
    init?: RequestInit,
    params: Record<string, string> = {},
  ) => {
    const response = await fetch(apiUrl(path, params), {
      ...init,
      credentials: 'include',
    });

    if (response.status === 401) {
      setAuthenticated(false);
      setAuthError('Seanco eksvalidiĝis. Ensalutu denove.');
    }

    return response;
  }, [apiUrl]);

  useEffect(() => {
    let cancelled = false;

    const checkSession = async () => {
      try {
        const response = await fetch(buildApiUrl('/api/admin/auth'), { credentials: 'include' });
        if (!cancelled && response.ok) {
          setAuthenticated(true);
        }
      } catch {
        // ignore session check errors
      } finally {
        if (!cancelled) {
          setAuthChecking(false);
        }
      }
    };

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, evRes, edRes] = await Promise.all([
        apiFetch('/api/admin/submissions', undefined, { status: 'all' }),
        apiFetch('/api/admin/events'),
        apiFetch('/api/admin/editions'),
      ]);
      if (subRes.status === 401) return;
      if (!subRes.ok) throw new Error('Failed to fetch');
      const subData = await subRes.json();
      setSubmissions(subData.submissions);
      setSettings(subData.settings);
      setPriDraft(subData.settings.priPageContent || '');

      if (evRes.ok) {
        const evData = await evRes.json();
        setAdminEvents(evData.events);
      }
      if (edRes.ok) {
        const edData = await edRes.json();
        setAdminEditions(edData.editions);
        setValidEditions(edData.editions.map((e: AdminEdition) => e.id));
      }
    } catch {
      // silently fail on refresh
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  const handleLogin = async () => {
    if (!secret.trim()) return;
    setAuthError('');
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl('/api/admin/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ secret }),
      });
      if (res.status === 401) {
        setAuthError('Nevalida sekreto');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed');
      setSecret('');
      setAuthenticated(true);
    } catch {
      setAuthError('Eraro dum konekto');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authenticated) fetchData();
  }, [authenticated, fetchData]);

  const approvedSubs = submissions.filter(s => !s.status || s.status === 'approved');
  const pendingSubs = submissions.filter(s => s.status === 'pending');

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Forigi la respondon de "${name}"?`)) return;
    const res = await apiFetch('/api/admin/submission', { method: 'DELETE' }, { id });
    if (res.ok) {
      setSubmissions(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleApprove = async (id: string) => {
    const res = await apiFetch('/api/admin/submission', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve' }),
    });
    if (res.ok) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status: 'approved' } : s));
    }
  };

  const handleApproveAll = async () => {
    if (!confirm(`Aprobi ${pendingSubs.length} respondojn?`)) return;
    for (const sub of pendingSubs) {
      await handleApprove(sub.id);
    }
  };

  const handleApproveComments = async (id: string) => {
    const res = await apiFetch('/api/admin/submission', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'approve_comments' }),
    });
    if (res.ok) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, commentStatus: 'approved' } : s));
    }
  };

  const handleDeleteComments = async (id: string) => {
    if (!confirm('Forigi la komentojn?')) return;
    const res = await apiFetch('/api/admin/submission', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, action: 'delete_comments' }),
    });
    if (res.ok) {
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, comments: undefined, commentStatus: undefined } : s));
    }
  };

  const handleToggleModeration = async () => {
    const newValue = !settings.requireModeration;
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requireModeration: newValue }),
    });
    if (res.ok) {
      setSettings(prev => ({ ...prev, requireModeration: newValue }));
    }
  };

  const handleToggleCommentModeration = async () => {
    const newValue = !settings.requireCommentModeration;
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requireCommentModeration: newValue }),
    });
    if (res.ok) {
      setSettings(prev => ({ ...prev, requireCommentModeration: newValue }));
    }
  };

  const handleSavePri = async () => {
    setPriSaved(false);
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priPageContent: priDraft }),
    });
    if (res.ok) {
      const data = await res.json();
      setSettings(data.settings);
      setPriSaved(true);
      setTimeout(() => setPriSaved(false), 3000);
    }
  };

  const handleLogout = async () => {
    await fetch(buildApiUrl('/api/admin/auth'), {
      method: 'DELETE',
      credentials: 'include',
    });
    setAuthenticated(false);
    setAuthError('');
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Parse batch text
  const parseBatchText = (text: string): ParsedEntry[] => {
    if (!text.trim()) return [];
    return text.trim().split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed) return null;
      const parts = trimmed.split('|');
      if (parts.length !== 2) return { name: trimmed, rankings: {}, error: 'Formato: nomo | eldono:poento, ...' };

      const name = parts[0].trim();
      const rankingsPart = parts[1].trim();
      const rankings: Record<string, number> = {};
      let error: string | undefined;

      const pairs = rankingsPart.split(',').map(p => p.trim()).filter(Boolean);
      for (const pair of pairs) {
        const [edId, scoreStr] = pair.split(':').map(s => s.trim());
        const score = parseInt(scoreStr, 10);
        if (!edId || isNaN(score) || score < 1 || score > 4) {
          error = `Nevalida paro: "${pair}"`;
          break;
        }
        if (!validEditions.includes(edId)) {
          error = `Nekonata eldono: "${edId}"`;
          break;
        }
        rankings[edId] = score;
      }

      return { name, rankings, error };
    }).filter(Boolean) as ParsedEntry[];
  };

  useEffect(() => {
    setParsedEntries(parseBatchText(batchText));
  }, [batchText, validEditions]);

  const handleAddAll = async () => {
    const validEntries = parsedEntries.filter(e => !e.error && Object.keys(e.rankings).length > 0);
    if (validEntries.length === 0) return;

    setAddResult(null);
    const res = await apiFetch('/api/admin/submission', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        submissions: validEntries.map(e => ({ name: e.name, rankings: e.rankings })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setAddResult({
        success: true,
        message: `Aldonitaj ${data.addedCount} respondoj.${data.errors.length > 0 ? ` Eraroj: ${data.errors.join('; ')}` : ''}`,
      });
      setBatchText('');
      fetchData();
    } else {
      setAddResult({ success: false, message: 'Eraro dum aldono' });
    }
  };

  // Login screen
  if (!authenticated) {
    if (authChecking) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
            <p className="text-center text-gray-600">Kontrolante seancon...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-sm">
          <h1 className="text-2xl font-bold text-emerald-900 mb-6 text-center">Admin</h1>
          <input
            type="password"
            placeholder="Administra sekreto"
            value={secret}
            onChange={e => { setSecret(e.target.value); setAuthError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {authError && <p className="text-red-600 text-sm mb-4">{authError}</p>}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Konektante...' : 'Eniri'}
          </button>
        </div>
      </div>
    );
  }

  // Submission table row
  const SubmissionRow = ({ sub, showApprove }: { sub: Submission; showApprove?: boolean }) => {
    const expanded = expandedRows.has(sub.id);
    const date = new Date(sub.timestamp).toLocaleDateString('eo', { year: 'numeric', month: 'short', day: 'numeric' });
    const editionCount = sub.attendedEditions.length;

    return (
      <>
        <tr
          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
          onClick={() => toggleRow(sub.id)}
        >
          <td className="px-4 py-3 font-medium text-gray-900 max-w-[160px] truncate">{sub.name}</td>
          <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">{date}</td>
          <td className="px-4 py-3 text-gray-600 text-sm text-center">{editionCount}</td>
          <td className="px-4 py-3 text-right whitespace-nowrap">
            {showApprove && (
              <button
                onClick={e => { e.stopPropagation(); handleApprove(sub.id); }}
                className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded mr-2 transition-colors"
              >
                Aprobi
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); handleDelete(sub.id, sub.name); }}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
            >
              Forigi
            </button>
          </td>
        </tr>
        {expanded && (
          <tr className="bg-gray-50">
            <td colSpan={4} className="px-4 py-3">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-medium text-gray-900">{sub.name}</span>
                {sub.flagDuplicate && <span className="text-xs text-orange-600 bg-orange-100 rounded px-2 py-0.5">flago: duplikato</span>}
                {sub.flagDuplicateIp && <span className="text-xs text-red-600 bg-red-100 rounded px-2 py-0.5">flago: sama IP</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm mb-3">
                {Object.entries(sub.rankings).map(([edId, score]) => (
                  <div key={edId} className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      score === 4 ? 'bg-emerald-500' : score === 3 ? 'bg-blue-500' : score === 2 ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-gray-700">{edId}</span>
                    <span className="text-gray-400">({SCORE_LABELS[score]})</span>
                  </div>
                ))}
              </div>
              {sub.comments && Object.keys(sub.comments).length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-500 mb-1">Komentoj {sub.commentStatus === 'pending' ? '(atendantaj)' : ''}:</div>
                  {Object.entries(sub.comments).map(([edId, comment]) => (
                    <div key={edId} className="text-xs text-gray-600 ml-2">
                      <span className="font-medium">{edId}:</span> {comment}
                    </div>
                  ))}
                  {sub.commentStatus === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApproveComments(sub.id); }}
                        className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded transition-colors"
                      >
                        Aprobi komentojn
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteComments(sub.id); }}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded transition-colors"
                      >
                        Forigi komentojn
                      </button>
                    </div>
                  )}
                </div>
              )}
              {sub.editToken && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const link = `${window.location.origin}/donu?token=${sub.editToken}`;
                    navigator.clipboard.writeText(link);
                  }}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded transition-colors"
                >
                  Kopii redaktan ligilon
                </button>
              )}
            </td>
          </tr>
        )}
      </>
    );
  };

  const PAGE_SIZE = 10;

  const SubmissionTable = ({ subs, showApprove, tableId }: { subs: Submission[]; showApprove?: boolean; tableId: string }) => {
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(0);
    const [showAll, setShowAll] = useState(false);

    // Reset page when data changes
    useEffect(() => { setPage(0); }, [subs.length, tableId]);

    const sorted = useMemo(() => {
      const arr = [...subs];
      arr.sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
        else if (sortKey === 'date') cmp = a.timestamp - b.timestamp;
        else if (sortKey === 'editions') cmp = a.attendedEditions.length - b.attendedEditions.length;
        return sortDir === 'asc' ? cmp : -cmp;
      });
      return arr;
    }, [subs, sortKey, sortDir]);

    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const visible = showAll ? sorted : sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    const handleSort = (key: SortKey) => {
      if (sortKey === key) {
        setSortDir(d => d === 'asc' ? 'desc' : 'asc');
      } else {
        setSortKey(key);
        setSortDir(key === 'name' ? 'asc' : 'desc');
      }
      setPage(0);
    };

    const SortIcon = ({ col }: { col: SortKey }) => {
      if (sortKey !== col) return <span className="text-gray-300 ml-1">&#8597;</span>;
      return <span className="ml-1">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>;
    };

    return (
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b-2 border-gray-200 text-left text-sm text-gray-500">
              <th className="px-4 py-2 font-medium cursor-pointer select-none hover:text-gray-700 w-[40%]" onClick={() => handleSort('name')}>
                Nomo<SortIcon col="name" />
              </th>
              <th className="px-4 py-2 font-medium cursor-pointer select-none hover:text-gray-700 w-[22%]" onClick={() => handleSort('date')}>
                Dato<SortIcon col="date" />
              </th>
              <th className="px-4 py-2 font-medium text-center cursor-pointer select-none hover:text-gray-700 w-[15%]" onClick={() => handleSort('editions')}>
                Eldonoj<SortIcon col="editions" />
              </th>
              <th className="px-4 py-2 font-medium text-right w-[23%]">Agoj</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(sub => (
              <SubmissionRow key={sub.id} sub={sub} showApprove={showApprove} />
            ))}
          </tbody>
        </table>
        {subs.length === 0 && (
          <p className="text-center text-gray-400 py-8">Neniuj respondoj</p>
        )}
        {sorted.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
            <div className="text-gray-500">
              {showAll
                ? `${sorted.length} respondoj`
                : `${page * PAGE_SIZE + 1}\u2013${Math.min((page + 1) * PAGE_SIZE, sorted.length)} el ${sorted.length}`
              }
            </div>
            <div className="flex items-center gap-2">
              {!showAll && (
                <>
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &laquo;
                  </button>
                  <span className="text-gray-600">{page + 1} / {totalPages}</span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    &raquo;
                  </button>
                </>
              )}
              <button
                onClick={() => { setShowAll(v => !v); setPage(0); }}
                className="ml-2 text-emerald-600 hover:text-emerald-800 font-medium"
              >
                {showAll ? 'Paĝigi' : 'Montri ĉiujn'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-emerald-900 mb-6">Administrejo</h1>

        {/* Settings bar */}
        <div className="bg-white rounded-xl shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Postuli moderigon por novaj respondoj</span>
              <button
                onClick={handleToggleModeration}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requireModeration ? 'bg-emerald-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.requireModeration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-xs ${settings.requireModeration ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
                {settings.requireModeration ? 'Aktiva' : 'Malaktiva'}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchData}
                disabled={loading}
                className="text-sm text-emerald-600 hover:text-emerald-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Refreŝigante...' : 'Refreŝigi'}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Elsaluti
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Postuli moderigon por komentoj</span>
            <button
              onClick={handleToggleCommentModeration}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.requireCommentModeration ? 'bg-emerald-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireCommentModeration ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-xs ${settings.requireCommentModeration ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
              {settings.requireCommentModeration ? 'Aktiva' : 'Malaktiva'}
            </span>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex gap-2 mb-6">
          <a
            href={apiUrl('/api/admin/export', { format: 'csv' })}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            download
          >
            Eksporti CSV
          </a>
          <a
            href={apiUrl('/api/admin/export', { format: 'json' })}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
            download
          >
            Eksporti JSON
          </a>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-6">
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'approved'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Aprobitaj ({approvedSubs.length})
          </button>
          {(settings.requireModeration || pendingSubs.length > 0) && (
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pending'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Atendantaj ({pendingSubs.length})
              {pendingSubs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orange-500 rounded-full">
                  {pendingSubs.length}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'add'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Aldoni respondojn
          </button>
          <button
            onClick={() => setActiveTab('pri')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pri'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pri-pago
          </button>
          <button
            onClick={() => setActiveTab('eventoj')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'eventoj'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Eventoj
          </button>
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-xl shadow-xl">
          {activeTab === 'approved' && (
            <div className="p-4">
              <SubmissionTable subs={approvedSubs} tableId="approved" />
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="p-4">
              {pendingSubs.length > 0 && (
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={handleApproveAll}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Aprobi {pendingSubs.length} respondojn
                  </button>
                </div>
              )}
              <SubmissionTable subs={pendingSubs} showApprove tableId="pending" />
            </div>
          )}

          {activeTab === 'add' && (
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">
                Enmetu respondojn, unu per linio. Formato:
              </p>
              <code className="block bg-gray-100 text-sm rounded p-3 mb-4 text-gray-700">
                nomo | eldono1:poento, eldono2:poento, ...
                <br />
                Ekz: Zamenhof | ijk-2024:4, jes-2025:3, uk-2023:2
              </code>
              <p className="text-xs text-gray-500 mb-1">
                Poentoj: 4=Elstara, 3=Tre bona, 2=Enorde, 1=Malbona
              </p>

              <textarea
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                rows={6}
                placeholder="Zamenhof | ijk-2024:4, jes-2025:3&#10;Ludoviko | uk-2023:2, ijf-2022:3"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />

              {/* Preview */}
              {parsedEntries.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Antaŭvido ({parsedEntries.length} enskriboj)</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-500">
                          <th className="px-3 py-2 font-medium">Nomo</th>
                          <th className="px-3 py-2 font-medium">Taksoj</th>
                          <th className="px-3 py-2 font-medium">Stato</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedEntries.map((entry, i) => (
                          <tr key={i} className="border-t border-gray-100">
                            <td className="px-3 py-2 font-medium">{entry.name}</td>
                            <td className="px-3 py-2 text-gray-600">
                              {entry.error ? (
                                <span className="text-red-600">{entry.error}</span>
                              ) : (
                                Object.entries(entry.rankings).map(([id, s]) => (
                                  <span key={id} className="inline-block bg-gray-100 rounded px-2 py-0.5 mr-1 mb-1">
                                    {id}: {s}
                                  </span>
                                ))
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {entry.error ? (
                                <span className="text-red-500 text-xs">Eraro</span>
                              ) : (
                                <span className="text-green-600 text-xs">Preta</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button
                onClick={handleAddAll}
                disabled={parsedEntries.filter(e => !e.error && Object.keys(e.rankings).length > 0).length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aldoni {parsedEntries.filter(e => !e.error && Object.keys(e.rankings).length > 0).length} respondojn
              </button>

              {addResult && (
                <p className={`mt-3 text-sm ${addResult.success ? 'text-green-600' : 'text-red-600'}`}>
                  {addResult.message}
                </p>
              )}

              {/* Reference: valid edition IDs */}
              <details className="mt-6">
                <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                  Validaj eldono-identigiloj ({validEditions.length})
                </summary>
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-1 text-xs text-gray-600">
                  {validEditions.map(id => (
                    <code key={id} className="bg-gray-50 rounded px-2 py-1">{id}</code>
                  ))}
                </div>
              </details>
            </div>
          )}

          {activeTab === 'pri' && (
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Redakti la Pri-pagon</h2>
              <p className="text-sm text-gray-500 mb-4">
                Markdown: <code className="bg-gray-100 px-1 rounded">**grasa**</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">*kursiva*</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">[teksto](url)</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">## Subtitolo</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">### Subtitolo 3</code>,{' '}
                <code className="bg-gray-100 px-1 rounded">- listero</code>.
                Malplenaj linioj apartigas alineojn.
              </p>
              <textarea
                value={priDraft}
                onChange={e => { setPriDraft(e.target.value); setPriSaved(false); }}
                rows={16}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSavePri}
                  disabled={priDraft === settings.priPageContent}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Konservi
                </button>
                {priSaved && <span className="text-green-600 text-sm">Konservita!</span>}
                {priDraft !== settings.priPageContent && (
                  <button
                    onClick={() => setPriDraft(settings.priPageContent)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Malfari ŝanĝojn
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'eventoj' && (
            <div className="p-6">
              {/* Events section */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Eventoj</h2>
                  {!eventForm && (
                    <button
                      onClick={() => setEventForm({ code: '', name: '' })}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      + Aldoni eventon
                    </button>
                  )}
                </div>

                {eventForm && !editingEvent && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Nova evento</h3>
                    <div className="flex gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Kodo</label>
                        <input
                          value={eventForm.code}
                          onChange={e => setEventForm({ ...eventForm, code: e.target.value.toUpperCase() })}
                          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="IJK"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Nomo</label>
                        <input
                          value={eventForm.name}
                          onChange={e => setEventForm({ ...eventForm, name: e.target.value })}
                          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="IJK"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!eventForm.code || !eventForm.name) return;
                          const res = await apiFetch('/api/admin/events', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(eventForm),
                          });
                          if (res.ok) {
                            setEventForm(null);
                            fetchData();
                          } else {
                            const data = await res.json();
                            alert(data.error || 'Eraro');
                          }
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
                      >
                        Konservi
                      </button>
                      <button
                        onClick={() => setEventForm(null)}
                        className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
                      >
                        Nuligi
                      </button>
                    </div>
                  </div>
                )}

                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500">
                        <th className="px-4 py-2 font-medium">Kodo</th>
                        <th className="px-4 py-2 font-medium">Nomo</th>
                        <th className="px-4 py-2 font-medium text-center">Eldonoj</th>
                        <th className="px-4 py-2 font-medium text-right">Agoj</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminEvents.map(ev => (
                        <tr
                          key={ev.code}
                          className={`border-t border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedEventCode === ev.code ? 'bg-emerald-50' : ''}`}
                          onClick={() => setSelectedEventCode(selectedEventCode === ev.code ? null : ev.code)}
                        >
                          <td className="px-4 py-2 font-mono font-medium text-gray-900">{ev.code}</td>
                          <td className="px-4 py-2 text-gray-700">
                            {editingEvent === ev.code ? (
                              <form
                                className="flex gap-2 items-center"
                                onSubmit={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const input = (e.target as HTMLFormElement).elements.namedItem('evName') as HTMLInputElement;
                                  const res = await apiFetch('/api/admin/events', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ code: ev.code, name: input.value }),
                                  });
                                  if (res.ok) {
                                    setEditingEvent(null);
                                    fetchData();
                                  }
                                }}
                                onClick={e => e.stopPropagation()}
                              >
                                <input
                                  name="evName"
                                  defaultValue={ev.name}
                                  className="border border-gray-300 rounded px-2 py-0.5 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                  autoFocus
                                />
                                <button type="submit" className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">Konservi</button>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setEditingEvent(null); }} className="text-xs text-gray-500">Nuligi</button>
                              </form>
                            ) : ev.name}
                          </td>
                          <td className="px-4 py-2 text-center text-gray-600">{ev.editionCount}</td>
                          <td className="px-4 py-2 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setEditingEvent(editingEvent === ev.code ? null : ev.code)}
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded mr-1 transition-colors"
                            >
                              Redakti
                            </button>
                            <button
                              onClick={async () => {
                                if (ev.editionCount > 0) {
                                  alert('Ne eblas forigi eventon kiu havas eldonojn');
                                  return;
                                }
                                if (!confirm(`Forigi eventon "${ev.name}"?`)) return;
                                const res = await apiFetch('/api/admin/events', { method: 'DELETE' }, { code: ev.code });
                                if (res.ok) fetchData();
                                else {
                                  const data = await res.json();
                                  alert(data.error || 'Eraro');
                                }
                              }}
                              disabled={ev.editionCount > 0}
                              className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Forigi
                            </button>
                          </td>
                        </tr>
                      ))}
                      {adminEvents.length === 0 && (
                        <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Neniuj eventoj</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Editions section — shown when an event is selected */}
              {selectedEventCode && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-800">
                      Eldonoj de {adminEvents.find(e => e.code === selectedEventCode)?.name || selectedEventCode}
                    </h2>
                    {!editionForm && (
                      <button
                        onClick={() => {
                          setEditionForm({
                            id: `${selectedEventCode.toLowerCase()}-`,
                            eventCode: selectedEventCode,
                            label: '',
                            location: '',
                            year: new Date().getFullYear().toString(),
                            logo: '',
                            flag: '',
                          });
                          setEditingEdition(null);
                          setLogoMode('upload');
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                      >
                        + Aldoni eldonon
                      </button>
                    )}
                  </div>

                  {editionForm && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <h3 className="text-sm font-medium text-gray-700 mb-3">
                        {editingEdition ? 'Redakti eldonon' : 'Nova eldono'}
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">ID</label>
                          <input
                            value={editionForm.id}
                            onChange={e => setEditionForm({ ...editionForm, id: e.target.value })}
                            disabled={!!editingEdition}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-200"
                            placeholder="ijk-2026"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Etikedo</label>
                          <input
                            value={editionForm.label}
                            onChange={e => {
                              const label = e.target.value;
                              setEditionForm({
                                ...editionForm,
                                label,
                                ...(!editingEdition ? { id: `${selectedEventCode.toLowerCase()}-${label}` } : {}),
                              });
                            }}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="2026"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Jaro</label>
                          <input
                            type="number"
                            value={editionForm.year}
                            onChange={e => setEditionForm({ ...editionForm, year: e.target.value })}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                        <div className="col-span-2 sm:col-span-2">
                          <label className="block text-xs text-gray-500 mb-1">Loko</label>
                          <input
                            value={editionForm.location}
                            onChange={e => setEditionForm({ ...editionForm, location: e.target.value })}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="Urbo, Lando"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Flago</label>
                          <input
                            value={editionForm.flag}
                            onChange={e => setEditionForm({ ...editionForm, flag: e.target.value })}
                            className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            placeholder="🇱🇹"
                            maxLength={8}
                          />
                        </div>
                      </div>

                      {/* Logo selection */}
                      <div className="mb-3">
                        <label className="block text-xs text-gray-500 mb-1">Emblemo</label>
                        <div className="flex gap-3 mb-2">
                          <button
                            onClick={() => setLogoMode('upload')}
                            className={`text-xs px-3 py-1 rounded ${logoMode === 'upload' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                          >
                            Alŝuti novan
                          </button>
                          <button
                            onClick={() => setLogoMode('reuse')}
                            className={`text-xs px-3 py-1 rounded ${logoMode === 'reuse' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-gray-100 text-gray-600'}`}
                          >
                            Reuzi ekzistantan
                          </button>
                        </div>
                        {logoMode === 'upload' && (
                          <div className="flex items-center gap-3">
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setLogoUploading(true);
                                const formData = new FormData();
                                formData.append('file', file);
                                try {
                                  const res = await apiFetch('/api/admin/upload-logo', {
                                    method: 'POST',
                                    body: formData,
                                  });
                                  if (res.ok) {
                                    const data = await res.json();
                                    setEditionForm(prev => prev ? { ...prev, logo: data.path } : prev);
                                  } else {
                                    const data = await res.json();
                                    alert(data.error || 'Eraro dum alŝuto');
                                  }
                                } finally {
                                  setLogoUploading(false);
                                }
                              }}
                              className="text-sm"
                            />
                            {logoUploading && <span className="text-xs text-gray-500">Alŝutante...</span>}
                          </div>
                        )}
                        {logoMode === 'reuse' && (
                          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {Array.from(new Set(adminEditions.map(e => e.logo).filter(Boolean))).map(logo => (
                              <button
                                key={logo}
                                onClick={() => setEditionForm(prev => prev ? { ...prev, logo } : prev)}
                                className={`border-2 rounded p-1 ${editionForm.logo === logo ? 'border-emerald-500' : 'border-gray-200 hover:border-gray-400'}`}
                              >
                                <img src={logo} alt="" className="w-8 h-8 object-contain" />
                              </button>
                            ))}
                          </div>
                        )}
                        {editionForm.logo && (
                          <div className="flex items-center gap-2 mt-2">
                            <img src={editionForm.logo} alt="" className="w-8 h-8 object-contain rounded" />
                            <span className="text-xs text-gray-500">{editionForm.logo}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={async () => {
                            if (!editionForm.id || !editionForm.label || !editionForm.location || !editionForm.year) {
                              alert('Ĉiuj kampoj estas devigaj');
                              return;
                            }
                            const method = editingEdition ? 'PUT' : 'POST';
                            const res = await apiFetch('/api/admin/editions', {
                              method,
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ...editionForm,
                                eventCode: selectedEventCode,
                                year: Number(editionForm.year),
                              }),
                            });
                            if (res.ok) {
                              setEditionForm(null);
                              setEditingEdition(null);
                              fetchData();
                            } else {
                              const data = await res.json();
                              alert(data.error || 'Eraro');
                            }
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded transition-colors"
                        >
                          Konservi
                        </button>
                        <button
                          onClick={() => { setEditionForm(null); setEditingEdition(null); }}
                          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5"
                        >
                          Nuligi
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-500">
                          <th className="px-4 py-2 font-medium w-10">Emblemo</th>
                          <th className="px-4 py-2 font-medium">ID</th>
                          <th className="px-4 py-2 font-medium">Etikedo</th>
                          <th className="px-4 py-2 font-medium">Loko</th>
                          <th className="px-4 py-2 font-medium text-center">Jaro</th>
                          <th className="px-4 py-2 font-medium text-center">Flago</th>
                          <th className="px-4 py-2 font-medium text-right">Agoj</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminEditions
                          .filter(ed => ed.eventCode === selectedEventCode)
                          .sort((a, b) => a.year - b.year)
                          .map(ed => (
                            <tr key={ed.id} className="border-t border-gray-100 hover:bg-gray-50">
                              <td className="px-4 py-2">
                                {ed.logo ? <img src={ed.logo} alt="" className="w-6 h-6 object-contain rounded" /> : <span className="text-gray-300">-</span>}
                              </td>
                              <td className="px-4 py-2 font-mono text-gray-700">{ed.id}</td>
                              <td className="px-4 py-2 text-gray-700">{ed.label}</td>
                              <td className="px-4 py-2 text-gray-600">{ed.location}</td>
                              <td className="px-4 py-2 text-center text-gray-600">{ed.year}</td>
                              <td className="px-4 py-2 text-center text-lg">{ed.flag || <span className="text-gray-300 text-sm">-</span>}</td>
                              <td className="px-4 py-2 text-right whitespace-nowrap">
                                <button
                                  onClick={() => {
                                    setEditionForm({
                                      id: ed.id,
                                      eventCode: ed.eventCode,
                                      label: ed.label,
                                      location: ed.location,
                                      year: String(ed.year),
                                      logo: ed.logo,
                                      flag: ed.flag || '',
                                    });
                                    setEditingEdition(ed.id);
                                    setLogoMode(ed.logo ? 'reuse' : 'upload');
                                  }}
                                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded mr-1 transition-colors"
                                >
                                  Redakti
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Forigi eldonon "${ed.id}"?`)) return;
                                    const res = await apiFetch('/api/admin/editions', { method: 'DELETE' }, { id: ed.id });
                                    if (res.ok) {
                                      const data = await res.json();
                                      if (data.hasSubmissions) {
                                        alert('Averto: Ĉi tiu eldono havis respondojn ligitajn al ĝi');
                                      }
                                      fetchData();
                                    } else {
                                      const data = await res.json();
                                      alert(data.error || 'Eraro');
                                    }
                                  }}
                                  className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded transition-colors"
                                >
                                  Forigi
                                </button>
                              </td>
                            </tr>
                          ))}
                        {adminEditions.filter(ed => ed.eventCode === selectedEventCode).length === 0 && (
                          <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Neniuj eldonoj por ĉi tiu evento</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
