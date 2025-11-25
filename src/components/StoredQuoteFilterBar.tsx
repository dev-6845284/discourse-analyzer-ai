import React, { useState, useEffect, useRef } from 'react';
import { StoredQuoteFilters } from '../hooks/useStoredQuoteFilters';
import { AnalysisRating, Person } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { usePeople } from '../hooks/usePeople';

// AI providers available for filtering
const AI_PROVIDERS = [
  { value: 'all', label: 'All Providers' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok' },
  { value: 'chatgpt', label: 'ChatGPT' },
];

// Rating options for filtering
const RATING_OPTIONS: { value: AnalysisRating | 'all'; label: string }[] = [
  { value: 'all', label: 'All Ratings' },
  { value: 'None', label: 'None' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Severe', label: 'Severe' },
];

// Language options - extend SUPPORTED_LANGUAGES with 'all' option
const LANGUAGE_OPTIONS = [
  { code: 'all', name: 'All Languages' },
  ...SUPPORTED_LANGUAGES,
];

interface StoredQuoteFilterBarProps {
  filters: StoredQuoteFilters;
  personName: string; // Display name for the person input
  onPersonNameChange: (name: string) => void;
  onPersonSelect: (person: Person | null) => void;
  onFilterChange: <K extends keyof StoredQuoteFilters>(key: K, value: StoredQuoteFilters[K]) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

// Person selector component inline for filters (simplified)
const PersonFilterSelector: React.FC<{
  value: string;
  onChange: (name: string) => void;
  onSelect: (person: Person | null) => void;
}> = ({ value, onChange, onSelect }) => {
  const { people, fetchPeople, isLoading } = usePeople();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    fetchPeople(newValue);
    // Clear the person selection when typing (will need to select from dropdown)
    if (newValue === '') {
      onSelect(null);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (people.length === 0) {
      fetchPeople(value);
    }
  };

  const handleSelect = (person: Person) => {
    onChange(person.name);
    onSelect(person);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    onSelect(null);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2 pr-8"
          placeholder="Filter by person..."
          autoComplete="off"
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            type="button"
          >
            ×
          </button>
        )}
      </div>
      {isOpen && (
        <ul className="absolute z-20 w-full bg-gray-800 shadow-lg max-h-48 rounded-md py-1 text-sm ring-1 ring-gray-600 overflow-auto mt-1">
          {isLoading && <li className="py-2 px-3 text-gray-400">Loading...</li>}
          {!isLoading && people.length === 0 && value && (
            <li className="py-2 px-3 text-gray-500 italic">No people found</li>
          )}
          {!isLoading && people.map((person) => (
            <li
              key={person._id}
              className="cursor-pointer py-2 px-3 hover:bg-cyan-600 hover:text-white text-gray-300"
              onClick={() => handleSelect(person)}
            >
              <span className="block truncate font-medium">{person.name}</span>
              {person.aliases && person.aliases.length > 0 && (
                <span className="block truncate text-xs text-gray-500">
                  {person.aliases.join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const StoredQuoteFilterBar: React.FC<StoredQuoteFilterBarProps> = ({
  filters,
  personName,
  onPersonNameChange,
  onPersonSelect,
  onFilterChange,
  onReset,
  hasActiveFilters,
}) => {
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Filter Quotes</h3>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Reset Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* Text Search */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Search Text</label>
          <input
            type="text"
            value={filters.text}
            onChange={(e) => onFilterChange('text', e.target.value)}
            placeholder="Search quotes..."
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          />
        </div>

        {/* Person Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Person</label>
          <PersonFilterSelector
            value={personName}
            onChange={onPersonNameChange}
            onSelect={onPersonSelect}
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date From</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date To</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          />
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Rating</label>
          <select
            value={filters.rating}
            onChange={(e) => onFilterChange('rating', e.target.value as AnalysisRating | 'all')}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            {RATING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Language Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Language</label>
          <select
            value={filters.language}
            onChange={(e) => onFilterChange('language', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Provider Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">AI Provider</label>
          <select
            value={filters.provider}
            onChange={(e) => onFilterChange('provider', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
