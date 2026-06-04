/**
 * UserForm Component
 *
 * Purpose:
 * - A modal form for creating a new user or editing an existing user.
 *
 * Behavior:
 * - Handles form validation (required fields, password length).
 * - Distinguishes between "Add" (requires password) and "Edit" (no password) modes.
 *
 * Location: src/components/users/UserForm.tsx
 */
import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../utils/api';
import { useI18n } from '../../i18n';
import ModalWrapper from '../ui/ModalWrapper';
import FormInput from '../ui/FormInput';

interface UserFormProps {
  user: User | null;
  onClose: () => void;
  onSubmit: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ user, onClose, onSubmit }) => {
  const [alias, setAlias] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'editor' | 'moderator' | 'viewer'>('viewer');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    if (user) {
      setAlias(user.alias || user.name);
      setEmail(user.email);
      setRole((user.role as any) || 'viewer');
    } else {
      setAlias('');
      setEmail('');
      setRole('viewer');
      setPassword('');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (user) {
        await api.put(`/users/${user._id}`, { alias, email, role });
      } else {
        await api.post('/users', { alias, email, role, password });
      }
      onSubmit();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper title={user ? t('editUser') : t('addUser')} onClose={onClose}>
      {error && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded text-red-600 dark:text-red-300 px-4 py-3">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <FormInput label={t('aliasLabel')} type="text" value={alias} onChange={(e) => setAlias(e.target.value)} required />

        <FormInput label={t('emailLabel')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <div className="mb-4">
          <label className="block text-gray-700 dark:text-gray-200 text-sm font-semibold mb-2">{t('roleLabel')}</label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="radio" name="role" value="viewer" checked={role === 'viewer'} onChange={() => setRole('viewer')} className="form-radio text-cyan-500 dark:text-cyan-400 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
              <span>Viewer</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="radio" name="role" value="moderator" checked={role === 'moderator'} onChange={() => setRole('moderator')} className="form-radio text-cyan-500 dark:text-cyan-400 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
              <span>Moderator</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="radio" name="role" value="editor" checked={role === 'editor'} onChange={() => setRole('editor')} className="form-radio text-cyan-500 dark:text-cyan-400 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
              <span>Editor</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
              <input type="radio" name="role" value="admin" checked={role === 'admin'} onChange={() => setRole('admin')} className="form-radio text-cyan-500 dark:text-cyan-400 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
              <span>Admin</span>
            </label>
          </div>
        </div>

        {!user && (
          <FormInput label={t('passwordLabel')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        )}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none transition-colors">{t('cancel')}</button>
          <button type="submit" disabled={isSubmitting} className="bg-cyan-600 hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-800 text-white font-semibold py-2 px-4 rounded focus:outline-none transition-colors disabled:opacity-50">{isSubmitting ? t('saving') : t('save')}</button>
        </div>
      </form>
    </ModalWrapper>
  );
};
