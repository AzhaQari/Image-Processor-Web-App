import Toast from './typescript-toastify';
import type { ToastOptions } from './toast-types';

// Create a wrapper for the Toast class to match the expected API
export function showToast(options: ToastOptions) {
  // Log debug info
  console.log(`Creating standalone toast with position: ${options.position}`);
  
  // Create a new toast instance
  const toast = new Toast(options);
  
  // Return control methods
  return {
    id: toast.id,
    dismiss: () => toast.remove(),
    update: (newOptions: Partial<ToastOptions>) => toast.update(newOptions),
  };
}

// Create convenience methods
showToast.success = (options: ToastOptions) => 
  showToast({ ...options, type: 'success' });

showToast.error = (options: ToastOptions) => 
  showToast({ ...options, type: 'error' });

showToast.warning = (options: ToastOptions) => 
  showToast({ ...options, type: 'warning' });

showToast.info = (options: ToastOptions) => 
  showToast({ ...options, type: 'info' });

// Method to clear all toasts
showToast.clearAll = () => Toast.clearAll();

export default showToast; 