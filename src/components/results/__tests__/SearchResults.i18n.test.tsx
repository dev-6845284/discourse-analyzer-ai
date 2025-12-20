import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from '../../../i18n';
import { SearchResults } from '../SearchResults';
import { Quote } from '../../../types';

const TestHarness: React.FC<{ results: Quote[] }> = ({ results }) => {
  const { setLanguage } = useI18n();
  return (
    <div>
      <button onClick={() => setLanguage('lt')}>lt</button>
      <SearchResults
        results={results}
        error={null}
        rawApiResponseError={null}
        personName={''}
        sortOrder={'newest'}
        setSortOrder={() => {}}
        onClear={() => {}}
        onAnalyze={() => {}}
        onImprove={() => {}}
        onSave={() => {}}
        onLanguageChange={() => {}}
        onAccept={() => {}}
        onDiscard={() => {}}
        onRemove={() => {}}
        onEditSource={() => {}}
        clearError={() => {}}
        selectedAI={''}
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

  // Initial should be English
  expect(screen.getByText(/Results \(2\)/)).toBeInTheDocument();

  await userEvent.click(screen.getByText('lt'));

  expect(screen.getByText(/Rezultatai \(2\)/)).toBeInTheDocument();
});
