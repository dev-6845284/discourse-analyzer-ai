import React from 'react';
import logo from '../../assets/images/image64.png';
import { UserInfo } from '../../types';
import { useI18n, AVAILABLE_LANGUAGES } from '../../i18n';


interface HeaderProps {
  user: UserInfo;
  isFormCollapsed: boolean;
  toggleFormCollapsed: () => void;
  logsVisible: boolean;
  setLogsVisible: (visible: boolean) => void;
  setIsApiKeyModalOpen: (isOpen: boolean) => void;
  googleButtonRef: React.RefObject<HTMLDivElement>;
  handleLogout: () => void;
  onChangePassword: () => void;
  onEditProfile: () => void;
  openSidebarMobile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  logsVisible,
  setLogsVisible,
  setIsApiKeyModalOpen,
  googleButtonRef,
  handleLogout,
  onChangePassword,
  onEditProfile,
  openSidebarMobile,
}) => {
  const { t, language, setLanguage } = useI18n();
  const isDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

  return (
    <header className="mb-6 w-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 w-full">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="hidden md:flex items-center gap-3 md:mr-6">
            <img src={logo} alt="logo" className="h-10 w-10 object-cover rounded-md" />
            <h1 className="text-2xl md:text-4xl font-bold text-gray-800 dark:text-gray-200">{t('appTitle')}</h1>
          </div>
          {/* Mobile sidebar toggle */}
          <button
            onClick={() => openSidebarMobile && openSidebarMobile()}
            className="ml-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors md:hidden"
            aria-label="Open sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full md:w-auto">
          <div className="flex flex-col gap-1">
            <p className="text-gray-700 dark:text-gray-300 text-sm">{t('welcomeUser', { name: user.name })}</p>
            {user.assignedKeysetAlias && (
              <p className="text-xs text-blue-400">{t('keyset_current', { alias: user.assignedKeysetAlias })}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {AVAILABLE_LANGUAGES.map((l) => (
              <label key={l.code} className="flex items-center gap-1 text-xs md:text-sm">
                <input
                  type="radio"
                  name="language"
                  value={l.code}
                  checked={language === l.code}
                  onChange={() => setLanguage(l.code)}
                  className="w-3 h-3"
                />
                <span className="hidden sm:inline">{l.name}</span>
              </label>
            ))}
            {/* Hidden select kept for tests and screen-reader compatibility */}
            <select
              id="language-select"
              aria-label={t('language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="sr-only"
            >
              {AVAILABLE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>



          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm"
          >
            {t('apiKeys')}
          </button>
          {/* User actions dropdown for mobile */}
          <div className="relative">
            <details className="md:hidden">
              <summary className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg cursor-pointer select-none text-xs">{t('userMenu')}</summary>
              <div className="absolute left-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-10 flex flex-col">
                {user._id && (
                  <>
                    <button
                      onClick={onEditProfile}
                      className="px-4 py-2 text-left hover:bg-gray-200 dark:hover:bg-gray-700 rounded-t-lg"
                    >
                      {t('editProfile')}
                    </button>
                    <button
                      onClick={onChangePassword}
                      className="px-4 py-2 text-left hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {t('changePassword')}
                    </button>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-left text-red-600 hover:bg-red-100 dark:hover:bg-red-900 rounded-b-lg"
                >
                  {t('logout')}
                </button>
              </div>
            </details>
            {/* Desktop user actions */}
              <div className="hidden md:flex items-center gap-2">
              {user._id && (
                <>
                  <button
                    onClick={onEditProfile}
                    className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm"
                  >
                    {t('editProfile')}
                  </button>
                  <button
                    onClick={onChangePassword}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs md:text-sm"
                  >
                    {t('changePassword')}
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="px-2 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-xs md:text-sm"
              >
                {t('logout')}
              </button>
            </div>
          </div>
          <div ref={googleButtonRef}></div>
        </div>
      </div>
    </header>
  );
};
