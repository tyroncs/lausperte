'use client';

import { Suspense, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Edition {
  id: string;
  eventName: string;
  label: string;
  location: string;
  year: number;
  logo: string;
  flag?: string;
}

const EDITION_FLAGS: Record<string, string> = {
  'ijk-2015': '\u{1F1E9}\u{1F1EA}', 'ijk-2016': '\u{1F1F5}\u{1F1F1}', 'ijk-2017': '\u{1F1F9}\u{1F1EC}',
  'ijk-2018': '\u{1F1EA}\u{1F1F8}', 'ijk-2019': '\u{1F1F8}\u{1F1F0}', 'ijk-2022': '\u{1F1F3}\u{1F1F1}',
  'ijk-2023': '\u{1F1EE}\u{1F1F9}', 'ijk-2024': '\u{1F1F1}\u{1F1F9}', 'ijk-2025': '\u{1F1EE}\u{1F1E9}',
  'jes-2015': '\u{1F1ED}\u{1F1FA}', 'jes-2016': '\u{1F1E9}\u{1F1EA}', 'jes-2017': '\u{1F1F5}\u{1F1F1}',
  'jes-2018': '\u{1F1E9}\u{1F1EA}', 'jes-2019': '\u{1F1F5}\u{1F1F1}', 'jes-2022': '\u{1F1E9}\u{1F1EA}',
  'jes-2023': '\u{1F1E9}\u{1F1EA}', 'jes-2024': '\u{1F1E7}\u{1F1EA}', 'jes-2025': '\u{1F1E9}\u{1F1EA}',
  'ijf-2015': '\u{1F1EE}\u{1F1F9}', 'ijf-2016': '\u{1F1EE}\u{1F1F9}', 'ijf-2017': '\u{1F1EE}\u{1F1F9}',
  'ijf-2018': '\u{1F1EE}\u{1F1F9}', 'ijf-2019': '\u{1F1EE}\u{1F1F9}', 'ijf-2022': '\u{1F1EE}\u{1F1F9}',
  'ijf-2023': '\u{1F1EE}\u{1F1F9}', 'ijf-2024': '\u{1F1EE}\u{1F1F9}',
  'renkej-2023': '\u{2764}\u{FE0F}\u{1F49B}', 'renkej-2024': '\u{2764}\u{FE0F}\u{1F49B}', 'renkej-2025': '\u{2764}\u{FE0F}\u{1F49B}',
  'uk-2015': '\u{1F1EB}\u{1F1F7}', 'uk-2016': '\u{1F1F8}\u{1F1F0}', 'uk-2017': '\u{1F1F0}\u{1F1F7}',
  'uk-2018': '\u{1F1F5}\u{1F1F9}', 'uk-2019': '\u{1F1EB}\u{1F1EE}', 'uk-2022': '\u{1F1E8}\u{1F1E6}',
  'uk-2023': '\u{1F1EE}\u{1F1F9}', 'uk-2024': '\u{1F1F9}\u{1F1FF}', 'uk-2025': '\u{1F1E8}\u{1F1FF}',
  'festo-2025': '\u{1F1EB}\u{1F1F7}',
};

// ─── Twemoji flag rendering ───────────────────────────────────────────────────
// Windows doesn't support country flag emoji natively, so we use Twemoji images.

function emojiToTwemojiUrl(emoji: string): string {
  const cps = Array.from(emoji)
    .map(c => c.codePointAt(0)!)
    .filter(cp => cp !== 0x200D) // strip ZWJ (not needed for our flags)
    .map(cp => cp.toString(16));
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${cps.join('-')}.svg`;
}

function splitEmoji(str: string): string[] {
  // Use Intl.Segmenter if available (modern browsers)
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seg = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.from(seg.segment(str)).map((s: any) => s.segment);
  }
  // Fallback: pair up regional indicators, keep variation selectors attached
  const chars = Array.from(str);
  const result: string[] = [];
  let i = 0;
  while (i < chars.length) {
    const cp = chars[i].codePointAt(0)!;
    if (cp >= 0x1F1E6 && cp <= 0x1F1FF && i + 1 < chars.length) {
      const cp2 = chars[i + 1].codePointAt(0)!;
      if (cp2 >= 0x1F1E6 && cp2 <= 0x1F1FF) {
        result.push(chars[i] + chars[i + 1]);
        i += 2;
        continue;
      }
    }
    let e = chars[i]; i++;
    if (i < chars.length && chars[i].codePointAt(0) === 0xFE0F) { e += chars[i]; i++; }
    result.push(e);
  }
  return result;
}

function FlagDisplay({ flagStr, size }: { flagStr: string; size: number }) {
  const emojis = splitEmoji(flagStr);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      {emojis.map((e, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={i}
          src={emojiToTwemojiUrl(e)}
          alt={e}
          width={size}
          height={size}
          style={{ display: 'block' }}
          crossOrigin="anonymous"
        />
      ))}
    </div>
  );
}

// ─── Label formatting ─────────────────────────────────────────────────────────
// "2024-2025" → "24-25"  (keeps single years like "2024" unchanged)
function formatLabel(label: string): string {
  return label.replace(/\b(\d{2})(\d{2})-(\d{2})(\d{2})\b/g, '$2-$4');
}

// ─── Story card ───────────────────────────────────────────────────────────────

const CARD_W = 1080;
const CARD_H = 1920;
const GREEN = '#275317';
const CREAM = '#F0F0EB';
const BBH = '"BBH Sans Hegarty", sans-serif';
const AVENIR = '"Avenir Next LT Pro", sans-serif';
const TITLE_SIZE = 84; // shared size for title / eventoj / ekde / laŭsperte.com

function StoryCard({
  topEntries,
  editions,
  n,
  since,
}: {
  topEntries: Array<{ rank: number; id: string }>;
  editions: Edition[];
  n: number;
  since: number | null;
}) {
  const getEd = (id: string) => editions.find(e => e.id === id);

  // Wider flag column = smaller green boxes + bigger emoji
  const FLAG_COL = 240;
  const EMOJI_SIZE = 200;

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        background: CREAM,
        display: 'flex',
        flexDirection: 'column',
        padding: '0 80px',
        boxSizing: 'border-box',
      }}
    >
      {/* Title — BBH, not italic, not bold */}
      <div
        style={{
          textAlign: 'center',
          color: GREEN,
          fontFamily: BBH,
          fontWeight: 400,
          fontSize: TITLE_SIZE,
          marginTop: 156,
          marginBottom: 44,
          lineHeight: 1.15,
        }}
      >
        Miaj eventoj
      </div>

      {/* Top 3 rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
        {topEntries.slice(0, 3).map((entry) => {
          const ed = getEd(entry.id);
          if (!ed) return null;
          const isRenkej = entry.id.startsWith('renkej');
          const flag = ed.flag || EDITION_FLAGS[entry.id] || '';

          return (
            <div key={entry.id} style={{ display: 'flex', alignItems: 'center' }}>
              {/* Rank number — BBH, not bold */}
              <div
                style={{
                  width: 44,
                  flexShrink: 0,
                  textAlign: 'right',
                  color: GREEN,
                  fontFamily: BBH,
                  fontWeight: 400,
                  fontSize: 72,
                  lineHeight: 1,
                  marginRight: 50,
                }}
              >
                {entry.rank}
              </div>

              {/* Green box — no rounded corners, more padding */}
              <div
                style={{
                  flex: 1,
                  background: GREEN,
                  borderRadius: 0,
                  padding: '18px 40px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Event name — Avenir Next LT Pro Light */}
                <div
                  style={{
                    color: CREAM,
                    fontFamily: AVENIR,
                    fontWeight: 300,
                    fontSize: 84,
                    lineHeight: 1.2,
                  }}
                >
                  {ed.eventName}
                </div>
                {/* Year — BBH Sans Hegarty, not bold */}
                <div
                  style={{
                    color: CREAM,
                    fontFamily: BBH,
                    fontWeight: 400,
                    fontSize: 79,
                    lineHeight: 1.0,
                    marginTop: 8,
                  }}
                >
                  {formatLabel(ed.label)}
                </div>
              </div>

              {/* Flag — renkej uses custom Catalan image, others use Twemoji */}
              <div
                style={{
                  width: FLAG_COL,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 10,
                }}
              >
                {isRenkej ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/flags/renkej.png"
                    alt="Catalan flag"
                    style={{ width: EMOJI_SIZE, height: EMOJI_SIZE, objectFit: 'contain' }}
                    crossOrigin="anonymous"
                  />
                ) : (
                  flag && <FlagDisplay flagStr={flag} size={EMOJI_SIZE} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats — flex:1 wrapper centres the stats exactly between bottom of 3rd box
           and top of laŭsperte.com. paddingTop: 72 offsets for laŭsperte.com's
           marginTop inside the footer, shifting the centre point by exactly half. */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 72 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 100,
          }}
        >
          {/* Count box + "eventoj" — no rounded corners, BBH not bold */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginLeft: 8 }}>
            <div
              style={{
                background: GREEN,
                borderRadius: 0,
                width: 226,
                height: 170,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: CREAM, fontFamily: BBH, fontWeight: 400, fontSize: 118, lineHeight: 1 }}>
                {n}
              </span>
            </div>
            <div style={{ color: GREEN, fontFamily: BBH, fontWeight: 400, fontSize: TITLE_SIZE, lineHeight: 1 }}>
              eventoj
            </div>
          </div>

          {/* "ekde" + year box — flex:1 keeps right edge aligned with emoji right edge */}
          {since !== null && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginTop: -24 }}>
              <div style={{ color: GREEN, fontFamily: BBH, fontWeight: 400, fontSize: TITLE_SIZE, lineHeight: 1, textAlign: 'center', width: '100%' }}>
                ekde
              </div>
              <div
                style={{
                  width: '100%',
                  height: 160,
                  background: GREEN,
                  borderRadius: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: CREAM, fontFamily: BBH, fontWeight: 400, fontSize: since === 2015 ? 107 : 108, lineHeight: 1 }}>
                  {since === 2015 ? 'longe' : since}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer — star on the left, laŭsperte.com centred in remaining space */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          paddingBottom: 165,
        }}
      >
        <span
          style={{
            flexShrink: 0,
            marginLeft: -20,
            marginTop: 36,
            color: GREEN,
            fontFamily: BBH,
            fontWeight: 400,
            fontSize: 156,
            lineHeight: 1,
          }}
        >
          ★
        </span>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', marginTop: 72 }}>
          <span style={{ color: GREEN, fontFamily: AVENIR, fontWeight: 300, fontSize: 70, lineHeight: 1 }}>
            lausperte.tejo.org
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Main results page ────────────────────────────────────────────────────────

function RezultojContent({ editions }: { editions: Edition[] }) {
  const getEditionById = (id: string) => editions.find(e => e.id === id);
  const searchParams = useSearchParams();
  const n = parseInt(searchParams.get('n') || '0', 10);
  const topParam = searchParams.get('top') || '';
  const isEdited = searchParams.get('edited') === '1';
  const since = searchParams.get('since') ? parseInt(searchParams.get('since')!, 10) : null;

  const [isGenerating, setIsGenerating] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  // Parse top entries: "1:ijk-2024,2:ijk-2023,3:jes-2025"
  const topEntries = topParam
    ? topParam.split(',').map(pair => {
        const [rank, id] = pair.split(':');
        return { rank: parseInt(rank, 10), id };
      })
    : [];

  // Build shareable text
  const topLines = topEntries.map((entry, i) => {
    const edition = getEditionById(entry.id);
    if (!edition) return null;
    const tiedWithPrev = i > 0 && topEntries[i - 1].rank === entry.rank;
    const tiedWithNext = i < topEntries.length - 1 && topEntries[i + 1].rank === entry.rank;
    const isTied = tiedWithPrev || tiedWithNext;
    const rankStr = isTied ? `=${entry.rank}` : `${entry.rank}`;
    const flag = edition.flag || EDITION_FLAGS[entry.id] || '';
    return `${rankStr}. ${flag} ${edition.eventName} ${edition.label}`;
  }).filter(Boolean);

  const shareText = [
    `Mi rangigis ${n} eventojn ĉe laŭsperte!`,
    '',
    'Miaj plej ŝatataj:',
    ...topLines,
    '',
    'Patroprenu ĉe https://lausperte.tejo.org/donu',
  ].join('\n');

  const handleCopyForTelegram = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScrollToTelegram = () => {
    document.getElementById('telegram-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleShareInstagram = async () => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    setShareError(null);
    try {
      // Wait for fonts and all images in the card to load before capturing
      await document.fonts.ready;
      const images = Array.from(cardRef.current.querySelectorAll('img'));
      await Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => { img.onload = img.onerror = () => resolve(); })
        )
      );

      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_W,
        height: CARD_H,
        pixelRatio: 1,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'lausperte-miaj-eventoj.png', { type: 'image/png' });

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'lausperte-miaj-eventoj.png';
        a.click();
        setShareError(
          'Via aparato ne subtenas rektan kundividon — la bildo estas elŝutita. Aldonu ĝin mane en Instagram.'
        );
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== 'AbortError') {
        setShareError('Eraro okazis dum kundivido.');
      }
    }
    setIsGenerating(false);
  };

  // Scale for the live preview (~220px wide)
  const PREVIEW_W = 220;
  const previewScale = PREVIEW_W / CARD_W;
  const PREVIEW_H = Math.round(CARD_H * previewScale);

  return (
    <div className="min-h-screen bg-[#F9F3EB]">
      {/* Off-screen card captured by html-to-image */}
      <div style={{ position: 'fixed', top: 0, left: '-9999px', pointerEvents: 'none', zIndex: -1 }}>
        <div ref={cardRef}>
          <StoryCard topEntries={topEntries} editions={editions} n={n} since={since} />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-900 mb-2">
            {isEdited ? 'Via respondo estas ĝisdatigita!' : 'Dankon pro via kontribuo!'}
          </h1>
          <p className="text-emerald-700 mb-10">Ĉu vi volas kundividi viajn rezultojn?</p>

          {/* Quick-share buttons side by side */}
          {topEntries.length > 0 && (
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleShareInstagram}
                disabled={isGenerating}
                className={`flex items-center gap-2 font-semibold px-5 py-3 rounded-lg transition-all ${
                  isGenerating
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 text-white shadow-md'
                }`}
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generante…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                    Kundividi en Instagram
                  </>
                )}
              </button>

              <button
                onClick={handleScrollToTelegram}
                className="flex items-center gap-2 font-semibold px-5 py-3 rounded-lg transition-colors bg-[#0088CC] hover:bg-[#006EAA] text-white shadow-md"
              >
                {/* Telegram paper-plane icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                Kopii por Telegram
              </button>
            </div>
          )}
        </header>

        {/* Instagram Story share */}
        {topEntries.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            {/* Live preview */}
            <div className="flex justify-center mb-5">
              <div
                style={{
                  width: PREVIEW_W,
                  height: PREVIEW_H,
                  overflow: 'hidden',
                  borderRadius: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                    width: CARD_W,
                    height: CARD_H,
                  }}
                >
                  <StoryCard topEntries={topEntries} editions={editions} n={n} since={since} />
                </div>
              </div>
            </div>

            <button
              onClick={handleShareInstagram}
              disabled={isGenerating}
              className={`w-full font-semibold px-6 py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
                isGenerating
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 hover:opacity-90 text-white shadow-md'
              }`}
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Generante bildon…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  Kundividi en Instagram
                </>
              )}
            </button>

            {shareError && (
              <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                {shareError}
              </p>
            )}
          </div>
        )}

        {/* Shareable text + Telegram copy */}
        <div id="telegram-section" className="bg-white rounded-lg shadow-md p-6 mb-6">
          <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap font-sans">
            {shareText}
          </pre>
          <button
            onClick={handleCopyForTelegram}
            className={`mt-4 w-full font-semibold px-6 py-3 rounded-lg transition-colors ${
              copied
                ? 'bg-[#006EAA] text-white'
                : 'bg-[#0088CC] hover:bg-[#006EAA] text-white'
            }`}
          >
            <span className="flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
              </svg>
              {copied ? 'Kopiita!' : 'Kopii por Telegram'}
            </span>
          </button>
        </div>

        <div className="text-center">
          <Link
            href="/"
            className="inline-block bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Al la ĉefpaĝo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RezultojClient({ editions }: { editions: Edition[] }) {
  return (
    <Suspense>
      <RezultojContent editions={editions} />
    </Suspense>
  );
}
