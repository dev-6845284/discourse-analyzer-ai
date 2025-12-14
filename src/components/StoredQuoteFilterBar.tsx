import React, { useState, useEffect, useRef } from 'react';
import { StoredQuoteFilters, SortField, SortOrder } from '../hooks/useStoredQuoteFilters';
import { AnalysisRating, SeverityLevel, Person } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { usePeople } from '../hooks/usePeople';

// AI providers available for filtering
const AI_PROVIDERS = [
  { value: 'all', label: 'All Providers' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'grok', label: 'Grok' },
  { value: 'chatgpt', label: 'ChatGPT' },
];

// Rating/Severity options for filtering (supports both legacy and new formats)
// Values use uppercase to match new SeverityLevel, server normalizes for legacy
const RATING_OPTIONS: { value: SeverityLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All Ratings' },
  { value: 'NONE', label: 'None' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'SEVERE', label: 'Severe' },
];

// Language options - extend SUPPORTED_LANGUAGES with 'all' option
const LANGUAGE_OPTIONS = [
  { code: 'all', name: 'All Languages' },
  ...SUPPORTED_LANGUAGES,
];

// Sort field options
const SORT_FIELD_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'savedAt', label: 'Saved Date' },
  { value: 'analyzedAt', label: 'Analyzed Date' },
  { value: 'improvedAt', label: 'Improved Date' },
  { value: 'date', label: 'Quote Date' },
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
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">Filter & Sort Quotes</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showAdvancedFilters ? 'Hide Advanced' : 'Show Advanced'}
          </button>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
        <span className="text-xs text-gray-400">Sort by:</span>
        <select
          value={filters.sortField}
          onChange={(e) => onFilterChange('sortField', e.target.value as SortField)}
          className="bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-2 py-1"
        >
          {SORT_FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <div className="flex rounded-md bg-gray-700">
          <button
            onClick={() => onFilterChange('sortOrder', 'newest')}
            className={`px-3 py-1 text-xs font-medium transition-colors rounded-l-md ${
              filters.sortOrder === 'newest'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => onFilterChange('sortOrder', 'oldest')}
            className={`px-3 py-1 text-xs font-medium transition-colors rounded-r-md ${
              filters.sortOrder === 'oldest'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Oldest
          </button>
        </div>
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

        {/* Analysis Status Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Analysis Status</label>
          <select
            value={filters.isAnalyzed}
            onChange={(e) => onFilterChange('isAnalyzed', e.target.value as 'all' | 'true' | 'false')}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            <option value="all">All</option>
            <option value="true">Analyzed</option>
            <option value="false">Not Analyzed</option>
          </select>
        </div>

        {/* Improvement Status Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Improvement Status</label>
          <select
            value={filters.isImproved}
            onChange={(e) => onFilterChange('isImproved', e.target.value as 'all' | 'true' | 'false')}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            <option value="all">All</option>
            <option value="true">Improved</option>
            <option value="false">Not Improved</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters - Date Ranges for savedAt, analyzedAt, improvedAt */}
      {showAdvancedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <h4 className="text-xs font-medium text-gray-400 mb-3">Advanced Date Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Saved At Range */}
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <label className="block text-xs text-cyan-400 mb-2 font-medium">Saved Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.savedAtFrom}
                    onChange={(e) => onFilterChange('savedAtFrom', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.savedAtTo}
                    onChange={(e) => onFilterChange('savedAtTo', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Analyzed At Range */}
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <label className="block text-xs text-cyan-400 mb-2 font-medium">Analyzed Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.analyzedAtFrom}
                    onChange={(e) => onFilterChange('analyzedAtFrom', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.analyzedAtTo}
                    onChange={(e) => onFilterChange('analyzedAtTo', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
              </div>
            </div>

            {/* Improved At Range */}
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <label className="block text-xs text-cyan-400 mb-2 font-medium">Improved Date</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.improvedAtFrom}
                    onChange={(e) => onFilterChange('improvedAtFrom', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.improvedAtTo}
                    onChange={(e) => onFilterChange('improvedAtTo', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
