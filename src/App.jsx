import React, { useState, useEffect, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, runTransaction } from 'firebase/firestore';
import { RefreshCcw, ZoomIn, Users, MousePointer2 } from 'lucide-react';

// --- Constants ---
const FIXED_WIDTH = 1000;
const FIXED_HEIGHT = 1000;
const FIXED_PIXEL_SIZE = 1; // 1x1 Pixel Brush is mandatory
const COOLDOWN_SECONDS = 3600; // 1 hour cooldown for clearing
const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.5;

// Define the available colors for the brush
const COLORS = [
    '#dc2626', // Red
    '#2563eb', // Blue
    '#05969a', // Teal
    '#f59e0b', // Amber
    '#7c3aed', // Violet
    '#111827', // Black
    '#ffffff'  // White (Eraser)
];

// Simple throttle utility to limit Firestore writes
const throttle = (fn, delay) => {
    let last = 0;
    let timeoutId = null;
    return (...args) => {
        const now = Date.now();
        if (now - last < delay) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                last = Date.now();
                fn(...args);
            }, delay - (now - last));
        } else {
            last = now;
            fn(...args);
        }
    };
};

// Main App component
const App = () => {
    // --- State Management ---
    const [currentColor, setCurrentColor] = useState(COLORS[2]); 
    const [isDrawing, setIsDrawing] = useState(false);
    const [userId, setUserId] = useState(null);
    const [cooldownTimeRemaining, setCooldownTimeRemaining] = useState(0);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Connecting to Firebase...');
    const [zoomLevel, setZoomLevel] = useState(1); 
    const [leaderboard, setLeaderboard] = useState([]); // State for leaderboard data
    
    // Refs for Firebase instances, DOM elements, and context
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const dbRef = useRef(null);
    const authRef = useRef(null);
    const lastDrawnCellRef = useRef(null);
    const unsavedPixelsRef = useRef({}); // Buffer for drawn pixels before saving
    const unsavedScoreRef = useRef(0); // Buffer for drawing score increments

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        if (!firebaseConfig) {
            setStatusMessage("Error: Firebase configuration missing. Login is REQUIRED.");
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);

            dbRef.current = db;
            authRef.current = auth;

            // Define the document paths
            const rootPath = 'artifacts';
            const publicPath = 'public';
            const dataPath = 'data';

            dbRef.current.canvasDocRef = doc(db, rootPath, appId, publicPath, dataPath, 'pixel_art', 'main_canvas');
            dbRef.current.leaderboardCollection = collection(db, rootPath, appId, publicPath, dataPath, 'leaderboard');
            dbRef.current.leaderboardDocRef = doc(db, rootPath, appId, publicPath, dataPath, 'leaderboard', 'scores');

            // Auth logic
            const signIn = async () => {
                try {
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Firebase Auth Error:", error);
                    setStatusMessage(`Authentication failed: ${error.code}`);
                }
            };

            onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                    setIsAuthReady(true);
                    setStatusMessage('Ready. Start drawing!');
                } else {
                    setStatusMessage('Login is REQUIRED to draw and view the collaborative canvas.');
                    signIn(); // Try to sign in if not already authenticated
                }
            });

        } catch (error) {
            console.error("Firebase Initialization Error:", error);
            setStatusMessage(`Initialization failed: ${error.message}`);
        }
    }, []);

    // --- Canvas Initialization and Drawing State Logic ---

    const initializeCanvas = useCallback((pixelsMap = {}) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Reset context and background
        ctx.fillStyle = '#f3f4f6'; // Light gray background to show grid/clear status
        ctx.fillRect(0, 0, FIXED_WIDTH, FIXED_HEIGHT);
        
        // Draw the saved pixels onto the canvas
        Object.entries(pixelsMap).forEach(([key, color]) => {
            const [x, y] = key.split('_').map(Number);
            if (color !== '#f3f4f6') { // Only draw colored pixels
                ctx.fillStyle = color;
                ctx.fillRect(x, y, FIXED_PIXEL_SIZE, FIXED_PIXEL_SIZE);
            }
        });
        
        contextRef.current = ctx;
    }, []);
    
    // Function to draw one pixel block locally and buffer it for saving
    const executeDraw = useCallback((snappedX, snappedY) => {
        const ctx = contextRef.current;
        if (!ctx) return;
        
        const cellId = `${snappedX}_${snappedY}`;
        
        // 1. Draw locally on canvas
        ctx.fillStyle = currentColor;
        ctx.fillRect(snappedX, snappedY, FIXED_PIXEL_SIZE, FIXED_PIXEL_SIZE);
        
        // 2. Buffer the change
        unsavedPixelsRef.current[cellId] = currentColor;
        unsavedScoreRef.current += 1;

        // 3. Trigger a throttled save
        throttledSave();

    }, [currentColor]);

    // --- Firestore Data Synchronization ---

    const saveCanvasAndScore = useCallback(async () => {
        const db = dbRef.current;
        if (!db || !db.canvasDocRef || !db.leaderboardDocRef || !userId) return;

        // 1. Prepare data buffers
        const pixelsToSave = { ...unsavedPixelsRef.current };
        const scoreIncrement = unsavedScoreRef.current;

        if (Object.keys(pixelsToSave).length === 0 && scoreIncrement === 0) return;

        // Reset buffers
        unsavedPixelsRef.current = {}; 
        unsavedScoreRef.current = 0; 
        
        // 2. Update Canvas State (Pixel Data) and Leaderboard Score using a transaction
        try {
            await runTransaction(db.db, async (transaction) => {
                // Get current state of canvas and scores
                const canvasDoc = await transaction.get(db.canvasDocRef);
                const leaderboardDoc = await transaction.get(db.leaderboardDocRef);
                
                // --- Canvas Update ---
                const canvasData = canvasDoc.exists() ? canvasDoc.data() : {};
                const currentPixelsString = canvasData.coloredPixels || '{}';
                let currentPixels = {};
                try {
                    currentPixels = JSON.parse(currentPixelsString);
                } catch(e) { /* ignore parse errors */ }

                // Merge new pixels with existing pixels
                const mergedPixels = { ...currentPixels, ...pixelsToSave };
                
                // Filter out default color (white/background) if necessary to keep document small
                Object.keys(mergedPixels).forEach(key => {
                    if (mergedPixels[key] === '#ffffff' || mergedPixels[key] === '#f3f4f6') {
                        delete mergedPixels[key];
                    }
                });

                transaction.set(db.canvasDocRef, {
                    coloredPixels: JSON.stringify(mergedPixels),
                    lastDrawnAt: Date.now(),
                }, { merge: true });

                // --- Leaderboard Update ---
                const scores = leaderboardDoc.exists() ? leaderboardDoc.data() : {};
                const currentScore = scores[userId] || 0;
                
                transaction.set(db.leaderboardDocRef, {
                    [userId]: currentScore + scoreIncrement,
                }, { merge: true });
            });
        } catch (e) {
            console.error("Transaction failed:", e);
            // Re-buffer the unsaved changes if transaction fails
            unsavedPixelsRef.current = { ...unsavedPixelsRef.current, ...pixelsToSave };
            unsavedScoreRef.current += scoreIncrement;
        }

    }, [userId]);

    const throttledSave = useRef(throttle(saveCanvasAndScore, 200)).current; // 200ms throttle

    // 3. Real-time Snapshot Listener (Canvas and Leaderboard)
    useEffect(() => {
        if (!isAuthReady || !dbRef.current || !dbRef.current.canvasDocRef || !dbRef.current.leaderboardDocRef) return;

        setStatusMessage('Loading shared canvas and scores...');

        // Listener for the main canvas document (pixels and cooldown)
        const unsubscribeCanvas = onSnapshot(dbRef.current.canvasDocRef, (docSnap) => {
            const data = docSnap.exists() ? docSnap.data() : {};
            
            // --- Pixel Data Handling ---
            const coloredPixelsString = data.coloredPixels || '{}';
            let pixelsMap = {};
            try {
                pixelsMap = JSON.parse(coloredPixelsString);
            } catch (e) {
                console.error("Failed to parse coloredPixels:", e);
            }
            initializeCanvas(pixelsMap);

            // --- Cooldown Handling ---
            const lastClearedAt = data.lastClearedAt || 0;
            const timeSinceLastClear = (Date.now() - lastClearedAt) / 1000; // in seconds
            const remaining = Math.max(0, COOLDOWN_SECONDS - timeSinceLastClear);
            setCooldownTimeRemaining(Math.round(remaining));
            
            setStatusMessage('Ready. Start drawing!');
        }, (error) => {
            console.error("Firestore Canvas Snapshot Error:", error);
            setStatusMessage(`Real-time canvas error: ${error.code}`);
        });

        // Listener for the Leaderboard document
        const unsubscribeLeaderboard = onSnapshot(dbRef.current.leaderboardDocRef, (docSnap) => {
            const scoresData = docSnap.exists() ? docSnap.data() : {};
            
            // Convert the map of scores to an array, sort, and limit (e.g., top 10)
            const sortedLeaderboard = Object.entries(scoresData)
                .map(([uid, score]) => ({ uid, score }))
                .sort((a, b) => b.score - a.score)
                .slice(0, 10);
            
            setLeaderboard(sortedLeaderboard);

        }, (error) => {
            console.error("Firestore Leaderboard Snapshot Error:", error);
        });

        // Cleanup function for the listeners
        return () => {
            unsubscribeCanvas();
            unsubscribeLeaderboard();
        };
    }, [isAuthReady, initializeCanvas]);

    // --- Cooldown Timer Effect ---
    useEffect(() => {
        let timer;
        if (cooldownTimeRemaining > 0) {
            timer = setInterval(() => {
                setCooldownTimeRemaining(prev => Math.max(0, prev - 1));
            }, 1000);
        } else if (timer) {
            clearInterval(timer);
        }
        return () => clearInterval(timer);
    }, [cooldownTimeRemaining]);

    // --- Drawing Logic (Mouse/Touch Handlers) ---

    const getSnappedCoordinates = useCallback((event) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Scale factor accounts for the CSS scaling (zoomLevel)
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const clientX = event.clientX || (event.touches?.[0]?.clientX);
        const clientY = event.clientY || (event.touches?.[0]?.clientY);

        if (clientX === undefined || clientY === undefined) return null;

        const x = (clientX - rect.left) * scaleX;
        const y = (clientY - rect.top) * scaleY;
        
        // Snap to 1x1 grid (effectively floors to the nearest integer)
        const snappedX = Math.floor(x / FIXED_PIXEL_SIZE) * FIXED_PIXEL_SIZE;
        const snappedY = Math.floor(y / FIXED_PIXEL_SIZE) * FIXED_PIXEL_SIZE;
        
        const cellId = `${snappedX}_${snappedY}`;

        return { snappedX, snappedY, cellId };
    }, []);

    const startDrawing = useCallback((event) => {
        event.preventDefault(); 
        if (!isAuthReady || !contextRef.current || !userId) return;
        
        const coords = getSnappedCoordinates(event);
        if (!coords) return;

        executeDraw(coords.snappedX, coords.snappedY);
        lastDrawnCellRef.current = coords.cellId;
        setIsDrawing(true);
    }, [isAuthReady, userId, getSnappedCoordinates, executeDraw]);

    const draw = useCallback((event) => {
        if (!isDrawing) return;
        event.preventDefault(); 
        const coords = getSnappedCoordinates(event);
        if (!coords) return;

        if (coords.cellId !== lastDrawnCellRef.current) {
            executeDraw(coords.snappedX, coords.snappedY);
            lastDrawnCellRef.current = coords.cellId;
        }
    }, [isDrawing, getSnappedCoordinates, executeDraw]);

    const stopDrawing = useCallback(() => {
        if (isDrawing) {
            setIsDrawing(false);
            lastDrawnCellRef.current = null;
            // Ensure any pending updates are saved quickly after lifting the mouse/finger
            throttledSave(); 
        }
    }, [isDrawing, throttledSave]);

    const clearCanvas = async () => {
        if (cooldownTimeRemaining > 0 || !isAuthReady) return;
        if (!dbRef.current || !dbRef.current.canvasDocRef || !dbRef.current.leaderboardDocRef || !userId) return;

        setStatusMessage('Clearing canvas and resetting leaderboard...');
        try {
            await setDoc(dbRef.current.canvasDocRef, {
                coloredPixels: JSON.stringify({}), // Clear pixel data
                lastClearedAt: Date.now(),
                lastClearedBy: userId,
            }, { merge: true });

            await setDoc(dbRef.current.leaderboardDocRef, {}); // Clear all scores
            
            setStatusMessage('Canvas cleared and leaderboard reset successfully!');
        } catch (e) {
            console.error("Error clearing canvas:", e);
            setStatusMessage(`Clear failed: ${e.code}`);
        }
    };
    
    // Format the time remaining for display
    const formatTime = (seconds) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    const isCooldownActive = cooldownTimeRemaining > 0;
    const cooldownButtonText = isCooldownActive 
        ? `Cooldown: ${formatTime(cooldownTimeRemaining)}` 
        : 'Clear Canvas (1h Cooldown)';

    // --- UI Render ---
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-2 sm:p-4">
            <header className="w-full max-w-4xl text-center mb-6">
                <h1 className="text-3xl font-extrabold text-gray-800">Collaborative Pixel Art (1000x1000)</h1>
                <p className="text-gray-600 mt-1">1x1 Brush, Real-Time Sync, and Pixel Leaderboard.</p>
                <div className="text-sm font-semibold text-gray-700 mt-2 p-2 rounded-lg bg-yellow-100">
                    Status: **{statusMessage}**
                </div>
            </header>

            {/* Controls and Leaderboard Panel */}
            <div className="bg-white p-4 rounded-xl shadow-xl w-full max-w-4xl mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Color and Zoom Controls (Col 1) */}
                <div className="flex flex-col space-y-3 p-3 bg-gray-50 rounded-lg shadow-inner">
                    <div className="flex items-center space-x-2">
                        <MousePointer2 className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">Brush Color:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                onClick={() => setCurrentColor(color)}
                                className={`w-8 h-8 rounded-lg border-2 transition-all duration-150 ${
                                    currentColor === color 
                                        ? 'shadow-lg ring-4 ring-offset-2 ring-teal-500 scale-110' 
                                        : 'border-gray-300 hover:scale-105'
                                } ${color === '#ffffff' ? 'border-gray-500' : ''}`}
                                style={{ backgroundColor: color }}
                                title={color === '#ffffff' ? 'Eraser' : color}
                                disabled={!isAuthReady}
                            ></button>
                        ))}
                    </div>

                    <div className="pt-2">
                        <div className="flex items-center space-x-2 mb-1">
                            <ZoomIn className="w-5 h-5 text-gray-600" />
                            <label htmlFor="zoom-input" className="text-sm font-semibold text-gray-700">Zoom ({zoomLevel}x)</label>
                        </div>
                        <input
                            id="zoom-input"
                            type="range"
                            min={ZOOM_MIN}
                            max={ZOOM_MAX}
                            step={ZOOM_STEP}
                            value={zoomLevel}
                            onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer range-lg"
                            disabled={!isAuthReady}
                        />
                    </div>
                </div>

                {/* 2. Clear Button & User ID (Col 2) */}
                <div className="flex flex-col space-y-3 p-3 bg-gray-50 rounded-lg shadow-inner">
                    <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-gray-600" />
                        <span className="text-sm font-semibold text-gray-700">User Information</span>
                    </div>
                    <p className="text-xs text-gray-500 break-words font-mono">
                        ID: **{userId || 'N/A (Please login)'}**
                    </p>
                    <hr className="border-gray-200" />
                    
                    <button
                        onClick={clearCanvas}
                        disabled={isCooldownActive || !isAuthReady}
                        className={`w-full px-4 py-2 font-bold rounded-lg shadow-md flex items-center justify-center transition duration-200 text-sm ${
                            isCooldownActive 
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                            : 'bg-red-500 text-white hover:bg-red-600'
                        }`}
                    >
                        <RefreshCcw className="w-4 h-4 mr-2" />
                        {cooldownButtonText}
                    </button>
                    {isCooldownActive && (
                        <p className="text-xs text-red-500 text-center font-medium">Next clear available in {formatTime(cooldownTimeRemaining)}.</p>
                    )}
                </div>

                {/* 3. Leaderboard (Col 3) */}
                <div className="flex flex-col space-y-2 p-3 bg-indigo-50 rounded-lg shadow-inner">
                    <div className="text-lg font-bold text-indigo-700 border-b border-indigo-300 pb-1 flex items-center">
                        <Users className="w-5 h-5 mr-2" /> Top Pixelers
                    </div>
                    <ol className="space-y-1 text-sm">
                        {leaderboard.length > 0 ? (
                            leaderboard.map((item, index) => (
                                <li key={item.uid} className={`flex justify-between items-center ${item.uid === userId ? 'font-bold text-indigo-700' : 'text-gray-700'}`}>
                                    <span>{index + 1}. {item.uid.substring(0, 8)}...</span>
                                    <span className="px-2 py-0.5 bg-indigo-200 rounded-full text-xs">{item.score.toLocaleString()}</span>
                                </li>
                            ))
                        ) : (
                            <li className="text-gray-500 italic">Start drawing to climb the ranks!</li>
                        )}
                    </ol>
                </div>
            </div>

            {/* Canvas Display Area - Fixed 1000x1000 viewport with scrolling for zoom */}
            <div 
                className="p-1 bg-white border-4 border-teal-500 rounded-xl shadow-2xl overflow-scroll"
                style={{ 
                    // Use max-w-full to ensure the container itself is responsive
                    maxWidth: '100vw', 
                    // Maintain max 1000px height for desktop but allow less for mobile screens
                    maxHeight: 'calc(100vh - 350px)' 
                }}
            >
                <canvas
                    ref={canvasRef}
                    width={FIXED_WIDTH}
                    height={FIXED_HEIGHT}
                    onMouseDown={startDrawing}
                    onMouseUp={stopDrawing}
                    onMouseOut={stopDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={stopDrawing}
                    onTouchCancel={stopDrawing}
                    onTouchMove={draw}
                    className="block cursor-crosshair transition-transform duration-100"
                    // Apply CSS scaling to visually zoom the canvas
                    style={{ 
                        width: `${FIXED_WIDTH * zoomLevel}px`, 
                        height: `${FIXED_HEIGHT * zoomLevel}px`, 
                        transformOrigin: 'top left',
                        touchAction: 'none' 
                    }}
                >
                    Your browser does not support the HTML canvas tag.
                </canvas>
            </div>
        </div>
    );
};

export default App;



