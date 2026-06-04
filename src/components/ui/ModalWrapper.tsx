/**
 * ModalWrapper Component
 *
 * Purpose:
 * - A generic shell for modal dialogs.
 * - Provides the overlay, centering, and standard close button behavior.
 *
 * Behavior:
 * - Renders children within a styled container.
 * - Handles outside clicks can be implemented by parent or added here (currently simple overlay).
 *
 * Location: src/components/ui/ModalWrapper.tsx
 */
import React from 'react';

interface ModalWrapperProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          {title && <h2 className="text-xl font-bold text-cyan-600 dark:text-cyan-400 m-0">{title}</h2>}
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
