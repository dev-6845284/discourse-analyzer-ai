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
    <div className="p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-700">
        <h2 className="text-xl font-bold text-gray-100">{t('keyset_title')}</h2>
        <button
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-sm"
          onClick={load}
          disabled={loading}
        >
          {t('keyset_refresh')}
        </button>
      </div>

      {error && <div className="p-3 bg-red-900/30 border border-red-700 rounded text-red-300">{error}</div>}

      {/* Form Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">{editing ? t('edit') : t('keyset_create')}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Alias */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">{t('keyset_alias')}</label>
            <input
              placeholder={t('keyset_placeholder_alias')}
              value={form.alias}
              onChange={e => {
                setForm({ ...form, alias: e.target.value });
                setAliasError(null);
              }}
              className={`w-full p-2 bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors ${editing ? 'opacity-50 cursor-not-allowed' : ''}`}
              required
              readOnly={!!editing}
            />
            {aliasError && <div className="text-red-400 text-sm mt-1">{aliasError}</div>}
          </div>

          {/* API Keys */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('keyset_gemini_key')}</label>
              <div>
                {editing?.has_GEMINI_API_KEY && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <input
                      type="checkbox"
                      checked={form.overwrite_GEMINI_API_KEY || false}
                      onChange={e => setForm({ ...form, overwrite_GEMINI_API_KEY: e.target.checked })}
                      className="cursor-pointer"
                    />
                    {t('keyset_overwrite')}
                  </label>
                )}
                <input
                  type="password"
                  placeholder={t('keyset_gemini_key')}
                  value={form.GEMINI_API_KEY || ''}
                  onChange={e => setForm({ ...form, GEMINI_API_KEY: e.target.value || null })}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('keyset_grok_key')}</label>
              <div>
                {editing?.has_GROK_API_KEY && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <input
                      type="checkbox"
                      checked={form.overwrite_GROK_API_KEY || false}
                      onChange={e => setForm({ ...form, overwrite_GROK_API_KEY: e.target.checked })}
                      className="cursor-pointer"
                    />
                    {t('keyset_overwrite')}
                  </label>
                )}
                <input
                  type="password"
                  placeholder={t('keyset_grok_key')}
                  value={form.GROK_API_KEY || ''}
                  onChange={e => setForm({ ...form, GROK_API_KEY: e.target.value || null })}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">{t('keyset_chatgpt_key')}</label>
              <div>
                {editing?.has_CHATGPT_API_KEY && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 mb-2">
                    <input
                      type="checkbox"
                      checked={form.overwrite_CHATGPT_API_KEY || false}
                      onChange={e => setForm({ ...form, overwrite_CHATGPT_API_KEY: e.target.checked })}
                      className="cursor-pointer"
                    />
                    {t('keyset_overwrite')}
                  </label>
                )}
                <input
                  type="password"
                  placeholder={t('keyset_chatgpt_key')}
                  value={form.CHATGPT_API_KEY || ''}
                  onChange={e => setForm({ ...form, CHATGPT_API_KEY: e.target.value || null })}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded text-gray-100 placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 border-t border-gray-700 flex gap-2 justify-end">
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded transition-colors text-sm font-medium"
              type="submit"
            >
              {editing ? t('keyset_update') : t('keyset_create')}
            </button>
            {editing && (
              <button
                type="button"
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded transition-colors text-sm"
                onClick={() => {
                  setEditing(null);
                  setForm(emptyForm);
                  setAliasError(null);
                }}
              >
                {t('cancel')}
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wide">{t('keyset_title')}</h3>
        {loading ? (
          <div className="py-8 text-center text-gray-400">{t('loading')}</div>
        ) : keysets.length === 0 ? (
          <div className="py-8 text-center text-gray-400">{t('keyset_noKeysets')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left border-b border-gray-700/40">
                  <th className="py-2">{t('keyset_alias')}</th>
                  <th>{t('keyset_providers')}</th>
                  <th>{t('keyset_created')}</th>
                  <th className="text-right"></th>
                </tr>
              </thead>
              <tbody>
                {keysets.map(k => (
                  <tr key={k._id} className="border-b border-gray-700/20">
                    <td className="py-2 font-mono text-xs">{k.alias}</td>
                    <td className="text-sm text-gray-300">
                      {hasKey(k) === 0 ? (
                        <span className="text-gray-500 italic">{t('keyset_noKeys')}</span>
                      ) : (
                        <span className="flex gap-1 flex-wrap">
                          {k.has_GEMINI_API_KEY && <span className="px-2 py-1 bg-blue-900/30 rounded text-blue-300 text-xs">Gemini</span>}
                          {k.has_GROK_API_KEY && <span className="px-2 py-1 bg-purple-900/30 rounded text-purple-300 text-xs">Grok</span>}
                          {k.has_CHATGPT_API_KEY && <span className="px-2 py-1 bg-green-900/30 rounded text-green-300 text-xs">OpenAI</span>}
                        </span>
                      )}
                    </td>
                    <td className="text-gray-400 text-xs">{new Date(k.createdAt).toLocaleDateString()}</td>
                    <td className="text-right">
                      <button
                        onClick={() => handleEdit(k)}
                        title={t('edit')}
                        aria-label={`edit-${k._id}`}
                        className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 rounded-lg transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(k._id)}
                        title={t('delete')}
                        aria-label={`delete-${k._id}`}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-lg transition-colors"
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

export default KeysetManagement;
