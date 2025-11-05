import React, { useState } from 'react';
import { FaHeart, FaExclamationTriangle } from 'react-icons/fa';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- IMPORTANT CHANGE HERE ---
// 1. We replace the Canvas-specific __firebase_config with a standard environment variable.
// 2. Vercel MUST have a variable named REACT_APP_FIREBASE_CONFIG defined in its settings.
const firebaseConfig = process.env.REACT_APP_FIREBASE_CONFIG 
  ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) 
  : {};

// Initialize Firebase only if the config is available (i.e., on Vercel)
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;
// -----------------------------


// The main component must be named App and exported as default
const App = () => {
  const [count, setCount] = useState(0);

  // Determine connection status for display
  const isFirebaseConnected = !!db;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8">
      {/* Tailwind CSS is assumed to be available */}
      <script src="https://cdn.tailwindcss.com"></script>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-6 sm:p-8 text-center border border-indigo-200 mt-10">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-4 tracking-tight">
          Vercel Configuration Check
        </h1>
        <p className="text-gray-600 mb-6">
          The code now uses standard environment variables.
        </p>

        <div className="flex justify-center items-center space-x-4 mb-8">
          <FaExclamationTriangle 
            className={`text-4xl animate-pulse ${isFirebaseConnected ? 'text-green-500' : 'text-yellow-500'}`} 
          />
          <p className="text-lg font-medium text-gray-800">
            {isFirebaseConnected 
              ? 'Firebase Config Found!' 
              : 'Waiting for Vercel Environment Variable...'}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => setCount(count + 1)}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200 ease-in-out transform hover:scale-[1.03] flex items-center justify-center space-x-2"
          >
            <FaHeart className="text-pink-300" />
            <span>Count: {count}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;

