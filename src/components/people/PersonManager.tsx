/**
 * PersonManager Component
 *
 * Purpose:
 * - The primary container for managing the People registry.
 * - Orchestrates the `PersonList` and `PersonForm` components.
 *
 * Behavior:
 * - Integrates with `usePeople` hook to CRUD people data.
 * - Toggles between "List View" and "Create/Edit View".
 * - Handles delete confirmations.
 *
 * Location: src/components/people/PersonManager.tsx
 */
import React, { useState, useEffect } from 'react';
import { PersonList } from './PersonList';
import { PersonForm } from './PersonForm';
import { usePeople } from '../../hooks/usePeople';
import { Person } from '../../types';
import { useI18n } from '../../i18n';


interface PersonManagerProps {
  onSelectPerson?: (person: Person) => void;
}

export const PersonManager: React.FC<PersonManagerProps> = ({ onSelectPerson }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const { t } = useI18n();
  const { people, isLoading, error, createPerson, updatePerson, deletePerson, fetchPeople } = usePeople();


  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleCreate = async (data: any) => {
    await createPerson(data);
    setIsCreating(false);
    fetchPeople(); // Refresh list
  };

  const handleUpdate = async (data: any) => {
    if (editingPerson) {
      await updatePerson(editingPerson._id, data);
      setEditingPerson(null);
      fetchPeople();
    }
  };

  const handleDelete = async (person: Person) => {
    if (window.confirm(t('confirmDeletePerson', { name: person.name }))) {
      await deletePerson(person._id);

      fetchPeople();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold text-cyan-600 dark:text-cyan-400">{t('peopleTab')}</h2>

        {!isCreating && !editingPerson && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            {t('addPerson')}
          </button>

        )}
      </div>

      {isCreating || editingPerson ? (
        <PersonForm
          initialData={editingPerson || undefined}
          onSubmit={editingPerson ? handleUpdate : handleCreate}
          onCancel={() => { setIsCreating(false); setEditingPerson(null); }}
        />
      ) : (
        <PersonList
          people={people}
          isLoading={isLoading}
          error={error}
          onSearch={fetchPeople}
          onEdit={setEditingPerson}
          onDelete={handleDelete}
          onSelect={onSelectPerson}
        />
      )}
    </div>
  );
};
