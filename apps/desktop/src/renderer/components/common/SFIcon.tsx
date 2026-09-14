import React, { useState, useEffect } from 'react';

export type SFSymbolName = 
  | 'sun.max.fill'
  | 'moon.fill'
  | 'play.fill'
  | 'stop.fill'
  | 'plus'
  | 'xmark'
  | 'pencil'
  | 'doc.on.doc'
  | 'doc.on.clipboard'
  | 'doc.badge.plus'
  | 'doc.text'
  | 'magnifyingglass'
  | 'folder.fill'
  | 'shippingbox.fill'
  | 'clock.fill'
  | 'globe'
  | 'gearshape'
  | 'bolt.fill'
  | 'powerplug.fill'
  | 'xmark.octagon.fill'
  | 'checkmark.circle.fill'
  | 'xmark.circle.fill'
  | 'circle'
  | 'paperplane.fill'
  | 'code'
  | 'terminal'
  | 'chevron.left'
  | 'chevron.right'
  | 'chevron.down'
  | 'square.and.arrow.up'
  | 'trash'
  | 'antenna.radiowaves.left.and.right'
  | 'puzzlepiece.fill'
  | 'lock.fill'
  | 'arrow.triangle.2.circlepath'
  | 'testtube.2'
  | 'wrench.fill'
  | 'chart.bar.fill'
  | 'exclamationmark.triangle.fill'
  | 'arrow.up.arrow.down'
  | 'sparkles';

// Symbols that use Unicode emoji (cross-platform, no SVG needed)
const EMOJI_SYMBOLS: Partial<Record<SFSymbolName, string>> = {
  'sun.max.fill': '☀️',
  'moon.fill': '🌙',
};

interface SFIconProps {
  name: SFSymbolName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

// In-memory cache: symbol name -> SVG path data string
const svgCache = new Map<string, string>();

async function loadSVGPath(name: string): Promise<string | null> {
  if (svgCache.has(name)) return svgCache.get(name)!;
  
  try {
    const url = `./sf-symbols/${name}.svg`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const text = await res.text();
    // Parse the <path d="..."> from the fetched SVG
    const match = text.match(/<path[^>]+d="([^"]+)"/);
    const transform = text.match(/transform="([^"]+)"/);
    // Store as combined string "transform|pathData" or just pathData
    const result = transform ? `${transform[1]}|${match?.[1] ?? ''}` : (match?.[1] ?? '');
    if (result) {
      svgCache.set(name, result);
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

export const SFIcon = React.memo(function SFIcon({
  name,
  size = 14,
  className = '',
  style = {}
}: SFIconProps) {
  // Use emoji fallback for symbols that are standard Unicode emoji
  const emoji = EMOJI_SYMBOLS[name];
  if (emoji) {
    return (
      <span
        className={`sf-symbol-icon ${className}`}
        style={{
          fontSize: size,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
        aria-label={name}
      >
        {emoji}
      </span>
    );
  }

  return <SFIconSVG name={name} size={size} className={className} style={style} />;
});

// Separate component for async SVG loading (keeps SFIcon fast for emoji)
const SFIconSVG = React.memo(function SFIconSVG({
  name,
  size,
  className,
  style,
}: {
  name: SFSymbolName;
  size: number;
  className: string;
  style: React.CSSProperties;
}) {
  const [svgData, setSvgData] = useState<string | null>(() => svgCache.get(name) ?? null);

  useEffect(() => {
    if (svgCache.has(name)) {
      setSvgData(svgCache.get(name)!);
      return;
    }
    let cancelled = false;
    loadSVGPath(name).then((data) => {
      if (!cancelled && data) setSvgData(data);
    });
    return () => { cancelled = true; };
  }, [name]);

  if (!svgData) {
    // Placeholder while loading (transparent, same size)
    return (
      <span
        className={`sf-symbol-icon ${className}`}
        style={{ width: size, height: size, display: 'inline-flex', flexShrink: 0, ...style }}
        aria-label={name}
      />
    );
  }

  // Parse "transform|pathData" format
  const pipeIdx = svgData.indexOf('|');
  const transform = pipeIdx >= 0 ? svgData.slice(0, pipeIdx) : undefined;
  const pathD = pipeIdx >= 0 ? svgData.slice(pipeIdx + 1) : svgData;

  return (
    <span
      className={`sf-symbol-icon ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
      }}
      aria-label={name}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="currentColor"
        style={{ display: 'block' }}
        aria-hidden="true"
      >
        <g transform={transform}>
          <path d={pathD} />
        </g>
      </svg>
    </span>
  );
});
