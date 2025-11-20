import React, { useEffect, useState } from 'react';
import { Person } from '../../types';
import { usePeople } from '../../hooks/usePeople';

interface PersonListProps {
  onSelect?: (person: Person) => void;
}

export const PersonList: React.FC<PersonListProps> = ({ onSelect }) => {
  const { people, isLoading, error, fetchPeople } = usePeople();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPeople(searchTerm);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Search people..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          Search
        </button>
      </form>

      {isLoading && <div className="text-center py-4">Loading...</div>}
      {error && <div className="text-red-600 py-2">{error}</div>}

      <div className="grid gap-4">
        {people.map((person) => (
          <div
            key={person._id}
            className="p-4 bg-white rounded shadow hover:shadow-md transition-shadow cursor-pointer border border-gray-200"
            onClick={() => onSelect && onSelect(person)}
          >
            <h3 className="font-bold text-lg">{person.name}</h3>
            {person.aliases.length > 0 && (
              <p className="text-sm text-gray-500">Aliases: {person.aliases.join(', ')}</p>
            )}
            {person.description && (
              <p className="text-sm text-gray-600 mt-1">{person.description}</p>
            )}
          </div>
        ))}
        {!isLoading && people.length === 0 && (
          <div className="text-center text-gray-500 py-4">No people found.</div>
        )}
      </div>
    </div>
  );
};
