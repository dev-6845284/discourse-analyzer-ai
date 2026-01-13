import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { I18nProvider } from '../../../i18n';

// Small test consumer that displays a translated string so we can observe language changes
const ResultsConsumer: React.FC<{ count: number }> = ({ count }) => {
  const { t } = require('../../../i18n').useI18n();
  return <div data-testid="results">{t('results', { count })}</div>;
};

const defaultUser = { _id: 'u1', name: 'Tester', role: 'user' } as any;

describe('Header language selector', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  test('persists selection to localStorage and updates other components, and rehydrates on reload', async () => {
    render(
      <I18nProvider>
        <Header
          user={defaultUser}
          isFormCollapsed={false}
          toggleFormCollapsed={() => { }}
          logsVisible={false}
          setLogsVisible={() => { }}
          setIsApiKeyModalOpen={() => { }}

          handleLogout={() => { }}
          onChangePassword={() => { }}
          onEditProfile={() => { }}
        />
        <ResultsConsumer count={2} />
      </I18nProvider>
    );

    // Initially Lithuanian (default)
    expect(screen.getByTestId('results').textContent).toMatch(/Rezultatai \(2\)/);

    const select = screen.getByLabelText(/Language|Kalba/i) as HTMLSelectElement;
    await userEvent.selectOptions(select, 'en');

    // localStorage should be updated
    expect(localStorage.getItem('discourse_analyzer_lang')).toBe('en');
    // select control should reflect the chosen language
    expect(select.value).toBe('en');
    // key must exist before simulating reload (explicit assertion)
    expect(localStorage.getItem('discourse_analyzer_lang')).not.toBeNull();

    // The consumer should update to English
    expect(screen.getByTestId('results').textContent).toMatch(/Results \(2\)/);

    // Simulate a reload by unmounting and re-rendering the provider
    cleanup();

    // ensure localStorage still has the key after cleanup
    expect(localStorage.getItem('discourse_analyzer_lang')).toBe('en');

    render(
      <I18nProvider>
        <ResultsConsumer count={2} />
      </I18nProvider>
    );

    // It should pick up 'en' from localStorage
    expect(screen.getByTestId('results').textContent).toMatch(/Results \(2\)/);
  });
});
