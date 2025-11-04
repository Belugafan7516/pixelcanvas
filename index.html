<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaborative Pixel Canvas (Multi-Auth)</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Inter:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --grid-size: 100;
        }
        body {
            font-family: 'Inter', sans-serif;
            background-color: #111827; 
            min-height: 100vh;
        }
        .pixel-canvas-container {
            width: min(90vw, 90vh, 800px); 
            height: min(90vw, 90vh, 800px);
            touch-action: none; 
        }
        .pixel-canvas {
            display: grid;
            width: 100%;
            height: 100%;
            grid-template-columns: repeat(var(--grid-size), 1fr);
            grid-template-rows: repeat(var(--grid-size), 1fr);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
            border: 4px solid #374151; 
            cursor: crosshair; 
            user-select: none; 
        }
        .pixel {
            width: 100%;
            height: 100%;
        }
        .pixel-font {
            font-family: 'Press Start 2P', cursive;
        }
    </style>
</head>
<body class="p-4 flex flex-col items-center">

    <!-- Header and Info -->
    <div class="w-full max-w-2xl text-center mb-6">
        <h1 class="text-3xl pixel-font text-white mb-2">Pixel Place 100x100</h1>
        <p class="text-gray-400 mb-4" id="appTagline">Sign in to start drawing!</p>
        <div id="userInfo" class="bg-gray-700 p-3 rounded-xl shadow-lg text-sm text-gray-200 break-all hidden">
            <!-- User ID and Logout Button -->
        </div>
    </div>

    <!-- Loading State -->
    <div id="loading" class="text-white text-xl p-8 bg-gray-700 rounded-xl shadow-2xl">
        Initializing app...
    </div>

    <!-- Authentication Container (Hidden/Shown based on auth state) -->
    <div id="authContainer" class="max-w-md w-full p-8 bg-gray-800 rounded-xl shadow-2xl space-y-6 hidden">
        <h2 class="text-2xl font-bold text-white text-center">Collaborate Now</h2>
        <div class="space-y-4">
            <!-- Email/Password Form -->
            <input id="emailInput" type="email" placeholder="Email" class="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <input id="passwordInput" type="password" placeholder="Password" class="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <div class="flex space-x-2">
                <button onclick="signUpEmail()" class="w-1/2 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md">Sign Up</button>
                <button onclick="signInEmail()" class="w-1/2 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition shadow-md">Sign In</button>
            </div>
            
            <div class="relative flex items-center">
                <div class="flex-grow border-t border-gray-600"></div>
                <span class="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                <div class="flex-grow border-t border-gray-600"></div>
            </div>

            <!-- Other Providers -->
            <button onclick="signInGoogle()" class="w-full flex items-center justify-center py-3 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition shadow-md">
                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.0007 12.0007l-2.0007 2.0007 2.0007 2.0007 2.0007-2.0007-2.0007-2.0007z"/>
                    <path d="M12.0007 12.0007v-4.0007h-4.0007v4.0007h4.0007z"/>
                    <path d="M16.0007 12.0007h4.0007v4.0007h-4.0007v-4.0007z"/>
                    <path d="M12.0007 8.0007h-4.0007v4.0007h4.0007v-4.0007z"/>
                </svg>
                Sign In with Google
            </button>
            <button onclick="signInAnonymous()" class="w-full py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition shadow-md">
                Continue Anonymously
            </button>
        </div>
        <p id="authError" class="text-red-400 text-center text-sm"></p>
    </div>

    <!-- Canvas Area (Hidden/Shown based on auth state) -->
    <div class="flex-grow flex justify-center items-center p-2 hidden" id="canvasAndControls">
        <div id="canvasContainer" class="pixel-canvas-container">
            <div id="pixelCanvas" class="pixel-canvas bg-gray-800">
                <!-- Pixels will be generated here -->
            </div>
        </div>
    </div>

    <!-- Controls (Palette) -->
    <div id="controls" class="w-full max-w-2xl mt-6 bg-gray-800 p-4 rounded-xl shadow-2xl border-t-4 border-indigo-500 hidden">
        <h2 class="text-lg font-bold text-white mb-3">Choose Your Color</h2>
        <div id="colorPalette" class="flex flex-wrap gap-2 justify-center">
            <!-- Colors will be generated here -->
        </div>
        <p class="text-center text-sm mt-3 text-indigo-400">Selected Color: <span id="selectedColorDisplay" class="font-bold">#FF00FF</span></p>
    </div>

    <!-- Modal for Messages -->
    <div id="messageModal" class="hidden fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
        <div class="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full">
            <h3 id="modalTitle" class="text-xl font-bold mb-3 text-gray-900"></h3>
            <p id="modalMessage" class="text-gray-700 mb-4"></p>
            <button onclick="document.getElementById('messageModal').classList.add('hidden')" class="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">OK</button>
        </div>
    </div>

    <script type="module">
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, onAuthStateChanged, signOut, 
            GoogleAuthProvider, signInWithPopup, 
            createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, onSnapshot, setDoc, getDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // 
        // 🚨 TO USE YOUR OWN FIREBASE PROJECT, REPLACE THE PLACEHOLDERS BELOW! 🚨
        // 
        const YOUR_FIREBASE_CONFIG = {
            apiKey: "YOUR_API_KEY", // <-- REPLACE THIS
            authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // <-- REPLACE THIS
            projectId: "YOUR_PROJECT_ID", // <-- REPLACE THIS
            storageBucket: "YOUR_PROJECT_ID.appspot.com", // <-- REPLACE THIS
            messagingSenderId: "YOUR_SENDER_ID", // <-- REPLACE THIS
            appId: "YOUR_APP_ID" // <-- REPLACE THIS
        };
        
        const YOUR_APP_ID = 'pixel-art-canvas-v1'; 
        // 

        // --- Core Application State ---
        const GRID_SIZE = 100;
        const COLLECTION_NAME = 'pixel_canvas';
        const DOCUMENT_ID = 'main_grid';
        const INITIAL_COLOR = '#FFFFFF';
        
        let db;
        let auth;
        let userId = null;
        let selectedColor = '#FF00FF'; 
        let currentGridState = [];
        let isDrawing = false; 

        // --- DOM Elements ---
        const authContainer = document.getElementById('authContainer');
        const canvasAndControls = document.getElementById('canvasAndControls');
        const loadingDiv = document.getElementById('loading');
        const pixelCanvas = document.getElementById('pixelCanvas');
        const controls = document.getElementById('controls');
        const userInfoDiv = document.getElementById('userInfo');
        const appTagline = document.getElementById('appTagline');
        const selectedColorDisplay = document.getElementById('selectedColorDisplay');
        const authError = document.getElementById('authError');
        const emailInput = document.getElementById('emailInput');
        const passwordInput = document.getElementById('passwordInput');

        // --- Color Palette ---
        const COLOR_PALETTE = [
            '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#4B0082', '#EE82EE', 
            '#FFC0CB', '#A52A2A', '#808080', '#000000', '#FFFFFF', '#1E90FF', '#7CFC00', 
            '#FF00FF', '#00FFFF', '#FFA07A', '#F08080', '#DDA0DD', '#98FB98', '#ADD8E6',
        ];

        // --- Utility Functions ---

        function showModal(title, message) {
            document.getElementById('modalTitle').textContent = title;
            document.getElementById('modalMessage').textContent = message;
            document.getElementById('messageModal').classList.remove('hidden');
        }
        
        function serializeGrid(grid) {
            return JSON.stringify(grid);
        }

        function deserializeGrid(jsonString) {
            try {
                const grid = JSON.parse(jsonString);
                if (Array.isArray(grid) && grid.length === GRID_SIZE && Array.isArray(grid[0]) && grid[0].length === GRID_SIZE) {
                    return grid;
                }
            } catch (e) {
                console.error("Failed to parse grid JSON:", e);
            }
            return createEmptyGrid();
        }

        function createEmptyGrid() {
            const grid = [];
            for (let i = 0; i < GRID_SIZE; i++) {
                const row = Array(GRID_SIZE).fill(INITIAL_COLOR);
                grid.push(row);
            }
            return grid;
        }

        // --- Authentication Handlers ---
        
        function clearAuthError() {
            authError.textContent = '';
        }

        async function signInGoogle() {
            clearAuthError();
            try {
                const provider = new GoogleAuthProvider();
                await signInWithPopup(auth, provider);
                // onAuthStateChanged handles the rest
            } catch (error) {
                authError.textContent = `Google Sign-In Failed: ${error.message}`;
                console.error("Google Sign-In Error:", error);
            }
        }

        async function signInAnonymous() {
            clearAuthError();
            try {
                await signInAnonymously(auth);
                // onAuthStateChanged handles the rest
            } catch (error) {
                authError.textContent = `Anonymous Sign-In Failed: ${error.message}`;
                console.error("Anonymous Sign-In Error:", error);
            }
        }

        async function signUpEmail() {
            clearAuthError();
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || password.length < 6) {
                authError.textContent = "Email is required and password must be at least 6 characters.";
                return;
            }
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                // onAuthStateChanged handles the rest
            } catch (error) {
                authError.textContent = `Sign Up Failed: ${error.message}`;
                console.error("Email Sign Up Error:", error);
            }
        }

        async function signInEmail() {
            clearAuthError();
            const email = emailInput.value;
            const password = passwordInput.value;
            if (!email || !password) {
                authError.textContent = "Both email and password are required.";
                return;
            }
            try {
                await signInWithEmailAndPassword(auth, email, password);
                // onAuthStateChanged handles the rest
            } catch (error) {
                authError.textContent = `Sign In Failed: ${error.message}`;
                console.error("Email Sign In Error:", error);
            }
        }

        async function handleSignOut() {
            try {
                await signOut(auth);
                // onAuthStateChanged will handle UI reset
            } catch (error) {
                showModal("Sign Out Error", "Could not sign out. Please try again.");
                console.error("Sign Out Error:", error);
            }
        }

        // --- Drawing Logic (Same as before) ---

        function getPixelCoordinates(event) {
            const rect = pixelCanvas.getBoundingClientRect();
            let clientX, clientY;

            if (event.touches && event.touches.length > 0) {
                clientX = event.touches[0].clientX;
                clientY = event.touches[0].clientY;
            } else {
                clientX = event.clientX;
                clientY = event.clientY;
            }

            const x = clientX - rect.left;
            const y = clientY - rect.top;

            const pixelSize = rect.width / GRID_SIZE;
            const col = Math.floor(x / pixelSize);
            const row = Math.floor(y / pixelSize);
            
            if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
                return { row, col };
            }
            return null;
        }

        function drawPixelLocally(r, c, color) {
            if (r === null || c === null || currentGridState[r][c] === color) {
                return;
            }
            
            currentGridState[r][c] = color;

            const index = r * GRID_SIZE + c;
            const pixelElement = pixelCanvas.children[index];
            if (pixelElement) {
                pixelElement.style.backgroundColor = color;
            }
        }

        async function updateFirestoreGrid() {
            if (!userId) return; // Should not happen if this is called correctly

            const newGridState = serializeGrid(currentGridState);
            const docRef = doc(db, 'artifacts', YOUR_APP_ID, 'public', 'data', COLLECTION_NAME, DOCUMENT_ID);

            try {
                await setDoc(docRef, { 
                    grid: newGridState, 
                    lastUpdatedBy: userId, 
                    timestamp: new Date().toISOString() 
                });
                console.log(`Grid updated successfully by ${userId}`);
            } catch (error) {
                console.error("Error writing pixel update to Firestore:", error);
                showModal("Write Error", "Could not save your drawing. Check console and Firebase Rules.");
            }
        }

        function handleStartDraw(event) {
            if (event.button !== 0 && !event.touches) return; 

            isDrawing = true;
            const coords = getPixelCoordinates(event);
            if (coords) {
                drawPixelLocally(coords.row, coords.col, selectedColor);
            }
        }

        function handleDraw(event) {
            if (!isDrawing) return;
            event.preventDefault(); 

            const coords = getPixelCoordinates(event);
            if (coords) {
                drawPixelLocally(coords.row, coords.col, selectedColor);
            }
        }

        async function handleEndDraw() {
            if (!isDrawing) return;
            isDrawing = false;
            
            await updateFirestoreGrid();
        }

        function setupDrawListeners() {
            pixelCanvas.addEventListener('mousedown', handleStartDraw);
            pixelCanvas.addEventListener('mousemove', handleDraw);
            document.addEventListener('mouseup', handleEndDraw);
            pixelCanvas.addEventListener('mouseleave', () => {
                 if (isDrawing) {
                    handleEndDraw();
                }
            });

            // Touch Events (for mobile)
            pixelCanvas.addEventListener('touchstart', (e) => {
                e.preventDefault(); 
                handleStartDraw(e);
            }, { passive: false });
            
            pixelCanvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                handleDraw(e);
            }, { passive: false });
            
            pixelCanvas.addEventListener('touchend', handleEndDraw);
            pixelCanvas.addEventListener('touchcancel', handleEndDraw);
        }

        // --- UI Generation & Rendering ---

        function initializePalette() {
            const paletteDiv = document.getElementById('colorPalette');
            paletteDiv.innerHTML = ''; 
            COLOR_PALETTE.forEach(color => {
                const button = document.createElement('button');
                button.className = 'w-8 h-8 rounded-full shadow-md hover:ring-4 ring-offset-2 ring-indigo-500 transition';
                button.style.backgroundColor = color;
                button.dataset.color = color;
                button.onclick = () => {
                    selectedColor = color;
                    selectedColorDisplay.textContent = color;
                };
                paletteDiv.appendChild(button);
            });
            selectedColorDisplay.textContent = selectedColor;
        }

        function initializeCanvasUI() {
            pixelCanvas.innerHTML = '';
            for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
                const pixel = document.createElement('div');
                pixel.className = 'pixel';
                pixelCanvas.appendChild(pixel);
            }
            setupDrawListeners();
        }

        function renderGrid(grid) {
            if (isDrawing) return; 

            currentGridState = grid;
            const pixels = pixelCanvas.querySelectorAll('.pixel');
            
            grid.flat().forEach((color, index) => {
                const pixelElement = pixels[index];
                if (pixelElement) {
                    pixelElement.style.backgroundColor = color;
                }
            });
        }

        // --- Real-time Data Setup ---

        let unsubscribeSnapshot = null; // Store unsubscribe function

        async function setupRealtimeListener() {
            // Unsubscribe previous listener if it exists
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
            }

            const docRef = doc(db, 'artifacts', YOUR_APP_ID, 'public', 'data', COLLECTION_NAME, DOCUMENT_ID);

            // 1. Initialize the grid if it doesn't exist
            let initialDoc = await getDoc(docRef);

            if (!initialDoc.exists()) {
                console.log("Canvas document does not exist, creating initial grid.");
                currentGridState = createEmptyGrid();
                const initialData = { grid: serializeGrid(currentGridState), lastUpdatedBy: 'system', timestamp: new Date().toISOString() };
                await setDoc(docRef, initialData);
                renderGrid(currentGridState);
            } else {
                currentGridState = deserializeGrid(initialDoc.data().grid);
                renderGrid(currentGridState);
            }

            // 2. Set up the new real-time listener
            unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists() && docSnap.data().grid) {
                    const incomingGrid = deserializeGrid(docSnap.data().grid);
                    renderGrid(incomingGrid);
                }
            }, (error) => {
                console.error("Firestore snapshot listener failed:", error);
                showModal("Connection Error", "Lost connection to the pixel canvas. Please refresh the page.");
            });
            
            // Show canvas after successful load
            canvasAndControls.classList.remove('hidden');
            controls.classList.remove('hidden');
        }

        // --- Main Initialization ---

        async function initApp() {
            try {
                if (YOUR_FIREBASE_CONFIG.apiKey === "YOUR_API_KEY") {
                    throw new Error("Please replace the placeholders in YOUR_FIREBASE_CONFIG with your actual credentials.");
                }
                
                setLogLevel('debug');
                const app = initializeApp(YOUR_FIREBASE_CONFIG);
                db = getFirestore(app);
                auth = getAuth(app);

                // Initialize static UI components
                initializeCanvasUI();
                initializePalette();

                loadingDiv.classList.add('hidden');

                // Listener to handle authentication state changes
                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        // User is signed in
                        userId = user.uid;
                        const email = user.email || 'Anonymous';
                        
                        authContainer.classList.add('hidden');
                        userInfoDiv.classList.remove('hidden');
                        appTagline.textContent = "Drag-to-draw enabled! Changes save when you lift the mouse.";
                        userInfoDiv.innerHTML = `
                            <span class="font-bold text-indigo-400">${email}</span> (ID: ${userId}) 
                            <button onclick="handleSignOut()" class="ml-3 px-3 py-1 bg-red-600 text-white rounded-md text-xs hover:bg-red-700 transition">Sign Out</button>
                        `;

                        // Start real-time data synchronization
                        setupRealtimeListener();

                    } else {
                        // User is signed out
                        userId = null;
                        
                        authContainer.classList.remove('hidden');
                        userInfoDiv.classList.add('hidden');
                        canvasAndControls.classList.add('hidden');
                        controls.classList.add('hidden');
                        appTagline.textContent = "Sign in to start drawing!";

                        // If there was an active snapshot listener, stop it
                        if (unsubscribeSnapshot) {
                            unsubscribeSnapshot();
                        }
                    }
                });

            } catch (error) {
                console.error("Fatal initialization error:", error);
                loadingDiv.textContent = "Initialization Failed. Check console for details.";
                showModal("App Error", error.message || "Failed to initialize the application.");
            }
        }

        // Make functions globally accessible for inline HTML calls
        window.signInGoogle = signInGoogle;
        window.signUpEmail = signUpEmail;
        window.signInEmail = signInEmail;
        window.signInAnonymous = signInAnonymous;
        window.handleSignOut = handleSignOut;

        // Start the application
        window.onload = initApp;

    </script>
</body>
</html>

