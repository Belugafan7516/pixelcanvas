import React, { useState } from 'react';
import { FaHeart, FaExclamationTriangle } from 'react-icons/fa'; // Using the stable Font Awesome icons
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: Assuming __firebase_config is globally available in the Canvas environment
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
// You would use these services in your real application:
const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;

// The main component must be named App and exported as default
const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8">
      {/* Tailwind CSS is assumed to be available */}
      <script src="https://cdn.tailwindcss.com"></script>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-6 sm:p-8 text-center border border-indigo-200 mt-10">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-4 tracking-tight">
          Vercel Build Success!
        </h1>
        <p className="text-gray-600 mb-6">
          Your dependencies are now correctly configured and installed.
        </p>

        <div className="flex justify-center items-center space-x-4 mb-8">
          <FaExclamationTriangle className="text-yellow-500 text-4xl animate-pulse" />
          <p className="text-lg font-medium text-gray-800">
            {db ? 'Firebase is initialized.' : 'Firebase config missing (expected in this canvas environment).'}
          </p>
        </div>

        <div className="flex flex-col items-center">
          <button
            onClick={() => setCount(count + 1)}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3 px-6 rounded-full shadow-lg transition duration-200 ease-in-out transform hover:scale-[1.03] flex items-center justify-center space-x-2"
          >
            <FaHeart className="text-pink-300" />
            <span>Click Me: {count}</span>
          </button>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          This component successfully compiles with Firebase and React Icons.
        </p>
      </div>
    </div>
  );
};

export default App;

/*
--- FIX FOR LU ALERT TRIANGLE ---

If you absolutely need the LuAlertTriangle icon, try these alternatives in your App.jsx:

1.  Try importing just 'AlertTriangle' from 'react-icons/lu':
    import { AlertTriangle } from 'react-icons/lu'; 
    
2.  If the above fails, you may need to use the dedicated Lucide library:
    (Requires adding 'lucide-react' to package.json)
    import { AlertTriangle } from 'lucide-react';
*/

