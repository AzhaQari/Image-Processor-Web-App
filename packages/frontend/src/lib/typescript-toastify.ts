// No React imports needed - we're creating and managing DOM elements directly
import './typescript-toastify.css';
import type { 
  ToastPosition, 
  ToastType, 
  ToastTheme, 
  ToastOptions 
} from './toast-types';

// Types imported from toast-types.ts

// Default toast options
const defaultOptions: Partial<ToastOptions> = {
  position: 'top-right',
  autoCloseTime: 4500,
  canClose: true,
  showProgress: true,
  pauseOnHover: true,
  pauseOnFocusLoss: true,
  type: 'default',
  theme: 'light'
};

export class Toast {
  private id: string;
  private options: ToastOptions;
  private element: HTMLDivElement;
  private progressInterval: number | null = null;
  private progressStartTime: number | null = null;
  private progressPausedAt: number | null = null;
  private progressRemainingTime: number | null = null;
  private container: HTMLDivElement | null = null;
  private toastElement: HTMLDivElement | null = null;

  constructor(options: ToastOptions) {
    // Generate unique ID
    this.id = 'toast-' + Math.random().toString(36).substr(2, 9);
    
    console.log(`Creating toast ${this.id} with position: ${options.position}`);
    
    // Merge with default options
    this.options = { ...defaultOptions, ...options };
    
    // Create DOM container for toast
    this.element = document.createElement('div');
    this.element.className = 'typescript-toastify-container';
    document.body.appendChild(this.element);
    
    // Render the toast immediately
    this.render();
    
    // Add window focus/blur event listeners for pauseOnFocusLoss
    if (this.options.pauseOnFocusLoss) {
      window.addEventListener('blur', this.handleWindowBlur);
      window.addEventListener('focus', this.handleWindowFocus);
    }
    
    console.log(`Toast ${this.id} created and rendered with position ${this.options.position}`);
  }

  private render() {
    // Create container for the specific position if it doesn't exist
    const position = this.options.position || 'top-right';
    console.log(`Rendering toast ${this.id} with position ${position}`);
    
    let container = document.querySelector(`.toast-container-${position}`);
    
    if (!container) {
      console.log(`Creating new container for position ${position}`);
      container = document.createElement('div');
      container.className = `toast-container toast-container-${position}`;
      document.body.appendChild(container);
    } else {
      console.log(`Using existing container for position ${position}`);
    }
    
    this.container = container as HTMLDivElement;
    
    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.id = this.id;
    toastElement.className = `toast toast-${this.options.type} toast-theme-${this.options.theme}`;
    
    // Add event listeners
    if (this.options.pauseOnHover) {
      toastElement.addEventListener('mouseenter', this.handleMouseEnter);
      toastElement.addEventListener('mouseleave', this.handleMouseLeave);
    }
    
    // Title (if provided)
    let titleHtml = '';
    if (this.options.title) {
      titleHtml = `<div class="toast-title">${this.options.title}</div>`;
    }
    
    // Close button (if canClose is true)
    let closeButtonHtml = '';
    if (this.options.canClose) {
      closeButtonHtml = `
        <button class="toast-close-button" aria-label="Close toast">
          ✕
        </button>
      `;
      
      // Add event listener after rendering
      setTimeout(() => {
        const closeButton = toastElement.querySelector('.toast-close-button');
        if (closeButton) {
          closeButton.addEventListener('click', () => this.remove());
        }
      }, 0);
    }
    
    // Progress bar (if showProgress is true)
    let progressBarHtml = '';
    if (this.options.showProgress) {
      progressBarHtml = `
        <div class="toast-progress-container">
          <div class="toast-progress-bar"></div>
        </div>
      `;
    }
    
    // Render toast content
    toastElement.innerHTML = `
      <div class="toast-content">
        ${titleHtml}
        <div class="toast-message">${this.options.toastMsg}</div>
        ${closeButtonHtml}
      </div>
      ${progressBarHtml}
    `;
    
    // Add to container
    this.container.appendChild(toastElement);
    this.toastElement = toastElement;
    
    // Start progress bar animation
    if (this.options.showProgress && this.options.autoCloseTime) {
      this.startProgressBar();
    }
    
    // Auto close
    if (this.options.autoCloseTime) {
      setTimeout(() => {
        this.remove();
      }, this.options.autoCloseTime);
    }
    
    // Add animation class after a small delay for the animation to work
    setTimeout(() => {
      if (this.toastElement) {
        this.toastElement.classList.add('toast-visible');
      }
    }, 10);
  }

  // Handle window blur for pauseOnFocusLoss
  private handleWindowBlur = () => {
    if (this.options.pauseOnFocusLoss && this.progressInterval) {
      this.pauseProgress();
    }
  };

  // Handle window focus for pauseOnFocusLoss
  private handleWindowFocus = () => {
    if (this.options.pauseOnFocusLoss && this.progressPausedAt) {
      this.resumeProgress();
    }
  };

  // Handle mouse enter for pauseOnHover
  private handleMouseEnter = () => {
    if (this.options.pauseOnHover && this.progressInterval) {
      this.pauseProgress();
    }
  };

  // Handle mouse leave for pauseOnHover
  private handleMouseLeave = () => {
    if (this.options.pauseOnHover && this.progressPausedAt) {
      this.resumeProgress();
    }
  };

  // Start progress bar animation
  private startProgressBar() {
    if (!this.toastElement || !this.options.showProgress) return;
    
    const progressBar = this.toastElement.querySelector('.toast-progress-bar');
    if (!progressBar) return;
    
    this.progressStartTime = Date.now();
    this.progressRemainingTime = this.options.autoCloseTime!;
    
    // Update progress bar every 10ms
    this.progressInterval = window.setInterval(() => {
      if (!this.toastElement) {
        this.clearProgressInterval();
        return;
      }
      
      const elapsed = Date.now() - this.progressStartTime!;
      const progress = (elapsed / this.options.autoCloseTime!) * 100;
      
      progressBar.setAttribute('style', `width: ${100 - progress}%`);
      
      if (progress >= 100) {
        this.clearProgressInterval();
      }
    }, 10);
  }

  // Pause progress bar animation
  private pauseProgress() {
    if (this.progressInterval) {
      this.clearProgressInterval();
      this.progressPausedAt = Date.now();
    }
  }

  // Resume progress bar animation
  private resumeProgress() {
    if (this.progressPausedAt && this.progressStartTime) {
      const pausedDuration = Date.now() - this.progressPausedAt;
      this.progressStartTime += pausedDuration;
      this.progressPausedAt = null;
      
      // Restart progress bar animation
      this.startProgressBar();
    }
  }

  // Clear progress interval
  private clearProgressInterval() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  // Update toast options
  public update(newOptions: Partial<ToastOptions>) {
    // Update options
    this.options = { ...this.options, ...newOptions };
    
    // Remove old toast and render new one
    if (this.toastElement && this.container) {
      this.container.removeChild(this.toastElement);
    }
    
    // Clear progress interval
    this.clearProgressInterval();
    
    // Re-render toast
    this.render();
  }

  // Remove toast
  public remove() {
    if (this.toastElement) {
      // Add animation class for exit
      this.toastElement.classList.remove('toast-visible');
      this.toastElement.classList.add('toast-hidden');
      
      // Wait for animation to complete
      setTimeout(() => {
        if (this.toastElement && this.container) {
          this.container.removeChild(this.toastElement);
          
          // If container is empty, remove it
          if (this.container.children.length === 0) {
            document.body.removeChild(this.container);
          }
        }
        
        // Clean up event listeners
        if (this.options.pauseOnFocusLoss) {
          window.removeEventListener('blur', this.handleWindowBlur);
          window.removeEventListener('focus', this.handleWindowFocus);
        }
        
        // Call onClose callback if provided
        if (this.options.onClose) {
          this.options.onClose();
        }
        
        // Clear progress interval
        this.clearProgressInterval();
        
        // Remove element from DOM
        if (this.element && document.body.contains(this.element)) {
          document.body.removeChild(this.element);
        }
      }, 300); // Match duration with the CSS transition
    }
  }

  // Static method to clear all toasts
  public static clearAll() {
    const containers = document.querySelectorAll('.toast-container');
    containers.forEach(container => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });
  }
}

// Export default instance
export default Toast; 