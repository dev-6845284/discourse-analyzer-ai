import { TopicAnalysisResult, SpeakerAnalysisResult, TopicGroup } from '../hooks/useTranscriptAnalysis';

export interface FullAnalysisData {
  version: number;
  timestamp: string;
  videoId?: string;
  results: TopicAnalysisResult[];
  speakerResults: SpeakerAnalysisResult[];
  dialogResults: TopicGroup[];
}

/**
 * Downloads the full analysis state as a JSON file
 */
export const downloadAnalysisJson = (
  data: FullAnalysisData,
  filenamePrefix: string = 'analysis'
) => {
  const filename = `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.json`;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parses the full analysis state from a JSON file
 */
export const parseAnalysisFromJson = async (file: File): Promise<FullAnalysisData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        // Basic validation
        if (!json.results && !json.speakerResults && !json.dialogResults) {
          throw new Error('Invalid analysis file format');
        }
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};
