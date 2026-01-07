import React, { useState, useEffect, useRef } from 'react';
import { StoredQuoteFilters, SortField, SortOrder } from '../hooks/useStoredQuoteFilters';
import { AnalysisRating, SeverityLevel, Person } from '../types';
import { SUPPORTED_LANGUAGES } from '../constants';
import { usePeople } from '../hooks/usePeople';
import { useI18n } from '../i18n';

// AI providers available for filtering (labels are translated at render time)
const AI_PROVIDERS = [
  { value: 'all', labelKey: 'allProviders' },
  { value: 'gemini', labelKey: 'provider_Gemini' },
  { value: 'grok', labelKey: 'provider_Grok' },
  { value: 'openai', labelKey: 'provider_ChatGPT' },
];

// Rating/Severity options for filtering (supports both legacy and new formats)
// Values use uppercase to match new SeverityLevel, server normalizes for legacy
const getRatingOptions = (t: (key: string) => string) => [
  { value: 'all', label: t('all') + ' ' + t('ratingLabel') },
  { value: 'NONE', label: t('severity_NONE') },
  { value: 'LOW', label: t('severity_LOW') },
  { value: 'MEDIUM', label: t('severity_MEDIUM') },
  { value: 'HIGH', label: t('severity_HIGH') },
  { value: 'SEVERE', label: t('severity_SEVERE') },
];

// Language options - extend SUPPORTED_LANGUAGES with 'all' option
const LANGUAGE_OPTIONS = [
  { code: 'all', nameKey: 'allLanguages' },
  ...SUPPORTED_LANGUAGES,
];

// Sort field options (labels translated at render time)
const SORT_FIELD_OPTIONS: { value: SortField; labelKey: string }[] = [
  { value: 'savedAt', labelKey: 'savedDate' },
  { value: 'analyzedAt', labelKey: 'analyzedDate' },
  { value: 'improvedAt', labelKey: 'improvedDate' },
  { value: 'date', labelKey: 'quoteDate' },
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
  const { t } = useI18n();

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
          placeholder={t('filterByPersonPlaceholder')}
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
          {isLoading && <li className="py-2 px-3 text-gray-400">{t('loading')}</li>}
          {!isLoading && people.length === 0 && value && (
            <li className="py-2 px-3 text-gray-500 italic">{t('noPeopleFound')}</li>
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

  const { t } = useI18n();
  const RATING_OPTIONS = getRatingOptions(t);

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">{t('filterSortQuotes')}</h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {showAdvancedFilters ? t('hideAdvanced') : t('showAdvanced')}
          </button>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              {t('resetFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Sorting Controls */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-700/50">
        <span className="text-xs text-gray-400">{t('sortByLabel')}</span>
        <select
          value={filters.sortField}
          onChange={(e) => onFilterChange('sortField', e.target.value as SortField)}
          className="bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-2 py-1"
        >
          {SORT_FIELD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
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
            {t('newest')}
          </button>
          <button
            onClick={() => onFilterChange('sortOrder', 'oldest')}
            className={`px-3 py-1 text-xs font-medium transition-colors rounded-r-md ${
              filters.sortOrder === 'oldest'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            {t('oldest')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {/* Text Search */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('searchText')}</label>
          <input
            type="text"
            value={filters.text}
            onChange={(e) => onFilterChange('text', e.target.value)}
            placeholder={t('searchText')}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          />
        </div>

        {/* Person Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('personLabel')}</label>
          <PersonFilterSelector
            value={personName}
            onChange={onPersonNameChange}
            onSelect={onPersonSelect}
          />
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('dateFrom')}</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onFilterChange('dateFrom', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('dateTo')}</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onFilterChange('dateTo', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          />
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('ratingLabel')}</label>
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
          <label className="block text-xs text-gray-400 mb-1">{t('languageLabel')}</label>
          <select
            value={filters.language}
            onChange={(e) => onFilterChange('language', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            {LANGUAGE_OPTIONS.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {'nameKey' in lang ? t(lang.nameKey) : lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Provider Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('providerLabel')}</label>
          <select
            value={filters.provider}
            onChange={(e) => onFilterChange('provider', e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            {AI_PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>
                {t((p as any).labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Analysis Status Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('analysisStatus')}</label>
          <select
            value={filters.isAnalyzed}
            onChange={(e) => onFilterChange('isAnalyzed', e.target.value as 'all' | 'true' | 'false')}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            <option value="all">{t('all')}</option>
            <option value="true">{t('analyzed')}</option>
            <option value="false">{`Not ${t('analyzed')}`}</option>
          </select>
        </div>

        {/* Improvement Status Filter */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">{t('improvementStatus')}</label>
          <select
            value={filters.isImproved}
            onChange={(e) => onFilterChange('isImproved', e.target.value as 'all' | 'true' | 'false')}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm px-3 py-2"
          >
            <option value="all">{t('all')}</option>
            <option value="true">{t('improved')}</option>
            <option value="false">{`Not ${t('improved')}`}</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters - Date Ranges for savedAt, analyzedAt, improvedAt */}
      {showAdvancedFilters && (
        <div className="mt-4 pt-4 border-t border-gray-700/50">
          <h4 className="text-xs font-medium text-gray-400 mb-3">{t('advancedDateFilters')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Saved At Range */}
            <div className="bg-gray-700/30 p-3 rounded-lg">
              <label className="block text-xs text-cyan-400 mb-2 font-medium">{t('savedDate')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
              <label className="block text-[10px] text-gray-500 mb-1">{t('from')}</label>
                  <input
                    type="date"
                    value={filters.savedAtFrom}
                    onChange={(e) => onFilterChange('savedAtFrom', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">{t('to')}</label>
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
              <label className="block text-xs text-cyan-400 mb-2 font-medium">{t('analyzedDate')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">{t('from')}</label>
                  <input
                    type="date"
                    value={filters.analyzedAtFrom}
                    onChange={(e) => onFilterChange('analyzedAtFrom', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">{t('to')}</label>
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
              <label className="block text-xs text-cyan-400 mb-2 font-medium">{t('improvedDate')}</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">{t('from')}</label>
                  <input
                    type="date"
                    value={filters.improvedAtFrom}
                    onChange={(e) => onFilterChange('improvedAtFrom', e.target.value)}
                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 mb-1">{t('to')}</label>
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
