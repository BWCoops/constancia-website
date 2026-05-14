/**
 * FinanceCompass Chatbot API Routes
 * 
 * REST + SSE endpoints for the AI chatbot.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createChildLogger } from '../../lib/logger';

const log = createChildLogger("fc-chatbot-routes");
import { getChatbotService } from './chatbot-service';
import type { ProcessingUpdate } from './types';
import { promptInjectionGuard } from '../../middleware/prompt-injection';

const router = Router();

// Validation schemas
const createSessionSchema = z.object({
  sessionToken: z.string().min(1).max(100),
  assessmentId: z.string().optional(),
  contactId: z.string().optional(),
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(2000),
  responseMode: z.enum(['detailed', 'quick']).optional().default('detailed'),
});

/**
 * POST /api/finance-compass/chatbot/sessions
 * Create or get a chat session
 */
router.post('/sessions', async (req: Request, res: Response) => {
  try {
    const body = createSessionSchema.parse(req.body);
    const service = getChatbotService();
    
    const session = await service.createSession(
      body.sessionToken,
      body.assessmentId,
      body.contactId
    );

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        assessmentId: session.assessmentId,
        contactId: session.contactId,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error creating session");
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid request data' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to create session' });
    }
  }
});

/**
 * GET /api/finance-compass/chatbot/sessions/:token
 * Get session by token
 */
router.get('/sessions/:token', async (req: Request, res: Response) => {
  try {
    const service = getChatbotService();
    const session = await service.getSessionByToken(req.params.token);

    if (!session) {
      res.status(404).json({ success: false, error: 'Session not found' });
      return;
    }

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        assessmentId: session.assessmentId,
        contactId: session.contactId,
        messageCount: session.messageCount,
        createdAt: session.createdAt,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting session");
    res.status(500).json({ success: false, error: 'Failed to get session' });
  }
});

/**
 * GET /api/finance-compass/chatbot/sessions/:sessionId/messages
 * Get conversation history
 */
router.get('/sessions/:sessionId/messages', async (req: Request, res: Response) => {
  try {
    const service = getChatbotService();
    const messages = await service.getConversationHistory(req.params.sessionId, 50);

    res.json({
      success: true,
      data: messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        researchUsed: m.researchUsed,
        sources: m.sourcesCited,
        tier: m.tier,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting messages");
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

/**
 * POST /api/finance-compass/chatbot/sessions/:sessionId/messages
 * Send a message and get response (non-streaming)
 */
router.post('/sessions/:sessionId/messages', promptInjectionGuard(['message']), async (req: Request, res: Response) => {
  try {
    const body = sendMessageSchema.parse(req.body);
    const service = getChatbotService();

    const response = await service.handleMessage(
      req.params.sessionId,
      body.message,
      undefined,
      body.responseMode
    );

    res.json({
      success: true,
      data: {
        message: response.message,
        researchUsed: response.researchUsed,
        sources: response.sources,
        citations: response.citations,
        processingTimeMs: response.processingTimeMs,
        tier: response.tier,
        guardrailTriggered: response.guardrailTriggered,
      },
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error sending message");
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: 'Invalid message' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to process message' });
    }
  }
});

/**
 * POST /api/finance-compass/chatbot/sessions/:sessionId/messages/stream
 * Send a message and get response with SSE streaming for progress updates
 */
router.post('/sessions/:sessionId/messages/stream', promptInjectionGuard(['message']), async (req: Request, res: Response) => {
  log.info({ sessionId: req.params.sessionId }, "Starting stream request");
  
  try {
    const body = sendMessageSchema.parse(req.body);
    const service = getChatbotService();

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // Flush headers immediately
    res.flushHeaders();
    log.info("Headers flushed, starting message handling");

    // Send progress updates
    const onProgress = (update: ProcessingUpdate) => {
      const progressData = JSON.stringify({ type: 'progress', data: update });
      log.info({ stage: update.stage, progress: update.progress }, "Sending progress");
      res.write(`data: ${progressData}\n\n`);
    };

    const response = await service.handleMessage(
      req.params.sessionId,
      body.message,
      onProgress,
      body.responseMode
    );

    log.info({ messageLength: response.message?.length }, "Service returned response");

    // Send final response
    const responseData = {
      type: 'response',
      data: {
        message: response.message,
        researchUsed: response.researchUsed,
        sources: response.sources,
        citations: response.citations,
        processingTimeMs: response.processingTimeMs,
        tier: response.tier,
        guardrailTriggered: response.guardrailTriggered,
        followUpSuggestions: response.followUpSuggestions,
      }
    };
    
    const responseJson = JSON.stringify(responseData);
    log.info({ jsonLength: responseJson.length }, "Sending final response");
    
    res.write(`data: ${responseJson}\n\n`);
    log.info("Response written");
    
    res.write('data: [DONE]\n\n');
    log.info("DONE written, ending stream");
    
    res.end();
    log.info("Stream ended successfully");
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error streaming message");
    res.write(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process message' })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/finance-compass/chatbot/sessions/history
 * Get session history by array of tokens (for chat history feature)
 */
router.post('/sessions/history', async (req: Request, res: Response) => {
  try {
    const { tokens } = req.body;
    
    if (!Array.isArray(tokens) || tokens.length === 0) {
      res.json({ success: true, data: [] });
      return;
    }
    
    // Limit to 50 tokens max
    const limitedTokens = tokens.slice(0, 50);
    const service = getChatbotService();
    const sessions = await service.getSessionsByTokens(limitedTokens);
    
    res.json({
      success: true,
      data: sessions.map(s => ({
        id: s.id,
        sessionToken: s.sessionToken,
        title: s.title,
        messageCount: s.messageCount,
        lastMessageAt: s.lastMessageAt,
        createdAt: s.createdAt,
        assessmentId: s.assessmentId,
      })),
    });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error getting session history");
    res.status(500).json({ success: false, error: 'Failed to get session history' });
  }
});

/**
 * PATCH /api/finance-compass/chatbot/sessions/:sessionId/title
 * Update session title
 */
router.patch('/sessions/:sessionId/title', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;
    
    if (typeof title !== 'string' || title.length > 100) {
      res.status(400).json({ success: false, error: 'Invalid title' });
      return;
    }
    
    const service = getChatbotService();
    await service.updateSessionTitle(req.params.sessionId, title);
    
    res.json({ success: true });
  } catch (error) {
    log.error({ err: error instanceof Error ? error : new Error(String(error)) }, "Error updating session title");
    res.status(500).json({ success: false, error: 'Failed to update session title' });
  }
});

export default router;
