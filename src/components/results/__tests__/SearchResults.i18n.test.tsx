import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from '../../../i18n';
import AddQuoteModal from '../../AddQuoteModal';
import { SearchResults } from '../SearchResults';
import { Quote } from '../../../types';

const dummyStatusFilters = {
  isAnalyzed: 'all' as const,
  setIsAnalyzed: () => { },
  isImproved: 'all' as const,
  setIsImproved: () => { },
};

const TestHarness: React.FC<{ results: Quote[] }> = ({ results }) => {
  const { setLanguage } = useI18n();
  return (
    <div>
      <button onClick={() => setLanguage('lt')}>lt</button>
      <button onClick={() => setLanguage('en')}>en</button>
      <SearchResults
        results={results}
        error={null}
        rawApiResponseError={null}
        personName={''}
        sortOrder={'newest'}
        setSortOrder={() => { }}
        onClear={() => { }}
        onAnalyze={() => { }}
        onImprove={() => { }}
        onSave={() => { }}
        onLanguageChange={() => { }}
        onAccept={() => { }}
        onDiscard={() => { }}
        onRemove={() => { }}
        onEditSource={() => { }}
        clearError={() => { }}
        selectedAI={''}
        statusFilters={dummyStatusFilters}
      />
    </div>
  );
};

const sampleQuote: Quote = {
  id: 'q1',
  text: 'Test quote',
  personName: 'John',
  source: 'example',
  title: 'Test',
  date: '2025-12-20',
  metadata: {},
};

test('SearchResults heading reflects language changes from i18n provider', async () => {
  render(
    <I18nProvider>
      <TestHarness results={[sampleQuote, { ...sampleQuote, id: 'q2' }]} />
    </I18nProvider>
  );

  // Initial should be Lithuanian
  expect(screen.getByText(/Rezultatai \(2\)/)).toBeInTheDocument();

  // Test toggle via setLanguage (using the test harness button, which currently only has 'lt'). 
  // We need to add an 'en' button to the harness or use the setLanguage directly if we could access it.
  // The harness has: <button onClick={() => setLanguage('lt')}>lt</button>
  // I will assume I need to update the harness too.
  await userEvent.click(screen.getByText('en'));

  expect(screen.getByText(/Results \(2\)/)).toBeInTheDocument();
});

test('Analyze button passes selected model and analysis type', async () => {
  const user = userEvent.setup();
  const onAnalyze = jest.fn();

  render(
    <I18nProvider>
      <div>
        <AddQuoteModal
          isOpen={true}
          onClose={() => { }}
          onSave={() => { }}
          initialAnalysisType={'audit'}
        />
        <SearchResults
          results={[sampleQuote]}
          error={null}
          rawApiResponseError={null}
          personName={''}
          sortOrder={'newest'}
          setSortOrder={() => { }}
          onClear={() => { }}
          onAnalyze={onAnalyze}
          onImprove={() => { }}
          onSave={() => { }}
          onLanguageChange={() => { }}
          onAccept={() => { }}
          onDiscard={() => { }}
          onRemove={() => { }}
          onEditSource={() => { }}
          clearError={() => { }}
          selectedAI={'openai'}
          statusFilters={dummyStatusFilters}
        />
      </div>
    </I18nProvider>
  );

  // verify AddQuoteModal translation is used (accept English or Lithuanian)
  expect(screen.getByText(/Analysis Type|Analizės tipas/i)).toBeInTheDocument();

  await user.click(screen.getByTitle(/Analizuoti citatą|Analyze Quote/i));

  expect(onAnalyze).toHaveBeenCalledTimes(1);
  expect(onAnalyze).toHaveBeenCalledWith(expect.objectContaining({ id: 'q1' }), 'openai', 'audit');
});
