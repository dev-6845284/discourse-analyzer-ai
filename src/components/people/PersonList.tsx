import React, { useState } from 'react';
import { Person } from '../../types';

interface PersonListProps {
  people: Person[];
  isLoading: boolean;
  error?: string | null;
  onSearch: (term: string) => void;
  onSelect?: (person: Person) => void;
  onEdit?: (person: Person) => void;
  onDelete?: (person: Person) => void;
}

export const PersonList: React.FC<PersonListProps> = ({ 
  people = [], 
  isLoading, 
  error,
  onSearch,
  onSelect, 
  onEdit, 
  onDelete 
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
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
            className="p-4 bg-white rounded shadow hover:shadow-md transition-shadow border border-gray-200 flex justify-between items-start"
          >
            <div 
              className="flex-1 cursor-pointer"
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
            <div className="flex gap-2 ml-4">
              {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded border border-blue-200"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(person); }}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {!isLoading && people.length === 0 && (
          <div className="text-center text-gray-500 py-4">No people found.</div>
        )}
      </div>
    </div>
  );
};
