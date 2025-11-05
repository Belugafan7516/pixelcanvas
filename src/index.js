import React from 'react';
import ReactDOM from 'react-dom/client';
// Assuming your main component is saved as 'App.jsx' in the same 'src' directory
import App from './App'; 
import './index.css'; // Optional: If you have global styles

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Note: If you don't have an 'App.jsx' file yet, create one in 'src/' now.

