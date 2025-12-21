import React, { useState, useEffect } from 'react';
import { PersonList } from './PersonList';
import { PersonForm } from './PersonForm';
import { usePeople } from '../../hooks/usePeople';
import { Person } from '../../types';

interface PersonManagerProps {
  onSelectPerson?: (person: Person) => void;
}

export const PersonManager: React.FC<PersonManagerProps> = ({ onSelectPerson }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
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
    if (window.confirm(`Are you sure you want to delete ${person.name}?`)) {
      await deletePerson(person._id);
      fetchPeople();
    }
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">People</h2>
        {!isCreating && !editingPerson && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Add Person
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
