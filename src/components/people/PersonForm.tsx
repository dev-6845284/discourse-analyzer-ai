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
        setFormData({ name: '', firstname: '', surname: '', aliases: '', description: '' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    let newFormData = { ...formData, name: value };

    const words = value.trim().split(/\s+/);
    if (words.length === 2) {
      newFormData = {
        ...newFormData,
        firstname: words[0],
        surname: words[1],
        aliases: value
      };
    }
    setFormData(newFormData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-gray-800 rounded-lg shadow">
      <div>
        <label className="block text-sm font-medium text-gray-300">{t('fullNameRequired')}</label>

        <input
          type="text"
          required
          value={formData.name}
          onChange={handleNameChange}
          className="mt-1 block w-full rounded-md bg-gray-700 text-white border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">{t('firstName')}</label>

          <input
            type="text"
            value={formData.firstname}
            onChange={e => setFormData({ ...formData, firstname: e.target.value })}
            className="mt-1 block w-full rounded-md bg-gray-700 text-white border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">{t('surname')}</label>

          <input
            type="text"
            value={formData.surname}
            onChange={e => setFormData({ ...formData, surname: e.target.value })}
            className="mt-1 block w-full rounded-md bg-gray-700 text-white border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">
          {t('aliasesLabel')} <span className="text-gray-500 text-xs">{t('autoFilledFromName')}</span>
        </label>

        <input
          type="text"
          value={formData.aliases}
          onChange={e => setFormData({ ...formData, aliases: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 text-white border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300">{t('description')}</label>

        <textarea
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="mt-1 block w-full rounded-md bg-gray-700 text-white border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
          rows={3}
        />
      </div>
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-700 border border-gray-600 rounded-md hover:bg-gray-600"
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
