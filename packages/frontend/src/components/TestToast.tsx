import React from 'react';
import { Button } from '@/components/ui/button';
import showToast from '@/lib/toastify';

export function TestToast() {
  const handleShowToast = () => {
    console.log("Showing test toast");
    showToast({
      title: "Test Toast",
      toastMsg: "This is a test toast to verify the implementation works",
      position: "top-right",
      type: "info",
      showProgress: true,
      autoCloseTime: 5000,
      pauseOnHover: true,
      pauseOnFocusLoss: true,
      canClose: true,
      theme: "light"
    });
  };

  return (
    <div className="p-4">
      <Button onClick={handleShowToast}>
        Test Toast
      </Button>
    </div>
  );
} 