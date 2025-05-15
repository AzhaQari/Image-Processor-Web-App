import { useToast, pauseToast, resumeToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { useEffect, useRef } from "react"

export function Toaster() {
  const { toasts } = useToast()
  const hoveredToasts = useRef(new Set<string>())
  const focusTracker = useRef({
    windowFocused: typeof document !== 'undefined' ? document.hasFocus() : true,
  })

  // Track window focus/blur for pauseOnFocusLoss
  useEffect(() => {
    const handleFocus = () => {
      focusTracker.current.windowFocused = true
      
      // Resume paused toasts when window regains focus
      toasts.forEach(toast => {
        if (toast.pauseOnFocusLoss && !hoveredToasts.current.has(toast.id)) {
          resumeToast(toast.id, toast)
        }
      })
    }
    
    const handleBlur = () => {
      focusTracker.current.windowFocused = false
      
      // Pause active toasts when window loses focus
      toasts.forEach(toast => {
        if (toast.pauseOnFocusLoss) {
          pauseToast(toast.id)
        }
      })
    }
    
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [toasts])
  
  // Group toasts by position
  const positionGroups = toasts.reduce((groups, toast) => {
    // Add explicit debugging
    console.log(`Toast id=${toast.id} has position=${toast.position || "unspecified"}`);
    
    // Use the toast's position or default to "top-right" (was "bottom-right")
    const position = toast.position || "top-right"
    
    if (!groups[position]) {
      groups[position] = []
    }
    groups[position].push(toast)
    return groups
  }, {} as Record<string, typeof toasts>)

  // More debugging to see what position groups we have
  console.log("Position groups:", Object.keys(positionGroups));

  return (
    <ToastProvider>
      {Object.entries(positionGroups).map(([position, positionToasts]) => {
        console.log(`Rendering viewport for position: ${position} with ${positionToasts.length} toasts`);
        return (
          <ToastViewport key={position} position={position}>
            {positionToasts.map(function ({ id, title, description, action, type, theme, showProgress, autoCloseTime, pauseOnHover, canClose, ...props }) {
              // Filter out pauseOnFocusLoss from props to avoid React DOM warnings
              const { pauseOnFocusLoss, ...domSafeProps } = props;
              
              return (
                <Toast 
                  key={id} 
                  {...domSafeProps}
                  variant={type as any}
                  theme={theme}
                  showProgress={showProgress}
                  autoCloseTime={autoCloseTime}
                  onMouseEnter={() => {
                    if (pauseOnHover) {
                      hoveredToasts.current.add(id)
                      pauseToast(id)
                    }
                  }}
                  onMouseLeave={() => {
                    if (pauseOnHover) {
                      hoveredToasts.current.delete(id)
                      if (focusTracker.current.windowFocused || !pauseOnFocusLoss) {
                        resumeToast(id, { autoCloseTime } as any)
                      }
                    }
                  }}
                >
                  <div className="grid gap-2">
                    {title && <ToastTitle className="text-lg font-bold">{title}</ToastTitle>}
                    {description && (
                      <ToastDescription className="text-sm">{description}</ToastDescription>
                    )}
                  </div>
                  {action}
                  <ToastClose canClose={canClose} />
                </Toast>
              )
            })}
          </ToastViewport>
        );
      })}
    </ToastProvider>
  )
}
