import React from 'react';
import { User } from '../../types';
import { Edit, Trash2, Key } from 'lucide-react';
import { useI18n } from '../../i18n';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onChangePassword: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete, onChangePassword }) => {
  const { t } = useI18n();
  return (
    <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('aliasLabel')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('emailLabel')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('roleLabel')}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">{t('createdAt')}</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-normal text-sm font-medium text-gray-100">{user.alias}</td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-400">{user.email}</td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-400">
                  {user.role === 'admin' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-800 text-purple-100">{user.role}</span>
                  ) : user.role === 'editor' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-800 text-green-100">{user.role}</span>
                  ) : user.role === 'moderator' ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-800 text-yellow-100">{user.role}</span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-700 text-gray-100">{user.role}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-normal text-sm text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-normal text-right text-sm font-medium">
                  <button
                    onClick={() => onEdit(user)}
                    className="text-indigo-300 hover:text-indigo-100 mr-4"
                    title={t('editUser')}
                  >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => onChangePassword(user)}
                  className="text-yellow-400 hover:text-yellow-300 mr-4"
                  title={t('changePassword')}
                >
                  <Key size={18} />
                </button>
                <button
                  onClick={() => onDelete(user._id)}
                  className="text-red-400 hover:text-red-300"
                  title={t('deleteUser')}
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
