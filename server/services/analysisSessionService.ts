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
