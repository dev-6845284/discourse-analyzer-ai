import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../utils/api';
import { useI18n } from '../../i18n';

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
      setAlias(user.alias);
      setEmail(user.email);
      setRole(user.role);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-cyan-400">{user ? t('editUser') : t('addUser')}</h2>
        
        {error && (
          <div className="mb-4 bg-red-900/30 border border-red-700 rounded text-red-300 px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-200 text-sm font-semibold mb-2">{t('aliasLabel')}</label>
            <input
              type="text"
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded w-full py-2 px-3 text-gray-100 leading-tight focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 text-sm font-semibold mb-2">{t('emailLabel')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded w-full py-2 px-3 text-gray-100 leading-tight focus:outline-none focus:border-cyan-400"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-200 text-sm font-semibold mb-2">{t('roleLabel')}</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="role"
                  value="viewer"
                  checked={role === 'viewer'}
                  onChange={() => setRole('viewer')}
                  className="form-radio text-cyan-400 bg-gray-900"
                />
                <span>Viewer</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="role"
                  value="moderator"
                  checked={role === 'moderator'}
                  onChange={() => setRole('moderator')}
                  className="form-radio text-cyan-400 bg-gray-900"
                />
                <span>Moderator</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="role"
                  value="editor"
                  checked={role === 'editor'}
                  onChange={() => setRole('editor')}
                  className="form-radio text-cyan-400 bg-gray-900"
                />
                <span>Editor</span>
              </label>

              <label className="flex items-center gap-2 text-sm text-gray-200">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="form-radio text-cyan-400 bg-gray-900"
                />
                <span>Admin</span>
              </label>
            </div>
          </div>

          {!user && (
            <div className="mb-6">
              <label className="block text-gray-200 text-sm font-semibold mb-2">{t('passwordLabel')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-gray-900 border border-gray-600 rounded w-full py-2 px-3 text-gray-100 leading-tight focus:outline-none focus:border-cyan-400"
                required
                minLength={6}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-700 hover:bg-gray-600 text-gray-100 font-semibold py-2 px-4 rounded focus:outline-none"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-2 px-4 rounded focus:outline-none disabled:opacity-50"
            >
              {isSubmitting ? t('saving') : t('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
