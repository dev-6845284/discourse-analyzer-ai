import { useState, useCallback } from 'react';
import { TranscriptSegment } from '../utils/transcriptHelpers';
import { 
  analyzeSessionTopics, 
  saveSelectedBlocks, 
  analyzeSessionSpeakers, 
  analyzeSessionDialog 
} from '../utils/api';

export interface WeightedTag {
  tag: string;
  relevance: number;
  importance: number;
  frequency: number;
}

export interface SegmentItem {
  timestamp: number; // seconds from start
  endTime?: number; // optional end time
  text: string;
  timingMismatch?: boolean; // true if timing was fuzzy-matched
}

export interface SummaryItem {
  text: string;
  timestamp: string; // Format: "HH:MM:SS" or "N/A"
  importance: number; // decimal, 0.1–1.0
}

export interface TopicAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  text?: string; // deprecated: use segments instead
  segments?: SegmentItem[]; // structured segments with separated timestamps
  mainTopics: string[];
  tags: WeightedTag[];
  summary: string;
  isSelected?: boolean; // For selecting blocks for expensive model analysis
}

export interface SpeakerDialogueLine {
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  timingMismatch?: boolean;
  timestamp?: string; // Formatted time for display (e.g., "HH:MM:SS")
}

export interface SpeakerAnalysisResult {
  blockId: string;
  startTime: number;
  endTime: number;
  dialogue: SpeakerDialogueLine[];
  identifiedSpeakers: string[];
}

export interface DialogLine {
  speaker: string;
  text: string;
  timestamp: number;
  endTime?: number;
  timingMismatch?: boolean;
}

export interface TopicGroup {
  id: string;
  title: string;
  dialogLines: DialogLine[];
  analysis?: {
    summaryItems: SummaryItem[];
  };
}

export interface UseTranscriptAnalysisState {
  isAnalyzing: boolean;
  isSpeakerAnalyzing: boolean;
  isDialogAnalyzing: boolean;
  analysisProgress: number; // 0-100
  results: TopicAnalysisResult[];
  speakerResults: SpeakerAnalysisResult[];
  dialogResults: TopicGroup[];
  selectedBlockIds: Set<string>;
  error: string | null;
}

export function useTranscriptAnalysis(initialData?: {
  topicAnalysis?: TopicAnalysisResult[];
  speakerAnalysis?: SpeakerAnalysisResult[];
  dialogAnalysis?: TopicGroup[];
}) {
  const [state, setState] = useState<UseTranscriptAnalysisState>({
    isAnalyzing: false,
    isSpeakerAnalyzing: false,
    isDialogAnalyzing: false,
    analysisProgress: 0,
    results: initialData?.topicAnalysis || [],
    speakerResults: initialData?.speakerAnalysis || [],
    dialogResults: initialData?.dialogAnalysis || [],
    selectedBlockIds: new Set(),
    error: null,
  });

  /**
   * Start topic analysis for transcript blocks
   * Now uses session-based API - sessionId is required and transcript must already be saved to session
   */
  const analyzeTranscript = useCallback(
    async (
      segments: TranscriptSegment[],
      languageCode: string,
      model: string,
      apiKeys: Record<string, string>,
      sessionId?: string
    ) => {
      if (!sessionId) {
        setState(prev => ({
          ...prev,
          isAnalyzing: false,
          error: 'Session ID is required for topic analysis',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        isAnalyzing: true,
        analysisProgress: 0,
        error: null,
        results: [],
      }));

      try {
        // Call session-based backend API - backend reads transcript from session
        const response = await analyzeSessionTopics(
          sessionId,
          languageCode,
          model || 'gemini',
          apiKeys
        );

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
          error: error.response?.data?.message || error.message || 'Failed to analyze transcript',
          analysisProgress: 0,
        }));
      }
    },
    []
  );

  /**
   * Start speaker analysis for selected blocks
   * Now uses session-based API - saves selected block IDs to session, backend reads data from session
   */
  const analyzeSpeakers = useCallback(
    async (
      languageCode: string,
      model: string,
      apiKeys: Record<string, string>,
      sessionId?: string
    ) => {
      if (!sessionId) {
        setState(prev => ({
          ...prev,
          error: 'Session ID is required for speaker analysis',
        }));
        return;
      }

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
        // First, save selected block IDs to session
        const selectedBlockIds = selectedBlocks.map(block => block.blockId);
        await saveSelectedBlocks(sessionId, selectedBlockIds);

        // Call session-based backend API - backend reads selected blocks from session
        const response = await analyzeSessionSpeakers(
          sessionId,
          languageCode,
          model || 'gemini',
          apiKeys
        );

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
          error: error.response?.data?.message || error.message || 'Failed to analyze speakers',
        }));
      }
    },
    [state.results]
  );

  /**
   * Start dialog analysis (topic segmentation) based on speaker results
   * Now uses session-based API - backend reads speaker analysis from session
   */
  const analyzeDialog = useCallback(
    async (
      languageCode: string,
      fastModel: string,
      betterModel: string,
      apiKeys: Record<string, string>,
      sessionId?: string
    ) => {
      if (!sessionId) {
        setState(prev => ({
          ...prev,
          error: 'Session ID is required for dialog analysis',
        }));
        return;
      }

      // Note: We no longer need to check state.speakerResults since backend reads from session
      // But we keep this check for immediate UI feedback
      if (state.speakerResults.length === 0) {
        setState(prev => ({
          ...prev,
          error: 'No speaker analysis results available for dialog analysis',
        }));
        return;
      }

      setState(prev => ({
        ...prev,
        isDialogAnalyzing: true,
        error: null,
        dialogResults: [],
      }));

      try {
        // Call session-based backend API - backend reads speaker analysis from session
        const response = await analyzeSessionDialog(
          sessionId,
          languageCode,
          fastModel,
          betterModel,
          apiKeys
        );

        const analysisResults: TopicGroup[] = response.data;

        setState(prev => ({
          ...prev,
          dialogResults: analysisResults,
          isDialogAnalyzing: false,
        }));
      } catch (error: any) {
        console.error('Dialog analysis error:', error);
        setState(prev => ({
          ...prev,
          isDialogAnalyzing: false,
          error: error.response?.data?.message || error.message || 'Failed to analyze dialog topics',
        }));
      }
    },
    [state.speakerResults]
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
      dialogResults: [],
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

  /**
   * Set speaker analysis results directly (for import)
   */
  const setSpeakerResults = useCallback((results: SpeakerAnalysisResult[]) => {
    setState(prev => ({
      ...prev,
      speakerResults: results,
      error: null,
    }));
  }, []);

  /**
   * Set full analysis state directly (for import)
   */
  const setFullAnalysisState = useCallback((
    results: TopicAnalysisResult[],
    speakerResults: SpeakerAnalysisResult[],
    dialogResults: TopicGroup[]
  ) => {
    setState(prev => ({
      ...prev,
      results,
      speakerResults,
      dialogResults,
      error: null,
    }));
  }, []);

  /**
   * Rename a speaker globally across all blocks
   * Returns the updated speakerResults for saving
   */
  const renameSpeaker = useCallback((oldName: string, newName: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => ({
        ...block,
        identifiedSpeakers: block.identifiedSpeakers.map(s => s === oldName ? newName : s),
        dialogue: block.dialogue.map(line =>
          line.speaker === oldName ? { ...line, speaker: newName } : line
        ),
      }));
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Add a new speaker globally (to all blocks' identifiedSpeakers list)
   * Returns the updated speakerResults for saving
   */
  const addSpeaker = useCallback((speakerName: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => ({
        ...block,
        identifiedSpeakers: block.identifiedSpeakers.includes(speakerName)
          ? block.identifiedSpeakers
          : [...block.identifiedSpeakers, speakerName],
      }));
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Remove a speaker globally (only if not used in any dialogue lines)
   * Returns the updated speakerResults for saving, or null if speaker is in use
   */
  const removeSpeaker = useCallback((speakerName: string): SpeakerAnalysisResult[] | null => {
    // Check if speaker is used in any dialogue line
    const isUsed = state.speakerResults.some(block =>
      block.dialogue.some(line => line.speaker === speakerName)
    );
    if (isUsed) {
      return null; // Cannot remove speaker that is in use
    }

    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => ({
        ...block,
        identifiedSpeakers: block.identifiedSpeakers.filter(s => s !== speakerName),
      }));
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, [state.speakerResults]);

  /**
   * Update speaker for a specific dialogue line
   * Returns the updated speakerResults for saving
   */
  const updateLineSpeaker = useCallback((blockId: string, lineIndex: number, newSpeaker: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block =>
        block.blockId === blockId
          ? {
              ...block,
              dialogue: block.dialogue.map((line, idx) =>
                idx === lineIndex ? { ...line, speaker: newSpeaker } : line
              ),
              // Add new speaker to identifiedSpeakers if not already present
              identifiedSpeakers: block.identifiedSpeakers.includes(newSpeaker)
                ? block.identifiedSpeakers
                : [...block.identifiedSpeakers, newSpeaker],
            }
          : block
      );
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Get all unique speakers across all blocks
   */
  const getAllSpeakers = useCallback((): string[] => {
    const speakers = new Set<string>();
    state.speakerResults.forEach(block => {
      block.identifiedSpeakers.forEach(s => speakers.add(s));
    });
    return Array.from(speakers).sort();
  }, [state.speakerResults]);

  return {
    ...state,
    analyzeTranscript,
    analyzeSpeakers,
    analyzeDialog,
    toggleBlockSelection,
    clearSelections,
    selectAllBlocks,
    clearAnalysis,
    getSelectedBlocksData,
    setSpeakerResults,
    setFullAnalysisState,
    renameSpeaker,
    addSpeaker,
    removeSpeaker,
    updateLineSpeaker,
    getAllSpeakers,
  };
}
