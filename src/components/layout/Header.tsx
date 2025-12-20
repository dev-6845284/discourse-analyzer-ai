import React from 'react';
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
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isFormCollapsed,
  toggleFormCollapsed,
  logsVisible,
  setLogsVisible,
  setIsApiKeyModalOpen,
  googleButtonRef,
  handleLogout,
  onChangePassword,
  onEditProfile,
}) => {
  const { t, language, setLanguage } = useI18n();

  return (
    <header className="flex justify-between items-center mb-6">
      <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200">
        Discourse Analyzer AI
      </h1>
      <div className="flex items-center space-x-4">
        <div>
          <label htmlFor="language-select" className="sr-only">Language</label>
          <select
            id="language-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg p-2 text-sm"
            aria-label="Select language"
          >
            {AVAILABLE_LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </div>

        <button
          onClick={toggleFormCollapsed}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          {isFormCollapsed ? 'Expand Form' : 'Collapse Form'}
        </button>
        {(import.meta.env.DEV || user?.role === 'admin') && (
          <button
            onClick={() => setLogsVisible(!logsVisible)}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {logsVisible ? 'Hide Logs' : 'Show Logs'}
          </button>
        )}
        <button
          onClick={() => setIsApiKeyModalOpen(true)}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          API Keys
        </button>
        {user._id && (
          <>
            <button
              onClick={onEditProfile}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Edit Profile
            </button>
            <button
              onClick={onChangePassword}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Change Password
            </button>
          </>
        )}
        <p className="text-gray-700 dark:text-gray-300">Welcome, {user.name}</p>
        <div ref={googleButtonRef}></div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
};
