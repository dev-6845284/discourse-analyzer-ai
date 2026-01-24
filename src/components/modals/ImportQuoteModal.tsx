/**
 * ImportQuoteModal Component
 *
 * Purpose:
 * - Confirmation dialog for importing a batch of quotes (e.g. from JSON).
 *
 * Behavior:
 * - summarises the import data.
 * - Allows assigning the imported quotes to a specific Person (new or existing).
 *
 * Location: src/components/modals/ImportQuoteModal.tsx
 */
import React, { useState, useEffect } from 'react';
import ModalWrapper from '../ui/ModalWrapper';
import { ExportData, Person } from '../../types';
import { useI18n } from '../../i18n';
import { PersonSelector } from '../people/PersonSelector';
import { PersonManager } from '../people/PersonManager';

interface ImportQuoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    importData: ExportData | null;
    onConfirm: (person: Person | null) => void;
}

const ImportQuoteModal: React.FC<ImportQuoteModalProps> = ({
    isOpen,
    onClose,
    importData,
    onConfirm,
}) => {
    const { t } = useI18n();
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [personName, setPersonName] = useState<string>('');

    useEffect(() => {
        if (!isOpen) {
            setSelectedPerson(null);
            setPersonName('');
        }
    }, [isOpen]);

    useEffect(() => {
        if (importData) {
            setPersonName(importData.personName || '');
            // Initialize with the name from import data. PersonSelector will handle
            // matching this name to an existing person or allowing a new one to be created.
            // But PersonSelector might handle finding it by name if passed initially? 
            // Actually PersonSelector takes `value` (string name) and `onSelectPerson`.
            // It will display matching person.
            // Ideally we want to default to the name.
        }
    }, [importData]);

    if (!isOpen || !importData) return null;

    const handleConfirm = () => {
        // If no person selected from DB but name entered, pass a mock person object with just name
        // The handler in controller will deal with creating or using existing.
        const finalPerson: Person = selectedPerson || {
            name: personName,
            aliases: [],
            links: [],
            metadata: {}
        };
        onConfirm(finalPerson);
    };

    return (
        <ModalWrapper title={t('importTitle')} onClose={onClose}>
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded text-sm">
                    <p className="font-semibold">{t('importQuotesSummary', { count: importData.quotes.length })}</p>
                    <p className="text-xs mt-1 opacity-80">{t('importSourcePerson', { name: importData.personName })}</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('assignQuotesTo')}
                    </label>
                    <PersonSelector
                        value={personName}
                        onChange={(name) => {
                            setPersonName(name);
                            setSelectedPerson(null);
                        }}
                        onSelectPerson={(person) => {
                            setSelectedPerson(person);
                            setPersonName(person.name);
                        }}
                    />
                    {personName && !selectedPerson && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            {t('personWillBeCreated')}
                        </p>
                    )}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!personName.trim()}
                        className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {t('import')}
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default ImportQuoteModal;
