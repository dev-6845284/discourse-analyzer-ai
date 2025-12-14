import { SpeakerAnalysisResult } from '../hooks/useTranscriptAnalysis';

export interface SpeakerAnalysisExport {
  version: '1.0';
  exportedAt: string;
  videoId: string;
  results: SpeakerAnalysisResult[];
}

/**
 * Exports speaker analysis data to JSON format
 */
export function exportSpeakerAnalysisAsJson(results: SpeakerAnalysisResult[], videoId: string): string {
  const exportData: SpeakerAnalysisExport = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    videoId,
    results,
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Downloads speaker analysis data as JSON file
 */
export function downloadSpeakerAnalysisJson(results: SpeakerAnalysisResult[], videoId: string): void {
  const json = exportSpeakerAnalysisAsJson(results, videoId);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${videoId}-speakers-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses speaker analysis from JSON text
 */
export function parseSpeakerAnalysisFromJson(jsonText: string): SpeakerAnalysisResult[] {
  try {
    const data: SpeakerAnalysisExport = JSON.parse(jsonText);
    if (!data.results || !Array.isArray(data.results)) {
      throw new Error('Invalid format: missing "results" array');
    }
    return data.results;
  } catch (error: any) {
    throw new Error(`Failed to parse speaker analysis JSON: ${error.message}`);
  }
}
