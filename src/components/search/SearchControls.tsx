import React from 'react';
import { PersonSelector } from '../people/PersonSelector';
import Spinner from '../Spinner';
import { SUPPORTED_LANGUAGES } from '../../constants';
import { useI18n } from '../../i18n';

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
    isAgentic: boolean;
    setIsAgentic: (val: boolean) => void;
    agenticMode: 'quotes' | 'articles';
    setAgenticMode: (mode: 'quotes' | 'articles') => void;
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
  onCancel: () => void;
  isLoading: boolean;
}

export const SearchControls: React.FC<SearchControlsProps> = ({
  searchParams,
  statusFilters,
  timePeriod,
  languages,
  onSearch,
  onCancel,
  isLoading,
}) => {
  const { t } = useI18n();

  return (
    <div className="p-4 bg-gray-800/50 rounded-lg">
      <h2 className="text-lg font-semibold text-cyan-400 mb-3">
        {t('searchForQuotes')}
      </h2>
          <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Person's Name
        </label>
        <PersonSelector
          value={searchParams.personName}
          onChange={searchParams.setPersonName}
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('aiProvider')}
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

      {/* Time Period Selection */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t('timePeriod')}
        </label>
        <div className="space-y-2">
          <select
            value={timePeriod.type}
            onChange={(e) => timePeriod.handleTypeChange(e.target.value)}
            className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
          >
            <option value="day">{t('lastDay')}</option>
            <option value="week">{t('lastWeek')}</option>
            <option value="months">{t('lastMonths')}</option>
            <option value="years">{t('lastYears')}</option>
            <option value="custom">{t('customPeriod')}</option>
          </select>

          {(timePeriod.type === 'months' || timePeriod.type === 'years') && (
            <input
              type="number"
              min="1"
              max={timePeriod.type === 'months' ? 120 : 30}
              value={timePeriod.value ?? 1}
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
                  {t('from')}
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
                  {t('to')}
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
            {t('willSearchFrom', { description: timePeriod.description })}
          </p>
        </div>
      </div>

      {/* Status Filters - Always Visible */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">{t('statusFilters')}</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('analyzed')}</label>
            <select
              value={statusFilters.isAnalyzed}
              onChange={(e) => statusFilters.setIsAnalyzed(e.target.value as 'all' | 'true' | 'false')}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            >
              <option value="all">{t('all')}</option>
              <option value="true">{t('analyzed')}</option>
              <option value="false">{`Not ${t('analyzed')}`}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">{t('improved')}</label>
            <select
              value={statusFilters.isImproved}
              onChange={(e) => statusFilters.setIsImproved(e.target.value as 'all' | 'true' | 'false')}
              className="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500 text-sm"
            >
              <option value="all">{t('all')}</option>
              <option value="true">{t('improved')}</option>
              <option value="false">{`Not ${t('improved')}`}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label
          htmlFor="resultCount"
          className="block text-sm font-medium text-gray-300 mb-1"
        >
          {t('numberOfResults')}
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
          {t('maxQuoteLength')}
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
          {t('searchCreativity', { value: searchParams.temperature.toFixed(1) })}
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
          {t('languages')}
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
      
      {/* Agentic Search Toggle */}
      <div className={`mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600 ${searchParams.selectedAI === 'grok' ? 'opacity-50' : ''}`}>
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-300">
            {t('agenticSearch')}
            {searchParams.selectedAI === 'grok' && (
              <span className="ml-2 text-xs text-gray-400">{t('notAvailableWithGrok')}</span>
            )}
          </label>
          <button
            onClick={() => searchParams.selectedAI !== 'grok' && searchParams.setIsAgentic(!searchParams.isAgentic)}
            disabled={searchParams.selectedAI === 'grok'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
              searchParams.isAgentic ? 'bg-cyan-600' : 'bg-gray-600'
            } ${searchParams.selectedAI === 'grok' ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                searchParams.isAgentic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {searchParams.isAgentic && (
          <div className="mt-3">
            <label className="block text-xs text-gray-400 mb-1">{t('mode')}</label>
            <div className="flex rounded-md bg-gray-800">
              <button
                onClick={() => searchParams.setAgenticMode('quotes')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors rounded-l-md ${
                  searchParams.agenticMode === 'quotes'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {t('quotes')}
              </button>
              <button
                onClick={() => searchParams.setAgenticMode('articles')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium transition-colors rounded-r-md ${
                  searchParams.agenticMode === 'articles'
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {t('articles')}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {searchParams.agenticMode === 'quotes' 
                ? t('agenticQuotesDescription') 
                : t('agenticArticlesDescription')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-2">
        <button
          onClick={onSearch}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? <Spinner className="mr-2 w-4 h-4" /> : null}
          {isLoading ? (searchParams.isAgentic ? t('agentWorking') : t('searching')) : t('search')}
        </button>
        
        {isLoading && (
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
