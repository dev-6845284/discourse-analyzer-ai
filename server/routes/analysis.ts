import express from 'express';
import * as analysisSessionService from '../services/analysisSessionService';
import * as contentAnalysisService from '../services/contentAnalysisService';
import { isAuthenticated } from '../middleware/auth';

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

export default router;
