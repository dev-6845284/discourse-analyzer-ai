import React from 'react';
import { User } from '../../types';
import { Edit, Trash2, RectangleEllipsis, Link as LinkIcon } from 'lucide-react';
import { useI18n } from '../../i18n';

interface UserListProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (userId: string) => void;
  onChangePassword: (user: User) => void;
  onAssignKeyset: (user: User) => void;
}

export const UserList: React.FC<UserListProps> = ({ users, onEdit, onDelete, onChangePassword, onAssignKeyset }) => {
  const { t } = useI18n();
  return (
    <div className="bg-gray-800 shadow-md rounded-lg overflow-hidden">
      <div className="overflow-hidden">
        <table className="w-full table-fixed divide-y divide-gray-700">
          <colgroup>
            <col style={{ width: '20%' }} />
            <col style={{ width: '45%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
          </colgroup>
          <thead className="sr-only">
            <tr>
              <th>{t('aliasLabel')}</th>
              <th>{t('emailLabel')}</th>
              <th>{t('roleLabel')}</th>
              <th>{t('createdAt')}</th>
              <th>{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="bg-gray-800 divide-y divide-gray-700">
            {users.map((user) => (
              <tr key={user._id} className="hover:bg-gray-700">
                <td colSpan={5} className="px-2 md:px-4 py-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    {/* Line 1: Name / Alias (with assigned keyset alias and role) and Date on the right */}
                    <div className="flex flex-col gap-1 w-full">
                      {/* Top row: left = alias, role, assigned keyset; right = date */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="font-medium text-gray-100 truncate">{user.alias}</div>
                          <div>
                            {user.role === 'admin' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-800 text-purple-100">{user.role}</span>
                            ) : user.role === 'editor' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-800 text-green-100">{user.role}</span>
                            ) : user.role === 'moderator' ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-800 text-yellow-100">{user.role}</span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-700 text-gray-100">{user.role}</span>
                            )}
                          </div>
                          {user.assignedKeysetAlias ? (
                            <div className="text-xs text-blue-400 flex items-center gap-1 min-w-0">
                              <LinkIcon size={16} className="text-blue-400 flex-shrink-0" />
                              <span className="truncate">{user.assignedKeysetAlias}</span>
                            </div>
                          ) : null}
                        </div>
                        <div className="text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</div>
                      </div>

                      {/* Bottom row: left = assign/edit/password, right = delete */}
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                           <button
                            onClick={() => onChangePassword(user)}
                            className="text-yellow-400 hover:text-yellow-300"
                            title={t('changePassword')}
                          >
                            <RectangleEllipsis size={20} />
                          </button>
                          <button
                            onClick={() => onAssignKeyset(user)}
                            className={` ${user.assignedKeysetAlias ? 'text-cyan-400 hover:text-cyan-300' : 'text-orange-400 hover:text-orange-300'}`}
                            title={t('keyset_assign')}
                          >
                            <LinkIcon size={20} />
                          </button>
                          <button
                            onClick={() => onEdit(user)}
                            className="text-indigo-300 hover:text-indigo-100"
                            title={t('editUser')}
                          >
                            <Edit size={20} />
                          </button>
                         
                        </div>
                        <div>
                          <button
                            onClick={() => onDelete(user._id)}
                            className="text-red-400 hover:text-red-300"
                            title={t('deleteUser')}
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      </div>
    </div>
  );
};
