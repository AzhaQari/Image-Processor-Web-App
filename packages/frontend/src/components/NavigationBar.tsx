import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';

const NavigationBar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-indigo-800/10 bg-indigo-700/95 backdrop-blur supports-[backdrop-filter]:bg-indigo-700/80">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
            <h1 className="text-xl font-bold text-white">Image Processor</h1>
            {user && <span className="hidden text-sm text-indigo-200 md:inline-block ml-4">Hello, {user.name || user.email}</span>}
          </div>
          
          <nav className="flex items-center gap-1 bg-indigo-800/40 rounded-lg p-1 backdrop-blur-sm">
            <NavLink
              to="/dashboard/upload"
              className={({ isActive }) => 
                `px-4 py-2 rounded-md transition-all ${
                  isActive 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-white hover:bg-indigo-600/50'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                  <path d="M16 5h6v6" />
                  <path d="M8 12 19 1" />
                </svg>
                <span>Upload</span>
              </div>
            </NavLink>
            
            <NavLink
              to="/dashboard/gallery"
              className={({ isActive }) => 
                `px-4 py-2 rounded-md transition-all ${
                  isActive 
                    ? 'bg-white text-indigo-700 shadow-sm' 
                    : 'text-white hover:bg-indigo-600/50'
                }`
              }
            >
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
                <span>Gallery</span>
              </div>
            </NavLink>
            
            <div className="ml-1 h-6 w-px bg-indigo-500/30"></div>
            
            <Button 
              onClick={handleLogout} 
              variant="destructive"
              className="ml-1 bg-red-500 hover:bg-red-600 text-white flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              <span>Logout</span>
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default NavigationBar; 