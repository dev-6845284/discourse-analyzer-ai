import React from 'react';

interface SidebarSectionProps {
  title: string;
  sectionKey: string;
  openSection?: string | null;
  setOpenSection?: (key: string | null) => void;
  children: React.ReactNode;
  tag?: string | null;
  defaultOpen?: boolean;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({ title, sectionKey, openSection, setOpenSection, children, tag, defaultOpen }) => {
  const isOpen = openSection === sectionKey || (openSection == null && !!defaultOpen);
  return (
    <div className="border rounded-lg bg-gray-800 w-full">
      <button
        className={`w-full text-left px-4 py-2 font-semibold text-cyan-400 bg-gray-900 rounded-t-lg focus:outline-none cursor-pointer hover:opacity-80 transition-opacity ${isOpen ? '' : 'opacity-70'}`}
        onClick={() => setOpenSection && setOpenSection(isOpen ? null : sectionKey)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center justify-between">
          <span>{title}</span>
          {tag && <span className="ml-2 text-xs text-gray-300 bg-gray-700 px-2 py-0.5 rounded-md">{tag}</span>}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 w-full">
          {children}
        </div>
      )}
    </div>
  );
};

export default SidebarSection;