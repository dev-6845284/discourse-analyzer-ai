import React, { useEffect, useState } from 'react';
import {
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  reloadAdminCategories,
} from '../../utils/api';
import { useI18n } from '../../i18n';

type Category = {
  id: string;
  title: string;
  description?: string;
  promptGuidance?: string;
  modes?: string[];
  uiOrder?: number;
};

const emptyForm: Category = { id: '', title: '', description: '', promptGuidance: '', modes: ['audit'], uiOrder: 0 };

const AdminCategories: React.FC = () => {
  const { t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<Category>(emptyForm);

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

  const handleEdit = (c: Category) => {
    setEditing(c);
    setForm({ ...c });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('adminCategories_deleteConfirm'))) return;
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

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{t('adminCategories_title')}</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-gray-700 rounded" onClick={load} disabled={loading}>{t('adminCategories_refresh')}</button>
          <button className="px-3 py-1 bg-blue-600 rounded" onClick={handleReload} disabled={loading}>{t('adminCategories_reloadCache')}</button>
        </div>
      </div>

      {error && <div className="mb-3 text-red-400">{error}</div>}

      <div className="mb-6">
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <input placeholder={t('adminCategories_placeholder_id')} value={form.id} onChange={e => setForm({ ...form, id: e.target.value })} className="p-2 bg-gray-800 rounded" required readOnly={!!editing} />
          <input placeholder={t('adminCategories_placeholder_title')} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="p-2 bg-gray-800 rounded" required />
          <input placeholder={t('adminCategories_placeholder_uiOrder')} value={String(form.uiOrder ?? 0)} onChange={e => setForm({ ...form, uiOrder: Number(e.target.value || 0) })} className="p-2 bg-gray-800 rounded" />
          <div />
          <textarea placeholder={t('adminCategories_placeholder_description')} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="p-2 bg-gray-800 rounded col-span-2" />
          <textarea placeholder={t('adminCategories_placeholder_promptGuidance')} value={form.promptGuidance} onChange={e => setForm({ ...form, promptGuidance: e.target.value })} className="p-2 bg-gray-800 rounded col-span-2" />
          <div className="col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.modes?.includes('audit')} onChange={e => setForm({ ...form, modes: e.target.checked ? ['audit'] : [] })} /> {t('adminCategories_mode_audit') || 'audit'}</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.modes?.includes('flaws')} onChange={e => setForm({ ...form, modes: e.target.checked ? Array.from(new Set([...(form.modes||[]),'flaws'])) : (form.modes||[]).filter(m=>m!=='flaws') })} /> {t('adminCategories_mode_flaws') || 'flaws'}</label>
            <button className="ml-auto px-3 py-1 bg-green-600 rounded" type="submit">{editing ? t('adminCategories_update') : t('adminCategories_create')}</button>
            {editing && <button type="button" className="px-3 py-1 bg-gray-600 rounded" onClick={() => { setEditing(null); setForm(emptyForm); }}>{t('cancel')}</button>}
          </div>
        </form>
      </div>

      <div>
        {loading ? <div>{t('loading')}</div> : (
          <table className="w-full table-auto text-sm">
            <thead>
              <tr className="text-left border-b border-gray-700/40">
                <th className="py-2">{t('adminCategories_col_id')}</th>
                <th>{t('adminCategories_col_title')}</th>
                <th>{t('adminCategories_col_modes')}</th>
                <th>{t('adminCategories_col_order')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.id} className="border-b border-gray-700/20">
                  <td className="py-2 font-mono text-xs">{c.id}</td>
                  <td>{c.title}</td>
                  <td>{(c.modes || []).join(', ')}</td>
                  <td>{c.uiOrder}</td>
                  <td className="text-right">
                    <button
                      onClick={() => handleEdit(c)}
                      title={t('edit')}
                      aria-label={`edit-${c.id}`}
                      className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-900/30 rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      title={t('delete')}
                      aria-label={`delete-${c.id}`}
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
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
