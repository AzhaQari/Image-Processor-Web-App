import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import UploadPage from './pages/UploadPage';
import GalleryPage from './pages/GalleryPage';
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UploadPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="gallery" element={<GalleryPage />} />
        </Route>
        {/* Callback route is handled by backend, then redirects to /dashboard */}
      </Routes>
    </AuthProvider>
  )
}

export default App
