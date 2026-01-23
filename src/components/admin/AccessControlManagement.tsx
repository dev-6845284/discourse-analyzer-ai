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
import { getAccessControlList, updateAccessControl, createAccessControl, importAccessControl } from '../../utils/api';
import ExportPermissionsModal from './ExportPermissionsModal';
import ImportPermissionsModal from './ImportPermissionsModal';

interface AccessItem {
  _id?: string;
  method: string;
  path: string;
  requiredRole?: string;
}

const ROLES = ['public', 'viewer', 'moderator', 'editor', 'admin'];

const AccessControlManagement: React.FC<{ onClose: () => void; inline?: boolean }> = ({ onClose, inline = false }) => {
  const [items, setItems] = useState<AccessItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [filterText, setFilterText] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMessage, setImportMessage] = useState('');

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

  const handleImport = async (permissions: AccessItem[]) => {
    try {
      const res = await importAccessControl(permissions);
      setImportMessage(`Successfully imported ${res.data.imported || permissions.length} permission(s)`);
      setTimeout(() => setImportMessage(''), 3000);
      // Refresh the list
      const updatedRes = await getAccessControlList();
      setItems(updatedRes.data || []);
    } catch (e: any) {
      throw new Error(e.response?.data?.message || 'Failed to import permissions');
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

  // shared inner content for modal or inline
  const inner = (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">Access Control</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Manage API endpoint visibility and role requirements.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-all text-sm font-semibold shadow-sm active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all text-sm font-semibold shadow-lg shadow-purple-500/20 active:scale-95"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Import
          </button>
        </div>
      </div>

      {importMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/30 text-green-700 dark:text-green-300 rounded-xl text-sm font-medium animate-in fade-in slide-in-from-top-2">
          {importMessage}
        </div>
      )}

      {loading && items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 font-medium">Loading permissions...</p>
        </div>
      ) : (
        <div className="space-y-6 flex-1 overflow-visible">
          <div className="flex flex-wrap items-center gap-4 mb-4 bg-gray-50/50 dark:bg-gray-900/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute inset-y-0 left-3 flex items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                placeholder="Filter endpoints by path..."
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-1 bg-white dark:bg-gray-950 p-1 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <button
                onClick={() => setRoleFilter('')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${roleFilter === '' ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >
                ALL
              </button>
              {ROLES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all uppercase ${roleFilter === r ? 'bg-cyan-500 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {items.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">No access control entries found.</p>
            </div>
          )}

          {filteredGroups.length === 0 && items.length > 0 && (
            <div className="text-center py-20 bg-white dark:bg-gray-800/40 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">No entries match the current filters.</p>
            </div>
          )}

          <div className="space-y-4">
            {filteredGroups.map((group) => (
              <div key={group.key} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/50 shadow-sm overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => setOpenGroup((g) => (g === group.key ? null : group.key))}
                  className={`w-full flex items-center justify-between text-left px-5 py-4 transition-colors ${openGroup === group.key ? 'bg-gray-50 dark:bg-gray-900/50' : 'hover:bg-gray-50 dark:hover:bg-gray-900/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${openGroup === group.key ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'bg-gray-100 dark:bg-gray-900 text-gray-500'}`}>
                      {group.key.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{group.key}</span>
                      <div className="flex gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30 px-1.5 py-0.5 rounded-md uppercase">{group.items.length} Endpoints</span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">{[...new Set(group.items.map(it => it.method))].join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`transition-transform duration-200 ${openGroup === group.key ? 'rotate-180' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>

                {openGroup === group.key && (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {group.items.map((it, idx) => {
                      const key = getItemKey(it);
                      const isSaving = !!saving[key];
                      return (
                        <div key={key} className="p-5 animate-in slide-in-from-top-2 duration-300">
                          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${it.method === 'GET' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : it.method === 'POST' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'}`}>
                                {it.method}
                              </span>
                              <span className="text-[13px] font-mono text-gray-600 dark:text-gray-400 group">{it.path}</span>
                              <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-widest">{it._id ? 'DB-ENTRY' : 'VOLATILE'}</span>
                            </div>

                            <button
                              onClick={() => handleSave(it)}
                              disabled={isSaving}
                              className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${isSaving ? 'bg-gray-100 dark:bg-gray-800 text-gray-400' : 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-cyan-500/20 active:scale-95'}`}
                            >
                              {isSaving ? (
                                <>
                                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Save</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            {ROLES.map((r) => (
                              <label
                                key={r}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer select-none
                                  ${it.requiredRole === r
                                    ? 'bg-cyan-500 border-cyan-500 text-white shadow-md'
                                    : 'bg-gray-50 dark:bg-gray-900 border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:border-cyan-500/30 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10'}`}
                              >
                                <input
                                  type="radio"
                                  name={`role-${key}-${idx}`}
                                  value={r}
                                  checked={it.requiredRole === r}
                                  onChange={() => handleChangeRole(key, r)}
                                  className="hidden"
                                />
                                <div className={`w-3 h-3 rounded-full border-2 border-current transition-all flex items-center justify-center ${it.requiredRole === r ? 'bg-white' : 'bg-transparent'}`}>
                                  {it.requiredRole === r && <div className="w-1 h-1 rounded-full bg-cyan-500"></div>}
                                </div>
                                <span className="uppercase">{r}</span>
                              </label>
                            ))}
                            {!it.requiredRole && (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-xl border border-red-100 dark:border-red-900/30 uppercase">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Missing role
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return (
      <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-xl rounded-2xl overflow-visible p-8">
        {inner}
        {showExportModal && <ExportPermissionsModal permissions={items} onClose={() => setShowExportModal(false)} />}
        {showImportModal && <ImportPermissionsModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex animate-in fade-in duration-300">
      <div className="flex-1 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full md:w-3/5 lg:w-[500px] bg-white dark:bg-black text-gray-900 dark:text-gray-100 shadow-2xl p-8 overflow-y-auto border-l border-gray-100 dark:border-gray-800 animate-in slide-in-from-right duration-300 ease-out">
        {inner}
        {showExportModal && <ExportPermissionsModal permissions={items} onClose={() => setShowExportModal(false)} />}
        {showImportModal && <ImportPermissionsModal onClose={() => setShowImportModal(false)} onImport={handleImport} />}
      </div>
    </div>
  );
};

export default AccessControlManagement;
