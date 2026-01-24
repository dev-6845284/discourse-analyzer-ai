/**
 * PersonForm Component
 *
 * Purpose:
 * - Form interface for creating or editing a `Person` entity.
 * - Collects name, aliases, description, and social links.
 *
 * Behavior:
 * - Pre-fills fields if `initialData` is provided (Edit mode).
 * - Validates inputs (e.g. name is required).
 * - Supports dynamic management of a list of social links.
 * - Auto-generates alias suggestions based on the name input.
 *
 * Location: src/components/people/PersonForm.tsx
 */
import React, { useState } from 'react';
import { Person } from '../../types';
import { useI18n } from '../../i18n';


interface PersonFormProps {
  initialData?: Person;
  onSubmit: (data: Partial<Person>) => Promise<void>;
  onCancel: () => void;
}

export const PersonForm: React.FC<PersonFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    firstname: initialData?.firstname || '',
    surname: initialData?.surname || '',
    aliases: initialData?.aliases?.join(', ') || '',
    links: initialData?.links || [],
    description: initialData?.description || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Auto-fill aliases from name if empty
      let finalAliases = formData.aliases.split(',').map(a => a.trim()).filter(a => a);
      if (finalAliases.length === 0 && formData.name) {
        finalAliases = [formData.name];
      }

      await onSubmit({
        ...formData,
        aliases: finalAliases,
      });
      if (!initialData) {
        setFormData({ name: '', firstname: '', surname: '', aliases: '', links: [], description: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let newFormData = { ...formData, name: value };

    const words = value.trim().split(/\s+/);
    if (words.length === 2 && !initialData) {
      newFormData = {
        ...newFormData,
        firstname: words[0],
        surname: words[1],
        aliases: value
      };
    }
    setFormData(newFormData);
  };

  const addLink = () => {
    setFormData({
      ...formData,
      links: [...formData.links, { url: '', type: 'custom', isVisible: false }]
    });
  };

  const removeLink = (index: number) => {
    const newLinks = [...formData.links];
    newLinks.splice(index, 1);
    setFormData({ ...formData, links: newLinks });
  };

  const updateLink = (index: number, field: keyof typeof formData.links[0], value: any) => {
    const newLinks = [...formData.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData({ ...formData, links: newLinks });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-transparent">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('fullNameRequired')}</label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={handleNameChange}
          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('firstName')}</label>
          <input
            type="text"
            value={formData.firstname}
            onChange={e => setFormData({ ...formData, firstname: e.target.value })}
            className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('surname')}</label>
          <input
            type="text"
            value={formData.surname}
            onChange={e => setFormData({ ...formData, surname: e.target.value })}
            className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('aliasesLabel')} <span className="text-gray-500 text-xs">{t('autoFilledFromName')}</span>
        </label>
        <input
          type="text"
          value={formData.aliases}
          onChange={e => setFormData({ ...formData, aliases: e.target.value })}
          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('socialLinks')}</label>
        <div className="space-y-2">
          {formData.links.map((link, index) => (
            <div key={index} className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-transparent">
              <select
                value={link.type}
                onChange={(e) => updateLink(index, 'type', e.target.value)}
                className="bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm rounded border-gray-300 dark:border-gray-500 p-1"
              >
                <option value="facebook">{t('linkType_facebook')}</option>
                <option value="tiktok">{t('linkType_tiktok')}</option>
                <option value="instagram">{t('linkType_instagram')}</option>
                <option value="custom">{t('linkType_custom')}</option>
              </select>
              <input
                type="text"
                value={link.url}
                onChange={(e) => updateLink(index, 'url', e.target.value)}
                placeholder={t('urlPlaceholder')}
                className="flex-1 bg-white dark:bg-gray-600 text-gray-900 dark:text-white text-sm rounded border-gray-300 dark:border-gray-500 p-1"
              />
              <label className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={link.isVisible}
                  onChange={(e) => updateLink(index, 'isVisible', e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-600 text-cyan-600 dark:text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-xs text-gray-600 dark:text-gray-300">{t('public')}</span>
              </label>
              <button
                type="button"
                onClick={() => removeLink(index)}
                className="text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 px-1"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 dark:hover:text-cyan-300 flex items-center"
          >
            {t('addLink')}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('description')}</label>
        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          {t('cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {isSubmitting ? t('saving') : (initialData ? t('updatePerson') : t('savePerson'))}
        </button>
      </div>
    </form>
  );
};
