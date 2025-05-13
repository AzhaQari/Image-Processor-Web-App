import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button'; // Assuming shadcn/ui alias is @/components

const LandingPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <h1>Welcome to the Image Processor</h1>
      <p>Please sign in to continue.</p>
      <Button onClick={login} variant="outline" size="lg">
        Sign in with Google
      </Button>
    </div>
  );
};

export default LandingPage; 