import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { OpenAPI } from '@/sdk';

// Import tRPC and React Query components
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc, trpcClient } from './lib/trpc.ts';

// Configure the base URL for the SDK (OpenAPI client)
OpenAPI.BASE = 'http://localhost:3000'; // Your backend URL
OpenAPI.WITH_CREDENTIALS = true; // Ensure cookies are sent for SDK calls

// Create a client for React Query
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </trpc.Provider>
  </React.StrictMode>,
)
