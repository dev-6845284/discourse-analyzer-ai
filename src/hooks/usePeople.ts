import { useState, useCallback } from 'react';
import api from '../utils/api';
import { Person } from '../types';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPeople = useCallback(async (search?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/people', { params: { search } });
      setPeople(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch people');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPerson = useCallback(async (personData: Partial<Person>) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post('/people', personData);
      setPeople((prev) => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      setError(err.message || 'Failed to create person');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    people,
    isLoading,
    error,
    fetchPeople,
    createPerson,
  };
}
