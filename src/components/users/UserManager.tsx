import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import api from '../../utils/api';
import { UserList } from './UserList.tsx';
import { UserForm } from './UserForm.tsx';
import { PasswordModal } from './PasswordModal.tsx';
import Spinner from '../Spinner';
import { useI18n } from '../../i18n';

export const UserManager: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
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
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('userManagement')}</h1>
        <button
          onClick={handleAddUser}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          {t('addUser')}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <UserList
        users={users}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onChangePassword={handleChangePassword}
      />

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
    </div>
  );
};
