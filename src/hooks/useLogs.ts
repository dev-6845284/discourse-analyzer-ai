import { useState, useEffect, useCallback } from 'react';
import { LogEntry } from '../types';
import api from '../utils/api';

export function useLogs(logsVisible: boolean) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const pageSize = 20;

  const fetchLogs = useCallback(async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/logs', {
        params: { page: pageNum, pageSize },
      });
      setLogs(response.data.logs);
      setTotalPages(response.data.pages);
    } catch (e: any) {
      const message = e.response?.data?.message || e.message;
      setError(`Failed to fetch logs: ${message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (logsVisible) {
      fetchLogs(page);
    }
  }, [logsVisible, page, fetchLogs]);

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 1) {
      setPage((p) => p - 1);
    }
  };

  const refreshLogs = () => {
    fetchLogs(page);
  };

  return {
    logs,
    isLoading,
    error,
    page,
    totalPages,
    handleNextPage,
    handlePrevPage,
    refreshLogs,
  };
}
