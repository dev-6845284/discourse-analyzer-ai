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
    <ModalWrapper title={t('editProfile')}>
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput label={t('aliasOrNameLabel')} type="text" value={alias} onChange={(e) => setAlias(e.target.value)} required />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none" disabled={isSubmitting}>{t('cancel')}</button>
          <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded focus:outline-none disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? t('saving') : t('saveChanges')}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};
