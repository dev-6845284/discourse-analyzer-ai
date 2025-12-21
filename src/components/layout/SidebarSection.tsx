import React from 'react';

interface SidebarSectionProps {
  title: string;
  sectionKey: string;
  openSection?: string | null;
  setOpenSection?: (key: string | null) => void;
  children: React.ReactNode;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, sectionKey, openSection, setOpenSection, children }) => {
  const isOpen = openSection === sectionKey;
  return (
    <div className="border rounded-lg bg-gray-800">
      <button
        className={`w-full text-left px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg focus:outline-none ${isOpen ? '' : 'opacity-70'}`}
        onClick={() => setOpenSection && setOpenSection(isOpen ? null : sectionKey)}
        aria-expanded={isOpen}
      >
        {title}
      </button>
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default SidebarSection;