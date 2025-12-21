import React, { useState } from 'react';
import { Person } from '../../types';
import { useI18n } from '../../i18n';

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
  const { t } = useI18n();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder={t('searchPeople')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 rounded-md bg-gray-700 text-white border-gray-600 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm border p-2"
        />
        <button
          type="submit"
          className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
        >
          {t('search')}
        </button>
      </form>

      {isLoading && <div className="text-center py-4 text-gray-300">{t('loading')}</div>}
      {error && <div className="text-red-400 py-2">{error}</div>}

      <div className="grid gap-3 sm:gap-4">
        {people.map((person) => (
          <div
            key={person._id}
            className="p-3 sm:p-4 bg-gray-800 rounded-lg hover:bg-gray-700/60 transition-shadow border border-gray-700 flex justify-between items-start"
          >
            <div 
              className="flex-1 cursor-pointer"
              onClick={() => onSelect && onSelect(person)}
            >
              <h3 className="font-bold text-base sm:text-lg text-gray-100">{person.name}</h3>
              {person.aliases.length > 0 && (
                <p className="text-sm text-gray-400 hidden sm:block">Aliases: {person.aliases.join(', ')}</p>
              )}
              {person.description && (
                <p className="text-sm text-gray-400 mt-1 hidden sm:block">{person.description}</p>
              )}
            </div>
            <div className="flex gap-2 ml-2 sm:ml-4">
              {onEdit && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                  className="px-2 py-0.5 text-xs sm:text-sm text-cyan-400 hover:bg-gray-700 rounded border border-gray-700"
                >
                  Edit
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onDelete(person); }}
                  className="px-2 py-0.5 text-xs sm:text-sm text-red-400 hover:bg-gray-700 rounded border border-gray-700"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
        {!isLoading && people.length === 0 && (
          <div className="text-center text-gray-400 py-4">{t('noPeopleFound')}</div>
        )}
      </div>
    </div>
  );
};
