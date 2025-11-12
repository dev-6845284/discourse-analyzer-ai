import React from 'react';

interface LoginScreenProps {
  googleButtonRef: React.RefObject<HTMLDivElement>;
  loginError: string | null;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ googleButtonRef, loginError }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold text-cyan-400 mb-4">Discourse Analyzer AI</h1>
      <p className="text-gray-400 mb-8">Please sign in to continue</p>
      <div ref={googleButtonRef}></div>
      {loginError && <p className="mt-4 text-red-500">{loginError}</p>}
    </div>
  );
};

export default LoginScreen;
