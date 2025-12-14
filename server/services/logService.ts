import { LogEntry, LogErrorDetails, ModelInteractionLog, LogCommand } from '../types';
import { randomUUID } from 'crypto';

const logs = new Map<string, LogEntry[]>();
const MAX_LOG_ENTRIES_PER_SESSION = 1000; // To prevent unbounded memory usage

const normalizeError = (error?: any): LogErrorDetails | undefined => {
  if (!error) {
    return undefined;
  }

  if (typeof error === 'object') {
    return {
      message: typeof error.message === 'string' ? error.message : JSON.stringify(error),
      stack: typeof error.stack === 'string' ? error.stack : undefined,
      rawResponse:
        (error as any).rawResponse ??
        (error as any).response ??
        (error as any).data ??
        (error as any).body,
      errorType: typeof error.name === 'string' ? error.name : (error as any).errorType,
    };
  }

  return {
    message: String(error),
  };
};

const safeClone = <T>(payload: T): T => {
  if (payload === undefined || payload === null) {
    return payload;
  }
  try {
    return JSON.parse(JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to clone payload for logging. Falling back to original reference.', error);
    return payload;
  }
};

const extractLlmResponseForLogging = (payload: any): any => {
  if (!payload) {
    return payload;
  }

  if (!Array.isArray(payload.candidates)) {
    return safeClone(payload);
  }

  return {
    candidates: payload.candidates.map((candidate: any) => ({
      content: candidate?.content,
      finishReason: candidate?.finishReason,
    })),
  };
};

const ensureSessionLogs = (sessionId: string): LogEntry[] => {
  if (!logs.has(sessionId)) {
    logs.set(sessionId, []);
  }
  return logs.get(sessionId)!;
};

const findEntry = (sessionId: string, entryId: string): LogEntry | undefined => {
  const sessionLogs = logs.get(sessionId);
  if (!sessionLogs) return undefined;
  return sessionLogs.find((log) => log.id === entryId);
};

export const addLogEntry = (sessionId: string, command: LogCommand, requestPayload: any): string => {
  if (!sessionId) {
    console.warn('[LOG_SERVICE] Attempted to add log entry without sessionId. Using "unknown" session.');
    sessionId = 'unknown';
  }
  const sessionLogs = ensureSessionLogs(sessionId);

  const id = randomUUID();
  const entry: LogEntry = {
    id,
    timestamp: new Date().toISOString(),
    command,
    requestPayload: safeClone(requestPayload),
    modelInteractions: [],
  };

  if (sessionLogs.length >= MAX_LOG_ENTRIES_PER_SESSION) {
    sessionLogs.shift(); // Remove the oldest entry for that session
  }
  sessionLogs.push(entry);

  return id;
};

export const updateLogEntry = (
  sessionId: string,
  id: string,
  responsePayload?: any,
  error?: any
): void => {
  if (!sessionId) {
    sessionId = 'unknown';
  }
  const entry = findEntry(sessionId, id);
  if (entry) {
    entry.responsePayload = extractLlmResponseForLogging(responsePayload);
    entry.error = normalizeError(error);
  }
};

export const appendLogRequestPayload = (sessionId: string, id: string, payloadToAppend: Record<string, any>): void => {
  if (!sessionId) {
    sessionId = 'unknown';
  }
  const entry = findEntry(sessionId, id);
  if (entry) {
    entry.requestPayload = { ...entry.requestPayload, ...safeClone(payloadToAppend) };
  }
};

type ModelInteractionInput = {
  provider: string;
  model: string;
  operation: string;
  requestPayload: any;
  metadata?: Record<string, any>;
};

export const addModelInteractionLog = (
  sessionId: string,
  logId: string,
  interaction: ModelInteractionInput
): string | null => {
  if (!sessionId) {
    sessionId = 'unknown';
  }
  const entry = findEntry(sessionId, logId);
  if (!entry) return null;

  const interactionEntry: ModelInteractionLog = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    provider: interaction.provider,
    model: interaction.model,
    operation: interaction.operation,
    requestPayload: safeClone(interaction.requestPayload),
    metadata: interaction.metadata ? safeClone(interaction.metadata) : undefined,
  };

  if (!entry.modelInteractions) {
    entry.modelInteractions = [];
  }

  entry.modelInteractions.push(interactionEntry);
  return interactionEntry.id;
};

export const completeModelInteractionLog = (
  sessionId: string,
  logId: string,
  interactionId: string | null | undefined,
  responsePayload?: any,
  error?: any
): void => {
  if (!interactionId) return;
  if (!sessionId) {
    sessionId = 'unknown';
  }
  const entry = findEntry(sessionId, logId);
  if (!entry || !entry.modelInteractions) return;

  const interaction = entry.modelInteractions.find((item) => item.id === interactionId);
  if (!interaction) return;

  if (responsePayload !== undefined) {
    interaction.responsePayload = extractLlmResponseForLogging(responsePayload);
  }

  interaction.error = normalizeError(error);
  interaction.completedAt = new Date().toISOString();
};

export const getLogs = (
  sessionId: string,
  page: number,
  pageSize: number
): { logs: LogEntry[]; total: number; pages: number } => {
  if (!sessionId) {
    sessionId = 'unknown';
  }
  const sessionLogs = logs.get(sessionId) || [];
  const sortedLogs = [...sessionLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const startIndex = (page - 1) * pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + pageSize);

  return {
    logs: paginatedLogs,
    total: sessionLogs.length,
    pages: Math.ceil(sessionLogs.length / pageSize),
  };
};


