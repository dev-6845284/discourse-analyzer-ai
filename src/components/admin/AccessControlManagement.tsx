/**
 * AccessControlManagement
 *
 * Purpose: Modal UI to view and manage HTTP access control entries used by the server.
 * - Fetches current access rules via `getAccessControlList()` on mount.
 * - Allows selecting a minimum `requiredRole` per method+path using radio buttons.
 * - Persists changes with `updateAccessControl()` for existing entries or
 *   `createAccessControl()` for new entries, then refreshes the list.
 * - Exposed as a modal component; parent should provide `onClose()`.
 *
 * Notes:
 * - Roles are constrained to `ROLES` in this file for the UI.
 * - This component performs optimistic UI updates by re-fetching after save.
 */

import React, { useEffect, useState } from 'react';
import { getAccessControlList, updateAccessControl, createAccessControl } from '../../utils/api';

interface AccessItem {
  _id?: string;
  method: string;
  path: string;
  requiredRole?: string;
}

const ROLES = ['public', 'viewer', 'moderator', 'editor', 'admin'];

const AccessControlManagement: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<AccessItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setLoading(true);
    getAccessControlList()
      .then((res) => setItems(res.data || []))
      .catch((err) => {
        console.error('Failed to load access control list', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleChangeRole = (id: string | undefined, index: number, role: string) => {
    const next = [...items];
    next[index] = { ...next[index], requiredRole: role };
    setItems(next);
  };

  const handleSave = async (item: AccessItem, index: number) => {
    const key = item._id || `${item.method}-${item.path}-${index}`;
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      if (item._id) {
        await updateAccessControl(item._id, { requiredRole: item.requiredRole });
      } else {
        await createAccessControl({ method: item.method, path: item.path, requiredRole: item.requiredRole });
      }
      // optimistic: mark saved visually by refetching
      const res = await getAccessControlList();
      setItems(res.data || []);
    } catch (e) {
      console.error('Failed to save access control', e);
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50" onClick={onClose} />
      <div className="w-full md:w-3/5 lg:w-2/5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Access Control Management</h2>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 text-sm rounded bg-gray-200 dark:bg-gray-700" onClick={onClose}>Close</button>
          </div>
        </div>

        {loading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-4">
            {items.length === 0 && <div className="text-sm text-gray-500">No access control entries found.</div>}
            {items.map((it, idx) => (
              <div key={it._id || `${it.method}-${idx}`} className="p-3 border rounded bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-medium">{it.method} <span className="text-xs text-gray-500">{it.path}</span></div>
                  <div className="text-xs text-gray-400">{it._id ? 'db' : 'unsaved'}</div>
                </div>

                <div className="flex items-center gap-4 flex-wrap">
                  {ROLES.map((r) => (
                    <label key={r} className={`inline-flex items-center text-sm ${!it.requiredRole && r === 'public' ? 'font-semibold' : ''}`}>
                      <input
                        type="radio"
                        name={`role-${idx}`}
                        value={r}
                        checked={it.requiredRole === r}
                        onChange={() => handleChangeRole(it._id, idx, r)}
                        className="mr-2"
                      />
                      {r}
                    </label>
                  ))}
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleSave(it, idx)}
                    disabled={saving[it._id || `${it.method}-${it.path}-${idx}`]}
                    className="px-3 py-1 rounded bg-cyan-600 text-white text-sm"
                  >
                    {saving[it._id || `${it.method}-${it.path}-${idx}`] ? 'Saving...' : 'Save'}
                  </button>
                  {!it.requiredRole && <span className="text-sm text-red-500">Missing role</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessControlManagement;
