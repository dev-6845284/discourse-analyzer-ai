import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider, useI18n } from '../index';

const TestComponent: React.FC = () => {
  const { t, language, setLanguage } = useI18n();
  return (
    <div>
      <div data-testid="lang">{language}</div>
      <div data-testid="results">{t('results', { count: 3 })}</div>
      <button onClick={() => setLanguage('lt')}>lt</button>
      <button onClick={() => setLanguage('en')}>en</button>
    </div>
  );
};

test('i18n t() returns English and Lithuanian translations and setLanguage works', async () => {
  render(
    <I18nProvider>
      <TestComponent />
    </I18nProvider>
  );

  expect(screen.getByTestId('lang').textContent).toBe('lt');
  expect(screen.getByTestId('results').textContent).toBe('Rezultatai (3)');

  await userEvent.click(screen.getByText('en'));
  expect(screen.getByTestId('lang').textContent).toBe('en');
  expect(screen.getByTestId('results').textContent).toBe('Results (3)');

  await userEvent.click(screen.getByText('lt'));
  expect(screen.getByTestId('lang').textContent).toBe('lt');
  expect(screen.getByTestId('results').textContent).toBe('Rezultatai (3)');
});
