import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const FormInput: React.FC<FormInputProps> = ({ label, className = '', ...rest }) => {
  return (
    <div className="mb-4">
      {label && <label className="block text-gray-200 text-sm font-semibold mb-2">{label}</label>}
      <input
        {...rest}
        className={`bg-gray-900 border border-gray-600 rounded w-full py-2 px-3 text-gray-100 leading-tight focus:outline-none focus:border-cyan-400 ${className}`}
      />
    </div>
  );
};

export default FormInput;
