import { LogEntry, LogCommand } from '../types';
import { v4 as uuidv4 } from 'uuid';

const logs: LogEntry[] = [];
const MAX_LOG_ENTRIES = 1000; // To prevent unbounded memory usage

export const addLogEntry = (command: LogCommand, requestPayload: any): string => {
  const id = uuidv4();
  const entry: LogEntry = {
    id,
    timestamp: new Date().toISOString(),
    command,
    requestPayload,
  };

  if (logs.length >= MAX_LOG_ENTRIES) {
    logs.shift(); // Remove the oldest entry
  }
  logs.push(entry);

  return id;
};

export const updateLogEntry = (
  id: string,
  responsePayload?: any,
  error?: any
): void => {
  const entry = logs.find((log) => log.id === id);
  if (entry) {
    entry.responsePayload = responsePayload;
    entry.error = error
      ? {
          message: error.message,
          stack: error.stack,
          rawResponse: error.rawResponse,
          errorType: error.name,
        }
      : undefined;
  }
};

export const appendLogRequestPayload = (id: string, payloadToAppend: { prompt: string }): void => {
  const entry = logs.find((log) => log.id === id);
  if (entry) {
    entry.requestPayload = { ...entry.requestPayload, ...payloadToAppend };
  }
};

export const getLogs = (
  page: number,
  pageSize: number
): { logs: LogEntry[]; total: number; pages: number } => {
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const startIndex = (page - 1) * pageSize;
  const paginatedLogs = sortedLogs.slice(startIndex, startIndex + pageSize);

  return {
    logs: paginatedLogs,
    total: logs.length,
    pages: Math.ceil(logs.length / pageSize),
  };
};
