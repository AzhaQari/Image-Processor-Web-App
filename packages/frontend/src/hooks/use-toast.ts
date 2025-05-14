"use client"

// Inspired by react-hot-toast library and typescript-toastify
import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type ToastPosition = 
  | "top-left"
  | "top-right" 
  | "top-center"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center"

type ToastType = 
  | "default"
  | "success"
  | "info"
  | "warning" 
  | "error"
  | "destructive"
  
type ToastTheme = "light" | "dark"

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
  position?: ToastPosition
  showProgress?: boolean
  autoCloseTime?: number
  pauseOnHover?: boolean
  pauseOnFocusLoss?: boolean
  type?: ToastType
  theme?: ToastTheme
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const pausedToasts = new Set<string>()

const addToRemoveQueue = (toastId: string, autoCloseTime?: number) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, autoCloseTime || TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // Side effects
      if (toastId) {
        const toast = state.toasts.find(t => t.id === toastId)
        if (toast && !pausedToasts.has(toastId)) {
          addToRemoveQueue(toastId, toast.autoCloseTime)
        }
      } else {
        state.toasts.forEach((toast) => {
          if (!pausedToasts.has(toast.id)) {
            addToRemoveQueue(toast.id, toast.autoCloseTime)
          }
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

interface ToastOptions {
  title?: React.ReactNode
  description?: React.ReactNode
  position?: ToastPosition
  autoCloseTime?: number
  canClose?: boolean
  showProgress?: boolean
  pauseOnHover?: boolean
  pauseOnFocusLoss?: boolean
  type?: ToastType
  theme?: ToastTheme
  duration?: number // For backward compatibility
}

function toast(options: ToastOptions) {
  const id = genId()
  
  // Map type to variant for backward compatibility
  let variant: ToastProps["variant"] = "default"
  if (options.type === "error" || options.type === "destructive") {
    variant = "destructive"
  }

  // Handle both duration and autoCloseTime for backward compatibility
  const autoCloseTime = options.autoCloseTime || options.duration || TOAST_REMOVE_DELAY
  
  // Debug log
  console.log(`Creating toast with position: ${options.position}`);

  const update = (props: Partial<ToasterToast>) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
    
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...options,
      id,
      open: true,
      variant,
      autoCloseTime,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // Auto-remove toast after specified time if not paused
  if (autoCloseTime && !pausedToasts.has(id)) {
    addToRemoveQueue(id, autoCloseTime)
  }

  return {
    id: id,
    dismiss,
    update,
  }
}

// Pause toast auto-dismiss on hover
export function pauseToast(id: string) {
  if (toastTimeouts.has(id)) {
    clearTimeout(toastTimeouts.get(id)!)
    toastTimeouts.delete(id)
    pausedToasts.add(id)
  }
}

// Resume toast auto-dismiss after hover
export function resumeToast(id: string, toast?: ToasterToast) {
  pausedToasts.delete(id)
  const autoCloseTime = toast?.autoCloseTime || TOAST_REMOVE_DELAY
  addToRemoveQueue(id, autoCloseTime)
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

// Preset toast types for convenience
toast.success = (options: ToastOptions) => toast({ ...options, type: "success" })
toast.error = (options: ToastOptions) => toast({ ...options, type: "error" })
toast.warning = (options: ToastOptions) => toast({ ...options, type: "warning" })
toast.info = (options: ToastOptions) => toast({ ...options, type: "info" })

export { useToast, toast }
