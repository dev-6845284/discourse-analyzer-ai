import AnalysisSession, { IAnalysisSession } from '../models/AnalysisSession';

export const createSession = async (userId: string, sourceUrl: string, sourceType: 'youtube' | 'article' | 'text'): Promise<IAnalysisSession> => {
  const session = new AnalysisSession({
    userId,
    sourceUrl,
    sourceType,
    status: 'created'
  });
  return await session.save();
};

export const getSession = async (sessionId: string): Promise<IAnalysisSession | null> => {
  return await AnalysisSession.findById(sessionId);
};

export const getSessionsByUser = async (userId: string): Promise<IAnalysisSession[]> => {
  return await AnalysisSession.find({ userId }).sort({ updatedAt: -1 });
};

export const updateSessionStep = async (
  sessionId: string, 
  step: 'transcript' | 'transcriptBlocks' | 'topicAnalysis' | 'speakerAnalysis' | 'dialogAnalysis', 
  data: any,
  status: IAnalysisSession['status']
): Promise<IAnalysisSession | null> => {
  const update: any = { status };
  update[step] = data;
  
  return await AnalysisSession.findByIdAndUpdate(sessionId, update, { new: true });
};

export const updateSessionStatus = async (sessionId: string, status: IAnalysisSession['status'], error?: string): Promise<IAnalysisSession | null> => {
  const update: any = { status };
  if (error) {
    update.error = error;
  }
  return await AnalysisSession.findByIdAndUpdate(sessionId, update, { new: true });
};

export const updateSelectedBlockIds = async (sessionId: string, selectedBlockIds: string[]): Promise<IAnalysisSession | null> => {
  return await AnalysisSession.findByIdAndUpdate(
    sessionId,
    { selectedBlockIds },
    { new: true }
  );
};

export const getSessionTranscript = async (sessionId: string): Promise<{
  segments: Array<{ start: number; duration: number; text: string }>;
  videoId: string;
  languageCode: string;
} | null> => {
  const session = await AnalysisSession.findById(sessionId).select('transcript');
  if (!session || !session.transcript || !session.transcript.segments) {
    return null;
  }
  return {
    segments: session.transcript.segments,
    videoId: session.transcript.videoId,
    languageCode: session.transcript.languageCode,
  };
};

export const getSessionTopicAnalysis = async (sessionId: string): Promise<{
  topicAnalysis: IAnalysisSession['topicAnalysis'];
  selectedBlockIds: string[];
  transcriptBlocks: IAnalysisSession['transcriptBlocks'];
} | null> => {
  const session = await AnalysisSession.findById(sessionId).select('topicAnalysis selectedBlockIds transcriptBlocks');
  if (!session) {
    return null;
  }
  return {
    topicAnalysis: session.topicAnalysis || [],
    selectedBlockIds: session.selectedBlockIds || [],
    transcriptBlocks: session.transcriptBlocks || [],
  };
};

export const getSessionSpeakerAnalysis = async (sessionId: string): Promise<{
  speakerAnalysis: IAnalysisSession['speakerAnalysis'];
} | null> => {
  const session = await AnalysisSession.findById(sessionId).select('speakerAnalysis');
  if (!session) {
    return null;
  }
  return {
    speakerAnalysis: session.speakerAnalysis || [],
  };
};

export const deleteSession = async (sessionId: string): Promise<IAnalysisSession | null> => {
  return await AnalysisSession.findByIdAndDelete(sessionId);
};

/**
 * Merge multiple speakers into a single target speaker.
 * Updates all dialogue lines to reference the target speaker and removes merged speakers.
 * Preserves existing Person links from the target speaker.
 */
export const mergeSpeakers = async (
  sessionId: string,
  speakerIdsToMerge: string[],
  targetSpeakerId: string
): Promise<IAnalysisSession | null> => {
  const session = await AnalysisSession.findById(sessionId);
  if (!session || !session.speakerAnalysis) {
    return null;
  }

  // Validate that targetSpeakerId is in the merge list
  if (!speakerIdsToMerge.includes(targetSpeakerId)) {
    throw new Error('Target speaker ID must be one of the speakers to merge');
  }

  // Get IDs to remove (all except target)
  const idsToRemove = speakerIdsToMerge.filter(id => id !== targetSpeakerId);

  // Find target speaker globally across all blocks to get their full info
  let targetSpeaker: any = null;
  for (const block of session.speakerAnalysis) {
    const found = (block as any).speakers?.find((s: any) => s.id === targetSpeakerId);
    if (found) {
      targetSpeaker = found;
      break;
    }
  }

  if (!targetSpeaker) {
    throw new Error('Target speaker not found in any block');
  }

  const targetName = targetSpeaker.name;

  // Update each block's speakerAnalysis
  const updatedSpeakerAnalysis = session.speakerAnalysis.map((block: any) => {
    // Update dialogue lines: change speakerId to target for all merged speakers
    const updatedDialogue = block.dialogue.map((line: any) => {
      if (idsToRemove.includes(line.speakerId)) {
        return {
          ...line,
          speakerId: targetSpeakerId,
          speaker: targetName,
        };
      }
      return line;
    });

    // Check if target speaker exists in this block
    const hasTargetSpeaker = block.speakers?.some((s: any) => s.id === targetSpeakerId);
    
    // Remove merged speakers from speakers array (keep target)
    let updatedSpeakers = block.speakers?.filter((s: any) => !idsToRemove.includes(s.id)) || [];
    
    // If target speaker wasn't in this block but we have dialogue lines that now reference it, add it
    if (!hasTargetSpeaker && updatedDialogue.some((line: any) => line.speakerId === targetSpeakerId)) {
      updatedSpeakers = [...updatedSpeakers, { ...targetSpeaker }];
    }

    // Update identifiedSpeakers (remove names of merged speakers, ensure target name is present)
    const removedNames = block.speakers
      ?.filter((s: any) => idsToRemove.includes(s.id))
      .map((s: any) => s.name) || [];
    let updatedIdentifiedSpeakers = block.identifiedSpeakers.filter(
      (name: string) => !removedNames.includes(name)
    );
    
    // Ensure target name is in identifiedSpeakers if there are dialogue lines for it
    if (!updatedIdentifiedSpeakers.includes(targetName) && 
        updatedDialogue.some((line: any) => line.speakerId === targetSpeakerId)) {
      updatedIdentifiedSpeakers = [...updatedIdentifiedSpeakers, targetName];
    }

    return {
      ...block,
      dialogue: updatedDialogue,
      speakers: updatedSpeakers,
      identifiedSpeakers: updatedIdentifiedSpeakers,
    };
  });

  // Save the updated speaker analysis
  session.speakerAnalysis = updatedSpeakerAnalysis;
  return await session.save();
};
