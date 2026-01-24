/**
 * TopicTagCloud Component
 *
 * Purpose:
 * - Visualizes topic analysis results as a tag cloud or ranked list.
 * - Highlights "Main Topics" separately from general keywords.
 *
 * Behavior:
 * - Sorts tags by a combined weight of relevance and importance.
 * - Colors tags based on their ranking tier (1-5).
 * - Displays a visual bar indicator for relevance/importance scores.
 *
 * Location: src/components/ui/TopicTagCloud.tsx
 */
import React from 'react';

export interface WeightedTag {
  tag: string;
  relevance: number; // 0-1
  importance: number; // 0-1
  frequency: number;
}

interface TopicTagCloudProps {
  tags: WeightedTag[];
  mainTopics?: string[];
}

/**
 * Calculates combined weight for visual sizing
 * Uses both relevance and importance with slight preference to importance
 */
function calculateWeight(tag: WeightedTag): number {
  return (tag.relevance * 0.4 + tag.importance * 0.6);
}

/**
 * Maps weight (0-1) to ranking 1-5
 */
function getRanking(weight: number): number {
  if (weight >= 0.85) return 5;
  if (weight >= 0.7) return 4;
  if (weight >= 0.55) return 3;
  if (weight >= 0.4) return 2;
  return 1;
}

/**
 * Gets color based on ranking
 */
function getTagColor(ranking: number): string {
  if (ranking === 5) return 'bg-blue-600 text-white';
  if (ranking === 4) return 'bg-blue-500 text-white';
  if (ranking === 3) return 'bg-blue-400 text-white';
  if (ranking === 2) return 'bg-blue-300 text-gray-800';
  return 'bg-blue-200 text-gray-800';
}

export const TopicTagCloud: React.FC<TopicTagCloudProps> = ({ tags, mainTopics = [] }) => {
  if (!tags || tags.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic p-2">
        No topics extracted
      </div>
    );
  }

  // Sort tags by combined weight
  const sortedTags = [...tags].sort((a, b) => calculateWeight(b) - calculateWeight(a));

  return (
    <div className="space-y-3">
      {/* Main Topics Highlight */}
      {mainTopics.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-300 mb-2">Main Topics:</p>
          <div className="flex flex-wrap gap-2">
            {mainTopics.map((topic, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-amber-500/30 text-amber-200 rounded-full text-sm font-medium border border-amber-500/50"
              >
                ★ {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tag Cloud */}
      <div>
        <p className="text-xs font-semibold text-gray-300 mb-3">Topics & Keywords:</p>
        <div className="space-y-2">
          {sortedTags.map((tag, idx) => {
            const weight = calculateWeight(tag);
            const ranking = getRanking(weight);
            const colorClass = getTagColor(ranking);

            return (
              <div
                key={idx}
                className="space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">{tag.tag}</span>
                  <span className="text-xs text-gray-500">
                    {ranking}{ranking === 5 ? '' : ','}
                  </span>
                </div>
                <div className="flex gap-1 items-center">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-2 flex-1 rounded-sm transition-all ${level <= ranking ? colorClass : 'bg-gray-700'
                        }`}
                      title={`Relevance: ${(tag.relevance * 100).toFixed(0)}% | Importance: ${(tag.importance * 100).toFixed(0)}%`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 text-xs text-gray-500 space-y-1">
          <p className="flex items-center gap-2">
            <span className="text-gray-400">■■■■■ = Rank 5 (Highest) | ■ = Rank 1 (Lowest)</span>
          </p>
          <p className="text-gray-600">Based on Importance × Relevance weighted score</p>
        </div>
      </div>
    </div>
  );
};

export default TopicTagCloud;
