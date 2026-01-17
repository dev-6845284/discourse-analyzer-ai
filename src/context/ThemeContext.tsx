import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Default to dark mode to match existing application style
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        // Check for saved theme in cookies
        const match = document.cookie.match(new RegExp('(^| )theme=([^;]+)'));
        if (match) {
            const savedTheme = match[2] as Theme;
            if (savedTheme === 'light' || savedTheme === 'dark') {
                setTheme(savedTheme);
            }
        }
    }, []);

    useEffect(() => {
        // Update DOM and cookie when theme changes
        const root = window.document.documentElement;

        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }

        // Save to cookie (expires in 1 year)
        document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Strict`;

    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
