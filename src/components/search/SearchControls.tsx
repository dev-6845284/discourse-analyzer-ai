import React, { useState } from 'react';
import { PersonSelector } from '../people/PersonSelector';
import Spinner from '../Spinner';
import { SUPPORTED_LANGUAGES } from '../../constants';

interface SearchControlsProps {
  searchParams: {
    personName: string;
    setPersonName: (name: string) => void;
    selectedAI: string;
    handleAISelectionChange: (ai: string) => void;
    resultCount: number;
    setResultCount: (count: number) => void;
    temperature: number;
    setTemperature: (temp: number) => void;
    maxQuoteLength: number;
    setMaxQuoteLength: (len: number) => void;
  };
  dateFilters: {
    savedAtFrom: string;
    setSavedAtFrom: (date: string) => void;
    savedAtTo: string;
    setSavedAtTo: (date: string) => void;
    analyzedAtFrom: string;
    setAnalyzedAtFrom: (date: string) => void;
    analyzedAtTo: string;
    setAnalyzedAtTo: (date: string) => void;
    improvedAtFrom: string;
    setImprovedAtFrom: (date: string) => void;
    improvedAtTo: string;
    setImprovedAtTo: (date: string) => void;
  };
  timePeriod: {
    type: string;
    value: number;
    customDateFrom: string;
    customDateTo: string;
    handleTypeChange: (type: any) => void;
    handleValueChange: (val: number) => void;
    setCustomDateFrom: (date: string) => void;
    setCustomDateTo: (date: string) => void;
    description: string;
  };
  languages: {
    selected: string[];
    onChange: (code: string) => void;
  };
  onSearch: () => void;
  isLoading: boolean;
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  searchParams,
  dateFilters,
  timePeriod,
  languages,
  onSearch,
  isLoading,
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const hasAdvancedFilters = dateFilters.savedAtFrom || dateFilters.savedAtTo ||
    dateFilters.analyzedAtFrom || dateFilters.analyzedAtTo ||
    dateFilters.improvedAtFrom || dateFilters.improvedAtTo;

  const clearAdvancedFilters = () => {
    dateFilters.setSavedAtFrom('');
    dateFilters.setSavedAtTo('');
    dateFilters.setAnalyzedAtFrom('');
    dateFilters.setAnalyzedAtTo('');
    dateFilters.setImprovedAtFrom('');
    dateFilters.setImprovedAtTo('');
  };
  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-xl font-semibold text-cyan-400 mb-4">
        Search for Quotes
      </h2>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          AI Provider
        </label>
        <div className="flex rounded-md bg-gray-700">
          <button
            onClick={() => searchParams.handleAISelectionChange('gemini')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-l-md ${
              searchParams.selectedAI === 'gemini'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Gemini
          </button>
          <button
            onClick={() => searchParams.handleAISelectionChange('grok')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              searchParams.selectedAI === 'grok'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            Grok
          </button>
          <button
            onClick={() => searchParams.handleAISelectionChange('chatgpt')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors rounded-r-md ${
              searchParams.selectedAI === 'chatgpt'
                ? 'bg-cyan-600 text-white'
                : 'text-gray-300 hover:bg-gray-600'
            }`}
          >
            ChatGPT
          </button>
        </div>
      </div>
      <div>
        <label
          htmlFor="personName"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Person's Name
        </label>
        <PersonSelector
          value={searchParams.personName}
          onChange={searchParams.setPersonName}
        />
      </div>

      {/* Time Period Selection */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Time Period
        </label>
        <div className="space-y-2">
          <select
            value={timePeriod.type}
            onChange={(e) => timePeriod.handleTypeChange(e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          >
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
            <option value="months">Last Month(s)</option>
            <option value="years">Last Year(s)</option>
            <option value="custom">Custom Period</option>
          </select>

          {(timePeriod.type === 'months' || timePeriod.type === 'years') && (
            <input
              type="number"
              min="1"
              max={timePeriod.type === 'months' ? 120 : 30}
              value={timePeriod.value}
              onChange={(e) =>
                timePeriod.handleValueChange(parseInt(e.target.value, 10) || 1)
              }
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
              placeholder={`Number of ${timePeriod.type}`}
            />
          )}

          {timePeriod.type === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label
                  htmlFor="dateFrom"
                  className="block text-xs text-gray-400 mb-1"
                >
                  From
                </label>
                <input
                  type="date"
                  id="dateFrom"
                  value={timePeriod.customDateFrom}
                  onChange={(e) => timePeriod.setCustomDateFrom(e.target.value)}
                  className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                />
              </div>
              <div>
                <label
                  htmlFor="dateTo"
                  className="block text-xs text-gray-400 mb-1"
                >
                  To
                </label>
                <input
                  type="date"
                  id="dateTo"
                  value={timePeriod.customDateTo}
                  onChange={(e) => timePeriod.setCustomDateTo(e.target.value)}
                  className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                />
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            Will search for quotes from {timePeriod.description}
          </p>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
          >
            {showAdvancedFilters ? '▼ Hide' : '▶ Show'} Advanced Date Filters
            {hasAdvancedFilters && <span className="w-2 h-2 bg-cyan-400 rounded-full"></span>}
          </button>
          {hasAdvancedFilters && (
            <button
              type="button"
              onClick={clearAdvancedFilters}
              className="text-xs text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Advanced Date Filters */}
        {showAdvancedFilters && (
          <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="space-y-3">
              {/* Saved At Range */}
              <div className="bg-gray-700/30 p-3 rounded-lg">
                <label className="block text-xs text-cyan-400 mb-2 font-medium">Saved Date</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={dateFilters.savedAtFrom}
                      onChange={(e) => dateFilters.setSavedAtFrom(e.target.value)}
                      className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={dateFilters.savedAtTo}
                      onChange={(e) => dateFilters.setSavedAtTo(e.target.value)}
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
                      value={dateFilters.analyzedAtFrom}
                      onChange={(e) => dateFilters.setAnalyzedAtFrom(e.target.value)}
                      className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={dateFilters.analyzedAtTo}
                      onChange={(e) => dateFilters.setAnalyzedAtTo(e.target.value)}
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
                      value={dateFilters.improvedAtFrom}
                      onChange={(e) => dateFilters.setImprovedAtFrom(e.target.value)}
                      className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={dateFilters.improvedAtTo}
                      onChange={(e) => dateFilters.setImprovedAtTo(e.target.value)}
                      className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-xs px-2 py-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor="resultCount"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Number of Results
        </label>
        <input
          type="number"
          id="resultCount"
          value={searchParams.resultCount}
          min="1"
          max="50"
          onChange={(e) =>
            searchParams.setResultCount(parseInt(e.target.value, 10))
          }
          className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="maxQuoteLength"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Max Quote Length (chars)
        </label>
        <input
          type="number"
          id="maxQuoteLength"
          value={searchParams.maxQuoteLength}
          min="50"
          max="500"
          onChange={(e) =>
            searchParams.setMaxQuoteLength(parseInt(e.target.value, 10))
          }
          className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>
      <div className="mt-4">
        <label
          htmlFor="temperature"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          Search Creativity (Temperature):{' '}
          {searchParams.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          id="temperature"
          min="0"
          max="1"
          step="0.1"
          value={searchParams.temperature}
          onChange={(e) =>
            searchParams.setTemperature(parseFloat(e.target.value))
          }
          className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Languages
        </label>
        <div className="grid grid-cols-2 gap-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => languages.onChange(lang.code)}
              className={`px-2 py-1 text-sm rounded-md transition-colors ${
                languages.selected.includes(lang.code)
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={onSearch}
        disabled={isLoading}
        className="mt-6 w-full flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? <Spinner /> : 'Find New Quotes'}
      </button>
    </div>
  );
};
