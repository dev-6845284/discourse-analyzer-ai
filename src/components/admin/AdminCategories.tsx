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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('analysisCategories_title')}</h2>
        <div className="flex gap-2">
          <button
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-sm active:scale-95"
            onClick={load}
            disabled={loading}
          >
            {t('analysisCategories_refresh')}
          </button>
          <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all text-sm font-semibold text-white shadow-lg shadow-blue-500/20 active:scale-95"
            onClick={handleReload}
            disabled={loading}
          >
            {t('analysisCategories_reloadCache')}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
            <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{editing ? t('edit') : t('analysisCategories_create')}</h3>
          </div>

          {/* Language Switcher for Editing */}
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-xl p-1 shadow-inner border border-gray-200 dark:border-gray-800">
            <button
              type="button"
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeLang === 'default' ? 'bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setActiveLang('default')}
            >
              English
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeLang === 'lt' ? 'bg-white dark:bg-gray-800 text-cyan-600 dark:text-cyan-400 shadow-sm ring-1 ring-gray-200 dark:ring-gray-700' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
              onClick={() => setActiveLang('lt')}
            >
              Lietuvių
            </button>
            <div className="w-px bg-gray-200 dark:bg-gray-800 mx-1 self-stretch"></div>
            <button
              type="button"
              className="px-3 py-1.5 text-[11px] font-bold rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-white dark:hover:bg-gray-800 transition-all flex items-center gap-1.5"
              onClick={() => {
                const data = {
                  title: getFieldValue('title'),
                  description: getFieldValue('description'),
                  promptGuidance: getFieldValue('promptGuidance')
                };
                navigator.clipboard.writeText(JSON.stringify(data, null, 2));
                const btn = document.activeElement as HTMLButtonElement;
                if (btn) {
                  const original = btn.innerText;
                  btn.innerText = 'Copied!';
                  setTimeout(() => btn.innerText = original, 1000);
                }
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ID and Title Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">ID (Internal)</label>
              <input
                placeholder={t('analysisCategories_placeholder_id')}
                value={form.id}
                onChange={e => setForm({ ...form, id: e.target.value })}
                className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all ${editing ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                required
                readOnly={!!editing}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Title ({activeLang})</label>
              <input
                placeholder={t('analysisCategories_placeholder_title')}
                value={getFieldValue('title')}
                onChange={e => updateTranslation('title', e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
                required={activeLang === 'default'}
              />
            </div>
          </div>

          {/* UI Order */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">UI Order</label>
            <input
              placeholder={t('analysisCategories_placeholder_uiOrder')}
              value={String(form.uiOrder ?? 0)}
              onChange={e => setForm({ ...form, uiOrder: Number(e.target.value || 0) })}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
            />
          </div>

          {/* Description and Prompt Guidance */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Description ({activeLang})</label>
              <textarea
                placeholder={t('analysisCategories_placeholder_description')}
                value={getFieldValue('description')}
                onChange={e => updateTranslation('description', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all min-h-[100px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Prompt Guidance ({activeLang})</label>
              <textarea
                placeholder={t('analysisCategories_placeholder_promptGuidance')}
                value={getFieldValue('promptGuidance')}
                onChange={e => updateTranslation('promptGuidance', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all min-h-[100px] resize-none"
              />
            </div>
          </div>

          {/* Modes and Action Buttons */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.modes?.includes('audit')}
                  onChange={e => setForm({ ...form, modes: e.target.checked ? Array.from(new Set([...(form.modes || []), 'audit'])) : (form.modes || []).filter(m => m !== 'audit') })}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-cyan-600 transition-colors uppercase tracking-tight">{t('analysisCategories_mode_audit') || 'Audit'}</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.modes?.includes('flaws')}
                  onChange={e => setForm({ ...form, modes: e.target.checked ? Array.from(new Set([...(form.modes || []), 'flaws'])) : (form.modes || []).filter(m => m !== 'flaws') })}
                  className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-purple-600 transition-colors uppercase tracking-tight">{t('analysisCategories_mode_flaws') || 'Flaws'}</span>
              </label>
            </div>
            <div className="flex gap-3">
              {editing && (
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                  onClick={() => { setEditing(null); setForm(emptyForm); }}
                >
                  {t('cancel')}
                </button>
              )}
              <button
                className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-cyan-500/20 active:scale-95"
                type="submit"
              >
                {editing ? t('analysisCategories_update') : t('analysisCategories_create')}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="bg-white dark:bg-gray-800/40 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700/50">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('analysisCategories_title')}</h3>
        </div>

        {loading && categories.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('loading')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50/20 dark:bg-gray-950/20 text-gray-500 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700/50">
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('analysisCategories_col_id')}</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('analysisCategories_col_title')}</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('analysisCategories_col_modes')}</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('analysisCategories_col_order')}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30">
                {categories.map(c => (
                  <tr key={c.id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 font-bold bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded">{c.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-gray-100">{c.title}</span>
                        {c.translations && Object.keys(c.translations).length > 0 && (
                          <div className="flex gap-1">
                            {Object.keys(c.translations).map(lang => (
                              <span key={lang} className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700 uppercase" title={`Translated to ${lang}`}>{lang}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-1.5">
                        {c.modes?.map(mode => (
                          <span key={mode} className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${mode === 'audit' ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-100 dark:border-cyan-800 text-cyan-600 dark:text-cyan-400' : 'bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400'}`}>
                            {mode}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-500 dark:text-gray-500 tabular-nums">{c.uiOrder}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(c)}
                          className="p-2 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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
