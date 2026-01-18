import React, { useEffect, useState, useCallback } from 'react';
import api from '../../utils/api';
import { PublicQuoteCard } from './PublicQuoteCard';
import { Filter, Calendar, User, LogIn, ArrowUpDown, X, ChevronDown } from 'lucide-react';
import { useI18n, AVAILABLE_LANGUAGES } from '../../i18n';
import { ThemeToggle } from '../ThemeToggle';
import logo from '../../assets/images/image32.png';

interface PublicQuotesProps {
    onLogout?: () => void;
    onOpenLogin?: () => void;
    onNavigate?: (path: string) => void;
}

interface Person {
    id: string;
    name: string;
}

type TimePeriodType = 'any' | 'day' | 'week' | 'month' | 'year' | 'dateRange' | 'yearRange';
type SortField = 'savedAt' | 'date';
type SortOrder = 'newest' | 'oldest';

export const PublicQuotes: React.FC<PublicQuotesProps> = ({ onLogout, onOpenLogin, onNavigate }) => {
    const [quotes, setQuotes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // People for filter dropdown
    const [people, setPeople] = useState<Person[]>([]);
    const [loadingPeople, setLoadingPeople] = useState(false);

    // Filter states
    const [sortField, setSortField] = useState<SortField>('savedAt');
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
    const [selectedPersonId, setSelectedPersonId] = useState<string>('');
    const [timePeriod, setTimePeriod] = useState<TimePeriodType>('any');

    // Year and month constants
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Custom month range (whole months only)
    const [monthFromMonth, setMonthFromMonth] = useState<number>(currentMonth);
    const [monthFromYear, setMonthFromYear] = useState<number>(currentYear - 1);
    const [monthToMonth, setMonthToMonth] = useState<number>(currentMonth);
    const [monthToYear, setMonthToYear] = useState<number>(currentYear);

    // Year range
    const [yearFrom, setYearFrom] = useState<number>(currentYear - 1);
    const [yearTo, setYearTo] = useState<number>(currentYear);

    // Use global i18n
    const { t, language, setLanguage } = useI18n();

    // Month options for dropdown
    const monthOptions = [
        { value: 0, label: language === 'lt' ? 'Sausis' : 'January' },
        { value: 1, label: language === 'lt' ? 'Vasaris' : 'February' },
        { value: 2, label: language === 'lt' ? 'Kovas' : 'March' },
        { value: 3, label: language === 'lt' ? 'Balandis' : 'April' },
        { value: 4, label: language === 'lt' ? 'Gegužė' : 'May' },
        { value: 5, label: language === 'lt' ? 'Birželis' : 'June' },
        { value: 6, label: language === 'lt' ? 'Liepa' : 'July' },
        { value: 7, label: language === 'lt' ? 'Rugpjūtis' : 'August' },
        { value: 8, label: language === 'lt' ? 'Rugsėjis' : 'September' },
        { value: 9, label: language === 'lt' ? 'Spalis' : 'October' },
        { value: 10, label: language === 'lt' ? 'Lapkritis' : 'November' },
        { value: 11, label: language === 'lt' ? 'Gruodis' : 'December' },
    ];

    // Fetch people for dropdown
    const fetchPeople = useCallback(async () => {
        setLoadingPeople(true);
        try {
            const response = await api.get('/public/people');
            setPeople(response.data);
        } catch (err) {
            console.error('Failed to fetch people:', err);
        } finally {
            setLoadingPeople(false);
        }
    }, []);

    // Calculate date range based on time period
    // NOTE: Returns dates in YYYY-MM-DD format only (no time) for cache optimization
    const getDateRange = useCallback((): { from?: string; to?: string } => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Helper to format date as YYYY-MM-DD (date only, no time)
        const formatDateOnly = (d: Date): string => {
            return d.toISOString().split('T')[0];
        };

        // Helper to ensure from <= to
        const ensureOrder = (from: Date, to: Date) => {
            if (from > to) {
                return { from: formatDateOnly(to), to: formatDateOnly(from) };
            }
            return { from: formatDateOnly(from), to: formatDateOnly(to) };
        };

        switch (timePeriod) {
            case 'day': {
                const from = new Date(today);
                from.setDate(from.getDate() - 1);
                return ensureOrder(from, today);
            }
            case 'week': {
                const from = new Date(today);
                from.setDate(from.getDate() - 7);
                return ensureOrder(from, today);
            }
            case 'month': {
                const from = new Date(today);
                from.setMonth(from.getMonth() - 1);
                return ensureOrder(from, today);
            }
            case 'year': {
                const from = new Date(today);
                from.setFullYear(from.getFullYear() - 1);
                return ensureOrder(from, today);
            }
            case 'dateRange': {
                // From: first day of the selected month
                const from = new Date(monthFromYear, monthFromMonth, 1);
                // To: last day of the selected month
                const to = new Date(monthToYear, monthToMonth + 1, 0);
                return ensureOrder(from, to);
            }
            case 'yearRange': {
                const from = new Date(yearFrom, 0, 1);
                const to = new Date(yearTo, 11, 31);
                return ensureOrder(from, to);
            }
            default:
                return {};
        }
    }, [timePeriod, monthFromMonth, monthFromYear, monthToMonth, monthToYear, yearFrom, yearTo]);

    // Fetch quotes with filters
    const fetchQuotes = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('sortField', sortField);
            params.set('sortOrder', sortOrder);

            if (selectedPersonId) {
                params.set('personId', selectedPersonId);
            }

            const dateRange = getDateRange();
            if (dateRange.from) {
                params.set('dateFrom', dateRange.from);
            }
            if (dateRange.to) {
                params.set('dateTo', dateRange.to);
            }

            const response = await api.get(`/public/quotes?${params.toString()}`);
            setQuotes(response.data);
            setError(null);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 401) {
                if (onLogout) {
                    onLogout();
                } else {
                    window.location.reload();
                }
            } else {
                setError(t('public_load_error'));
            }
        } finally {
            setLoading(false);
        }
    }, [sortField, sortOrder, selectedPersonId, getDateRange, onLogout, t]);

    // Initial fetch (people only)
    useEffect(() => {
        fetchPeople();
    }, [fetchPeople]);

    // Refetch when filters change
    useEffect(() => {
        fetchQuotes();
    }, [sortField, sortOrder, selectedPersonId, getDateRange]);

    // Clear all filters
    const clearFilters = () => {
        setSortField('savedAt');
        setSortOrder('newest');
        setSelectedPersonId('');
        setTimePeriod('any');
        setMonthFromMonth(currentMonth);
        setMonthFromYear(currentYear - 1);
        setMonthToMonth(currentMonth);
        setMonthToYear(currentYear);
        setYearFrom(currentYear - 1);
        setYearTo(currentYear);
    };

    // Check if any filter is active
    const hasActiveFilters = sortField !== 'savedAt' || sortOrder !== 'newest' || selectedPersonId || timePeriod !== 'any';

    // Generate year options
    const yearOptions = [];
    for (let y = currentYear; y >= 2020; y--) {
        yearOptions.push(y);
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 selection:bg-cyan-500/30 transition-colors duration-300">
            {/* Header */}
            <header className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-sm dark:shadow-xl border-b border-gray-200 dark:border-gray-700/50 sticky top-0 z-50 transition-colors duration-300">
                <div className="md:container mx-auto px-4 md:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <img src={logo} alt="logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-cover border border-gray-700/50 shadow-sm" />
                        <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent tracking-tight truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                            {t('public_quotes_title')}
                        </span>

                        {/* Filter Toggle (Desktop) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <Filter className="w-3.5 h-3.5" />
                            <span className="text-xs font-bold">{t('public_more_filters')}</span>
                            {hasActiveFilters && (
                                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                            )}
                        </button>

                        {/* Language Selector (Header Desktop) */}
                        <div className="hidden md:flex items-center gap-4 ml-2">
                            {AVAILABLE_LANGUAGES.map((l) => (
                                <label key={l.code} className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-white transition-all duration-200">
                                    <input
                                        type="radio"
                                        name="language"
                                        value={l.code}
                                        checked={language === l.code}
                                        onChange={() => setLanguage(l.code)}
                                        className="w-3.5 h-3.5 text-cyan-600 focus:ring-cyan-500/50 border-gray-600 bg-gray-700 transition-all"
                                    />
                                    <span className={language === l.code ? 'text-cyan-400' : ''}>{l.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-4">
                        {/* Filter Toggle (Mobile) */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`md:hidden p-2 rounded-lg border transition-all relative ${showFilters ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-600 dark:text-cyan-400' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                        >
                            <Filter className="w-4 h-4" />
                            {hasActiveFilters && (
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse" />
                            )}
                        </button>

                        {/* Mobile Language Selector */}
                        <div className="md:hidden">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner focus:border-cyan-500 focus:ring-cyan-500 py-1 px-2"
                            >
                                {AVAILABLE_LANGUAGES.map((l) => (
                                    <option key={l.code} value={l.code}>{l.name}</option>
                                ))}
                            </select>
                        </div>

                        {onLogout && (
                            <button
                                onClick={onLogout}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-semibold transition-colors flex items-center gap-2 p-1"
                                title={t('public_back_to_landing')}
                            >
                                <span className="hidden sm:inline">{t('public_back_to_landing')}</span>
                                <span className="sm:hidden">←</span>
                            </button>
                        )}

                        {onOpenLogin && (
                            <button
                                onClick={onOpenLogin}
                                className="px-3 py-1.5 md:px-4 md:py-2 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-2 border border-gray-200 dark:border-gray-600/50 hover:border-gray-300 dark:hover:border-gray-500 shadow-sm"
                            >
                                <LogIn className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{t('admin_login')}</span>
                            </button>
                        )}
                        <ThemeToggle />
                    </div>
                </div>
            </header>

            <main className="md:container mx-auto px-2 md:px-6 lg:px-8 pt-1 pb-4 md:pt-2 md:pb-8 space-y-4 md:space-y-8">

                {/* Collapsible Filters */}
                {showFilters && (
                    <div className="bg-white/40 dark:bg-gray-800/40 rounded-2xl shadow-lg border border-cyan-500/20 backdrop-blur-sm overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-2">
                        <div className="p-4 md:p-6 space-y-4">
                            {/* Filter Row 1: Sort & Person */}
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Sort Dropdown */}
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <ArrowUpDown className="w-3.5 h-3.5" />
                                        {t('public_sort_by')}
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={sortField}
                                            onChange={(e) => setSortField(e.target.value as SortField)}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        >
                                            <option value="savedAt">{t('public_sort_added_date')}</option>
                                            <option value="date">{t('public_sort_publication_date')}</option>
                                        </select>
                                        <select
                                            value={sortOrder}
                                            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                                            className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                                        >
                                            <option value="newest">{t('public_sort_newest')}</option>
                                            <option value="oldest">{t('public_sort_oldest')}</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Person Dropdown */}
                                <div className="flex-1 space-y-2">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                        <User className="w-3.5 h-3.5" />
                                        {t('public_filter_person')}
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedPersonId}
                                            onChange={(e) => setSelectedPersonId(e.target.value)}
                                            disabled={loadingPeople}
                                            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all appearance-none pr-8"
                                        >
                                            <option value="">{t('public_all_people')}</option>
                                            {people.map((p) => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            {/* Filter Row 2: Time Period */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {t('public_filter_time')}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {/* Quick options */}
                                    {[
                                        { value: 'any', label: t('public_any_time') },
                                        { value: 'day', label: t('public_time_last_day') },
                                        { value: 'week', label: t('public_time_last_week') },
                                        { value: 'month', label: t('public_time_last_month') },
                                        { value: 'year', label: t('public_time_last_year') },
                                    ].map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setTimePeriod(opt.value as TimePeriodType)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${timePeriod === opt.value
                                                ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/50'
                                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setTimePeriod('dateRange')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${timePeriod === 'dateRange'
                                            ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/50'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        {t('public_time_custom_range')}
                                    </button>
                                    <button
                                        onClick={() => setTimePeriod('yearRange')}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${timePeriod === 'yearRange'
                                            ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/50'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                            }`}
                                    >
                                        {t('public_time_year_range')}
                                    </button>
                                </div>

                                {/* Custom month range inputs */}
                                {timePeriod === 'dateRange' && (
                                    <div className="flex flex-col sm:flex-row gap-3 mt-3 p-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('public_from')}</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={monthFromMonth}
                                                    onChange={(e) => setMonthFromMonth(Number(e.target.value))}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                                >
                                                    {monthOptions.map((m) => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={monthFromYear}
                                                    onChange={(e) => setMonthFromYear(Number(e.target.value))}
                                                    className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                                >
                                                    {yearOptions.map((y) => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('public_to')}</label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={monthToMonth}
                                                    onChange={(e) => setMonthToMonth(Number(e.target.value))}
                                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                                >
                                                    {monthOptions.map((m) => (
                                                        <option key={m.value} value={m.value}>{m.label}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    value={monthToYear}
                                                    onChange={(e) => setMonthToYear(Number(e.target.value))}
                                                    className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                                >
                                                    {yearOptions.map((y) => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Year range inputs */}
                                {timePeriod === 'yearRange' && (
                                    <div className="flex flex-col sm:flex-row gap-3 mt-3 p-3 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl">
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('public_from')}</label>
                                            <select
                                                value={yearFrom}
                                                onChange={(e) => setYearFrom(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            >
                                                {yearOptions.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{t('public_to')}</label>
                                            <select
                                                value={yearTo}
                                                onChange={(e) => setYearTo(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                                            >
                                                {yearOptions.map((y) => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Clear Filters Button */}
                            {hasActiveFilters && (
                                <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700/50">
                                    <button
                                        onClick={clearFilters}
                                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        {t('public_clear_filters')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col justify-center items-center py-40 space-y-6">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-500"></div>
                            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-2 border-cyan-500/20"></div>
                        </div>
                        <span className="text-gray-500 text-sm font-medium tracking-widest uppercase animate-pulse">{t('loading')}</span>
                    </div>
                ) : error ? (
                    <div className="text-center py-40 bg-gray-100/20 dark:bg-gray-800/20 rounded-2xl border border-red-900/20 backdrop-blur-sm">
                        <p className="text-red-400 mb-6 font-medium">{error}</p>
                        <button
                            onClick={fetchQuotes}
                            className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl shadow-lg shadow-cyan-900/20 transition-all font-bold transform hover:scale-105"
                        >
                            {t('public_try_again')}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:gap-6">
                        {quotes.length === 0 ? (
                            <div className="text-center py-40 bg-gray-100/20 dark:bg-gray-800/20 rounded-2xl border border-gray-200 dark:border-gray-700/20 text-gray-500 italic">
                                {t('public_no_quotes_found')}
                            </div>
                        ) : (
                            quotes.map(quote => (
                                <PublicQuoteCard key={quote.id} quote={quote} onNavigate={onNavigate} />
                            ))
                        )}
                    </div>
                )}

            </main>
        </div >
    );
};
