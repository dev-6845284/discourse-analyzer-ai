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
    <ModalWrapper title={t('changePassword')}>
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput label={t('oldPassword') || 'Old Password'} type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required minLength={6} />

        <FormInput label={t('newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />

        <FormInput label={t('confirmPassword')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded focus:outline-none disabled:opacity-50">{isSubmitting ? t('updating') : t('updatePassword')}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};
