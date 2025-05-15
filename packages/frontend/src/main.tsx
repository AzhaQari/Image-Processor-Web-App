import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { OpenAPI } from '@/sdk';

// Configure the base URL for the SDK
OpenAPI.BASE = 'http://localhost:3000'; // Your backend URL
OpenAPI.WITH_CREDENTIALS = true; // Ensure cookies are sent

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
