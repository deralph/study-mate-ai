import { Fragment, type ReactNode } from 'react';

// Lightweight, dependency-free Markdown renderer for chat replies.
// Supports: headings, **bold**, *italic*, `code`, fenced code, bullet/numbered lists, links.

function renderInline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*([^*]+?)\*\*|__([^_]+?)__|`([^`]+?)`|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*([^*\s][^*]*?)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = `${keyBase}-${i++}`;
    if (m[2] !== undefined) out.push(<strong key={k} className="font-semibold">{renderInline(m[2], k)}</strong>);
    else if (m[3] !== undefined) out.push(<strong key={k} className="font-semibold">{m[3]}</strong>);
    else if (m[4] !== undefined) out.push(<code key={k} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{m[4]}</code>);
    else if (m[5] !== undefined) out.push(<a key={k} href={m[6]} target="_blank" rel="noopener noreferrer" className="text-primary underline">{m[5]}</a>);
    else if (m[7] !== undefined) out.push(<em key={k}>{m[7]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  // Remove any stray leftover asterisks so they never show up raw.
  return out.map(n => (typeof n === 'string' ? n.replace(/\*+/g, '') : n));
}

export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) { i++; continue; }

    // Fenced code block
    if (/^```/.test(line.trim())) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      i++;
      blocks.push(<pre key={key++} className="my-2 overflow-x-auto rounded-lg bg-muted p-3 text-xs"><code>{code.join('\n')}</code></pre>);
      continue;
    }

    // Heading
    const h = line.match(/^\s*(#{1,6})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const cls = level <= 2 ? 'text-base font-bold mt-3 mb-1' : 'text-sm font-semibold mt-2 mb-1';
      blocks.push(<p key={key++} className={cls}>{renderInline(h[2].replace(/\*+/g, ''), `h${key}`)}</p>);
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*•]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*•]\s+/, ''));
      blocks.push(
        <ul key={key++} className="my-2 list-disc space-y-1 pl-5">
          {items.map((it, n) => <li key={n}>{renderInline(it, `u${key}-${n}`)}</li>)}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/, ''));
      blocks.push(
        <ol key={key++} className="my-2 list-decimal space-y-1 pl-5">
          {items.map((it, n) => <li key={n}>{renderInline(it, `o${key}-${n}`)}</li>)}
        </ol>
      );
      continue;
    }

    // Paragraph (merge consecutive plain lines)
    const para: string[] = [];
    while (
      i < lines.length && !/^\s*$/.test(lines[i]) && !/^```/.test(lines[i].trim()) &&
      !/^\s*#{1,6}\s+/.test(lines[i]) && !/^\s*[-*•]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])
    ) para.push(lines[i++]);
    blocks.push(
      <p key={key++} className="my-1.5">
        {para.map((p, n) => <Fragment key={n}>{n > 0 && <br />}{renderInline(p, `p${key}-${n}`)}</Fragment>)}
      </p>
    );
  }

  return <div className={`break-words [overflow-wrap:anywhere] ${className}`}>{blocks}</div>;
}
