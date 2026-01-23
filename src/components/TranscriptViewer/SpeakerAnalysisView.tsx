import React, { useState, useMemo } from 'react';
import { Upload, Download, Zap, Edit2, Check, X, Plus, Trash2, GitMerge, Link2 } from 'lucide-react';
import { useI18n } from '../../i18n';
import { formatTimestamp } from '../../utils/transcriptHelpers';
import Spinner from '../Spinner';
import { PersonSimilarityMatch } from '../../utils/api';
import { SpeakerPersonLinkModal } from './SpeakerPersonLinkModal';

interface Speaker {
  id: string;
  name: string;
  personId?: string;
  personName?: string;
}

interface DialogLine {
  id: string;
  speakerId: string;
  speaker: string;
  text: string;
  startTime?: number;
  endTime?: number;
  timestamp?: string;
  timingMismatch?: boolean;
}

interface SpeakerBlock {
  blockId: string;
  startTime: number;
  endTime: number;
  speakers?: Speaker[];
  identifiedSpeakers: string[];
  dialogue: DialogLine[];
}

interface SpeakerAnalysisViewProps {
  isSpeakerAnalyzing: boolean;
  speakerResults: SpeakerBlock[];
  error: string | null;
  onAnalyzeDialog: (languageCode?: string) => void;
  onImportSpeakers: () => void;
  onExportSpeakers: () => void;
  onClearAnalysis: () => void;
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  onRenameSpeaker?: (speakerId: string, newName: string) => Promise<void>;
  onAddSpeaker?: (speakerName: string, existingPerson?: { personId: string; name: string }) => Promise<void>;
  onCheckSimilarPersons?: (speakerName: string) => Promise<PersonSimilarityMatch[]>;
  onRemoveSpeaker?: (speakerId: string) => Promise<boolean>;
  onUpdateLineSpeaker?: (blockId: string, lineId: string, newSpeakerId: string) => Promise<void>;
  onMergeSpeakers?: (speakerIdsToMerge: string[], targetSpeakerId: string) => Promise<boolean>;
  onLinkSpeakerToPerson?: (speakerId: string, personId: string, personName: string) => Promise<void>;
  onUnlinkSpeakerFromPerson?: (speakerId: string) => Promise<void>;
}

export const SpeakerAnalysisView: React.FC<SpeakerAnalysisViewProps> = ({
  isSpeakerAnalyzing,
  speakerResults,
  error,
  onAnalyzeDialog,
  onImportSpeakers,
  onExportSpeakers,
  onClearAnalysis,
  selectedLanguage = 'en',
  onLanguageChange,
  onRenameSpeaker,
  onAddSpeaker,
  onCheckSimilarPersons,
  onRemoveSpeaker,
  onUpdateLineSpeaker,
  onMergeSpeakers,
  onLinkSpeakerToPerson,
  onUnlinkSpeakerFromPerson,
}) => {
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [similarMatches, setSimilarMatches] = useState<PersonSimilarityMatch[]>([]);
  const [isCheckingMatches, setIsCheckingMatches] = useState(false);
  const { t } = useI18n();

  // Merge-related state
  const [selectedForMerge, setSelectedForMerge] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [targetSpeakerId, setTargetSpeakerId] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);

  // Link-to-person state
  const [speakerToLink, setSpeakerToLink] = useState<Speaker | null>(null);

  // Get all unique speakers across all blocks (as Speaker objects with id and name)
  const allSpeakers = useMemo(() => {
    const speakerMap = new Map<string, Speaker>();
    speakerResults.forEach(block => {
      block.speakers?.forEach(s => speakerMap.set(s.id, s));
    });
    return Array.from(speakerMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [speakerResults]);

  // Check if a speaker is used in any dialogue line
  const isSpeakerUsed = (speakerId: string) => {
    return speakerResults.some(block =>
      block.dialogue.some(line => line.speakerId === speakerId)
    );
  };

  const handleStartEdit = (speakerId: string, speakerName: string) => {
    setEditingSpeaker(speakerId);
    setEditValue(speakerName);
    setRemoveError(null);
  };

  const handleCancelEdit = () => {
    setEditingSpeaker(null);
    setEditValue('');
  };

  const handleSaveEdit = async () => {
    if (editingSpeaker && editValue.trim()) {
      await onRenameSpeaker?.(editingSpeaker, editValue.trim());
    }
    setEditingSpeaker(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const handleAddSpeaker = async () => {
    if (!newSpeakerName.trim()) return;

    // Check for similar existing persons first
    if (onCheckSimilarPersons) {
      setIsCheckingMatches(true);
      try {
        const matches = await onCheckSimilarPersons(newSpeakerName.trim());
        if (matches.length > 0) {
          // Show matches for user confirmation
          setSimilarMatches(matches);
          setIsCheckingMatches(false);
          return; // Don't add yet, wait for user selection
        }
      } catch (error) {
        console.error('Error checking similar persons:', error);
      }
      setIsCheckingMatches(false);
    }

    // No matches found, add as new speaker
    await onAddSpeaker?.(newSpeakerName.trim());
    setNewSpeakerName('');
    setIsAddingNew(false);
    setSimilarMatches([]);
  };

  const handleSelectExistingPerson = async (match: PersonSimilarityMatch) => {
    await onAddSpeaker?.(newSpeakerName.trim(), { personId: match.personId, name: match.name });
    setNewSpeakerName('');
    setIsAddingNew(false);
    setSimilarMatches([]);
  };

  const handleCreateNewSpeaker = async () => {
    await onAddSpeaker?.(newSpeakerName.trim());
    setNewSpeakerName('');
    setIsAddingNew(false);
    setSimilarMatches([]);
  };

  const handleCancelSimilarSelection = () => {
    setSimilarMatches([]);
  };

  const handleRemoveSpeaker = async (speaker: Speaker) => {
    setRemoveError(null);
    const success = await onRemoveSpeaker?.(speaker.id);
    if (!success) {
      setRemoveError(t('cannotRemoveSpeakerUsed', { name: speaker.name }));
      setTimeout(() => setRemoveError(null), 3000);
    }
  };

  // Merge handlers
  const toggleSpeakerSelection = (speakerId: string) => {
    setSelectedForMerge(prev => {
      const next = new Set(prev);
      if (next.has(speakerId)) {
        next.delete(speakerId);
      } else {
        next.add(speakerId);
      }
      return next;
    });
  };

  const handleOpenMergeModal = () => {
    if (selectedForMerge.size < 2) return;
    // Default to first selected speaker as target
    setTargetSpeakerId(Array.from(selectedForMerge)[0]);
    setShowMergeModal(true);
  };

  const handleCancelMerge = () => {
    setShowMergeModal(false);
    setTargetSpeakerId(null);
  };

  const handleConfirmMerge = async () => {
    if (!targetSpeakerId || selectedForMerge.size < 2) return;
    setIsMerging(true);
    try {
      const success = await onMergeSpeakers?.(Array.from(selectedForMerge), targetSpeakerId);
      if (success) {
        setSelectedForMerge(new Set());
        setShowMergeModal(false);
        setTargetSpeakerId(null);
      }
    } catch (error) {
      console.error('Error merging speakers:', error);
    } finally {
      setIsMerging(false);
    }
  };

  const selectedSpeakers = useMemo(() => {
    return allSpeakers.filter(s => selectedForMerge.has(s.id));
  }, [allSpeakers, selectedForMerge]);

  if (isSpeakerAnalyzing) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm min-h-[300px]">
        <div className="text-center text-purple-600 dark:text-purple-400">
          <Spinner className="w-10 h-10 mx-auto mb-4" />
          <p className="text-lg font-semibold animate-pulse">
            {t('identifyingSpeakers')}
          </p>
          <p className="text-sm opacity-70 mt-2">{t('thisMayTakeAMoment') || 'Mapping voices to personalities...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm min-h-[300px]">
        <div className="text-center text-red-600 dark:text-red-400 p-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-sm max-w-md mx-auto">
            <p className="font-bold text-lg mb-2">{t('errorAnalyzingSpeakers')}</p>
            <p className="text-sm opacity-90">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (speakerResults.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50/50 dark:bg-gray-800/30 p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Upload size={32} />
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{t('noSpeakerAnalysisData')}</p>
          <button
            onClick={onImportSpeakers}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20"
          >
            <Upload size={18} />
            {t('importAnalysisJson')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800/30 space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-gray-600 dark:text-gray-300">{t('analyzedBlocks', { count: speakerResults.length })}</p>
        <div className="flex gap-2 items-center">
          <div className="flex items-center gap-2 mr-2">
            <label htmlFor="speaker-language-select" className="text-xs text-gray-500 dark:text-gray-400">{t('language')}</label>
            <select
              id="speaker-language-select"
              value={selectedLanguage}
              onChange={(e) => onLanguageChange?.(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-300 text-xs rounded border border-gray-300 dark:border-gray-600 px-2 py-1 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="en">English</option>
              <option value="lt">Lithuanian</option>
              <option value="ru">Russian</option>
              <option value="de">German</option>
              <option value="fr">French</option>
              <option value="es">Spanish</option>
              <option value="it">Italian</option>
              <option value="pl">Polish</option>
              <option value="uk">Ukrainian</option>
            </select>
          </div>
          <button
            onClick={() => onAnalyzeDialog(selectedLanguage)}
            className="text-xs px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1 shadow-sm"
          >
            <Zap size={12} />
            {t('analyzeDialogTopics')}
          </button>
          <button
            onClick={onImportSpeakers}
            className="text-xs px-3 py-1 bg-blue-100 dark:bg-blue-600/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-600/50 flex items-center gap-1"
          >
            <Upload size={12} />
            {t('import')}
          </button>
          <button
            onClick={onExportSpeakers}
            className="text-xs px-3 py-1 bg-emerald-100 dark:bg-emerald-600/30 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-200 dark:hover:bg-emerald-600/50 flex items-center gap-1"
          >
            <Download size={12} />
            {t('exportJson')}
          </button>
          <button
            onClick={onClearAnalysis}
            className="text-xs px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {t('clearAnalysis')}
          </button>
        </div>
      </div>

      {/* Global Speakers Editor */}
      <div className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('identifiedSpeakers', { count: allSpeakers.length })}</h4>
          <div className="flex items-center gap-2">
            {selectedForMerge.size >= 2 && (
              <button
                onClick={handleOpenMergeModal}
                className="text-xs px-2 py-1 bg-orange-100 dark:bg-orange-600/30 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-600/50 flex items-center gap-1"
              >
                <GitMerge size={12} />
                {t('mergeSelected', { count: selectedForMerge.size })}
              </button>
            )}
            {selectedForMerge.size > 0 && (
              <button
                onClick={() => setSelectedForMerge(new Set())}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {t('clearSelection')}
              </button>
            )}
            {!isAddingNew && (
              <button
                onClick={() => setIsAddingNew(true)}
                className="text-xs px-2 py-1 bg-green-100 dark:bg-green-600/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-600/50 flex items-center gap-1"
              >
                <Plus size={12} />
                {t('addSpeaker')}
              </button>
            )}
          </div>
        </div>

        {removeError && (
          <div className="text-xs text-red-600 dark:text-red-400 mb-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-transparent">
            {removeError}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {allSpeakers.map(speaker => (
            <div key={speaker.id} className={`flex items-center gap-1 rounded-lg px-2 py-1 ${selectedForMerge.has(speaker.id) ? 'bg-orange-50 border border-orange-200 dark:bg-orange-700/30 dark:border-orange-600/50' : 'bg-gray-100 border border-gray-200 dark:bg-gray-700/50 dark:border-transparent'}`}>
              {editingSpeaker === speaker.id ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 focus:border-cyan-500 focus:outline-none w-32"
                  />
                  <button
                    onClick={handleSaveEdit}
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-0.5"
                    title="Save (Enter)"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-0.5"
                    title="Cancel (Escape)"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="checkbox"
                    checked={selectedForMerge.has(speaker.id)}
                    onChange={() => toggleSpeakerSelection(speaker.id)}
                    className="w-3 h-3 rounded border-gray-300 dark:border-gray-600 text-orange-500 focus:ring-orange-500 cursor-pointer"
                    title={t('selectForMerge')}
                  />
                  {/* Person link indicator */}
                  {speaker.personId ? (
                    <button
                      onClick={() => setSpeakerToLink(speaker)}
                      className="text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 p-0.5"
                      title={t('linkedTo', { name: speaker.personName || t('person') })}
                    >
                      <Link2 size={12} />
                    </button>
                  ) : (
                    <button
                      onClick={() => setSpeakerToLink(speaker)}
                      className="text-gray-400 hover:text-cyan-600 dark:text-gray-600 dark:hover:text-cyan-400 p-0.5"
                      title={t('linkToPersonRecord')}
                    >
                      <Link2 size={12} />
                    </button>
                  )}
                  <span className={`text-xs ${speaker.personId ? 'text-cyan-700 dark:text-cyan-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                    {speaker.name}
                    {speaker.personId && speaker.personName && speaker.personName !== speaker.name && (
                      <span className="text-gray-500 ml-1">({speaker.personName})</span>
                    )}
                  </span>
                  <button
                    onClick={() => handleStartEdit(speaker.id, speaker.name)}
                    className="text-gray-400 hover:text-cyan-600 dark:text-gray-500 dark:hover:text-cyan-400 p-0.5"
                    title={t('renameSpeaker')}
                  >
                    <Edit2 size={12} />
                  </button>
                  {!isSpeakerUsed(speaker.id) && (
                    <button
                      onClick={() => handleRemoveSpeaker(speaker)}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 p-0.5"
                      title={t('removeSpeakerUnused')}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </>
              )}
            </div>
          ))}

          {isAddingNew && (
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-2 py-1 border border-gray-200 dark:border-transparent">
              <input
                type="text"
                value={newSpeakerName}
                onChange={(e) => setNewSpeakerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSpeaker();
                  if (e.key === 'Escape') {
                    setIsAddingNew(false);
                    setNewSpeakerName('');
                    setSimilarMatches([]);
                  }
                }}
                placeholder={t('speakerNamePlaceholder')}
                autoFocus
                disabled={isCheckingMatches}
                className="text-xs bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 focus:border-cyan-500 focus:outline-none w-32 disabled:opacity-50"
              />
              {isCheckingMatches ? (
                <span className="text-xs text-gray-500 dark:text-gray-400 px-2">{t('checking')}</span>
              ) : (
                <>
                  <button
                    onClick={handleAddSpeaker}
                    className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-0.5"
                    title={t('addEnter')}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingNew(false);
                      setNewSpeakerName('');
                      setSimilarMatches([]);
                    }}
                    className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 p-0.5"
                    title={t('cancelEscape')}
                  >
                    <X size={14} />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Similar persons confirmation dialog */}
        {similarMatches.length > 0 && (
          <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              {t('similarExistingPersonsFoundFor', { name: newSpeakerName })}
            </p>
            <div className="space-y-2">
              {similarMatches.map(match => (
                <div
                  key={match.personId}
                  className="flex items-center justify-between bg-white dark:bg-gray-800/50 rounded p-2 border border-yellow-100 dark:border-transparent"
                >
                  <div className="flex-1">
                    <span className="text-sm text-gray-900 dark:text-gray-200 font-medium">{match.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                      ({Math.round(match.similarity * 100)}% {t('match')}{match.isExact && `, ${t('exact')}`})
                    </span>
                    {match.aliases.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t('aliasesLabel')} {match.aliases.join(', ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleSelectExistingPerson(match)}
                    className="text-xs px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded shadow-sm"
                  >
                    {t('useThis')}
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={handleCreateNewSpeaker}
                className="text-xs px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded shadow-sm"
              >
                {t('createNewAnyway', { name: newSpeakerName })}
              </button>
              <button
                onClick={handleCancelSimilarSelection}
                className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      {speakerResults.map(block => (
        <div
          key={block.blockId}
          className="bg-white dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm"
        >
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <span className="font-mono text-sm text-blue-600 dark:text-blue-400">
              {formatTimestamp(block.startTime)} - {formatTimestamp(block.endTime)}
            </span>
            <div className="flex gap-2">
              {block.identifiedSpeakers.map(speaker => (
                <span key={speaker} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-transparent">
                  {speaker}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4">
            {/* Table header */}
            <div className="hidden md:grid md:grid-cols-[80px_80px_150px_1fr] gap-3 mb-3 pb-3 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <div>{t('start')}</div>
              <div>{t('end')}</div>
              <div>{t('speaker')}</div>
              <div>{t('text')}</div>
            </div>

            {/* Dialogue rows */}
            <div className="space-y-1">
              {block.dialogue.map((line) => (
                <div key={line.id} className="grid grid-cols-1 md:grid-cols-[80px_80px_150px_1fr] gap-3 text-xs py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded px-2 transition-colors">
                  <div className="font-mono text-blue-600 dark:text-blue-400">
                    {line.startTime !== undefined ? formatTimestamp(line.startTime) : '—'}
                  </div>
                  <div className="font-mono text-blue-400/60">
                    {line.endTime !== undefined ? formatTimestamp(line.endTime) : '—'}
                  </div>
                  <div>
                    <select
                      value={line.speakerId}
                      onChange={(e) => onUpdateLineSpeaker?.(block.blockId, line.id, e.target.value)}
                      className="text-xs bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-400 font-semibold rounded border border-gray-300 dark:border-gray-600 px-2 py-1 focus:border-cyan-500 focus:outline-none w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      {allSpeakers.map(speaker => (
                        <option key={speaker.id} value={speaker.id}>
                          {speaker.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="flex-1">{line.text}</span>
                    {line.timingMismatch && (
                      <span className="text-amber-500 dark:text-amber-400 flex-shrink-0" title={t('timingWasFuzzyMatched')}>⚠</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {/* Merge Confirmation Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-4 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-cyan-700 dark:text-cyan-400 mb-4 flex items-center gap-2">
              <GitMerge size={20} className="text-orange-500 dark:text-orange-400" />
              {t('mergeSpeakers')}
            </h3>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {t('mergeSpeakersWarning', { count: selectedSpeakers.length })}
            </p>

            <div className="mb-4">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{t('speakersToMerge')}</p>
              <div className="flex flex-wrap gap-1">
                {selectedSpeakers.map(s => (
                  <span key={s.id} className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-transparent">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">{t('keepSpeakerAs')}</label>
              <select
                value={targetSpeakerId || ''}
                onChange={(e) => setTargetSpeakerId(e.target.value)}
                className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm rounded border border-gray-300 dark:border-gray-600 px-3 py-2 focus:border-orange-500 focus:outline-none"
              >
                {selectedSpeakers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {t('otherSpeakersWillBeRemoved')}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelMerge}
                disabled={isMerging}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleConfirmMerge}
                disabled={isMerging || !targetSpeakerId}
                className="px-4 py-2 text-sm bg-orange-600 text-white rounded hover:bg-orange-500 disabled:opacity-50 flex items-center gap-2 shadow-sm"
              >
                {isMerging ? (
                  <>
                    <Spinner />
                    {t('merging')}
                  </>
                ) : (
                  <>
                    <GitMerge size={14} />
                    {t('confirmMerge')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Speaker-to-Person Link Modal */}
      {speakerToLink && onLinkSpeakerToPerson && onUnlinkSpeakerFromPerson && (
        <SpeakerPersonLinkModal
          speaker={speakerToLink}
          onClose={() => setSpeakerToLink(null)}
          onLink={async (speakerId, personId, personName) => {
            await onLinkSpeakerToPerson(speakerId, personId, personName);
          }}
          onUnlink={async (speakerId) => {
            await onUnlinkSpeakerFromPerson(speakerId);
          }}
          onCreateAndLink={async (speakerId, personData) => {
            // This is handled inside the modal by creating a person first
          }}
        />
      )}
    </div>
  );
};

export default SpeakerAnalysisView;
