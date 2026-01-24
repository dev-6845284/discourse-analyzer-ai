/**
 * ThemeToggle Component
 *
 * Purpose:
 * - A button to toggle between Light and Dark mode.
 *
 * Behavior:
 * - Uses `ThemeContext` to read and update the current theme.
 * - Renders Sun/Moon icons accordingly.
 *
 * Location: src/components/ui/ThemeToggle.tsx
 */
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
    className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-800 dark:text-gray-200 ${className}`}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
                <Moon className="w-5 h-5 text-gray-600" />
            )}
        </button>
    );
};
