// Main entry point for React application
// This file bootstraps the React app and mounts it to the DOM

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Import global CSS styles for the chat application
import './chat_app_styles.css'
// Import the main App component
import App from './App.jsx'

// Create root element and render the App component
// StrictMode helps identify potential problems in the application
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)