/**
 * PersonSelector Component
 *
 * Purpose:
 * - An autocomplete input component for selecting a person from the database.
 * - Used in Search filters and transcript attribution.
 *
 * Behavior:
 * - Fetches people suggestions as the user types.
 * - Shows a dropdown of matching results with support for keyboard/mouse selection.
 * - Returns the selected person's name (and full object via callback).
 *
 * Location: src/components/people/PersonSelector.tsx
 */
import React, { useState, useEffect, useRef } from 'react';
import { usePeople } from '../../hooks/usePeople';
import { Person } from '../../types';

interface PersonSelectorProps {
  value: string;
  onChange: (name: string) => void;
  /** Optional callback that receives the full Person object when selected from the list */
  onSelectPerson?: (person: Person) => void;
  /** Placeholder text */
  placeholder?: string;
}

export const PersonSelector: React.FC<PersonSelectorProps> = ({ value, onChange, onSelectPerson, placeholder }) => {
  const { people, fetchPeople, isLoading } = usePeople();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Initial fetch to populate the list with some people (e.g. top 50)
  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    fetchPeople(newValue);
  };

  const handleFocus = () => {
    setIsOpen(true);
    // If the list is empty (and we haven't searched yet), fetch all
    if (people.length === 0) {
      fetchPeople(value);
    }
  };

  const handleSelect = (person: Person) => {
    onChange(person.name);
    onSelectPerson?.(person);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        className="w-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
        placeholder={placeholder || "e.g., Albert Einstein"}
        autoComplete="off"
      />
      {isOpen && (
        <ul className="absolute z-10 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm mt-1 text-gray-900">
          {isLoading && <li className="py-2 px-3 text-gray-500">Loading...</li>}

          {!isLoading && people.length === 0 && value && (
            <li className="py-2 px-3 text-gray-500 italic">No people found</li>
          )}

          {!isLoading && people.map((person) => (
            <li
              key={person._id}
              className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-600 hover:text-white text-gray-900 group"
              onClick={() => handleSelect(person)}
            >
              <span className="block truncate font-medium">{person.name}</span>
              {person.aliases && person.aliases.length > 0 && (
                <span className="block truncate text-xs text-gray-500 group-hover:text-indigo-200">
                  {person.aliases.join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
