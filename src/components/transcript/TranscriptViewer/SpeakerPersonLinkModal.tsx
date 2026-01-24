import React, { useState } from 'react';
import { Link2, UserPlus, X, Check, Unlink } from 'lucide-react';
import { PersonSelector } from '../../people/PersonSelector';
import { usePeople } from '../../../hooks/usePeople';
import { Person } from '../../../types';
import Spinner from '../../ui/Spinner';
import { useI18n } from '../../../i18n';

interface Speaker {
  id: string;
  name: string;
  personId?: string;
  personName?: string;
}

interface SpeakerPersonLinkModalProps {
  speaker: Speaker;
  onClose: () => void;
  onLink: (speakerId: string, personId: string, personName: string) => Promise<void>;
  onUnlink: (speakerId: string) => Promise<void>;
  onCreateAndLink: (speakerId: string, personData: { name: string; aliases?: string[] }) => Promise<void>;
}

export const SpeakerPersonLinkModal: React.FC<SpeakerPersonLinkModalProps> = ({
  speaker,
  onClose,
  onLink,
  onUnlink,
  onCreateAndLink,
}) => {
  const { t } = useI18n();
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [selectedPersonName, setSelectedPersonName] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [newPersonName, setNewPersonName] = useState(speaker.name);
  const [newPersonAliases, setNewPersonAliases] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { createPerson } = usePeople();

  const handleSelectPerson = (person: Person) => {
    setSelectedPerson(person);
    setSelectedPersonName(person.name);
    setError(null);
  };

  const handleLinkExisting = async () => {
    if (!selectedPerson) {
      setError(t('pleaseSelectPersonFromList'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onLink(speaker.id, selectedPerson._id, selectedPerson.name);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToLinkPerson'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newPersonName.trim()) {
      setError(t('pleaseEnterNameForNewPerson'));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const aliases = newPersonAliases
        .split(',')
        .map(a => a.trim())
        .filter(a => a.length > 0);

      // Create person first
      const newPerson = await createPerson({
        name: newPersonName.trim(),
        aliases,
      });

      if (newPerson) {
        await onLink(speaker.id, newPerson._id, newPerson.name);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToCreatePerson'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onUnlink(speaker.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('failedToUnlinkPerson'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLinked = !!speaker.personId;

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400 flex items-center gap-2">
            <Link2 size={20} className="text-cyan-600 dark:text-cyan-400" />
            {t('linkSpeakerToPerson')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X size={20} />
          </button>
        </div>

        {/* Speaker info */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-transparent">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{t('speakerLabel')}:</p>
          <p className="text-gray-900 dark:text-white font-medium">{speaker.name}</p>
          {isLinked && (
            <p className="text-xs text-cyan-600 dark:text-cyan-400 mt-1 flex items-center gap-1">
              <Link2 size={12} />
              {t('currentlyLinkedTo', { name: speaker.personName })}
            </p>
          )}
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode('select')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${mode === 'select'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <Link2 size={14} />
            Select Existing
          </button>
          <button
            onClick={() => setMode('create')}
            className={`flex-1 px-3 py-2 text-sm rounded-lg flex items-center justify-center gap-2 transition-colors ${mode === 'create'
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <UserPlus size={14} />
            Create New
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/50 rounded text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {mode === 'select' ? (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                {t('searchAndSelectPerson')}:
              </label>
              <PersonSelector
                value={selectedPersonName}
                onChange={setSelectedPersonName}
                onSelectPerson={handleSelectPerson}
                placeholder={t('typeToSearch')}
              />
            </div>

            {selectedPerson && (
              <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700/50 rounded-lg">
                <p className="text-sm text-cyan-800 dark:text-cyan-200 font-medium">{selectedPerson.name}</p>
                {selectedPerson.aliases && selectedPerson.aliases.length > 0 && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Aliases: {selectedPerson.aliases.join(', ')}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleLinkExisting}
              disabled={!selectedPerson || isSubmitting}
              className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  {t('linking')}
                </>
              ) : (
                <>
                  <Check size={16} />
                  {t('linkToSelectedPerson')}
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                {t('personNameLabel')}:
              </label>
              <input
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                placeholder={t('enterPersonName')}
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">
                {t('aliasesLabelOptional')}:
              </label>
              <input
                type="text"
                value={newPersonAliases}
                onChange={(e) => setNewPersonAliases(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 shadow-sm"
                placeholder={t('aliasesPlaceholderExample')}
              />
            </div>

            <button
              onClick={handleCreateAndLink}
              disabled={!newPersonName.trim() || isSubmitting}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  {t('creating')}
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  {t('createPersonAndLink')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Unlink option if currently linked */}
        {isLinked && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleUnlink}
              disabled={isSubmitting}
              className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Unlink size={16} />
              Unlink from Person
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpeakerPersonLinkModal;
