import { useState, useCallback } from 'react';
import { TranscriptSegment } from '../utils/transcriptHelpers';
import {
  analyzeSessionTopics,
  saveSelectedBlocks,
  analyzeSessionSpeakers,
  analyzeSessionDialog,
  findSimilarPersons,
  mergeSpeakers as mergeSpeakersApi,
  PersonSimilarityMatch,
  formatApiError
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

export interface Speaker {
  id: string;   // Unique ID (UUID or existing Person ID)
  name: string; // Display name
  personId?: string; // Reference to existing Person record if matched
  personName?: string; // Cached Person name for display
  isExistingPerson?: boolean; // True if matched to existing person
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
  id: string;        // Unique line ID
  speakerId: string; // Reference to Speaker.id
  speaker: string;   // Speaker name (for display)
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
  speakers: Speaker[];          // Array of speaker objects with IDs
  identifiedSpeakers: string[]; // List of speaker names (backwards compatibility)
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
          model || 'gemini'
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
          error: formatApiError(error),
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
      sessionId?: string,
      speakerHint?: string
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

        const response = await analyzeSessionSpeakers(
          sessionId,
          languageCode,
          model || 'gemini',
          speakerHint
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
          error: formatApiError(error),
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
          betterModel
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
          error: formatApiError(error),
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
   * Clear all analysis results
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
   * Clear only topic/statement analysis results
   */
  const clearTopicAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      results: [],
      selectedBlockIds: new Set(),
      analysisProgress: 0,
      error: null,
    }));
  }, []);

  /**
   * Clear only speaker analysis results
   */
  const clearSpeakerAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      speakerResults: [],
      error: null,
    }));
  }, []);

  /**
   * Clear only dialog/group analysis results
   */
  const clearDialogAnalysis = useCallback(() => {
    setState(prev => ({
      ...prev,
      dialogResults: [],
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
   * Rename a speaker by ID globally across all blocks
   * Returns the updated speakerResults for saving
   */
  const renameSpeaker = useCallback((speakerId: string, newName: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => {
        const speaker = block.speakers?.find(s => s.id === speakerId);
        const oldName = speaker?.name || '';
        return {
          ...block,
          speakers: block.speakers?.map(s => s.id === speakerId ? { ...s, name: newName } : s) || [],
          identifiedSpeakers: block.identifiedSpeakers.map(s => s === oldName ? newName : s),
          dialogue: block.dialogue.map(line =>
            line.speakerId === speakerId ? { ...line, speaker: newName } : line
          ),
        };
      });
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Check if there are similar existing persons for a speaker name.
   * Returns array of matches for user confirmation, or empty array if no matches.
   */
  const checkSimilarPersonsForSpeaker = useCallback(async (speakerName: string): Promise<PersonSimilarityMatch[]> => {
    try {
      const response = await findSimilarPersons(speakerName);
      return response.data.matches || [];
    } catch (error) {
      console.error('Error checking for similar persons:', error);
      return [];
    }
  }, []);

  /**
   * Add a new speaker globally (to all blocks' speakers list)
   * If existingPerson is provided, uses that person's ID instead of creating a new one.
   * Returns the updated speakerResults for saving
   */
  const addSpeaker = useCallback((
    speakerName: string,
    existingPerson?: { personId: string; name: string }
  ): SpeakerAnalysisResult[] => {
    const speakerId = existingPerson?.personId || crypto.randomUUID();
    const displayName = existingPerson?.name || speakerName;
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => {
        const speakerExists = block.speakers?.some(s => s.name === displayName || s.id === speakerId) ||
          block.identifiedSpeakers.includes(displayName);
        if (speakerExists) return block;
        return {
          ...block,
          speakers: [...(block.speakers || []), {
            id: speakerId,
            name: displayName,
            personId: existingPerson?.personId,
            isExistingPerson: !!existingPerson
          }],
          identifiedSpeakers: [...block.identifiedSpeakers, displayName],
        };
      });
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Remove a speaker by ID globally (only if not used in any dialogue lines)
   * Returns the updated speakerResults for saving, or null if speaker is in use
   */
  const removeSpeaker = useCallback((speakerId: string): SpeakerAnalysisResult[] | null => {
    // Check if speaker is used in any dialogue line
    const isUsed = state.speakerResults.some(block =>
      block.dialogue.some(line => line.speakerId === speakerId)
    );
    if (isUsed) {
      return null; // Cannot remove speaker that is in use
    }

    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => {
        const speakerToRemove = block.speakers?.find(s => s.id === speakerId);
        return {
          ...block,
          speakers: block.speakers?.filter(s => s.id !== speakerId) || [],
          identifiedSpeakers: speakerToRemove
            ? block.identifiedSpeakers.filter(s => s !== speakerToRemove.name)
            : block.identifiedSpeakers,
        };
      });
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, [state.speakerResults]);

  /**
   * Update speaker for a specific dialogue line by line ID
   * Returns the updated speakerResults for saving
   */
  const updateLineSpeaker = useCallback((blockId: string, lineId: string, newSpeakerId: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => {
        if (block.blockId !== blockId) return block;
        const newSpeaker = block.speakers?.find(s => s.id === newSpeakerId);
        return {
          ...block,
          dialogue: block.dialogue.map(line =>
            line.id === lineId ? { ...line, speakerId: newSpeakerId, speaker: newSpeaker?.name || '' } : line
          ),
        };
      });
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Link a speaker to an existing Person record
   * Also renames the speaker to the person's name, discarding any pseudonym
   * Returns the updated speakerResults for saving
   */
  const linkSpeakerToPerson = useCallback((speakerId: string, personId: string, personName: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => {
        const speaker = block.speakers?.find(s => s.id === speakerId);
        const oldName = speaker?.name || '';
        return {
          ...block,
          // Update speaker with person link AND rename to person's name
          speakers: block.speakers?.map(s =>
            s.id === speakerId
              ? { ...s, personId, personName, isExistingPerson: true, name: personName }
              : s
          ) || [],
          // Update identifiedSpeakers array with new name
          identifiedSpeakers: block.identifiedSpeakers.map(s => s === oldName ? personName : s),
          // Update all dialogue lines with the new speaker name
          dialogue: block.dialogue.map(line =>
            line.speakerId === speakerId ? { ...line, speaker: personName } : line
          ),
        };
      });
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Unlink a speaker from its Person record
   * Returns the updated speakerResults for saving
   */
  const unlinkSpeakerFromPerson = useCallback((speakerId: string): SpeakerAnalysisResult[] => {
    let updatedResults: SpeakerAnalysisResult[] = [];
    setState(prev => {
      updatedResults = prev.speakerResults.map(block => ({
        ...block,
        speakers: block.speakers?.map(s =>
          s.id === speakerId
            ? { ...s, personId: undefined, personName: undefined, isExistingPerson: false }
            : s
        ) || [],
      }));
      return {
        ...prev,
        speakerResults: updatedResults,
      };
    });
    return updatedResults;
  }, []);

  /**
   * Get all unique speakers across all blocks (as Speaker objects)
   */
  const getAllSpeakers = useCallback((): Speaker[] => {
    const speakerMap = new Map<string, Speaker>();
    state.speakerResults.forEach(block => {
      block.speakers?.forEach(s => speakerMap.set(s.id, s));
    });
    return Array.from(speakerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [state.speakerResults]);

  /**
   * Merge multiple speakers into a single target speaker.
   * Calls the backend API, updates local state with the result.
   * Returns updated speakerResults on success.
   */
  const mergeSpeakers = useCallback(async (
    speakerIdsToMerge: string[],
    targetSpeakerId: string,
    sessionId?: string
  ): Promise<SpeakerAnalysisResult[] | null> => {
    if (!sessionId) {
      console.error('Session ID is required for merging speakers');
      return null;
    }
    if (speakerIdsToMerge.length < 2) {
      console.error('At least 2 speakers are required for merging');
      return null;
    }
    if (!speakerIdsToMerge.includes(targetSpeakerId)) {
      console.error('Target speaker must be one of the speakers to merge');
      return null;
    }

    try {
      const response = await mergeSpeakersApi(sessionId, speakerIdsToMerge, targetSpeakerId);
      const updatedResults: SpeakerAnalysisResult[] = response.data;
      // console.log('[mergeSpeakers] API response:', updatedResults);
      // console.log('[mergeSpeakers] Number of blocks:', updatedResults?.length);
      setState(prev => {
        // console.log('[mergeSpeakers] Previous speakerResults:', prev.speakerResults?.length);
        return {
          ...prev,
          speakerResults: updatedResults,
        };
      });
      return updatedResults;
    } catch (error: any) {
      console.error('Error merging speakers:', error);
      setState(prev => ({
        ...prev,
        error: formatApiError(error),
      }));
      return null;
    }
  }, []);

  return {
    ...state,
    analyzeTranscript,
    analyzeSpeakers,
    analyzeDialog,
    toggleBlockSelection,
    clearSelections,
    selectAllBlocks,
    clearAnalysis,
    clearTopicAnalysis,
    clearSpeakerAnalysis,
    clearDialogAnalysis,
    getSelectedBlocksData,
    setSpeakerResults,
    setFullAnalysisState,
    renameSpeaker,
    addSpeaker,
    checkSimilarPersonsForSpeaker,
    removeSpeaker,
    updateLineSpeaker,
    linkSpeakerToPerson,
    unlinkSpeakerFromPerson,
    getAllSpeakers,
    mergeSpeakers,
  };
}
