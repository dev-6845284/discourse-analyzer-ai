import React, { useState } from 'react';
import api from '../../utils/api';
import { useI18n } from '../../i18n';
import ModalWrapper from '../ui/ModalWrapper';
import FormInput from '../ui/FormInput';

interface PasswordModalProps {
  user: { _id: string; name?: string; alias?: string };
  onClose: () => void;
  onSubmit: () => void;
}

export const PasswordModal: React.FC<PasswordModalProps> = ({ user, onClose, onSubmit }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('passwordMinLength'));
      return;
    }

    setIsSubmitting(true);

    try {
      await api.put(`/users/${user._id}/password`, { password });
      onSubmit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper title={t('changePasswordFor', { name: user.name || user.alias })}>
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-700 rounded text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput label={t('newPassword')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />

        <FormInput label={t('confirmPassword')} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded focus:outline-none disabled:opacity-50">{isSubmitting ? t('updating') : t('updatePassword')}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};
