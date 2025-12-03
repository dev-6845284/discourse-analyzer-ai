import { useState, useCallback } from 'react';
import { TranscriptSegment } from '../utils/transcriptGrouper';
import api from '../utils/api';

export interface WeightedTag {
  tag: string;
  relevance: number;
  importance: number;
  frequency: number;
}

export interface TopicAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  text: string;
  mainTopics: string[];
  tags: WeightedTag[];
  summary: string;
  isSelected?: boolean; // For selecting blocks for expensive model analysis
}

export interface SpeakerAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  dialogue: Array<{
    speaker: string;
    text: string;
  }>;
  identifiedSpeakers: string[];
}

export interface UseTranscriptAnalysisState {
  isAnalyzing: boolean;
  isSpeakerAnalyzing: boolean;
  analysisProgress: number; // 0-100
  results: TopicAnalysisResult[];
  speakerResults: SpeakerAnalysisResult[];
  selectedBlockIds: Set<string>;
  error: string | null;
}

export function useTranscriptAnalysis() {
  const [state, setState] = useState<UseTranscriptAnalysisState>({
    isAnalyzing: false,
    isSpeakerAnalyzing: false,
    analysisProgress: 0,
    results: [],
    speakerResults: [],
    selectedBlockIds: new Set(),
    error: null,
  });

  /**
   * Start topic analysis for transcript blocks
   */
  const analyzeTranscript = useCallback(
    async (
      segments: TranscriptSegment[],
      languageCode: string,
      model: string,
      apiKeys: Record<string, string>
    ) => {
      setState(prev => ({
        ...prev,
        isAnalyzing: true,
        analysisProgress: 0,
        error: null,
        results: [],
      }));

      try {
        // Group segments into blocks
        const { groupTranscriptByTime } = await import('../utils/transcriptGrouper');
        const blocks = groupTranscriptByTime(segments, 15, 'preview');

        if (blocks.length === 0) {
          setState(prev => ({
            ...prev,
            isAnalyzing: false,
            error: 'No transcript segments to analyze',
          }));
          return;
        }

        // Prepare blocks for analysis
        const blocksForAnalysis = blocks.map(block => ({
          blockId: block.blockId,
          startTime: block.startTime,
          endTime: block.endTime,
          text: block.text,
        }));

        // Call backend API
        const response = await api.post('/quotes/analyze-transcript-topics', {
          blocks: blocksForAnalysis,
          language: languageCode,
          model: model || 'gemini',
          apiKeys,
        });

        const analysisResults: TopicAnalysisResult[] = response.data;

        setState(prev => ({
          ...prev,
          results: analysisResults.map(r => ({ ...r, isSelected: false })),
          analysisProgress: 100,
          isAnalyzing: false,
        }));
      } catch (error: any) {
        console.error('Transcript analysis error:', error);
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          error: error.message || 'Failed to analyze transcript',
          analysisProgress: 0,
        }));
      }
    },
    []
  );

  /**
   * Start speaker analysis for selected blocks
   */
  const analyzeSpeakers = useCallback(
    async (
      languageCode: string,
      model: string,
      apiKeys: Record<string, string>
    ) => {
      const selectedBlocks = state.results.filter(r => r.isSelected);
      
      if (selectedBlocks.length === 0) {
        setState(prev => ({
          ...prev,
          error: 'No blocks selected for speaker analysis',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        isSpeakerAnalyzing: true,
        error: null,
        speakerResults: [],
      }));

      try {
        // Prepare blocks for analysis
        const blocksForAnalysis = selectedBlocks.map(block => ({
          blockId: block.blockId,
          startTime: block.startTime,
          endTime: block.endTime,
          text: block.text,
        }));

        // Call backend API
        const response = await api.post('/quotes/analyze-transcript-speakers', {
          blocks: blocksForAnalysis,
          language: languageCode,
          model: model || 'gemini',
          apiKeys,
        });

        const analysisResults: SpeakerAnalysisResult[] = response.data;

        setState(prev => ({
          ...prev,
          speakerResults: analysisResults,
          isSpeakerAnalyzing: false,
        }));
      } catch (error: any) {
        console.error('Speaker analysis error:', error);
        setState(prev => ({
          ...prev,
          isSpeakerAnalyzing: false,
          error: error.message || 'Failed to analyze speakers',
        }));
      }
    },
    [state.results]
  );

  /**
   * Toggle selection of a block for expensive model analysis
   */
  const toggleBlockSelection = useCallback((blockId: string) => {
    setState(prev => ({
      ...prev,
      selectedBlockIds: new Set(
        prev.selectedBlockIds.has(blockId)
          ? [...prev.selectedBlockIds].filter(id => id !== blockId)
          : [...prev.selectedBlockIds, blockId]
      ),
      results: prev.results.map(r =>
        r.blockId === blockId ? { ...r, isSelected: !r.isSelected } : r
      ),
    }));
  }, []);

  /**
   * Clear all selections
   */
  const clearSelections = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBlockIds: new Set(),
      results: prev.results.map(r => ({ ...r, isSelected: false })),
    }));
  }, []);

  /**
   * Select all blocks
   */
  const selectAllBlocks = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedBlockIds: new Set(prev.results.map(r => r.blockId)),
      results: prev.results.map(r => ({ ...r, isSelected: true })),
    }));
  }, []);

  /**
   * Clear analysis results
   */
  const clearAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      speakerResults: [],
      selectedBlockIds: new Set(),
      analysisProgress: 0,
      error: null,
    }));
  }, []);

  /**
   * Get selected blocks with their segments
   */
  const getSelectedBlocksData = useCallback(() => {
    return state.results.filter(r => r.isSelected);
  }, [state.results]);

  return {
    ...state,
    analyzeTranscript,
    analyzeSpeakers,
    toggleBlockSelection,
    clearSelections,
    selectAllBlocks,
    clearAnalysis,
    getSelectedBlocksData,
  };
}
