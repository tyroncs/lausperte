import Link from 'next/link';
import { getSettings } from '@/lib/db';

export const revalidate = 60;

function renderMarkdown(md: string) {
  // Simple markdown renderer supporting:
  // **bold**, *italic*, [link](url), ## headings, ### headings,
  // - unordered lists, paragraphs
  const blocks = md.split(/\n\n+/);

  return blocks.map((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return null;

    // ## Heading
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="text-2xl font-bold text-emerald-800 mb-3 mt-6">
          {renderInline(trimmed.slice(3))}
        </h2>
      );
    }

    // ### Heading
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={i} className="text-xl font-bold text-emerald-800 mb-2 mt-4">
          {renderInline(trimmed.slice(4))}
        </h3>
      );
    }

    // Unordered list: block where every line starts with - or *
    const lines = trimmed.split('\n');
    if (lines.every(line => /^[-*]\s/.test(line.trim()))) {
      return (
        <ul key={i} className="list-disc list-inside text-gray-700 leading-relaxed space-y-1">
          {lines.map((line, j) => (
            <li key={j}>{renderInline(line.trim().replace(/^[-*]\s+/, ''))}</li>
          ))}
        </ul>
      );
    }

    // Regular paragraph
    return (
      <p key={i} className="text-gray-700 leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });
}

function renderInline(text: string): React.ReactNode[] {
  // Tokenize: **bold**, *italic*, [link](url), plain text
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*)|(\*(?!\*).*?\*(?!\*))|(\[.*?\]\(.*?\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Push plain text before this match
    if (match.index > lastIndex) {
      tokens.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
    }

    const m = match[0];
    if (match[1]) {
      // **bold**
      tokens.push(<strong key={`b${match.index}`}>{m.slice(2, -2)}</strong>);
    } else if (match[2]) {
      // *italic*
      tokens.push(<em key={`i${match.index}`}>{m.slice(1, -1)}</em>);
    } else if (match[3]) {
      // [text](url)
      const linkMatch = m.match(/^\[(.*?)\]\((.*?)\)$/);
      if (linkMatch) {
        tokens.push(
          <a key={`a${match.index}`} href={linkMatch[2]} className="text-emerald-700 underline hover:text-emerald-900" target="_blank" rel="noopener noreferrer">
            {linkMatch[1]}
          </a>
        );
      }
    }

    lastIndex = match.index + m.length;
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    tokens.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>);
  }

  return tokens;
}

export default async function PriPage() {
  const settings = await getSettings();
  const content = settings.priPageContent;

  return (
    <div className="min-h-screen bg-[#F9F3EB]">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-emerald-900 mb-8">Pri la retejo</h1>

        <div className="bg-white rounded-xl shadow-xl p-8 space-y-3">
          {renderMarkdown(content)}

          <div className="pt-4">
            <Link
              href="/"
              className="inline-block bg-emerald-800 hover:bg-emerald-900 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Reen al la ĉefpaĝo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
