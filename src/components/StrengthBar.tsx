import React from 'react';

export interface StrengthBarProps {
  /**
   * The current level (0-based index)
   */
  level: number;
  /**
   * The total number of levels (segments)
   */
  max: number;
  /**
   * The color for the filled segments
   */
  color?: string;
  /**
   * The tooltip text to show on hover
   */
  tooltip?: string;
  /**
   * The height of the bar (px)
   */
  height?: number;
  /**
   * The width of the bar (px)
   */
  width?: number;
}

/**
 * Renders a horizontal bar with segments to represent strength/severity/rating.
 */
export const StrengthBar: React.FC<StrengthBarProps> = ({
  level,
  max,
  color = '#facc15', // default yellow-400
  tooltip,
  height = 12,
  width = 60,
}) => {
  const filled = Math.max(0, Math.min(level, max));
  return (
    <div
      className="flex items-center gap-1 group cursor-help"
      title={tooltip}
      style={{ width, height }}
    >
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          style={{
            width: Math.max(6, Math.floor((width - (max - 1) * 2) / max)),
            height,
            borderRadius: 2,
            background: i < filled ? color : '#6b7280', // filled: color, unfilled: gray-400
            opacity: i < filled ? 1 : 0.35,
            border: '1px solid #222',
            marginRight: i < max - 1 ? 2 : 0,
            boxSizing: 'border-box',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
};

export default StrengthBar;
