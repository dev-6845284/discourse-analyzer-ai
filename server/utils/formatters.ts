/**
 * Formats a duration in seconds to HH:MM:SS string.
 * @param seconds Total seconds (can be float)
 * @returns Formatted string "HH:MM:SS"
 */
export function formatTimestamp(seconds: number): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
  
  const totalSeconds = Math.floor(seconds);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');
  
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
