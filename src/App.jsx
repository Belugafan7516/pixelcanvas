import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInWithCustomToken, 
    signInAnonymously, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
} from 'firebase/auth';
import { setLogLevel } from 'firebase/firestore'; 

// Setting debug log level for better tracing
setLogLevel('debug');

// --- Component Definition ---
const App = () => {
    // State to hold the current user object
    const [user, setUser] = useState(null);
    // State to manage loading during initialization or sign-in operations
    const [loading, setLoading] = useState(true);
    // State to hold any authentication errors
    const [error, setError] = useState(null);

    // Firebase instances stored in state to ensure they are accessible
    const [auth, setAuth] = useState(null);
    const [provider] = useState(() => new GoogleAuthProvider());
    
    // --- 1. INITIALIZATION EFFECT ---
    useEffect(() => {
        // FIX: Accessing environment variables via 'window' to resolve 'no-undef' ESLint error.
        const firebaseConfig = JSON.parse(typeof window.__firebase_config !== 'undefined' ? window.__firebase_config : '{}');
        const initialAuthToken = typeof window.__initial_auth_token !== 'undefined' ? window.__initial_auth_token : null;

        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            setAuth(authInstance);

            // Handle initial authentication using the custom token or anonymous sign-in
            const initialSignIn = async (authInstance) => {
                try {
                    if (initialAuthToken) {
                        console.log("Attempting sign-in with custom token...");
                        await signInWithCustomToken(authInstance, initialAuthToken);
                    } else {
                        console.log("No custom token found, signing in anonymously...");
                        await signInAnonymously(authInstance);
                    }
                } catch (e) {
                    console.error("Initial authentication failed:", e);
                    setError("Failed to initialize session. Please try signing in.");
                    setLoading(false);
                }
            };

            // Set up Auth State Listener
            const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
                if (currentUser && currentUser.email) {
                    // Fully authenticated user (e.g., Google sign-in)
                    setUser(currentUser);
                } else if (currentUser) {
                    // Anonymous user (initial custom token sign-in)
                    // Treat anonymous user as logged out for the purpose of showing Google Sign-in prompt
                    setUser(null); 
                } else {
                    // No user signed in
                    setUser(null);
                }
                setLoading(false);
            });

            // Run the initial sign-in process
            initialSignIn(authInstance);

            // Cleanup function for the listener
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization failed:", e);
            setError("Could not connect to Firebase services.");
            setLoading(false);
        }
    }, []); // Empty dependency array ensures this runs only once

    // --- 2. AUTH HANDLERS ---

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        setError(null);
        setLoading(true);

        try {
            await signInWithPopup(auth, provider);
            // State update handled by onAuthStateChanged listener
        } catch (e) {
            if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
                console.error("Google Sign-In failed:", e.message, e.code);
                setError(`Sign-in failed: ${e.message}`);
            } else {
                 console.log("Sign-in cancelled by user or pop-up dismissed.");
            }
            // Revert loading state
            setLoading(false);
        }
    };

    const handleSignOut = async () => {
        if (!auth) return;
        setError(null);
        setLoading(true);
        try {
            await signOut(auth);
            // State update handled by onAuthStateChanged listener
        } catch (e) {
            console.error("Sign Out failed:", e.message);
            setError(`Sign out failed: ${e.message}`);
            setLoading(false);
        }
    };

    // --- 3. RENDERING UI BASED ON STATE ---

    const renderContent = () => {
        if (loading) {
            return (
                <div id="loading-state" className="flex flex-col items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mt-4 text-gray-600">
                        {user ? 'Signing out...' : 'Initializing Firebase...'}
                    </p>
                </div>
            );
        }

        if (user) {
            // Logged In State
            return (
                <div id="logged-in-state">
                    <img 
                        id="user-photo" 
                        className="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-blue-600 shadow-lg" 
                        src={user.photoURL || 'https://placehold.co/80x80/9ca3af/ffffff?text=U'} 
                        alt="User Photo"
                    />
                    <p className="text-xl font-semibold text-gray-800" id="user-display-name">
                        {user.displayName || "Google User"}
                    </p>
                    <p className="text-sm text-gray-500 mb-8" id="user-email">
                        {user.email}
                    </p>
                    
                    <button 
                        onClick={handleSignOut} 
                        className="w-full bg-red-600 text-white py-3 rounded-lg text-lg font-semibold shadow-md transition duration-150 ease-in-out hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    >
                        Sign Out
                    </button>
                </div>
            );
        }

        // Logged Out State
        return (
            <div id="logged-out-state">
                <p className="text-gray-600 mb-6">Securely sign in using your Google account.</p>
                <button 
                    onClick={handleGoogleSignIn} 
                    className="bg-[#4285F4] text-white w-full py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-3 shadow-md transition duration-200 ease-in-out hover:bg-[#1A73E8] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4285F4] focus:ring-offset-2"
                >
                    {/* Google Icon SVG (White fill for better contrast) */}
                    <svg className="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white">
                        <path d="M22.56 12.01c0-.78-.07-1.5-.2-2.2H12v4.19h5.64c-.28 1.49-1.12 2.76-2.43 3.63v3.25h4.19c2.45-2.26 3.86-5.6 3.86-9.19z" fill="white" stroke="none" />
                        <path d="M12 23c3.2 0 5.86-1.07 7.82-2.92l-4.19-3.25c-1.15.77-2.6 1.22-3.63 1.22-2.8 0-5.18-1.87-6.02-4.34H1.93v3.31C3.88 20.46 7.6 23 12 23z" fill="white" stroke="none" />
                        <path d="M5.98 14.18c-.22-.68-.35-1.42-.35-2.18s.13-1.5.35-2.18V6.5h-4.05C1.86 8.52 1.01 10.23 1.01 12c0 1.77.85 3.48 2.01 4.79l4.05-3.31z" fill="white" stroke="none" />
                        <path d="M12 4.19c1.32 0 2.58.46 3.56 1.43l3.79-3.79C17.86.87 15.2 0 12 0 7.6 0 3.88 2.54 1.93 6.5l4.05 3.31c.84-2.47 3.22-4.34 6.02-4.34z" fill="white" stroke="none" />
                    </svg>
                    <span>Sign In with Google</span>
                </button>
            </div>
        );
    };

    const statusTitle = user ? "Welcome Back!" : (loading ? "Initializing..." : "Sign In");

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-100 font-[Inter]">
            <div id="auth-card" className="bg-white shadow-2xl rounded-xl w-full max-w-sm p-8 text-center transition-all duration-300 transform scale-100 hover:scale-[1.01]">
                
                <h1 className="text-3xl font-bold text-gray-800 mb-6">{statusTitle}</h1>
                
                {renderContent()}

                {error && (
                    <p className="text-sm text-red-500 bg-red-50 p-3 rounded-lg mt-4 border border-red-200">
                        {error}
                    </p>
                )}

            </div>
        </div>
    );
};

export default App;

