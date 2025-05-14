import React from 'react';
import { Outlet } from 'react-router-dom';
import NavigationBar from '../components/NavigationBar';

const DashboardLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-slate-100">
      <NavigationBar />
      
      <main className="flex-grow container mx-auto px-4 py-8 animate-fadeIn">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden">
          <Outlet />
        </div>
      </main>
      
      <footer className="bg-slate-800 text-slate-300 py-5 mt-auto border-t border-slate-700">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="font-medium text-slate-200">Image Processor</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-sm">Image Processor Web App &copy; {new Date().getFullYear()}</p>
              <p className="text-xs text-slate-400 mt-1">Secure cloud-based image processing</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout; 