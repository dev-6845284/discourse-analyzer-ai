import React from 'react';
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
  statusFilters: {
    isAnalyzed: 'all' | 'true' | 'false';
    setIsAnalyzed: (value: 'all' | 'true' | 'false') => void;
    isImproved: 'all' | 'true' | 'false';
    setIsImproved: (value: 'all' | 'true' | 'false') => void;
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
  statusFilters,
  timePeriod,
  languages,
  onSearch,
  isLoading,
}) => {
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
      </div>

      {/* Status Filters - Always Visible */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">Status Filters</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Analyzed</label>
            <select
              value={statusFilters.isAnalyzed}
              onChange={(e) => statusFilters.setIsAnalyzed(e.target.value as 'all' | 'true' | 'false')}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            >
              <option value="all">All</option>
              <option value="true">Analyzed</option>
              <option value="false">Not Analyzed</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Improved</label>
            <select
              value={statusFilters.isImproved}
              onChange={(e) => statusFilters.setIsImproved(e.target.value as 'all' | 'true' | 'false')}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            >
              <option value="all">All</option>
              <option value="true">Improved</option>
              <option value="false">Not Improved</option>
            </select>
          </div>
        </div>
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
