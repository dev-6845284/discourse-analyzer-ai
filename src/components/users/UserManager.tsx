import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../utils/api';
import { UserList } from './UserList.tsx';
import { UserForm } from './UserForm.tsx';
import { PasswordModal } from './PasswordModal.tsx';
import { KeysetAssignmentModal } from './KeysetAssignmentModal.tsx';
import Spinner from '../Spinner';
import { useI18n } from '../../i18n';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isKeysetModalOpen, setIsKeysetModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserKeysetId, setSelectedUserKeysetId] = useState<string | undefined>();
  const { t } = useI18n();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/users');
      setUsers(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || t('failedToFetchUsers'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsFormOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormOpen(true);
  };

  const handleChangePassword = (user: User) => {
    setSelectedUser(user);
    setIsPasswordModalOpen(true);
  };

  const handleAssignKeyset = (user: User) => {
    setSelectedUser(user);
    setSelectedUserKeysetId(user.assignedKeysetId);
    setIsKeysetModalOpen(true);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('confirmDeleteUser'))) return;

    try {
      await api.delete(`/users/${userId}`);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.message || t('failedToDeleteUser'));
    }
  };

  const handleFormSubmit = async () => {
    await fetchUsers();
    setIsFormOpen(false);
  };

  const handlePasswordSubmit = () => {
    setIsPasswordModalOpen(false);
    alert(t('passwordUpdated'));
  };

  if (isLoading) return <div className="flex justify-center p-8"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center px-1">
        <button
          onClick={handleAddUser}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          {t('addUser')}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800/40 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <UserList
          users={users}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onChangePassword={handleChangePassword}
          onAssignKeyset={handleAssignKeyset}
        />
      </div>

      {isFormOpen && (
        <UserForm
          user={selectedUser}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}

      {isPasswordModalOpen && selectedUser && (
        <PasswordModal
          user={selectedUser}
          onClose={() => setIsPasswordModalOpen(false)}
          onSubmit={handlePasswordSubmit}
        />
      )}

      {isKeysetModalOpen && selectedUser && (
        <KeysetAssignmentModal
          user={selectedUser}
          assignedKeysetId={selectedUserKeysetId}
          onClose={() => setIsKeysetModalOpen(false)}
          onSuccess={() => {
            fetchUsers();
          }}
        />
      )}
    </div>
  );
};
