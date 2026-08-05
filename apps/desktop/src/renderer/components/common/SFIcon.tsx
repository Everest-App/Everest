import React from 'react';

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

interface SFIconProps {
  name: SFSymbolName;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const SYMBOL_MAP: Record<SFSymbolName, string> = {
  'sun.max.fill': '☀️',
  'moon.fill': '🌙',
  'play.fill': '􀊄',
  'stop.fill': '􀛷',
  'plus': '􀅼',
  'xmark': '􀆄',
  'pencil': '􀈎',
  'doc.on.doc': '􀉁',
  'doc.on.clipboard': '􀉃',
  'doc.badge.plus': '􀈢',
  'doc.text': '􀉉',
  'magnifyingglass': '􀊫',
  'folder.fill': '􀈕',
  'shippingbox.fill': '􀏛',
  'clock.fill': '􀐅',
  'globe': '􀆪',
  'gearshape': '􀍟',
  'bolt.fill': '􀋦',
  'powerplug.fill': '􀓤',
  'xmark.octagon.fill': '􀁡',
  'checkmark.circle.fill': '􀁣',
  'xmark.circle.fill': '􀁡',
  'circle': '􀀀',
  'paperplane.fill': '􀈟',
  'code': '􀌚',
  'terminal': '􀪏',
  'chevron.left': '􀯶',
  'chevron.right': '􀯿',
  'chevron.down': '􀏑',
  'square.and.arrow.up': '􀈂',
  'trash': '􀈑',
  'antenna.radiowaves.left.and.right': '􀙥',
  'puzzlepiece.fill': '􀥾',
  'lock.fill': '􀎡',
  'arrow.triangle.2.circlepath': '􀅉',
  'testtube.2': '􀙹',
  'wrench.fill': '􀈛',
  'chart.bar.fill': '􀏬',
  'exclamationmark.triangle.fill': '􀇿',
  'arrow.up.arrow.down': '􀄬',
  'sparkles': '􀆔'
};

export const SFIcon = React.memo(function SFIcon({
  name,
  size = 14,
  className = '',
  style = {}
}: SFIconProps) {
  return (
    <span
      className={`sf-symbol-icon ${className}`}
      style={{
        fontSize: size,
        fontFamily: '-apple-system, "SF Pro Text", "SF Pro Icons", "SF Pro Display", sans-serif',
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      aria-label={name}
    >
      {SYMBOL_MAP[name] || '􀅼'}
    </span>
  );
});
