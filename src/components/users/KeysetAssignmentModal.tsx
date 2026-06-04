/**
 * KeysetAssignmentModal Component
 *
 * Purpose:
 * - Admin modal to assign a shared API Keyset to a specific user.
 *
 * Behavior:
 * - Fetches available keysets (filtering out private user keysets).
 * - Allows assigning or unassigning a keyset.
 *
 * Location: src/components/users/KeysetAssignmentModal.tsx
 */
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { assignKeysetToUser, unassignKeysetFromUser, getAdminKeysets } from '../../utils/api';
import { useI18n } from '../../i18n';
import ModalWrapper from '../ui/ModalWrapper';

interface Keyset {
  _id: string;
  alias: string;
  has_GEMINI_API_KEY?: boolean;
  has_GROK_API_KEY?: boolean;
  has_CHATGPT_API_KEY?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KeysetAssignmentModalProps {
  user: User;
  assignedKeysetId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const KeysetAssignmentModal: React.FC<KeysetAssignmentModalProps> = ({
  user,
  assignedKeysetId,
  onClose,
  onSuccess,
}) => {
  const { t } = useI18n();
  const [keysets, setKeysets] = useState<Keyset[]>([]);
  const [selectedKeysetId, setSelectedKeysetId] = useState<string | null>(assignedKeysetId || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKeysets();
  }, []);

  const fetchKeysets = async () => {
    try {
      setLoading(true);
      const res = await getAdminKeysets();
      // console.log('[KeysetAssignmentModal] API response:', res.data);

      // Filter out USERS_KEYSET (the private per-user keyset)
      const USERS_KEYSET_ALIAS = 'USERS_KEYSET';
      const allKeysets = res.data || [];
      const filtered = allKeysets.filter((k: Keyset) => k.alias !== USERS_KEYSET_ALIAS);

      // console.log('[KeysetAssignmentModal] Filtered keysets:', filtered);
      setKeysets(filtered);
      setError(null);
    } catch (err: any) {
      console.error('[KeysetAssignmentModal] Error fetching keysets:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load keysets');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedKeysetId) {
      setError('Please select a keyset');
      return;
    }

    try {
      setLoading(true);
      await assignKeysetToUser(selectedKeysetId, user._id);
      setError(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to assign keyset');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!assignedKeysetId) return;

    try {
      setLoading(true);
      await unassignKeysetFromUser(assignedKeysetId, user._id);
      setSelectedKeysetId(null);
      setError(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to unassign keyset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalWrapper title={t('keyset_assignment')} onClose={onClose}>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {t('userManagement')}: <span className="font-semibold text-gray-900 dark:text-gray-200">{user.name || user.email}</span>
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-600 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="mb-4">
        {assignedKeysetId && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {t('keyset_current', { alias: keysets.find(k => k._id === assignedKeysetId)?.alias || 'Unknown' })}
          </p>
        )}
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('keyset_assigned')}</label>
        {loading ? (
          <div className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded text-gray-500 dark:text-gray-400 text-sm">
            Loading keysets...
          </div>
        ) : (
          <select
            value={selectedKeysetId || ''}
            onChange={e => setSelectedKeysetId(e.target.value || null)}
            disabled={keysets.length === 0}
            className="w-full p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 focus:border-cyan-500 focus:outline-none transition-colors disabled:opacity-50"
          >
            <option value="">{t('keyset_none')}</option>
            {keysets.map(keyset => (
              <option key={keyset._id} value={keyset._id}>
                {keyset.alias}
              </option>
            ))}
          </select>
        )}
        {!loading && keysets.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No keysets available</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded transition-colors text-sm disabled:opacity-50 font-semibold"
        >
          {t('cancel')}
        </button>
        {assignedKeysetId && (
          <button
            onClick={handleUnassign}
            disabled={loading}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors text-sm disabled:opacity-50 font-semibold"
          >
            {t('keyset_unassign')}
          </button>
        )}
        <button
          onClick={handleAssign}
          disabled={loading || !selectedKeysetId || selectedKeysetId === assignedKeysetId}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 text-white rounded transition-colors text-sm disabled:opacity-50 font-semibold"
        >
          {t('keyset_assign')}
        </button>
      </div>
    </ModalWrapper>
  );
};
