import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { 
    getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, signOut, 
    GoogleAuthProvider, signInWithPopup, 
    createUserWithEmailAndPassword, signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
    getFirestore, doc, onSnapshot, setDoc, getDoc, 
} from 'firebase/firestore';
import { FaGoogle, FaUserSecret, FaPaintBrush, FaTrashAlt } from 'react-icons/fa';
import { LuLogOut, LuAlertTriangle, LuLoader2, LuClock, LuDatabaseZap } from 'react-icons/lu';

// ----------------------------------------------------------------------
// FIREBASE CONFIGURATION & GLOBALS
// CRITICAL: These credentials must match your Firebase project.
// ----------------------------------------------------------------------

const firebaseConfig = {
    apiKey: "AIzaSyDaw63IFCbBz4T8COOgBOmddpPODLYdWuc",
    authDomain: "pixeldraw-b8692.firebaseapp.com",
    projectId: "pixeldraw-b8692",
    storageBucket: "pixeldraw-b8692.firebasepeapp.com",
    messagingSenderId: "1003659579933",
    appId: "1:1003659579933:web:58af7b0898298e9d7d6cf4",
};

// Safely capture the global App ID and Auth Token
const APP_ID = typeof __app_id !== 'undefined' 
    ? __app_id 
    : 'pixel-art-canvas-v1'; 

const initialAuthToken = typeof __initial_auth_token !== 'undefined' 
    ? __initial_auth_token 
    : null;


// --- Constants ---
const GRID_SIZE = 100;
const COLLECTION_NAME = 'pixel_canvas';
const DOCUMENT_ID = 'main_grid';
const INITIAL_COLOR = '#FFFFFF';
const USER_SETTINGS_COLLECTION = 'user_settings';
const RESET_DOC_ID = 'canvas_reset_time';
const ONE_HOUR_MS = 60 * 60 * 1000; // 1 hour in milliseconds

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
    const [dbConnectionError, setDbConnectionError] = useState(''); 
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [lastResetTime, setLastResetTime] = useState(0); 
    const [remainingTime, setRemainingTime] = useState(0);

    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);

    // --- Firebase Initialization and Auth Listener ---
    useEffect(() => {
        if (!firebaseConfig || !firebaseConfig.apiKey) {
             const msg = "FATAL: Firebase configuration object is invalid or missing 'apiKey'.";
             setInitError(msg);
             setLoading(false);
             return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const firestore = getFirestore(app);
            const firebaseAuth = getAuth(app);

            setDb(firestore);
            setAuth(firebaseAuth);
            
            const attemptAuth = async () => {
                try {
                    // Attempt sign-in with custom token first
                    if (initialAuthToken) {
                        await signInWithCustomToken(firebaseAuth, initialAuthToken);
                    } else {
                        // Fallback to anonymous sign-in
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (e) {
                    // Fallback to anonymous sign-in if custom token fails (e.g., expired)
                    await signInAnonymously(firebaseAuth);
                }
            };

            const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
                setUser(currentUser);
                setLoading(false); 
            });
            
            attemptAuth();
            
            return () => unsubscribe();
        } catch (error) {
            // This catches synchronous errors during SDK setup (e.g., config formatting)
            const msg = `Firebase SDK Error during setup: ${error.message}`;
            setInitError(msg);
            setLoading(false);
        }
    }, []);

    // --- Drawing Logic & Firestore Update ---

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
        } catch (error) {
            console.error("Error writing pixel update to Firestore:", error);
            // This error handler is for write failures after connection is established
            setDbConnectionError(`Could not save changes. Check network or security rules. (${error.code || error.message})`);
        }
    }, [db, user]);

    // --- FEATURE: Reset Canvas & Rate Limit Check ---
    const resetCanvas = useCallback(async () => {
        if (!db || !user) return;
        
        const now = Date.now();
        if (now < lastResetTime + ONE_HOUR_MS) {
            setShowResetConfirm(false);
            return; 
        }

        setShowResetConfirm(false); 
        const emptyGrid = createEmptyGrid();
        setCurrentGrid(emptyGrid); 
        
        // 1. Update public grid data
        await updateFirestoreGrid(emptyGrid); 

        // 2. Update private user settings (rate limit)
        const userResetRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, USER_SETTINGS_COLLECTION, RESET_DOC_ID);
        try {
            await setDoc(userResetRef, { 
                timestamp: now, 
                lastResetBy: user.uid 
            });
            setLastResetTime(now); 
        } catch (e) {
            console.error("Failed to update reset timestamp:", e);
        }
    }, [updateFirestoreGrid, db, user, lastResetTime]);


    // --- Firestore Data Listener (Public Grid & Private Settings) ---
    useEffect(() => {
        if (!db || !user || loading) return;
        
        setDbConnectionError(''); 

        const publicDocRef = doc(db, 'artifacts', APP_ID, 'public', 'data', COLLECTION_NAME, DOCUMENT_ID);
        const userResetRef = doc(db, 'artifacts', APP_ID, 'users', user.uid, USER_SETTINGS_COLLECTION, RESET_DOC_ID);
        let unsubscribePublic = null;
        let unsubscribePrivate = null;


        const initializeAndSubscribe = async () => {
            try {
                // 1. Setup Public Grid Listener - Initial Read
                const initialDoc = await getDoc(publicDocRef);
                let initialGrid;
                
                if (!initialDoc.exists()) {
                    initialGrid = createEmptyGrid();
                    const initialData = { grid: serializeGrid(initialGrid), lastUpdatedBy: 'system', timestamp: new Date().toISOString() };
                    await setDoc(publicDocRef, initialData); 
                } else {
                    initialGrid = deserializeGrid(initialDoc.data().grid);
                }
                setCurrentGrid(initialGrid);

                // 2. Attach Public Grid Live Listener
                unsubscribePublic = onSnapshot(publicDocRef, (docSnap) => {
                    if (docSnap.exists() && docSnap.data().grid) {
                        const incomingGrid = deserializeGrid(docSnap.data().grid);
                        if (!isDrawingRef.current) {
                             setCurrentGrid(incomingGrid);
                        }
                    }
                }, (error) => {
                    console.error("Firestore public snapshot listener failed:", error);
                    // This often catches permission/network issues during sustained connection
                    setDbConnectionError(`Public data live connection error: ${error.code || error.message}. Check security rules.`);
                });

                // 3. Setup Private User Settings Listener (Last Reset Time)
                unsubscribePrivate = onSnapshot(userResetRef, (docSnap) => {
                    if (docSnap.exists() && docSnap.data().timestamp) {
                        const time = docSnap.data().timestamp.toDate ? docSnap.data().timestamp.toDate().getTime() : docSnap.data().timestamp;
                        setLastResetTime(time);
                    } else {
                        setLastResetTime(0);
                    }
                }, (error) => {
                    console.error("Failed to subscribe to user settings (private):", error);
                    setDbConnectionError(`Private settings access failed: ${error.code || error.message}. Check user ID and rules.`);
                });


            } catch (error) {
                // This catches asynchronous errors like the initial getDoc failing due to a bad API key/Project ID (the 404 source)
                console.error("Initial Data Setup FAILED:", error);
                setDbConnectionError(`FATAL DB INIT ERROR: Check 'projectId' in config. Error: ${error.message}`);
            }
        };

        initializeAndSubscribe();

        return () => {
            if (unsubscribePublic) unsubscribePublic();
            if (unsubscribePrivate) unsubscribePrivate();
        };

    }, [db, user, loading]);

    // --- Countdown Timer Effect (for UI) ---
    useEffect(() => {
        const calculateRemainingTime = () => {
            const now = Date.now();
            const timeUntilReset = lastResetTime + ONE_HOUR_MS;
            
            if (timeUntilReset > now) {
                setRemainingTime(Math.ceil((timeUntilReset - now) / 1000));
            } else {
                setRemainingTime(0);
            }
        };

        calculateRemainingTime();

        const intervalId = setInterval(calculateRemainingTime, 1000);

        return () => clearInterval(intervalId);
    }, [lastResetTime, showResetConfirm]);


    // --- Authentication, Drawing, and UI Helpers ---

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
        event.preventDefault(); 
        
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

    // --- Sub-Components ---
    
    // --- Confirmation Modal (Custom alert alternative) ---
    const ResetConfirmationModal = () => {
        
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;

        if (remainingTime > 0) {
            // Rate Limit Message
            return (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-yellow-500">
                        <h3 className="text-xl font-bold text-yellow-400 mb-3 flex items-center"><LuClock className="mr-2" /> Cooldown Active</h3>
                        <p className="text-gray-200 mb-6">
                            You can only clear the canvas once every hour.
                            Please wait for the timer to expire: 
                            <span className="font-bold text-2xl text-white block mt-2 text-center">
                                {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
                            </span>
                        </p>
                        <div className="flex justify-end">
                            <button 
                                onClick={() => setShowResetConfirm(false)} 
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            );
        }
        
        // Standard Confirmation
        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-800 p-6 rounded-xl shadow-2xl max-w-sm w-full border-t-4 border-red-500">
                    <h3 className="text-xl font-bold text-red-400 mb-3 flex items-center"><LuAlertTriangle className="mr-2" /> Confirm Reset</h3>
                    <p className="text-gray-200 mb-6">Are you absolutely sure you want to completely clear the collaborative canvas? This action cannot be undone for everyone!</p>
                    <div className="flex justify-end space-x-3">
                        <button 
                            onClick={() => setShowResetConfirm(false)} 
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={resetCanvas} 
                            className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition"
                        >
                            Yes, Clear Canvas
                        </button>
                    </div>
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
                        className={`w-10 h-10 rounded-full shadow-md transition ${selectedColor === color ? 'ring-4 ring-offset-2 ring-indigo-500 ring-offset-gray-800' : 'hover:ring-4 hover:ring-offset-2 hover:ring-indigo-500 hover:ring-offset-gray-800'}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    />
                ))}
            </div>
            <div className='flex justify-between items-center mt-4 pt-3 border-t border-gray-700'>
                <p className="text-center text-sm text-indigo-400">Selected Color: <span className="font-bold" style={{ color: selectedColor }}>{selectedColor}</span></p>
                 <button 
                    onClick={() => setShowResetConfirm(true)} 
                    className={`flex items-center px-4 py-2 text-white rounded-lg text-sm font-semibold transition shadow-lg 
                        ${remainingTime > 0 ? 'bg-gray-500 cursor-not-allowed' : 'bg-red-700 hover:bg-red-800'}`}
                    disabled={remainingTime > 0}
                >
                    <FaTrashAlt className="mr-2" /> 
                    {remainingTime > 0 ? 'Reset Cooldown' : 'Reset Canvas'}
                </button>
            </div>
        </div>
    );

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


    // --- Main Render ---
    if (initError) {
        return (
             <div className="min-h-screen flex items-center justify-center p-4 bg-gray-900">
                <div className="bg-red-900 p-8 rounded-xl shadow-2xl text-white max-w-lg">
                    <h2 className="text-2xl font-bold mb-4 flex items-center"><LuAlertTriangle className="mr-2"/> Application Failed to Load</h2>
                    <p className="mb-4 font-bold">A critical Firebase SDK initialization error occurred:</p>
                    <p className="text-sm font-mono break-all bg-red-800 p-3 rounded-md">{initError}</p>
                </div>
            </div>
        );
    }
    
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="text-white text-xl p-8 bg-gray-700 rounded-xl shadow-2xl flex items-center">
                    <LuLoader2 className="animate-spin mr-3 text-indigo-400" />
                    <p>Connecting to Firebase...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center pt-10 bg-gray-900 min-h-screen">
                <AuthScreen setAuthError={setAuthError} auth={auth} handleAuthError={handleAuthError} signInGoogle={signInGoogle} signInAnonymous={signInAnonymous} />
            </div>
        );
    }

    const displayName = user.email || (user.isAnonymous ? 'Anonymous User' : 'Unknown User');

    return (
        <div className="p-4 flex flex-col items-center min-h-screen bg-gray-900">
            
            {showResetConfirm && <ResetConfirmationModal />}

            {/* Header and Info */}
            <div className="w-full max-w-2xl text-center mb-6">
                <h1 className="text-3xl pixel-font text-white mb-2">Pixel Place 100x100</h1>
                <p className="text-gray-400 mb-4">Drag-to-draw enabled! Changes save when you lift the mouse.</p>
                
                {/* Database Connection Error Display */}
                {dbConnectionError && (
                    <div className="w-full p-3 mb-4 bg-yellow-900 rounded-xl shadow-lg text-sm text-yellow-100 break-all flex items-center justify-center border border-yellow-500">
                        <LuDatabaseZap className="mr-2 flex-shrink-0" />
                        <span className="text-left font-semibold">DATABASE WARNING:</span> {dbConnectionError}
                    </div>
                )}

                <div className="bg-gray-700 p-3 rounded-xl shadow-lg text-sm text-gray-200 break-all flex justify-between items-center">
                    <div>
                        Logged in as: <span className="font-bold text-indigo-400">{displayName}</span>
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

            {/* Canvas Area - Mobile Responsive */}
            <div className="flex-grow flex justify-center items-center w-full max-w-full overflow-hidden p-2">
                <div 
                    ref={canvasRef}
                    id="pixelCanvas" 
                    className="pixel-canvas-container w-full max-w-full aspect-square"
                    onMouseDown={handleStartDraw}
                    onMouseMove={handleDrawEvent}
                    onTouchStart={handleStartDraw}
                    onTouchMove={handleDrawEvent}
                >
                    <style jsx="true">{`
                        .pixel-canvas-container {
                            display: flex;
                            flex-wrap: wrap;
                            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.5);
                            border: 8px solid #374151;
                            border-radius: 12px;
                            touch-action: none;
                            background-color: #1f2937;
                        }
                        .pixel-canvas {
                            display: grid;
                            grid-template-columns: repeat(${GRID_SIZE}, 1fr);
                            grid-template-rows: repeat(${GRID_SIZE}, 1fr);
                            width: 100%;
                            height: 100%;
                            overflow: hidden;
                        }
                    `}</style>
                    <div className="pixel-canvas">
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

