import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport> & {
    position?: string;
  }
>(({ className, position, ...props }, ref) => {
  // Map position to CSS classes for positioning the viewport itself
  const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "top-center": "top-4 left-1/2 -translate-x-1/2",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2",
  };

  // Determine the flex direction for stacking toasts within the viewport
  const flexDirectionClass = position?.startsWith("top-") ? "flex-col" : "flex-col-reverse";
  
  const appliedPositionClass = positionClasses[position as keyof typeof positionClasses] || positionClasses["bottom-right"]; // Default to bottom-right

  return (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        "fixed z-[100] flex p-4 gap-2", // Base styles for the viewport
        flexDirectionClass,             // How toasts stack (top-down or bottom-up)
        appliedPositionClass,           // Where the viewport is on the screen
        // sm:max-w-[420px] is applied to individual toasts, not the viewport container if it's screen-wide (e.g. top-center)
        // If we want to constrain the viewport itself for corner positions, it's more complex as it depends on content.
        // For now, individual toasts have max-width. The viewport for corners will be defined by its position props.
        className
      )}
      {...props}
    />
  );
});
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border-2 p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-bottom-full sm:max-w-[420px]", // Added sm:max-w-[420px] here for individual toasts
  {
    variants: {
      variant: {
        default: "border-indigo-300 bg-white text-foreground shadow-md",
        destructive: "destructive group border-red-400 bg-white text-destructive-foreground shadow-md",
        success: "border-green-300 bg-white text-green-800 shadow-md",
        info: "border-blue-300 bg-white text-blue-800 shadow-md",
        warning: "border-yellow-300 bg-white text-yellow-800 shadow-md",
        error: "border-red-300 bg-white text-red-800 shadow-md",
      },
      theme: {
        light: "",
        dark: "bg-slate-800 text-white border-slate-700",
      }
    },
    defaultVariants: {
      variant: "default",
      theme: "light",
    },
    compoundVariants: [
      {
        variant: "default",
        theme: "dark",
        class: "border-indigo-600 bg-slate-800 text-white"
      },
      {
        variant: "destructive",
        theme: "dark",
        class: "border-red-600 bg-slate-800 text-red-300"
      },
      {
        variant: "success",
        theme: "dark",
        class: "border-green-600 bg-slate-800 text-green-300"
      },
      {
        variant: "info",
        theme: "dark",
        class: "border-blue-600 bg-slate-800 text-blue-300"
      },
      {
        variant: "warning",
        theme: "dark",
        class: "border-yellow-600 bg-slate-800 text-yellow-300"
      },
      {
        variant: "error",
        theme: "dark",
        class: "border-red-600 bg-slate-800 text-red-300"
      },
    ]
  }
)

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
      showProgress?: boolean,
      autoCloseTime?: number,
      theme?: "light" | "dark"
    }
>(({ className, variant, showProgress, autoCloseTime, theme, ...props }, ref) => {
  // For progress indication
  const [progress, setProgress] = React.useState(100)
  const intervalRef = React.useRef<number | null>(null)
  
  React.useEffect(() => {
    if (showProgress && autoCloseTime && props.open) {
      // Reset progress to 100% when toast opens
      setProgress(100)
      
      // Create interval to update progress
      const intervalId = window.setInterval(() => {
        setProgress((prevProgress) => {
          const newProgress = prevProgress - (100 / (autoCloseTime / 100))
          return newProgress < 0 ? 0 : newProgress
        })
      }, 100)
      
      intervalRef.current = intervalId
      
      return () => {
        if (intervalRef.current) {
          window.clearInterval(intervalRef.current)
        }
      }
    }
  }, [showProgress, autoCloseTime, props.open])
  
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant, theme }), className)}
      {...props}
    >
      <div className="w-full">
        {props.children}
        
        {/* Progress bar */}
        {showProgress && (
          <div className="w-full h-1 bg-slate-200 absolute bottom-0 left-0 right-0">
            <div
              className={cn(
                "h-full transition-all ease-linear",
                variant === "destructive" || variant === "error"
                  ? "bg-red-500"
                  : variant === "success"
                  ? "bg-green-500"
                  : variant === "warning"
                  ? "bg-yellow-500"
                  : variant === "info"
                  ? "bg-blue-500"
                  : "bg-indigo-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </ToastPrimitives.Root>
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-secondary focus:outline-none focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close> & {
    canClose?: boolean;
  }
>(({ className, canClose = true, ...props }, ref) => {
  if (!canClose) return null;
  
  return (
    <ToastPrimitives.Close
      ref={ref}
      className={cn(
        "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
        className
      )}
      toast-close=""
      {...props}
    >
      <X className="h-4 w-4" />
    </ToastPrimitives.Close>
  )
})
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm opacity-90", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}
