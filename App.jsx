import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, 
    GoogleAuthProvider, signInWithPopup, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
    getFirestore, doc, onSnapshot, setDoc, getDoc, setLogLevel,
} from 'firebase/firestore';
import { FaGoogle, FaUserSecret, FaPaintBrush } from 'react-icons/fa';
import { LuLogOut, LuAlertTriangle } from 'react-icons/lu';

// ----------------------------------------------------------------------
// 🚨 CRITICAL FIX: Safe Global Variable Access and Parsing 🚨
//
// We now safely access and parse global variables in dedicated blocks 
// to prevent JSON parsing errors from halting the application startup.
// ----------------------------------------------------------------------

let firebaseConfig = null;
let initialAuthToken = null;
const APP_ID = typeof __app_id !== 'undefined' 
    ? __app_id 
    : 'pixel-art-canvas-v1'; // Fallback if not provided

try {
    // 1. Safely parse the config JSON
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
        firebaseConfig = JSON.parse(__firebase_config);
    }
    // 2. Safely capture the auth token
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        initialAuthToken = __initial_auth_token;
    }
} catch (e) {
    console.error("FATAL: Failed to parse Firebase configuration JSON.", e);
    // Setting an initError directly outside of React lifecycle for immediate display
    // This will be caught by the useEffect block below.
}

// --- Constants ---
const GRID_SIZE = 100;
const COLLECTION_NAME = 'pixel_canvas';
const DOCUMENT_ID = 'main_grid';
const INITIAL_COLOR = '#FFFFFF';

const COLOR_PALETTE = [
    '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#4B0082', '#EE82EE', 
    '#FFC0CB', '#A52A2A', '#808080', '#000000', '#FFFFFF', '#1E90FF', '#7CFC00', 
    '#FF00FF', '#00FFFF', '#FFA07A', '#F08080', '#DDA0DD', '#98FB98', '#ADD8E6',
];

// --- Utility Functions ---

const createEmptyGrid = () => {
    return Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(INITIAL_COLOR));
};

const serializeGrid = (grid) => JSON.stringify(grid);

const deserializeGrid = (jsonString) => {
    try {
        const grid = JSON.parse(jsonString);
        if (Array.isArray(grid) && grid.length === GRID_SIZE && Array.isArray(grid[0]) && grid[0].length === GRID_SIZE) {
            return grid;
        }
    } catch (e) {
        console.error("Failed to parse grid JSON:", e);
    }
    return createEmptyGrid();
};


// --- Main Application Component ---

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [currentGrid, setCurrentGrid] = useState(createEmptyGrid);
    const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
    const [isDrawing, setIsDrawing] = useState(false);
    const [authError, setAuthError] = useState('');
    const [initError, setInitError] = useState('');

    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);

    // --- Firebase Initialization and Auth Listener ---
    useEffect(() => {
        // Step 0: Initial checks
        if (!firebaseConfig || !firebaseConfig.apiKey) {
             const msg = "Firebase config missing or invalid. Check your environment setup.";
             console.error("Initialization failed:", msg);
             setInitError(msg);
             setLoading(false);
             return;
        }

        try {
            console.log("Starting Firebase initialization...");
            setLogLevel('debug');
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);
            
            // Function to handle the initial sign-in attempt
            const attemptAuth = async () => {
                try {
                    if (initialAuthToken) {
                        console.log("Attempting sign-in with custom token...");
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        console.log("No custom token found, signing in anonymously...");
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (e) {
                    // This often happens if the custom token has expired or is invalid.
                    console.error("Custom token sign-in failed, falling back to anonymous:", e);
                    // Force anonymous sign-in as a final option to get a user ID
                    await signInAnonymously(firebaseAuth);
                }
            };

            // Listen for auth state changes *before* attempting sign-in
            const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
                console.log(`Auth state changed. User ID: ${currentUser ? currentUser.uid : 'null'}`);
                setUser(currentUser);
                setLoading(false);
            });
            
            attemptAuth();
            
            return () => unsubscribe();
        } catch (error) {
            const msg = `Firebase SDK Error during setup: ${error.message}`;
            console.error(msg, error);
            setInitError(msg);
            setLoading(false);
        }
    }, []);

    // --- Firestore Real-time Listener (Data Synchronization) ---
    useEffect(() => {
        if (!db || !user) return;

        // Path uses the APP_ID
        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', COLLECTION_NAME, DOCUMENT_ID);
        let unsubscribeSnapshot = null;

        const initializeAndSubscribe = async () => {
            try {
                // 1. Check for existing grid or create new one
                const initialDoc = await getDoc(docRef);
                let initialGrid;
                
                if (!initialDoc.exists()) {
                    console.log("Creating new canvas document.");
                    initialGrid = createEmptyGrid();
                    const initialData = { grid: serializeGrid(initialGrid), lastUpdatedBy: 'system', timestamp: new Date().toISOString() };
                    await setDoc(docRef, initialData);
                } else {
                    initialGrid = deserializeGrid(initialDoc.data().grid);
                }
                setCurrentGrid(initialGrid);

                // 2. Set up the real-time listener
                unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
                    if (docSnap.exists() && docSnap.data().grid) {
                        const incomingGrid = deserializeGrid(docSnap.data().grid);
                        // Only update if we aren't currently dragging to prevent local flicker
                        if (!isDrawingRef.current) {
                             setCurrentGrid(incomingGrid);
                        }
                    }
                }, (error) => {
                    console.error("Firestore snapshot listener failed:", error);
                    alert("Lost connection to the pixel canvas. Please refresh the page."); 
                });

            } catch (error) {
                console.error("Data setup failed:", error);
                alert("Could not load or initialize the canvas data. Check Firebase Security Rules.");
            }
        };

        initializeAndSubscribe();

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
        };

    }, [db, user]);


    // --- Authentication Handlers (Simplified) ---

    const handleAuthError = (message) => {
        setAuthError(message);
        setTimeout(() => setAuthError(''), 5000);
    };

    const handleSignOut = () => {
        if (auth) signOut(auth);
    };

    const signInGoogle = useCallback(async () => {
        if (!auth) return;
        setAuthError('');
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            handleAuthError(`Google Sign-In Failed: ${error.message.includes('popup-closed-by-user') ? 'Popup closed.' : error.message}`);
        }
    }, [auth]);

    const signInAnonymous = useCallback(async () => {
        if (!auth) return;
        setAuthError('');
        try {
            await signInAnonymously(auth);
        } catch (error) {
            handleAuthError(`Anonymous Sign-In Failed: ${error.message}`);
        }
    }, [auth]);

    // --- Drawing Logic (Unchanged) ---

    const updateFirestoreGrid = useCallback(async (gridToSave) => {
        if (!db || !user) return;

        const docRef = doc(db, 'artifacts', APP_ID, 'public', 'data', COLLECTION_NAME, DOCUMENT_ID);

        try {
            const newGridState = serializeGrid(gridToSave);
            await setDoc(docRef, { 
                grid: newGridState, 
                lastUpdatedBy: user.uid, 
                timestamp: new Date().toISOString() 
            });
            console.log(`Grid updated successfully by ${user.uid}`);
        } catch (error) {
            console.error("Error writing pixel update to Firestore:", error);
            alert("Could not save your drawing. Please check connection.");
        }
    }, [db, user]);


    const getPixelCoordinates = (event) => {
        if (!canvasRef.current) return null;

        const rect = canvasRef.current.getBoundingClientRect();
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
    };

    const drawPixelLocally = (r, c, color) => {
        setCurrentGrid(prevGrid => {
            if (r === null || c === null || !prevGrid[r] || prevGrid[r][c] === color) {
                return prevGrid;
            }
            
            const newGrid = prevGrid.map(row => [...row]);
            newGrid[r][c] = color;
            return newGrid;
        });
    };
    
    // --- Mouse/Touch Handlers (Unchanged) ---

    const handleDrawEvent = useCallback((event) => {
        if (!isDrawingRef.current) return;
        event.preventDefault();

        const coords = getPixelCoordinates(event);
        if (coords) {
            drawPixelLocally(coords.row, coords.col, selectedColor);
        }
    }, [selectedColor]);

    const handleStartDraw = useCallback((event) => {
        if (event.button !== 0 && !event.touches) return;
        
        isDrawingRef.current = true;
        setIsDrawing(true);

        const coords = getPixelCoordinates(event);
        if (coords) {
            drawPixelLocally(coords.row, coords.col, selectedColor);
        }
    }, [selectedColor]);

    const handleEndDraw = useCallback(() => {
        if (isDrawingRef.current) {
            isDrawingRef.current = false;
            setIsDrawing(false);
            updateFirestoreGrid(currentGrid);
        }
    }, [updateFirestoreGrid, currentGrid]);


    useEffect(() => {
        document.addEventListener('mouseup', handleEndDraw);
        document.addEventListener('touchend', handleEndDraw);
        document.addEventListener('touchcancel', handleEndDraw);

        return () => {
            document.removeEventListener('mouseup', handleEndDraw);
            document.removeEventListener('touchend', handleEndDraw);
            document.removeEventListener('touchcancel', handleEndDraw);
        };
    }, [handleEndDraw]);


    // --- Sub-Components (Unchanged) ---

    const AuthScreen = ({ setAuthError, auth, handleAuthError, signInGoogle, signInAnonymous }) => {
        const [email, setEmail] = useState('');
        const [password, setPassword] = useState('');

        const handleEmailAuth = async (isSignUp) => {
            if (!auth) return;
            setAuthError('');
            if (!email || password.length < 6) {
                handleAuthError("Email is required and password must be at least 6 characters.");
                return;
            }
            try {
                if (isSignUp) {
                    await createUserWithEmailAndPassword(auth, email, password);
                } else {
                    await signInWithEmailAndPassword(auth, email, password);
                }
            } catch (error) {
                handleAuthError(`Auth Failed: ${error.message}`);
                console.error("Email Auth Error:", error);
            }
        };

        return (
            <div className="max-w-md w-full p-8 bg-gray-800 rounded-xl shadow-2xl space-y-6">
                <h2 className="text-2xl font-bold text-white text-center">Collaborate Now</h2>
                {authError && (
                    <div className="flex items-center p-3 bg-red-800 rounded-lg text-red-100 text-sm">
                        <LuAlertTriangle className="mr-2" /> {authError}
                    </div>
                )}
                <div className="space-y-4">
                    <input 
                        type="email" 
                        placeholder="Email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                    <input 
                        type="password" 
                        placeholder="Password (min 6 characters)" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    />
                    <div className="flex space-x-2">
                        <button onClick={() => handleEmailAuth(true)} className="w-1/2 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md">Sign Up</button>
                        <button onClick={() => handleEmailAuth(false)} className="w-1/2 py-3 bg-indigo-500 text-white font-semibold rounded-lg hover:bg-indigo-600 transition shadow-md">Sign In</button>
                    </div>
                    
                    <div className="relative flex items-center">
                        <div className="flex-grow border-t border-gray-600"></div>
                        <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                        <div className="flex-grow border-t border-gray-600"></div>
                    </div>

                    <button onClick={signInGoogle} className="w-full flex items-center justify-center py-3 bg-white text-gray-800 font-semibold rounded-lg hover:bg-gray-100 transition shadow-md">
                        <FaGoogle className="w-5 h-5 mr-2" /> Sign In with Google
                    </button>
                    <button onClick={signInAnonymous} className="w-full flex items-center justify-center py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition shadow-md">
                        <FaUserSecret className="w-5 h-5 mr-2" /> Continue Anonymously
                    </button>
                </div>
            </div>
        );
    };

    const PaletteControls = () => (
        <div id="controls" className="w-full max-w-2xl mt-6 bg-gray-800 p-4 rounded-xl shadow-2xl border-t-4 border-indigo-500">
            <h2 className="text-lg font-bold text-white mb-3 flex items-center"><FaPaintBrush className="mr-2 text-indigo-400" /> Choose Your Color</h2>
            <div id="colorPalette" className="flex flex-wrap gap-2 justify-center">
                {COLOR_PALETTE.map(color => (
                    <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full shadow-md transition ${selectedColor === color ? 'ring-4 ring-offset-2 ring-indigo-500 ring-offset-gray-800' : 'hover:ring-4 hover:ring-offset-2 hover:ring-indigo-500 hover:ring-offset-gray-800'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    />
                ))}
            </div>
            <p className="text-center text-sm mt-3 text-indigo-400">Selected Color: <span className="font-bold" style={{ color: selectedColor }}>{selectedColor}</span></p>
        </div>
    );

    // --- Main Render ---
    if (initError) {
        return (
             <div className="min-h-screen flex items-center justify-center p-4">
                <div className="bg-red-900 p-8 rounded-xl shadow-2xl text-white max-w-lg">
                    <h2 className="text-2xl font-bold mb-4 flex items-center"><LuAlertTriangle className="mr-2"/> Application Failed to Load</h2>
                    <p className="mb-4 font-bold">A critical Firebase initialization error occurred:</p>
                    <p className="text-sm font-mono break-all bg-red-800 p-3 rounded-md">{initError}</p>
                    <p className="mt-4 text-sm">Please check the **browser console** for the detailed traceback. If deploying externally, ensure your `REACT_APP_FIREBASE_API_KEY` and other credentials are set correctly.</p>
                </div>
            </div>
        );
    }
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white text-xl p-8 bg-gray-700 rounded-xl shadow-2xl">
                    <p>Connecting to Firebase...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center pt-10">
                <AuthScreen setAuthError={setAuthError} auth={auth} handleAuthError={handleAuthError} signInGoogle={signInGoogle} signInAnonymous={signInAnonymous} />
            </div>
        );
    }

    const displayName = user.email || (user.isAnonymous ? 'Anonymous User' : 'Unknown User');

    return (
        <div className="p-4 flex flex-col items-center min-h-screen">
            
            {/* Header and Info */}
            <div className="w-full max-w-2xl text-center mb-6">
                <h1 className="text-3xl pixel-font text-white mb-2">Pixel Place 100x100</h1>
                <p className="text-gray-400 mb-4">Drag-to-draw enabled! Changes save when you lift the mouse.</p>
                <div className="bg-gray-700 p-3 rounded-xl shadow-lg text-sm text-gray-200 break-all flex justify-between items-center">
                    <div>
                        Logged in as: <span className="font-bold text-indigo-400">{displayName}</span>
                        <br/>
                        App ID: <span className="font-mono text-xs text-green-300">{APP_ID}</span>
                        <br/>
                        User ID: <span className="font-mono text-xs">{user.uid}</span>
                    </div>
                    <button 
                        onClick={handleSignOut} 
                        className="flex items-center px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition shadow-md"
                    >
                        <LuLogOut className="mr-1" /> Sign Out
                    </button>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-grow flex justify-center items-center p-2">
                <div 
                    ref={canvasRef}
                    id="pixelCanvas" 
                    className="pixel-canvas-container"
                    onMouseDown={handleStartDraw}
                    onMouseMove={handleDrawEvent}
                    onTouchStart={handleStartDraw}
                    onTouchMove={handleDrawEvent}
                >
                    <div className="pixel-canvas bg-gray-800">
                        {currentGrid.flat().map((color, index) => (
                            <div
                                key={index}
                                className="pixel"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Controls */}
            <PaletteControls />

        </div>
    );
};

export default App;

