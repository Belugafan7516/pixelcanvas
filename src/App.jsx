<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Firebase Google Auth</title>
    <!-- Load Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #4285F4; /* Google Blue */
            --primary-dark: #1A73E8;
            --danger: #EA4335; /* Google Red */
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f4f7fa;
        }
        .btn-google {
            background-color: var(--primary);
            color: white;
            transition: all 0.2s ease;
        }
        .btn-google:hover {
            background-color: var(--primary-dark);
            transform: translateY(-1px);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        }
        .btn-google:active {
            transform: translateY(0);
        }
    </style>
</head>
<body class="min-h-screen flex items-center justify-center p-4">

    <div id="auth-card" class="bg-white shadow-xl rounded-xl w-full max-w-sm p-6 sm:p-8 text-center">
        
        <h1 class="text-3xl font-bold text-gray-800 mb-6" id="status-title">Loading...</h1>
        
        <!-- Loading State -->
        <div id="loading-state" class="flex flex-col items-center justify-center">
            <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="mt-4 text-gray-600">Initializing Firebase...</p>
        </div>

        <!-- Logged Out State -->
        <div id="logged-out-state" class="hidden">
            <p class="text-gray-600 mb-6">Securely sign in using your Google account.</p>
            <button onclick="handleGoogleSignIn()" class="btn-google w-full py-3 rounded-lg text-lg font-semibold flex items-center justify-center space-x-3 shadow-md">
                <!-- Google Icon SVG (Simplified) -->
                <svg class="w-6 h-6" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="white">
                    <path d="M22.56 12.01c0-.78-.07-1.5-.2-2.2H12v4.19h5.64c-.28 1.49-1.12 2.76-2.43 3.63v3.25h4.19c2.45-2.26 3.86-5.6 3.86-9.19z" fill="#4285F4" stroke="none" />
                    <path d="M12 23c3.2 0 5.86-1.07 7.82-2.92l-4.19-3.25c-1.15.77-2.6 1.22-3.63 1.22-2.8 0-5.18-1.87-6.02-4.34H1.93v3.31C3.88 20.46 7.6 23 12 23z" fill="#34A853" stroke="none" />
                    <path d="M5.98 14.18c-.22-.68-.35-1.42-.35-2.18s.13-1.5.35-2.18V6.5h-4.05C1.86 8.52 1.01 10.23 1.01 12c0 1.77.85 3.48 2.01 4.79l4.05-3.31z" fill="#FBBC05" stroke="none" />
                    <path d="M12 4.19c1.32 0 2.58.46 3.56 1.43l3.79-3.79C17.86.87 15.2 0 12 0 7.6 0 3.88 2.54 1.93 6.5l4.05 3.31c.84-2.47 3.22-4.34 6.02-4.34z" fill="#EA4335" stroke="none" />
                </svg>
                <span>Sign In with Google</span>
            </button>
        </div>

        <!-- Logged In State -->
        <div id="logged-in-state" class="hidden">
            <img id="user-photo" class="w-20 h-20 rounded-full mx-auto mb-4 border-4 border-primary-dark shadow-lg" alt="User Photo">
            <p class="text-xl font-semibold text-gray-800" id="user-display-name"></p>
            <p class="text-sm text-gray-500 mb-8" id="user-email"></p>
            
            <button onclick="handleSignOut()" class="w-full bg-danger text-white py-3 rounded-lg text-lg font-semibold shadow-md transition duration-150 ease-in-out hover:bg-red-700">
                Sign Out
            </button>
        </div>

        <p id="error-message" class="text-sm text-red-500 mt-4 hidden"></p>

    </div>

    <script type="module">
        // --- FIREBASE IMPORTS ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
        
        // Setting debug log level for better tracing
        setLogLevel('debug');

        // --- GLOBAL ENVIRONMENT VARIABLES ---
        // Get the configuration provided by the hosting environment
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        // --- FIREBASE INITIALIZATION ---
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const provider = new GoogleAuthProvider();

        // --- UI ELEMENTS ---
        const statusTitle = document.getElementById('status-title');
        const loadingState = document.getElementById('loading-state');
        const loggedOutState = document.getElementById('logged-out-state');
        const loggedInState = document.getElementById('logged-in-state');
        const userPhoto = document.getElementById('user-photo');
        const userDisplayName = document.getElementById('user-display-name');
        const userEmail = document.getElementById('user-email');
        const errorMessageElement = document.getElementById('error-message');

        /**
         * Hides all states and shows the requested one.
         * @param {HTMLElement} stateElement - The element to show.
         * @param {string} titleText - The title text to display.
         */
        function updateUI(stateElement, titleText) {
            loadingState.classList.add('hidden');
            loggedOutState.classList.add('hidden');
            loggedInState.classList.add('hidden');
            errorMessageElement.classList.add('hidden');

            statusTitle.textContent = titleText;
            stateElement.classList.remove('hidden');
        }

        /**
         * Displays an error message in the UI.
         * @param {string} message - The error message.
         */
        function displayError(message) {
            errorMessageElement.textContent = `Error: ${message}`;
            errorMessageElement.classList.remove('hidden');
        }

        /**
         * Attempts to sign in using the custom token provided by the environment, 
         * falling back to anonymous sign-in if the token is not available.
         */
        async function initialSignIn() {
            try {
                if (initialAuthToken) {
                    console.log("Attempting sign-in with custom token...");
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    console.log("No custom token found, signing in anonymously...");
                    await signInAnonymously(auth);
                }
            } catch (error) {
                console.error("Initial authentication failed:", error);
                // The onAuthStateChanged listener will handle UI update
            }
        }

        // --- AUTH LISTENERS & HANDLERS ---
        
        // 1. Listen for authentication state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // User is signed in
                console.log("User state changed: LOGGED IN", user);
                
                // Show logged-in state
                updateUI(loggedInState, "Welcome Back!");
                
                // Update user info
                userDisplayName.textContent = user.displayName || "Guest User";
                userEmail.textContent = user.email || user.uid;
                userPhoto.src = user.photoURL || 'https://placehold.co/80x80/9ca3af/ffffff?text=U';

            } else {
                // User is signed out or initial anonymous sign-in failed
                console.log("User state changed: LOGGED OUT");
                updateUI(loggedOutState, "Sign In");
            }
        });

        // 2. Google Sign-In Handler
        window.handleGoogleSignIn = async function() {
            try {
                // Prompt user for sign-in via pop-up
                await signInWithPopup(auth, provider);
                // onAuthStateChanged will handle the UI update on success
            } catch (error) {
                // Handle different error codes (e.g., pop-up closed, cancelled)
                if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                    console.error("Google Sign-In failed:", error.message, error.code);
                    displayError(error.message);
                } else {
                    console.log("Sign-in cancelled by user or pop-up dismissed.");
                }
            }
        }

        // 3. Sign Out Handler
        window.handleSignOut = async function() {
            try {
                await signOut(auth);
                // onAuthStateChanged will handle the UI update on success
            } catch (error) {
                console.error("Sign Out failed:", error.message);
                displayError(error.message);
            }
        }

        // Start the initial sign-in attempt
        initialSignIn();
    </script>
</body>
</html>

