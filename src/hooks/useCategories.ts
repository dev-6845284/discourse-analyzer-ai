import { useState, useEffect } from 'react';
import axios from 'axios';
import { CategoryDefinition } from '../types';

let cachedCategories: CategoryDefinition[] | null = null;
const CACHE_KEY = 'cached_categories';

/**
 * Hook to fetch and use analysis categories.
 * Uses a simple stale-while-revalidate strategy with local storage caching for speed.
 */
export const useCategories = () => {
    const [categories, setCategories] = useState<CategoryDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCategories = async (force = false) => {
        // Return cached memory version if available
        if (!force && cachedCategories) {
            setCategories(cachedCategories);
            setLoading(false);
        }

        // Try local storage cache for immediate render
        if (!force && !cachedCategories) {
            const stored = localStorage.getItem(CACHE_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    setCategories(parsed);
                    cachedCategories = parsed;
                    setLoading(false);
                } catch (e) { /* ignore parse error */ }
            }
        }

        try {
            // Background fetch
            const res = await axios.get<CategoryDefinition[]>('/api/categories', {
                withCredentials: true // Ensure we send auth cookies
            });

            const newCats = res.data;

            // Update cache
            cachedCategories = newCats;
            localStorage.setItem(CACHE_KEY, JSON.stringify(newCats));

            // Update state
            setCategories(newCats);
            setError(null);
        } catch (e: any) {
            console.error('Failed to fetch categories', e);
            if (!cachedCategories && categories.length === 0) {
                setError(e.message);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    /**
     * Helper to look up a category definition by ID or Base Title (English).
     * The LLM response usually uses the Base Title as the key.
     */
    const getCategory = (key: string) =>
        Array.isArray(categories) ? categories.find(c => c.id === key || c.title === key) : undefined;

    /**
     * Helper to get a translated title for a category.
     * Fallback logic: 
     * 1. Try DB translation for current language.
     * 2. Try DB translation for 'en'.
     * 3. Fallback to category definition title (usually English).
     */
    const getCategoryTitle = (key: string, language: string) => {
        const cat = getCategory(key);
        if (!cat) return key; // Fallback to key if not found

        return cat.translations?.[language]?.title ||
            cat.translations?.['en']?.title ||
            cat.title;
    };

    return {
        categories,
        loading,
        error,
        refresh: () => fetchCategories(true),
        getCategory,
        getCategoryTitle
    };
};
