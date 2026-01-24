/**
 * EditProfileModal Component
 *
 * Purpose:
 * - Allows a logged-in user to edit their own profile details (e.g. Alias).
 *
 * Behavior:
 * - Simple form with validation.
 * - Updates the user in the backend and calls `onSubmit` with new data on success.
 *
 * Location: src/components/users/EditProfileModal.tsx
 */
import React, { useState } from 'react';
import api from '../../utils/api';
import { useI18n } from '../../i18n';
import ModalWrapper from '../ui/ModalWrapper';
import FormInput from '../ui/FormInput';

interface EditProfileModalProps {
  user: { _id: string; name?: string; alias?: string };
  onClose: () => void;
  onSubmit: (newName: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ user, onClose, onSubmit }) => {
  const [alias, setAlias] = useState(user.alias || user.name || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!alias.trim()) {
      setError(t('aliasCannotBeEmpty'));
      return;
    }

    setIsSubmitting(true);

    try {
      await api.put(`/users/${user._id}`, { alias });
      onSubmit(alias);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper title={t('editProfile')} onClose={onClose}>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-600 dark:text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput label={t('aliasOrNameLabel')} type="text" value={alias} onChange={(e) => setAlias(e.target.value)} required />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none transition-colors" disabled={isSubmitting}>{t('cancel')}</button>
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 text-white font-semibold py-2 px-4 rounded focus:outline-none disabled:opacity-50 transition-colors" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('saveChanges')}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};
