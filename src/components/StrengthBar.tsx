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
      {Array.from({ length: max }).map((_, i) => {
        const isFilled = i < filled;
        return (
          <div
            key={i}
            className={`box-border transition-colors duration-200 border border-[#ddd] dark:border-[#222] ${isFilled
                ? 'opacity-100'
                : 'bg-gray-200 dark:bg-gray-600 opacity-50 dark:opacity-[0.35]'
              }`}
            style={{
              width: Math.max(6, Math.floor((width - (max - 1) * 2) / max)),
              height,
              borderRadius: 2,
              backgroundColor: isFilled ? color : undefined,
              marginRight: i < max - 1 ? 2 : 0,
            }}
          />
        );
      })}
    </div>
  );
};

export default StrengthBar;
