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

import React, { useEffect, useMemo, useState } from 'react';
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
  const [filterText, setFilterText] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getAccessControlList()
      .then((res) => setItems(res.data || []))
      .catch((err) => {
        console.error('Failed to load access control list', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // auto-open first group after items load so items are visible by default
  useEffect(() => {
    if (items.length > 0 && !openGroup) {
      const first = items[0];
      const parts = first.path.split('/').filter(Boolean);
      const key = parts[1] ?? parts[0] ?? '/';
      setOpenGroup(key);
    }
  }, [items, openGroup]);

  const getItemKey = (it: AccessItem) => it._id ?? `${it.method}-${it.path}`;

  const handleChangeRole = (itemKey: string, role: string) => {
    setItems((prev) => prev.map((it) => (getItemKey(it) === itemKey ? { ...it, requiredRole: role } : it)));
  };

  const handleSave = async (item: AccessItem) => {
    const key = getItemKey(item);
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      if (item._id) {
        await updateAccessControl(item._id, { requiredRole: item.requiredRole });
      } else {
        await createAccessControl({ method: item.method, path: item.path, requiredRole: item.requiredRole });
      }
      const res = await getAccessControlList();
      setItems(res.data || []);
    } catch (e) {
      console.error('Failed to save access control', e);
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  // derived / computed view: apply text + role filters then group by second path segment
  const filteredGroups = useMemo(() => {
    const filtered = items.filter((it) => {
      if (roleFilter && it.requiredRole !== roleFilter) return false;
      const text = filterText.trim().toLowerCase();
      if (!text) return true;
      // match only by path as requested
      return it.path.toLowerCase().includes(text);
    });

    const groups: Record<string, AccessItem[]> = {};
    filtered.forEach((it) => {
      const parts = it.path.split('/').filter(Boolean);
      const key = parts[1] ?? parts[0] ?? '/';
      if (!groups[key]) groups[key] = [];
      groups[key].push(it);
    });

    // sort group keys
    const ordered = Object.keys(groups).sort().map((k) => ({ key: k, items: groups[k] }));
    return ordered;
  }, [items, filterText, roleFilter]);

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
            <div className="flex items-center gap-3 mb-2">
              <input
                placeholder="Filter by path"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="flex-1 px-3 py-2 border rounded bg-white dark:bg-gray-700"
              />
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center text-sm">
                  <input type="radio" name="roleFilter" value="" checked={roleFilter === ''} onChange={() => setRoleFilter('')} className="mr-2" />
                  All
                </label>
                {ROLES.map((r) => (
                  <label key={r} className="inline-flex items-center text-sm">
                    <input type="radio" name="roleFilter" value={r} checked={roleFilter === r} onChange={() => setRoleFilter(r)} className="mr-2" />
                    {r}
                  </label>
                ))}
              </div>
            </div>

            {items.length === 0 && <div className="text-sm text-gray-500">No access control entries found.</div>}

            {filteredGroups.length === 0 && items.length > 0 && (
              <div className="text-sm text-gray-500">No entries match the current filters.</div>
            )}

            {filteredGroups.map((group) => (
              <div key={group.key} className="space-y-2">
                <button
                  type="button"
                  onClick={() => setOpenGroup((g) => (g === group.key ? null : group.key))}
                  className="w-full flex items-center justify-between text-left px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded hover:opacity-90"
                >
                  <div className="text-sm font-semibold">
                    {group.key} <span className="text-xs text-gray-500">({group.items.length})</span>
                    <span className="ml-2 text-xs text-gray-500">{group.items.map((it) => it.method).join(', ')}</span>
                  </div>
                  <div className="text-xs text-gray-500">{openGroup === group.key ? '▾' : '▸'}</div>
                </button>

                {openGroup === group.key && group.items.map((it, idx) => {
                  const key = getItemKey(it);
                  return (
                    <div key={key} className="p-3 border rounded bg-gray-50 dark:bg-gray-900">
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
                              onChange={() => handleChangeRole(key, r)}
                              className="mr-2"
                            />
                            {r}
                          </label>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          onClick={() => handleSave(it)}
                          disabled={!!saving[key]}
                          className="px-3 py-1 rounded bg-cyan-600 text-white text-sm"
                        >
                          {saving[key] ? 'Saving...' : 'Save'}
                        </button>
                        {!it.requiredRole && <span className="text-sm text-red-500">Missing role</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessControlManagement;
