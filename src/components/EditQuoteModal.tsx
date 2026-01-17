import React, { useState, useEffect, useRef } from 'react';
import { Quote, Person, AuditCategory } from '../types';
import { useI18n } from '../i18n';
import { SUPPORTED_LANGUAGES } from '../constants';
import { usePeople } from '../hooks/usePeople';

interface EditQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedQuote: Quote) => void;
    quote: Quote;
}

const EditQuoteModal: React.FC<EditQuoteModalProps> = ({ isOpen, onClose, onSave, quote }) => {
    const { t } = useI18n();
    const { people, fetchPeople, isLoading: isLoadingPeople } = usePeople();

    // Form State
    // Form State
    const [text, setText] = useState(quote.text);
    const [title, setTitle] = useState(quote.title || '');
    const [source, setSource] = useState(quote.source || '');
    const [date, setDate] = useState(() => {
        const d = quote.date ? new Date(quote.date) : null;
        return d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
    });
    const [languageCode, setLanguageCode] = useState(quote.languageCode || 'en');
    const [analysisContext, setAnalysisContext] = useState(quote.analysisContext || '');

    // Author State
    const [personId, setPersonId] = useState<string>((typeof quote.person === 'object' ? quote.person?._id : quote.person) || '');
    const [personName, setPersonName] = useState(quote.personName || '');
    const [personSearch, setPersonSearch] = useState('');
    const [isPersonDropdownOpen, setIsPersonDropdownOpen] = useState(false);
    const personWrapperRef = useRef<HTMLDivElement>(null);

    // Analysis State
    const [rationale, setRationale] = useState(
        (quote.audit && 'rationale' in quote.audit ? quote.audit.rationale : (quote.audit as any)?.finalAssessment) || ''
    );
    // Map category evidence for editing
    const [categoryEvidence, setCategoryEvidence] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            // Reset state from quote prop when opening
            setText(quote.text);
            setTitle(quote.title || '');
            setSource(quote.source || '');
            setAnalysisContext(quote.analysisContext || '');

            // Format date to YYYY-MM-DD for date input
            const d = quote.date ? new Date(quote.date) : null;
            const dateStr = d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
            setDate(dateStr);

            setLanguageCode(quote.languageCode || 'en');

            const pId = (typeof quote.person === 'object' ? quote.person?._id : quote.person) || '';
            const pName = quote.personName || (typeof quote.person === 'object' ? quote.person?.name : '') || '';

            setPersonId(pId);
            setPersonName(pName);
            setPersonSearch(pName);

            setRationale(
                (quote.audit && 'rationale' in quote.audit ? quote.audit.rationale : (quote.audit as any)?.finalAssessment) || ''
            );

            // Initialize evidence map
            const evidenceMap: Record<string, string> = {};
            if (quote.audit?.categories) {
                Object.entries(quote.audit.categories).forEach(([key, detail]) => {
                    evidenceMap[key] = detail.evidence;
                });
            }
            setCategoryEvidence(evidenceMap);

            fetchPeople();
        }
    }, [isOpen, quote, fetchPeople]);

    // Handle outside click for person dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (personWrapperRef.current && !personWrapperRef.current.contains(event.target as Node)) {
                setIsPersonDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handlePersonSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setPersonSearch(val);
        setPersonName(val); // Assume manual entry until selected
        setIsPersonDropdownOpen(true);
        fetchPeople(val);
    };

    const handlePersonSelect = (person: Person) => {
        setPersonId(person._id || '');
        setPersonName(person.name);
        setPersonSearch(person.name);
        setIsPersonDropdownOpen(false);
    };

    const handleEvidenceChange = (categoryKey: string, val: string) => {
        setCategoryEvidence(prev => ({
            ...prev,
            [categoryKey]: val
        }));
    };

    const handleSave = () => {
        // Reconstruct updated quote object
        const updatedQuote: Quote = {
            ...quote,
            text,
            analysisContext,
            title,
            source,
            date,
            languageCode,
            languageName: SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.name || quote.languageName,
            person: personId === '' ? quote.person : personId, // Keep existing person if personId is empty
            personName,
            metadata: {
                ...quote.metadata,
                title,
                languageCode,
                languageName: SUPPORTED_LANGUAGES.find(l => l.code === languageCode)?.name || quote.languageName,
            }
        };

        // Update audit if exists
        if (updatedQuote.audit) {
            updatedQuote.audit = {
                ...updatedQuote.audit,
                rationale,
                categories: { ...updatedQuote.audit.categories }
            };

            // update evidence in categories
            Object.keys(categoryEvidence).forEach(key => {
                const k = key as AuditCategory;
                if (updatedQuote.audit?.categories[k]) {
                    updatedQuote.audit.categories[k] = {
                        ...updatedQuote.audit.categories[k],
                        evidence: categoryEvidence[key]
                    };
                }
            });
        }

        onSave(updatedQuote);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4 flex flex-col">
                <h2 className="text-2xl font-bold text-cyan-400 mb-6">{t('editQuote')}</h2>

                <div className="space-y-4">
                    {/* Author Selection */}
                    <div className="relative" ref={personWrapperRef}>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('personLabel')}</label>
                        <input
                            type="text"
                            value={personSearch}
                            onChange={handlePersonSearchChange}
                            onFocus={() => setIsPersonDropdownOpen(true)}
                            className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                            placeholder={t('filterByPersonPlaceholder')}
                        />
                        {isPersonDropdownOpen && (
                            <ul className="absolute z-10 w-full bg-gray-700 shadow-lg max-h-48 rounded-md mt-1 overflow-auto border border-gray-600">
                                {isLoadingPeople ? (
                                    <li className="p-2 text-gray-400 text-sm">Loading...</li>
                                ) : (
                                    people.map(p => (
                                        <li
                                            key={p._id}
                                            className="cursor-pointer p-2 hover:bg-cyan-600 text-white text-sm"
                                            onClick={() => handlePersonSelect(p)}
                                        >
                                            {p.name}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}
                    </div>

                    {/* Quote Text */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('quoteText')}</label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            rows={4}
                            className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500"
                        />
                    </div>

                    {/* Analysis Context */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">{t('contextLabel')}</label>
                        <textarea
                            value={analysisContext}
                            onChange={e => setAnalysisContext(e.target.value)}
                            rows={2}
                            placeholder={t('contextPlaceholder')}
                            className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2 focus:ring-cyan-500 focus:border-cyan-500 text-sm"
                        />
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('sourceTitleLabelOptional')}</label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('dateLabel')}</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('sourceUrlLabel')}</label>
                            <input
                                type="text"
                                value={source}
                                onChange={e => setSource(e.target.value)}
                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">{t('languageLabel')}</label>
                            <select
                                value={languageCode}
                                onChange={e => setLanguageCode(e.target.value)}
                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2"
                            >
                                {SUPPORTED_LANGUAGES.map(l => (
                                    <option key={l.code} value={l.code}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Analysis Editing */}
                    {quote.audit && (
                        <div className="border-t border-gray-700 pt-4 mt-4">
                            <h3 className="text-lg font-semibold text-cyan-400 mb-2">{t('analysis')}</h3>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-300 mb-1">{t('rationale')}</label>
                                <textarea
                                    value={rationale}
                                    onChange={e => setRationale(e.target.value)}
                                    rows={3}
                                    className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2 text-sm"
                                />
                            </div>

                            {Object.keys(categoryEvidence).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-md font-medium text-gray-400">{t('evidence')}</h4>
                                    {Object.entries(categoryEvidence).map(([catKey, evidence]) => (
                                        <div key={catKey}>
                                            <label className="block text-xs font-medium text-cyan-300 mb-1">{catKey}</label>
                                            <textarea
                                                value={evidence}
                                                onChange={e => handleEvidenceChange(catKey, e.target.value)}
                                                rows={2}
                                                className="w-full bg-gray-700 text-white border-gray-600 rounded-md p-2 text-xs"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors font-medium"
                    >
                        {t('saveChanges')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditQuoteModal;
