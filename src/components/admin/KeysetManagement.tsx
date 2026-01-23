import React, { useEffect, useState } from 'react';
import {
  getAdminKeysets,
  createAdminKeyset,
  updateAdminKeyset,
  deleteAdminKeyset,
} from '../../utils/api';
import { useI18n } from '../../i18n';

type Keyset = {
  _id: string;
  alias: string;
  has_GEMINI_API_KEY?: boolean;
  has_GROK_API_KEY?: boolean;
  has_CHATGPT_API_KEY?: boolean;
  createdAt: string;
  updatedAt: string;
};

type KeysetForm = {
  alias: string;
  GEMINI_API_KEY?: string | null;
  GROK_API_KEY?: string | null;
  CHATGPT_API_KEY?: string | null;
  overwrite_GEMINI_API_KEY?: boolean;
  overwrite_GROK_API_KEY?: boolean;
  overwrite_CHATGPT_API_KEY?: boolean;
};

const emptyForm: KeysetForm = {
  alias: '',
  GEMINI_API_KEY: '',
  GROK_API_KEY: '',
  CHATGPT_API_KEY: '',
  overwrite_GEMINI_API_KEY: true, // auto-select on create
  overwrite_GROK_API_KEY: true,
  overwrite_CHATGPT_API_KEY: true,
};

const KeysetManagement: React.FC = () => {
  const { t } = useI18n();
  const [keysets, setKeysets] = useState<Keyset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Keyset | null>(null);
  const [form, setForm] = useState<KeysetForm>(emptyForm);
  const [aliasError, setAliasError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getAdminKeysets();
      setKeysets(res.data || []);
      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Failed to load keysets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Check for duplicate alias (excluding currently editing keyset)
  const checkDuplicateAlias = (alias: string) => {
    const isDuplicate = keysets.some(
      k => k.alias.toLowerCase() === alias.toLowerCase() && k._id !== editing?._id
    );
    return isDuplicate;
  };

  // Reset form with unchecked overwrite boxes (for after successful save)
  const resetFormClean = () => {
    setForm({
      alias: '',
      GEMINI_API_KEY: '',
      GROK_API_KEY: '',
      CHATGPT_API_KEY: '',
      overwrite_GEMINI_API_KEY: false,
      overwrite_GROK_API_KEY: false,
      overwrite_CHATGPT_API_KEY: false,
    });
    setEditing(null);
    setAliasError(null);
  };

  const handleSubmit = async (ev?: React.FormEvent) => {
    ev?.preventDefault();

    // Validate alias
    if (!form.alias.trim()) {
      setAliasError(t('keyset_aliasRequired'));
      return;
    }

    if (checkDuplicateAlias(form.alias)) {
      setAliasError(t('keyset_aliasDuplicate'));
      return;
    }

    setAliasError(null);

    try {
      // Build payload - only include keys if overwrite is checked (or creating new)
      const payload: any = {
        alias: form.alias,
      };

      // On create, all overwrite flags are true; on edit, user must check to overwrite
      if (form.overwrite_GEMINI_API_KEY && form.GEMINI_API_KEY) {
        payload.GEMINI_API_KEY = form.GEMINI_API_KEY;
      }
      if (form.overwrite_GROK_API_KEY && form.GROK_API_KEY) {
        payload.GROK_API_KEY = form.GROK_API_KEY;
      }
      if (form.overwrite_CHATGPT_API_KEY && form.CHATGPT_API_KEY) {
        payload.CHATGPT_API_KEY = form.CHATGPT_API_KEY;
      }

      // Include overwrite flags for server to know if keys should be cleared or preserved
      payload.overwrite_GEMINI_API_KEY = form.overwrite_GEMINI_API_KEY || false;
      payload.overwrite_GROK_API_KEY = form.overwrite_GROK_API_KEY || false;
      payload.overwrite_CHATGPT_API_KEY = form.overwrite_CHATGPT_API_KEY || false;

      if (editing) {
        const res = await updateAdminKeyset(editing._id, payload);
        const updated = res?.data || payload;
        setEditing(updated as Keyset);
        await load();
        resetFormClean();
      } else {
        await createAdminKeyset(payload);
        await load();
        resetFormClean();
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Save failed');
    }
  };

  const handleEdit = (k: Keyset) => {
    setEditing(k);
    // When editing, set overwrite flags to false initially (user must check to update)
    setForm({
      alias: k.alias,
      GEMINI_API_KEY: '',
      GROK_API_KEY: '',
      CHATGPT_API_KEY: '',
      overwrite_GEMINI_API_KEY: false,
      overwrite_GROK_API_KEY: false,
      overwrite_CHATGPT_API_KEY: false,
    });
    setAliasError(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('keyset_deleteConfirm'))) return;
    try {
      await deleteAdminKeyset(id);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message || e.message || 'Delete failed');
    }
  };

  const hasKey = (k: Keyset) => {
    return [k.has_GEMINI_API_KEY, k.has_GROK_API_KEY, k.has_CHATGPT_API_KEY].filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t('keyset_title')}</h2>
        <button
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg transition-all text-sm font-semibold shadow-sm active:scale-95 disabled:opacity-50"
          onClick={load}
          disabled={loading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('keyset_refresh')}
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

      {/* Form Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 uppercase tracking-tight">{editing ? t('edit') : t('keyset_create')}</h3>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alias */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{t('keyset_alias')}</label>
            <input
              placeholder={t('keyset_placeholder_alias')}
              value={form.alias}
              onChange={e => {
                setForm({ ...form, alias: e.target.value });
                setAliasError(null);
              }}
              className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all ${editing ? 'opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
              required
              readOnly={!!editing}
            />
            {aliasError && <div className="text-red-500 dark:text-red-400 text-xs font-semibold mt-1.5 ml-1">{aliasError}</div>}
          </div>

          {/* API Keys */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gemini */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{t('keyset_gemini_key')}</label>
              <div className="space-y-2">
                {editing?.has_GEMINI_API_KEY && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.overwrite_GEMINI_API_KEY || false}
                      onChange={e => setForm({ ...form, overwrite_GEMINI_API_KEY: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{t('keyset_overwrite')}</span>
                  </label>
                )}
                <input
                  type="password"
                  placeholder="AI_..."
                  value={form.GEMINI_API_KEY || ''}
                  onChange={e => setForm({ ...form, GEMINI_API_KEY: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Grok */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{t('keyset_grok_key')}</label>
              <div className="space-y-2">
                {editing?.has_GROK_API_KEY && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.overwrite_GROK_API_KEY || false}
                      onChange={e => setForm({ ...form, overwrite_GROK_API_KEY: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{t('keyset_overwrite')}</span>
                  </label>
                )}
                <input
                  type="password"
                  placeholder="xai-..."
                  value={form.GROK_API_KEY || ''}
                  onChange={e => setForm({ ...form, GROK_API_KEY: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* OpenAI */}
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">{t('keyset_chatgpt_key')}</label>
              <div className="space-y-2">
                {editing?.has_CHATGPT_API_KEY && (
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={form.overwrite_CHATGPT_API_KEY || false}
                      onChange={e => setForm({ ...form, overwrite_CHATGPT_API_KEY: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    />
                    <span className="group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">{t('keyset_overwrite')}</span>
                  </label>
                )}
                <input
                  type="password"
                  placeholder="sk-..."
                  value={form.CHATGPT_API_KEY || ''}
                  onChange={e => setForm({ ...form, CHATGPT_API_KEY: e.target.value || null })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-700/50 flex gap-3 justify-end items-center">
            {editing && (
              <button
                type="button"
                className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                  setAliasError(null);
                }}
              >
                {t('cancel')}
              </button>
            )}
            <button
              className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-all text-sm font-bold shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50"
              type="submit"
            >
              {editing ? t('keyset_update') : t('keyset_create')}
            </button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="bg-white dark:bg-gray-800/40 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700/50 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-700/50">
          <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t('keyset_title')}</h3>
        </div>

        {loading && keysets.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('loading')}</p>
          </div>
        ) : keysets.length === 0 ? (
          <div className="py-20 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">{t('keyset_noKeysets')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50/20 dark:bg-gray-950/20 text-gray-500 dark:text-gray-500 border-b border-gray-200 dark:border-gray-700/50">
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('keyset_alias')}</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('keyset_providers')}</th>
                  <th className="px-6 py-4 font-bold uppercase tracking-wider text-[10px]">{t('keyset_created')}</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/30">
                {keysets.map(k => (
                  <tr key={k._id} className="group hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <td className="px-6 py-4">
                      <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-900/20 px-2 py-1 rounded text-xs">{k.alias}</span>
                    </td>
                    <td className="px-6 py-4">
                      {hasKey(k) === 0 ? (
                        <span className="text-gray-400 italic text-xs">{t('keyset_noKeys')}</span>
                      ) : (
                        <div className="flex gap-1.5 flex-wrap">
                          {k.has_GEMINI_API_KEY && <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded uppercase">Gemini</span>}
                          {k.has_GROK_API_KEY && <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 text-purple-600 dark:text-purple-400 text-[10px] font-bold rounded uppercase">Grok</span>}
                          {k.has_CHATGPT_API_KEY && <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-600 dark:text-green-400 text-[10px] font-bold rounded uppercase">OpenAI</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-gray-500 dark:text-gray-500 text-xs tabular-nums">{new Date(k.createdAt).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(k)}
                          className="p-2 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-900/30 rounded-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(k._id)}
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

export default KeysetManagement;
