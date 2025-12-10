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
