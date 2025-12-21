import React, { useState } from 'react';
import { Person } from '../../types';
import { useI18n } from '../../i18n';
import { Edit, Trash2 } from 'lucide-react';

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
            className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700/60 transition-shadow border border-gray-700"
          >
            <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
              <div className="min-w-0">
                {/* Line 1: Name */}
                <div
                  className="truncate text-sm text-gray-100 cursor-pointer"
                  onClick={() => onSelect && onSelect(person)}
                >
                  {person.name}
                </div>

                {/* Line 2: Alias */}
                <div className="text-xs text-gray-400 mt-1 truncate">{person.aliases.length > 0 ? `Aliases: ${person.aliases.join(', ')}` : ''}</div>

                {/* Optional description shown below */}
                {person.description && (
                  <div className="text-xs text-gray-400 mt-1">{person.description}</div>
                )}
              </div>

              <div className="flex flex-col items-end gap-1">
                {onEdit ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(person); }}
                    title={t('edit')}
                    aria-label={t('edit')}
                    className="p-1 rounded text-cyan-400 hover:bg-gray-700"
                  >
                    <Edit size={16} />
                  </button>
                ) : <div className="h-6" />}

                {onDelete ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(person); }}
                    title={t('delete')}
                    aria-label={t('delete')}
                    className="p-1 rounded text-red-400 hover:bg-gray-700"
                  >
                    <Trash2 size={16} />
                  </button>
                ) : <div className="h-6" />}
              </div>
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
