import React from 'react';

interface ModalWrapperProps {
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 w-full max-w-md">
        {title && <h2 className="text-xl font-bold mb-4 text-cyan-400">{title}</h2>}
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
