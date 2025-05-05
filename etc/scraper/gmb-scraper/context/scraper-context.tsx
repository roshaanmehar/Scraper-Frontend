"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Task {
  id: string
  type: "gmb" | "email" | "postcode"
  status: "running" | "completed" | "failed" | "cancelled"
  startTime: string
  endTime?: string
  city?: string
  keyword?: string
  url?: string
  granularity?: string
}

interface ScraperContextType {
  activeTask: Task | null
  setActiveTask: (task: Task | null) => void
}

const ScraperContext = createContext<ScraperContextType | undefined>(undefined)

export function ScraperProvider({ children }: { children: ReactNode }) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  return <ScraperContext.Provider value={{ activeTask, setActiveTask }}>{children}</ScraperContext.Provider>
}

export function useScraperContext() {
  const context = useContext(ScraperContext)
  if (context === undefined) {
    throw new Error("useScraperContext must be used within a ScraperProvider")
  }
  return context
}
