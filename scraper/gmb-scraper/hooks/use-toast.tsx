"use client"

// Inspired by react-hot-toast library
import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
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

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

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
        toasts: state.toasts.map((t) => (t.id === action.toast.id ? { ...t, ...action.toast } : t)),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
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
            : t,
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

type Toast = Omit<ToasterToast, "id">

// function toast({ ...props }: Toast) {
//   const id = genId()

//   const update = (props: ToasterToast) =>
//     dispatch({
//       type: "UPDATE_TOAST",
//       toast: { ...props, id },
//     })
//   const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

//   dispatch({
//     type: "ADD_TOAST",
//     toast: {
//       ...props,
//       id,
//       open: true,
//       onOpenChange: (open) => {
//         if (!open) dismiss()
//       },
//     },
//   })

//   return {
//     id: id,
//     dismiss,
//     update,
//   }
// }

// Simple toast implementation
export const toast = ({
  title,
  description,
  variant = "default",
}: {
  title: string
  description: string
  variant?: "default" | "destructive" | "success"
}) => {
  console.log(`[${variant.toUpperCase()}] ${title}: ${description}`)

  // In a real app, this would use a proper toast library
  // For now, we'll use a simple alert
  if (typeof window !== "undefined") {
    const message = `${title}\n${description}`
    if (variant === "destructive") {
      console.error(message)
    } else {
      console.log(message)
    }

    // Create a simple toast element
    const toastEl = document.createElement("div")
    toastEl.style.position = "fixed"
    toastEl.style.bottom = "20px"
    toastEl.style.right = "20px"
    toastEl.style.padding = "12px 16px"
    toastEl.style.borderRadius = "8px"
    toastEl.style.backgroundColor = variant === "destructive" ? "#f44336" : variant === "success" ? "#4caf50" : "#333"
    toastEl.style.color = "white"
    toastEl.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
    toastEl.style.zIndex = "9999"
    toastEl.style.maxWidth = "300px"
    toastEl.style.transition = "all 0.3s ease"

    const titleEl = document.createElement("div")
    titleEl.style.fontWeight = "bold"
    titleEl.style.marginBottom = "4px"
    titleEl.textContent = title

    const descEl = document.createElement("div")
    descEl.style.fontSize = "14px"
    descEl.style.opacity = "0.9"
    descEl.textContent = description

    toastEl.appendChild(titleEl)
    toastEl.appendChild(descEl)
    document.body.appendChild(toastEl)

    // Remove after 3 seconds
    setTimeout(() => {
      toastEl.style.opacity = "0"
      setTimeout(() => {
        document.body.removeChild(toastEl)
      }, 300)
    }, 3000)
  }
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

export { useToast }
