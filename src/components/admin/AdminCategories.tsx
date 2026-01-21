/**
 * AdminCategories component
 *
 * Purpose:
 * - Provides an admin UI for managing "audit categories" used by the application.
 * - Allows listing, creating, updating, deleting, and reloading category definitions
 *   via API helpers in `src/utils/api`.
 *
 * Behavior:
 * - Renders a form for creating/editing categories and a table of existing categories.
 * - Uses the `useI18n` hook for translations of labels and messages.
 * - Interacts with server endpoints through `getAdminCategories`,
 *   `createAdminCategory`, `updateAdminCategory`, `deleteAdminCategory`, and
 *   `reloadAdminCategories`.
 *
 * Data shape (Category):
 * - `id` (string): unique identifier (read-only when editing)
 * - `title` (string): human-readable title
 * - `description` (string): optional description
 * - `promptGuidance` (string): guidance text used by LLM prompts
 * - `modes` (string[]): modes this category applies to (e.g., ["audit","flaws"])
 * - `uiOrder` (number): ordering hint for UI
 *
 * Location: src/components/admin/AdminCategories.tsx
 */
import React, { useEffect, useState } from 'react';
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  reloadAdminCategories,
} from '../../utils/api';
import { useI18n } from '../../i18n';
import { CategoryDefinition } from '../../types';

// Default empty form state
const emptyForm: CategoryDefinition = {
  id: '',
  title: '',
  description: '',
  promptGuidance: '',
  modes: ['audit'],
  uiOrder: 0,
  translations: {}
};

const AdminCategories: React.FC = () => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<CategoryDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryDefinition | null>(null);
  const [form, setForm] = useState<CategoryDefinition>(emptyForm);
  const [activeLang, setActiveLang] = useState<'default' | 'lt'>('default');

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminCategories();
      setCategories(res.data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    try {
      if (editing) {
        const res = await updateAdminCategory(editing.id, form);
        const updated = res?.data || form;
        // keep the form populated with the updated category so user can continue editing
        setForm(updated);
        setEditing(updated);
        await load();
      } else {
        await createAdminCategory(form);
        setForm(emptyForm);
        setEditing(null);
        await load();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Save failed');
    }
  };

  const handleEdit = (c: CategoryDefinition) => {
    setEditing(c);
    setForm({ ...c, translations: c.translations || {} });
    setActiveLang('default');
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('analysisCategories_deleteConfirm'))) return;
    try {
      await deleteAdminCategory(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  const handleReload = async () => {
    setLoading(true);
    try {
      await reloadAdminCategories();
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Reload failed');
    } finally { setLoading(false); }
  };

  const updateTranslation = (field: 'title' | 'description' | 'promptGuidance', value: string) => {
    if (activeLang === 'default') {
      setForm({ ...form, [field]: value });
    } else {
      const translations = { ...form.translations };
      if (!translations[activeLang]) translations[activeLang] = {};
      translations[activeLang] = { ...translations[activeLang], [field]: value };
      setForm({ ...form, translations });
    }
  };

  const getFieldValue = (field: 'title' | 'description' | 'promptGuidance') => {
    if (activeLang === 'default') {
      return (form as any)[field];
    }
    return form.translations?.[activeLang]?.[field] || '';
  };

  return (
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('analysisCategories_title')}</h2>
        <div className="flex gap-2">
          <button className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors text-sm text-gray-900 dark:text-white" onClick={load} disabled={loading}>{t('analysisCategories_refresh')}</button>
          <button className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded transition-colors text-sm text-white" onClick={handleReload} disabled={loading}>{t('analysisCategories_reloadCache')}</button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-red-700 dark:text-red-300">{error}</div>}

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{editing ? t('edit') : t('analysisCategories_create')}</h3>

          {/* Language Switcher for Editing */}
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded p-1">
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded ${activeLang === 'default' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
              onClick={() => setActiveLang('default')}
            >
              English (Default)
            </button>
            <button
              type="button"
              className={`px-3 py-1 text-xs rounded ${activeLang === 'lt' ? 'bg-blue-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'}`}
              onClick={() => setActiveLang('lt')}
            >
              Lietuvių (LT)
            </button>
            <div className="w-px bg-gray-300 dark:bg-gray-700 mx-1"></div>
            <button
              type="button"
              className="px-3 py-1 text-xs rounded text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 hover:bg-gray-200 dark:hover:bg-gray-800 flex items-center gap-1"
              title="Copy current fields as JSON for translation"
              onClick={() => {
                const data = {
                  title: getFieldValue('title'),
                  description: getFieldValue('description'),
                  promptGuidance: getFieldValue('promptGuidance')
                };
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                // Optional: show a small toast or temporary text change
                const btn = document.activeElement as HTMLButtonElement;
                if (btn) {
                  const original = btn.innerHTML;
                  btn.innerHTML = 'Copied!';
                  setTimeout(() => btn.innerHTML = original, 1000);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              Copy JSON
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ID and Title Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase">ID (Internal)</label>
              <input placeholder={t('analysisCategories_placeholder_id')} value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors" required readOnly={!!editing} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase">Title ({activeLang})</label>
              <input placeholder={t('analysisCategories_placeholder_title')} value={getFieldValue('title')} onChange={e => updateTranslation('title', e.target.value)} className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors" required={activeLang === 'default'} />
            </div>
          </div>

          {/* UI Order */}
          <input placeholder={t('analysisCategories_placeholder_uiOrder')} value={String(form.uiOrder ?? 0)} onChange={e => setForm({ ...form, uiOrder: Number(e.target.value || 0) })} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors" />

          {/* Description and Prompt Guidance */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase">Description ({activeLang})</label>
              <textarea placeholder={t('analysisCategories_placeholder_description')} value={getFieldValue('description')} onChange={e => updateTranslation('description', e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors min-h-20 resize-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 uppercase">Prompt Guidance ({activeLang})</label>
              <textarea placeholder={t('analysisCategories_placeholder_promptGuidance')} value={getFieldValue('promptGuidance')} onChange={e => updateTranslation('promptGuidance', e.target.value)} className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors min-h-20 resize-none" />
            </div>
          </div>

          {/* Modes and Action Buttons */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.modes?.includes('audit')} onChange={e => setForm({ ...form, modes: e.target.checked ? ['audit'] : [] })} className="cursor-pointer" /> <span className="text-sm text-gray-700 dark:text-gray-300">{t('analysisCategories_mode_audit') || 'audit'}</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.modes?.includes('flaws')} onChange={e => setForm({ ...form, modes: e.target.checked ? Array.from(new Set([...(form.modes || []), 'flaws'])) : (form.modes || []).filter(m => m !== 'flaws') })} className="cursor-pointer" /> <span className="text-sm text-gray-700 dark:text-gray-300">{t('analysisCategories_mode_flaws') || 'flaws'}</span></label>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors text-sm font-medium text-white" type="submit">{editing ? t('analysisCategories_update') : t('analysisCategories_create')}</button>
              {editing && <button type="button" className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded transition-colors text-sm text-gray-800 dark:text-white" onClick={() => { setEditing(null); setForm(emptyForm); }}>{t('cancel')}</button>}
            </div>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">{t('analysisCategories_title')}</h3>
        {loading ? (
          <div className="py-8 text-center text-gray-500 dark:text-gray-400">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200/50 dark:border-gray-700/40 text-gray-700 dark:text-gray-300">
                  <th className="py-2">{t('analysisCategories_col_id')}</th>
                  <th>{t('analysisCategories_col_title')}</th>
                  <th>{t('analysisCategories_col_modes')}</th>
                  <th>{t('analysisCategories_col_order')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="text-gray-800 dark:text-gray-200">
                {categories.map(c => (
                  <tr key={c.id} className="border-b border-gray-200/50 dark:border-gray-700/20">
                    <td className="py-2 font-mono text-xs text-gray-500 dark:text-gray-400">{c.id}</td>
                    <td>
                      {c.title}
                      {c.translations && Object.keys(c.translations).length > 0 && (
                        <span className="ml-2 text-xs text-gray-600 dark:text-gray-500 bg-gray-200 dark:bg-gray-900 px-1 rounded">
                          +{Object.keys(c.translations).join(', ')}
                        </span>
                      )}
                    </td>
                    <td>{(c.modes || []).join(', ')}</td>
                    <td>{c.uiOrder}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleEdit(c)}
                        title={t('edit')}
                        aria-label={`edit-${c.id}`}
                        className="p-2 text-yellow-500 dark:text-yellow-400 hover:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(c.id)}
                        title={t('delete')}
                        aria-label={`delete-${c.id}`}
                        className="p-2 text-red-500 dark:text-red-400 hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
