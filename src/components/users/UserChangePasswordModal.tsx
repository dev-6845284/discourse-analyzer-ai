import React, { useState } from 'react';
import api from '../../utils/api';
import { useI18n } from '../../i18n';
import ModalWrapper from '../ui/ModalWrapper';
import FormInput from '../ui/FormInput';

interface UserChangePasswordModalProps {
  onClose: () => void;
  onSubmit: () => void;
}

export const UserChangePasswordModal: React.FC<UserChangePasswordModalProps> = ({ onClose, onSubmit }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oldPassword.trim()) {
      setError(t('oldPasswordRequired') || 'Old password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    if (newPassword.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    setIsSubmitting(true);

    try {
      await api.put('/users/me/password', { oldPassword, newPassword });
      onSubmit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper title={t('changePassword')} onClose={onClose}>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-600 dark:text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput label={t('oldPassword') || 'Old Password'} type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required minLength={6} />

        <FormInput label={t('newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />

        <FormInput label={t('confirmPassword')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none transition-colors">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 text-white font-semibold py-2 px-4 rounded focus:outline-none disabled:opacity-50 transition-colors">{isSubmitting ? t('updating') : t('updatePassword')}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};
