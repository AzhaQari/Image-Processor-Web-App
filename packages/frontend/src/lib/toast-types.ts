// Toast position options
export type ToastPosition = 
  | 'top-left'
  | 'top-right'
  | 'top-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'bottom-center';

// Toast type options
export type ToastType = 
  | 'default'
  | 'info' 
  | 'success'
  | 'warning'
  | 'error';

// Toast theme options
export type ToastTheme = 'light' | 'dark';

// Toast options interface
export interface ToastOptions {
  position?: ToastPosition;
  toastMsg: string;
  title?: string; 
  autoCloseTime?: number;
  canClose?: boolean;
  showProgress?: boolean;
  pauseOnHover?: boolean;
  pauseOnFocusLoss?: boolean;
  type?: ToastType;
  theme?: ToastTheme;
  onClose?: () => void;
} 