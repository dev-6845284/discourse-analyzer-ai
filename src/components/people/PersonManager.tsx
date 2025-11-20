import React, { useState } from 'react';
import { PersonList } from './PersonList';
import { PersonForm } from './PersonForm';
import { usePeople } from '../../hooks/usePeople';

export const PersonManager: React.FC = () => {
  const [isCreating, setIsCreating] = useState(false);
  const { createPerson, fetchPeople } = usePeople();

  const handleCreate = async (data: any) => {
    await createPerson(data);
    setIsCreating(false);
    fetchPeople(); // Refresh list
  };

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">People</h2>
        {!isCreating && (
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
          >
            Add Person
          </button>
        )}
      </div>

      {isCreating ? (
        <PersonForm onSubmit={handleCreate} onCancel={() => setIsCreating(false)} />
      ) : (
        <PersonList />
      )}
    </div>
  );
};
