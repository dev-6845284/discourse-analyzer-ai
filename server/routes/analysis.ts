import express from 'express';
import * as analysisSessionService from '../services/analysisSessionService';
import * as contentAnalysisService from '../services/contentAnalysisService';
import { isAuthenticated } from '../middleware/auth';
import { extractTranscriptTopics } from '../services/dialogAnalysis/topicExtractorService';
import { identifySpeakers } from '../services/dialogAnalysis/speakerIdentificationService';
import { analyzeDialogTopics as analyzeDialogTopicsService } from '../services/dialogAnalysis';
import { groupTranscriptByTime } from '../services/dialogAnalysis/transcriptGrouper';
import { addLogEntry, updateLogEntry } from '../services/logService';

const router = express.Router();

router.use(isAuthenticated);

// Create a new analysis session
router.post('/sessions', async (req, res) => {
  try {
    const { sourceUrl, sourceType } = req.body;
    const userId = req.session.user!._id as string;
    const session = await analysisSessionService.createSession(userId, sourceUrl, sourceType);
    res.json(session);
  } catch (error) {
    console.error('Error creating analysis session:', error);
    res.status(500).json({ message: 'Failed to create analysis session' });
  }
});

// Get all sessions for the current user
router.get('/sessions', async (req, res) => {
  try {
    const userId = req.session.user!._id as string;
    const sessions = await analysisSessionService.getSessionsByUser(userId);
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching analysis sessions:', error);
    res.status(500).json({ message: 'Failed to fetch analysis sessions' });
  }
});

// Get a specific session
router.get('/sessions/:id', async (req, res) => {
  try {
    const session = await analysisSessionService.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching analysis session:', error);
    res.status(500).json({ message: 'Failed to fetch analysis session' });
  }
});

// Update session step (manually if needed, or for resuming/saving state from frontend)
router.put('/sessions/:id/step', async (req, res) => {
  try {
    const { step, data, status } = req.body;
    const sessionId = req.params.id;
    
    const session = await analysisSessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const updatedSession = await analysisSessionService.updateSessionStep(sessionId, step, data, status);
    res.json(updatedSession);
  } catch (error) {
    console.error('Error updating analysis session step:', error);
    res.status(500).json({ message: 'Failed to update analysis session step' });
  }
});

// Delete a session
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionId = req.params.id;
    const session = await analysisSessionService.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await analysisSessionService.deleteSession(sessionId);
    res.json({ message: 'Session deleted successfully' });
  } catch (error) {
    console.error('Error deleting analysis session:', error);
    res.status(500).json({ message: 'Failed to delete analysis session' });
  }
});

// Promote session to content analysis
router.post('/promote', async (req, res) => {
  try {
    const { sessionId, quoteGroups, languageCode } = req.body;
    const userId = req.session.user!._id as string;
    
    const result = await contentAnalysisService.promoteSession(sessionId, quoteGroups, userId, languageCode);
    res.json(result);
  } catch (error) {
    console.error('Error promoting session:', error);
    res.status(500).json({ message: 'Failed to promote session' });
  }
});

// Update quotes for content analysis
router.post('/content/:id/update-quotes', async (req, res) => {
  try {
    const { quoteGroups } = req.body;
    const contentAnalysisId = req.params.id;
    const userId = req.session.user!._id as string;
    
    const result = await contentAnalysisService.updateQuotes(contentAnalysisId, quoteGroups, userId);
    res.json(result);
  } catch (error) {
    console.error('Error updating quotes:', error);
    res.status(500).json({ message: 'Failed to update quotes' });
  }
});

// Get content analysis
router.get('/content/:id', async (req, res) => {
  try {
    const contentAnalysis = await contentAnalysisService.getContentAnalysis(req.params.id);
    if (!contentAnalysis) {
      return res.status(404).json({ message: 'Content analysis not found' });
    }
    if (contentAnalysis.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    res.json(contentAnalysis);
  } catch (error) {
    console.error('Error fetching content analysis:', error);
    res.status(500).json({ message: 'Failed to fetch content analysis' });
  }
});

// Update source for a single quote
router.post('/update-quote-source', async (req, res) => {
  try {
    const { quoteId, contentAnalysisId, statementIds } = req.body;
    const userId = req.session.user!._id as string;
    
    const result = await contentAnalysisService.updateQuoteSource(quoteId, contentAnalysisId, statementIds, userId);
    res.json(result);
  } catch (error) {
    console.error('Error updating quote source:', error);
    res.status(500).json({ message: 'Failed to update quote source' });
  }
});

// ============================
// Session-based Analysis Endpoints
// ============================

// Analyze topics from session transcript (Step 1)
router.post('/sessions/:id/analyze-topics', async (req, res) => {
  const sessionId = req.params.id;
  const { language, model, apiKeys } = req.body;

  try {
    // Get session and verify ownership
    const session = await analysisSessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get transcript from session
    const transcriptData = await analysisSessionService.getSessionTranscript(sessionId);
    if (!transcriptData || !transcriptData.segments || transcriptData.segments.length === 0) {
      return res.status(400).json({ message: 'Session has no transcript data. Save transcript first.' });
    }

    if (!apiKeys || typeof apiKeys !== 'object') {
      return res.status(400).json({ message: 'API keys are required' });
    }

    // Update status
    await analysisSessionService.updateSessionStatus(sessionId, 'analyzing_topics');

    // Group segments into blocks
    const blocks = groupTranscriptByTime(transcriptData.segments, 5);

    // Save the blocks used for analysis
    await analysisSessionService.updateSessionStep(sessionId, 'transcriptBlocks', blocks, 'analyzing_topics');

    console.log(`[TopicAnalysis] Session ${sessionId}: Analyzing ${blocks.length} transcript blocks with model: ${model || 'gemini'}`);

    const results = await extractTranscriptTopics({
      blocks,
      language: language || transcriptData.languageCode || 'lt',
      model: model || 'gemini',
      apiKeys,
    });

    await analysisSessionService.updateSessionStep(sessionId, 'topicAnalysis', results, 'analyzing_topics');

    console.log(`[TopicAnalysis] Session ${sessionId}: Successfully analyzed ${results.length} blocks`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing transcript topics:', error);
    await analysisSessionService.updateSessionStatus(sessionId, 'failed', error.message);
    res.status(500).json({
      message: error.message || 'Failed to analyze transcript topics',
      details: error.stack
    });
  }
});

// Update selected block IDs for speaker analysis
router.put('/sessions/:id/selected-blocks', async (req, res) => {
  const sessionId = req.params.id;
  const { selectedBlockIds } = req.body;

  try {
    const session = await analysisSessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (!Array.isArray(selectedBlockIds)) {
      return res.status(400).json({ message: 'selectedBlockIds must be an array' });
    }

    const updatedSession = await analysisSessionService.updateSelectedBlockIds(sessionId, selectedBlockIds);
    res.json({ selectedBlockIds: updatedSession?.selectedBlockIds || [] });
  } catch (error) {
    console.error('Error updating selected blocks:', error);
    res.status(500).json({ message: 'Failed to update selected blocks' });
  }
});

// Analyze speakers from session data (Step 2)
router.post('/sessions/:id/analyze-speakers', async (req, res) => {
  const sessionId = req.params.id;
  const { language, model, apiKeys } = req.body;

  let logId: string | undefined;

  try {
    // Get session and verify ownership
    const session = await analysisSessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get topic analysis data from session
    const analysisData = await analysisSessionService.getSessionTopicAnalysis(sessionId);
    if (!analysisData || !analysisData.topicAnalysis || analysisData.topicAnalysis.length === 0) {
      return res.status(400).json({ message: 'Session has no topic analysis data. Run topic analysis first.' });
    }

    if (!analysisData.selectedBlockIds || analysisData.selectedBlockIds.length === 0) {
      return res.status(400).json({ message: 'No blocks selected for speaker analysis. Select blocks first.' });
    }

    if (!apiKeys || typeof apiKeys !== 'object') {
      return res.status(400).json({ message: 'API keys are required' });
    }

    // Filter blocks to only include selected ones
    const selectedBlocks = analysisData.transcriptBlocks.filter(block => 
      analysisData.selectedBlockIds.includes(block.blockId)
    );

    if (selectedBlocks.length === 0) {
      return res.status(400).json({ message: 'No matching blocks found for selected IDs' });
    }

    await analysisSessionService.updateSessionStatus(sessionId, 'identifying_speakers');
    logId = addLogEntry(sessionId, 'identify-speakers', {
      blocksCount: selectedBlocks.length,
      language,
      model
    });

    console.log(`[SpeakerAnalysis] Session ${sessionId}: Analyzing ${selectedBlocks.length} transcript blocks with model: ${model || 'gemini'}`);

    const results = await identifySpeakers({
      blocks: selectedBlocks,
      language: language || 'lt',
      model: model || 'gemini',
      apiKeys,
      sessionId,
      logId,
    });

    if (logId) {
      updateLogEntry(sessionId, logId, { resultsCount: results.length });
    }
    await analysisSessionService.updateSessionStep(sessionId, 'speakerAnalysis', results, 'identifying_speakers');

    console.log(`[SpeakerAnalysis] Session ${sessionId}: Successfully analyzed ${results.length} blocks`);
    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing transcript speakers:', error);
    if (logId) {
      updateLogEntry(sessionId, logId, undefined, error);
    }
    await analysisSessionService.updateSessionStatus(sessionId, 'failed', error.message);
    res.status(500).json({
      message: error.message || 'Failed to analyze transcript speakers',
      details: error.stack
    });
  }
});

// Analyze dialog topics from session data (Step 3)
router.post('/sessions/:id/analyze-dialog', async (req, res) => {
  const sessionId = req.params.id;
  const { language, fastModel, betterModel, apiKeys } = req.body;

  let logId: string | undefined;

  try {
    // Get session and verify ownership
    const session = await analysisSessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }
    if (session.userId !== req.session.user!._id as string) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Get speaker analysis data from session
    const speakerData = await analysisSessionService.getSessionSpeakerAnalysis(sessionId);
    if (!speakerData || !speakerData.speakerAnalysis || speakerData.speakerAnalysis.length === 0) {
      return res.status(400).json({ message: 'Session has no speaker analysis data. Run speaker analysis first.' });
    }

    if (!apiKeys || typeof apiKeys !== 'object') {
      return res.status(400).json({ message: 'API keys are required' });
    }

    logId = addLogEntry(req.session.id || sessionId, 'analyze-dialog-topics', {
      dialogBlockCount: speakerData.speakerAnalysis.length,
      language: language || 'lt',
      fastModel,
      betterModel,
    });

    await analysisSessionService.updateSessionStatus(sessionId, 'grouping_dialog');

    console.log(`[DialogAnalysis] Session ${sessionId}: Analyzing dialog with ${speakerData.speakerAnalysis.length} blocks`);

    const results = await analyzeDialogTopicsService({
      dialog: speakerData.speakerAnalysis,
      language: language || 'lt',
      fastModel,
      betterModel,
      apiKeys,
      sessionId: req.session.id || sessionId,
      logId,
    });

    await analysisSessionService.updateSessionStep(sessionId, 'dialogAnalysis', results, 'completed');

    console.log(`[DialogAnalysis] Session ${sessionId}: Successfully analyzed ${results.length} topic groups`);

    if (logId) {
      updateLogEntry(req.session.id || sessionId, logId, {
        topicGroupCount: results.length,
        totalLinesAnalyzed: results.reduce((sum, g) => sum + g.dialogLines.length, 0),
      });
    }

    res.json(results);
  } catch (error: any) {
    console.error('Error analyzing dialog topics:', error);
    if (logId) {
      updateLogEntry(req.session.id || sessionId, logId, undefined, error);
    }
    await analysisSessionService.updateSessionStatus(sessionId, 'failed', error.message);
    res.status(500).json({
      message: error.message || 'Failed to analyze dialog topics',
      details: error.stack
    });
  }
});

export default router;
